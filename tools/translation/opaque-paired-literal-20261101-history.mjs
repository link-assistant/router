import {visitOpaqueBulkLiteralSourceEquations as visitParentSourceEquations} from './opaque-bulk-literal-20261101-history.mjs';
// Whole source copies only. Real compiler and original-source frames reissue.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withOpaqueBulkLiteralSources as withOpaqueAdoptionSources} from './opaque-bulk-literal-20261101-history.mjs';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {captureUnrunSourceCaseCustody} from './unrun-source-case-custody-20261101.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/opaque-paired-literal-20261101/',ARCHIVE=P+'complete-source-copies-custody-closure-20261101.json.gz',SELF='tools/translation/opaque-paired-literal-20261101-history.mjs';
const PIN='0a00bd93f87cb275f97b74ec965bb5a67d3812f4f0d895d6d6c513009e6c9ce7';
const fail=message=>{throw TypeError('Opaque constant whole-source copies: '+message);};
const expected=['tools/translation/opaque-paired-literal-20261101-receiving.mjs'];
const added=['tools/translation/opaque-paired-literal-inverse-20261101.mjs'];
const text=path=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(ROOT,path,{maxBytes:2097152}));
function load(){return withSourceInputValidation(()=>{
 const packed=readSelectedTrackedSourceBytes(ROOT,ARCHIVE,{maxBytes:2097152});if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete immutable copy archive differs');
 const data=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(packed,{maxOutputLength:4194304})));accountData(data);
 if(data.schema!=='opaque-paired-literal-complete-source-copies-v1'||!Array.isArray(data.rows)||data.rows.length!==expected.length||!Array.isArray(data.additions)||data.additions.length!==added.length||!Array.isArray(data.prerequisites)||data.prerequisites.length!==1||!Array.isArray(data.currentCases)||data.currentCases.length!==1)fail('exact complete copies and case source required');
 for(let at=0;at<expected.length;at++){const row=data.rows[at];if(row.path!==expected[at]||typeof row.before!=='string'||typeof row.after!=='string'||!row.originalPath.startsWith('tools/translation/test/')&&text(row.originalPath)!==row.before||text(row.beforePath)!==row.before||text(row.path)!==row.after||text(row.afterPath)!==row.after)fail('whole original/copy/snapshot source differs');}
 for(let at=0;at<added.length;at++){const row=data.additions[at];if(row.path!==added[at]||typeof row.source!=='string'||text(row.path)!==row.source||text(row.snapshotPath)!==row.source)fail('complete new source helper differs');}
 const casePaths=['tools/translation/test/opaque-corpus-bulk-literal-inverse-20261101.test.mjs'];
 for(let at=0;at<casePaths.length;at++){const row=data.prerequisites[at];if(row.path!==casePaths[at]||typeof row.source!=='string'||text(row.snapshotPath)!==row.source)fail('complete independent case/vector source snapshot differs');}
 const current=['tools/translation/test/opaque-paired-literal-inverse-20261101.test.mjs'];for(let at=0;at<current.length;at++){const row=data.currentCases[at];if(row.path!==current[at]||typeof row.source!=='string'||text(row.snapshotPath)!==row.source)fail('complete current independent case source differs');}
 if(typeof data.sourceHistoryBefore!=='string'||text(data.sourceHistoryBeforePath)!==data.sourceHistoryBefore)fail('complete predecessor source-author image differs');const self=text(SELF);if(self!==text(P+'authored/source-history-custody-closure-20261101.mjs.txt'))fail('complete executing source-author snapshot differs');return {data,self};
});}
function operation(run){requireSynchronousSourceCallback(run);return withOpaqueAdoptionSources(()=>withSelectedTrackedSourceOperation(ROOT,()=>{const frame=load(),rows=[...frame.data.prerequisites,...frame.data.currentCases].map(row=>({path:row.path,source:row.source}));for(const row of frame.data.rows)if(row.originalPath.startsWith('tools/translation/test/'))rows.push({path:row.originalPath,source:row.before});const cases=captureUnrunSourceCaseCustody(ROOT,rows);return withCompleteSourceClosingFence(()=>run(frame),[()=>cases.verify(),()=>{load();},()=>cases.release()]);}));}
export function withOpaquePairedLiteralSources(run){requireSynchronousSourceCallback(run);return operation(()=>run());}
export function visitOpaquePairedLiteralSourceEquations(consume){
 requireSynchronousSourceCallback(consume);return operation(({data,self})=>{
  const entries=[...data.rows,...data.additions.map(row=>({path:row.path,before:'',after:row.source,role:'complete-new-native-source-helper'})),...data.prerequisites.map(row=>({path:row.path,before:row.source,after:row.source,role:'complete-independent-vector-prerequisite'})),...data.currentCases.map(row=>({path:row.path,before:'',after:row.source,role:'complete-independent-current-case'})),{path:SELF,before:data.sourceHistoryBefore,after:self,role:'complete-source-author-successor'}];let visited=0;
  for(const row of entries){const history=withSourceInputValidation(()=>{const value=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];if(value.inverse!==row.before||transportConcreteSyntaxMeta(value.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(value.afterMeta).source!==row.after||value.trace.map(part=>part.phase).join(',')!=='language,repository')fail('complete source/CST/two-phase inverse differs');return value;});const event={...row,history,sourceAuthority:false,semanticAuthority:false};accountData(event);withCompleteSourceClosingFence(()=>{const reply=consume(event);accountData({event,reply});},[]);visited++;}
  const parent=visitParentSourceEquations(event=>consume({...event,kind:'complete-parent-source-copy-equation'}));
  const copyCustody=data.rows.flatMap(row=>[{path:row.originalPath,source:row.before},{path:row.beforePath,source:row.before},{path:row.path,source:row.after},{path:row.afterPath,source:row.after}]);for(const row of data.additions)copyCustody.push({path:row.path,source:row.source},{path:row.snapshotPath,source:row.source});for(const row of [...data.prerequisites,...data.currentCases])copyCustody.push({path:row.path,source:row.source},{path:row.snapshotPath,source:row.source});copyCustody.push({path:SELF,source:self},{path:P+'authored/source-history-custody-closure-20261101.mjs.txt',source:self});
  copyCustody.push({path:data.sourceHistoryBeforePath,source:data.sourceHistoryBefore},...parent.copyCustody);const unique=new Map();for(const row of copyCustody){if(unique.has(row.path)&&unique.get(row.path).source!==row.source)fail('conflicting complete parent/current custody source');if(!unique.has(row.path))unique.set(row.path,row);}
  const result={schema:data.schema,visited,parentVisited:parent.visited,originalCaseClosureRetained:true,copyRows:data.rows.length,additionRows:data.additions.length,sourceInstalled:false,copyCustody:[...unique.values()],sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};accountData(result);return Object.freeze(result);
 });
}
