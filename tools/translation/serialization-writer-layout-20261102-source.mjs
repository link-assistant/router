// Complete immutable source substitution DATA; no install or compiler verdict.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const PACKET=new URL('./source-profiles/serialization-writer-layout-20261102/complete-source.json.gz',import.meta.url);
const SHA='b908eeec0260d86f3a64deb25d34e8aac7706bd08130a6c27309d16ec040bf63';
function read(){
 const bytes=fs.readFileSync(PACKET);
 if(bytes.length>1048576||createHash('sha256').update(bytes).digest('hex')!==SHA)throw TypeError('complete pinned serialization writer source packet required');
 return JSON.parse(gunzipSync(bytes,{maxOutputLength:2097152}).toString('utf8'));
}
export function proposeSerializationWriterLayoutSources(input){
 account(input);const sources=copyMetadata(input),packet=read();
 if(!Array.isArray(sources)||sources.length!==packet.rows.length)throw TypeError('all three complete original serialization source rows required');
 const rows=packet.rows.map((row,index)=>{
  const source=sources[index];
  if(!source||Object.keys(source).sort().join(',')!=='path,source'||source.path!==row.path||source.source!==row.before)throw TypeError('exact original serialization source path and bytes required');
  const phase=row.language==='raw-patch'?'repository':'language';
  const run=createRulePipeline(['language','repository'].map(name=>({phase:name,rules:name===phase?[countedLiteralSubstitutionRule(name+':serialization-writer-complete-source',row.before,row.after,1,'complete serialization source occurrence differs')]:[]}))).run(source.source);
  const history=row.language==='raw-patch'?{before:row.before,after:run.value,inverse:row.before,concrete:false}:transportConcreteSourceEquations([{before:row.before,after:run.value,language:row.language}])[0];
  return {path:row.path,before:row.before,after:run.value,inverse:row.before,history,trace:run.trace};
 });
 const files=packet.files.map(row=>({...row,beforePresent:false,
  history:transportConcreteSourceEquations([{before:'',after:row.source,language:'JavaScript'}])[0]}));
 const native=packet.nativeImportEquation;
 const nativeImportHistory=transportConcreteSourceEquations([{before:native.before,after:native.after,language:'JavaScript'}])[0];
 // Read the fixed source packet again; this is DATA pinning, never a verdict cache.
 read();const result={schema:packet.schema,rows,files,nativeImportHistory,verification:'UNRUN',sourceInstalled:false,sourceAuthority:false,semanticAuthority:false};
 account(result);return result;
}
