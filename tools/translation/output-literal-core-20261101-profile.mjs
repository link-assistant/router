// Complete0713/literal/edited -> owned static-output source successor; uninstalled.
import {constants,lstatSync,readlinkSync,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/output-literal-core-20261101/complete-sources.json.gz',PIN='4b68940b98a9a6cca1e988ebee7e65a1058367df04d870492e07f972eca63848';
const parse=JSON.parse,birth=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalCapturedFunctionSource(parse)==='function parse() { [native code] }';
let sourceFrame=null;
const fail=message=>{throw new TypeError('Owned output source profile: '+message);};
const guard=()=>{if(!birth||JSON.parse!==parse||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source input operations changed');};
const check=run=>withSourceInputValidation(run);
function identity(stat,full=true){const keys=full?['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs']:['dev','ino','mode','uid','gid'];return Object.fromEntries(keys.map(key=>{if(typeof stat[key]!=='bigint')fail('complete native physical stat identity required');return [key,String(stat[key])];}));}
const same=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);
function ancestors(path,frame){
 let parent=dirname(path);for(let depth=0;;depth++){
  if(depth>64||frame.directories.size>=512&&!frame.directories.has(parent))fail('bounded source ancestor identity census');const stat=lstatSync(parent,{bigint:true}),value={identity:identity(stat,false),alias:stat.isSymbolicLink()?readlinkSync(parent):null};if(!stat.isDirectory()&&!stat.isSymbolicLink())fail('ordinary source ancestor required');const prior=frame.directories.get(parent);if(prior&&!same(prior.identity,value.identity)||prior&&prior.alias!==value.alias)fail('source directory/alias identity changed');if(!prior)frame.directories.set(parent,value);const next=dirname(parent);if(next===parent)break;parent=next;
 }
}
function read(path,limit,frame){
 guard();ancestors(path,frame);const first=lstatSync(path,{bigint:true});if(!first.isFile()||first.isSymbolicLink()||first.size<0n||first.size>BigInt(limit))fail('ordinary bounded physical source required');let original=frame.files.get(path);const before=identity(first);if(original&&!same(original.identity,before))fail('same-name physical source replacement');
 if(!original){if(frame.files.size>=256)fail('bounded complete physical source set');original={path,limit,identity:before,bytes:null};frame.files.set(path,original);}
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));
 let primaryFailed=false;try{const opened=fstatSync(fd,{bigint:true});if(!opened.isFile()||!same(before,identity(opened)))fail('physical source changed before read');const size=Number(opened.size),bytes=Buffer.alloc(size+1);let count=0;while(count<bytes.length){const length=readSync(fd,bytes,count,Math.min(65536,bytes.length-count),null);if(length===0)break;count+=length;}const last=fstatSync(fd,{bigint:true}),current=lstatSync(path,{bigint:true});if(count!==size||!current.isFile()||current.isSymbolicLink()||!same(before,identity(last))||!same(before,identity(current)))fail('source growth/EOF/identity changed');ancestors(path,frame);const value=bytes.subarray(0,count);if(original.bytes&&!original.bytes.equals(value))fail('complete source bytes changed');if(!original.bytes)original.bytes=Buffer.from(value);guard();return value;}catch(error){primaryFailed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primaryFailed)throw error;}}
}
function text(path,frame){const raw=read(join(ROOT,path),2097152,frame),value=raw.toString('utf8');if(!Buffer.from(value).equals(raw))fail('exact original UTF8 source required');return value;}
function load(frame){
 if(frame.profile)return frame.profile;const packed=read(join(ROOT,ARCHIVE),2097152,frame);if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete original/successor archive differs');const raw=gunzipSync(packed,{maxOutputLength:4194304}),profile=parse(new TextDecoder('utf8',{fatal:true}).decode(raw));guard();accountData(profile);
 if(profile.schema!=='owned-static-output-full-source-successor-v1'||!Array.isArray(profile.sources)||profile.sources.length>256||!Array.isArray(profile.rows)||profile.rows.length>128||!Array.isArray(profile.additions)||profile.additions.length>128)fail('complete bounded source version table required');
 for(const source of profile.sources)if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>2097152)fail('bounded complete source version required');const version=index=>{if(!Number.isSafeInteger(index)||index<0||index>=profile.sources.length)fail('exact original source version index required');return profile.sources[index];};const paths=new Set();
 for(const row of [...profile.rows,...profile.additions]){if(typeof row.path!=='string'||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path))fail('unique safe complete source paths required');paths.add(row.path);if(Object.hasOwn(row,'version'))version(row.version);else{version(row.physicalBeforeVersion);version(row.afterVersion);if(!Array.isArray(row.stages)||!row.stages.length||row.stages.length>32)fail('complete bounded predecessor chain required');for(const stage of row.stages)version(stage.version);}}
 frame.profile=profile;return profile;
}
function verify(frame,installed){
 const profile=load(frame);let failed=false,error;
 for(const row of [...profile.rows,...profile.additions])try{const index=Object.hasOwn(row,'version')?row.version:installed?row.afterVersion:row.physicalBeforeVersion;if(text(row.path,frame)!==profile.sources[index])fail('complete physical source differs: '+row.path);}catch(thrown){if(!failed){failed=true;error=thrown;}}
 if(failed)throw error;
}
function close(frame){let failed=false,error;for(const record of frame.files.values())try{read(record.path,record.limit,frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}for(const [path,record]of frame.directories)try{const stat=lstatSync(path,{bigint:true});if(!same(record.identity,identity(stat,false))||record.alias!==(stat.isSymbolicLink()?readlinkSync(path):null))fail('complete source ancestor identity changed');}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;}
export function noteOutputLiteralSourceFailure(error){invalidateActiveSourceOperations();if(sourceFrame&&!sourceFrame.failed){sourceFrame.failed=true;sourceFrame.error=error;}}
function operation(installed,run){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{const previous=sourceFrame,frame=previous??{files:new Map(),directories:new Map(),profile:null,failed:false,error:undefined};sourceFrame=frame;
 try{return withCompleteSourceClosingFence(()=>{check(()=>verify(frame,installed));const result=run(load(frame));if(frame.failed)throw frame.error;return result;},[()=>check(()=>{let failed=false,error;try{verify(frame,installed);}catch(thrown){failed=true;error=thrown;}try{close(frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}if(frame.failed)throw frame.error;if(failed)throw error;})]);}finally{sourceFrame=previous;if(!previous){frame.files.clear();frame.directories.clear();frame.profile=null;}}
 });
}
export const withOutputLiteralInstalledSources=run=>operation(true,()=>run());
function history(profile,row,left,right){const before=profile.sources[left],after=profile.sources[right],value=transportConcreteSourceEquations([{before,after,language:row.language}])[0];if(value.inverse!==before||transportConcreteSyntaxMeta(value.beforeMeta).source!==before||transportConcreteSyntaxMeta(value.afterMeta).source!==after)fail('complete source/CST/inverse differs');return value;}
function eachEquation(profile,run){
 for(const row of profile.rows){if(row.stages.length===1)run(row,row.stages[0].version,row.stages[0].version,[row.stages[0].profile,row.stages[0].profile]);else for(let at=1;at<row.stages.length;at++)run(row,row.stages[at-1].version,row.stages[at].version,[row.stages[at-1].profile,row.stages[at].profile]);}
 for(const row of profile.additions)run(row,row.version,row.version,['complete-addition','complete-addition']);
}
export function visitOutputLiteralSourceEquations(run){requireSynchronousSourceCallback(run);return operation(false,profile=>{let visited=0;eachEquation(profile,(row,left,right,profiles)=>{const value={path:row.path,profiles,history:history(profile,row,left,right)};accountData({profile,value});withCompleteSourceClosingFence(()=>{const received=run(value);accountData({profile,value,received});return null;},[]);visited++;});return {visited,sourceInstalled:false,semanticAuthority:false};});}
export function proposeOutputLiteralProfile(){return operation(false,profile=>{
 const equations=[];const pipeline=createRulePipeline([{phase:'language',rules:[{id:'language:whole0713-literal-nominal-edited-output-source-CST-inverses',apply:()=>{eachEquation(profile,(row,left,right,profiles)=>{const value=history(profile,row,left,right);accountData({profile,history:value,equations});equations.push({path:row.path,profiles,beforeVersion:left,afterVersion:right,inverseVersion:left,trace:value.trace});});return equations;}}]},{phase:'repository',rules:[{id:'repository:explicit-owned-backend-source-successor-only',apply:()=>({schema:profile.schema,predecessor:profile.predecessor,sources:profile.sources,substitutions:profile.rows,additions:profile.additions,equations,fullCstVisitor:'visitOutputLiteralSourceEquations',sourceInstalled:false,backendRequired:true,synchronousScopeOnly:true,persistentNativeHostParity:false,originalBuiltinEquivalent:false,productionCoverageQualified:false})}]}]).run(null);const result={...pipeline.value,ruleTrace:pipeline.trace};accountData(result);return result;
});}
