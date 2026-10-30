import {withWholeOriginalAttributeOwnerOperation} from "./proof-byte-whole-owner-serde-bang-footprints-candidate.mjs";
// Explicit enclosing-name format. Debug named/unit grammar is privately issued;
// every other selected sibling retains its complete original output route.
import {createHash} from 'node:crypto';
import {createPrivateFrozenJsonCache,privateFrozenJsonOwnFieldsAliasHint} from './private-frozen-json.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {deriveFootprintSourceContext,deriveFootprintAt,isDeriveFootprintContext,deriveFootprintClapArgsSourceOutput} from './derive-footprints.mjs';
import {proveSerdeSerializeBangFootprint,assertSerdeSerializeBangFootprint,originalSerdeSerializeOutput} from "./proof-byte-whole-owner-serde-bang-footprints-candidate.mjs";
import {proveSerdeDeserializeBangFootprint,assertSerdeDeserializeBangFootprint,originalSerdeDeserializeOutputs} from "./proof-byte-whole-owner-serde-deserialize-bang-footprints-candidate.mjs";
import {hasBuiltinDeriveBangRoute,proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint,originalBuiltinDeriveEnclosingOutput} from "./proof-byte-whole-owner-builtin-derive-bang-footprints-candidate.mjs";
import {proveClapArgsBangFootprint,assertClapArgsBangFootprint} from "./proof-byte-whole-owner-clap-args-bang-footprints-candidate.mjs";
import {proveClapValueEnumBangFootprint,assertClapValueEnumBangFootprint,originalClapValueEnumBangOutput} from "./proof-byte-whole-owner-clap-value-enum-bang-footprints-candidate.mjs";
import {proveSchemarsBangFootprint,assertSchemarsBangFootprint,originalSchemarsOutput} from './schemars-enclosing-output-dispatch.mjs';
import {types} from 'node:util';
import {originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {withRetainedPrivateNativeProofCostScope} from './private-native-proof-json.mjs';
const contextTypeOwner=types;
let nativeContextOperations=null;
function contextReady(){
 if(types!==contextTypeOwner)return false;
 if(!nativeContextOperations){
  const field=Object.getOwnPropertyDescriptor(contextTypeOwner,'isProxy');
  if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='function'||originalCapturedFunctionSource(field.value)!=='function isProxy() { [native code] }'||field.value(contextTypeOwner))return false;
  if(!originalDataFreezeIntrinsicsUnchanged())return false;
  const define=Object.getOwnPropertyDescriptor(Object,'defineProperty');
  if(!define||!Object.hasOwn(define,'value')||originalCapturedFunctionSource(define.value)!=='function defineProperty() { [native code] }')return false;
  nativeContextOperations={owner:contextTypeOwner,proxy:field,defineField:define,isProxy:field.value,get:Object.getOwnPropertyDescriptor,apply:Reflect.apply,define:define.value,weakGet:WeakMap.prototype.get,weakSet:WeakMap.prototype.set,mapGet:Map.prototype.get,mapSet:Map.prototype.set,map:Array.prototype.map,freeze:Object.freeze,keys:Reflect.ownKeys,stringify:JSON.stringify};
 }
 const ops=nativeContextOperations;
 if(types!==ops.owner||ops.isProxy(ops.owner))return false;
 const actual=ops.get(ops.owner,'isProxy'),old=ops.proxy,define=ops.get(Object,'defineProperty');
 if(!actual||!Object.hasOwn(actual,'value')||actual.value!==old.value||actual.writable!==old.writable||actual.enumerable!==old.enumerable||actual.configurable!==old.configurable||!define||!Object.hasOwn(define,'value')||define.value!==ops.define||define.writable!==ops.defineField.writable||define.enumerable!==ops.defineField.enumerable||define.configurable!==ops.defineField.configurable)return false;
 return originalDataFreezeIntrinsicsUnchanged();
}
function requireContextNative(){if(!contextReady())throw new TypeError('Enclosing namespace native DATA operations changed');}
const privateGet=(table,key)=>table?nativeContextOperations.apply(nativeContextOperations.weakGet,table,[key]):undefined;
const privateSet=(table,key,value)=>nativeContextOperations.apply(nativeContextOperations.weakSet,table,[key,value]);
function privateAppend(array,value){nativeContextOperations.define(array,''+array.length,{__proto__:null,value,writable:true,enumerable:true,configurable:true});}
const privateLookup=(table,key)=>nativeContextOperations.apply(nativeContextOperations.mapGet,table,[key]);
const privateBind=(table,key,value)=>nativeContextOperations.apply(nativeContextOperations.mapSet,table,[key,value]);
const privateMap=(array,callback)=>nativeContextOperations.apply(nativeContextOperations.map,array,[callback]);
let originalJson=null,contexts=null,certificates=null;
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){const ops=nativeContextOperations;for(const key of ops.keys(value)){const field=ops.get(value,key);if(!field||!Object.hasOwn(field,'value'))throw new TypeError('Enclosing namespace private DATA field changed');freeze(field.value);}ops.freeze(value);}return value;};
const id=(module,span)=>moduleScopeKey(module)+':'+span.start+':'+span.end;
const pathKey=path=>nativeContextOperations.stringify(path);
const moduleKey=moduleScopeKey;
const tables=external=>JSON.stringify([...external].sort(([a],[b])=>a<b?-1:a>b?1:0));
function enclosingRoutes(){return routes??=new Map([
  ['serde::Serialize',{prove:proveSerdeSerializeBangFootprint,assert:assertSerdeSerializeBangFootprint}],
  ['serde::Deserialize',{prove:proveSerdeDeserializeBangFootprint,assert:assertSerdeDeserializeBangFootprint}],
  ['clap::Args',{prove:proveClapArgsBangFootprint,assert:assertClapArgsBangFootprint}],
  ['clap::ValueEnum',{prove:proveClapValueEnumBangFootprint,assert:assertClapValueEnumBangFootprint}],
  ['schemars::JsonSchema',{prove:proveSchemarsBangFootprint,assert:assertSchemarsBangFootprint}],
]);}
let routes=null;
import {withDefaultProofByteConsumers} from './default-proof-byte-operation.mjs';


export function createDeriveEnclosingNamespaceContext({deriveContext}={}){
  return withRetainedPrivateNativeProofCostScope(()=>withDefaultProofByteConsumers(()=>createUnscopedDeriveEnclosingNamespaceContext({deriveContext})));
}
// Use the same fresh, bounded DATA-cost scope as the legacy complete creator.
// It closes before return; source, owner and semantic checks still run afresh.
function createUnscopedDeriveEnclosingNamespaceContext({deriveContext}={}){
  requireContextNative();
  if(!isDeriveFootprintContext(deriveContext))throw new TypeError('Bang output requires an original sealed derive context');
  originalJson??=createPrivateFrozenJsonCache();contexts??=new WeakMap();certificates??=new WeakMap();
  const original=deriveFootprintSourceContext(deriveContext);requireContextNative();const byId=new Map(),diagnostics=[],rows=[];
  for(const input of deriveContext.certificates){
    requireContextNative();
    const actual=input.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
    const selected=[],residual=[];
    for(const invocation of actual){
      requireContextNative();
      const owners=input.owners.filter(owner=>pathKey(owner.path)===pathKey(invocation.path)&&owner.attributeSpan.start===invocation.attributeSpan.start&&owner.attributeSpan.end===invocation.attributeSpan.end);
      // Input footprint intentionally omits standard builtin owners. That is
      // not evidence of empty output: their bang route stays independently open.
      if(owners.length===0&&invocation.path.length===1&&hasBuiltinDeriveBangRoute(invocation.path[0])){
        try{
          if(invocation.path[0]==='Debug'){
            const namespace=proveBuiltinDebugEnclosingNamespace({context:deriveContext,certificate:input,invocation});
            if(namespace){
              const facts=requireBuiltinDebugEnclosingNamespace(namespace,deriveContext,input,invocation);
              privateAppend(selected,{invocation,owner:{path:invocation.path,attributeSpan:invocation.attributeSpan,target:['core','Debug'],source:'original-standard-owner+pinned-builtin-registration'},namespace,facts,builtin:true});
              continue;
            }
          }
          const proof=assertBuiltinDeriveBangFootprint(proveBuiltinDeriveBangFootprint({context:deriveContext,certificate:input,invocation}),deriveContext,input,invocation);
          if(proof.selectedOwnerBangComplete!==true)throw new TypeError('Builtin selected output remains incomplete');
          privateAppend(selected,{invocation,owner:{path:invocation.path,attributeSpan:invocation.attributeSpan,target:proof.owner.target,source:'original-standard-owner+pinned-builtin-registration'},proof,builtin:true});
        }catch(error){privateAppend(residual,{...invocation,reason:error.message});}
        continue;
      }
      if(owners.length!==1){privateAppend(residual,{...invocation,reason:'actual derive output owner is absent/ambiguous in the selected sealed registry'});continue;}
      const owner=owners[0],route=privateLookup(enclosingRoutes(),owner.target.join('::'));
      if(!route){privateAppend(residual,{...invocation,target:owner.target,reason:'actual derive owner has no selected bang-output route'});continue;}
      try{
        const proof=route.assert(route.prove({context:deriveContext,certificate:input}),deriveContext,input);
        if(proof.selectedOwnerBangComplete!==true||proof.owners.length!==1||pathKey(proof.owners[0].target)!==pathKey(owner.target))throw new TypeError('Selected output proof does not cover the actual original owner');
        if(owner.target.at(-1)==='Deserialize'&&(proof.outputs.length!==2||proof.outputs.some(output=>output.semanticSyntaxRoundTrip!==true)||proof.featureEvidence.strategy!=='both original generated-output branches retained'))throw new TypeError('Deserialize output feature cases remain incomplete');
        privateAppend(selected,{invocation,owner,proof});
      }catch(error){privateAppend(residual,{...invocation,target:owner.target,reason:error.message});}
    }
    requireContextNative();
    const allOwnersProven=actual.length>0&&selected.length===actual.length&&residual.length===0;
    const evidence={schema:'original-invocation-enclosing-output-v1',source:input.source,sourceSha256:input.sourceSha256,module:input.module,sourceViewDigest:input.sourceViewDigest,span:input.span,itemSha256:input.itemSha256,inputCertificateDigest:input.digest,dependenciesDigest:input.dependenciesDigest,compilationProfile:input.compilationProfile,actualOwners:actual,selectedOwners:privateMap(selected,enclosingSelectedOwner),residualOwners:residual,enclosingOwnerSetClosed:allOwnersProven,namespaceAuthority:false,runtimeAuthority:false,generatedImplBehavior:false};
    const digest=hash(nativeContextOperations.stringify(evidence));requireContextNative();
    const certificate=freeze({...evidence,digest});privateAppend(rows,certificate);
    if(allOwnersProven){privateBind(byId,id({file:input.source,path:input.module},input.span),certificate);privateSet(certificates,certificate,{deriveContext,input,selected});}
    else privateAppend(diagnostics,{kind:'derive-bang-output',source:input.source,span:input.span,name:input.name,message:'original derive invocation retains unproved output owners',residualOwners:residual});
  }
  requireContextNative();
  const evidence={schema:'sealed-derive-enclosing-namespace-context-v1',deriveContextDigest:deriveContext.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:original.compilationProfile,sources:original.modules.map(module=>({source:module.file,module:module.path,sha256:hash(module.source),configurationCondition:module.configurationCondition??null,sourceViewDigest:module.sourceView?.digest??null,moduleScopeKey:moduleScopeKey(module)})),certificates:rows,diagnostics,generatedImplBehavior:false,scopeWideCompleteness:false};
  // Retain parsed item snapshots only for this optional consumer, not every
  // baseline derive context. One immutable original context shares this work.
  const canonicalModules=original.modules; // Private snapshots retain genuine scoped source views/items.
  const digest=hash(nativeContextOperations.stringify(evidence)),externalDigest=hash(tables(original.externalModules));requireContextNative();
  const context=freeze({...evidence,digest}),moduleSnapshots=new Map(original.modules.map(module=>[moduleKey(module),module]));
  privateSet(contexts,context,{deriveContext,original,canonicalModules,byId,moduleSnapshots,externalDigest});return context;
}
export const isDeriveEnclosingNamespaceContext=value=>{requireContextNative();return !!value&&!!privateGet(contexts,value);};

// Consume the exact complete original graph/profile/external composition.
// Return genuine parsed snapshots, preventing supplied item subsets from
// discarding unrelated unknown macros before the normal binding walk.
function validateItemCarrier(module,original){
  if(privateFrozenJsonOwnFieldsAliasHint(module,original,['items','allItems'])===true)return;
  // The authoritative original scoped selection remains private. An omitted
  // carrier is harmless; a provided carrier cannot erase/retype its items.
  for(const name of ['items','allItems'])if(Object.hasOwn(module,name)&&JSON.stringify(module[name])!==originalJson(original[name]))throw new TypeError('Bang original scoped item carrier changed');
}
export function deriveEnclosingNamespaceModules(context,{deriveContext,modules,externalModules,compilationProfile:profileInput}){
  requireContextNative();const state=privateGet(contexts,context);
  if(!state||state.deriveContext!==deriveContext||!Array.isArray(modules)||!(externalModules instanceof Map))throw new TypeError('Bang context requires its original complete source composition');
  if(JSON.stringify(compilationProfile(profileInput))!==JSON.stringify(context.compilationProfile)||hash(tables(externalModules))!==state.externalDigest)throw new TypeError('Bang source profile or external namespaces changed');
  if(modules.length!==state.moduleSnapshots.size)throw new TypeError('Bang context original module set is incomplete');
  const seen=new Set();
  for(const module of modules){
    const key=moduleKey(module),actual=privateLookup(state.moduleSnapshots,key);
    if(!actual||seen.has(key)||module.source!==actual.source||(module.configurationCondition??null)!==(actual.configurationCondition??null)||module.sourceView!==actual.sourceView||Object.hasOwn(module,'sourceView')!==Object.hasOwn(actual,'sourceView')||module.moduleScopeKey!==undefined&&module.moduleScopeKey!==actual.moduleScopeKey)throw new TypeError('Bang context original module/path/source/condition changed');
    if(module.compilationProfile!==undefined&&JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(context.compilationProfile))throw new TypeError('Bang module compilation profile changed');originalSourceModuleItems(module);validateItemCarrier(module,actual);seen.add(key);
  }
  return state.canonicalModules;
}
export function deriveEnclosingNamespaceOutputAt(context,deriveContext,module,item){
  requireContextNative();const state=privateGet(contexts,context);if(!state||state.deriveContext!==deriveContext)throw new TypeError('Unsealed or unrelated bang output context');
  const actualModule=privateLookup(state.moduleSnapshots,moduleKey(module));
  if(!actualModule||actualModule.source!==module.source||(actualModule.configurationCondition??null)!==(module.configurationCondition??null)||module.sourceView!==actualModule.sourceView||Object.hasOwn(module,'sourceView')!==Object.hasOwn(actualModule,'sourceView')||module.moduleScopeKey!==undefined&&module.moduleScopeKey!==actualModule.moduleScopeKey)throw new TypeError('Bang invocation original module identity changed');
  if(module.compilationProfile!==undefined&&JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(context.compilationProfile))throw new TypeError('Bang invocation source profile changed');
  validateItemCarrier(module,actualModule);
  const certificate=privateLookup(state.byId,id(module,{start:item.start,end:item.end}));if(!certificate)return null;
  const sealed=privateGet(certificates,certificate),input=deriveFootprintAt(deriveContext,module,item);
  if(!sealed||input!==sealed.input||item.term!==input.kind||item.name!==input.name||certificate.sourceSha256!==hash(module.source)||certificate.itemSha256!==hash(module.source.slice(item.start,item.end)))throw new TypeError('Bang output no longer matches its original invocation');
  requireContextNative();
  for(const selected of sealed.selected)if(selected.namespace)requireBuiltinDebugEnclosingNamespace(selected.namespace,deriveContext,input,selected.invocation);else if(selected.builtin)assertBuiltinDeriveBangFootprint(selected.proof,deriveContext,input,selected.invocation);else privateLookup(enclosingRoutes(),selected.owner.target.join('::')).assert(selected.proof,deriveContext,input);
  // Other full owners may hash/reenter. Finish with the dimension issuer's
  // current source/invocation fence after all of those observations.
  for(const selected of sealed.selected)if(selected.namespace)requireBuiltinDebugEnclosingNamespace(selected.namespace,deriveContext,input,selected.invocation);
  return certificate;
}
export function deriveEnclosingNamespaceHelperAttributeAt(context,deriveContext,module,item,span){
  const certificate=deriveEnclosingNamespaceOutputAt(context,deriveContext,module,item);if(!certificate)return false;
  const {input}=privateGet(certificates,certificate);
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
export function originalDeriveEnclosingNamespaceOutputs(context,deriveContext,module,item){
 const certificate=deriveEnclosingNamespaceOutputAt(context,deriveContext,module,item);
 if(!certificate)throw new TypeError('Original derive output has unresolved actual owners');
 requireContextNative();const state=privateGet(certificates,certificate),outputs=[];
 if(state.selected.length>128)throw new TypeError('Original enclosing-output owner bound exceeded');
 for(const selected of state.selected){
  const {proof,invocation}=selected;
  if(selected.namespace){privateAppend(outputs,{format:'debug-enclosing',invocation,facts:reissueBuiltinDebugEnclosingNamespace(selected.namespace,deriveContext,state.input,invocation)});continue;}
  if(selected.builtin){privateAppend(outputs,{format:'builtin-impl',invocation,output:originalBuiltinDeriveEnclosingOutput(proof,deriveContext,state.input,invocation)});continue;}
  const target=selected.owner.target.join('::');
  const quote=output=>privateAppend(outputs,{format:'quote',invocation,proof,syntax:output.syntax});
  if(target==='serde::Serialize')quote(originalSerdeSerializeOutput(proof,deriveContext,state.input,module,item));
  else if(target==='serde::Deserialize')for(const row of originalSerdeDeserializeOutputs(proof,deriveContext,state.input,module,item))quote(row.output);
  else if(target==='schemars::JsonSchema')quote(originalSchemarsOutput(proof,deriveContext,state.input,module,item));
  else if(target==='clap::ValueEnum')quote(originalClapValueEnumBangOutput(proof,deriveContext,state.input));
  else if(target==='clap::Args')for(const row of deriveFootprintClapArgsSourceOutput(deriveContext,state.input).outputs)quote(row);
  else throw new TypeError('Original derive owner has no complete enclosing-output grammar');
 }
 requireContextNative();
 return nativeContextOperations.freeze({certificate,input:state.input,outputs:nativeContextOperations.freeze(privateMap(outputs,row=>nativeContextOperations.freeze(row)))});
}


import {proveBuiltinDebugEnclosingNamespace,requireBuiltinDebugEnclosingNamespace,reissueBuiltinDebugEnclosingNamespace} from "./proof-byte-whole-owner-builtin-derive-bang-footprints-candidate.mjs";

function enclosingSelectedOwner(selected){
 if(selected.namespace)return {invocation:selected.invocation,target:selected.owner.target,format:'debug-enclosing-named-unit-v1',modelDigest:selected.facts.digest,methodBehavior:'opaque-untranslated',namespaceAuthority:false,runtimeAuthority:false};
 return (({invocation,owner,proof,builtin})=>({invocation,target:owner.target,proofDigest:proof.digest,attributeOwnersDigest:hash(nativeContextOperations.stringify(proof.attributeOwners)),...(builtin?{astOutputSink:proof.slotProofs.outputKind}:{fixedMacroDigest:hash(nativeContextOperations.stringify(proof.fixedMacro))}),...(proof.outputs?{featureOutputDigests:proof.outputs.map(output=>({feature:output.feature,digest:output.outputGrammarDigest}))}:{...(proof.outputGrammarDigest?{outputGrammarDigest:proof.outputGrammarDigest}:{})})}))(selected);
}

import {freshOriginalImplNamespaceSourcePlan as originalImplNamespaceSourcePlan,requireOriginalImplNamespaceSourcePlan} from './derive-ancestor-attribute-scope.mjs';
const fail=message=>{throw new TypeError('Original enclosing namespace format: '+message);};
let effects=null;
const word=node=>node?.tag==='token'?node.text:null;

export function proveDeriveEnclosingNamespaceEffect(context,deriveContext,module,item){
 const original=originalDeriveEnclosingNamespaceOutputs(context,deriveContext,module,item),sourcePlan=requireOriginalImplNamespaceSourcePlan(originalImplNamespaceSourcePlan()),budget={cells:0},alternatives=[];
 requireContextNative();
 if(original.outputs.length>256)fail('complete retained output alternative bound');
 for(const row of original.outputs){
  if(row.format==='debug-enclosing'){
   // Membership and fresh source/model reissue happened in the private issuer;
   // the public model's empty arrays and flags are never an admission input.
   privateAppend(alternatives,nativeContextOperations.freeze({invocation:row.invocation,kind:'ItemKind::Impl',format:'debug-enclosing-named-unit-v1',originalEnclosingModel:row.facts}));
  }else if(row.format==='builtin-impl'){
   if(row.output.sink.kind!=='ItemKind::Impl')fail('unproved builtin enclosing output');
   privateAppend(alternatives,nativeContextOperations.freeze({invocation:row.invocation,kind:'ItemKind::Impl',originalCompleteOutput:row.output}));
  }else if(row.format==='quote')privateAppend(alternatives,nativeContextOperations.freeze({invocation:row.invocation,roots:quoteRoots(row.syntax,budget),originalCompleteOwnerProof:row.proof}));
  else fail('unproved complete output domain');
 }
 if(!alternatives.length)fail('missing original output alternatives');
 requireOriginalImplNamespaceSourcePlan(sourcePlan);
 if(deriveEnclosingNamespaceOutputAt(context,deriveContext,module,item)!==original.certificate)fail('original invocation changed during enclosing proof');
 requireContextNative();
 const facts=nativeContextOperations.freeze({rule:nativeContextOperations.freeze({id:'rust.original-debug-enclosing-namespace-format.v1',runtimeAuthority:false}),certificate:original.certificate,alternatives:nativeContextOperations.freeze(alternatives),enclosingTypeBindings:nativeContextOperations.freeze([]),enclosingUsableValueBindings:nativeContextOperations.freeze([]),enclosingMacroNames:nativeContextOperations.freeze([]),cells:budget.cells,runtimeAuthority:false,generatedImplBehavior:false});
 const token=nativeContextOperations.freeze({schema:'private-derived-enclosing-namespace-effect-v1'});
 effects??=new WeakMap();privateSet(effects,token,{context,deriveContext,moduleKey:moduleScopeKey(module),source:module.source,sourceView:module.sourceView,itemStart:item.start,itemEnd:item.end,facts});return token;
}
export function deriveEnclosingNamespaceEffectFacts(token,context,deriveContext,module,item){
 requireContextNative();const state=privateGet(effects,token);
 if(!state||state.context!==context||state.deriveContext!==deriveContext||state.moduleKey!==moduleScopeKey(module)||state.source!==module.source||state.sourceView!==module.sourceView||state.itemStart!==item.start||state.itemEnd!==item.end)fail('copied, foreign or changed invocation effect');
 const current=proveDeriveEnclosingNamespaceEffect(context,deriveContext,module,item),fresh=privateGet(effects,current).facts;
 if(fresh.certificate!==state.facts.certificate)fail('original enclosing invocation changed');
 return fresh;
}

// Full legacy quote-domain grammar retained for every non-Debug sibling.
function quoteRoots(nodes,budget){
 const roots=[];let at=0;
 const count=()=>{if(++budget.cells>32000)fail('complete output effect cell bound');};
 function trees(items,depth=0){
  if(depth>64)fail('complete output effect depth bound');
  for(const node of items){count();if(node.tag==='group')trees(node.nodes,depth+1);else if(node.tag!=='token')fail('opaque generated output node');}
 }
 trees(nodes);
 while(at<nodes.length){
  while(word(nodes[at])==='#'){
   if(nodes[at+1]?.tag!=='group'||nodes[at+1].delimiter!=='[')fail('unproved enclosing generated attribute');
   at+=2; // Actual inert owner was checked by the original full output issuer.
  }
  if(word(nodes[at])==='impl'){
   const start=at++;while(at<nodes.length&&!(nodes[at].tag==='group'&&nodes[at].delimiter==='{')){
    if([';','='].includes(word(nodes[at])))fail('incomplete enclosing Impl header');at++;
   }
   if(at===nodes.length)fail('incomplete enclosing Impl output');
   privateAppend(roots,nativeContextOperations.freeze({kind:'ItemKind::Impl',originalSyntax:nativeContextOperations.freeze(nodes.slice(start,++at))}));
  }else if(word(nodes[at])==='const'&&word(nodes[at+1])==='_'&&word(nodes[at+2])===':'&&nodes[at+3]?.tag==='group'&&nodes[at+3].delimiter==='('&&!nodes[at+3].nodes.length&&word(nodes[at+4])==='='&&nodes[at+5]?.tag==='group'&&nodes[at+5].delimiter==='{'&&word(nodes[at+6])===';'){
   privateAppend(roots,nativeContextOperations.freeze({kind:'ItemKind::Const',identifier:'_',originalSyntax:nativeContextOperations.freeze(nodes.slice(at,at+7))}));at+=7;
  }else fail('enclosing item remains outside the complete Impl/anonymous-const grammar');
 }
 if(!roots.length)fail('missing complete generated enclosing item');return nativeContextOperations.freeze(roots);
}

export function createWholeOwnerDeriveEnclosingNamespaceContext({deriveContext}={}){return withRetainedPrivateNativeProofCostScope(()=>withWholeOriginalAttributeOwnerOperation(deriveContext,()=>createUnscopedDeriveEnclosingNamespaceContext({deriveContext}),()=>createUnscopedDeriveEnclosingNamespaceContext({deriveContext})));}
