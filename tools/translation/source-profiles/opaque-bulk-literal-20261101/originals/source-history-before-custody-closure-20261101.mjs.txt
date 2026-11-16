// Whole source copies only. Real compiler and original-source frames reissue.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withOpaqueNativeCandidateSources as withOpaqueAdoptionSources} from './opaque-native-candidates-20261101-history.mjs';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {captureUnrunSourceCaseCustody} from './unrun-source-case-custody-20261101.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/opaque-bulk-literal-20261101/',ARCHIVE=P+'complete-source-copies.json.gz',SELF='tools/translation/opaque-bulk-literal-20261101-history.mjs';
const PIN='85934b9e283b1f6398e3e5233a655903b2a4a9b71059d34f15bf016a0585cbb0';
const fail=message=>{throw TypeError('Opaque constant whole-source copies: '+message);};
const expected=['opaque-corpus-bulk-literal-inverse-20261101.mjs','opaque-bulk-literal-20261101-receiving.mjs'].map(name=>'tools/translation/'+name);
const added=[];
const text=path=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(ROOT,path,{maxBytes:2097152}));
function load(){return withSourceInputValidation(()=>{
 const packed=readSelectedTrackedSourceBytes(ROOT,ARCHIVE,{maxBytes:2097152});if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete immutable copy archive differs');
 const data=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(packed,{maxOutputLength:4194304})));accountData(data);
 if(data.schema!=='opaque-bulk-literal-complete-source-copies-v1'||!Array.isArray(data.rows)||data.rows.length!==expected.length||!Array.isArray(data.additions)||data.additions.length!==added.length||!Array.isArray(data.prerequisites)||data.prerequisites.length!==4||!Array.isArray(data.currentCases)||data.currentCases.length!==1)fail('exact complete copies and case source required');
 for(let at=0;at<expected.length;at++){const row=data.rows[at];if(row.path!==expected[at]||typeof row.before!=='string'||typeof row.after!=='string'||!row.originalPath.startsWith('tools/translation/test/')&&text(row.originalPath)!==row.before||text(row.beforePath)!==row.before||text(row.path)!==row.after||text(row.afterPath)!==row.after)fail('whole original/copy/snapshot source differs');}
 for(let at=0;at<added.length;at++){const row=data.additions[at];if(row.path!==added[at]||typeof row.source!=='string'||text(row.path)!==row.source||text(row.snapshotPath)!==row.source)fail('complete new source helper differs');}
 const casePaths=['opaque-native-source-candidates-20261101.test.mjs','opaque-literal-owner-adoption-20261101.test.mjs','opaque-native-candidates-20261101.test.mjs','opaque-corpus-literal-inverse-20261101.test.mjs'].map(name=>'tools/translation/test/'+name);
 for(let at=0;at<casePaths.length;at++){const row=data.prerequisites[at];if(row.path!==casePaths[at]||typeof row.source!=='string'||text(row.snapshotPath)!==row.source)fail('complete independent case/vector source snapshot differs');}
 const current=['tools/translation/test/opaque-corpus-bulk-literal-inverse-20261101.test.mjs'];for(let at=0;at<current.length;at++){const row=data.currentCases[at];if(row.path!==current[at]||typeof row.source!=='string'||text(row.snapshotPath)!==row.source)fail('complete current independent case source differs');}
 const self=text(SELF);if(self!==text(P+'authored/source-history.mjs.txt'))fail('complete executing source-author snapshot differs');return {data,self};
});}
function operation(run){requireSynchronousSourceCallback(run);return withOpaqueAdoptionSources(()=>withSelectedTrackedSourceOperation(ROOT,()=>{const frame=load(),rows=[...frame.data.prerequisites,...frame.data.currentCases].map(row=>({path:row.path,source:row.source}));for(const row of frame.data.rows)if(row.originalPath.startsWith('tools/translation/test/'))rows.push({path:row.originalPath,source:row.before});const cases=captureUnrunSourceCaseCustody(ROOT,rows);return withCompleteSourceClosingFence(()=>run(frame),[()=>cases.verify(),()=>{load();},()=>cases.release()]);}));}
export function withOpaqueBulkLiteralSources(run){requireSynchronousSourceCallback(run);return operation(()=>run());}
export function visitOpaqueBulkLiteralSourceEquations(consume){
 requireSynchronousSourceCallback(consume);return operation(({data,self})=>{
  const entries=[...data.rows,...data.additions.map(row=>({path:row.path,before:'',after:row.source,role:'complete-new-native-source-helper'})),...data.prerequisites.map(row=>({path:row.path,before:row.source,after:row.source,role:'complete-independent-vector-prerequisite'})),...data.currentCases.map(row=>({path:row.path,before:'',after:row.source,role:'complete-independent-current-case'})),{path:SELF,before:'',after:self,role:'complete-source-author'}];let visited=0;
  for(const row of entries){const history=withSourceInputValidation(()=>{const value=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];if(value.inverse!==row.before||transportConcreteSyntaxMeta(value.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(value.afterMeta).source!==row.after||value.trace.map(part=>part.phase).join(',')!=='language,repository')fail('complete source/CST/two-phase inverse differs');return value;});const event={...row,history,sourceAuthority:false,semanticAuthority:false};accountData(event);withCompleteSourceClosingFence(()=>{const reply=consume(event);accountData({event,reply});},[]);visited++;}
  const copyCustody=data.rows.flatMap(row=>[{path:row.originalPath,source:row.before},{path:row.beforePath,source:row.before},{path:row.path,source:row.after},{path:row.afterPath,source:row.after}]);for(const row of data.additions)copyCustody.push({path:row.path,source:row.source},{path:row.snapshotPath,source:row.source});for(const row of [...data.prerequisites,...data.currentCases])copyCustody.push({path:row.path,source:row.source},{path:row.snapshotPath,source:row.source});copyCustody.push({path:SELF,source:self},{path:P+'authored/source-history.mjs.txt',source:self});
  const result={schema:data.schema,visited,copyRows:data.rows.length,additionRows:data.additions.length,sourceInstalled:false,copyCustody,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};accountData(result);return Object.freeze(result);
 });
}
