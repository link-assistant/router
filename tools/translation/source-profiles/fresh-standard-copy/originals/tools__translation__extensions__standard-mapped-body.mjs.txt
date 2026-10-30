// Specialize original Rust generic member bodies, never per-method JS templates.
import {createHash} from 'node:crypto';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
import {sameType} from '../checked-types.mjs';
import {unsupported,typeError,TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {metadataDigest} from './source-links.mjs';
import {pinnedMappedBody,parsePinnedBody,parsedPinnedBodyEvidence} from './standard-body-source.mjs';
import {requireOriginalStandardCall} from './original-standard-calls.mjs';
import {payloadOwner,validateCallbackCaptures,sourceTree,alphaTree,retargetCheckedCallback,nonlocal} from './standard-body-checker.mjs';
import {optionNominalContext,restoreOptionNominals} from './option-nominal-proof.mjs';
import {captureBorrowedLayouts,requireBorrowedLayouts,originalSharedDomainGuard,sharedDomainGuardNeeded} from './standard-borrowed-body.mjs';
import {originalStandardSharedPatternLayout} from './standard-shared-pattern-source.mjs';
import {originalPrimitiveCopySource} from '../shared-reference-copy-source.mjs';
const applications=new WeakMap(),issued=new Map();
function localNames(value,result=new Set()){if(!value||typeof value!=='object')return result;if(['var','let'].includes(value.k)&&typeof value.name==='string')result.add(value.name);for(const [key,child]of Object.entries(value))if(!['type','span','originalCallbackProof','sourceFrameProof','originalLoanProof','pinnedStandardBodyProof','sharedBodyProof'].includes(key))Array.isArray(child)?child.forEach(node=>localNames(node,result)):localNames(child,result);return result;}
function safeFreshName(checker,prefix,reserved){let name;do{name=checker.freshName(prefix);}while(reserved.has(name));reserved.add(name);return name;}
function hygiene(node,checker,env,reserved){
 if(Array.isArray(node))return node.map(child=>hygiene(child,checker,env,reserved));if(!node||typeof node!=='object')return node;
 if(node.k==='name'&&node.path?.length===1&&env.has(node.path[0]))return {...node,path:[env.get(node.path[0])]};
 const pattern=(value,inner)=>{if(['bind','bindOrCtor'].includes(value.k)&&/^[a-z_]/u.test(value.name)){const name=safeFreshName(checker,'ml_standard_pattern_',reserved);inner.set(value.name,name);return {...value,name};}return {...value,...(value.args?{args:value.args.map(child=>pattern(child,inner))}:{})};};
 if(node.k==='match'&&node.rows)return {...node,scrutinees:hygiene(node.scrutinees,checker,env,reserved),rows:node.rows.map(row=>{const inner=new Map(env),patterns=row.patterns.map(value=>pattern(value,inner));return {...row,patterns,body:hygiene(row.body,checker,inner,reserved)};})};
 if(['if','routerIf'].includes(node.k)&&node.cond?.k==='routerPatternCondition'){const inner=new Map(env),binding=pattern(node.cond.pattern,inner);return {...node,cond:{...node.cond,subject:hygiene(node.cond.subject,checker,env,reserved),pattern:binding},then:hygiene(node.then,checker,inner,reserved),else:hygiene(node.else,checker,env,reserved),...(node.body?{body:hygiene(node.body,checker,env,reserved)}:{})};}
 return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,['span','type'].includes(key)?value:hygiene(value,checker,env,reserved)]));
}
function specialize(node,callbacks,loan=false){if(Array.isArray(node))return node.map(value=>specialize(value,callbacks,loan));if(!node||typeof node!=='object')return node;if(node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.length===1&&callbacks.has(node.fn.path[0])||node.k==='name'&&node.path?.length===1&&callbacks.has(node.path[0])){const application={k:'routerOriginalMappedCallbackApplication',span:node.span};applications.set(application,{...callbacks.get(node.k==='app'?node.fn.path[0]:node.path[0]),args:node.k==='app'?node.args:[],loan});return application;}return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,specialize(value,callbacks,loan)]));}
export function checkOriginalMappedApplication(checker,node,env,path){
 const state=applications.get(node);if(!state||state.args.length!==state.callback.arity||state.inputs.length!==state.args.length)throw new TypeError('Original callback application lacks its privately checked source binding/arity');
 const reserved=localNames(state.callback.binding,new Set([...env.keys()].filter(name=>typeof name==='string'))),inputs=state.args.map((arg,index)=>{const type=state.inputs[index],value=checker.expr(arg,env,path,type);if(!sameType(value.type,type))throw typeError('Original callback argument source identity differs',node.span);checker.expectedOwnership(value.type,type,path,node.span);checker.expectedPrimitiveIdentity(value.type,type,path,node.span);return {name:safeFreshName(checker,'ml_standard_callback_arg_',reserved),value};});
 const apply=value=>{if(Array.isArray(value))return value.map(apply);if(!value||typeof value!=='object')return value;if(value.k==='routerLambdaInput'){const input=inputs[value.position];if(!input)throw new TypeError('Original callback input position is outside its actual signature');return {k:'var',name:input.name,type:input.value.type,span:value.span};}return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,['span','type'].includes(key)?child:apply(child)]));};
 let result=apply(state.callback.binding);for(const input of inputs.slice().reverse())result={k:'let',name:input.name,value:input.value,body:result,type:result.type,span:node.span};return result;
}

function compatible(checker,actual,expected,path,span){
 if(!sameType(actual,expected))throw typeError('Mapped standard generic argument has a distinct checked identity',span);
 checker.expectedOwnership(actual,expected,path,span);checker.expectedPrimitiveIdentity(actual,expected,path,span);
 if(actual.rustReference||expected.rustReference){
   if(actual.rustReference?.kind!==expected.rustReference?.kind)throw typeError('Mapped standard reference depth differs',span);
   compatible(checker,actual.rustReference.pointee,expected.rustReference.pointee,path,span);
 }
 const a=actual.rustStandardGeneric,b=expected.rustStandardGeneric;
 if(a||b){if(a?.kind!==b?.kind||a?.arguments?.length!==b?.arguments?.length)throw typeError('Mapped standard generic source identity differs',span);a.arguments.forEach((type,index)=>compatible(checker,type,b.arguments[index],path,span));}
}
function standardArguments(checker,type,kind,span){
 const entry=type?.kind==='data'?checker.items.get(type.name):null,source=type?.rustStandardGeneric,names=kind==='Option'?['Some','None']:['Ok','Err'],count=kind==='Option'?1:2;
 if(type?.rustReference||type?.rustOwnership||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved||entry?.k!=='data'||entry.fullName!==type.name||!Array.isArray(entry.modulePath)||entry.standardGeneric?.kind!==kind||source?.kind!==kind||source.arguments?.length!==count||entry.standardGeneric.arguments?.length!==count||entry.ctors?.length!==2)throw unsupported('mapped standard owner','requires an actual by-value canonical owner with complete original generic arguments',span);
 return names.flatMap((name,index)=>{
  const ctors=entry.ctors.filter(ctor=>ctor.name===name),fields=ctors[0]?.fields,length=kind==='Option'&&index===1?0:1;
  if(ctors.length!==1||fields?.length!==length||length&&fields[0].name!=='field0')throw typeError('Mapped standard constructor layout is not canonical',span);
  if(!length)return [];
  const actual=checker.resolveType(source.arguments[index],entry.modulePath,span);
  for(const written of [fields[0].type,entry.standardGeneric.arguments[index]])compatible(checker,actual,checker.resolveType(written,entry.modulePath,span),entry.modulePath,span);
  return [actual];
 });
}
// Ordinary checked constructor IR retains the registered monomorphic data name.
// Recover its source arguments only inside this privately captured call, from
// that actual checked constructor registry; never from a portable output hint.
function constructorOutput(checker,type,span){
 if(type?.kind!=='data'||type.rustReference||type.rustStandardGeneric)return type;
 const entry=checker.items.get(type.name),kind=entry?.standardGeneric?.kind;
 if(!['Option','Result'].includes(kind))return type;
 const result={...type,rustStandardGeneric:{kind,arguments:entry.standardGeneric.arguments.map(value=>checker.resolveType(value,entry.modulePath,span))}};
 standardArguments(checker,result,kind,span);return result;
}
function restoreConstructorOutput(checker,value,span){
 if(Array.isArray(value))return value.map(child=>restoreConstructorOutput(checker,child,span));if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='type'?constructorOutput(checker,child,span):key==='span'||key.endsWith('Proof')||key==='copyCertificate'?child:restoreConstructorOutput(checker,child,span)]));
}
function copyType(checker,type,span,active=new Set()){
 if(type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved)throw unsupported('mapped standard payload','requires unerased original Copy/no-Drop identity',span);
 const kind=type?.rustStandardGeneric?.kind;
 if(!type.rustReference&&['Option','Result'].includes(kind)){
  if(active.has(type.name))throw unsupported('mapped standard payload','recursive owned generic layouts remain unproved',span);
  originalStandardSharedPatternLayout(kind);
  const inner=new Set(active).add(type.name);standardArguments(checker,type,kind,span).forEach(value=>copyType(checker,value,span,inner));return;
 }
 payloadOwner(checker,type,span,{allowShared:true});
 if(['bool','fixed','float'].includes(type.kind)&&!type.rustReference&&!originalPrimitiveCopySource(type))throw unsupported('mapped standard primitive Copy','requires its actual original primitive implementation',span);
}
function contract(selection,kind){
 const params=selection.method.parameters,signature=selection.method.signatureSource.replace(/\s/gu,'');
 if(params[0]?.receiver!==true||params[0].reference||params.length!==(kind==='Option'?3:2)||params.slice(1).map(param=>param.rustTypeSyntax.join('')).join(',')!==(kind==='Option'?'U,F':'F')||!signature.includes(kind==='Option'?'F:FnOnce(T)->U':'F:FnOnce(T)->U'))throw new TypeError('Mapped original member requires its actual complete FnOnce(T)->U signature');
 return params;
}
function mappedSource(value){
 if(Array.isArray(value))return value.map(mappedSource);if(!value||typeof value!=='object')return value;
 const node=Object.fromEntries(Object.entries(value).map(([key,child])=>[key,mappedSource(child)]));
 if(node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.length===1&&['Ok','Err'].includes(node.fn.path[0]))return {k:'routerRegisteredConstructor',kind:'Result',constructor:node.fn.path[0],args:node.args,span:node.span};
 if(node.k==='ctor'&&node.path?.length===1&&['Ok','Err'].includes(node.path[0]))node.registeredGenericOwner='Result';
 return node;
}
function rebuild(checker,selection,kind,bindings,callback,inputs,resultType,Parser){
 const original=parsePinnedBody(Parser,selection),evidence=parsedPinnedBodyEvidence(original),params=contract(selection,kind),reserved=localNames(callback.binding,new Set(bindings.map(value=>value.name))),syntax=hygiene(mappedSource(sourceTree(original)),checker,new Map(bindings.map((binding,index)=>[params[index].name,binding.name])),reserved),specialized=specialize(syntax,new Map([[params.at(-1).name,{callback,inputs}]]));
 let body;try{body=checker.expr(specialized,new Map(bindings.map(value=>[value.name,value.value.type])),[],resultType);}catch(error){if(error instanceof TranslationError)throw new TranslationError(error.kind,error.reason,bindings[0].value.span,{originalStandardSpan:error.span,originalBodySpan:selection.method.bodySpan});throw error;}
 body=restoreConstructorOutput(checker,body,bindings[0].value.span);compatible(checker,body.type,resultType,[],bindings[0].value.span);return {body,evidence};
}
export function checkOriginalMappedBody(checker,node,receiver,env,path,expected,Parser,kind,defaultValue=null){
 requireOriginalStandardCall(checker,node);const method=kind==='Result'?'map':'map_or',selection=pinnedMappedBody(kind,method),params=contract(selection,kind),types=standardArguments(checker,receiver.type,kind,node.span);
 if(node.args.length!==params.length-1)throw typeError('Mapped standard arity differs from its original source signature',node.span);
 if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('mapped standard callback control','requires ordinary tail argument/callback values',node.span);
 types.forEach(type=>copyType(checker,type,node.span));
 const wanted=kind==='Result'&&expected?standardArguments(checker,expected,kind,node.span):null;
 if(wanted)compatible(checker,types[1],wanted[1],path,node.span);
 if(kind==='Option'){defaultValue=restoreConstructorOutput(checker,defaultValue,node.span);copyType(checker,defaultValue.type,node.span);if(expected)compatible(checker,defaultValue.type,expected,path,node.span);}
 const callback=checker.hostLambda(node.args.at(-1),[types[0]],env,path,kind==='Option'?defaultValue.type:wanted?.[0],{source:kind==='Result'?'standard-result':'standard-option',receiverType:receiver.type});
 callback.type.result=constructorOutput(checker,callback.type.result,node.span);callback.binding=restoreConstructorOutput(checker,callback.binding,node.span);
 validateCallbackCaptures(checker,callback,env,path,node.span,{allowShared:true,immutableCaptures:true});copyType(checker,callback.type.result,node.span);
 if(kind==='Option')compatible(checker,callback.type.result,defaultValue.type,path,node.span);else if(wanted)compatible(checker,callback.type.result,wanted[0],path,node.span);
 const resultType=kind==='Option'?defaultValue.type:expected??checker.instantiations.result(callback.type.result,types[1],node.span);copyType(checker,resultType,node.span);
 const reserved=localNames(callback.binding,new Set([...env.keys()].filter(name=>typeof name==='string'))),values=[receiver,...(defaultValue?[defaultValue]:[])],bindings=values.map(value=>({name:safeFreshName(checker,'ml_mapped_parameter_',reserved),value:sharedDomainGuardNeeded([value.type])?originalSharedDomainGuard(checker,node,value):value})),{body,evidence}=rebuild(checker,selection,kind,bindings,callback,[types[0]],resultType,Parser);
 let result=body;for(const binding of bindings.slice().reverse())result={k:'let',name:binding.name,value:binding.value,body:result,type:resultType,span:node.span};
 const proof={profile:'original-standard-mapped-body-v1',kind,method,selection,syntaxSha256:evidence.syntaxSha256,copyLayouts:types.map(type=>type.rustStandardGeneric?originalStandardSharedPatternLayout(type.rustStandardGeneric.kind):null),evaluationOrder:kind==='Option'?['receiver','default','selected-source-callback']:['receiver','selected-source-callback'],callbackInvocation:'selected original match arm exactly once',pointeeMoveAuthority:false,pointeeDropAuthority:false,constEligible:false},key=createHash('sha256').update(JSON.stringify({proof,body:alphaTree(result),type:resultType})).digest('hex');proof.key=key;
 issued.set(key,{proof:structuredClone(proof),body:structuredClone(result),type:structuredClone(resultType),callback:structuredClone(callback),layouts:structuredClone(captureBorrowedLayouts(checker,[receiver.type,resultType])),nominals:optionNominalContext(checker),checkingHost:checker,callers:[],Checker:checker.constructor});
 return {k:'routerOriginalMappedBody',body:result,type:resultType,pinnedStandardBodyProof:proof,constEligible:false,span:node.span};
}
export function requireOriginalMappedBody(node,program,Parser,Checker){
 const proof=node.pinnedStandardBodyProof,state=issued.get(proof?.key);
 if(!state||metadataDigest(proof)!==metadataDigest(state.proof)||node.constEligible!==false||metadataDigest(alphaTree(node.body))!==metadataDigest(alphaTree(retargetCheckedCallback(state.body,program)))||metadataDigest(node.type)!==metadataDigest(retargetCheckedCallback(state.type,program)))throw new Error('Mapped standard body requires its unchanged privately checked original source');
 const checker=new (Checker??state.Checker)('Rust',[]);checker.program({language:'Rust',items:[...program.declarations.values()].filter(item=>item.k==='data').map(item=>({...structuredClone(item),name:item.fullName})),main:null});restoreOptionNominals(checker,state.nominals);
 const bindings=[];let inner=node.body;for(let index=0;index<(proof.kind==='Option'?2:1);index++){if(inner?.k!=='let')throw new Error('Mapped original parameter binding changed');bindings.push({name:inner.name,value:inner.value});inner=inner.body;}
 const types=standardArguments(checker,bindings[0].value.type,proof.kind,node.span);types.forEach(type=>copyType(checker,type,node.span));copyType(checker,node.type,node.span);requireBorrowedLayouts(state.layouts,checker,program,[bindings[0].value.type,node.type]);
 const callback=retargetCheckedCallback(state.callback,program);copyType(checker,callback.type.result,node.span);if(proof.kind==='Option')compatible(checker,bindings[1].value.type,callback.type.result,[],node.span);else {const output=standardArguments(checker,node.type,'Result',node.span);compatible(checker,types[1],output[1],[],node.span);compatible(checker,callback.type.result,output[0],[],node.span);}
 const selection=pinnedMappedBody(proof.kind,proof.method),{body,evidence}=rebuild(checker,selection,proof.kind,bindings,callback,[types[0]],node.type,Parser);
 if(evidence.syntaxSha256!==proof.syntaxSha256||metadataDigest(alphaTree(body))!==metadataDigest(alphaTree(inner)))throw new Error('Mapped body differs from its parsed original generic member specialization');return node.body;
}
const functions=new WeakMap();
function callerShape(entry){return {params:entry.params.map(param=>({type:param.type,mutable:!!param.mutable,copyReceiver:!!param.copyReceiver})),ret:entry.ret,body:alphaTree(entry.body,new Map(entry.params.map((param,index)=>[param.name,'parameter:'+index])))};}
export function finalizeOriginalMappedBodies(checker,program){
 for(const entry of program.declarations.values())if(entry.k==='fn')for(const node of mappedNodes(entry.body)){
  const state=issued.get(node.pinnedStandardBodyProof?.key);
  if(!state||state.checkingHost!==checker||!hasOriginalMappedOrigin(node))throw new Error('Mapped caller finalization requires its actual original checking host');
  state.callers.push(structuredClone(callerShape(entry)));
 }
}

function mappedNodes(value,result=[]){if(!value||typeof value!=='object')return result;if(value.k==='routerOriginalMappedBody')result.push(value);for(const [key,child]of Object.entries(value))if(!['type','pinnedStandardBodyProof'].includes(key))Array.isArray(child)?child.forEach(node=>mappedNodes(node,result)):mappedNodes(child,result);return result;}
export function prepareOriginalMappedBodies(emitter,entry,Parser,Checker){const nodes=mappedNodes(entry.body);if(!nodes.length)return null;nodes.forEach(node=>{requireOriginalMappedBody(node,emitter.program,Parser,Checker);const state=issued.get(node.pinnedStandardBodyProof.key);if(!state.callers.some(caller=>metadataDigest(retargetCheckedCallback(caller,emitter.program))===metadataDigest(callerShape(entry))))throw new Error('Mapped caller signature/body differs from its privately finalized original function');});const previous=functions.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());functions.set(emitter,mappedNodes(renamed.body).map(node=>metadataDigest(alphaTree(node))));return ()=>{if(previous)functions.set(emitter,previous);else functions.delete(emitter);};}
export function requireOriginalMappedEmission(emitter,node){if(!functions.get(emitter)?.includes(metadataDigest(alphaTree(node))))throw new Error('Mapped body changed from its exact privately validated original function rename');return node.body;}

export function hasOriginalMappedOrigin(node){const state=issued.get(node.pinnedStandardBodyProof?.key);return Boolean(state&&metadataDigest(node.pinnedStandardBodyProof)===metadataDigest(state.proof)&&metadataDigest(node.type)===metadataDigest(state.type)&&metadataDigest(alphaTree(node.body))===metadataDigest(alphaTree(state.body)));}
