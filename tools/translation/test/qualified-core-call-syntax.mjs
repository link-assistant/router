// Syntax census only: full source/CST bytes and token positions grant no semantic authority.
import assert from 'node:assert/strict';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,parseConcreteSyntaxMeta,reconstructConcreteSyntax} from '../concrete-syntax-meta.mjs';

export function qualifiedCoreCallSyntax(source,operations){
 assert.equal(typeof source,'string');assert.ok(Array.isArray(operations)&&operations.every(name=>typeof name==='string'));
 const meta=createConcreteSyntaxMeta(source,{language:'Rust'}),canonical=serializeConcreteSyntaxMeta(meta),reparsed=parseConcreteSyntaxMeta(canonical),reconstructed=reconstructConcreteSyntax(reparsed);
 assert.equal(serializeConcreteSyntaxMeta(reparsed),canonical);assert.equal(reconstructed,source);
 const allTokens=rustTokens(source),tokens=allTokens.filter(token=>token.type!=='comment'),items=sourceItems(source),calls=[],closing={'(':')','[':']','{':'}'};
 const span=(start,end)=>({utf16:[start,end],utf8:[Buffer.byteLength(source.slice(0,start)),Buffer.byteLength(source.slice(0,end))]}),inSpan=(start,end)=>allTokens.filter(token=>token.start>=start&&token.end<=end).map(token=>({...token}));
 for(let at=0;at+5<tokens.length;at++){
  const selected=tokens.slice(at,at+6);if(selected[0].type!=='ident'||selected[0].text!=='crate'||selected[1].text!=='::'||selected[2].type!=='ident'||selected[2].text!=='translation_core'||selected[3].text!=='::'||selected[4].type!=='ident'||!operations.includes(selected[4].text)||selected[5].text!=='('||['::','#','.'].includes(tokens[at-1]?.text))continue;
  const stack=[')'];let end=at+6;
  for(;end<tokens.length;end++){
   const token=tokens[end];if(token.type!=='punct')continue;
   if(Object.hasOwn(closing,token.text))stack.push(closing[token.text]);
   else if([')',']','}'].includes(token.text)){assert.equal(token.text,stack.pop(),'balanced complete qualified-call argument groups');if(!stack.length)break;}
  }
  assert.ok(end<tokens.length&&tokens[end].text===')','complete qualified call closes');
  const start=selected[0].start,stop=tokens[end].end,calleeEnd=selected[4].end,argsStart=selected[5].end,argsEnd=tokens[end].start,owner=items.find(item=>item.term==='fn'&&item.start<=start&&item.end>=stop);
  assert.ok(owner,'current qualified call belongs to its complete ordinary function source');
  const call={operation:selected[4].text,span:span(start,stop),source:source.slice(start,stop),calleeSpan:span(start,calleeEnd),calleeSource:source.slice(start,calleeEnd),calleeTokens:inSpan(start,calleeEnd),argumentSpan:span(argsStart,argsEnd),argumentSource:source.slice(argsStart,argsEnd),argumentTokens:inSpan(argsStart,argsEnd),owner:{name:owner.name,term:owner.term,span:span(owner.start,owner.end)}};
  for(const token of [...call.calleeTokens,...call.argumentTokens])assert.equal(source.slice(token.start,token.end),token.text);calls.push(call);
 }
 return {schema:'qualified-core-call-source-census-v1',syntaxOnly:true,semanticAdmission:false,source,meta,canonical,reparsed,reconstructed,calls};
}
