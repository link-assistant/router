import {createHash} from 'node:crypto';
import {resolveModuleBindings} from './module-bindings.mjs';
import {compilationProfile,itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {createDeriveDependencyProof,deriveExternalModules,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {inspectDeriveInput,STANDARD_LAYOUT_DERIVES} from './derive-inputs.mjs';
import {inertInnerLintItem} from './tool-attributes.mjs';
import {builtinDefaultDependencyProof} from './derive-builtin-default.mjs';
import {proveSchemarsWithTypeConfinement} from './derive-schemars-with.mjs';
import {proveClapValueEnumSourceOutput} from './derive-clap-value-enum.mjs';
import {proveClapArgsSourceOutput} from './derive-clap-args.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
export {createDeriveDependencyProof};
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const contexts=new WeakMap(),certificates=new WeakMap();
const key=path=>path.join('::');
const invocationId=(module,item)=>moduleScopeKey(module)+':'+item.start+':'+item.end;
const standardOwner=(path,scope)=>path.length===1&&STANDARD_LAYOUT_DERIVES.has(path[0])&&!scope.bindings.some(binding=>binding.namespace==='macro'&&binding.name===path[0]&&binding.macroKind!=='bang');
function originalDeclarationHeader(item,condition,module) {
  if(inertInnerLintItem(item,module.source,module.sourceView,module.compilationProfile))return true;
  const tokens=item.tokens.filter(token=>token.type!=='comment'),end=condition.attributes.at(-1)?.span.end??item.start;
  let at=tokens.findIndex(token=>token.start>=end);
  if(tokens[at]?.text==='pub') {
    at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return false;}
  }
  while(['async','unsafe','default'].includes(tokens[at]?.text))at++;
  if(tokens[at]?.text==='extern'&&tokens[at+1]?.type==='string')at+=2;
  // The structural partitioner can classify an item-position macro using a
  // keyword inside its token tree. Its actual outer header is the authority.
  return ['fn','const','static','use','mod','struct','enum','impl','type','trait','macro_rules!'].includes(tokens[at]?.text);
}

function actualOwner(path,scope,scopes,external,dependency) {
  const macro=(container,name)=>container?.bindings.find(binding=>binding.namespace==='macro'&&binding.name===name);
  let binding;
  if(path.length===1)binding=macro(scope,path[0]);
  else {
    let prefix=path.slice(0,-1),container;
    if(prefix[0]==='crate')container=scopes.get(key(prefix));
    else if(prefix[0]==='self')container=scopes.get(key(['crate',...scope.path,...prefix.slice(1)]));
    else if(prefix[0]==='super'){
      const parent=[...scope.path];let at=0;while(prefix[at]==='super'){if(!parent.length)return null;parent.pop();at++;}container=scopes.get(key(['crate',...parent,...prefix.slice(at)]));
    } else {
      const owner=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===prefix[0]);
      if(owner){if(owner.status!=='resolved'||!owner.target)return null;prefix=[...owner.target,...prefix.slice(1)];}
      container=scopes.get(key(prefix))??external.get(key(prefix));
    }
    binding=macro(container,path.at(-1));
  }
  if(!binding||binding.status!==undefined&&binding.status!=='resolved'||binding.macroKind!=='derive'||binding.deriveDependencyDigest!==dependency.digest)return null;
  const target=key(binding.target);
  if(!['serde::Serialize','serde::Deserialize','schemars::JsonSchema','clap::ValueEnum','clap::Args'].includes(target))return null;
  return {path:[...path],target:[...binding.target],source:binding.source,sourceSpan:binding.span??null,via:binding.via??'locked-external-path',dependencyDigest:dependency.digest};
}

export function createDeriveFootprintContext({modules,dependencies,compilationProfile:profileInput=null,externalModules=new Map()}={}) {
  if(!isDeriveDependencyProof(dependencies)||!Array.isArray(modules)||!(externalModules instanceof Map))throw new TypeError('Derive context requires sealed dependencies and original tracked modules');
  const profile=compilationProfile(profileInput),external=new Map(externalModules);
  for(const table of external.values())if(table.bindings?.some(binding=>binding.deriveDependencyDigest||['serde','schemars','clap'].includes(binding.target?.[0])))throw new TypeError('Derive dependency paths require privately verified registry inputs, not caller external aliases');
  modules=modules.map(module=>({...module,items:originalSourceModuleItems(module).filter(item=>itemConfiguration(item.tokens,profile).status!=='inactive')}));
  for(const [path,table]of deriveExternalModules(dependencies)) {
    const existing=external.get(path);
    if(existing?.bindings.some(binding=>table.bindings.some(derived=>derived.namespace===binding.namespace&&derived.name===binding.name)))throw new TypeError('Registered derive namespace collides with another external table');
    external.set(path,{...table,bindings:[...(existing?.bindings??[]),...table.bindings],complete:false});
  }
  // Resolve aliases against actual source before applying any certificates.
  // Unknown imports, duplicate slots and local package shadows remain visible.
  const baseline=resolveModuleBindings({modules,externalModules:external,compilationProfile:profile}),scopes=new Map(baseline.scopes.map(scope=>[key(['crate',...scope.path]),scope]));
  const attributeClosure=new Map(),clapSourceOutputs=new Map(),clapSourceRefusals=new Map();
  for(const module of modules) {
    const scope=scopes.get(key(['crate',...module.path])),inputs=new Map();
    for(const candidate of module.items.filter(item=>['struct','enum'].includes(item.term)&&item.tokens.some(token=>token.text==='derive')))try{inputs.set(candidate.start,inspectDeriveInput(candidate,profile));}catch{}
    attributeClosure.set(moduleScopeKey(module),scope.configurationCondition==='active'&&module.items.every(candidate=>{
      const condition=itemConfiguration(candidate.tokens,profile);if(condition.status!=='active')return false;
      if(inputs.has(candidate.start)) {
        const input=inputs.get(candidate.start),owners=input.derives.map(invocation=>standardOwner(invocation.path,scope)?true:actualOwner(invocation.path,scope,scopes,external,dependencies));
        if(owners.some(owner=>!owner))return false;
        try {
          const output={};
          if(owners.some(owner=>owner!==true&&owner.target[0]==='clap')) {
            const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
            if(ancestors.some(candidate=>candidate.bindings.some(binding=>['allow','automatically_derived'].includes(binding.name)&&macroBindingAffects(binding,'attribute'))))throw new TypeError('Sibling Clap generated attributes are shadowed in an original ancestor');
            if(owners.some(owner=>owner!==true&&owner.target.join('::')==='clap::Args')&&ancestors.some(candidate=>candidate.bindings.some(binding=>binding.namespace==='type'&&binding.name==='clap'&&(binding.status!=='resolved'||JSON.stringify(binding.target)!==JSON.stringify(['clap'])))))throw new TypeError('Sibling Args generated Clap macro path is shadowed in an original ancestor');
          }
          if(owners.some(owner=>owner!==true&&owner.target.join('::')==='clap::ValueEnum'))output.valueEnum=proveClapValueEnumSourceOutput({dependencies,source:module.source.slice(candidate.start,candidate.end)});
          if(owners.some(owner=>owner!==true&&owner.target.join('::')==='clap::Args')) {
            output.args=proveClapArgsSourceOutput({dependencies,source:module.source,span:{start:candidate.start,end:candidate.end}});
            if(output.args.outputs.some(branch=>branch.concatExpansions.length)) {
              const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
              if(ancestors.some(candidate=>candidate.bindings.some(binding=>binding.name==='concat'&&macroBindingAffects(binding,'bang'))||candidate.unresolvedImports.some(entry=>entry.glob||entry.name==='concat')||candidate.bindings.some(binding=>binding.namespace==='type'&&['std','core'].includes(binding.name))))throw new TypeError('Generated Args concat caller has an unresolved import or shadow in an original ancestor');
              if(ancestors.some(candidate=>candidate.unresolvedBangMacroScope!==false))throw new TypeError('Generated Args concat caller requires independent original bang/export ancestor closure; scalar quote output remains unproved for namespace admission');
              // A literal output proof cannot itself mint caller resolution.
              throw new TypeError('Generated Args concat caller lacks a sealed original builtin binding certificate');
            }
          }
          if(Object.keys(output).length)clapSourceOutputs.set(invocationId(module,candidate),output);
          return true;
        }catch(error){clapSourceRefusals.set(invocationId(module,candidate),error.message);return false;}
      }
      return condition.attributes.every(attribute=>isInertConditionalAttribute(attribute)||['cfg','path','doc','allow','warn','deny','forbid','must_use','inline','cold','deprecated','repr','non_exhaustive','track_caller','macro_use','macro_export'].includes(attribute.name))&&!scope.bindings.some(binding=>binding.namespace==='macro'&&binding.macroKind!=='bang'&&condition.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&attribute.name===binding.name))&&originalDeclarationHeader(candidate,condition,module);
    })&&!scope.unresolvedImports.some(entry=>entry.glob));
  }
  const root=scopes.get('crate');
  // A root derive cannot bootstrap its own proof from a spelling. Its entire
  // original attribute footprint must independently match locked owners first.
  const coreOwner=root&&root.configurationCondition==='active'&&(!root.unresolvedAttributeMacroScope||attributeClosure.get(moduleScopeKey(root)))&&!root.bindings.some(binding=>binding.namespace==='type'&&binding.name==='core')&&!root.unresolvedImports.some(entry=>entry.glob||entry.name==='core');
  const byId=new Map(),diagnostics=[],moduleHashes=[];
  for(const module of modules) {
    if(typeof module.source!=='string'||typeof module.file!=='string')throw new TypeError('Missing original derive source');
    const sourceSha256=hash(module.source);moduleHashes.push({source:module.file,module:[...module.path],sha256:sourceSha256});
    const scope=scopes.get(key(['crate',...module.path]));
    const attributesClosed=attributeClosure.get(moduleScopeKey(module));
    for(const item of (module.items??sourceItems(module.source)).filter(item=>['struct','enum'].includes(item.term))) {
      if(!item.tokens.some(token=>token.text==='derive'))continue;
      try {
        const input=inspectDeriveInput(item,profile),owners=[];
        if(clapSourceRefusals.has(invocationId(module,item)))throw new TypeError(clapSourceRefusals.get(invocationId(module,item)));
        if(!attributesClosed)throw new TypeError('Sibling attribute, conditional item, glob or item expansion retains derive owner uncertainty');
        for(const invocation of input.derives) {
          if(invocation.path.length===1&&STANDARD_LAYOUT_DERIVES.has(invocation.path[0])) {
            if(!standardOwner(invocation.path,scope))throw new TypeError('Standard derive owner is shadowed');
            continue;
          }
          const owner=actualOwner(invocation.path,scope,scopes,external,dependencies);
          if(!owner)throw new TypeError('Derive invocation lacks actual locked macro binding: '+key(invocation.path));
          owners.push({...owner,attributeSpan:invocation.attributeSpan});
        }
        if(!owners.length&&!input.builtinDefault)continue;
        if(!coreOwner)throw new TypeError('Derive error branch has no checked standard core owner');
        let builtinDefault=null;
        if(input.builtinDefault) {
          const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
          if(ancestors.some(candidate=>candidate.bindings.some(binding=>binding.namespace==='macro'&&binding.macroKind!=='bang'&&['Default','default'].includes(binding.name)))||root.bindings.some(binding=>binding.namespace==='type'&&binding.name==='std'))throw new TypeError('Builtin Default attribute or standard owner is shadowed');
          const proof=builtinDefaultDependencyProof(dependencies);
          builtinDefault={...input.builtinDefault,owner:{target:['core','default','Default'],resolution:'closed-standard-attribute-prelude',sourceProfileDigest:proof.digest},dependencyProof:proof};
        }
        const clapOwner=owners.find(owner=>owner.target.join('::')==='clap::ValueEnum');
        const clapValueEnumOutput=clapOwner?clapSourceOutputs.get(invocationId(module,item))?.valueEnum:null;
        const clapArgsOwner=owners.find(owner=>owner.target.join('::')==='clap::Args');
        const clapArgsOutput=clapArgsOwner?clapSourceOutputs.get(invocationId(module,item))?.args:null;
        if(clapOwner&&!clapValueEnumOutput||clapArgsOwner&&!clapArgsOutput)throw new TypeError('Clap source output lacks its exact original cached invocation');
        let clapGeneratedAttributeOwners=null;
        if(clapValueEnumOutput||clapArgsOutput) {
          const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
          if(ancestors.some(candidate=>!attributeClosure.get(moduleScopeKey(candidate))||candidate.bindings.some(binding=>['allow','automatically_derived'].includes(binding.name)&&macroBindingAffects(binding,'attribute'))))throw new TypeError('Generated Clap builtin attributes have an unresolved or shadowed original ancestor');
          if(clapArgsOutput&&ancestors.some(candidate=>candidate.bindings.some(binding=>binding.namespace==='type'&&binding.name==='clap'&&(binding.status!=='resolved'||JSON.stringify(binding.target)!==JSON.stringify(['clap'])))))throw new TypeError('Generated Args Clap macro path is shadowed in an original ancestor');
          clapGeneratedAttributeOwners={names:['allow','automatically_derived'],scopes:ancestors.map(candidate=>({source:candidate.file,module:candidate.path,originalAttributeFootprintClosed:true})),bindingsDigest:hash(JSON.stringify(baseline)),generatedAttributeOwnersResolved:true};
        }
        for(const helper of input.attributes.filter(attribute=>attribute.helpers)) {
          if(helper.name==='schemars'&&!owners.some(owner=>owner.target[0]==='schemars')||helper.name==='serde'&&!owners.some(owner=>['serde','schemars'].includes(owner.target[0])))throw new TypeError('Helper attribute lacks an actual declaring derive owner');
          if(helper.name==='value'&&!clapOwner)throw new TypeError('Value helper lacks an actual declaring Clap ValueEnum owner');
          if(helper.name==='arg'&&!clapArgsOwner)throw new TypeError('Arg helper lacks an actual declaring Clap Args owner');
          if(helper.name==='schemars')for(const entry of helper.helpers.filter(entry=>entry.key==='with')) {
            entry.namespaceInput={...entry.namespaceInput,outputConfinement:proveSchemarsWithTypeConfinement({dependencies,value:entry.value,position:helper.position})};
          }
        }
        const evidence={schema:'derive-namespace-footprint-v1',source:module.file,module:[...module.path],sourceViewDigest:module.sourceView?.digest??null,sourceSha256,span:{start:item.start,end:item.end},itemSha256:hash(module.source.slice(item.start,item.end)),kind:input.kind,name:input.name,compilationProfile:profile,condition:input.condition,owners,attributes:input.attributes,...(clapValueEnumOutput?{clapValueEnumOutput,clapGeneratedAttributeOwners}:{}),...(clapArgsOutput?{clapArgsOutput,clapGeneratedAttributeOwners}:{}),...(input.lifetimeParameters?{lifetimeParameters:input.lifetimeParameters}:{}),...(input.genericParameters?{genericParameters:input.genericParameters}:{}),...(builtinDefault?{builtinDefault}:{}),dependenciesDigest:dependencies.digest,coreOwner:{target:['core','compile_error'],source:dependencies.standardCore},dimensions:{typeNamespaceComplete:true,valueNamespaceComplete:true,attributeMacroComplete:true,bangMacroComplete:false},generatedImplBehavior:false,obligations:['generated trait implementations are not lowered','fixed successful-expansion bang macro closure remains unproved'],confinement:builtinDefault&&!owners.length?'Pinned builtin Default emits one trait impl. Other original derive behavior remains unsupported; original unit-variant layout and helper tokens are retained.':'Successful outputs retain anonymous const groups or a source-proved Clap trait impl; original data and inert helper syntax remain unchanged. Unsupported output branches retain independent obligations.'};
        const certificate=freeze({...evidence,digest:hash(JSON.stringify(evidence))});certificates.set(certificate,{dependencies,input,source:module.source,sourceView:module.sourceView});byId.set(invocationId(module,item),certificate);
      } catch(error){diagnostics.push({source:module.file,span:{start:item.start,end:item.end},name:item.name,message:error.message});}
    }
  }
  const evidence={schema:'derive-footprint-context-v1',dependenciesDigest:dependencies.digest,compilationProfile:profile,sources:moduleHashes,certificates:[...byId.values()],diagnostics};
  const context=freeze({...evidence,digest:hash(JSON.stringify(evidence))});
  const originalModules=freeze(modules.map(module=>{
    const allItems=originalSourceModuleItems(module),items=module.configurationCondition==='inactive'?[]:allItems.filter(item=>itemConfiguration(item.tokens,profile).status!=='inactive');
    return {file:module.file,path:[...module.path],moduleScopeKey:moduleScopeKey(module),source:module.source,compilationProfile:profile,items,allItems,
      ...(Object.hasOwn(module,'sourceView')?{sourceView:module.sourceView}:{}),...(module.configurationCondition?{configurationCondition:module.configurationCondition}:{})};
  }));
  const originalExternal=new Map([...external].map(([path,table])=>[path,freeze(structuredClone(table))]));
  contexts.set(context,{byId,external:originalExternal,dependencies,originalModules});return context;
}

export function deriveFootprintAt(context,module,item) {
  const state=contexts.get(context);if(!state)throw new TypeError('Unsealed derive footprint context');
  const certificate=state.byId.get(invocationId(module,item));
  if(!certificate)return null;
  if(certificate.sourceSha256!==hash(module.source)||certificate.itemSha256!==hash(module.source.slice(item.start,item.end)))throw new TypeError('Derive certificate no longer matches original source');
  const suppliedProfile=Object.hasOwn(module,'compilationProfile')?compilationProfile(module.compilationProfile):context.compilationProfile;
  if(certificates.get(certificate).sourceView!==module.sourceView||JSON.stringify(suppliedProfile)!==JSON.stringify(certificate.compilationProfile))throw new TypeError('Derive certificate original module view or compilation profile changed');
  const original=originalSourceModuleItems(module).find(candidate=>candidate.start===item.start&&candidate.end===item.end);
  if(!original||original.term!==item.term||original.name!==item.name||JSON.stringify(original.tokens)!==JSON.stringify(item.tokens))throw new TypeError('Derive certificate invocation differs from original module items');
  return certificate;
}
export function isDeriveFootprintCertificate(certificate){return !!certificate&&certificates.has(certificate);}
export function isDeriveFootprintContext(context){return !!context&&contexts.has(context);}
// A later output grammar check must use the same original module/dependency
// context as the input certificate. This accessor confers no output authority.
export function deriveFootprintOriginalContext(context,certificate){
  const state=contexts.get(context);
  if(!state||![...state.byId.values()].includes(certificate))throw new TypeError('Derive output requires its original sealed input context');
  return {modules:state.originalModules,dependencies:state.dependencies,externalModules:new Map(state.external),compilationProfile:context.compilationProfile};
}
// Select the exact private scoped original for this genuine invocation. A
// whole-file SHA alone cannot choose among sibling inline module views.
export function deriveFootprintOriginalModule(context,certificate){
  const state=contexts.get(context),sealed=certificates.get(certificate);
  if(!state||!sealed||![...state.byId.values()].includes(certificate))throw new TypeError('Derive output requires its original sealed input context');
  const candidates=state.originalModules.filter(module=>module.file===certificate.source&&JSON.stringify(module.path)===JSON.stringify(certificate.module));
  if(candidates.length!==1||candidates[0].sourceView!==sealed.sourceView||hash(candidates[0].source)!==certificate.sourceSha256)throw new TypeError('Derive output original scoped module changed');
  const module=candidates[0],item=originalSourceModuleItems(module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end);
  if(!item||deriveFootprintAt(context,module,item)!==certificate)throw new TypeError('Derive output original scoped invocation changed');return module;
}
// Complete authentic source context, not a caller-supplied declaration subset.
// Consumers still need separate output proofs for each actual derive owner.
export function deriveFootprintSourceContext(context){
  const state=contexts.get(context);if(!state)throw new TypeError('Unsealed original derive source context');
  return {modules:state.originalModules,dependencies:state.dependencies,externalModules:new Map(state.external),compilationProfile:context.compilationProfile};
}
export function deriveFootprintExternalModules(context){const state=contexts.get(context);if(!state)throw new TypeError('Unsealed derive footprint context');return new Map(state.external);}
export function assertDeriveFootprintCertificate(certificate,source,offset=0) {
  if(!isDeriveFootprintCertificate(certificate)||source!==certificates.get(certificate).source.slice(certificate.span.start,certificate.span.end)||offset!==certificate.span.start)throw new TypeError('Unsealed or mismatched original derive source certificate');
  return certificate;
}
