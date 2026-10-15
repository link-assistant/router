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
import {proveBuiltinScalarSourceOutput} from './builtin-scalar-ast-route.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {encodeBuiltinSourceMeta,decodeBuiltinSourceMeta} from './builtin-source-meta.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
import {registeredDeriveHelperSource} from './derive-helper-namespaces.mjs';
import {builtinStandardDeriveRegistry,builtinStandardDeriveSourceOwner} from './builtin-derive-standard-inputs.mjs';
import {createOriginalAncestorAttributeScopeContext,proveOriginalConditionalSiblingScope} from './derive-ancestor-attribute-scope.mjs';
export {createDeriveDependencyProof};
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const contexts=new WeakMap(),certificates=new WeakMap(),concatCallerSources=new WeakMap(),helperProofs=new WeakSet(),helperCertificates=new WeakMap();
const key=path=>path.join('::');
const invocationId=(module,item)=>moduleScopeKey(module)+':'+item.start+':'+item.end;
const standardOwner=(path,scope)=>path.length===1&&STANDARD_LAYOUT_DERIVES.has(path[0])&&!scope.bindings.some(binding=>binding.namespace==='macro'&&binding.name===path[0]&&binding.macroKind!=='bang');
function originalDeclarationHeader(item,condition,module,scope) {
  if(inertInnerLintItem(item,module.source,module.sourceView,module.compilationProfile))return true;
  const tokens=item.tokens.filter(token=>token.type!=='comment'),end=condition.attributes.at(-1)?.span.end??item.start;
  let at=tokens.findIndex(token=>token.start>=end);
  if(tokens[at]?.text==='pub') {
    at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return false;}
  }
  while(['async','unsafe','default'].includes(tokens[at]?.text))at++;
  if(tokens[at]?.text==='extern'&&tokens[at+1]?.text==='crate') {
    // The binder owns crate identity. An exact original self alias introduces
    // one type binding, without importing an external procedural macro crate.
    // An alias spelling or a structural item's guessed term cannot prove this.
    const alias=tokens[at+4],tail=tokens.slice(at),rawName=tokens[at+6];
    const rawAlias=tail.length===8&&alias?.text==='r'&&tokens[at+5]?.text==='#'&&rawName?.type==='ident'&&alias.end===tokens[at+5].start&&tokens[at+5].end===rawName.start;
    if(!rawAlias&&(tail.length!==6||alias?.type!=='ident')||tokens[at+2]?.text!=='self'||tokens[at+2]?.rawIdentifier||tokens[at+3]?.text!=='as'||tail.at(-1)?.text!==';')return false;
    const bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name===(rawAlias?rawName.text:alias.text));
    return bindings?.length===1&&bindings[0].status==='resolved'&&bindings[0].externCrateSelf===true&&bindings[0].externCrateBinding===true&&bindings[0].source===module.file&&JSON.stringify(bindings[0].target)===JSON.stringify(['crate'])&&bindings[0].span?.start===item.start&&bindings[0].span?.end===item.end&&bindings[0].declaration?.source===module.file&&bindings[0].declaration?.span?.start===item.start&&bindings[0].declaration?.span?.end===item.end;
  }
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
  const attributeClosure=new Map(),clapSourceOutputs=new Map(),clapSourceRefusals=new Map(),moduleInputs=new Map(),scalarConcatCandidates=[];
  for(const module of modules) {
    const scope=scopes.get(key(['crate',...module.path])),inputs=new Map();
    for(const candidate of module.items.filter(item=>['struct','enum'].includes(item.term)&&item.tokens.some(token=>token.text==='derive')))try{inputs.set(candidate.start,inspectDeriveInput(candidate,profile));}catch{}
    moduleInputs.set(moduleScopeKey(module),inputs);
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
            if(output.args.outputs.some(branch=>branch.concatExpansions.length))scalarConcatCandidates.push({module,candidate,scope,output});
          }
          if(Object.keys(output).length)clapSourceOutputs.set(invocationId(module,candidate),output);
          return true;
        }catch(error){clapSourceRefusals.set(invocationId(module,candidate),error.message);return false;}
      }
      return condition.attributes.every(attribute=>isInertConditionalAttribute(attribute)||['cfg','path','doc','allow','warn','deny','forbid','must_use','inline','cold','deprecated','repr','non_exhaustive','track_caller','macro_use','macro_export'].includes(attribute.name))&&!scope.bindings.some(binding=>binding.namespace==='macro'&&binding.macroKind!=='bang'&&condition.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&attribute.name===binding.name))&&originalDeclarationHeader(candidate,condition,module,scope);
    })&&!scope.unresolvedImports.some(entry=>entry.glob));
  }
  // Preserve the old module-wide closure above. Only an actual owner request
  // may join a source-proved unrelated conditional module declaration below.
  let ancestorSourceContext=null;
  const ownerRequests=(input,names=[])=>{
    const attributes=[...new Set(['cfg','derive',...input.attributes.map(attribute=>attribute.name),...input.derives.map(invocation=>invocation.path.at(-1)),...names])],types=[...new Set(['core','std',...input.derives.flatMap(invocation=>invocation.path.length>1?[invocation.path[0]]:[invocation.path[0]]),...attributes])];
    return [...attributes.map(name=>({namespace:'attribute',name})),...types.map(name=>({namespace:'type',name}))];
  };
  const activeOriginalItemClosed=(module,scope,candidate)=>{
    const condition=itemConfiguration(candidate.tokens,profile);if(condition.status!=='active')return false;
    const input=moduleInputs.get(moduleScopeKey(module)).get(candidate.start);
    if(input){const owners=input.derives.map(invocation=>standardOwner(invocation.path,scope)?true:actualOwner(invocation.path,scope,scopes,external,dependencies));if(owners.some(owner=>!owner)||clapSourceRefusals.has(invocationId(module,candidate)))return false;for(const owner of owners.filter(owner=>owner!==true&&owner.target[0]==='clap')){const output=clapSourceOutputs.get(invocationId(module,candidate));if(owner.target.join('::')==='clap::ValueEnum'&&!output?.valueEnum||owner.target.join('::')==='clap::Args'&&!output?.args)return false;}return true;}
    return condition.attributes.every(attribute=>isInertConditionalAttribute(attribute)||['cfg','path','doc','allow','warn','deny','forbid','must_use','inline','cold','deprecated','repr','non_exhaustive','track_caller','macro_use','macro_export'].includes(attribute.name))&&!scope.bindings.some(binding=>binding.namespace==='macro'&&binding.macroKind!=='bang'&&condition.attributes.some(attribute=>!isInertConditionalAttribute(attribute)&&attribute.name===binding.name))&&originalDeclarationHeader(candidate,condition,module,scope);
  };
  const requestedAttributeClosure=(scope,caller,requests)=>{
    const module=modules.find(module=>moduleScopeKey(module)===moduleScopeKey(scope));if(!module||scope.configurationCondition!=='active'||caller.configurationCondition==='unknown'||caller.configurationCondition==='inactive')return null;
    if(attributeClosure.get(moduleScopeKey(scope)))return {originalAttributeFootprintClosed:true,conditionalSiblingProofs:[]};
    const names=new Set(requests.map(request=>request.name));if(scope.unresolvedImports.some(entry=>entry.glob||names.has(entry.name))||scope.bindings.some(binding=>names.has(binding.name)&&macroBindingAffects(binding,'attribute')))return null;
    const conditionalSiblingProofs=[];for(const candidate of module.items){const condition=itemConfiguration(candidate.tokens,profile);if(condition.status==='active'){if(!activeOriginalItemClosed(module,scope,candidate))return null;continue;}
      try{ancestorSourceContext??=createOriginalAncestorAttributeScopeContext({modules,binding:baseline,dependencies});conditionalSiblingProofs.push(proveOriginalConditionalSiblingScope({context:ancestorSourceContext,module,item:candidate,caller,requests}));}catch{return null;}
    }
    return conditionalSiblingProofs.length?{originalAttributeFootprintClosed:false,conditionalSiblingProofs}:null;
  };
  // Stage complete successful output grammars independently of caller lookup.
  // This discharges the original owner/helper export obligations before resolving
  // the expression-only concat sink. A source quote cannot supply its own owner.
  for(const pending of scalarConcatCandidates.sort((a,b)=>a.module.path.length-b.module.path.length))try{
    const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>pending.scope.path[index]===name)),closedOwners=[],originalScopes=[],sourceProofs=[];
    const inert=new Set(['doc','allow','warn','deny','forbid','must_use','inline','cold','deprecated','track_caller','non_exhaustive']);
    for(const scope of scopes.values()){
      const isAncestor=ancestors.includes(scope),module=modules.find(value=>value.file===scope.file&&JSON.stringify(value.path)===JSON.stringify(scope.path));
      if(!module||scope.configurationCondition!=='active'||!attributeClosure.get(moduleScopeKey(module)))throw new TypeError('Generated Args concat requires complete original attribute/owner ancestor closure');
      if(scope.bindings.some(binding=>binding.name==='concat'&&macroBindingAffects(binding,'bang')||binding.namespace==='type'&&['std','core'].includes(binding.name))||scope.unresolvedImports.some(entry=>entry.glob||['concat','std','core',...inert].includes(entry.name)))throw new TypeError('Generated Args concat has an original ancestor shadow or unresolved relevant import');
      if(scope.bindings.some(binding=>inert.has(binding.name)&&macroBindingAffects(binding,'attribute')))throw new TypeError('Generated Args concat ancestor builtin attributes are shadowed');
      const inputs=moduleInputs.get(moduleScopeKey(module));
      for(const item of module.items){
        const input=inputs.get(item.start),written=module.source.slice(item.start,item.end),trees=originalMacroTrees(written);
        function scan(nodes){for(let at=0;at<nodes.length;at++){
          if(nodes[at].text==='!'&&nodes[at-1]?.text!=='#')throw new TypeError('Generated Args concat ancestor retains an original bang invocation or macro definition');
          if(nodes[at].text==='#'){let next=at+1;if(nodes[next]?.text==='!')next++;const group=nodes[next];if(group?.delimiter!=='[')throw new TypeError('Generated Args concat ancestor attribute syntax remains unproved');const attr=group.children[0]?.text;
            if(!inert.has(attr)&&!(input&&['derive','arg'].includes(attr)))throw new TypeError('Generated Args concat ancestor retains an unproved attribute or prelude switch: '+attr);at=next;continue;
          }
          if(nodes[at].kind==='group'){if(item.term==='mod'&&nodes[at]===trees.at(-1)&&nodes[at].delimiter==='{'){const child=modules.find(value=>value.file===module.file&&JSON.stringify(value.path)===JSON.stringify([...module.path,item.name])&&value.sourceView?.declaration?.span.start===item.start&&value.sourceView?.declaration?.span.end===item.end);if(!child)throw new TypeError('Generated Args concat requires the genuine complete inline child source view');}else scan(nodes[at].children);}
        }}scan(trees);
        if(!input)continue;
        const output=clapSourceOutputs.get(invocationId(module,item));
        for(const invocation of input.derives){
          if(standardOwner(invocation.path,scope)){
            if(!['Clone','Debug','Default'].includes(invocation.path[0]))throw new TypeError('Generated Args concat retains an independent builtin output owner: '+invocation.path.join('::'));
            const proof=proveBuiltinScalarSourceOutput({dependencies,source:module.source,span:{start:item.start,end:item.end},owner:invocation.path[0]});
            if(proof.input.fields.some(field=>field.attributes.some(attr=>attr.children[0]?.text==='arg'))&&!output?.args)throw new TypeError('Generated Args concat ancestor has an unowned original arg helper');
            sourceProofs.push(proof);closedOwners.push({source:module.file,module:module.path,span:proof.span,target:['core',invocation.path[0]],proof:{schema:proof.schema,digest:proof.digest,plan:proof.plan,branchDigests:proof.branches.map(branch=>({feature:branch.feature,digest:hash(JSON.stringify(branch))})),positiveOutputGrammarComplete:proof.positiveOutputGrammarComplete}});
          }else{
            const owner=actualOwner(invocation.path,scope,scopes,external,dependencies);
            if(owner?.target.join('::')!=='clap::Args'||!output?.args)throw new TypeError('Generated Args concat retains an independent original derive owner: '+invocation.path.join('::'));
            closedOwners.push({source:module.file,module:module.path,span:{start:item.start,end:item.end},target:owner.target,proofDigest:output.args.digest,expressionSinks:output.args.outputs.map(branch=>({feature:branch.feature,concat:branch.concatExpansions.map(proof=>proof.digest),valueParsers:output.args.valueParserExpansions.map(proof=>proof.expansionDigest)}))});
          }
        }
      }
      originalScopes.push({source:module.file,module:module.path,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView?.digest??null,resolverScopeSha256:hash(JSON.stringify(scope)),isAncestor,configurationCondition:scope.configurationCondition,unresolvedImports:scope.unresolvedImports});
    }
    const expansions=pending.output.args.outputs.flatMap(branch=>branch.concatExpansions);
    if(!expansions.length||expansions.some(proof=>proof.meta.expression.kind!=='Lit'||proof.meta.attrs.length||proof.plan.rules.filter(rule=>['original-builtin-registration','original-core-builtin-owner'].includes(rule.role)).length!==2))throw new TypeError('Generated Args concat lacks its independent original builtin literal sink');
    const evidence={schema:'original-scalar-args-concat-caller-v1',source:pending.module.file,sourceSha256:hash(pending.module.source),span:{start:pending.candidate.start,end:pending.candidate.end},dependenciesDigest:dependencies.digest,compilationProfile:profile,resolved:['core','concat'],originalScopes,closedOwners,crateExportProducingInputsComplete:true,expansionDigests:expansions.map(proof=>proof.digest),builtinRegistration:expansions[0].plan.rules.filter(rule=>['original-builtin-registration','original-core-builtin-owner'].includes(rule.role)),macroOwnerResolved:true,scopeWideCompleteness:false,generatedImplBehavior:false};
    pending.output.concatCaller=freeze({...evidence,digest:hash(JSON.stringify(evidence))});concatCallerSources.set(pending.output.concatCaller,freeze(sourceProofs));
  }catch(error){attributeClosure.set(moduleScopeKey(pending.module),false);clapSourceOutputs.delete(invocationId(pending.module,pending.candidate));clapSourceRefusals.set(invocationId(pending.module,pending.candidate),error.message);}
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
        let standardInput=null,standardRegistry=null;
        if(!owners.length&&!input.builtinDefault){
          if(input.genericParameters||input.lifetimeParameters||input.absentConditionalAttributes.length||input.inertConditionalAttributes.length||input.attributes.some(attribute=>attribute.helpers||!['derive','doc','allow','warn','deny','forbid','must_use'].includes(attribute.name)))throw new TypeError('Standard-only input retains a generic, helper, configuration or layout obligation');
          const ancestors=[...scopes.values()].filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name)),names=new Set(['core','std',...input.attributes.map(attribute=>attribute.name),...input.derives.map(invocation=>invocation.path[0])]);
          const missingModule=binding=>binding.namespace==='type'&&binding.kind==='mod'&&(binding.status!=='resolved'||binding.via==='declaration'&&binding.target?.[0]==='crate'&&!modules.some(module=>JSON.stringify(['crate',...module.path])===JSON.stringify(binding.target)));
          const requested=ownerRequests(input),closures=ancestors.map(candidate=>requestedAttributeClosure(candidate,module,requested));
          if(!ancestors.length||ancestors.some((candidate,index)=>candidate.configurationCondition!=='active'||!closures[index]||candidate.bindings.some(binding=>missingModule(binding)&&!closures[index].conditionalSiblingProofs.some(proof=>JSON.stringify(proof.originalBinding)===JSON.stringify(binding))||names.has(binding.name)&&macroBindingAffects(binding,'attribute')||binding.namespace==='type'&&['core','std'].includes(binding.name))||candidate.unresolvedImports.some(entry=>entry.glob||names.has(entry.name))))throw new TypeError('Standard-only input has an unresolved original ancestor, prelude root or attribute owner');
          standardRegistry=builtinStandardDeriveRegistry(dependencies);
          const standardOwners=input.derives.map(invocation=>{const owner=builtinStandardDeriveSourceOwner(standardRegistry,dependencies,invocation.path[0]);return {invocation,target:owner.target,declaration:owner.declaration,symbol:owner.symbol,registration:{name:owner.registration.name,callback:owner.registration.callback,deriveModule:owner.registration.deriveModule},corePrelude:owner.corePrelude,stdPrelude:owner.stdPrelude,callbackBodyCompiled:false};});
          standardInput={schema:'original-standard-only-derive-input-v1',registryDigest:standardRegistry.digest,sourceProfileSha256:standardRegistry.sourceProfileSha256,completeRegistrationEntries:standardRegistry.registration.completeEntries.length,owners:standardOwners,originalScopes:ancestors.map((candidate,index)=>({source:candidate.file,module:candidate.path,configurationCondition:candidate.configurationCondition,resolverScopeSha256:hash(JSON.stringify(candidate)),originalAttributeFootprintClosed:closures[index].originalAttributeFootprintClosed,...(closures[index].conditionalSiblingProofs.length?{requestedOwnersClosed:true,conditionalSiblingScopeProofs:closures[index].conditionalSiblingProofs}:{}),unresolvedImports:candidate.unresolvedImports})),namespaceAuthority:false,runtimeAuthority:false,generatedImplBehavior:false};
        }
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
          const requested=ownerRequests(input,['allow','automatically_derived']),closures=ancestors.map(candidate=>requestedAttributeClosure(candidate,module,requested));
          if(ancestors.some((candidate,index)=>!closures[index]||candidate.bindings.some(binding=>['allow','automatically_derived'].includes(binding.name)&&macroBindingAffects(binding,'attribute'))))throw new TypeError('Generated Clap builtin attributes have an unresolved or shadowed original ancestor');
          if(clapArgsOutput&&ancestors.some(candidate=>candidate.bindings.some(binding=>binding.namespace==='type'&&binding.name==='clap'&&(binding.status!=='resolved'||JSON.stringify(binding.target)!==JSON.stringify(['clap'])))))throw new TypeError('Generated Args Clap macro path is shadowed in an original ancestor');
          clapGeneratedAttributeOwners={names:['allow','automatically_derived'],scopes:ancestors.map((candidate,index)=>({source:candidate.file,module:candidate.path,originalAttributeFootprintClosed:closures[index].originalAttributeFootprintClosed,...(closures[index].conditionalSiblingProofs.length?{requestedOwnersClosed:true,conditionalSiblingScopeProofs:closures[index].conditionalSiblingProofs}:{} )})),bindingsDigest:hash(JSON.stringify(baseline)),generatedAttributeOwnersResolved:true};
        }
        for(const helper of input.attributes.filter(attribute=>attribute.helpers)) {
          if(helper.name==='schemars'&&!owners.some(owner=>owner.target[0]==='schemars')||helper.name==='serde'&&!owners.some(owner=>['serde','schemars'].includes(owner.target[0])))throw new TypeError('Helper attribute lacks an actual declaring derive owner');
          if(helper.name==='value'&&!clapOwner)throw new TypeError('Value helper lacks an actual declaring Clap ValueEnum owner');
          if(helper.name==='arg'&&!clapArgsOwner)throw new TypeError('Arg helper lacks an actual declaring Clap Args owner');
          if(helper.name==='schemars')for(const entry of helper.helpers.filter(entry=>entry.key==='with')) {
            entry.namespaceInput={...entry.namespaceInput,outputConfinement:proveSchemarsWithTypeConfinement({dependencies,value:entry.value,position:helper.position})};
          }
        }
        const evidence={schema:'derive-namespace-footprint-v1',source:module.file,module:[...module.path],sourceViewDigest:module.sourceView?.digest??null,sourceSha256,span:{start:item.start,end:item.end},itemSha256:hash(module.source.slice(item.start,item.end)),kind:input.kind,name:input.name,compilationProfile:profile,condition:input.condition,owners,attributes:input.attributes,...(clapValueEnumOutput?{clapValueEnumOutput,clapGeneratedAttributeOwners}:{}),...(clapArgsOutput?{...(clapSourceOutputs.get(invocationId(module,item))?.concatCaller?{clapArgsOutputStorage:encodeBuiltinSourceMeta(clapArgsOutput),clapConcatCaller:clapSourceOutputs.get(invocationId(module,item)).concatCaller}:{clapArgsOutput}),clapGeneratedAttributeOwners}:{}),...(input.lifetimeParameters?{lifetimeParameters:input.lifetimeParameters}:{}),...(input.genericParameters?{genericParameters:input.genericParameters}:{}),...(builtinDefault?{builtinDefault}:{}),dependenciesDigest:dependencies.digest,coreOwner:{target:['core','compile_error'],source:dependencies.standardCore},dimensions:{typeNamespaceComplete:true,valueNamespaceComplete:true,attributeMacroComplete:true,bangMacroComplete:false},generatedImplBehavior:false,obligations:['generated trait implementations are not lowered','fixed successful-expansion bang macro closure remains unproved'],confinement:builtinDefault&&!owners.length?'Pinned builtin Default emits one trait impl. Other original derive behavior remains unsupported; original unit-variant layout and helper tokens are retained.':'Successful outputs retain anonymous const groups or a source-proved Clap trait impl; original data and inert helper syntax remain unchanged. Unsupported output branches retain independent obligations.'};
        if(standardInput){evidence.standardInput=standardInput;evidence.dimensions.typeNamespaceComplete=false;evidence.dimensions.valueNamespaceComplete=false;evidence.obligations.push('standard-only registered input requires independent complete output grammar for every actual owner');evidence.confinement='Actual standard declarations, preludes and complete compiler registration identify inputs only. Generated layouts, namespace outputs and trait bodies retain separate obligations.';}
        const certificate=freeze({...evidence,digest:hash(JSON.stringify(evidence))});if(certificate.clapArgsOutputStorage&&JSON.stringify(decodeBuiltinSourceMeta(certificate.clapArgsOutputStorage))!==JSON.stringify(clapArgsOutput))throw new TypeError('Original scalar Args storage roundtrip changed');certificates.set(certificate,{dependencies,input,source:module.source,sourceView:module.sourceView,clapArgsOutput,clapValueEnumOutput,standardRegistry});byId.set(invocationId(module,item),certificate);
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
  contexts.set(context,{byId,external:originalExternal,dependencies,originalModules,helperScopes:baseline.scopes,attributeClosure,requestedAttributeClosure,ownerRequests});return context;
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
// Inert helper ownership is independent of generated bang output. Consume the
// complete private source invocation, never an exposed certificate or span alone.
export function deriveFootprintHelperAttributeAt(context,module,item,span){
  const certificate=deriveFootprintAt(context,module,item),state=contexts.get(context);
  if(!certificate||certificate.condition.status!=='active'||certificate.dimensions.attributeMacroComplete!==true)return null;
  const attribute=certificate.attributes.find(row=>row.position!=='container'&&row.span.start===span?.start&&row.span.end===span?.end);
  if(!attribute)return null;
  const ancestors=state.helperScopes.filter(scope=>scope.path.every((part,index)=>certificate.module[index]===part));
  const attributeNames=new Set([...certificate.attributes.map(row=>row.name),...(attribute.name==='default'?['Default']:[])]);
  const originalModule=state.originalModules.find(candidate=>moduleScopeKey(candidate)===moduleScopeKey(module)),requests=state.ownerRequests({attributes:certificate.attributes,derives:certificate.attributes.filter(row=>row.name==='derive').flatMap(row=>row.derives.map(path=>({path})))},[...attributeNames]),closures=ancestors.map(scope=>state.requestedAttributeClosure(scope,originalModule,requests));
  const missingModule=binding=>binding.namespace==='type'&&binding.kind==='mod'&&(binding.status!=='resolved'||binding.via==='declaration'&&binding.target?.[0]==='crate'&&!state.originalModules.some(module=>JSON.stringify(['crate',...module.path])===JSON.stringify(binding.target)));
  if(!ancestors.length||ancestors.some((scope,index)=>scope.configurationCondition!=='active'||!closures[index]||scope.bindings.some(binding=>missingModule(binding)&&!closures[index].conditionalSiblingProofs.some(proof=>JSON.stringify(proof.originalBinding)===JSON.stringify(binding))||attributeNames.has(binding.name)&&macroBindingAffects(binding,'attribute'))||scope.unresolvedImports.some(entry=>entry.glob||attributeNames.has(entry.name))))return null;
  const builtin=attribute.name==='default'?certificate.builtinDefault:null;
  if(attribute.name==='default'&&(!builtin||builtin.attributeSpan.start!==attribute.span.start||builtin.attributeSpan.end!==attribute.span.end))return null;
  const owners=builtin?[builtin.owner]:certificate.owners;
  if(!owners.length||attribute.name==='serde'&&!attribute.helpers)return null;
  let cache=helperCertificates.get(certificate);if(!cache){cache=new Map();helperCertificates.set(certificate,cache);}const key=attribute.span.start+':'+attribute.span.end;if(cache.has(key))return cache.get(key);
  const registrations=owners.map(owner=>registeredDeriveHelperSource({dependencies:state.dependencies,target:owner.target,helperName:attribute.name,defaultProof:builtin?.dependencyProof})).filter(Boolean);
  if(!registrations.length)return null;
  const evidence={schema:'original-nested-derive-helper-owner-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,sourceViewDigest:certificate.sourceViewDigest,module:certificate.module,compilationProfile:certificate.compilationProfile,invocationSpan:certificate.span,inputCertificateDigest:certificate.digest,attribute,registrations,ancestorScopes:ancestors.map((scope,index)=>({source:scope.file,module:scope.path,configurationCondition:scope.configurationCondition,originalAttributeFootprintClosed:closures[index].originalAttributeFootprintClosed,...(closures[index].conditionalSiblingProofs.length?{requestedOwnersClosed:true,conditionalSiblingScopeProofs:closures[index].conditionalSiblingProofs}:{} )})),exactNestedHelperInert:true,namespaceAuthority:false,bangOutputAuthority:false,copyAuthority:false,generatedImplBehavior:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});helperProofs.add(proof);cache.set(key,proof);return proof;
}
export const isDeriveFootprintHelperAttributeProof=value=>!!value&&helperProofs.has(value);
export function isDeriveFootprintCertificate(certificate){return !!certificate&&certificates.has(certificate);}
export function isDeriveFootprintContext(context){return !!context&&contexts.has(context);}
// A later output grammar check must use the same original module/dependency
// context as the input certificate. This accessor confers no output authority.
export function deriveFootprintOriginalContext(context,certificate){
  const state=contexts.get(context);
  if(!state||![...state.byId.values()].includes(certificate))throw new TypeError('Derive output requires its original sealed input context');
  return {modules:state.originalModules,dependencies:state.dependencies,externalModules:new Map(state.external),compilationProfile:context.compilationProfile};
}
// The full registered-source lineage stays private and shared. Serialized
// reference digests alone cannot supply this actual input join.
export function deriveFootprintStandardInputSource(context,certificate){const state=contexts.get(context),sealed=certificates.get(certificate);if(!state||!sealed?.standardRegistry||![...state.byId.values()].includes(certificate))throw new TypeError('Standard-only source input requires its genuine original certificate/context');return {registry:sealed.standardRegistry,input:sealed.input,module:deriveFootprintOriginalModule(context,certificate)};}
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

export function deriveFootprintConcatSourceProofs(context,certificate){deriveFootprintOriginalContext(context,certificate);const proofs=concatCallerSources.get(certificate.clapConcatCaller);if(!proofs)throw new TypeError('Concat original source proofs require their genuine private caller certificate');return proofs;}

export function deriveFootprintClapArgsSourceOutput(context,certificate){deriveFootprintOriginalContext(context,certificate);const state=certificates.get(certificate);if(!state?.clapArgsOutput)throw new TypeError('Original Args output requires its genuine private invocation');return state.clapArgsOutput;}
export function deriveFootprintClapValueEnumSourceOutput(context,certificate){deriveFootprintOriginalContext(context,certificate);const state=certificates.get(certificate);if(!state?.clapValueEnumOutput)throw new TypeError('Original ValueEnum output requires its genuine private invocation');return state.clapValueEnumOutput;}
