// Invocation-local lexical source DATA; family callers retain their own census.
const fail=message=>{throw new TypeError('Chronological local source: '+message);};
function createScopedChronologicalLocalSource(rows,parameters,{readOperand,acceptResult,initializerSizes,initializerStart=null,initializerEnd=null,aliasKind,resultKind,opaqueRegions=[]}){
 if(rows.length>200000)fail('complete local token bound');const opaqueTokenEnds=opaqueSourceTokenEnds(rows,opaqueRegions),frames=[new Map()],activeFrames=new Set(frames),pending=new Map(),initializers=new Map();let cursor=0,last=-1,cells=0;
 const tick=()=>{if(++cells>200000)fail('complete local source cell bound');};
 function found(name){tick();for(let at=frames.length-1;at>=0;at--){tick();if(frames[at].has(name))return frames[at].get(name);}return parameters.has(name)?{kind:parameters.get(name),evidence:null}:null;}
 const bindings={has(name){return Boolean(found(name)?.kind);},get(name){return found(name)?.kind;},[Symbol.iterator](){
  const visible=new Map();for(const [name,kind]of parameters){tick();visible.set(name,kind);}for(const frame of frames)for(const [name,value]of frame){tick();if(value.kind)visible.set(name,value.kind);else visible.delete(name);}return visible[Symbol.iterator]();
 }};
 function enterLocal(at){
  const binding=localAliasDeclaration(rows,at);if(!binding)fail('complete ordinary local declaration required');const name=binding.name,frame=frames.at(-1);if(binding.mutable)fail('mutable source binding requires a separate scoped role rule');
  const start=initializerStart?initializerStart(at,rows):binding.initializerStart;if(!Number.isSafeInteger(start)||start<=at+2||start>=rows.length)fail('complete original initializer interval required');const first=rows[start];let end=null;
  if(initializerEnd){const selected=initializerEnd(start,rows,tick,{opaqueTokenEnds});if(selected!==null){if(!Number.isSafeInteger(selected)||selected<=start||selected-start>256||rows[selected]?.text!==';')fail('bounded complete initializer terminator required');end=selected;}}else{
  for(const size of initializerSizes){tick();if(!Number.isSafeInteger(size)||size<1||size>256)fail('bounded initializer selection size required');if(rows[start+size]?.text===';'){end=start+size;break;}}
  }
  if(end===null)fail('bounded original initializer terminator required');const declaration={name,frame,start:first.start,declarationStart:rows[at].start};initializers.set(first.start,declaration);
  // Rust resolves the initializer BEFORE the new binding enters scope. Even
  // an unknown result must hide the old binding after the actual terminator.
  const binder=Object.freeze({kind:'local',name,roleKnown:false,declarationSpan:Object.freeze([rows[at].start,rows[end].end]),initializerSpan:Object.freeze([first.start,rows[end-1].end]),sourceAuthority:false,semanticAuthority:false});pending.set(rows[end].start,{frame,name,kind:null,evidence:null,binder});const value=readOperand(rows.slice(start,end),bindings);if(!value)return;
  const evidence=Object.freeze({kind:aliasKind,name,domain:value.kind,originBinding:value.binding,bridge:value.bridge??null,span:Object.freeze([rows[at].start,rows[end].end]),initializerSpan:Object.freeze([first.start,rows[end-1].end]),sourceAuthority:false,semanticAuthority:false});
  pending.set(rows[end].start,{frame,name,kind:value.kind,evidence,binder:Object.freeze({...binder,roleKnown:true})});
 }

 return {
  at(position){
   if(!Number.isSafeInteger(position)||position<last)fail('monotonic original call source position required');last=position;
   while(cursor<rows.length&&rows[cursor].start<position){tick();const excluded=opaqueTokenEnds.get(cursor);if(excluded!==undefined){if(position<rows[excluded-1].end)fail('outer local source query lies inside an excluded callback scope');cursor=excluded;continue;}const row=rows[cursor];
    if(row.text==='{'){if(frames.length>=256)fail('complete local lexical depth bound');const frame=new Map();frames.push(frame);activeFrames.add(frame);}
    else if(row.text==='}'){if(frames.length<=1)fail('original local lexical group differs');activeFrames.delete(frames.pop());}
    else if(row.text==='let')enterLocal(cursor);
    const selected=pending.get(row.start);if(selected){if(!activeFrames.has(selected.frame))fail('local initializer escaped its original source scope');selected.frame.set(selected.name,{kind:selected.kind,evidence:selected.evidence,binder:selected.binder});pending.delete(row.start);}cursor++;
   }return bindings;
  },
  evidence(name){return typeof name==='string'?found(name)?.evidence??null:null;},
  // Only a family-selected whole direct initializer can schedule new DATA.
  // Accepting a domain here is never a type/owner/executable permit.
  selectedCall(event){
   tick();const {span,terminator,operation}=event,original=initializers.get(span[0]);if(!original||terminator?.text!==';'||terminator.start<span[1]||typeof operation!=='string'||operation.length>160)return;const returnsKind=acceptResult(event);if(typeof returnsKind!=='string'||!returnsKind||returnsKind.length>160)return;
   const evidence=Object.freeze({kind:resultKind,name:original.name,domain:returnsKind,operation,span:Object.freeze([original.declarationStart,terminator.end]),initializerSpan:Object.freeze([span[0],span[1]]),sourceAuthority:false,semanticAuthority:false,originalTraitPermission:false});pending.set(terminator.start,{frame:original.frame,name:original.name,kind:returnsKind,evidence});
  },
  visibleEntries(){const visible=new Map();for(const [name,kind]of parameters){tick();visible.set(name,{kind,evidence:null,binder:{kind:'parameter',name,roleKnown:typeof kind==='string',sourceAuthority:false,semanticAuthority:false}});}for(const frame of frames)for(const [name,value]of frame){tick();visible.set(name,{...value,binder:value.binder??{kind:'local',name,roleKnown:typeof value.kind==='string',declarationSpan:value.evidence?.span??null,initializerSpan:value.evidence?.initializerSpan??null,sourceAuthority:false,semanticAuthority:false}});}return [...visible];},
  close(){for(const frame of frames)frame.clear();frames.length=0;activeFrames.clear();pending.clear();initializers.clear();},
 };
}

import {localAliasDeclaration} from './local-alias-binding-source.mjs';

import {opaqueSourceTokenEnds} from './opaque-source-token-regions.mjs';

// The complete original chronological source above is copied and retained in
// the source-history archive. Only this opt-in source-DATA path uses it.
import {rustTokens} from './rust-structure.mjs';
import {topLevelRustItems} from './rust-item-boundaries.mjs';
import {readLocalAliasInitializer} from './local-alias-written-source.mjs';
import {coreCarrierCallbackSourceRegions} from './core-carrier-callback-source-regions.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {types} from 'node:util';
import {scopedCarrierWrittenRole,scopedCarrierGroupEnd,scopedCarrierInitializerEnd,readScopedCarrierOperand} from './scoped-carrier-source-20261101-operands.mjs';
import {withScopedCarrierSourceInputs} from './scoped-carrier-source-20261101-source-history.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const sourceIdent=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text)&&!['_','mut','ref','self','Self'].includes(row.text);
const freezeScoped=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeScoped(child);Object.freeze(value);}return value;};
// Native own-DATA descriptors are captured once. Per-read work is bounded by
// two root fields and the two-element coordinate array, never source length.
function capturedInputGuard(input,data){
 const keys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,extensible=Object.isExtensible,hasOwn=Object.hasOwn,equal=Object.is,isProxy=types.isProxy,isArray=Array.isArray;
 let root=input,rootPrototype=null,rootKeys=[],rootFields=[],rootExtensible=false,span=null,spanPrototype=null,spanKeys=[],spanFields=[],spanExtensible=false,sourceField=null,spanField=null;
 const unchanged=()=>{if(Reflect.ownKeys!==keys||Object.getOwnPropertyDescriptor!==descriptor||Object.getPrototypeOf!==prototype||Object.isExtensible!==extensible||Object.hasOwn!==hasOwn||Object.is!==equal||types.isProxy!==isProxy||Array.isArray!==isArray)fail('Scoped source input invalidated: native descriptor operations changed');};
 const ordinary=value=>{if(!value||typeof value!=='object'||isProxy(value))fail('Scoped source input invalidated: ordinary nonproxy DATA required');};
 const capture=(object,names)=>names.map(name=>{const field=descriptor(object,name);if(!field||!hasOwn(field,'value'))fail('Scoped source input invalidated: own DATA descriptor required');return field;});
 const sameFields=(object,names,fields)=>{const current=keys(object);if(current.length!==names.length)fail('Scoped source input invalidated: own key census changed');for(let index=0;index<current.length;index++)if(!equal(current[index],names[index]))fail('Scoped source input invalidated: own key order changed');for(let at=0;at<names.length;at++){const field=descriptor(object,names[at]),prior=fields[at];if(!field||!hasOwn(field,'value')||!equal(field.value,prior.value)||field.enumerable!==prior.enumerable||field.configurable!==prior.configurable||field.writable!==prior.writable)fail('Scoped source input invalidated: exact DATA descriptor/value changed');}};
 unchanged();ordinary(root);rootPrototype=prototype(root);if(rootPrototype!==Object.prototype)fail('Scoped source input invalidated: ordinary root prototype required');rootKeys=keys(root);if(rootKeys.length!==2||!rootKeys.includes('source')||!rootKeys.includes('functionSpan'))fail('Scoped source input invalidated: exact root fields required');rootFields=capture(root,rootKeys);rootExtensible=extensible(root);sourceField=descriptor(root,'source');spanField=descriptor(root,'functionSpan');if(!equal(sourceField.value,data.source))fail('Scoped source input invalidated during initial source validation');span=spanField.value;ordinary(span);spanPrototype=prototype(span);if(!isArray(span)||spanPrototype!==Array.prototype)fail('Scoped source input invalidated: ordinary coordinate array required');spanKeys=keys(span);if(spanKeys.length!==3||spanKeys[0]!=='0'||spanKeys[1]!=='1'||spanKeys[2]!=='length')fail('Scoped source input invalidated: dense exact coordinates required');spanFields=capture(span,spanKeys);spanExtensible=extensible(span);if(!equal(spanFields[0].value,data.functionSpan[0])||!equal(spanFields[1].value,data.functionSpan[1])||spanFields[2].value!==2)fail('Scoped source input invalidated during initial coordinate validation');
 return {validate(){unchanged();ordinary(root);if(prototype(root)!==rootPrototype||extensible(root)!==rootExtensible)fail('Scoped source input invalidated: root structure changed');sameFields(root,rootKeys,rootFields);ordinary(span);if(prototype(span)!==spanPrototype||extensible(span)!==spanExtensible)fail('Scoped source input invalidated: coordinate structure changed');sameFields(span,spanKeys,spanFields);},clear(){root=null;span=null;rootPrototype=null;spanPrototype=null;rootKeys.length=0;spanKeys.length=0;rootFields.length=0;spanFields.length=0;sourceField=null;spanField=null;input=null;data=null;}};
}
function functionTokens(source,span){
 const rows=rustTokens(source).filter(row=>row.type!=='comment');if(rows.length>200000)fail('unchanged full source token bound');const found=[];let work=0;
 function visit(tokens,depth=0){if(depth>32)fail('bounded original module item depth');for(const item of topLevelRustItems(tokens)){if((work+=item.tokens.length)>200000)fail('complete original function item census bound');const words=item.tokens,index=words.findIndex(row=>row.text==='fn'||row.text==='mod');if(index<0)continue;if(words[index].text==='fn'){if(item.start===span[0]&&item.end===span[1])found.push(words);continue;}const open=words.findIndex((row,at)=>at>index&&row.text==='{');if(open>=0&&scopedCarrierGroupEnd(words,open)===words.length-1)visit(words.slice(open+1,-1),depth+1);}}
 visit(rows);if(found.length!==1)fail('one actual complete original function source interval required');return found[0];
}
function sourceInputs(input){
 accountData(input);const data=copyMetadata(input);if(!data||Object.keys(data).sort().join(',')!=='functionSpan,source'||typeof data.source!=='string'||/\p{Surrogate}/u.test(data.source)||Buffer.byteLength(data.source)>2097152||!Array.isArray(data.functionSpan)||data.functionSpan.length!==2||data.functionSpan.some(value=>!Number.isSafeInteger(value)||value<0)||data.functionSpan[1]<=data.functionSpan[0]||data.functionSpan[1]>data.source.length)fail('bounded whole original source and actual function interval required');
 const tokens=functionTokens(data.source,data.functionSpan),fn=tokens.findIndex(row=>row.text==='fn');if(tokens[fn+2]?.text!=='('||tokens.slice(0,fn).some(row=>['unsafe','async','const','extern'].includes(row.text)))fail('ordinary nongeneric synchronous function source required');const end=scopedCarrierGroupEnd(tokens,fn+2);if(end===null)fail('complete source parameter list required');let open=end+1;for(;open<tokens.length&&tokens[open].text!=='{';open++);if(scopedCarrierGroupEnd(tokens,open)!==tokens.length-1)fail('complete original function body required');
 const parameters=new Map(),parameterSpans=new Map();let start=fn+3;for(let at=start;at<=end;at++){if(at===end||tokens[at].text===','){if(at>start){const part=tokens.slice(start,at);if(!sourceIdent(part[0])||part[1]?.text!==':'||parameters.has(part[0].text))fail('distinct immutable ordinary source parameters required');parameters.set(part[0].text,scopedCarrierWrittenRole(part.slice(2)));parameterSpans.set(part[0].text,[part[0].start,part.at(-1).end]);}else if(at!==end)fail('dense ordinary parameter list required');start=at+1;}else if(['(','[','{'].includes(tokens[at].text)){const last=scopedCarrierGroupEnd(tokens,at);if(last===null||last>=end)fail('original parameter delimiter differs');at=last;}}
 return {data,tokens,parameters,parameterSpans,rows:tokens.slice(open+1,-1)};
}
function ordinaryCensus(rows,parameters,opaqueRegions){
 const ends=opaqueSourceTokenEnds(rows,opaqueRegions),frames=[new Set(parameters.keys())],reserved=new Set(['crate','std','core','self','Self','Option','Some','None','Result','Ok','Err','translation_core']);let work=0,count=0;
 for(let at=0;at<rows.length;at++){if(++work>200000)fail('complete scoped binder census bound');const excluded=ends.get(at);if(excluded!==undefined){at=excluded-1;continue;}const word=rows[at].text;if(word==='{'){if(frames.length>=256)fail('original scoped binder depth bound');frames.push(new Set());}else if(word==='}'){if(frames.length===1)fail('original scoped body delimiters differ');frames.pop();}else if(word==='let'){const declaration=localAliasDeclaration(rows,at);if(!declaration||declaration.mutable||reserved.has(declaration.name))fail('pattern/mutable/namespace binding needs a separate original source rule');if(++count>4096)fail('unchanged complete local binding count bound');frames.at(-1).add(declaration.name);}else if(['for','while','loop','match','fn','mod','use','extern','macro_rules','macro','unsafe','async','await','yield','|','||'].includes(word))fail('callback/pattern/control/producer scope remains unsupported outside its complete opaque source region');}
 if(frames.length!==1)fail('whole scoped source body differs');
}
export function withScopedCarrierSource(input,run){
 requireSynchronousSourceCallback(run);return withScopedCarrierSourceInputs(()=>withSourceFailureOperation(()=>{
  let failed=false,sourcePrimary;const validate=operation=>withSourceInputValidation(()=>{if(failed)throw sourcePrimary;try{return operation();}catch(error){failed=true;sourcePrimary=error;throw error;}});
  const captured=validate(()=>sourceInputs(input)),{data,rows,parameters,parameterSpans}=captured,inputGuard=validate(()=>capturedInputGuard(input,data)),regions=validate(()=>coreCarrierCallbackSourceRegions(rows));validate(()=>ordinaryCensus(rows,parameters,regions));let active=true;const tokenStarts=new Set(rows.map(row=>row.start)),budget={cells:0},annotations=new Map();
  const initializerStart=(at,tokens)=>{const selected=readLocalAliasInitializer(tokens,at,scopedCarrierWrittenRole);if(selected){if(selected.domain!==null)annotations.set(tokens[selected.start].start,selected.domain);return selected.start;}const binding=localAliasDeclaration(tokens,at);if(!binding||binding.mutable)return null;for(let end=binding.next+1;end<tokens.length&&end-binding.next<=65;end++){if(tokens[end].text==='=')return end+1;if([';','{','}'].includes(tokens[end].text))return null;}return null;};
  const ledger=createScopedChronologicalLocalSource(rows,parameters,{initializerStart,initializerEnd:scopedCarrierInitializerEnd,initializerSizes:[1,5],readOperand:(part,bindings)=>{const wanted=annotations.get(part[0]?.start)??null,value=readScopedCarrierOperand(part,bindings,{wanted,source:data.source,budget});return value&&(!wanted||wanted===value.kind)?value:null;},acceptResult:()=>null,aliasKind:'scoped-original-carrier-source-role',resultKind:'unissued-source-result',opaqueRegions:regions});
  const current=()=>{if(!active)fail('synchronous source role ledger expired');inputGuard.validate();};
  const resultAt=position=>{current();if(!Number.isSafeInteger(position)||!tokenStarts.has(position))fail('actual original body token position required');ledger.at(position);const entries=ledger.visibleEntries(),provenance=entries.map(([name,value])=>[name,{...value.binder,...(value.binder.kind==='parameter'?{declarationSpan:parameterSpans.get(name),initializerSpan:null}:{})}]),result={position,bindings:Object.fromEntries(entries.filter(([,value])=>value.kind!==null||value.binder.kind==='parameter').map(([name,value])=>[name,value.kind])),evidence:Object.fromEntries(entries.map(([name,value])=>[name,value.evidence])),provenance:Object.fromEntries(provenance),sourceAuthority:false,semanticAuthority:false,typedCaptureAuthority:false};accountData(result);return freezeScoped(result);};
  const reader=Object.freeze({at:position=>validate(()=>resultAt(position)),operand:(position,span)=>validate(()=>{current();if(!Array.isArray(span)||span.length!==2||span[0]!==position||span.some(value=>!Number.isSafeInteger(value)))fail('actual source operand interval required');const selected=rows.filter(row=>row.start>=span[0]&&row.end<=span[1]);if(!selected.length||selected[0].start!==span[0]||selected.at(-1).end!==span[1])fail('complete original source token interval required');const snapshot=resultAt(position),result=readScopedCarrierOperand(selected,new Map(Object.entries(snapshot.bindings)),{source:data.source,budget});accountData(result);return freezeScoped(result);}),sourceAuthority:false,semanticAuthority:false});
  try{return withCompleteSourceClosingFence(()=>{const result=run(reader);accountData(result);return result;},[()=>validate(current)]);}finally{active=false;ledger.close();inputGuard.clear();tokenStarts.clear();annotations.clear();parameters.clear();parameterSpans.clear();rows.length=0;captured.tokens.length=0;data.source=null;data.functionSpan.length=0;input=null;sourcePrimary=undefined;failed=false;}
 }));
}
