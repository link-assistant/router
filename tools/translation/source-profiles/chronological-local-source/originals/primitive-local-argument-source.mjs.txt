// One function's chronological source-selection DATA. No owner/type permit.
import {primitiveBitwiseType,primitiveBitwiseLiteral} from './primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Primitive local argument source: '+message);};
export function createPrimitiveLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys())){
 if(!rows.some(row=>row.text==='let')||!primitiveLocalCensus(rows,allParameters))return null;
 if(rows.length>200000)fail('complete local token bound');const frames=[new Map()],activeFrames=new Set(frames),pending=new Map(),initializers=new Map();let cursor=0,last=-1,cells=0;
 const tick=()=>{if(++cells>200000)fail('complete local source cell bound');};
 function found(name){tick();for(let at=frames.length-1;at>=0;at--){tick();if(frames[at].has(name))return frames[at].get(name);}return parameters.has(name)?{kind:parameters.get(name),evidence:null}:null;}
 const bindings={has(name){return Boolean(found(name)?.kind);},get(name){return found(name)?.kind;}};
 function enterLocal(at){
  const name=rows[at+1]?.text,frame=frames.at(-1),equal=rows[at+2];frame.set(name,{kind:null,evidence:null});
  if(equal?.text!=='=')return;const start=at+3,first=rows[start];if(!first)return;let end=null;
  for(const size of [1,2,3])if(rows[start+size]?.text===';'){end=start+size;break;}
  const declaration={name,frame,start:first.start,declarationStart:rows[at].start};initializers.set(first.start,declaration);
  if(end===null)return;const value=readPrimitiveAliasOperand(rows.slice(start,end),bindings);if(!value)return;
  const evidence=Object.freeze({kind:'complete-immutable-primitive-alias',name,domain:value.kind,originBinding:value.binding,bridge:value.bridge??null,span:Object.freeze([rows[at].start,rows[end].end]),initializerSpan:Object.freeze([first.start,rows[end-1].end]),sourceAuthority:false,semanticAuthority:false});
  pending.set(rows[end].start,{frame,name,kind:value.kind,evidence});
 }
 return {
  at(position){
   if(!Number.isSafeInteger(position)||position<last)fail('monotonic original call source position required');last=position;
   while(cursor<rows.length&&rows[cursor].start<position){tick();const row=rows[cursor];
    if(row.text==='{'){if(frames.length>=256)fail('complete local lexical depth bound');const frame=new Map();frames.push(frame);activeFrames.add(frame);}
    else if(row.text==='}'){if(frames.length<=1)fail('original local lexical group differs');activeFrames.delete(frames.pop());}
    else if(row.text==='let')enterLocal(cursor);
    const selected=pending.get(row.start);if(selected){if(!activeFrames.has(selected.frame))fail('local initializer escaped its original source scope');selected.frame.set(selected.name,{kind:selected.kind,evidence:selected.evidence});pending.delete(row.start);}cursor++;
   }return bindings;
  },
  evidence(name){return typeof name==='string'?found(name)?.evidence??null:null;},
  // Only an actual selected call with a concrete primitive return ABI can
  // populate its complete direct initializer. This is not a type permit.
  selectedCall({span,terminator,operation,returnsKind}){
   tick();const original=initializers.get(span[0]);if(!original||!primitiveBitwiseType(returnsKind)||terminator?.text!==';'||terminator.start<span[1]||typeof operation!=='string'||operation.length>160)return;
   const evidence=Object.freeze({kind:'complete-selected-primitive-result-alias',name:original.name,domain:returnsKind,operation,span:Object.freeze([original.declarationStart,terminator.end]),initializerSpan:Object.freeze([span[0],span[1]]),sourceAuthority:false,semanticAuthority:false,originalTraitPermission:false});pending.set(terminator.start,{frame:original.frame,name:original.name,kind:returnsKind,evidence});
  },
 };
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function primitiveLocalCensus(rows,parameters){
 if(rows.length>200000||rows.some(row=>['match','for'].includes(row.text)))return false;const names=new Set(parameters),protectedNames=new Set(['std','core','crate','self','Self','translation_core','translation_integer_core','Some','None','Option',...['u','i'].flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))]);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){const name=rows[at+1],next=rows[at+2];if(!ident(name)||['mut','ref','_'].includes(name.text)||!['=',':'].includes(next?.text)||names.has(name.text)||protectedNames.has(name.text)||++count>4096)return false;names.add(name.text);}return true;
}
export function readPrimitiveAliasOperand(rows,bindings){
 if(rows.length===1&&ident(rows[0])&&primitiveBitwiseType(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length===3&&primitiveBitwiseType(rows[0].text)&&rows[1].text==='::'&&['MIN','MAX'].includes(rows[2].text))return {kind:rows[0].text,binding:null};
 const negative=rows[0]?.text==='-',literal=rows[negative?1:0];if(rows.length!==(negative?2:1)||literal?.type!=='number'||literal.text.length>64)return null;const match=/^([0-9][0-9_]{0,62})([iu](?:8|16|32|64|128))$/u.exec(literal.text);if(!match)return null;const domain=primitiveBitwiseType(match[2]),digits=match[1].replaceAll('_','');if(!domain||negative&&!domain.signed||primitiveBitwiseLiteral(digits+'n',negative,domain.name)===null)return null;return {kind:domain.name,binding:null};
}
