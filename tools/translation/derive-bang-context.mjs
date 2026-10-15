// Per-original-invocation namespace use of sealed generated bang outputs.
// Output owners are joined here; executable traits and other dimensions are not.
import {createHash} from 'node:crypto';
import {compilationProfile} from './cfg-profile.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {deriveFootprintSourceContext,deriveFootprintAt,isDeriveFootprintContext,deriveFootprintClapArgsSourceOutput} from './derive-footprints.mjs';
import {proveSerdeSerializeBangFootprint,assertSerdeSerializeBangFootprint,originalSerdeSerializeOutput} from './serde-bang-footprints.mjs';
import {proveSerdeDeserializeBangFootprint,assertSerdeDeserializeBangFootprint,originalSerdeDeserializeOutputs} from './serde-deserialize-bang-footprints.mjs';
import {hasBuiltinDeriveBangRoute,proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint,originalBuiltinDeriveEnclosingOutput} from './builtin-derive-bang-footprints.mjs';
import {proveClapArgsBangFootprint,assertClapArgsBangFootprint} from './clap-args-bang-footprints.mjs';
import {proveClapValueEnumBangFootprint,assertClapValueEnumBangFootprint,originalClapValueEnumBangOutput} from './clap-value-enum-bang-footprints.mjs';
import {proveSchemarsBangFootprint,assertSchemarsBangFootprint,originalSchemarsOutput} from './schemars-bang-footprints.mjs';
const contexts=new WeakMap(),certificates=new WeakMap(),cachedContexts=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const id=(module,span)=>moduleScopeKey(module)+':'+span.start+':'+span.end;
const pathKey=path=>JSON.stringify(path);
const moduleKey=moduleScopeKey;
const tables=external=>JSON.stringify([...external].sort(([a],[b])=>a<b?-1:a>b?1:0));
const routes=new Map([
  ['serde::Serialize',{prove:proveSerdeSerializeBangFootprint,assert:assertSerdeSerializeBangFootprint}],
  ['serde::Deserialize',{prove:proveSerdeDeserializeBangFootprint,assert:assertSerdeDeserializeBangFootprint}],
  ['clap::Args',{prove:proveClapArgsBangFootprint,assert:assertClapArgsBangFootprint}],
  ['clap::ValueEnum',{prove:proveClapValueEnumBangFootprint,assert:assertClapValueEnumBangFootprint}],
  ['schemars::JsonSchema',{prove:proveSchemarsBangFootprint,assert:assertSchemarsBangFootprint}],
]);

export function createDeriveBangContext({deriveContext}={}){
  if(!isDeriveFootprintContext(deriveContext))throw new TypeError('Bang output requires an original sealed derive context');
  if(cachedContexts.has(deriveContext))return cachedContexts.get(deriveContext);
  const original=deriveFootprintSourceContext(deriveContext),byId=new Map(),diagnostics=[],rows=[];
  for(const input of deriveContext.certificates){
    const actual=input.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
    const selected=[],residual=[];
    for(const invocation of actual){
      const owners=input.owners.filter(owner=>pathKey(owner.path)===pathKey(invocation.path)&&owner.attributeSpan.start===invocation.attributeSpan.start&&owner.attributeSpan.end===invocation.attributeSpan.end);
      // Input footprint intentionally omits standard builtin owners. That is
      // not evidence of empty output: their bang route stays independently open.
      if(owners.length===0&&invocation.path.length===1&&hasBuiltinDeriveBangRoute(invocation.path[0])){
        try{
          const proof=assertBuiltinDeriveBangFootprint(proveBuiltinDeriveBangFootprint({context:deriveContext,certificate:input,invocation}),deriveContext,input,invocation);
          if(proof.selectedOwnerBangComplete!==true)throw new TypeError('Builtin selected output remains incomplete');
          selected.push({invocation,owner:{path:invocation.path,attributeSpan:invocation.attributeSpan,target:proof.owner.target,source:'original-standard-owner+pinned-builtin-registration'},proof,builtin:true});
        }catch(error){residual.push({...invocation,reason:error.message});}
        continue;
      }
      if(owners.length!==1){residual.push({...invocation,reason:'actual derive output owner is absent/ambiguous in the selected sealed registry'});continue;}
      const owner=owners[0],route=routes.get(owner.target.join('::'));
      if(!route){residual.push({...invocation,target:owner.target,reason:'actual derive owner has no selected bang-output route'});continue;}
      try{
        const proof=route.assert(route.prove({context:deriveContext,certificate:input}),deriveContext,input);
        if(proof.selectedOwnerBangComplete!==true||proof.owners.length!==1||pathKey(proof.owners[0].target)!==pathKey(owner.target))throw new TypeError('Selected output proof does not cover the actual original owner');
        if(owner.target.at(-1)==='Deserialize'&&(proof.outputs.length!==2||proof.outputs.some(output=>output.semanticSyntaxRoundTrip!==true)||proof.featureEvidence.strategy!=='both original generated-output branches retained'))throw new TypeError('Deserialize output feature cases remain incomplete');
        selected.push({invocation,owner,proof});
      }catch(error){residual.push({...invocation,target:owner.target,reason:error.message});}
    }
    const allOwnersProven=actual.length>0&&selected.length===actual.length&&residual.length===0;
    const evidence={schema:'original-invocation-bang-output-v1',source:input.source,sourceSha256:input.sourceSha256,module:input.module,sourceViewDigest:input.sourceViewDigest,span:input.span,itemSha256:input.itemSha256,inputCertificateDigest:input.digest,dependenciesDigest:input.dependenciesDigest,compilationProfile:input.compilationProfile,actualOwners:actual,selectedOwners:selected.map(({invocation,owner,proof,builtin})=>({invocation,target:owner.target,proofDigest:proof.digest,attributeOwnersDigest:hash(JSON.stringify(proof.attributeOwners)),...(builtin?{astOutputSink:proof.slotProofs.outputKind}:{fixedMacroDigest:hash(JSON.stringify(proof.fixedMacro))}),...(proof.outputs?{featureOutputDigests:proof.outputs.map(output=>({feature:output.feature,digest:output.outputGrammarDigest}))}:{...(proof.outputGrammarDigest?{outputGrammarDigest:proof.outputGrammarDigest}:{})})})),residualOwners:residual,dimensions:{bangMacroComplete:allOwnersProven,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false};
    const certificate=freeze({...evidence,digest:hash(JSON.stringify(evidence))});rows.push(certificate);
    if(allOwnersProven){byId.set(id({file:input.source,path:input.module},input.span),certificate);certificates.set(certificate,{deriveContext,input,selected});}
    else diagnostics.push({kind:'derive-bang-output',source:input.source,span:input.span,name:input.name,message:'original derive invocation retains unproved output owners',residualOwners:residual});
  }
  const evidence={schema:'sealed-derive-bang-context-v1',deriveContextDigest:deriveContext.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:original.compilationProfile,sources:original.modules.map(module=>({source:module.file,module:module.path,sha256:hash(module.source),configurationCondition:module.configurationCondition??null,sourceViewDigest:module.sourceView?.digest??null,moduleScopeKey:moduleScopeKey(module)})),certificates:rows,diagnostics,generatedImplBehavior:false,scopeWideCompleteness:false};
  // Retain parsed item snapshots only for this optional consumer, not every
  // baseline derive context. One immutable original context shares this work.
  const canonicalModules=original.modules; // Private snapshots retain genuine scoped source views/items.
  const context=freeze({...evidence,digest:hash(JSON.stringify(evidence))});contexts.set(context,{deriveContext,original,canonicalModules,byId,moduleSnapshots:new Map(original.modules.map(module=>[moduleKey(module),module])),externalDigest:hash(tables(original.externalModules))});cachedContexts.set(deriveContext,context);return context;
}
export const isDeriveBangContext=value=>!!value&&contexts.has(value);

// Consume the exact complete original graph/profile/external composition.
// Return genuine parsed snapshots, preventing supplied item subsets from
// discarding unrelated unknown macros before the normal binding walk.
function validateItemCarrier(module,original){
  // The authoritative original scoped selection remains private. An omitted
  // carrier is harmless; a provided carrier cannot erase/retype its items.
  for(const name of ['items','allItems'])if(Object.hasOwn(module,name)&&JSON.stringify(module[name])!==JSON.stringify(original[name]))throw new TypeError('Bang original scoped item carrier changed');
}
export function deriveBangModules(context,{deriveContext,modules,externalModules,compilationProfile:profileInput}){
  const state=contexts.get(context);
  if(!state||state.deriveContext!==deriveContext||!Array.isArray(modules)||!(externalModules instanceof Map))throw new TypeError('Bang context requires its original complete source composition');
  if(JSON.stringify(compilationProfile(profileInput))!==JSON.stringify(context.compilationProfile)||hash(tables(externalModules))!==state.externalDigest)throw new TypeError('Bang source profile or external namespaces changed');
  if(modules.length!==state.moduleSnapshots.size)throw new TypeError('Bang context original module set is incomplete');
  const seen=new Set();
  for(const module of modules){
    const key=moduleKey(module),actual=state.moduleSnapshots.get(key);
    if(!actual||seen.has(key)||module.source!==actual.source||(module.configurationCondition??null)!==(actual.configurationCondition??null)||module.sourceView!==actual.sourceView||Object.hasOwn(module,'sourceView')!==Object.hasOwn(actual,'sourceView')||module.moduleScopeKey!==undefined&&module.moduleScopeKey!==actual.moduleScopeKey)throw new TypeError('Bang context original module/path/source/condition changed');
    if(module.compilationProfile!==undefined&&JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(context.compilationProfile))throw new TypeError('Bang module compilation profile changed');originalSourceModuleItems(module);validateItemCarrier(module,actual);seen.add(key);
  }
  return state.canonicalModules;
}
export function deriveBangOutputAt(context,deriveContext,module,item){
  const state=contexts.get(context);if(!state||state.deriveContext!==deriveContext)throw new TypeError('Unsealed or unrelated bang output context');
  const actualModule=state.moduleSnapshots.get(moduleKey(module));
  if(!actualModule||actualModule.source!==module.source||(actualModule.configurationCondition??null)!==(module.configurationCondition??null)||module.sourceView!==actualModule.sourceView||Object.hasOwn(module,'sourceView')!==Object.hasOwn(actualModule,'sourceView')||module.moduleScopeKey!==undefined&&module.moduleScopeKey!==actualModule.moduleScopeKey)throw new TypeError('Bang invocation original module identity changed');
  if(module.compilationProfile!==undefined&&JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(context.compilationProfile))throw new TypeError('Bang invocation source profile changed');
  validateItemCarrier(module,actualModule);
  const certificate=state.byId.get(id(module,{start:item.start,end:item.end}));if(!certificate)return null;
  const sealed=certificates.get(certificate),input=deriveFootprintAt(deriveContext,module,item);
  if(!sealed||input!==sealed.input||item.term!==input.kind||item.name!==input.name||certificate.sourceSha256!==hash(module.source)||certificate.itemSha256!==hash(module.source.slice(item.start,item.end)))throw new TypeError('Bang output no longer matches its original invocation');
  for(const selected of sealed.selected)if(selected.builtin)assertBuiltinDeriveBangFootprint(selected.proof,deriveContext,input,selected.invocation);else routes.get(selected.owner.target.join('::')).assert(selected.proof,deriveContext,input);
  return certificate;
}
export function deriveBangHelperAttributeAt(context,deriveContext,module,item,span){
  const certificate=deriveBangOutputAt(context,deriveContext,module,item);if(!certificate)return false;
  const {input}=certificates.get(certificate);
  // A locked derive declares this inert helper. Its exact original token
  // syntax and namespace were checked by every joined selected output route.
  // Other nested attributes still pass through the ordinary uncertainty scan.
  const helperNames=new Set(['serde',...(certificate.selectedOwners.some(owner=>owner.target.join('::')==='clap::Args')?['arg']:[]),...(certificate.selectedOwners.some(owner=>owner.target.join('::')==='clap::ValueEnum')?['value']:[])]);
  return input.dimensions.attributeMacroComplete===true&&input.attributes.some(attribute=>attribute.position!=='container'&&helperNames.has(attribute.name)&&attribute.helpers&&attribute.span.start===span.start&&attribute.span.end===span.end);
}

// Return only outputs already owned by this exact private whole invocation.
// Public certificate dimensions, digests or user-provided output trees are not
// an input. Every sibling derive owner must have passed its complete bang and
// generated-attribute issuer before these actual outputs can be inspected.
export function originalDeriveBangEnclosingOutputs(context,deriveContext,module,item){
 const certificate=deriveBangOutputAt(context,deriveContext,module,item);
 if(!certificate)throw new TypeError('Original derive output has unresolved actual owners');
 const state=certificates.get(certificate),outputs=[];
 if(state.selected.length>128)throw new TypeError('Original enclosing-output owner bound exceeded');
 for(const selected of state.selected){
  const {proof,invocation}=selected;
  if(selected.builtin){outputs.push({format:'builtin-impl',invocation,output:originalBuiltinDeriveEnclosingOutput(proof,deriveContext,state.input,invocation)});continue;}
  const target=selected.owner.target.join('::');
  const quote=output=>outputs.push({format:'quote',invocation,proof,syntax:output.syntax});
  if(target==='serde::Serialize')quote(originalSerdeSerializeOutput(proof,deriveContext,state.input,module,item));
  else if(target==='serde::Deserialize')for(const row of originalSerdeDeserializeOutputs(proof,deriveContext,state.input,module,item))quote(row.output);
  else if(target==='schemars::JsonSchema')quote(originalSchemarsOutput(proof,deriveContext,state.input,module,item));
  else if(target==='clap::ValueEnum')quote(originalClapValueEnumBangOutput(proof,deriveContext,state.input));
  else if(target==='clap::Args')for(const row of deriveFootprintClapArgsSourceOutput(deriveContext,state.input).outputs)quote(row);
  else throw new TypeError('Original derive owner has no complete enclosing-output grammar');
 }
 return Object.freeze({certificate,input:state.input,outputs:Object.freeze(outputs.map(row=>Object.freeze(row)))});
}
