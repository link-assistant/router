// One function's chronological source-selection DATA. No owner/type permit.
import {readConcreteBase64Argument} from './base64-argument-source.mjs';
const fail=message=>{throw new TypeError('Base64 local argument source: '+message);};
export function createBase64LocalArgumentSource(rows,parameters){
 if(!rows.some(row=>row.text==='let'))return {at(){return parameters;},evidence(){return null;},selectedCall(){}};
 if(rows.length>200000)fail('complete local token bound');const frames=[new Map()],activeFrames=new Set(frames),pending=new Map(),initializers=new Map();let cursor=0,last=-1,cells=0;
 const tick=()=>{if(++cells>200000)fail('complete local source cell bound');};
 function found(name){tick();for(let at=frames.length-1;at>=0;at--){tick();if(frames[at].has(name))return frames[at].get(name);}return parameters.has(name)?{kind:parameters.get(name),evidence:null}:null;}
 const bindings={has(name){return Boolean(found(name)?.kind);},get(name){return found(name)?.kind;}};
 function enterLocal(at){
  const name=rows[at+1]?.text,frame=frames.at(-1),equal=rows[at+2];frame.set(name,{kind:null,evidence:null});
  if(equal?.text!=='=')return;const start=at+3,first=rows[start];if(!first)return;let end=null;
  if(rows[start+1]?.text===';')end=start+1;else if(rows[start+5]?.text===';')end=start+5;
  const declaration={name,frame,start:first.start,declarationStart:rows[at].start};initializers.set(first.start,declaration);
  if(end===null)return;const value=readConcreteBase64Argument(rows.slice(start,end),bindings);if(!value)return;
  const evidence=Object.freeze({kind:'complete-immutable-operand-alias',name,domain:value.kind,originBinding:value.binding,bridge:value.bridge??null,span:Object.freeze([rows[at].start,rows[end].end]),initializerSpan:Object.freeze([first.start,rows[end-1].end]),sourceAuthority:false,semanticAuthority:false});
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
  // A selected original native encode call returns the concrete owned text
  // ABI. Only its whole direct immutable initializer may acquire that DATA.
  selectedCall({span,terminator,method,operation}){
   tick();const original=initializers.get(span[0]);if(!original||method!=='encode'||terminator?.text!==';'||terminator.start<span[1]||typeof operation!=='string'||!/^base64_(standard|standard_no_pad|url_no_pad)_encode_(text|bytes|owned_bytes|owned_text|array32)$/u.test(operation))return;
   const evidence=Object.freeze({kind:'complete-selected-native-encode-alias',name:original.name,domain:'owned-text',operation,span:Object.freeze([original.declarationStart,terminator.end]),initializerSpan:Object.freeze([span[0],span[1]]),sourceAuthority:false,semanticAuthority:false,originalTraitPermission:false});pending.set(terminator.start,{frame:original.frame,name:original.name,kind:'owned-text',evidence});
  },
 };
}
