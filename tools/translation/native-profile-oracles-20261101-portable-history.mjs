// Full operational source histories only. No Rust/source-semantic authority.
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBoundedTrackedSourceBytes,withBoundedTrackedSourceOperation} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url))),ARCHIVE='tools/translation/source-profiles/native-profile-oracles-20261101/portable-integration.json.gz',PIN='c252063fc7136352ffd211d25b9adcc013240ef03de40c7042648310f1972037';
const PATHS=Object.freeze(["tools/translation/native-profile-oracles-20261101-control.mjs","tools/translation/native-profile-oracles-20261101-materialize.mjs","tools/translation/native-profile-oracles-20261101-process.mjs","tools/translation/native-profile-oracles-20261101-disk.mjs","scripts/run-native-profile-oracles-20261101.mjs","tools/translation/test/native-profile-oracles-20261101-control.test.mjs","tools/translation/test/native-profile-oracles-20261101-receiving-cases.mjs"]);
const fail=message=>{throw new TypeError('Native portable source history: '+message);};
export function visitNativeProfilePortableIntegrationSources(consume){
 requireSynchronousSourceCallback(consume);return withBoundedTrackedSourceOperation(ROOT,()=>{
  const bytes=readBoundedTrackedSourceBytes(ROOT,ARCHIVE,{maxBytes:2097152});if(createHash('sha256').update(bytes).digest('hex')!==PIN)fail('complete immutable operational source archive differs');
  const packet=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(bytes,{maxOutputLength:4194304})));accountData(packet);
  if(packet.schema!=='native-profile-portable-integration-complete-sources-v1'||!Array.isArray(packet.rows)||packet.rows.length!==PATHS.length||packet.rows.some((row,at)=>row.path!==PATHS[at]||row.language!=='JavaScript'||typeof row.before!=='string'||typeof row.after!=='string'||Buffer.byteLength(row.before)>2097152||Buffer.byteLength(row.after)>2097152))fail('every complete original/portable source row required');
  const receipts=[];for(const row of packet.rows){
   const current=readBoundedTrackedSourceBytes(ROOT,row.path,{maxBytes:2097152});if(!current.equals(Buffer.from(row.after)))fail('actual complete operational source differs');
   const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:row.language}])[0];if(history.inverse!==row.before||transportConcreteSyntaxMeta(history.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(history.afterMeta).source!==row.after||history.trace.map(item=>item.phase).join('|')!=='language|repository')fail('complete operational source/CST/inverse differs');
   const event={path:row.path,language:row.language,history,semanticAuthority:false,rustAuthority:false};accountData({packet,receipts,event});withCompleteSourceClosingFence(()=>{const reply=consume(Object.freeze(event));accountData({packet,receipts,event,reply});},[]);receipts.push(Object.freeze({path:row.path,completeOriginalSourceRetained:true,completeInverseDelivered:true}));
  }
  const result={schema:'native-portable-integration-source-receipt-v1',receipts,allWholeSourcesDelivered:true,execution:'UNRUN',semanticAuthority:false,rustAuthority:false};accountData(result);return Object.freeze(result);
 });
}
