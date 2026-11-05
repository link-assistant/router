// Complete synchronous source-equation visitor. Every full CST/inverse reaches
// the receiver; only raw source images/chronology remain in retained output.
import {openSync,closeSync,lstatSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const PIN=Object.freeze({"path":"tools/translation/source-profiles/nominal-edited-target-20261101/nominal-edited-target-20261101-complete-sources.json.gz","bytes":754721,"rawBytes":4080599,"sha256":"2184352592f6399cd984f537cbd6f2f1ae75aefabc0bf81c1dd17bc4cadd0e8c"});
const originalRoot=resolve(fileURLToPath(new URL('../../',import.meta.url))),fail=message=>{throw new TypeError('Complete source profile visitor: '+message);};
let current=null;
const fields=['dev','ino','size','mtimeMs','ctimeMs'];
const safe=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&!/[:\\\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
function read(path,size){
 if(!safe(path)||!Number.isSafeInteger(size)||size<0||size>16777216)fail('bounded fixed source input required');const root=current?.root??originalRoot,absolute=join(root,path),parents=[];let directory=dirname(absolute);
 while(directory!==root){const row=lstatSync(directory);if(!row.isDirectory()||row.isSymbolicLink())fail('ordinary source ancestors required');parents.push({path:directory,...Object.fromEntries(fields.map(key=>[key,row[key]]))});const parent=dirname(directory);if(parent===directory||relative(root,parent).startsWith('..'))fail('source input escapes fixed root');directory=parent;}
 const ancestor=lstatSync(root);if(!ancestor.isDirectory()||ancestor.isSymbolicLink())fail('ordinary source root required');parents.push({path:root,...Object.fromEntries(fields.map(key=>[key,ancestor[key]]))});
 const before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size!==size)fail('exact complete source byte size differs: '+path);if(!Number.isInteger(constants.O_NOFOLLOW)||!Number.isInteger(constants.O_NONBLOCK)||constants.O_NOFOLLOW<=0||constants.O_NONBLOCK<=0)fail('native no-follow/nonblocking source opens required');
 const descriptor=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 let primaryFailed=false;try{const first=fstatSync(descriptor);if(!first.isFile()||fields.some(key=>first[key]!==before[key]))fail('source identity/time changed before read');const bytes=Buffer.alloc(size+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor),after=lstatSync(absolute);if(at!==size||!after.isFile()||after.isSymbolicLink()||fields.some(key=>first[key]!==last[key]||last[key]!==after[key]))fail('complete stable source read differs');for(const row of parents){const now=lstatSync(row.path);if(!now.isDirectory()||now.isSymbolicLink()||fields.some(key=>now[key]!==row[key]))fail('source ancestor identity/time changed');}
  const stamp={file:Object.fromEntries(fields.map(key=>[key,first[key]])),parents},prior=current?.stamps.get(path);if(prior){if(fields.some(key=>prior.file[key]!==stamp.file[key])||prior.parents.length!==parents.length||parents.some((row,index)=>['path',...fields].some(key=>prior.parents[index][key]!==row[key])))fail('source initial identity/time differs through closing: '+path);}else current?.stamps.set(path,stamp);return bytes.subarray(0,at);
 }catch(error){primaryFailed=true;throw error;}finally{try{closeSync(descriptor);}catch(error){if(!primaryFailed)throw error;}}
}
function data(){const bytes=read(PIN.path,PIN.bytes);if(createHash('sha256').update(bytes).digest('hex')!==PIN.sha256)fail('complete immutable composed source archive differs');const raw=gunzipSync(bytes,{maxOutputLength:PIN.rawBytes});if(raw.length!==PIN.rawBytes)fail('complete source archive decode length differs');const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));if(value.schema!=='nominal-edited-target-complete-composed-source-data-v1'||!Array.isArray(value.rows)||!Array.isArray(value.additions)||value.rows.length>128||value.additions.length>128)fail('complete fixed predecessor/helper source census required');return value;}
export function noteSourceProfileVisitorFailure(error){invalidateActiveSourceOperations();if(current&&!current.failed){current.failed=true;current.error=error;}}
function verify(installed){return withSourceInputValidation(()=>{
 let plan;try{plan=data();}catch(error){noteSourceProfileVisitorFailure(error);throw error;}let failed=false,first;
 for(const row of [...plan.rows,...plan.additions])try{const expected=Object.hasOwn(row,'physicalBefore')?(installed?row.after:row.physicalBefore):row.source;if(!safe(row.path)||typeof expected!=='string'||expected.length>2097152||Buffer.byteLength(expected)>8388608||!Buffer.from(expected).equals(read(row.path,Buffer.byteLength(expected))))fail('complete expected composed source differs: '+row.path);}catch(error){noteSourceProfileVisitorFailure(error);if(!failed){failed=true;first=error;}}
 if(failed)throw first;return plan;
});}
function withFrame(installed,run,directory=null){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{const previous=current,root=resolve(directory??originalRoot);if(previous&&previous.root!==root){const error=new TypeError('nested source fixture root differs');noteSourceProfileVisitorFailure(error);throw error;}const frame=previous??{root,stamps:new Map(),failed:false,error:undefined,depth:0};if(frame.depth>=64)fail('bounded nested composed source operation required');frame.depth++;current=frame;
 return withCompleteSourceClosingFence(()=>{const plan=verify(installed);let result;try{result=run(plan);}catch(error){if(!(error instanceof TranslationError))noteSourceProfileVisitorFailure(error);throw error;}if(frame.failed)throw frame.error;return result;},[()=>{verify(installed);if(frame.failed)throw frame.error;},()=>{frame.depth--;current=previous;if(previous===null)frame.stamps.clear();}]);
});}

const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
/** Complete proposal/visitor; never semantic or compiler-owner authority. */
export function visitSourceProfileEquations(run,options={}){
 requireSynchronousSourceCallback(run);accountPrimitiveVectorIteratorBulkData(options);if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='directory'))fail('ordinary DATA fixture options required');const directory=Object.hasOwn(options,'directory')?options.directory:null;if(directory!==null&&(typeof directory!=='string'||directory.length>4096||directory.includes(String.fromCharCode(0))))fail('bounded optional DATA fixture root required');return withFrame(false,plan=>{
  const expected=plan.rows.reduce((sum,row)=>sum+row.stages.length-1,plan.additions.length);let visited=0;const result={schema:'complete-streamed-source-profile-images-v1',predecessor:plan.predecessor,substitutions:[],additions:[],versions:[],chronology:[],equationsVisited:expected,fullCstRetained:false,allFullEquationsDelivered:false,sourceInstalled:false,nativeInstalled:false,maxValues:4096,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,newNominalNativeAbi:false,includesPredecessorOwnedLiteralAbi:true,sourceAuthority:false,semanticAuthority:false,runtimeExecuted:false,runtimeParity:false},retained=nominal.incrementalNominalCopyCollectionOutput(result);
  const budget=extra=>accountPrimitiveVectorIteratorBulkData({plan,result,...extra});budget({});
  function version(path,language,source){const previous=result.versions.findIndex(row=>row.path===path&&row.language===language&&row.source===source);if(previous>=0)return previous;const id=result.versions.length,row={path,language,source};budget({next:row});retained.append(result.versions,row);return id;}
  function equation(path,language,before,after,layer){
   const left=version(path,language,before),right=version(path,language,after);budget({pair:{before,after,language}});const history=transportConcreteSourceEquations([{before,after,language}])[0];
   if(history.before!==before||history.after!==after||history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete streamed source/CST equation inverse differs');
   const phases=history.trace.map(row=>row.phase);if(phases.length!==2||phases[0]!=='language'||phases[1]!=='repository')fail('actual complete two-phase source trace required');
   const event=freeze({schema:'complete-source-profile-equation-event-v1',index:visited,path,language,layer,beforeVersion:left,afterVersion:right,inverseVersion:left,history});
   budget({event});
   // Account the complete transient event AND ordinary returned callback DATA
   // with the retained invocation DATA. Callback state outside this module is
   // caller-owned; the receiving consumer retains no event/CST objects.
   withCompleteSourceClosingFence(()=>{const answer=run(event);budget({event,answer});},[]);
   const chronology={index:visited,path,language,layer,beforeVersion:left,afterVersion:right,inverseVersion:left,tracePhases:phases,fullTraceDelivered:true};budget({next:chronology});retained.append(result.chronology,chronology);visited++;
  }
  for(const row of plan.rows){for(let at=1;at<row.stages.length;at++)equation(row.path,row.language,row.stages[at-1].source,row.stages[at].source,row.stages[at-1].profile+'→'+row.stages[at].profile);const substitution={path:row.path,language:row.language,beforeVersion:version(row.path,row.language,row.physicalBefore),afterVersion:version(row.path,row.language,row.after)};budget({next:substitution});retained.append(result.substitutions,substitution);}
  for(const row of plan.additions){equation(row.path,row.language,row.source,row.source,'complete-prerequisite-helper');const addition={path:row.path,language:row.language,version:version(row.path,row.language,row.source)};budget({next:addition});retained.append(result.additions,addition);}
  if(visited!==expected)fail('complete equation delivery count differs');result.allFullEquationsDelivered=true;budget({});accountPrimitiveVectorIteratorBulkData(result);return freeze(result);
 },directory);
}
