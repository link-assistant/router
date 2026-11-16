// Invocation-local lexical source DATA; family callers retain their own census.
const fail=message=>{throw new TypeError('Chronological local source: '+message);};
export function createChronologicalLocalSource(rows,parameters,{readOperand,acceptResult,initializerSizes,initializerStart=null,initializerEnd=null,aliasKind,resultKind}){
 if(rows.length>200000)fail('complete local token bound');const frames=[new Map()],activeFrames=new Set(frames),pending=new Map(),initializers=new Map();let cursor=0,last=-1,cells=0;
 const tick=()=>{if(++cells>200000)fail('complete local source cell bound');};
 function found(name){tick();for(let at=frames.length-1;at>=0;at--){tick();if(frames[at].has(name))return frames[at].get(name);}return parameters.has(name)?{kind:parameters.get(name),evidence:null}:null;}
 const bindings={has(name){return Boolean(found(name)?.kind);},get(name){return found(name)?.kind;},[Symbol.iterator](){
  const visible=new Map();for(const [name,kind]of parameters){tick();visible.set(name,kind);}for(const frame of frames)for(const [name,value]of frame){tick();if(value.kind)visible.set(name,value.kind);else visible.delete(name);}return visible[Symbol.iterator]();
 }};
 function enterLocal(at){
  const binding=localAliasDeclaration(rows,at);if(!binding)fail('complete ordinary local declaration required');const name=binding.name,frame=frames.at(-1);frame.set(name,{kind:null,evidence:null});if(binding.mutable)return;
  const start=initializerStart?initializerStart(at,rows):binding.initializerStart;if(!Number.isSafeInteger(start)||start<=at+2||start>=rows.length)return;const first=rows[start];let end=null;
  if(initializerEnd){const selected=initializerEnd(start,rows,tick);if(selected!==null){if(!Number.isSafeInteger(selected)||selected<=start||selected-start>256||rows[selected]?.text!==';')fail('bounded complete initializer terminator required');end=selected;}}else{
  for(const size of initializerSizes){tick();if(!Number.isSafeInteger(size)||size<1||size>256)fail('bounded initializer selection size required');if(rows[start+size]?.text===';'){end=start+size;break;}}
  }
  const declaration={name,frame,start:first.start,declarationStart:rows[at].start};initializers.set(first.start,declaration);
  if(end===null)return;const value=readOperand(rows.slice(start,end),bindings);if(!value)return;
  const evidence=Object.freeze({kind:aliasKind,name,domain:value.kind,originBinding:value.binding,bridge:value.bridge??null,span:Object.freeze([rows[at].start,rows[end].end]),initializerSpan:Object.freeze([first.start,rows[end-1].end]),sourceAuthority:false,semanticAuthority:false});
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
  // Only a family-selected whole direct initializer can schedule new DATA.
  // Accepting a domain here is never a type/owner/executable permit.
  selectedCall(event){
   tick();const {span,terminator,operation}=event,original=initializers.get(span[0]);if(!original||terminator?.text!==';'||terminator.start<span[1]||typeof operation!=='string'||operation.length>160)return;const returnsKind=acceptResult(event);if(typeof returnsKind!=='string'||!returnsKind||returnsKind.length>160)return;
   const evidence=Object.freeze({kind:resultKind,name:original.name,domain:returnsKind,operation,span:Object.freeze([original.declarationStart,terminator.end]),initializerSpan:Object.freeze([span[0],span[1]]),sourceAuthority:false,semanticAuthority:false,originalTraitPermission:false});pending.set(terminator.start,{frame:original.frame,name:original.name,kind:returnsKind,evidence});
  },
 };
}

import {localAliasDeclaration} from './local-alias-binding-source.mjs';
