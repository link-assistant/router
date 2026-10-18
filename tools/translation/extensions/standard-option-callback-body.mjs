import {originalCallbackLoanType,checkOriginalCallbackLoan,checkOriginalSourceFrame,originalFrameSemanticTree,assertOriginalSourceFrameEnvelope} from './standard-source-frame.mjs';
import {types as nodeTypes} from 'node:util';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
import {captureBorrowedLayouts,requireBorrowedLayouts,sharedDomainGuardNeeded,originalSharedDomainGuard} from './standard-borrowed-body.mjs';
// Generic source callback specialization: arguments bind once, and only the
// branch selected by the original match applies the original checked closure.
import {createHash} from 'node:crypto';
import {BOOL,sameType} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {unsupported,typeError,TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {SHARED_REFERENCE_COPY_SOURCE} from '../shared-reference-copy-source.mjs';
import {optionNominalContext,restoreOptionNominals} from './option-nominal-proof.mjs';
import {optionPayload,payloadOwner,validateCallbackCaptures,sourceTree,alphaTree,retargetCheckedCallback,nonlocal} from './standard-body-checker.mjs';
import {pinnedOptionBody,parsePinnedBody,parsedPinnedBodyEvidence} from './standard-body-source.mjs';
import {requireOriginalStandardCall} from './original-standard-calls.mjs';
import {originalJsonOptionReceiver} from '../router-core-json-updates.mjs';
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
function specialize(node,callbacks,loan=false){if(Array.isArray(node))return node.map(value=>specialize(value,callbacks,loan));if(!node||typeof node!=='object')return node;if(node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.length===1&&callbacks.has(node.fn.path[0])||node.k==='name'&&node.path?.length===1&&callbacks.has(node.path[0])){const application={k:'routerOriginalCallbackApplication',span:node.span};applications.set(application,{...callbacks.get(node.k==='app'?node.fn.path[0]:node.path[0]),args:node.k==='app'?node.args:[],loan});return application;}return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,specialize(value,callbacks,loan)]));}
export function checkOriginalCallbackApplication(checker,node,env,path){
 const state=applications.get(node);if(!state||state.args.length!==state.callback.arity||state.inputs.length!==state.args.length)throw new TypeError('Original callback application lacks its privately checked source binding/arity');
 const reserved=localNames(state.callback.binding,new Set([...env.keys()].filter(name=>typeof name==='string'))),inputs=state.args.map((arg,index)=>{const type=state.inputs[index],value=state.loan?checkOriginalCallbackLoan(checker,arg,env,path,type):checker.expr(arg,env,path,type);if(!sameType(value.type,type))throw typeError('Original callback argument source identity differs',node.span);checker.expectedOwnership(value.type,type,path,node.span);checker.expectedPrimitiveIdentity(value.type,type,path,node.span);return {name:safeFreshName(checker,'ml_standard_callback_arg_',reserved),value};});
 const apply=value=>{if(Array.isArray(value))return value.map(apply);if(!value||typeof value!=='object')return value;if(value.k==='routerLambdaInput'){const input=inputs[value.position];if(!input)throw new TypeError('Original callback input position is outside its actual signature');return {k:'var',name:input.name,type:input.value.type,span:value.span};}return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,['span','type'].includes(key)?child:apply(child)]));};
 let result=apply(state.callback.binding);for(const input of inputs.slice().reverse())result={k:'let',name:input.name,value:input.value,body:result,type:result.type,span:node.span};return result;
}
function contract(selection,method){const params=selection.method.parameters;if(params[0]?.receiver!==true||params[0].reference||params.length!==(method==='map_or_else'?3:2))throw new TypeError('Original Option callback parameters changed');const signature=params.slice(1).map(param=>param.rustTypeSyntax.join(''));if(method==='map_or_else'){if(signature.join(',')!=='D,F'||!selection.method.signatureSource.replace(/\s/gu,'').includes('D:FnOnce()->U,F:FnOnce(T)->U'))throw new TypeError('Original map_or_else requires both exact original FnOnce bounds');}else if(method==='filter'){if(signature[0]!=='P'||!selection.method.signatureSource.replace(/\s/gu,'').includes('P:FnOnce(&T)->bool'))throw new TypeError('Original filter requires its actual FnOnce shared-loan bound');}else if(signature[0]!=='implFnOnce(T)->bool')throw new TypeError('Original predicate requires its actual FnOnce(T)->bool parameter');return params;}
function rebuild(checker,selection,method,receiver,callbacks,resultType,Parser,name){const original=parsePinnedBody(Parser,selection),evidence=parsedPinnedBodyEvidence(original),payload=optionPayload(checker,receiver.type,[],receiver.span,{allowShared:true}).payload,reserved=callbacks.reduce((names,callback)=>localNames(callback.binding,names),new Set([name])),syntax=hygiene(sourceTree(original),checker,new Map([['self',name]]),reserved),map=new Map(selection.method.parameters.slice(1).map((param,index)=>[param.name,{callback:callbacks[index],inputs:method==='map_or_else'&&index===0?[]:[method==='filter'?originalCallbackLoanType(checker,payload,receiver.span):payload]}]));let body;try{body=method==='filter'?checkOriginalSourceFrame(checker,specialize(syntax,map,true),[[name,receiver.type]],resultType,original):checker.expr(specialize(syntax,map),new Map([[name,receiver.type]]),[],resultType);}catch(error){if(error instanceof TranslationError)throw new TranslationError(error.kind,error.reason,receiver.span,{originalStandardSpan:error.span});throw error;}if(!sameType(body.type,resultType))throw typeError('Original Option callback result type differs',receiver.span);checker.expectedOwnership(body.type,resultType,[],receiver.span);checker.expectedPrimitiveIdentity(body.type,resultType,[],receiver.span);return {body,evidence};}
export function checkPinnedOptionCallbackBody(checker,node,receiver,env,path,expected,Parser){requireOriginalStandardCall(checker,node);const {payload,owner}=optionPayload(checker,receiver.type,path,node.span,{allowShared:true}),method=node.method??node.op,selection=pinnedOptionBody(method),params=contract(selection,method);if(node.args.length!==params.length-1)throw typeError('Option callback argument arity differs from its actual source signature',node.span);if(nonlocal(node.object)&&!originalJsonOptionReceiver(checker,node,receiver)||node.args.some(nonlocal))throw unsupported('Option callback control','requires ordinary tail callback/argument values',node.span);const callbacks=[];let resultType=BOOL;if(method==='map_or_else'){const fallback=checker.hostLambda(node.args[0],[],env,path,expected,{source:'standard-option',receiverType:receiver.type});resultType=fallback.type.result;payloadOwner(checker,resultType,node.span,{allowShared:true});callbacks.push(fallback,checker.hostLambda(node.args[1],[payload],env,path,resultType,{source:'standard-option',receiverType:receiver.type}));}else callbacks.push(checker.hostLambda(node.args[0],[method==='filter'?originalCallbackLoanType(checker,payload,node.span):payload],env,path,BOOL,{source:'standard-option',receiverType:receiver.type}));if(method==='filter')resultType=receiver.type;for(const callback of callbacks)validateCallbackCaptures(checker,callback,env,path,node.span,{allowShared:true,immutableCaptures:true});const name=safeFreshName(checker,'ml_standard_callback_self_',callbacks.reduce((names,callback)=>localNames(callback.binding,names),new Set([...env.keys()].filter(key=>typeof key==='string')))),subject={k:'var',name,type:receiver.type,span:node.span},{body,evidence}=rebuild(checker,selection,method,subject,callbacks,resultType,Parser,name),result={k:'let',name,value:(payload.rustReference||method==='filter')&&sharedDomainGuardNeeded([payload])?originalSharedDomainGuard(checker,node,receiver):receiver,body,type:resultType,span:node.span},proof={profile:'original-option-lazy-callback-body-v1',method,owner,selection,syntaxSha256:evidence.syntaxSha256,callbackArity:callbacks.map(callback=>callback.arity),referenceCopySource:payload.rustReference?SHARED_REFERENCE_COPY_SOURCE:null,pointeeMoveAuthority:false,constEligible:false};if(expected){checker.expectedOwnership(resultType,expected,path,node.span);checker.expectedPrimitiveIdentity(resultType,expected,path,node.span);}const key=createHash('sha256').update(JSON.stringify({proof,body:alphaTree(result)})).digest('hex');proof.key=key;issued.set(key,{proof:structuredClone(proof),body:structuredClone(result),callbacks:structuredClone(callbacks),payload:structuredClone(payload),layouts:structuredClone(captureBorrowedLayouts(checker,[receiver.type,resultType])),nominals:optionNominalContext(checker),Parser,Checker:checker.constructor});return {k:'routerPinnedOptionCallbackBody',body:result,type:resultType,originalCallbackProof:proof,constEligible:false,span:node.span};}
export function requirePinnedOptionCallbackBody(node,program,Parser,Checker){const proof=node.originalCallbackProof,state=issued.get(proof?.key);if(!state||metadataDigest(proof)!==metadataDigest(state.proof)||node.body?.k!=='let')throw new Error('Option callback requires its actual privately checked original source');if(metadataDigest(alphaTree(node.body))!==metadataDigest(alphaTree(retargetCheckedCallback(state.body,program))))throw new Error('Option callback receiver/body or captured binding changed');const checker=new (Checker??state.Checker)('Rust',[]);checker.program({language:'Rust',items:[...program.declarations.values()].filter(item=>item.k==='data').map(item=>({...structuredClone(item),name:item.fullName})),main:null});restoreOptionNominals(checker,state.nominals);const receiver=node.body.value.k==='routerOriginalSharedDomainGuard'?node.body.value.value:node.body.value,{owner}=optionPayload(checker,receiver.type,[],node.span,{allowShared:true}),originalOwner=payloadOwner(checker,retargetCheckedCallback(state.payload,program),node.span,{allowShared:true});requireBorrowedLayouts(state.layouts,checker,program,[receiver.type,node.type]);if(owner!==originalOwner)throw new Error('Option callback source payload changed');const selection=pinnedOptionBody(proof.method);contract(selection,proof.method);const callbacks=state.callbacks.map(value=>retargetCheckedCallback(value,program)),subject={k:'var',name:node.body.name,type:receiver.type,span:node.span},{body,evidence}=rebuild(checker,selection,proof.method,subject,callbacks,node.type,Parser,node.body.name);if(evidence.syntaxSha256!==proof.syntaxSha256||metadataDigest(alphaTree(originalFrameSemanticTree(body)))!==metadataDigest(alphaTree(originalFrameSemanticTree(node.body.body))))throw new Error('Option callback body or captured binding changed from its original specialization');return node.body;}

const functions=new WeakMap(),frameParents=new WeakMap();
const originalMapGet=Map.prototype.get,originalReflectApply=Reflect.apply;
// A parent association is only a weak identity hint. Every use independently
// rebuilds the current complete callback, including its enclosing receiver let.
// In particular, a later Host prepare failure may leave a hint behind.
const parentWalkExcluded=new Set(['type','originalCallbackProof','sharedBodyProof','pinnedStandardBodyProof','sourceFrameProof','originalLoanProof']);
function callbackFrameParents(body){
 const parents=new WeakMap(),seenCallbacks=new WeakSet(),seenFrames=new WeakSet(),active=new WeakSet();let cells=200000;
 const visit=(node,parent,depth)=>{
  if(--cells<0||depth>160)throw new Error('Option callback parent membership exceeds its checked IR bounds');
  if(!node||typeof node!=='object')return;
  if(nodeTypes.isProxy(node)||active.has(node))throw new Error('Option callback parent membership requires acyclic own data');
  const prototype=Object.getPrototypeOf(node),array=Array.isArray(node);
  if(prototype!==Object.prototype&&prototype!==null&&!(array&&prototype===Array.prototype))throw new Error('Option callback parent membership has an unknown prototype');
  const fields=Object.getOwnPropertyDescriptors(node),keys=Reflect.ownKeys(fields);cells-=keys.length;
  if(cells<0)throw new Error('Option callback parent membership exceeds its checked IR bounds');
  for(const key of keys)if(typeof key!=='string'||!Object.hasOwn(fields[key],'value')||!fields[key].enumerable&&!(array&&key==='length'))throw new Error('Option callback parent membership requires visible own data');
  if(array){const length=fields.length?.value;if(!Number.isSafeInteger(length)||length<0||keys.length!==length+1)throw new Error('Option callback parent membership requires dense arrays');for(let at=0;at<length;at++)if(!Object.hasOwn(fields,at))throw new Error('Option callback parent membership requires dense arrays');}
  const kind=fields.k?.value;
  if(kind==='routerPinnedOptionCallbackBody'){
   if(seenCallbacks.has(node))throw new Error('Option callback parent membership is ambiguous');
   seenCallbacks.add(node);parent=node;
  }
  if(kind==='routerOriginalStandardFrame'||kind==='routerOriginalCallbackLoan'){
   if(seenFrames.has(node))throw new Error('Original standard frame/loan has ambiguous callback membership');
   seenFrames.add(node);if(parent)parents.set(node,parent);
  }
  active.add(node);
  try{for(const key of keys)if(!(array&&key==='length')&&!parentWalkExcluded.has(key))visit(fields[key].value,parent,depth+1);}finally{active.delete(node);}
 };
 visit(body,null,0);return parents;
}
const ownParentData=(node,key)=>{
 if(!node||typeof node!=='object'||nodeTypes.isProxy(node))return undefined;
 const descriptor=Object.getOwnPropertyDescriptor(node,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;
};
function currentCallbackParent(emitter,entry,node,parent){
 const program=ownParentData(emitter,'program'),declarations=ownParentData(program,'declarations'),name=ownParentData(entry,'fullName'),body=ownParentData(entry,'body');
 if(!declarations||nodeTypes.isProxy(declarations)||!nodeTypes.isMap(declarations)||originalReflectApply(originalMapGet,declarations,[name])!==entry||callbackFrameParents(body).get(node)!==parent)return null;
 return program;
}
export function originalOptionCallbackNestedFrame(emitter,entry,node){
 const parent=frameParents.get(emitter)?.get(entry)?.get(node);if(!parent)return false;
 const program=currentCallbackParent(emitter,entry,node,parent);if(!program)return false;
 const proof=ownParentData(parent,'originalCallbackProof'),state=issued.get(ownParentData(proof,'key'));
 if(!state||typeof state.Parser!=='function'||typeof state.Checker!=='function')return false;
 requirePinnedOptionCallbackBody(parent,program,state.Parser,state.Checker);
 if(currentCallbackParent(emitter,entry,node,parent)!==program)return false;
 assertOriginalSourceFrameEnvelope(node,program);
 if(metadataDigest(parent.originalCallbackProof)!==metadataDigest(state.proof)||metadataDigest(parent.type)!==metadataDigest(retargetCheckedCallback(state.body.type,program))||metadataDigest(alphaTree(parent.body))!==metadataDigest(alphaTree(retargetCheckedCallback(state.body,program))))throw new Error('Original standard frame/loan enclosing Option callback changed');
 return currentCallbackParent(emitter,entry,node,parent)===program;
}

const callbackNodes=(node,result=[])=>{if(!node||typeof node!=='object')return result;if(node.k==='routerPinnedOptionCallbackBody')result.push(node);for(const [key,value]of Object.entries(node))if(!['type','originalCallbackProof','sharedBodyProof','pinnedStandardBodyProof'].includes(key))Array.isArray(value)?value.forEach(child=>callbackNodes(child,result)):callbackNodes(value,result);return result;};
export function prepareOriginalOptionCallbacks(emitter,entry,Parser,Checker){const nodes=callbackNodes(entry.body);if(!nodes.length)return null;for(const node of nodes)requirePinnedOptionCallbackBody(node,emitter.program,Parser,Checker);const previous=functions.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());functions.set(emitter,callbackNodes(renamed.body).map(node=>metadataDigest(alphaTree(node))));
 const previousParents=frameParents.get(emitter),parents=new WeakMap();
 // Only the constructors captured by the actual original call can establish a
 // hint. Other public prepare callers retain the existing callback behavior.
 // Hints are optional: their whole-entry census must never newly reject an
 // otherwise valid original child. Only a later body mismatch needs a hint,
 // and its fresh current membership census still refuses every uncertainty.
 try{if(nodes.every(node=>{const state=issued.get(node.originalCallbackProof?.key);return state?.Parser===Parser&&state.Checker===Checker;}))parents.set(entry,callbackFrameParents(entry.body));}catch{}
 frameParents.set(emitter,parents);
 return ()=>{if(previous)functions.set(emitter,previous);else functions.delete(emitter);if(previousParents)frameParents.set(emitter,previousParents);else frameParents.delete(emitter);};}
export function requireOriginalOptionCallbackEmission(emitter,node){if(!functions.get(emitter)?.includes(metadataDigest(alphaTree(node))))throw new Error('Option callback changed from its exact privately validated source function rename');return node.body;}

// NEW read-only projection DATA, not an issuer/guard exception. The complete
// existing private verifier executes first, even for a nonmatching callback.
// No private callback record is copied, returned or passed to a caller hook.
const NONEMPTY_FILTER_DEFINITION="pub fn filter<P>(self, predicate: P) -> Self\n    where\n        P: FnOnce(&T) -> bool,\n    {\n        if let Some(x) = self {\n            if predicate(&x) {\n                return Some(x);\n            }\n        }\n        None\n    }";
const NONEMPTY_FILTER_SELECTED_DEFINITION="fn filter<P>(self, predicate: P) -> Self\n    where\n        P: FnOnce(&T) -> bool,\n    {\n        if let Some(x) = self {\n            if predicate(&x) {\n                return Some(x);\n            }\n        }\n        None\n    }";
export function readOriginalNonemptyStrFilter(node,program){
 if(node?.k!=='routerPinnedOptionCallbackBody')return null;
 requirePinnedOptionCallbackBody(node,program);
 const state=originalReflectApply(originalMapGet,issued,[node.originalCallbackProof.key]);
 if(state.proof.method!=='filter'||state.proof.owner!=='&str'||state.callbacks.length!==1||state.proof.selection.method.definitionSource!==NONEMPTY_FILTER_SELECTED_DEFINITION)return null;
 const payload=state.payload;if(payload.kind!=='string'||payload.rustOwnership?.kind!=='borrowed'||payload.rustOwnership.source!=='str')return null;
 const callback=state.callbacks[0];if(callback.k!=='routerLambda'||callback.arity!==1||callback.type.result.kind!=='bool')return null;
 const binding=callback.binding;if(binding.k!=='let'||binding.value.k!=='routerLambdaInput'||binding.value.position!==0||binding.type!==callback.type.result)return null;
 const argument=binding.value.type;if(argument.kind!=='string'||argument.rustReference?.kind!=='shared'||argument.rustReference.pointee.kind!=='string'||argument.rustReference.pointee.rustOwnership?.kind!=='borrowed'||argument.rustReference.pointee.rustOwnership.source!=='str')return null;
 const predicate=binding.body;if(predicate.k!=='unary'||predicate.op!=='not'||predicate.type!==binding.type)return null;
 const measure=predicate.arg;if(measure.k!=='routerStringOperation'||measure.op!=='is_empty'||measure.args.length!==0||measure.type!==binding.type)return null;
 const input=measure.string;if(input.k!=='var'||input.name!==binding.name||metadataDigest(input.type)!==metadataDigest(argument))return null;
 // str has no aggregate-domain guard. Any other receiver wrapper is refused,
 // rather than erased. The returned receiver was already supplied by caller.
 if(node.body.value.k==='routerOriginalSharedDomainGuard')return null;
 return {receiver:node.body.value,originalMethodSource:NONEMPTY_FILTER_DEFINITION,selectionEquation:'remove only the original pub visibility prefix (4 UTF16 units)',methodSource:state.proof.selection.method.definitionSource,methodBody:state.proof.selection.method.bodySource,sourceProfile:state.proof.selection.profile,equation:'filter(Some(x), |s| !s.is_empty()) = if x != "" { Some(x) } else { None }; filter(None,p) = None',predicate:'same-checked-shared-str-input-not-is-empty',callbackEvaluations:{None:0,Some:1},semanticAuthority:false};
}
