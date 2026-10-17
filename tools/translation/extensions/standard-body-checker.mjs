import {originalMoveOwner,originalMoveContext,restoreOriginalMoves,requireOriginalOrElseMove} from './standard-move-payload.mjs';
import {hasOriginalStandardCall,requireOriginalStandardCall} from './original-standard-calls.mjs';
import {originalSharedDomainGuard,sharedDomainGuardNeeded,captureBorrowedLayouts,requireBorrowedLayouts} from './standard-borrowed-body.mjs';
import {hasMutableScalarBinding} from './control.mjs';
import {sharedReferenceCopyIdentity} from '../shared-reference-copy-source.mjs';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
// Specialize actual selected Rust bodies through the existing checker. The
// returned semantic tree uses the ordinary let/match/literal emitter.
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {rustFixedType,sameType} from '../checked-types.mjs';
import {checkedOptionNominal,optionNominalContext,restoreOptionNominals} from './option-nominal-proof.mjs';
import {SOURCE_STR} from './source-contract-types.mjs';
import {tokenizeRust} from './lexical.mjs';
import {TranslationError,unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {pinnedOptionBody,pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence,STANDARD_BODY_SOURCE_PROFILE} from './standard-body-source.mjs';
import {canonicalResult,knownResultDrop} from './result-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';

const OPTION_RESULT_RULE='rust.option.ok-or-else.original-body.v1';
const EAGER_OPTION_RESULT_RULE='rust.option.ok-or.original-body.v1';

const refuse=span=>{throw unsupported('pinned standard body owner','requires an actual by-value canonical Option with a checked scalar, borrowed str, or privately certified Copy nominal payload',span);};
function scalarOwner(type,span){
  if(!type||type.rustReference||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse(span);
  if(type.kind==='string'&&(type.rustSourceType||isDeepStrictEqual(type.rustStandardSignature,SOURCE_STR.rustStandardSignature)||type.rustBorrowLifetime?.kind==='static'&&type.rustBorrowLifetime.source==='string-literal')&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return '&str';
  if(type.kind==='bool'&&!type.rustOwnership)return 'bool';
  if(type.kind==='fixed'){
    const actual=rustFixedType(type.rustPrimitiveName);
    if(actual&&sameType(type,actual))return type.rustPrimitiveName;
  }
  if(type.kind==='float'&&type.rustPrimitiveName==='f64')return 'f64';
  return refuse(span);
}
export function payloadOwner(checker,type,span,{allowShared=false,allowMove=false,allowNestedOptions=false,depth=0,budget={remaining:512}}={}){
  if(allowNestedOptions&&type?.kind==='data'&&checker.items.get(type.name)?.standardGeneric?.kind==='Option'){
    if(depth>=32||--budget.remaining<0)refuse(span);
    return 'nested-option<'+optionPayload(checker,type,[],span,{allowShared,allowNestedOptions:true,depth:depth+1,budget}).owner+'>';
  }
  if(allowMove){const owner=originalMoveOwner(checker,type,span);if(owner)return owner;}
  if(allowShared&&type?.rustReference){const identity=sharedReferenceCopyIdentity(type);if(!identity)refuse(span);return 'shared:'+identity;}
  if(type?.kind==='data'){checkedOptionNominal(checker,type,span);return 'nominal:'+type.name;}
  return scalarOwner(type,span);
}
export function optionPayload(checker,type,path,span,{allowShared=false,allowMove=false,allowNestedOptions=false,depth=0,budget={remaining:512}}={}){
  if(type?.kind!=='data'||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse(span);
  const entry=checker.items.get(type.name),source=type.rustStandardGeneric;
  if(entry?.k!=='data'||entry.fullName!==type.name||!Array.isArray(entry.modulePath)||entry.standardGeneric?.kind!=='Option'||entry.standardGeneric.arguments?.length!==1||source?.kind!=='Option'||source.arguments?.length!==1||entry.ctors?.length!==2)refuse(span);
  const some=entry.ctors.filter(ctor=>ctor.name==='Some'),none=entry.ctors.filter(ctor=>ctor.name==='None');
  if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length)refuse(span);
  const payload=checker.resolveType(source.arguments[0],entry.modulePath,span),owner=payloadOwner(checker,payload,span,{allowShared,allowMove,allowNestedOptions,depth,budget});
  for(const written of [entry.standardGeneric.arguments[0],some[0].fields[0].type]){
    const actual=checker.resolveType(written,entry.modulePath,span);
    if(!sameType(payload,actual)||payloadOwner(checker,actual,span,{allowShared,allowMove,allowNestedOptions,depth,budget})!==owner)refuse(span);
    checker.expectedOwnership(actual,payload,path,span);checker.expectedPrimitiveIdentity(actual,payload,path,span);
  }
  return {payload,owner};
}
export const sourceTree=value=>{
  if(Array.isArray(value))return value.map(sourceTree);
  if(!value||typeof value!=='object')return value;
  const node=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sourceTree(item)]));
  // These names occur in the privately selected core Option module, rather
  // than in the caller's namespace. The checked monomorphic owner is still
  // required by HostChecker.normalisePattern.
  if(node.k==='let'&&node.value?.k==='routerRegisteredConstructor'&&node.value.kind==='Option'&&node.value.constructor==='Some'&&node.value.args?.length===1&&node.value.args[0].k==='name'&&node.value.args[0].path?.join('::')==='ml_standard_alias_field')node.value={k:'name',path:['self'],span:node.value.span};
  if(node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.length===1&&node.fn.path[0]==='Some')return {k:'routerRegisteredConstructor',kind:'Option',constructor:'Some',args:node.args,span:node.span};
  if(node.k==='ctor'&&node.path?.length===1&&['Some','None'].includes(node.path[0]))node.registeredGenericOwner='Option';
  return node;
};
export function freeNames(node,names){
  if(Array.isArray(node))return node.map(child=>freeNames(child,names));
  if(!node||typeof node!=='object')return node;
  if(node.k==='name'&&node.path?.length===1&&names.has(node.path[0]))return {...node,path:[names.get(node.path[0])]};
  if(node.k==='var'&&names.has(node.name))return {...node,name:names.get(node.name)};
  if(node.k==='let'){
    const inner=new Map(names);inner.delete(node.name);
    return {...node,value:freeNames(node.value,names),body:freeNames(node.body,inner)};
  }
  if(node.k==='match'&&node.rows)return {...node,scrutinees:freeNames(node.scrutinees,names),rows:node.rows.map(row=>{const inner=new Map(names),remove=pattern=>{if(['bindOrCtor','bind'].includes(pattern.k))inner.delete(pattern.name);for(const child of pattern.args??[])remove(child);};for(const pattern of row.patterns)remove(pattern);return {...row,body:freeNames(row.body,inner)};})};
  if(node.k==='match')return {...node,scrutinee:freeNames(node.scrutinee,names),cases:node.cases.map(arm=>{
    const inner=new Map(names);for(const name of arm.pattern.binds??[])if(name)inner.delete(name);
    return {...arm,body:freeNames(arm.body,inner)};
  })};
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,['type','span','patternControl'].includes(key)?value:freeNames(value,names)]));
}
export const nonlocal=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>!['type','span'].includes(key)&&(Array.isArray(value)?value.some(nonlocal):nonlocal(value))));
function replaceTraitCall(node,generic,defaultBody,originalEvidence){
  if(Array.isArray(node))return node.map(child=>replaceTraitCall(child,generic,defaultBody,originalEvidence));
  if(!node||typeof node!=='object')return node;
  const callee=node.k==='app'?node.fn:node;
  if(callee?.k==='name'&&callee.path?.join('::')===generic+'::default'){
    // RustParser represents a zero-argument call as a name. Establish the
    // call from the privately parsed original token interval before replacing
    // it; an associated value or a caller's similarly named item cannot pass.
    const tokens=tokenizeRust(originalEvidence.parsedBodySource).filter(token=>token.start>=node.span?.start&&token.start<node.span?.end&&token.kind!=='comment');
    const actual=tokens.map(token=>token.value);
    if(node.k==='app'&&node.args.length||!defaultBody||actual.slice(0,5).join('|')!==[generic,'::','default','(',')'].join('|')||actual.slice(5).some(value=>value!==','))throw new TypeError('standard trait call requires the actual selected zero-argument Default call');
    return structuredClone(defaultBody);
  }
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,replaceTraitCall(value,generic,defaultBody,originalEvidence)]));
}
function stableBody(node){
  if(Array.isArray(node))return node.map(stableBody);
  if(!node||typeof node!=='object')return typeof node==='bigint'?node.toString():node;
  return Object.fromEntries(Object.entries(node).filter(([key])=>!['span','type','patternControl'].includes(key)).map(([key,value])=>[key,stableBody(value)]));
}
const issuedContexts=new Map(),callbackApplications=new WeakMap();
export function checkPinnedCallbackApplication(checker,node){
  const binding=callbackApplications.get(node);if(!binding)throw new TypeError('Standard callback application lacks private checked context');
  return structuredClone(binding);
}
function callbackTree(node,name,binding){
  if(Array.isArray(node))return node.map(child=>callbackTree(child,name,binding));
  if(!node||typeof node!=='object')return node;
  if(node.k==='name'&&node.path?.length===1&&node.path[0]===name||node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.length===1&&node.fn.path[0]===name&&node.args.length===0){const replacement={k:'routerPinnedCallbackApplication',span:node.span};callbackApplications.set(replacement,binding);return replacement;}
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,callbackTree(value,name,binding)]));
}
function dataDependencies(entries,root){const result=[],seen=new Set();const visit=name=>{if(seen.has(name))return;seen.add(name);const entry=entries.get(name);if(!entry||entry.k!=='data')throw new Error('Standard body dependency lacks its actual checked layout');result.push(structuredClone(entry));const types=value=>{if(!value||typeof value!=='object')return;if(value.kind==='data')visit(value.name);if(Array.isArray(value))value.forEach(types);else for(const child of Object.values(value))types(child);};types(entry.ctors);types(entry.standardGeneric);};visit(root);return result;}
// Private source-layout storage does not assert that the pointee is Copy or
// has no Drop. Re-emission compares the same identities against current data.
function pinnedLayouts(checker,roots,data){
  const layoutRoots=structuredClone(roots.filter(Boolean)),layouts=structuredClone(captureBorrowedLayouts(checker,layoutRoots)),seen=new Set(data.map(item=>item.fullName));
  for(const layout of layouts)for(const item of dataDependencies(checker.items,layout.fullName))if(!seen.has(item.fullName)){seen.add(item.fullName);data.push(item);}
  return {layoutRoots,layouts,data};
}
export function validateCallbackCaptures(checker,callback,env,path,span,{allowShared=false,immutableCaptures=false,captures=[]}={}){
  const visit=(node,bound=new Set())=>{if(!node||typeof node!=='object')return;if(node.k==='var'&&!bound.has(node.name)){if(immutableCaptures&&hasMutableScalarBinding(env,node.name))throw unsupported('Option callback mutable capture','requires an independently checked borrow/alias interval',span);captures.push(node);const type=env.get(node.name);if(!type)throw typeError('Standard callback capture is not an actual source local',span);if(type.kind==='data'&&checker.items.get(type.name)?.standardGeneric?.kind==='Option')optionPayload(checker,type,path,span,{allowShared});else payloadOwner(checker,type,span,{allowShared});return;}if(immutableCaptures&&node.k==='routerSet'&&!bound.has(node.target?.name??node.name))throw unsupported('Option callback captured write','requires an independently checked borrow/alias interval',span);if(node.k==='let'){visit(node.value,bound);visit(node.body,new Set(bound).add(node.name));return;}if(node.k==='match'){visit(node.scrutinee,bound);for(const arm of node.cases){const inner=new Set(bound);for(const name of arm.pattern.binds??[])if(name)inner.add(name);if(arm.pattern.k==='bind')inner.add(arm.pattern.name);visit(arm.body,inner);}return;}for(const [key,value]of Object.entries(node))if(!['type','span','pinnedStandardBodyProof'].includes(key)){if(Array.isArray(value))value.forEach(child=>visit(child,bound));else visit(value,bound);}};visit(callback.binding);
}
const sharedOwner=owner=>typeof owner==='string'&&/^(?:nested-option<)*shared:/u.test(owner);
const bodyDigest=(body,layouts)=>createHash('sha256').update(layouts?JSON.stringify({body:stableBody(body),layouts},(_key,value)=>typeof value==='bigint'?value.toString():value):JSON.stringify(stableBody(body))).digest('hex');
// This constructor association is used only after the complete selected core
// body has been privately parsed. Caller spellings never enter this rewrite.
function optionResultTree(original){
  const visit=node=>{
    if(Array.isArray(node))return node.map(visit);if(!node||typeof node!=='object')return node;
    const value=Object.fromEntries(Object.entries(node).map(([key,child])=>[key,visit(child)]));
    if(value.k==='app'&&value.fn?.k==='name'&&value.fn.path?.length===1&&['Ok','Err'].includes(value.fn.path[0]))return {k:'routerRegisteredConstructor',kind:'Result',constructor:value.fn.path[0],args:value.args,span:value.span};
    return value;
  };
  return visit(sourceTree(original));
}
function optionResultContext(checker,type,payload,path,span){
  const result=canonicalResult(checker,type,path,span);
  if(!sameType(result.success,payload))throw typeError('Option ok_or_else success differs from its original payload',span);
  checker.expectedOwnership(payload,result.success,path,span);checker.expectedPrimitiveIdentity(payload,result.success,path,span);
  if(!knownResultDrop(result.error,span))throw unsupported('Option ok_or_else error ownership','requires the checked standard scalar or String destruction profile',span);
  return result;
}
function optionResultDependencies(entries,receiver,result){
  const all=[...dataDependencies(entries,receiver),...dataDependencies(entries,result)],seen=new Set();
  return all.filter(entry=>{if(seen.has(entry.fullName))return false;seen.add(entry.fullName);return true;});
}
// Expected types flow through only the exact original outer call and its
// immediate map. This private interval is revoked even when checking fails;
// it supplies no overload selection or permission to reuse checked syntax.
const optionMapContexts=new WeakMap();
export function contextualOptionMapResultReceiver(checker,node,env,path,expected){
  if(!hasOriginalStandardCall(checker,node))return null;
  if(node.k!=='routerPinnedStandardBodyCall'||node.method!=='ok_or_else'||node.args.length!==1||expected==null)return null;
  const map=node.object;
  if(!(map?.k==='routerIteratorOperation'&&map.op==='map'||map?.k==='routerDispatchMethod'&&map.method==='map')||map.args.length!==1||!hasOriginalStandardCall(checker,map))return null;
  requireOriginalPrimitiveTryFromChecker(checker);requireOriginalStandardCall(checker,node);requireOriginalStandardCall(checker,map);requireOriginalPrimitiveTryFromChecker(checker);
  const result=canonicalResult(checker,expected,path,node.span,false);if(!result)return null;
  if(!knownResultDrop(result.error,node.span))throw unsupported('contextual Option map error','requires the existing checked standard error destruction domain',node.span);
  const previous=optionMapContexts.get(checker),state={node,map,result,used:false};let receiver;
  optionMapContexts.set(checker,state);
  try{receiver=checker.expr(map,env,path);}
  finally{if(previous)optionMapContexts.set(checker,previous);else optionMapContexts.delete(checker);}
  if(!state.used)return receiver;
  requireOriginalStandardCall(checker,node);requireOriginalStandardCall(checker,map);requireOriginalPrimitiveTryFromChecker(checker);
  if(receiver.k!=='routerStandardMethod'||receiver.operation!=='option_map'||checker.resolvedMethod(receiver.type,'ok_or_else','shared'))throw unsupported('contextual Option map receiver','requires the independently checked original Option map and standard ok_or_else',node.span);
  const actual=optionPayload(checker,receiver.type,path,node.span,{allowShared:true,allowNestedOptions:true}).payload;
  if(!sameType(actual,result.success))throw typeError('contextual Option map success differs from the expected Result',node.span);
  checker.expectedOwnership(actual,result.success,path,node.span);checker.expectedPrimitiveIdentity(actual,result.success,path,node.span);
  requireOriginalStandardCall(checker,node);requireOriginalStandardCall(checker,map);requireOriginalPrimitiveTryFromChecker(checker);
  return receiver;
}
// Host calls this only after checking the real receiver and inherent method.
// Missing/foreign syntax and calls outside the private interval yield no hint.
export function contextualOptionMapExpected(checker,node,receiver,path){
  const state=optionMapContexts.get(checker);if(!state||state.map!==node)return null;
  requireOriginalStandardCall(checker,state.node);requireOriginalStandardCall(checker,node);requireOriginalPrimitiveTryFromChecker(checker);
  optionPayload(checker,receiver.type,path,node.span,{allowShared:true});
  const expected=checker.instantiations.option(state.result.success,node.span);
  optionPayload(checker,expected,path,node.span,{allowShared:true,allowNestedOptions:true});
  requireOriginalStandardCall(checker,state.node);requireOriginalStandardCall(checker,node);requireOriginalPrimitiveTryFromChecker(checker);
  state.used=true;return expected;
}
// The portable core constructs a bare data type. Retain the current checked
// use's arguments while this exact original map is being checked, rather than
// later recovering lifetimes/ownership from the shared layout's first use.
export function contextualOptionMapConstructor(checker,value,expected,path,span){
  const state=optionMapContexts.get(checker);
  if(!state?.used||value.k!=='ctor'||expected?.rustStandardGeneric?.kind!=='Option')return value;
  requireOriginalStandardCall(checker,state.node);requireOriginalStandardCall(checker,state.map);requireOriginalPrimitiveTryFromChecker(checker);
  const {payload}=optionPayload(checker,expected,path,span,{allowShared:true,allowNestedOptions:true}),entry=checker.items.get(expected.name),ctor=entry.ctors.find(row=>row.name===value.ctor);
  if(value.type?.kind!=='data'||value.type.name!==expected.name||value.data!==expected.name||!ctor||value.args.length!==ctor.fields.length)throw typeError('contextual Option constructor differs from its checked expected layout',span);
  if(ctor.name==='Some'){
    if(!sameType(value.args[0].type,payload))throw typeError('contextual Option constructor payload differs from its checked expected type',span);
    checker.expectedOwnership(value.args[0].type,payload,path,span);checker.expectedPrimitiveIdentity(value.args[0].type,payload,path,span);
  }
  const result={...value,type:{...value.type,rustStandardGeneric:structuredClone(expected.rustStandardGeneric)}};
  requireOriginalStandardCall(checker,state.node);requireOriginalStandardCall(checker,state.map);requireOriginalPrimitiveTryFromChecker(checker);
  return result;
}
function checkPinnedOptionResult(checker,node,receiver,env,path,expected,Parser){
  requireOriginalPrimitiveTryFromChecker(checker);requireOriginalStandardCall(checker,node);requireOriginalPrimitiveTryFromChecker(checker);
  const {payload,owner}=optionPayload(checker,receiver.type,path,node.span,{allowShared:true,allowNestedOptions:true}),selection=pinnedOptionBody('ok_or_else'),parameters=selection.method.parameters;
  if(parameters.length!==2||parameters[0].receiver!==true||parameters[1].rustTypeSyntax.join('')!=='F'||node.args.length!==1)throw typeError('Option ok_or_else arguments differ from its original signature',node.span);
  const wanted=expected?optionResultContext(checker,expected,payload,path,node.span):null;
  const callback=checker.hostLambda(node.args[0],[],env,path,wanted?.error,{source:'standard-option',receiverType:receiver.type});
  const captures=[];validateCallbackCaptures(checker,callback,env,path,node.span,{immutableCaptures:true,captures});
  if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('standard body call control','nonlocal argument exits require independent statement lowering',node.span);
  const resultType=wanted?.type??checker.instantiations.result(payload,callback.type.result,node.span),result=optionResultContext(checker,resultType,payload,path,node.span);
  if(!sameType(callback.type.result,result.error))throw typeError('Option ok_or_else callback differs from the original Result error',node.span);
  checker.expectedOwnership(callback.type.result,result.error,path,node.span);checker.expectedPrimitiveIdentity(callback.type.result,result.error,path,node.span);
  const original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original),reserved=new Set(env.keys());let name;do{name=checker.freshName('ml_standard_body_');}while(reserved.has(name));
  let specialized=freeNames(optionResultTree(original),new Map([[parameters[0].name,name]]));
  specialized=callbackTree(specialized,parameters[1].name,callback.binding);
  let body;
  try{body=checker.expr(specialized,new Map([[name,receiver.type]]),[],resultType);}catch(error){if(!(error instanceof TranslationError))throw error;throw new TranslationError(error.kind,error.reason,node.span,{...error.details,originalStandardDiagnostic:{span:error.span,reason:error.reason,bodySpan:selection.method.bodySpan,sourceInputs:selection.sourceInputs}});}
  if(!sameType(body.type,resultType))throw typeError('Original Option ok_or_else body returned a distinct Result',node.span);
  checker.expectedOwnership(body.type,resultType,path,node.span);checker.expectedPrimitiveIdentity(body.type,resultType,path,node.span);
  const boundReceiver=/^(?:nested-option<)*shared:/u.test(owner)&&sharedDomainGuardNeeded([payload])?originalSharedDomainGuard(checker,node,receiver):receiver;
  body={k:'let',name,value:boundReceiver,body:{...body,type:{...resultType,...body.type}},type:resultType,span:node.span};
  const layoutState=pinnedLayouts(checker,[receiver.type,resultType,callback.type.result,...captures.map(value=>value.type)],optionResultDependencies(checker.items,receiver.type.name,resultType.name));
  const proof={languageRule:OPTION_RESULT_RULE,callbackBinding:callback.binding,profile:STANDARD_BODY_SOURCE_PROFILE.id,method:'ok_or_else',owner,selection,syntaxSha256:syntax.syntaxSha256,defaultSelection:null,defaultSyntaxSha256:null,evaluationOrder:'actual-source-parameters-left-to-right-once; selected-original-body',constEligible:false,namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,checkedBodyDigest:bodyDigest(body,sharedOwner(owner)?layoutState.layouts:null)};
  issuedContexts.set(proof.checkedBodyDigest,{Checker:checker.constructor,entry:structuredClone(checker.items.get(receiver.type.name)),language:checker.language,nominals:optionNominalContext(checker),callbackBinding:structuredClone(callback.binding),receiverBinding:structuredClone(boundReceiver),...(sharedOwner(owner)?{bodyResultType:structuredClone(body.type)}:{}),...layoutState});
  requireOriginalPrimitiveTryFromChecker(checker);
  return {k:'routerPinnedStandardBody',body,type:resultType,constEligible:false,pinnedStandardBodyProof:proof,span:node.span};
}
// Both original parameters are evaluated before the match, including err for
// Some. This is a source specialization, not a lazy callback substitution.
function checkPinnedEagerOptionResult(checker,node,receiver,env,path,expected,Parser){
  requireOriginalPrimitiveTryFromChecker(checker);
  requireOriginalStandardCall(checker,node);
  const {payload,owner}=optionPayload(checker,receiver.type,path,node.span,{allowShared:true}),selection=pinnedOptionBody('ok_or'),parameters=selection.method.parameters;
  if(parameters.length!==2||parameters[0].receiver!==true||parameters[1].rustTypeSyntax.join('')!=='E'||node.args.length!==1)throw typeError('Option ok_or arguments differ from its original signature',node.span);
  if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('standard body call control','nonlocal argument exits require independent statement lowering',node.span);
  const wanted=expected?optionResultContext(checker,expected,payload,path,node.span):null,error=checker.expr(node.args[0],env,path,wanted?.error);
  const resultType=wanted?.type??checker.instantiations.result(payload,error.type,node.span),result=optionResultContext(checker,resultType,payload,path,node.span);
  if(!sameType(error.type,result.error)||!knownResultDrop(error.type,node.span))throw typeError('Option ok_or eager error differs from its checked destruction domain',node.span);
  checker.expectedOwnership(error.type,result.error,path,node.span);checker.expectedPrimitiveIdentity(error.type,result.error,path,node.span);
  const original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original),values=[/^(?:nested-option<)*shared:/u.test(owner)&&sharedDomainGuardNeeded([payload])?originalSharedDomainGuard(checker,node,receiver):receiver,error],reserved=new Set(env.keys()),names=new Map();
  for(const parameter of parameters){let name;do{name=checker.freshName('ml_standard_body_');}while(reserved.has(name));reserved.add(name);names.set(parameter.name,name);}
  let body;
  try{body=checker.expr(optionResultTree(original),new Map(parameters.map((parameter,index)=>[parameter.name,values[index].type])),[],resultType);}catch(failure){if(!(failure instanceof TranslationError))throw failure;throw new TranslationError(failure.kind,failure.reason,node.span,{...failure.details,originalStandardDiagnostic:{span:failure.span,reason:failure.reason,bodySpan:selection.method.bodySpan,sourceInputs:selection.sourceInputs}});}
  if(!sameType(body.type,resultType))throw typeError('Original Option ok_or body returned a distinct Result',node.span);
  checker.expectedOwnership(body.type,resultType,path,node.span);checker.expectedPrimitiveIdentity(body.type,resultType,path,node.span);
  body=freeNames({...body,type:{...resultType,...body.type}},names);
  for(let index=values.length-1;index>=0;index--)body={k:'let',name:names.get(parameters[index].name),value:values[index],body,type:resultType,span:node.span};
  const layoutState=pinnedLayouts(checker,[resultType,...values.map(value=>value.type)],optionResultDependencies(checker.items,receiver.type.name,resultType.name));
  const proof={languageRule:EAGER_OPTION_RESULT_RULE,profile:STANDARD_BODY_SOURCE_PROFILE.id,method:'ok_or',owner,selection,syntaxSha256:syntax.syntaxSha256,defaultSelection:null,defaultSyntaxSha256:null,evaluationOrder:'actual-source-parameters-left-to-right-once; selected-original-body',constEligible:false,namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,checkedBodyDigest:bodyDigest(body,sharedOwner(owner)?layoutState.layouts:null)};
  issuedContexts.set(proof.checkedBodyDigest,{Checker:checker.constructor,entry:structuredClone(checker.items.get(receiver.type.name)),language:checker.language,nominals:optionNominalContext(checker),receiverBinding:structuredClone(values[0]),errorBinding:structuredClone(error),...(sharedOwner(owner)?{bodyResultType:structuredClone(body.type)}:{}),...layoutState});
  return {k:'routerPinnedStandardBody',body,type:resultType,constEligible:false,pinnedStandardBodyProof:proof,span:node.span};
}
export function checkPinnedOptionBody(checker,node,receiver,env,path,expected,Parser){
  if(node.method==='ok_or')return checkPinnedEagerOptionResult(checker,node,receiver,env,path,expected,Parser);
  if(node.method==='ok_or_else')return checkPinnedOptionResult(checker,node,receiver,env,path,expected,Parser);
  const reserved=new Set([...env.keys()].filter(name=>typeof name==='string')),fresh=prefix=>{let name;do{name=checker.freshName(prefix);}while(reserved.has(name));reserved.add(name);return name;};const method=node.method,moving=method==='or_else',allowShared=method!=='unwrap_or_default',{payload,owner}=optionPayload(checker,receiver.type,path,node.span,{allowShared,allowMove:moving}),selection=pinnedOptionBody(method),parameters=selection.method.parameters,lazy=['unwrap_or_else','or_else'].includes(method),resultType=method==='or_else'?receiver.type:payload;
  if(parameters[0]?.receiver!==true||parameters.some((param,index)=>index>0&&param.rustTypeSyntax.join('')!==(lazy?'F':'T'))||node.args.length!==parameters.length-1)throw typeError('standard method arguments differ from its actual original signature',node.span);
  const callback=lazy?checker.hostLambda(node.args[0],[],env,path,resultType,{source:'standard-option',receiverType:receiver.type}):null;
  const captures=[];if(lazy){validateCallbackCaptures(checker,callback,env,path,node.span,{allowShared:moving||owner.startsWith('shared:'),immutableCaptures:true,captures});if(method==='or_else'){if(!sameType(callback.type.result,receiver.type))throw typeError('Standard or_else result differs from its checked Option',node.span);checker.expectedOwnership(callback.type.result,receiver.type,path,node.span);checker.expectedPrimitiveIdentity(callback.type.result,receiver.type,path,node.span);}else if(payloadOwner(checker,callback.type.result,node.span,{allowShared})!==owner)throw typeError('Standard lazy result differs from its source payload',node.span);}
  const extended=moving&&(owner.startsWith('whole-move:')||owner.startsWith('shared:')||captures.some(value=>value.type?.rustReference)),shared=allowShared&&owner.startsWith('shared:');if(extended||shared){requireOriginalStandardCall(checker,node);if(extended)requireOriginalOrElseMove(selection);if(callback){let guarded=callback.binding;for(const captured of captures.filter((value,index,list)=>sharedDomainGuardNeeded([value.type])&&list.findIndex(other=>other.name===value.name)===index)){const name=fresh('ml_standard_capture_domain_');guarded={k:'let',name,value:originalSharedDomainGuard(checker,node,captured),body:guarded,type:guarded.type,span:node.span};}callback.binding=guarded;}}
  if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('standard body call control','nonlocal argument exits require independent statement lowering',node.span);
  const values=[(extended||shared)&&sharedDomainGuardNeeded([payload])?originalSharedDomainGuard(checker,node,receiver):receiver,...(lazy?[]:node.args.map(arg=>{const value=checker.expr(arg,env,path,payload);return shared&&sharedDomainGuardNeeded([payload])?originalSharedDomainGuard(checker,node,value):value;}))];
  for(const value of values.slice(1)){if(!sameType(value.type,payload)||payloadOwner(checker,value.type,node.span,{allowShared})!==owner)throw typeError('standard eager argument differs from its actual Rust payload',node.span);checker.expectedOwnership(value.type,payload,path,node.span);checker.expectedPrimitiveIdentity(value.type,payload,path,node.span);}
  if(method==='unwrap_or_default'&&owner.startsWith('nominal:'))throw unsupported('nominal Default implementation','requires a separately checked original implementation',node.span);
  const original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original),defaultSelection=method==='unwrap_or_default'?pinnedDefaultBody(owner):null;
  const defaultBody=defaultSelection?parsePinnedBody(Parser,defaultSelection):null,defaultSyntax=defaultBody?parsedPinnedBodyEvidence(defaultBody):null;
  let specialized=replaceTraitCall(sourceTree(original),selection.evidence.genericParameter,defaultBody,syntax);
  const names=new Map(parameters.slice(0,values.length).map(param=>[param.name,fresh('ml_standard_body_')]));
  if(lazy){specialized=freeNames(specialized,names);specialized=callbackTree(specialized,parameters[1].name,callback.binding);}
  const bodyEnv=new Map(parameters.slice(0,values.length).map((param,index)=>[lazy?names.get(param.name):param.name,values[index].type]));
  let body;
  try{body=checker.expr(specialized,bodyEnv,[],resultType);}catch(error){if(!(error instanceof TranslationError))throw error;throw new TranslationError(error.kind,error.reason,node.span,{...error.details,originalStandardDiagnostic:{span:error.span,reason:error.reason,bodySpan:selection.method.bodySpan,sourceInputs:selection.sourceInputs}});}
  if(!sameType(body.type,resultType))throw typeError('original standard body result differs from its actual Rust payload',node.span);
  checker.expectedOwnership(body.type,resultType,path,node.span);checker.expectedPrimitiveIdentity(body.type,resultType,path,node.span);
  if(expected){checker.expectedOwnership(body.type,expected,path,node.span);checker.expectedPrimitiveIdentity(body.type,expected,path,node.span);}
  body={...body,type:{...resultType,...body.type}};
  if(!lazy)body=freeNames(body,names);
  for(let index=values.length-1;index>=0;index--)body={k:'let',name:names.get(parameters[index].name),value:values[index],body,type:body.type,span:node.span};
  const layoutState=pinnedLayouts(checker,[resultType,...values.map(value=>value.type),callback?.type.result,...captures.map(value=>value.type)],dataDependencies(checker.items,receiver.type.name));
  const proof={...(extended?{payloadMode:'original-whole-Some-move-no-payload-copy-or-drop'}:{}),...(lazy?{callbackBinding:callback.binding}:{}),profile:STANDARD_BODY_SOURCE_PROFILE.id,method,owner,selection,syntaxSha256:syntax.syntaxSha256,defaultSelection,defaultSyntaxSha256:defaultSyntax?.syntaxSha256??null,evaluationOrder:'actual-source-parameters-left-to-right-once; selected-original-body',constEligible:false,namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,checkedBodyDigest:bodyDigest(body,sharedOwner(owner)?layoutState.layouts:null)};
  issuedContexts.set(proof.checkedBodyDigest,{Checker:checker.constructor,entry:structuredClone(checker.items.get(receiver.type.name)),language:checker.language,nominals:optionNominalContext(checker),callbackBinding:callback?.binding,moves:originalMoveContext(checker),...(sharedOwner(owner)?{receiverBinding:structuredClone(values[0]),bodyResultType:structuredClone(body.type)}:{}),...layoutState});
  return {k:'routerPinnedStandardBody',body,type:body.type,constEligible:false,pinnedStandardBodyProof:proof,span:node.span};
}
// Canonicalize only bound local names. Function/data references remain exact
// and are checked using the current real declaration registry, including the
// project's ordinary flattening pass. Literal types remain part of the tree.
export function alphaTree(node,env=new Map(),counter={next:0}){
  if(Array.isArray(node))return node.map(child=>alphaTree(child,env,counter));
  if(!node||typeof node!=='object')return typeof node==='bigint'?{$bigint:node.toString()}:node;
  const clean=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['span','patternControl'].includes(key)).map(([key,item])=>[key,alphaTree(item,env,counter)]));
  if(node.k==='var')return {...clean(node),name:env.get(node.name)??node.name};
  if(node.k==='let'){
    const value=alphaTree(node.value,env,counter),name='bound:'+counter.next++,inner=new Map(env).set(node.name,name);
    return {...clean({...node,value:null,body:null}),name,value,body:alphaTree(node.body,inner,counter)};
  }
  if(node.k==='match')return {...clean({...node,scrutinee:null,cases:null}),scrutinee:alphaTree(node.scrutinee,env,counter),cases:node.cases.map(arm=>{
    const inner=new Map(env),pattern={...arm.pattern};
    if(pattern.binds)pattern.binds=pattern.binds.map(name=>{if(!name)return name;const target='bound:'+counter.next++;inner.set(name,target);return target;});
    if(['bind','natSucc'].includes(pattern.k)&&pattern.name){const target='bound:'+counter.next++;inner.set(pattern.name,target);pattern.name=target;}
    return {pattern:alphaTree(pattern,env,counter),body:alphaTree(arm.body,inner,counter)};
  })};
  return clean(node);
}
export function requirePinnedStandardBody(node,Parser,{Checker,program}={}){
  const proof=node.pinnedStandardBodyProof;
  if(node.k!=='routerPinnedStandardBody'||!proof||!['unwrap_or','unwrap_or_default','unwrap_or_else','or_else','ok_or','ok_or_else'].includes(proof.method)||node.constEligible!==false||proof.profile!==STANDARD_BODY_SOURCE_PROFILE.id||proof.constEligible!==false||proof.namespaceComplete!==false||proof.traitComplete!==false||proof.wholeCoreTranslated!==false||proof.evaluationOrder!=='actual-source-parameters-left-to-right-once; selected-original-body'||proof.method==='ok_or_else'&&proof.languageRule!==OPTION_RESULT_RULE||proof.method==='ok_or'&&proof.languageRule!==EAGER_OPTION_RESULT_RULE)throw new Error('missing pinned standard body proof');
  const selection=pinnedOptionBody(proof.method),original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original);
  if(!isDeepStrictEqual(proof.selection,selection)||proof.syntaxSha256!==syntax.syntaxSha256)throw new Error('standard body proof differs from its actual source');
  const expected=proof.method==='unwrap_or_default'?pinnedDefaultBody(proof.owner):null;
  const defaultBody=expected?parsePinnedBody(Parser,expected):null,defaultSyntax=defaultBody?parsedPinnedBodyEvidence(defaultBody):null;
  if(!isDeepStrictEqual(proof.defaultSelection,expected)||proof.defaultSyntaxSha256!==(defaultSyntax?.syntaxSha256??null))throw new Error('Default body differs from its actual original implementation');
  const lazy=['unwrap_or_else','or_else','ok_or_else'].includes(proof.method),parameters=selection.method.parameters.slice(0,lazy?1:undefined),bindings=[];let inner=node.body;
  for(const parameter of parameters){
    if(inner?.k!=='let'||typeof inner.name!=='string'||!inner.name||bindings.some(binding=>binding.name===inner.name)||!inner.value?.type)throw new Error('standard body lacks actual eager parameter bindings');
    bindings.push({parameter,name:inner.name,value:inner.value});inner=inner.body;
  }
  const issued=issuedContexts.get(proof.checkedBodyDigest),ActualChecker=Checker??issued?.Checker;
  if(sharedOwner(proof.owner)&&!issued?.layouts)throw new Error('Shared standard body requires its privately issued source layouts');
  if(sharedOwner(proof.owner)){
    const result=program?retargetCheckedCallback(issued.bodyResultType,program):issued.bodyResultType,receiver=program?retargetCheckedCallback(issued.receiverBinding,program):issued.receiverBinding;
    if(!result||!isDeepStrictEqual(alphaTree(node.type),alphaTree(result))||!isDeepStrictEqual(alphaTree(node.body.type),alphaTree(result)))throw new Error('Shared standard outer body result differs from its privately checked source type');
    if(!receiver||!isDeepStrictEqual(alphaTree(bindings[0].value),alphaTree(receiver)))throw new Error('Shared standard receiver differs from its privately checked source binding');
  }
  const entry=program?.declarations.get(bindings[0].value.type.name)??issued?.entry;
  if(typeof ActualChecker!=='function'||!entry||entry.fullName!==bindings[0].value.type.name)throw new Error('standard body validation requires actual checked declaration context');
  const optionResult=['ok_or','ok_or_else'].includes(proof.method);
  if(optionResult){
    const receiver=issued?.receiverBinding&&(program?retargetCheckedCallback(issued.receiverBinding,program):issued.receiverBinding);
    if(!receiver||!isDeepStrictEqual(alphaTree(bindings[0].value),alphaTree(receiver)))throw new Error('Option ok_or_else receiver differs from its privately checked source');
    if(proof.method==='ok_or'){
      const error=issued?.errorBinding&&(program?retargetCheckedCallback(issued.errorBinding,program):issued.errorBinding);
      if(!error||!isDeepStrictEqual(alphaTree(bindings[1].value),alphaTree(error)))throw new Error('Option ok_or eager error differs from its privately checked source');
    }
  }
  const language=program?.sourceLanguage??program?.language??issued?.language;
  if(language!=='Rust')throw new Error('standard body validation requires the actual Rust program language');
  const checker=new ActualChecker(language,program?.externals??[]);
  if(proof.method==='ok_or')requireOriginalPrimitiveTryFromChecker(checker);
  // Recheck every canonical layout used by the selected original body,
  // including Result for ok_or_else. Payload and constructor identities come
  // from the actual declaration registry, rather than public proof claims.
  const dependencies=program?(optionResult?optionResultDependencies(program.declarations,entry.fullName,node.type.name):dataDependencies(program.declarations,entry.fullName)):issued?.data??[entry];
  // Captures can introduce a nominal not reachable from the receiver/result.
  // Fetch each such declaration from the actual current program, never from
  // the issuer's saved expected layout, before checking its source structure.
  if(program&&issued?.layouts){const seen=new Set(dependencies.map(item=>item.fullName));for(const layout of issued.layouts){const name=retargetCheckedCallback({kind:'data',name:layout.fullName},program).name;for(const item of dataDependencies(program.declarations,name))if(!seen.has(item.fullName)){seen.add(item.fullName);dependencies.push(item);}}}
  checker.program({language:checker.language,items:dependencies.map(item=>({...structuredClone(item),name:item.fullName})),main:null});
  if(issued?.layouts){const context=program??{declarations:checker.items};requireBorrowedLayouts(issued.layouts,checker,context,retargetCheckedCallback(issued.layoutRoots,context));}
  if(issued?.nominals)restoreOptionNominals(checker,issued.nominals);if(proof.payloadMode){if(proof.method!=='or_else'||proof.payloadMode!=='original-whole-Some-move-no-payload-copy-or-drop'||!issued)throw new Error('Whole Option move requires its private original source context');restoreOriginalMoves(checker,issued.moves);requireOriginalOrElseMove(selection);}
  const {payload,owner}=optionPayload(checker,bindings[0].value.type,[],node.span,{allowShared:proof.method!=='unwrap_or_default',allowMove:proof.method==='or_else',allowNestedOptions:proof.method==='ok_or_else'});
  const resultType=optionResult?optionResultContext(checker,node.type,payload,[],node.span).type:proof.method==='or_else'?bindings[0].value.type:payload;
  if(owner!==proof.owner&&!(owner.startsWith('nominal:rp_')&&proof.owner==='nominal:'+Buffer.from(owner.slice('nominal:rp_'.length),'hex').toString('utf8'))&&!(/^(?:nested-option<)*shared:/u.test(owner)&&proof.owner===owner.replace(/data:rp_([a-f0-9]+)/gu,(_,name)=>'data:'+Buffer.from(name,'hex').toString('utf8')))||!sameType(resultType,node.type))throw new Error('standard body actual payload differs from its source owner');
  for(const binding of bindings.slice(1)){
    if(proof.method==='ok_or'){
      const error=optionResultContext(checker,resultType,payload,[],node.span).error;
      if(!sameType(binding.value.type,error)||!knownResultDrop(binding.value.type,node.span))throw new Error('Option ok_or eager error has a distinct Result error type');
      checker.expectedOwnership(binding.value.type,error,[],node.span);checker.expectedPrimitiveIdentity(binding.value.type,error,[],node.span);continue;
    }
    if(!sameType(binding.value.type,payload)||payloadOwner(checker,binding.value.type,node.span,{allowShared:proof.method!=='unwrap_or_default'})!==owner)throw new Error('standard body eager argument differs from its source payload');
    checker.expectedOwnership(binding.value.type,payload,[],node.span);checker.expectedPrimitiveIdentity(binding.value.type,payload,[],node.span);
  }
  let specialized=replaceTraitCall(optionResult?optionResultTree(original):sourceTree(original),selection.evidence.genericParameter,defaultBody,syntax);
  if(lazy){
    if(!issued?.callbackBinding||!isDeepStrictEqual(alphaTree(proof.callbackBinding),alphaTree(issued.callbackBinding)))throw new Error('Standard lazy callback differs from its privately checked source');
    const callback=program?retargetCheckedCallback(issued.callbackBinding,program):issued.callbackBinding;
    if(proof.method==='ok_or_else'){
      const result=optionResultContext(checker,resultType,payload,[],node.span);
      if(!sameType(callback.type,result.error))throw new Error('Option ok_or_else callback has a distinct Result error type');
      checker.expectedOwnership(callback.type,result.error,[],node.span);checker.expectedPrimitiveIdentity(callback.type,result.error,[],node.span);
    }
    specialized=freeNames(specialized,new Map(bindings.map(binding=>[binding.parameter.name,binding.name])));
    specialized=callbackTree(specialized,selection.method.parameters[1].name,callback);
  }
  let reconstructed=checker.expr(specialized,new Map(bindings.map(binding=>[lazy?binding.name:binding.parameter.name,binding.value.type])),[],resultType);
  reconstructed={...reconstructed,type:{...resultType,...reconstructed.type}};
  if(!lazy)reconstructed=freeNames(reconstructed,new Map(bindings.map(binding=>[binding.parameter.name,binding.name])));
  if(!isDeepStrictEqual(alphaTree(inner),alphaTree(reconstructed)))throw new Error('standard body differs from the rechecked actual original specialization');
}

export function retargetCheckedCallback(value,program){
  if(Array.isArray(value))return value.map(child=>retargetCheckedCallback(child,program));
  if(!value||typeof value!=='object')return value;
  const opaque=new Set(['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceBoolFromScope','sharedBodyProof','originalCallbackProof','sourceFrameProof','originalLoanProof','sourceSharedPatternProof','sourcePatternProjectionProof','sourceSharedStringViewProof']);
  const node=Object.fromEntries(Object.entries(value).map(([key,child])=>[key,opaque.has(key)?child:retargetCheckedCallback(child,program)]));
  const mapped=name=>!program.declarations.has(name)&&program.declarations.has('rp_'+Buffer.from(name).toString('hex'))?'rp_'+Buffer.from(name).toString('hex'):name;
  if(value.kind==='data')node.name=mapped(value.name);
  if(value.kind==='named'&&Array.isArray(value.path)){const name=value.path.filter((part,index)=>index!==0||part!=='crate').join('.'),target=mapped(name);if(target!==name)node.path=['crate',target];}
  if(['ctor','routerPatternTag'].includes(value.k))node.data=mapped(value.data);
  if(['call','routerFutureCall'].includes(value.k))node.fn=mapped(value.fn);
  return node;
}

const emitterFunctions=new WeakMap();
export function preparePinnedStandardFunction(emitter,entry,Parser,Checker){
  const find=(node,result=[])=>{if(!node||typeof node!=='object')return result;if(node.k==='routerPinnedStandardBody'&&['or_else','unwrap_or_else','ok_or','ok_or_else'].includes(node.pinnedStandardBodyProof?.method))result.push(node);for(const [key,value]of Object.entries(node))if(!['type','pinnedStandardBodyProof'].includes(key)){if(Array.isArray(value))value.forEach(child=>find(child,result));else find(value,result);}return result;};
  const original=find(entry.body);if(!original.length)return null;
  for(const node of original)requirePinnedStandardBody(node,Parser,{Checker,program:emitter.program});
  const previous=emitterFunctions.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());
  emitterFunctions.set(emitter,find(renamed.body).map(node=>alphaTree(node)));return ()=>{if(previous)emitterFunctions.set(emitter,previous);else emitterFunctions.delete(emitter);};
}
export function requirePinnedStandardEmission(emitter,node,Parser,Checker){
  if(['or_else','unwrap_or_else','ok_or','ok_or_else'].includes(node.pinnedStandardBodyProof?.method)){const expected=emitterFunctions.get(emitter);if(!expected?.some(value=>isDeepStrictEqual(value,alphaTree(node))))throw new Error('Lazy standard body differs from the exact validated source function rename');return;}
  requirePinnedStandardBody(node,Parser,{Checker,program:emitter.program});
}
