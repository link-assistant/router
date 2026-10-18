// Original inherent members acquire only a token-transform source association.
// Ownership, Copy, method checking and effects remain separate obligations.
import {tokenizeRust,capturedRustTokenSource} from './extensions/lexical.mjs';
import {copyMetadata,metadataDigestForInternalSources as metadataDigest} from './extensions/source-links.mjs';
import {originalMethodMember,originalMethodLowering} from './impl-resolver.mjs';
import {originalMethodNamespaceOwner} from './matches-macro-context.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {captureOriginalMethodValidation,originalMethodValidationDigest,originalMethodValidationIntrinsicsUnchanged} from './source-method-validation.mjs';
import {originalFlatTokenIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {types} from 'node:util';
const transforms=new WeakMap(),tokensToTransforms=new WeakMap(),parserTokenCopies=new WeakMap();
const canonical=path=>path[0]==='crate'?path.slice(1):path;
const equal=(a,b)=>metadataDigest(a)===metadataDigest(b);
const mappedToken=(token,offset)=>({...token,start:token.start+offset,end:token.end+offset});
function pathTokens(path,origin){return path.flatMap((value,index)=>[...(index?[{kind:'punct',value:'::',raw:'::',...origin,generated:true}]:[]),{kind:'identifier',value,raw:value,...origin,generated:true}]);}
export function createOriginalMethodTokenTransform(context,method,lowered) {
  const member=originalMethodMember(method),lowering=originalMethodLowering(lowered),owner=originalMethodNamespaceOwner(context,method);
  if(lowering.method!==method||lowering.original!==member||!equal(canonical(lowered.typePath),canonical(owner.owner)))throw new TypeError('Method token transform differs from its original member/nominal owner');
  const original=tokenizeRust(method.source),source=capturedRustTokenSource(original);
  if(!source||member.source.slice(method.span.start,method.span.end)!==source.source)throw new TypeError('Method tokenizer differs from its complete original member source');
  if(original.length>16000||lowered.tokens.length>32000)throw new TypeError('Method source token transform exceeds its finite bound');
  const actual=original.map(token=>mappedToken(token,method.span.start)),expected=[],map=[],operations=[];
  const emit=(token,indices,operation)=>{expected.push(token);map.push({outputIndex:map.length,originalIndices:indices,originalSpans:indices.map(index=>({start:actual[index].start,end:actual[index].end})),operation});};
  const fresh=lowered.receiverName;
  const fn=actual.findIndex(token=>token.value==='fn'),open=actual.findIndex((token,index)=>index>fn&&token.value==='(');
  if(fn<0||open<0)throw new TypeError('Original method lacks its actual function/parameter syntax');
  const receiver=method.receiver,width=lowering.mode==='copy'?1:2;
  let replacementEnd=-1;
  if(receiver==='shared'||lowering.mode==='copy') {
    if(fresh!=='router_self'||(lowering.mode==='copy'?(receiver!=='value'||actual[open+1]?.value!=='self'||![')',','].includes(actual[open+2]?.value)):(actual[open+1]?.value!=='&'||actual[open+2]?.value!=='self')))throw new TypeError('Original receiver differs from its checked token lowering');
    replacementEnd=open+width;
  } else if(receiver!==null||fresh!==null)throw new TypeError('Original method receiver requires another source transform profile');
  for(let index=0;index<actual.length;index++) {
    const token=actual[index];
    if(index===open+1&&replacementEnd>=0) {
      const indices=Array.from({length:width},(_,at)=>index+at),origin={start:token.start,end:actual[replacementEnd].end};
      const replacement=[{kind:'identifier',value:fresh,raw:fresh,...origin,generated:true},{kind:'punct',value:':',raw:':',...origin,generated:true},...(lowering.mode==='copy'?[]:[actual[index]]),...pathTokens(lowered.typePath,origin)];
      for(const value of replacement)emit(value,indices,lowering.mode==='copy'?'copy-receiver-parameter':'shared-receiver-parameter');
      operations.push({kind:lowering.mode==='copy'?'copy-receiver-parameter':'shared-receiver-parameter',originalSpan:origin,originalIndices:indices,owner:owner.owner});index=replacementEnd;continue;
    }
    if(token.kind==='identifier'&&token.value==='Self') {
      const origin={start:token.start,end:token.end};for(const value of pathTokens(lowered.typePath,origin))emit(value,[index],'inherent-self-type');operations.push({kind:'inherent-self-type',originalSpan:origin,originalIndices:[index],owner:owner.owner});continue;
    }
    if(token.kind==='identifier'&&token.value==='self'&&actual[index+1]?.value!=='::') {
      if(!fresh)throw new TypeError('Static original method has no self receiver');
      emit({...token,value:fresh,raw:fresh,generated:true},[index],'receiver-use');operations.push({kind:'receiver-use',originalSpan:{start:token.start,end:token.end},originalIndices:[index]});continue;
    }
    emit(token,[index],'original-token');
  }
  if(!equal(expected,lowered.tokens))throw new TypeError('Issued method tokens differ from the complete original generic self/Self transform');
  let originalValidation;
  const proof=freezeMacroTree({schema:'original-method-token-transform-v1',sourcePath:member.sourcePath,modulePath:member.modulePath,sourceViewDigest:member.sourceView.digest,sourceSha256:owner.sourceSha256,memberDigest:member.methodDigest,originalMemberSpan:method.span,originalBodySpan:method.bodySpan,originalImplementationSpan:member.implementationSpan,originalTokenDigest:(originalValidation=captureOriginalMethodValidation(original)).digest,transformedTokenDigest:metadataDigest(lowered.tokens),owner,receiver,receiverMode:lowering.mode,copyCertificateDigest:lowering.copyCertificate?.digest??null,map,operations,originalTokenTransformVerified:true,parsedSourceAssociation:false,copyAuthority:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  const validation=captureOriginalMethodValidation(lowered.tokens);
  transforms.set(proof,Object.freeze({context,method,member,lowered,original,source,proof,tokenDigest:validation.digest,validation:validation.capture,originalValidation:originalValidation.capture}));tokensToTransforms.set(lowered.tokens,proof);return proof;
}
export const isOriginalMethodTokenTransform=proof=>!!proof&&transforms.has(proof);
export function originalMethodTransformFacts(proof) {
  const state=transforms.get(proof);if(!state)throw new TypeError('Original method token transform is unsealed or copied');
  originalMethodLowering(state.lowered);originalMethodMember(state.method);
  if(originalMethodValidationDigest(state.lowered.tokens,state.validation)!==state.tokenDigest)throw new TypeError('Original method transformed tokens changed');
  if(originalMethodValidationDigest(state.original,state.originalValidation)!==state.proof.originalTokenDigest)throw new TypeError('Original method tokenizer source tokens changed');
  originalMethodNamespaceOwner(state.context,state.method);
  return state;
}
export function originalMethodTransformForTokens(tokens){const proof=tokensToTransforms.get(tokens);if(!proof)return null;originalMethodTransformFacts(proof);return proof;}
export function originalMethodTokenTransformSnapshot(proof){return freezeMacroTree(copyMetadata(originalMethodTransformFacts(proof).proof));}

// The parser gets its own issued token array: the legitimate && split cannot
// mutate the lowerer's exact source map. Copies made by callers are unbranded.
export function originalMethodParserTokens(proof) {
  const state=originalMethodTransformFacts(proof),tokens=copyMetadata(state.lowered.tokens);
  parserTokenCopies.set(tokens,Object.freeze({proof,expected:freezeMacroTree(copyMetadata(tokens))}));return tokens;
}
export function originalMethodParserTokenFacts(tokens) {
  const issued=parserTokenCopies.get(tokens);if(!issued)throw new TypeError('Original method parser token array is copied or unissued');
  const state=originalMethodTransformFacts(issued.proof),actual=copyMetadata(tokens);let at=0;
  for(const expected of issued.expected){const first=actual[at++];if(equal(first,expected))continue;const second=actual[at++];
    if(expected.value!=='&&'||expected.end!==expected.start+2||!equal(first,{...expected,value:'&',end:expected.start+1})||!equal(second,{...expected,value:'&',start:expected.start+1}))throw new TypeError('Original method parser changed its exact transformed token stream');
  }
  if(at!==actual.length)throw new TypeError('Original method parser inserted or removed source tokens');
  return Object.freeze({proof:issued.proof,source:state.member.source,sourcePath:state.member.sourcePath,modulePath:state.member.modulePath,sourceView:state.member.sourceView,compilationProfile:state.member.compilationProfile,originalMemberSpan:state.method.span,originalBodySpan:state.method.bodySpan,transform:state.proof});
}
export function originalMethodParserTokenContext(tokens){return parserTokenCopies.has(tokens)?originalMethodParserTokenFacts(tokens):null;}

// Explicit sibling observation contract. Every old issuer/reader stays exact;
// this lane only groups comparisons of a freshly copied, actually issued stream.
function groupedTokenIntrinsics(){return originalMethodValidationIntrinsicsUnchanged()&&originalFlatTokenIntrinsicsUnchanged();}
function originalMethodParserTokenObservedTail(issued,state,actual) {
  let at=0;
  for(const expected of issued.expected){const first=actual[at++];if(equal(first,expected))continue;const second=actual[at++];
    if(expected.value!=='&&'||expected.end!==expected.start+2||!equal(first,{...expected,value:'&',end:expected.start+1})||!equal(second,{...expected,value:'&',start:expected.start+1}))throw new TypeError('Original method parser changed its exact transformed token stream');
  }
  if(at!==actual.length)throw new TypeError('Original method parser inserted or removed source tokens');
  return Object.freeze({proof:issued.proof,source:state.member.source,sourcePath:state.member.sourcePath,modulePath:state.member.modulePath,sourceView:state.member.sourceView,compilationProfile:state.member.compilationProfile,originalMemberSpan:state.method.span,originalBodySpan:state.method.bodySpan,transform:state.proof});
}
// Count well-formed JSON UTF-16 units without allocating an encoded big string.
// Primitive string indexing has own immutable character slots; no new String
// prototype method, regexp state or caller callback is used in this preflight.
function groupedTokenQuotedUnits(value) {
  let units=2;
  for(let index=0;index<value.length;index++){
    const char=value[index];
    if(char==='"'||char==='\\')units+=2;
    else if(char<='\u001f')units+=char==='\b'||char==='\t'||char==='\n'||char==='\f'||char==='\r'?2:6;
    else if(char>='\ud800'&&char<='\udbff'){
      const next=index+1<value.length?value[index+1]:undefined;if(next!==undefined&&next>='\udc00'&&next<='\udfff'){units+=2;index++;}else units+=6;
    }else units+=char>='\udc00'&&char<='\udfff'?6:1;
    if(units>1048576)return 1048577;
  }
  return units;
}
function groupedTokenRecord(value,requireFrozen) {
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value))return null;
  const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null||requireFrozen&&!Object.isFrozen(value))return null;
  const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields),copy=Object.create(null);
  let bytes=0,units=2,count=0;
  for(let index=0;index<keys.length;index++){
    const key=keys[index],field=fields[key];if(typeof key!=='string'||!Object.hasOwn(field,'value')||!field.enumerable)return null;
    const item=field.value,kind=typeof item;
    if(item!==null&&kind!=='undefined'&&kind!=='string'&&kind!=='boolean'&&!(kind==='number'&&Number.isSafeInteger(item)))return null;
    copy[key]=item;
    if(kind==='string')bytes+=Buffer.byteLength(item);
    if(item!==undefined){
      if(count++)units++;
      units+=groupedTokenQuotedUnits(key)+1+(kind==='string'?groupedTokenQuotedUnits(item):item===null?4:kind==='boolean'?item?4:5:JSON.stringify(item).length);
    }
    if(bytes>4194304||units>1048576||keys.length+1>200000)return null;
  }
  return {value:copy,cells:keys.length+1,bytes,units,height:keys.length?1:0};
}
function groupedTokenRows(values,requireFrozen) {
  if(types.isProxy(values)||!Array.isArray(values)||Object.getPrototypeOf(values)!==Array.prototype||requireFrozen&&!Object.isFrozen(values))return null;
  const fields=Object.getOwnPropertyDescriptors(values),keys=Reflect.ownKeys(fields),length=Object.hasOwn(fields,'length')?fields.length.value:null;
  if(!Number.isSafeInteger(length)||length<0||length>200000||keys.length!==length+1)return null;
  const rows=[];
  for(let index=0;index<length;index++){
    const key=String(index);if(!Object.hasOwn(fields,key))return null;
    const field=fields[key];if(!Object.hasOwn(field,'value')||!field.enumerable)return null;
    const row=groupedTokenRecord(field.value,requireFrozen);if(!row)return null;rows.push(row);
  }
  return rows;
}
function planOriginalMethodParserTokenGroups(issued,actual) {
  // Qualification precedes this callback-free detached own-data clone. No row
  // enters an issuer, Map/WeakMap or observer-capable helper during planning.
  const expectedRows=groupedTokenRows(issued.expected,true),actualRows=groupedTokenRows(actual,false);if(!expectedRows||!actualRows)return null;
  const groups=[];let at=0,actualGroup=[],expectedGroup=[],actualCells=1,expectedCells=1,actualBytes=0,expectedBytes=0,actualUnits=2,expectedUnits=2;
  const append=(left,right)=>{
    if(!left||!right)return false;
    if(actualGroup.length){actualUnits++;expectedUnits++;}
    actualCells+=left.cells;expectedCells+=right.cells;actualBytes+=left.bytes;expectedBytes+=right.bytes;actualUnits+=left.units;expectedUnits+=right.units;
    if(actualCells>200000||expectedCells>200000||actualBytes>4194304||expectedBytes>4194304||actualUnits>1048576||expectedUnits>1048576||left.height+1>160||right.height+1>160)return false;
    actualGroup.push(left.value);expectedGroup.push(right.value);return true;
  };
  for(let index=0;index<expectedRows.length;index++){
    const expected=expectedRows[index],first=actualRows[at++];if(!first)return null;
    if(expected.value.value==='&&'&&expected.value.end===expected.value.start+2&&first.value.value==='&'){
      const left=groupedTokenRecord(expected.value,false).value,right=groupedTokenRecord(expected.value,false).value;
      left.value=right.value='&';left.end=expected.value.start+1;right.start=expected.value.start+1;
      if(!append(first,groupedTokenRecord(left,false))||!append(actualRows[at++],groupedTokenRecord(right,false)))return null;
    }else if(!append(first,expected))return null;
    if((index+1)%256===0||index+1===expectedRows.length){
      groups.push({actual:actualGroup,expected:expectedGroup});actualGroup=[];expectedGroup=[];actualCells=expectedCells=1;actualBytes=expectedBytes=0;actualUnits=expectedUnits=2;
    }
  }
  return {groups,consumed:at};
}
export function originalMethodParserTokenFactsGrouped(tokens) {
  if(!groupedTokenIntrinsics())return originalMethodParserTokenFacts(tokens);
  const issued=parserTokenCopies.get(tokens);if(!issued)throw new TypeError('Original method parser token array is copied or unissued');
  const state=originalMethodTransformFacts(issued.proof),actual=copyMetadata(tokens);
  if(!groupedTokenIntrinsics())return originalMethodParserTokenObservedTail(issued,state,actual);
  const plan=planOriginalMethodParserTokenGroups(issued,actual);
  if(!plan)return originalMethodParserTokenObservedTail(issued,state,actual);
  for(let index=0;index<plan.groups.length;index++){
    if(!groupedTokenIntrinsics())throw new TypeError('Original method grouped token validation native operations changed');
    const actualDigest=metadataDigest(plan.groups[index].actual);
    if(!groupedTokenIntrinsics())throw new TypeError('Original method grouped token validation native operations changed');
    const expectedDigest=metadataDigest(plan.groups[index].expected);
    if(!groupedTokenIntrinsics())throw new TypeError('Original method grouped token validation native operations changed');
    if(actualDigest!==expectedDigest)throw new TypeError('Original method parser changed its exact transformed token stream');
  }
  if(plan.consumed!==actual.length)throw new TypeError('Original method parser inserted or removed source tokens');
  return Object.freeze({proof:issued.proof,source:state.member.source,sourcePath:state.member.sourcePath,modulePath:state.member.modulePath,sourceView:state.member.sourceView,compilationProfile:state.member.compilationProfile,originalMemberSpan:state.method.span,originalBodySpan:state.method.bodySpan,transform:state.proof});
}
