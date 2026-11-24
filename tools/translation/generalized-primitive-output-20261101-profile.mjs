// Complete aggregate/source + real persistent backend successor; SOURCE, UNRUN, uninstalled.
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
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/generalized-primitive-output-20261101/complete-sources.json.gz',PIN='57c54e54b3693328597c9433b83bace69ebf2e231df8c703977d2cc5de24b7df';
const parse=JSON.parse,birth=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalCapturedFunctionSource(parse)==='function parse() { [native code] }';
let sourceFrame=null;
const fail=message=>{throw new TypeError('Generalized primitive output source profile: '+message);};
const guard=()=>{if(!birth||JSON.parse!==parse||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source input operations changed');};
const check=run=>withSourceInputValidation(run);
function identity(stat,full=true){const keys=full?['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs']:['dev','ino','mode','uid','gid','mtimeNs','ctimeNs'];return Object.fromEntries(keys.map(key=>{if(typeof stat[key]!=='bigint')fail('complete native physical stat identity required');return [key,String(stat[key])];}));}
const same=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);
function ancestors(path,frame){
 let parent=dirname(path);for(let depth=0;;depth++){
  if(depth>64||frame.directories.size>=512&&!frame.directories.has(parent))fail('bounded source ancestor identity census');const stat=lstatSync(parent,{bigint:true}),value={identity:identity(stat,false),alias:stat.isSymbolicLink()?readlinkSync(parent):null};if(!stat.isDirectory()&&!stat.isSymbolicLink())fail('ordinary source ancestor required');const prior=frame.directories.get(parent);if(prior&&!same(prior.identity,value.identity)||prior&&prior.alias!==value.alias)fail('source directory/alias identity changed');if(!prior)frame.directories.set(parent,value);const next=dirname(parent);if(next===parent)break;parent=next;
 }
}
function read(path,limit,frame){
 guard();ancestors(path,frame);const first=lstatSync(path,{bigint:true});if(!first.isFile()||first.isSymbolicLink()||first.size<0n||first.size>BigInt(limit))fail('ordinary bounded physical source required');let original=frame.files.get(path);const before=identity(first);if(original&&!same(original.identity,before))fail('same-name physical source replacement');
 if(!original){if(frame.files.size>=256)fail('bounded complete physical source set');original={path,limit,identity:before,bytes:null};frame.files.set(path,original);}
 if(!Number.isInteger(constants.O_NOFOLLOW)||constants.O_NOFOLLOW<=0||!Number.isInteger(constants.O_NONBLOCK)||constants.O_NONBLOCK<=0)fail('native no-follow/nonblocking opens required');const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 let primaryFailed=false;try{const opened=fstatSync(fd,{bigint:true});if(!opened.isFile()||!same(before,identity(opened)))fail('physical source changed before read');const size=Number(opened.size),bytes=Buffer.alloc(size+1);let count=0;while(count<bytes.length){const length=readSync(fd,bytes,count,Math.min(65536,bytes.length-count),null);if(length===0)break;count+=length;}const last=fstatSync(fd,{bigint:true}),current=lstatSync(path,{bigint:true});if(count!==size||!current.isFile()||current.isSymbolicLink()||!same(before,identity(last))||!same(before,identity(current)))fail('source growth/EOF/identity changed');ancestors(path,frame);const value=bytes.subarray(0,count);if(original.bytes&&!original.bytes.equals(value))fail('complete source bytes changed');if(!original.bytes)original.bytes=Buffer.from(value);guard();return value;}catch(error){primaryFailed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primaryFailed)throw error;}}
}
function text(path,frame){const raw=read(join(ROOT,path),2097152,frame),value=raw.toString('utf8');if(!Buffer.from(value).equals(raw))fail('exact original UTF8 source required');return value;}
function load(frame){
 if(frame.profile)return frame.profile;const packed=read(join(ROOT,ARCHIVE),2097152,frame);if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('complete original/successor archive differs');const raw=gunzipSync(packed,{maxOutputLength:4194304}),profile=parse(new TextDecoder('utf8',{fatal:true}).decode(raw));guard();accountData(profile);
 if(!Array.isArray(profile.resources)||profile.resources.length!==3||profile.resources.map(row=>row.path).join('|')!=='tools/translation/persistent-output-backend-20261101-kernel.py|Cargo.toml|Cargo.lock')fail('exact complete untranslated provider resource required');if(profile.schema!=='generalized-eager-output-complete-source-successor-v1'||!Array.isArray(profile.sources)||profile.sources.length>256||!Array.isArray(profile.rows)||profile.rows.length>128||!Array.isArray(profile.additions)||profile.additions.length>128)fail('complete bounded source version table required');
 for(const source of profile.sources)if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>2097152)fail('bounded complete source version required');const version=index=>{if(!Number.isSafeInteger(index)||index<0||index>=profile.sources.length)fail('exact original source version index required');return profile.sources[index];};const paths=new Set();
 for(const row of [...profile.rows,...profile.additions,...profile.resources]){if(typeof row.path!=='string'||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path))fail('unique safe complete source paths required');paths.add(row.path);if(Object.hasOwn(row,'version'))version(row.version);else{version(row.physicalBeforeVersion);version(row.afterVersion);if(!Array.isArray(row.stages)||!row.stages.length||row.stages.length>32)fail('complete bounded predecessor chain required');for(const stage of row.stages)version(stage.version);}}
 const predecessor=profile.predecessorArchive;if(predecessor?.path!=='tools/translation/source-profiles/dynamic-primitive-output-20261101/complete-sources.json.gz'||predecessor.sha256!=='4d3d5f4ff3bceb05378f85f08993fea89170380c39c71134b0ac5a34fc8f57a3'||createHash('sha256').update(read(join(ROOT,predecessor.path),2097152,frame)).digest('hex')!==predecessor.sha256)fail('exact complete predecessor archive differs');frame.profile=profile;return profile;
}
function verify(frame,installed){
 const profile=load(frame);let failed=false,error;
 for(const row of [...profile.rows,...profile.additions,...profile.resources])try{const index=Object.hasOwn(row,'version')?row.version:installed?row.afterVersion:row.physicalBeforeVersion;if(text(row.path,frame)!==profile.sources[index])fail('complete physical source differs: '+row.path);}catch(thrown){if(!failed){failed=true;error=thrown;}}
 if(failed)throw error;
}
function close(frame){let failed=false,error;for(const record of frame.files.values())try{read(record.path,record.limit,frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}for(const [path,record]of frame.directories)try{const stat=lstatSync(path,{bigint:true});if(!same(record.identity,identity(stat,false))||record.alias!==(stat.isSymbolicLink()?readlinkSync(path):null))fail('complete source ancestor identity changed');}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;}
export function noteGeneralizedOutputSourceFailure(error){invalidateActiveSourceOperations();if(sourceFrame&&!sourceFrame.failed){sourceFrame.failed=true;sourceFrame.error=error;}}
function operation(installed,run){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{const previous=sourceFrame,frame=previous??{files:new Map(),directories:new Map(),profile:null,failed:false,error:undefined,depth:0};if(frame.depth>=64){const error=new TypeError('bounded aggregate source frame depth required');noteGeneralizedOutputSourceFailure(error);throw error;}frame.depth++;sourceFrame=frame;
 try{return withCompleteSourceClosingFence(()=>{check(()=>verify(frame,installed));const result=run(load(frame));if(frame.failed)throw frame.error;return result;},[()=>check(()=>{let failed=false,error;try{verify(frame,installed);}catch(thrown){failed=true;error=thrown;}try{close(frame);}catch(thrown){if(!failed){failed=true;error=thrown;}}if(frame.failed)throw frame.error;if(failed)throw error;})]);}finally{frame.depth--;sourceFrame=previous;if(!previous){frame.files.clear();frame.directories.clear();frame.profile=null;}}
 });
}
export const withGeneralizedOutputInstalledSources=run=>{requireSynchronousSourceCallback(run);return operation(true,()=>run());};
function history(profile,row,left,right){const before=profile.sources[left],after=profile.sources[right],value=transportConcreteSourceEquations([{before,after,language:row.language}])[0];if(value.inverse!==before||transportConcreteSyntaxMeta(value.beforeMeta).source!==before||transportConcreteSyntaxMeta(value.afterMeta).source!==after)fail('complete source/CST/inverse differs');return value;}
function eachEquation(profile,run){
 for(const row of profile.rows){if(row.stages.length===1)run(row,row.stages[0].version,row.stages[0].version,[row.stages[0].profile,row.stages[0].profile]);else for(let at=1;at<row.stages.length;at++)run(row,row.stages[at-1].version,row.stages[at].version,[row.stages[at-1].profile,row.stages[at].profile]);}
 for(const row of profile.additions)run(row,row.version,row.version,['complete-addition','complete-addition']);
}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export function visitGeneralizedOutputSourceEquations(run){requireSynchronousSourceCallback(run);return operation(false,profile=>{
 let visited=0;const chronology=[];eachEquation(profile,(row,left,right,profiles)=>{const value={path:row.path,language:row.language,profiles,beforeVersion:left,afterVersion:right,inverseVersion:left,history:history(profile,row,left,right)};accountData({profile,value,chronology});freeze(value);withCompleteSourceClosingFence(()=>{const received=run(value);accountData({profile,value,received,chronology});return null;},[]);const phases=value.history.trace.map(entry=>entry.phase);if(phases.length!==2||phases[0]!=='language'||phases[1]!=='repository')fail('complete actual ordered source trace required');const next={path:row.path,language:row.language,profiles,beforeVersion:left,afterVersion:right,inverseVersion:left,tracePhases:phases};accountData({profile,chronology,next});chronology.push(next);visited++;});
 const result={schema:profile.schema,predecessor:profile.predecessor,sources:profile.sources,substitutions:profile.rows,additions:profile.additions,chronology,visited,fullCstRetained:false,resources:profile.resources,pythonCstClaimed:false,allFullEquationsDelivered:true,maxValues:4096,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,recordClonedSupported:false,executableRecordCloneAdded:false,sourceInstalled:false,semanticAuthority:false};accountData(result);return freeze(result);
});}
export function proposeGeneralizedOutputProfile(){return operation(false,profile=>{
 const equations=[];const pipeline=createRulePipeline([{phase:'language',rules:[{id:'language:complete-predecessor-and-generalized-primitive-output-CST-inverses',apply:()=>{eachEquation(profile,(row,left,right,profiles)=>{const value=history(profile,row,left,right);accountData({profile,history:value,equations});equations.push({path:row.path,profiles,beforeVersion:left,afterVersion:right,inverseVersion:left,trace:value.trace});});return equations;}}]},{phase:'repository',rules:[{id:'repository:explicit-generalized-owned-Text-control-output-successor',apply:()=>({schema:profile.schema,predecessor:profile.predecessor,sources:profile.sources,substitutions:profile.rows,additions:profile.additions,equations,fullCstVisitor:'visitGeneralizedOutputSourceEquations',resources:profile.resources,pythonCstClaimed:false,sourceInstalled:false,backendRequired:true,synchronousScopeOnly:true,persistentNativeHostParity:false,originalBuiltinEquivalent:false,productionCoverageQualified:false})}]}]).run(null);const result={...pipeline.value,ruleTrace:pipeline.trace};accountData(result);return result;
});}

// Genuine fresh compiler entry under THIS entire installed-source frame.
// Fixed predecessor installed fences cannot guard newer virtual after bytes.
import {withGeneralizedPrimitiveOutput} from './generalized-primitive-output-20261101.mjs';
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import {withLiteralArgumentsCore} from './literal-arguments-core-20261101.mjs';
import {withNominalEditedOperation} from './nominal-edited-target-20261101-domain.mjs';
import {withAggregateCopyCollectionOperation,aggregateCopyCollectionReceipts} from './aggregate-copy-collection-20261101-domain.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
export function compileGeneralizedOutputProject(input){
 accountData(input);if(!input||Object.keys(input).sort().join(',')!=='entry,files,lock,manifest'||!Array.isArray(input.files)||input.files.length<1||input.files.length>128||typeof input.manifest!=='string'||typeof input.lock!=='string')fail('complete bounded original project DATA required');
 const files=new Map(),paths=new Set();let bytes=0;for(const row of input.files){if(!row||Object.keys(row).sort().join(',')!=='path,source'||typeof row.path!=='string'||!row.path.endsWith('.rs')||row.path.startsWith('/')||row.path.length>4096||/[:\\\0\r\n]/u.test(row.path)||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path.toLowerCase())||typeof row.source!=='string'||/\p{Surrogate}/u.test(row.source)||Buffer.byteLength(row.source)>2097152)fail('unique safe complete native source rows required');paths.add(row.path.toLowerCase());files.set(row.path,row.source);bytes+=Buffer.byteLength(row.source);if(bytes>4194304)fail('whole native source budget');}if(!files.has(input.entry))fail('actual original native entry required');
 return withGeneralizedOutputInstalledSources(()=>withGeneralizedPrimitiveOutput(()=>withAggregateCopyCollectionOperation(()=>withNominalEditedOperation(()=>{
  const dependencies={manifest:input.manifest,lock:input.lock},fresh=withLiteralArgumentsCore(()=>nominal.withNominalCopyCollectionSourceReaders(()=>project.translateProject({entry:input.entry,paths:[...files.keys()],readSource:path=>{if(!files.has(path))fail('original native source universe incomplete');return files.get(path);},cargoManifest:input.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE})));
  if(!Array.isArray(fresh.executableDeclarations))fail('fresh safe original executable readers missing');const executableSnapshots=[];for(const row of fresh.executableDeclarations){if(typeof row.checkedSource!=='function'||typeof row.targetBinding!=='function'||Object.hasOwn(row,'lower'))fail('snapshot-only original checker readers required');executableSnapshots.push({source:row.checkedSource(),target:row.targetBinding()});accountData(executableSnapshots);}
  const result={persistentBackendRequired:true,persistentHostParity:false,setupTranslated:false,synchronousOnly:true,meta:fresh.meta,javascript:fresh.javascript,typescript:fresh.typescript,nominalCopyCollections:fresh.nominalCopyCollections,aggregateCopyCollections:aggregateCopyCollectionReceipts(),executableSnapshots};accountData(result);return result;
 },noteGeneralizedOutputSourceFailure),noteGeneralizedOutputSourceFailure)));
}
