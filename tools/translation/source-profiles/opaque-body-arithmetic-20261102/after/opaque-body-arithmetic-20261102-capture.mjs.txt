// Invocation-local observations from actual complete compiler calls. DATA only.
import {inspectOpaqueBodyArithmetic,inspectOpaqueBodyArithmeticWithContext} from './opaque-body-arithmetic-20261102.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Complete corpus inverse capture: '+message);};
const MiB=1048576,LIMIT=512*MiB;
function census(meta){
 const key=row=>JSON.stringify([row.source??row.file,row.name,row.term??'fn',row.kind??null]);
 if(!Array.isArray(meta.executable)||!Array.isArray(meta.refused)||!Array.isArray(meta.unloweredItems))fail('complete actual project admission census required');
 const value={executable:meta.executable.map(key).sort(),refused:meta.refused.map(key).sort(),unlowered:meta.unloweredItems.map(key).sort(),methods:(meta.checkedMethods??[]).map(key).sort(),generatedMethods:(meta.checkedGeneratedMethods??[]).map(key).sort()};accountData(value);return value;
}
function captureProject(configuration,edits,originalContext=null){
 const original=new Map(),adopted=new Map(),targets={},streams=new Map();let origin=null,admission=null,keptBytes=0,keptUnits=0,originalBytes=0,adoptedBytes=0,events=0;
 function room(bytes,units){if(!Number.isSafeInteger(bytes)||!Number.isSafeInteger(units)||keptBytes+bytes>LIMIT||keptUnits+units>LIMIT)fail('complete retained plus transient string occurrence bound');}
 function retain(value){const bytes=Buffer.byteLength(value);room(bytes,value.length);keptBytes+=bytes;keptUnits+=value.length;return value;}
 function save(map,path,source){const bytes=Buffer.byteLength(source),total=(map===original?originalBytes:adoptedBytes)+bytes;if(map.has(path)||map.size>=20000||bytes>8*MiB||total>64*MiB)fail('unique complete bounded original/adopted native source required');map.set(path,retain(source));if(map===original)originalBytes=total;else adoptedBytes=total;}
 function finish(event,row){
  room(row.bytes,row.units);const text=row.parts.join('');row.parts.length=0;streams.delete(event.stream);keptBytes-=row.bytes;keptUnits-=row.units;
  if(row.kind==='original')save(original,event.path,text);
  else if(row.kind==='adopted')save(adopted,event.path,text);
  else if(row.kind==='target'){if(Object.hasOwn(targets,event.language))fail('one whole actual target per language required');targets[event.language]=retain(text);}
  else{
   room(Buffer.byteLength(text)*2,text.length*2);const value=JSON.parse(text);
   if(row.kind==='origin'){if(origin||value.semanticAuthority!==false||value.sourceAuthority!==false||!Array.isArray(value.cells))fail('one full genuine constant-origin record required');const counts=accountData(value);room(counts.utf8Bytes,counts.utf16Units);keptBytes+=counts.utf8Bytes;keptUnits+=counts.utf16Units;origin=value;}
   else{if(value.index!==0||typeof value.source!=='string')fail('complete actual metadata root field required');room(Buffer.byteLength(text)+Buffer.byteLength(value.source)*2,text.length+value.source.length*2);const root=JSON.parse(value.source);if(admission)fail('one complete actual admission census required');admission=census(root);const counts=accountData(admission);room(Buffer.byteLength(text)+Buffer.byteLength(value.source)*2+counts.utf8Bytes,text.length+value.source.length*2+counts.utf16Units);keptBytes+=counts.utf8Bytes;keptUnits+=counts.utf16Units;}
  }
 }
 function consume(event){
  events++;let kind=null,maximum=8*MiB;
  if(event.kind==='complete-source-chunk'){
   if(event.phase==='complete-original-corpus'&&event.role==='before'&&event.language==='Rust')kind='original';
   else if(event.phase==='complete-original-to-final-adopted-corpus'&&event.role==='after'&&event.language==='Rust')kind='adopted';
   else if(event.phase==='adopted-project'&&event.role==='after'&&['JavaScript','TypeScript'].includes(event.language)){kind='target';maximum=8*MiB;}
  }else if(event.phase==='adopted-project'&&['complete-data-json-chunk','complete-data-json-end'].includes(event.kind)){
   if(event.role==='complete-genuine-constant-index-origin-data'){kind='origin';maximum=33*MiB;}
   else if(event.role==='complete-original-project-metadata-field'){
    // Only the canonical root field carries the admission lists. Components
    // are still fully checked/delivered by the real storage producer.
    if(streams.has(event.stream)||event.kind==='complete-data-json-chunk'&&event.part===0&&/"index":0,/u.test(event.source)){kind='census';maximum=144*MiB;}
   }
  }
  if(!kind)return null;let row=streams.get(event.stream);
  if(!row){if(event.kind==='complete-data-json-end'||event.part!==0||event.offset!==0)fail('whole actual source stream start required');row={kind,path:event.path,phase:event.phase,role:event.role,language:event.language,part:0,units:0,bytes:0,parts:[],maximum};streams.set(event.stream,row);}
  if(row.kind!==kind||row.path!==event.path||row.phase!==event.phase||row.role!==event.role||row.language!==event.language)fail('whole source stream coordinates changed');
  if(event.kind==='complete-data-json-end'){if(event.chunks!==row.part||event.totalUtf16Units!==row.units||event.complete!==true)fail('complete actual JSON stream terminator required');finish(event,row);return null;}
  if(event.part!==row.part++||event.offset!==row.units||typeof event.source!=='string')fail('actual source chunk sequence differs');const bytes=Buffer.byteLength(event.source);if(row.bytes+bytes>row.maximum)fail('original complete field/target representation domain exceeded');room(bytes,event.source.length);row.parts.push(event.source);row.bytes+=bytes;row.units+=event.source.length;keptBytes+=bytes;keptUnits+=event.source.length;
  if(event.kind==='complete-source-chunk'&&event.final){if(event.totalUtf16Units!==row.units)fail('whole actual source length differs');finish(event,row);}return null;
 }
 try{
  const report=originalContext===null?inspectOpaqueBodyArithmetic(configuration,edits,consume):inspectOpaqueBodyArithmeticWithContext(originalContext,configuration,edits,consume);
  if(streams.size||original.size!==report.sourceFiles||adopted.size!==report.sourceFiles||!origin||!admission||typeof targets.JavaScript!=='string'||typeof targets.TypeScript!=='string'||!report.adoptedAttempt.metadataProduced)fail('complete actual native universe/adopted targets/census/origins absent');
  if(origin.javascript!==targets.JavaScript||origin.typescript!==targets.TypeScript)fail('genuine complete origin/target relation differs');
  return {originalSources:original,adoptedSources:adopted,javascript:targets.JavaScript,typescript:targets.TypeScript,constantIndexOrigins:origin,census:admission,report,accounting:{retainedStringUtf8Occurrences:keptBytes,retainedStringUtf16Occurrences:keptUnits,events,rssQualified:false},sourceAuthority:false,semanticAuthority:false};
 }catch(error){original.clear();adopted.clear();streams.clear();origin=null;admission=null;throw error;}
}

export function captureOpaqueBodyArithmeticProject(configuration,edits){return captureProject(configuration,edits);}
export function captureOpaqueBodyArithmeticProjectWithContext(original,configuration,edits){return captureProject(configuration,edits,original);}
