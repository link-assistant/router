// Original inherent members acquire only a token-transform source association.
// Ownership, Copy, method checking and effects remain separate obligations.
import {tokenizeRust,capturedRustTokenSource} from './extensions/lexical.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {originalMethodMember,originalMethodLowering} from './impl-resolver.mjs';
import {originalMethodNamespaceOwner} from './matches-macro-context.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const transforms=new WeakMap(),tokensToTransforms=new WeakMap();
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
  const proof=freezeMacroTree({schema:'original-method-token-transform-v1',sourcePath:member.sourcePath,modulePath:member.modulePath,sourceViewDigest:member.sourceView.digest,sourceSha256:owner.sourceSha256,memberDigest:member.methodDigest,originalMemberSpan:method.span,originalBodySpan:method.bodySpan,originalImplementationSpan:member.implementationSpan,originalTokenDigest:metadataDigest(original),transformedTokenDigest:metadataDigest(lowered.tokens),owner,receiver,receiverMode:lowering.mode,copyCertificateDigest:lowering.copyCertificate?.digest??null,map,operations,originalTokenTransformVerified:true,parsedSourceAssociation:false,copyAuthority:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  transforms.set(proof,{context,method,member,lowered,original,source,proof,tokenDigest:metadataDigest(lowered.tokens)});tokensToTransforms.set(lowered.tokens,proof);return proof;
}
export const isOriginalMethodTokenTransform=proof=>!!proof&&transforms.has(proof);
export function originalMethodTransformFacts(proof) {
  const state=transforms.get(proof);if(!state)throw new TypeError('Original method token transform is unsealed or copied');
  originalMethodLowering(state.lowered);originalMethodMember(state.method);
  if(metadataDigest(state.lowered.tokens)!==state.tokenDigest)throw new TypeError('Original method transformed tokens changed');
  originalMethodNamespaceOwner(state.context,state.method);
  return state;
}
export function originalMethodTransformForTokens(tokens){const proof=tokensToTransforms.get(tokens);if(!proof)return null;originalMethodTransformFacts(proof);return proof;}
export function originalMethodTokenTransformSnapshot(proof){return freezeMacroTree(copyMetadata(originalMethodTransformFacts(proof).proof));}
