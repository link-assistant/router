import {currentSharedReferenceCopyIdentity as sharedReferenceCopyIdentity,SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE} from '../current-standard-copy-source.mjs';
// Original standard calls have their own return scope. Public metadata cannot
// create this scope or turn an original predicate loan into an escaping borrow.
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
import {sameType} from '../checked-types.mjs';
import {copyMetadata,metadataDigest} from './source-links.mjs';
import {alphaTree,retargetCheckedCallback,optionPayload} from './standard-body-checker.mjs';
import {parsedPinnedBodyEvidence,pinnedOptionPartialEqBody} from './standard-body-source.mjs';
import {originalStandardCallContext} from './original-standard-calls.mjs';
import {originalOptionPartialEqSource} from './option-equality-source.mjs';
import {requireOriginalOptionEqualityOperand} from './option-equality.mjs';
import {typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {originalOptionCallbackNestedFrame} from './standard-option-callback-body.mjs';
const frames=new Map(),frameOrigins=new WeakSet(),loans=new Map(),callbackInputs=new WeakMap(),activeFrames=new WeakMap();
export function originalCallbackLoanType(checker,payload,span){
  const type=checker.sharedFieldType(payload,{rustReference:{kind:'shared',span}},span);
  type.patternOwnershipRefusal='shared source reference';
  type.rustReference.source='original-standard-callback-local-loan';
  return type;
}
export function checkOriginalCallbackLoan(checker,syntax,env,path,expected){
  if(syntax?.k!=='routerTextReference'||syntax.sourceBorrowToken?.value!=='&'||expected?.rustReference?.kind!=='shared')throw new TypeError('Original callback loan requires its actual immutable ampersand and shared signature');
  const pointee=expected.rustReference.pointee,value=checker.expr(syntax.value,env,path,pointee);
  if(!sameType(value.type,pointee))throw typeError('Original callback loan pointee differs from its checked source argument',syntax.span);
  checker.expectedOwnership(value.type,pointee,path,syntax.span);checker.expectedPrimitiveIdentity(value.type,pointee,path,syntax.span);
  const type=originalCallbackLoanType(checker,value.type,syntax.span),proof={profile:'original-standard-ephemeral-callback-loan-v1',key:metadataDigest({value:alphaTree(value),type}),escapes:false,mutable:false};
  const record={proof:structuredClone(proof),value:structuredClone(value),type:structuredClone(type)};loans.set(proof.key,record);
  callbackInputs.set(proof,{...record,expectedType:structuredClone(expected)});
  return {k:'routerOriginalCallbackLoan',value,type,originalLoanProof:proof,span:syntax.span};
}
// Rust's equality operator supplies the shared method operands. This issuer
// checks the actual source operator and original method signature; a public
// reference flag cannot manufacture an implicit loan or escape permission.
export function originalStandardOperandLoan(checker,caller,value,original,index){
  requireOriginalOptionEqualityOperand(checker,caller,index,value);
  const context=originalStandardCallContext(checker,caller),evidence=parsedPinnedBodyEvidence(original),selection=pinnedOptionPartialEqBody();
  if(caller.k!=='binary'||caller.op!=='eq'||evidence.selection!==selection||selection.method.parameters[index]?.rustTypeSyntax.join('')!=='&Self'||optionPayload(checker,value.type,[],caller.span).owner!=='&str')throw new TypeError('Original standard operand loan requires its actual equality operator, shared signature and checked borrowed-str Option');
  const source=originalOptionPartialEqSource(selection),type=checker.sharedFieldType(value.type,{rustReference:{kind:'shared',span:caller.span}},caller.span);
  type.patternOwnershipRefusal='shared source reference';type.rustReference.source='original-standard-operator-signature';
  const proof={profile:'original-standard-operator-shared-loan-v1',selection,syntaxSha256:evidence.syntaxSha256,source,caller:context,parameter:index,escapes:false,mutable:false,key:metadataDigest({value:alphaTree(value),type,source,caller:context,parameter:index})};
  loans.set(proof.key,{proof:structuredClone(proof),value:structuredClone(value),type:structuredClone(type)});
  return {k:'routerOriginalCallbackLoan',value,type,originalLoanProof:proof,span:value.span};
}
export function checkOriginalSourceFrame(checker,syntax,bindings,resultType,original){
  const evidence=parsedPinnedBodyEvidence(original),env=checker.contextEnvironment(syntax,new Map(bindings),resultType),previous=activeFrames.get(checker),entry=checker.items.get(resultType.name),payload=entry?.standardGeneric?.kind==='Option'&&entry.standardGeneric.arguments.length===1?checker.resolveType(entry.standardGeneric.arguments[0],entry.modulePath,syntax.span):null;let body;activeFrames.set(checker,{selection:evidence.selection,receiver:resultType,payload});try{body=checker.expr(syntax,env,[],resultType);}finally{if(previous)activeFrames.set(checker,previous);else activeFrames.delete(checker);}
  if(!sameType(body.type,resultType))throw typeError('Original standard frame tail result differs from its source signature',syntax.span);
  checker.expectedOwnership(body.type,resultType,[],syntax.span);checker.expectedPrimitiveIdentity(body.type,resultType,[],syntax.span);
  const proof={profile:'original-standard-local-return-frame-v1',selection:evidence.selection,syntaxSha256:evidence.syntaxSha256,key:metadataDigest({source:evidence,body:alphaTree(body),resultType}),returnScope:'selected-original-method-only',referenceCopySource:payload?.rustReference?SHARED_REFERENCE_COPY_SOURCE:null,canonicalOptionCopySource:payload?.rustReference?STANDARD_OPTION_COPY_SOURCE:null};
  frames.set(proof.key,{proof:structuredClone(proof),body:structuredClone(body),type:structuredClone(resultType)});frameOrigins.add(proof);
  return {k:'routerOriginalStandardFrame',body,type:resultType,sourceFrameProof:proof,span:syntax.span};
}
export const hasOriginalSourceFrame=node=>frameOrigins.has(node.sourceFrameProof);
export function hasOriginalCallbackLoan(node){const state=loans.get(node.originalLoanProof?.key);return Boolean(state&&metadataDigest(node.originalLoanProof)===metadataDigest(state.proof));}
// This exact pair was checked at the actual application of the pinned FnOnce
// parameter. It is not reference equivalence inferred from public spans/types.
export function originalCallbackLoanInputMatches(node,type){
 const state=callbackInputs.get(node?.originalLoanProof);
 const encode=value=>JSON.stringify(copyMetadata(value),(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item),same=(actual,expected)=>encode(actual)===encode(expected);
 return Boolean(state?.expectedType&&node.k==='routerOriginalCallbackLoan'&&same(node.originalLoanProof,state.proof)&&same(node.type,state.type)&&same(node.value,state.value)&&same(type,state.expectedType));
}
// The tail boundary changes traversal only. Host still authenticates the entire
// enclosing checked function before opening the private nested emission scope.
const nodes=(value,result=[])=>{if(!value||typeof value!=='object')return result;if(value.k==='routerOriginalSharedPatternMatch'&&value.sourceSharedPatternProof?.functionTail===true)return result;if(['routerOriginalStandardFrame','routerOriginalCallbackLoan'].includes(value.k))result.push(value);for(const [key,child]of Object.entries(value))if(!['type','sourceFrameProof','originalLoanProof','pinnedStandardBodyProof','sharedBodyProof','originalCallbackProof'].includes(key))Array.isArray(child)?child.forEach(item=>nodes(item,result)):nodes(child,result);return result;};
// A function-tail shared frame authenticates its complete checked body after
// the closed ordered-arm rename. Its nested standard frame keeps this issuer's
// proof/type envelope; the enclosing private issuer must separately require
// exact whole nested-node membership before using the renamed body. This reader
// alone grants neither a body comparison exception nor emission scope.
export function assertOriginalSourceFrameEnvelope(node,program){
  if(!['routerOriginalStandardFrame','routerOriginalCallbackLoan'].includes(node.k))throw new Error('Original standard frame/loan kind changed');
  const frame=node.k==='routerOriginalStandardFrame',proof=frame?node.sourceFrameProof:node.originalLoanProof,state=(frame?frames:loans).get(proof?.key);
  if(!state||metadataDigest(proof)!==metadataDigest(state.proof)||metadataDigest(node.type)!==metadataDigest(retargetCheckedCallback(state.type,program)))throw new Error('Original standard frame/loan changed or lacks private source authority');
}
const functions=new WeakMap();
// Failure-only inspection of the two plain alpha snapshots which already passed
// their original complete metadata hashes. This never accepts a frame or loan.
function originalFrameBodyDifference(actual,expected){
 try{
  let remaining=4096;
  const snippet=(value,maximum=32)=>{let text='';for(let at=0;at<value.length&&at<maximum;at++){const code=value.charCodeAt(at);text+=code>=32&&code<=126&&code!==92?value[at]:'\\u'+code.toString(16).padStart(4,'0');}return text+(value.length>maximum?'...':'');};
  const preview=value=>value===undefined?'undefined':value===null?'null':typeof value==='string'?'string('+value.length+'):'+snippet(value):typeof value==='object'?(Array.isArray(value)?'array':'object'):typeof value+':'+value;
  const index=name=>{if(!name.length||name.length>10||name.length>1&&name[0]==='0')return -1;let value=0;for(let at=0;at<name.length;at++){const digit=name.charCodeAt(at)-48;if(digit<0||digit>9)return -1;value=value*10+digit;}return value<4294967295?value:-1;};
  const order=(a,b)=>{const left=index(a),right=index(b);return left>=0||right>=0?left<0?1:right<0?-1:left-right:a<b?-1:a>b?1:0;};
  const fields=value=>{
   const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
   if(names.length>remaining)return null;remaining-=names.length;
   for(const name of names)if(typeof name!=='string'||!Object.hasOwn(descriptors[name],'value'))throw new Error('diagnostic own-data snapshot required');
   return {descriptors,names};
  };
  const visit=(a,b,path,depth,preserveOrder=false)=>{
   if(--remaining<0||depth>64||path.length>384)return 'path='+path.slice(0,384)+' reason=diagnostic-bound';
   if(a===b)return null;
   const difference=reason=>'path='+path+' reason='+reason+' actual='+preview(a)+' expected='+preview(b);
   if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return difference('primitive');
   const array=Array.isArray(a);if(array!==Array.isArray(b))return difference('container-kind');
   const left=fields(a),right=fields(b);if(!left||!right)return difference('diagnostic-bound');
   if(array){
    const length=left.descriptors.length.value,wanted=right.descriptors.length.value;
    if(length!==wanted)return 'path='+path+' reason=array-length actual='+length+' expected='+wanted;
    for(let at=0;at<length;at++){const x=left.descriptors[at].value,y=right.descriptors[at].value,found=visit(x===undefined?null:x,y===undefined?null:y,path+'/'+at,depth+1,preserveOrder);if(found)return found;}
   }else{
    const names=left.names.filter(name=>left.descriptors[name].value!==undefined),wanted=right.names.filter(name=>right.descriptors[name].value!==undefined);
    if(!preserveOrder){names.sort(order);wanted.sort(order);}
    if(names.length!==wanted.length)return 'path='+path+' reason=own-key-count actual='+names.length+' expected='+wanted.length;
    for(let at=0;at<names.length;at++)if(names[at]!==wanted[at])return 'path='+path+' reason='+(preserveOrder?'signed-key-order':'own-key')+' actual='+snippet(names[at])+' expected='+snippet(wanted[at]);
    for(const name of names){const found=visit(left.descriptors[name].value,right.descriptors[name].value,path+'/'+snippet(name,48),depth+1,preserveOrder||name==='copyCertificate');if(found)return found;}
   }
   return null;
  };
  return visit(actual,expected,'',0)??'reason=no-primitive-difference-within-bound';
 }catch{return 'reason=diagnostic-unavailable';}
}
export function prepareOriginalSourceFrames(emitter,entry){
  const found=nodes(entry.body);if(!found.length)return null;
  for(const node of found){const frame=node.k==='routerOriginalStandardFrame',proof=frame?node.sourceFrameProof:node.originalLoanProof,state=(frame?frames:loans).get(proof?.key),value=frame?node.body:node.value;
    let failed='private-state',actualBody,expectedBody;if(!state||(failed='proof',metadataDigest(proof)!==metadataDigest(state.proof))||(failed='type',metadataDigest(node.type)!==metadataDigest(retargetCheckedCallback(state.type,emitter.program)))||(failed='body',metadataDigest(actualBody=alphaTree(value))!==metadataDigest(expectedBody=alphaTree(retargetCheckedCallback(frame?state.body:state.value,emitter.program))))){
      if(failed!=='body'||!originalOptionCallbackNestedFrame(emitter,entry,node))throw new Error('Original standard frame/loan changed or lacks private source authority [join '+failed+(failed==='body'?'; '+originalFrameBodyDifference(actualBody,expectedBody):'')+']');
    }
  }
  const previous=functions.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());functions.set(emitter,nodes(renamed.body).map(node=>metadataDigest(alphaTree(node))));
  return ()=>{if(previous)functions.set(emitter,previous);else functions.delete(emitter);};
}
export function requireOriginalSourceFrameEmission(emitter,node){if(!functions.get(emitter)?.includes(metadataDigest(alphaTree(node))))throw new Error('Original standard frame/loan changed from its privately checked function rename');return node.k==='routerOriginalStandardFrame'?node.body:node.value;}

// Independently rechecked specializations can have different private nonce
// keys after project name retargeting. Compare their complete typed IR while
// each original proof envelope remains checked against its private issuer.
export function originalFrameSemanticTree(node){if(Array.isArray(node))return node.map(originalFrameSemanticTree);if(!node||typeof node!=='object')return node;return Object.fromEntries(Object.entries(node).filter(([key])=>!['sourceFrameProof','originalLoanProof'].includes(key)).map(([key,value])=>[key,originalFrameSemanticTree(value)]));}

export function originalSourceFramePatternRead(checker,type){const frame=activeFrames.get(checker);if(frame?.selection.key!=='Option::filter'||!sharedReferenceCopyIdentity(frame.payload))return false;const wanted=type.rustReference?frame.payload:frame.receiver;if(!sameType(type,wanted))return false;try{checker.expectedOwnership(type,wanted,[],type.span);checker.expectedPrimitiveIdentity(type,wanted,[],type.span);}catch{return false;}return type.rustReference?.kind==='shared'||type.kind==='data'&&type.name===frame.receiver.name;}
