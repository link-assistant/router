import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {types} from 'node:util';
// Complete raw source/CST chunk delivery; ordinary observer DATA grants nothing.
import {emitOpaqueAdoptionEvent,beginOpaqueAdoptionStream} from './opaque-production-adoption-20261101-view.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {forwardFailureField as field} from './forward-output-ownership-20261101-failure.mjs';
const CHUNK=65536,SOURCE_LIMIT=2097152;
const fail=message=>{throw TypeError('Opaque complete source delivery: '+message);};
export function opaqueFailureData(error){const name=field(error,'name'),message=field(error,'message');return {name:typeof name==='string'?name:typeof error,message:typeof message==='string'?message:typeof error==='string'?error:'non-Error thrown value',thrownKind:typeof error,primitive:error===null||!['object','function','symbol','bigint'].includes(typeof error)?error:null,sourceAuthority:false,semanticAuthority:false};}
export function emitOpaqueText(handle,coordinate,source){
 if(typeof source!=='string')fail('complete primitive source required');const stream=beginOpaqueAdoptionStream(handle);let part=0;
 for(let at=0;at<source.length||at===0;){let end=Math.min(at+CHUNK,source.length);if(end<source.length&&source.charCodeAt(end-1)>=0xd800&&source.charCodeAt(end-1)<=0xdbff&&source.charCodeAt(end)>=0xdc00&&source.charCodeAt(end)<=0xdfff)end--;const text=source.slice(at,end);emitOpaqueAdoptionEvent(handle,{...coordinate,kind:'complete-source-chunk',stream,part:part++,offset:at,totalUtf16Units:source.length,source:text,final:end===source.length,sourceAuthority:false,semanticAuthority:false});if(end===source.length)break;at=end;}
}
export function emitOpaqueSourcePair(handle,{path,phase,before,after,language='Rust'}){
 // Raw bytes/text are delivered even when the original full CST refuses size.
 for(const [role,source]of [['before',before],['after',after],['inverse',before]])emitOpaqueText(handle,{path,phase,language,role},source);
 if(before.length>SOURCE_LIMIT||after.length>SOURCE_LIMIT){const source=before.length>SOURCE_LIMIT?before:after;let refused=false,diagnostic;try{transportConcreteSyntaxSource(source,{language});}catch(error){if(field(error,'message')!=='Concrete syntax meta: source requires bounded primitive text')return withCompleteSourceClosingFence(()=>{throw error;},[()=>emitOpaqueStructuredData(handle,{path,phase,language,role:'complete-CST-operation-hard-refusal'},opaqueFailureData(error))]);refused=true;diagnostic=opaqueFailureData(error);}if(!refused)fail('original whole-CST source guard unexpectedly admitted larger input');emitOpaqueAdoptionEvent(handle,{kind:'complete-source-cst-refusal',path,phase,language,diagnostic,completeRawSourcesDelivered:true,cstProduced:false,originalSourceLimit:SOURCE_LIMIT,sourceAuthority:false,semanticAuthority:false});return {cstProduced:false};}
 let history;try{history=transportConcreteSourceEquations([{before,after,language}])[0];}catch(error){if(!isOpaqueCstResourceRefusal(error))return withCompleteSourceClosingFence(()=>{throw error;},[()=>emitOpaqueStructuredData(handle,{path,phase,language,role:'complete-CST-operation-hard-refusal'},opaqueFailureData(error))]);emitOpaqueStructuredData(handle,{path,phase,language,role:'actual-complete-CST-resource-refusal'},opaqueFailureData(error));return {cstProduced:false};}if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.map(row=>row.phase).join(',')!=='language,repository')fail('full original source/CST/two-phase inverse differs');
 emitOpaqueText(handle,{path,phase,language,role:'beforeMeta'},history.beforeMeta);emitOpaqueText(handle,{path,phase,language,role:'afterMeta'},history.afterMeta);emitOpaqueStructuredData(handle,{path,phase,language,role:'complete-source-equation-trace'},{trace:history.trace,completeInverse:true,cstProduced:true,sourceAuthority:false,semanticAuthority:false});return {cstProduced:true};
}

// JSON is transported in bounded literal pieces, not an unbounded stringify.
// This is serialization of DATA only; its chunks cannot register a source view.
export function emitOpaqueStructuredData(handle,coordinate,value){
 const active=new Set(),stream=beginOpaqueAdoptionStream(handle);let part=0,offset=0,pending='';
 const flush=final=>{while(pending.length&&(final||pending.length>=CHUNK)){let end=Math.min(CHUNK,pending.length);if(end<pending.length&&pending.charCodeAt(end-1)>=0xd800&&pending.charCodeAt(end-1)<=0xdbff&&pending.charCodeAt(end)>=0xdc00&&pending.charCodeAt(end)<=0xdfff)end--;const text=pending.slice(0,end);emitOpaqueAdoptionEvent(handle,{...coordinate,kind:'complete-data-json-chunk',stream,part:part++,offset,source:text,sourceAuthority:false,semanticAuthority:false});offset+=text.length;pending=pending.slice(end);}};
 const send=text=>{pending+=text;flush(false);};
 function quoted(source){send('"');for(let at=0;at<source.length;){let end=Math.min(at+CHUNK,source.length);if(end<source.length&&source.charCodeAt(end-1)>=0xd800&&source.charCodeAt(end-1)<=0xdbff&&source.charCodeAt(end)>=0xdc00&&source.charCodeAt(end)<=0xdfff)end--;send(JSON.stringify(source.slice(at,end)).slice(1,-1));at=end;}send('"');}
 function visit(item,array=false){
  if(item===undefined){send('null');return;}if(item===null||typeof item==='boolean'){send(String(item));return;}if(typeof item==='number'){if(!Number.isFinite(item))fail('finite actual metadata DATA required');send(JSON.stringify(item));return;}if(typeof item==='string'){quoted(item);return;}
  if(!item||typeof item!=='object'||types.isProxy(item)||active.has(item))fail('acyclic ordinary actual metadata DATA required');const proto=Object.getPrototypeOf(item);if(proto!==Object.prototype&&proto!==null&&proto!==Array.prototype)fail('ordinary actual metadata prototype required');active.add(item);const list=Array.isArray(item),names=Reflect.ownKeys(item);send(list?'[':'{');let count=0;
  for(const key of names){if(list&&key==='length')continue;const field=Object.getOwnPropertyDescriptor(item,key);if(typeof key!=='string'||!field||!Object.hasOwn(field,'value'))fail('own actual metadata without accessors required');if(!list&&(!field.enumerable||field.value===undefined))continue;if(list&&String(count)!==key)fail('dense actual metadata array required');if(count++)send(',');if(!list){quoted(key);send(':');}visit(field.value,list);}
  if(list&&count!==Object.getOwnPropertyDescriptor(item,'length')?.value)fail('dense complete actual metadata array required');send(list?']':'}');active.delete(item);
 }
 visit(value);flush(true);emitOpaqueAdoptionEvent(handle,{...coordinate,kind:'complete-data-json-end',stream,chunks:part,totalUtf16Units:offset,complete:true,sourceAuthority:false,semanticAuthority:false});
}

const CST_REFUSALS=new Set(['Opaque production source equation refused changed complete source','Concrete syntax meta: source requires bounded primitive text','Concrete syntax meta: UTF8 byte budget exceeded','Concrete syntax meta: serialized budget exceeded','Concrete syntax meta: serialized CST requires bounded primitive text','Private parser execution: bounded primitive source required','Private parser execution: batch aggregate source budget','Independent parser SHA256 requires bounded primitive text','Independent parser SHA256 byte budget']);
export function isOpaqueCstResourceRefusal(error){return CST_REFUSALS.has(field(error,'message'));}
export function isOpaqueCandidateRefusal(error){const message=field(error,'message');return (isOpaqueCstResourceRefusal(error)||typeof message==='string'&&['Owned JSON field adoption: ','Primitive Option method adoption: ','Primitive Option callback method adoption: ','Text method adoption: ','Local closure candidate: ','Actual dynamic output adoption: ','Layered core source adoption: ','Layered core/format source adoption: '].some(prefix=>message.startsWith(prefix)));}
