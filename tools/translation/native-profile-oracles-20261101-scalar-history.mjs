// Complete operational successor DATA. SOURCE UNRUN; no native execution permit.
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBoundedTrackedSourceBytes,withBoundedTrackedSourceOperation} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const ARCHIVE='tools/translation/source-profiles/native-profile-oracles-20261101/scalar-integration.json.gz';
const PIN='b2714b6aa8deea9636acb7f038d301cd0b03ec51f83ed2c4ccee10e7f2cf2de6';
const PATHS=Object.freeze([
 'tools/translation/native-profile-oracles-20261101-control.mjs',
 'tools/translation/native-profile-oracles-20261101-materialize.mjs',
 'tools/translation/test/native-profile-oracles-20261101-control.test.mjs',
 'tools/translation/test/native-profile-oracles-20261101-receiving-cases.mjs',
 'tools/translation/native-profile-oracles-20261101-portable-history.mjs',
 'tools/translation/test/native-profile-oracles-20261101-history.test.mjs',
 'tools/translation/test/native-profile-oracles-20261101-json-oracle-history.test.mjs',
]);
const fail=message=>{throw TypeError('Native scalar operational source history: '+message);};
function packet(){
 const bytes=readBoundedTrackedSourceBytes(ROOT,ARCHIVE,{maxBytes:2097152});
 if(createHash('sha256').update(bytes).digest('hex')!==PIN)fail('complete immutable successor archive differs');
 const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(bytes,{maxOutputLength:4194304})));
 accountData(value);
 if(value.schema!=='native-profile-scalar-integration-complete-sources-v1'||!Array.isArray(value.rows)||value.rows.length!==PATHS.length)fail('complete fixed operational source rows required');
 for(const [at,row]of value.rows.entries()){
  if(row.path!==PATHS[at]||row.language!=='JavaScript'||typeof row.before!=='string'||typeof row.after!=='string'||Buffer.byteLength(row.before)>2097152||Buffer.byteLength(row.after)>2097152)fail('whole fixed before/after source images required');
  if(!readBoundedTrackedSourceBytes(ROOT,row.path,{maxBytes:2097152}).equals(Buffer.from(row.after)))fail('actual complete successor source differs: '+row.path);
 }
 return value;
}
function equation(row){
 const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:row.language}])[0];
 if(history.inverse!==row.before||transportConcreteSyntaxMeta(history.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(history.afterMeta).source!==row.after||history.trace.map(item=>item.phase).join('|')!=='language|repository')fail('complete successor source/CST/inverse differs');
 return history;
}
// Fixed historical source-to-current DATA join, freshly closed on every call.
// A caller's path/before string can select only one complete fixed equation.
// It never substitutes for native gate, source/type or compiler authority.
export function readNativeScalarOperationalSuccessorSource(path,before){
 return withBoundedTrackedSourceOperation(ROOT,()=>{
  const value=packet(),row=value.rows.find(row=>row.path===path);
  if(!row||row.before!==before)fail('exact complete historical predecessor required');
  const history=equation(row);accountData({value,history});return history.after;
 });
}
export function visitNativeScalarOperationalSourceEquations(consume){
 requireSynchronousSourceCallback(consume);
 return withBoundedTrackedSourceOperation(ROOT,()=>{
  const value=packet(),receipts=[];
  for(const row of value.rows){
   const history=equation(row),event={path:row.path,language:row.language,history,semanticAuthority:false,rustAuthority:false};
   accountData({value,receipts,event});
   withCompleteSourceClosingFence(()=>{const reply=consume(Object.freeze(event));accountData({value,receipts,event,reply});},[]);
   receipts.push(Object.freeze({path:row.path,completeOriginalSourceRetained:true,completeInverseDelivered:true}));
  }
  const result={schema:'native-scalar-operational-source-receipt-v1',receipts,allWholeSourcesDelivered:true,execution:'UNRUN',semanticAuthority:false,rustAuthority:false};
  accountData(result);return Object.freeze(result);
 });
}
