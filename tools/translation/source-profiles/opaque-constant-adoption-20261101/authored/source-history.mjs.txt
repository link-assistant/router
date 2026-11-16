// Whole source copies only. Real compiler and original-source frames reissue.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withOpaqueAdoptionSources} from './opaque-production-adoption-20261101-source-history.mjs';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {captureUnrunSourceCaseCustody} from './unrun-source-case-custody-20261101.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/opaque-constant-adoption-20261101/',ARCHIVE=P+'complete-source-copies.json.gz',SELF='tools/translation/opaque-constant-adoption-20261101-history.mjs';
const PIN='d98c06090ea51e32cc17f5aaba34dfd1891214146663007b757d92484e9a1b8b';
const fail=message=>{throw TypeError('Opaque constant whole-source copies: '+message);};
const expected=['opaque-constant-adoption-20261101.mjs','opaque-constant-adoption-20261101-corpus-result.mjs','opaque-constant-adoption-20261101-targets.mjs','opaque-constant-adoption-20261101-receiving.mjs','opaque-constant-adoption-20261101-compiler-cohort.mjs'].map(name=>'tools/translation/'+name);
const text=path=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(ROOT,path,{maxBytes:2097152}));
function load(){return withSourceInputValidation(()=>{
 const packed=readSelectedTrackedSourceBytes(ROOT,ARCHIVE,{maxBytes:2097152});if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete immutable copy archive differs');
 const data=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(packed,{maxOutputLength:4194304})));accountData(data);
 if(data.schema!=='opaque-constant-whole-source-copies-v1'||!Array.isArray(data.rows)||data.rows.length!==expected.length||!Array.isArray(data.prerequisites)||data.prerequisites.length!==6)fail('exact complete copies and case source required');
 for(let at=0;at<expected.length;at++){const row=data.rows[at];if(row.path!==expected[at]||typeof row.before!=='string'||typeof row.after!=='string'||!row.originalPath.startsWith('tools/translation/test/')&&text(row.originalPath)!==row.before||text(row.beforePath)!==row.before||text(row.path)!==row.after||text(row.afterPath)!==row.after)fail('whole original/copy/snapshot source differs');}
 const casePaths=['token-report-translation-edges-20261101-cases.mjs','opaque-production-adoption-20261101-fixtures.mjs','opaque-production-adoption-20261101-stream.test.mjs','opaque-production-adoption-20261101-view.test.mjs','opaque-production-adoption-20261101.test.mjs','scoped-carrier-adoption-20261101.test.mjs'].map(name=>'tools/translation/test/'+name);
 for(let at=0;at<casePaths.length;at++){const row=data.prerequisites[at];if(row.path!==casePaths[at]||typeof row.source!=='string'||text(row.snapshotPath)!==row.source)fail('complete independent case/vector source snapshot differs');}
 const self=text(SELF);if(self!==text(P+'authored/source-history.mjs.txt'))fail('complete executing source-author snapshot differs');return {data,self};
});}
function operation(run){requireSynchronousSourceCallback(run);return withOpaqueAdoptionSources(()=>withSelectedTrackedSourceOperation(ROOT,()=>{const frame=load(),rows=frame.data.prerequisites.map(row=>({path:row.path,source:row.source}));for(const row of frame.data.rows)if(row.originalPath.startsWith('tools/translation/test/'))rows.push({path:row.originalPath,source:row.before});const cases=captureUnrunSourceCaseCustody(ROOT,rows);return withCompleteSourceClosingFence(()=>run(frame),[()=>cases.verify(),()=>{load();},()=>cases.release()]);}));}
export function withOpaqueConstantAdoptionSources(run){requireSynchronousSourceCallback(run);return operation(()=>run());}
export function visitOpaqueConstantAdoptionSourceEquations(consume){
 requireSynchronousSourceCallback(consume);return operation(({data,self})=>{
  const entries=[...data.rows,...data.prerequisites.map(row=>({path:row.path,before:row.source,after:row.source,role:'complete-independent-vector-prerequisite'})),{path:SELF,before:'',after:self,role:'complete-source-author'}];let visited=0;
  for(const row of entries){const history=withSourceInputValidation(()=>{const value=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];if(value.inverse!==row.before||transportConcreteSyntaxMeta(value.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(value.afterMeta).source!==row.after||value.trace.map(part=>part.phase).join(',')!=='language,repository')fail('complete source/CST/two-phase inverse differs');return value;});const event={...row,history,sourceAuthority:false,semanticAuthority:false};accountData(event);withCompleteSourceClosingFence(()=>{const reply=consume(event);accountData({event,reply});},[]);visited++;}
  const copyCustody=data.rows.flatMap(row=>[{path:row.originalPath,source:row.before},{path:row.beforePath,source:row.before},{path:row.path,source:row.after},{path:row.afterPath,source:row.after}]);for(const row of data.prerequisites)copyCustody.push({path:row.path,source:row.source},{path:row.snapshotPath,source:row.source});copyCustody.push({path:SELF,source:self},{path:P+'authored/source-history.mjs.txt',source:self});
  const result={schema:data.schema,visited,copyRows:data.rows.length,sourceInstalled:false,copyCustody,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};accountData(result);return Object.freeze(result);
 });
}
