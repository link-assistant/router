// Complete0713 -> owned static-piece source successor, not an installed default.
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
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/literal-arguments-core-20261101/complete-sources-and-successors.json.gz',PIN='24bc915925554b70238503d98354016720152530b2cb9fa7cf9667e3bd7a5785';
const parse=JSON.parse,birth=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalCapturedFunctionSource(parse)==='function parse() { [native code] }';
let sourceFrame=null;
const fail=message=>{throw new TypeError('Literal arguments source profile: '+message);};
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
 if(frame.profile)return frame.profile;const packed=read(join(ROOT,ARCHIVE),2097152,frame);if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete original/successor source archive differs');const raw=gunzipSync(packed,{maxOutputLength:4194304}),value=new TextDecoder('utf8',{fatal:true}).decode(raw),profile=parse(value);guard();
 if(profile.schema!=='literal-arguments-core-combined0713-source-profile-v1'||!Array.isArray(profile.rows)||profile.rows.length<4||profile.rows.length>32||!Array.isArray(profile.additions)||profile.additions.length>64)fail('complete bounded source successor table required');accountData(profile);const paths=new Set();for(const row of [...profile.rows,...profile.additions]){if(typeof row.path!=='string'||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path))fail('unique bounded source paths required');paths.add(row.path);}frame.profile=profile;return profile;
}
function verify(frame,installed){
 const profile=load(frame);let failed=false,error;
 for(const row of profile.rows)try{if(text(row.path,frame)!==(installed?row.after:row.physicalBefore))fail('complete physical source differs: '+row.path);}catch(thrown){if(!failed){failed=true;error=thrown;}}
 for(const row of profile.additions)try{if(text(row.path,frame)!==row.source)fail('complete source addition differs: '+row.path);}catch(thrown){if(!failed){failed=true;error=thrown;}}
 if(failed)throw error;
}
function close(frame){let failed=false,error;for(const record of frame.files.values())try{read(record.path,record.limit,frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}for(const [path,record]of frame.directories)try{const stat=lstatSync(path,{bigint:true});if(!same(record.identity,identity(stat,false))||record.alias!==(stat.isSymbolicLink()?readlinkSync(path):null))fail('complete source ancestor identity changed');}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;}
export function noteNominalCopyCollectionSourceFailure(error){invalidateActiveSourceOperations();if(sourceFrame&&!sourceFrame.failed){sourceFrame.failed=true;sourceFrame.error=error;}}
function operation(installed,run){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{const previous=sourceFrame,frame=previous??{files:new Map(),directories:new Map(),profile:null,failed:false,error:undefined};sourceFrame=frame;
 try{return withCompleteSourceClosingFence(()=>{check(()=>verify(frame,installed));const value=run(frame);if(frame.failed)throw frame.error;return value;},[()=>check(()=>{let failed=false,error;try{verify(frame,installed);}catch(thrown){failed=true;error=thrown;}try{close(frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}if(frame.failed)throw frame.error;if(failed)throw error;})]);}finally{sourceFrame=previous;if(!previous){frame.files.clear();frame.directories.clear();frame.profile=null;}}
 });
}
export function withLiteralArgumentsCoreInstalledSources(run){requireSynchronousSourceCallback(run);return operation(true,()=>run());}
// Exact alias for the virtual successor helper;0713's original guard is unchanged.
export const withNominalCopyCollectionInstalledSources=withLiteralArgumentsCoreInstalledSources;
function equation(before,after,language){const history=transportConcreteSourceEquations([{before,after,language}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('whole source/CST/inverse chain differs');return history;}
export function visitLiteralArgumentsCoreSourceEquations(run){requireSynchronousSourceCallback(run);return operation(false,frame=>{let visited=0;for(const row of load(frame).rows)for(const [layer,before,after]of [['nominal0713',row.before,row.middle],['literal-owned',row.middle,row.after]]){const history=check(()=>equation(before,after,row.language)),value={path:row.path,layer,history};accountData(value);withCompleteSourceClosingFence(()=>run(value),[]);visited++;}return {visited,sourceInstalled:false,semanticAuthority:false};});}
export function proposeLiteralArgumentsCoreProfile(){return operation(false,frame=>{
 const profile=load(frame),summaries=[];
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'language:complete0713-and-owned-successor-source-CST-equations',apply:()=>{for(const row of profile.rows){const predecessor=equation(row.before,row.middle,row.language),successor=equation(row.middle,row.after,row.language);summaries.push({path:row.path,predecessor:{before:row.before,after:row.middle,inverse:predecessor.inverse},successor:{before:row.middle,after:row.after,inverse:successor.inverse}});}return summaries;}}]},
  {phase:'repository',rules:[{id:'repository:retain-exact-uninstalled-combined-source-profile',apply:histories=>({schema:profile.schema,predecessor:'nominal-copy-collection-20261101',substitutions:profile.rows,additions:profile.additions,sourceHistories:histories,fullCstVisitor:'visitLiteralArgumentsCoreSourceEquations',sourceInstalled:false,defaultCompilerChanged:false,stdArgumentsAbi:false,builtinOwnerResolved:false,nativeSysrootConformance:false,actualInvocationObserved:false,semanticAuthority:false,sourceAuthority:false,receivingExecuted:false})}]},
 ]).run(null);const returned={...result.value,ruleTrace:result.trace};accountData(returned);return returned;
});}
