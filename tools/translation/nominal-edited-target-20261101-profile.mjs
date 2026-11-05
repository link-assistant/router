// Complete composed source profile DATA. No original predecessor is changed.
import {openSync,closeSync,lstatSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import {withLiteralArgumentsCore} from './literal-arguments-core-20261101.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const PIN=Object.freeze({"path":"tools/translation/source-profiles/nominal-edited-target-20261101/nominal-edited-target-20261101-complete-sources.json.gz","bytes":754721,"rawBytes":4080599,"sha256":"2184352592f6399cd984f537cbd6f2f1ae75aefabc0bf81c1dd17bc4cadd0e8c"});
const root=resolve(fileURLToPath(new URL('../../',import.meta.url))),fail=message=>{throw new TypeError('Nominal edited composed profile: '+message);};
let current=null;
const fields=['dev','ino','size','mtimeMs','ctimeMs'];
const safe=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&!/[:\\\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
function read(path,size){
 if(!safe(path)||!Number.isSafeInteger(size)||size<0||size>16777216)fail('bounded fixed source input required');const absolute=join(root,path),parents=[];let directory=dirname(absolute);
 while(directory!==root){const row=lstatSync(directory);if(!row.isDirectory()||row.isSymbolicLink())fail('ordinary source ancestors required');parents.push({path:directory,...Object.fromEntries(fields.map(key=>[key,row[key]]))});const parent=dirname(directory);if(parent===directory||relative(root,parent).startsWith('..'))fail('source input escapes fixed root');directory=parent;}
 const ancestor=lstatSync(root);if(!ancestor.isDirectory()||ancestor.isSymbolicLink())fail('ordinary source root required');parents.push({path:root,...Object.fromEntries(fields.map(key=>[key,ancestor[key]]))});
 const before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size!==size)fail('exact complete source byte size differs: '+path);if(!Number.isInteger(constants.O_NOFOLLOW)||!Number.isInteger(constants.O_NONBLOCK)||constants.O_NOFOLLOW<=0||constants.O_NONBLOCK<=0)fail('native no-follow/nonblocking source opens required');
 const descriptor=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 let primaryFailed=false;try{const first=fstatSync(descriptor);if(!first.isFile()||fields.some(key=>first[key]!==before[key]))fail('source identity/time changed before read');const bytes=Buffer.alloc(size+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor),after=lstatSync(absolute);if(at!==size||!after.isFile()||after.isSymbolicLink()||fields.some(key=>first[key]!==last[key]||last[key]!==after[key]))fail('complete stable source read differs');for(const row of parents){const now=lstatSync(row.path);if(!now.isDirectory()||now.isSymbolicLink()||fields.some(key=>now[key]!==row[key]))fail('source ancestor identity/time changed');}
  const stamp={file:Object.fromEntries(fields.map(key=>[key,first[key]])),parents},prior=current?.stamps.get(path);if(prior){if(fields.some(key=>prior.file[key]!==stamp.file[key])||prior.parents.length!==parents.length||parents.some((row,index)=>['path',...fields].some(key=>prior.parents[index][key]!==row[key])))fail('source initial identity/time differs through closing: '+path);}else current?.stamps.set(path,stamp);return bytes.subarray(0,at);
 }catch(error){primaryFailed=true;throw error;}finally{try{closeSync(descriptor);}catch(error){if(!primaryFailed)throw error;}}
}
function data(){const bytes=read(PIN.path,PIN.bytes);if(createHash('sha256').update(bytes).digest('hex')!==PIN.sha256)fail('complete immutable composed source archive differs');const raw=gunzipSync(bytes,{maxOutputLength:PIN.rawBytes});if(raw.length!==PIN.rawBytes)fail('complete source archive decode length differs');const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));if(value.schema!=='nominal-edited-target-complete-composed-source-data-v1'||!Array.isArray(value.rows)||!Array.isArray(value.additions)||value.rows.length>128||value.additions.length>128)fail('complete fixed predecessor/helper source census required');return value;}
export function noteNominalEditedSourceFailure(error){invalidateActiveSourceOperations();if(current&&!current.failed){current.failed=true;current.error=error;}}
function verify(installed){return withSourceInputValidation(()=>{
 let plan;try{plan=data();}catch(error){noteNominalEditedSourceFailure(error);throw error;}let failed=false,first;
 for(const row of [...plan.rows,...plan.additions])try{const expected=Object.hasOwn(row,'physicalBefore')?(installed?row.after:row.physicalBefore):row.source;if(!safe(row.path)||typeof expected!=='string'||expected.length>2097152||Buffer.byteLength(expected)>8388608||!Buffer.from(expected).equals(read(row.path,Buffer.byteLength(expected))))fail('complete expected composed source differs: '+row.path);}catch(error){noteNominalEditedSourceFailure(error);if(!failed){failed=true;first=error;}}
 if(failed)throw first;return plan;
});}
function withFrame(installed,run){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{const previous=current,frame=previous??{stamps:new Map(),failed:false,error:undefined,depth:0};if(frame.depth>=64)fail('bounded nested composed source operation required');frame.depth++;current=frame;
 return withCompleteSourceClosingFence(()=>{const plan=verify(installed);let result;try{result=run(plan);}catch(error){if(!(error instanceof TranslationError))noteNominalEditedSourceFailure(error);throw error;}if(frame.failed)throw frame.error;return result;},[()=>{verify(installed);if(frame.failed)throw frame.error;},()=>{frame.depth--;current=previous;if(previous===null)frame.stamps.clear();}]);
});}
export const withNominalEditedInstalledSources=run=>withFrame(true,run);
export function compileNominalEditedProject(request){
 if(!current)fail('newer complete installed-source frame required');try{accountPrimitiveVectorIteratorBulkData(request);
 const files=new Map(request.files.map(row=>[row.path,row.source])),inputs={manifest:request.manifest,lock:request.lock},options={entry:request.entry,paths:[...files.keys()],readSource:path=>{if(!files.has(path))fail('complete original source universe lacks '+path);return files.get(path);},cargoManifest:request.manifest,deriveDependencies:loadDeriveDependencyProof(inputs),jsonMacroDependencies:loadJsonMacroSourceProof(inputs),compilationProfile:PRODUCTION_PROFILE};
 if(typeof nominal.withNominalCopyCollectionSourceReaders!=='function')fail('actual fresh source-reader sibling missing');
 // Same genuine operations as the literal combined project entrypoint, with
 // its older physical-after fence superseded by this complete newer fence.
 return withLiteralArgumentsCore(()=>nominal.withNominalCopyCollectionSourceReaders(()=>project.translateProject(options)));
 }catch(error){if(!(error instanceof TranslationError))noteNominalEditedSourceFailure(error);throw error;}
}
export function proposeNominalEditedProfile(){return withFrame(false,plan=>{
 const result={schema:'nominal-edited-complete-source-equation-proposal-v1',predecessor:plan.predecessor,substitutions:[],additions:[],versions:[],equations:[],chains:[],sourceInstalled:false,nativeInstalled:false,maxValues:4096,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,newNativeAbi:false,newNominalNativeAbi:false,includesPredecessorOwnedLiteralAbi:true,sourceAuthority:false,semanticAuthority:false,runtimeExecuted:false,runtimeParity:false},retained=nominal.incrementalNominalCopyCollectionOutput(result),index=new Map();
 function version(path,language,source){const key=path+'\0'+language+'\0'+source;if(index.has(key))return index.get(key);const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete source/CST version inverse differs');const id=result.versions.length;retained.append(result.versions,{path,language,source,concreteSyntax:concrete.meta});index.set(key,id);return id;}
 function equation(path,language,before,after){const left=version(path,language,before),right=version(path,language,after),history=transportConcreteSourceEquations([{before,after,language}])[0];if(history.beforeMeta!==result.versions[left].concreteSyntax||history.afterMeta!==result.versions[right].concreteSyntax||history.inverse!==before)fail('complete predecessor equation/inverse differs');const id=result.equations.length;retained.append(result.equations,{path,language,beforeVersion:left,afterVersion:right,inverseVersion:left,trace:history.trace});return id;}
 for(const row of plan.rows){const chain=[];for(let at=1;at<row.stages.length;at++)chain.push(equation(row.path,row.language,row.stages[at-1].source,row.stages[at].source));retained.append(result.chains,{path:row.path,profiles:row.stages.map(stage=>stage.profile),equations:chain,predecessorPaths:row.predecessorPaths});retained.append(result.substitutions,{path:row.path,language:row.language,before:row.physicalBefore,after:row.after});}
 for(const row of plan.additions){equation(row.path,row.language,row.source,row.source);retained.append(result.additions,row);}index.clear();accountPrimitiveVectorIteratorBulkData(result);return result;
});}
