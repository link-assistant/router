import {captureProtectedFlatWriterSourceSuccessor} from './protected-flat-writer-20261102-history.mjs';
import {forwardFailureField} from './forward-output-ownership-20261101-failure.mjs';
import {createForwardSourceEquationBank,resolveForwardSourceEquation} from './forward-output-ownership-20261101-source-equation-bank.mjs';
import {retainForwardSourceProposalAccounting} from './forward-output-ownership-20261101-source-accounting.mjs';
// Fixed complete source succession DATA; no semantic/type/owner issuer.
// SOURCE ONLY / UNRUN. Normal production requires the complete AFTER cohort.
// Bootstrap targets are proposal preimages only, never active qualification.
import fs from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';
import {acquireSelectedSourceIndexImage,withSelectedSourceIndexHandle,verifySelectedSourceIndexImage,closeSelectedSourceIndexImage} from './selected-source-reader-20261101-index.mjs';
import {captureSelectedSourceGitEnvelope} from './selected-source-reader-20261101-metadata.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/forward-output-ownership-20261101/';
const ARCHIVE=P+'complete-source-equations.json',SELF='tools/translation/forward-output-ownership-20261101-source-history.mjs',AUTHOR=P+'authored/source-history.mjs.txt',EMPTY=P+'originals/empty-source.mjs.txt';
// Source-author pins are filled only after the complete source cohort is fixed.
const ARCHIVE_SHA='a01bf900a0c86ee7d14d38dda3484fcef693a6fa74063f963b69de9247408139',ARCHIVE_BYTES=2856467;
const EDGE_ORIGINALS=new Map([['tools/translation/js-to-rust/vendor/module-syntax.mjs',P+'originals/runtime-import-birth__module-syntax.mjs.txt'],['scripts/regenerate-js-first.mjs',P+'originals/runtime-import-birth__regenerate-js-first.mjs.txt'],['tools/translation/js-to-rust/native-typescript.mjs',P+'originals/runtime-import-birth__native-typescript.mjs.txt']]);
const MiB=1024*1024,hash=value=>createHash('sha256').update(value).digest('hex');
const need=(yes,message)=>{if(!yes)throw new TypeError('Fixed forward source chronology: '+message);};
const same=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>same(value,b[index]));
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());
const nativeStat=file=>fs.lstatSync(file,{bigint:true});
function optionalStat(file){try{return nativeStat(file);}catch(error){if(forwardFailureField(error,'code')==='ENOENT')return null;throw error;}}
function relative(name){need(typeof name==='string'&&Buffer.byteLength(name)<=4096&&name&&!/[\\\0:]/u.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'ordinary fixed source path required');return name;}
function close(run,checks){let value,failed=false,primary;const secondary=[];try{value=run();}catch(error){failed=true;primary=error;}for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}if(failed){if(primary&&typeof primary==='object')try{Object.defineProperty(primary,'forwardSourceClosingFailures',{value:secondary,enumerable:true});}catch{}throw primary;}return value;}
// One privately issued, read-only index image survives async preparer steps.
// Every Git index query uses its genuine isolated image; no original shared
// index query may freshen timestamps and invalidate our own closing fence.
function gitEnvelope(root){
 const handle=acquireSelectedSourceIndexImage(root);let metadata;
 try{metadata=withSelectedSourceIndexHandle(handle,()=>captureSelectedSourceGitEnvelope(root));}
 catch(error){try{closeSelectedSourceIndexImage(handle);}catch{}throw error;}
 return {read:(name,maxBytes)=>withSelectedSourceIndexHandle(handle,()=>readSelectedTrackedSourceBytes(root,name,{maxBytes})),verify:()=>verifySelectedSourceIndexImage(handle),close:()=>closeSelectedSourceIndexImage(handle),describe:()=>metadata};
}
function sourceCapture(requested,names){
 const root=fs.realpathSync(resolve(requested)),records=new Map(),parents=new Map(),namespace=gitEnvelope(root);let used=0,closed=false;
 const parentState=file=>{const stat=optionalStat(file);if(stat===null)return {identity:null,names:null};need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary source ancestor required');checkBoundedSourcePath(file);const children=fs.readdirSync(file).sort();need(same(stamp(nativeStat(file)),stamp(stat)),'source ancestor changed during full census');return {identity:stamp(stat),names:children};};
 const captureParents=name=>{let file=root;const list=[];for(const part of ['',...relative(name).split('/').slice(0,-1)]){if(part)file=join(file,part);const previous=parents.get(file),current=parentState(file);if(previous)need(same(previous.identity,current.identity)&&same(previous.names,current.names),'original source ancestor changed');else parents.set(file,current);list.push(file);}return list;};
 const verifyParents=()=>{for(const [file,expected]of parents){const now=parentState(file);need(same(now.identity,expected.identity)&&same(now.names,expected.names),'complete source ancestor identity/census changed');}};
 const capture=(name,{optional=false}={})=>{
  need(!closed,'closed source chronology');relative(name);captureParents(name);const full=resolve(root,name),before=optionalStat(full);let bytes=null,source='',available=before!==null;
  if(before===null){need(optional,'required compiler source missing: '+name);need(optionalStat(full)===null,'absent source appeared during observation');}
  else{need(before.isFile()&&!before.isSymbolicLink()&&before.size<=8n*BigInt(MiB),'ordinary bounded complete source required');bytes=namespace.read(name,8*MiB);source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);need(same(stamp(before),stamp(nativeStat(full))),'source replaced during complete read');}
  verifyParents();const identity=before?stamp(before):null,prior=records.get(name);
  if(prior)need(prior.available===available&&same(prior.identity,identity)&&(bytes===null?prior.bytes===null:prior.bytes?.equals(bytes)),'complete source observation changed');
  else{need(records.size<256,'source chronology physical-file count');used+=(bytes?.length??0)*2;need(used<=64*MiB,'source chronology retained physical byte occurrences');records.set(name,{name,available,identity,bytes:bytes?Buffer.from(bytes):null,source});}
  return {source,available,identity:identity?[...identity]:null,mode:before?Number(before.mode&0o777n):null};
 };
 return {root,capture,describeGit:namespace.describe,close(){need(!closed,'source chronology already closed');const checks=[()=>namespace.verify(),()=>verifyParents()];for(const [name,row]of records)checks.push(()=>{const before=optionalStat(resolve(root,name));if(!row.available){need(before===null,'absent original target appeared');return;}need(before&&same(stamp(before),row.identity),'source chronology identity changed');need(namespace.read(name,8*MiB).equals(row.bytes),'complete source chronology bytes changed');});checks.push(()=>namespace.close());try{close(()=>{},checks);}finally{closed=true;records.clear();parents.clear();}}};
}
function equation(before,after,label){
 const left=transportConcreteSyntaxSource(before,{language:'JavaScript'}),right=transportConcreteSyntaxSource(after,{language:'JavaScript'}),edits=before===after?[]:[{span:[0,before.length],expected:before,replacement:after}],undo=before===after?[]:[{span:[0,after.length],expected:after,replacement:before}];
 const run=applyConcreteSyntaxSubstitutions(left.meta,{languageRules:[{id:'javascript:'+label,edits}],repositoryRules:[{id:'router:retain-complete-physical-source-coordinate',edits:[]}]}),inverse=applyConcreteSyntaxSubstitutions(right.meta,{languageRules:[{id:'javascript:undo-'+label,edits:undo}],repositoryRules:[{id:'router:restore-complete-physical-source-coordinate',edits:[]}]});
 need(run.value.source===after&&inverse.value.source===before&&transportConcreteSyntaxMeta(left.meta).source===before&&transportConcreteSyntaxMeta(right.meta).source===after,'complete source/CST/two-phase inverse differs');
 return {before,after,inverse:before,beforeMeta:left.meta,afterMeta:right.meta,trace:run.trace,inverseTrace:inverse.trace,sourceAuthority:false,semanticAuthority:false};
}
function requireEquation(value,before,after){need(value&&value.before===before&&value.after===after&&value.inverse===before&&transportConcreteSyntaxMeta(value.beforeMeta).source===before&&transportConcreteSyntaxMeta(value.afterMeta).source===after&&same(value.trace.map(row=>row.phase),['language','repository'])&&same(value.inverseTrace.map(row=>row.phase),['language','repository']),'current full source equation differs');}
function openFixedForwardWriterSources(root=ROOT){
 root=fs.realpathSync(resolve(root));const captured=sourceCapture(root,[]);let raw,profile;
 try{const source=captured.capture(ARCHIVE).source;raw=Buffer.from(source,'utf8');need(raw.length===ARCHIVE_BYTES&&hash(raw)===ARCHIVE_SHA,'complete immutable source equation cohort differs');profile=JSON.parse(source);}catch(error){try{captured.close();}catch{}throw error;}
 const caseInput='tools/translation/test/native-output-text-retention.test.mjs',caseOutput='tools/translation/test/flat-native-output-text-retention.test.mjs';
 try{need(profile.schema==='router-forward-output-whole-source-equations-20261101-v2'&&Array.isArray(profile.files)&&profile.files.length<=128&&Array.isArray(profile.cases)&&profile.cases.length<=32&&Array.isArray(profile.preparerCaseSources)&&profile.preparerCaseSources.length===2,'closed complete source chronology required');
 need(profile.preparerCaseSources[0].path===caseInput&&profile.preparerCaseSources[1].path===caseOutput&&!profile.preparerCaseSources[0].optionalGeneratedTarget&&profile.preparerCaseSources[1].optionalGeneratedTarget,'only the original flat preparer testcase input/output roles are proposal-only');}catch(error){try{captured.close();}catch{}throw error;}
 const rows=new Map(),current=new Map();
 const finish=()=>captured.close();
 try{
  need(captured.capture(ARCHIVE).source===raw.toString('utf8'),'source archive changed during opening');const authorBefore=captured.capture(AUTHOR).source,authorSuccessor=captureProtectedFlatWriterSourceSuccessor(captured.capture,SELF,authorBefore);need(captured.capture(SELF).source===(authorSuccessor?.after??authorBefore),'complete executing helper/authored successor differs');
  for(const item of [...profile.files,...profile.preparerCaseSources]){
   need(item&&typeof item.path==='string'&&typeof item.originalPath==='string'&&typeof item.before==='string'&&typeof item.after==='string'&&Array.isArray(item.inputPaths)&&item.inputPaths.length<=4&&typeof item.optionalGeneratedTarget==='boolean'&&!rows.has(item.path),'complete fixed runtime source row required');
   const sourceSuccessor=captureProtectedFlatWriterSourceSuccessor(captured.capture,item.path,item.after);const row=Object.freeze({...item,...(sourceSuccessor?{after:sourceSuccessor.after,historicalAfter:item.after,laterHistories:[sourceSuccessor]}:{}),inputPaths:Object.freeze([...item.inputPaths])});relative(row.path);relative(row.originalPath);for(const name of row.inputPaths)relative(name);
   need(captured.capture(row.originalPath).source===row.before,'complete immutable original source differs: '+row.originalPath);if(Object.hasOwn(row,'originalProducerSource')){need(EDGE_ORIGINALS.get(row.path)===row.originalProducerSourcePath&&row.optionalGeneratedTarget&&typeof row.originalProducerSource==='string'&&captured.capture(row.originalProducerSourcePath).source===row.originalProducerSource,'fixed complete original RuntimeImport birth source differs');}rows.set(row.path,row);
   if(profile.files.includes(item)){const now=captured.capture(row.path,{optional:row.optionalGeneratedTarget});need(now.available?(now.source===row.after||row.optionalGeneratedTarget&&(now.source===row.before||typeof row.originalProducerSource==='string'&&now.source===row.originalProducerSource)):row.optionalGeneratedTarget,'unknown compiler source bytes refused: '+row.path);current.set(row.path,Object.freeze(now));}
  }
  const state=name=>{let value=current.get(name);if(value)return value;const fixed=rows.get(name);need(fixed&&(name===caseInput||name===caseOutput),'closed fixed source coordinate required');value=captured.capture(name,{optional:name===caseOutput});need(value.available?(value.source===fixed.after||name===caseOutput&&value.source===fixed.before):name===caseOutput,'unknown physical original preparer testcase source');current.set(name,Object.freeze(value));return value;};
  const requireActive=()=>{for(const item of profile.files){const name=item.path,row=rows.get(name),value=state(name);need(value.available&&value.source===row.after,'bootstrap/predecessor compiler is proposal-only, not active production: '+name);}};
  const before=(path,source)=>{const row=rows.get(path);return row&&source===row.after?row.before:source;};
  const compose=(row,field)=>{
   const fixed=rows.get(row.path);if(!fixed)return row;
   const target=state(row.path);
   if(row[field]===fixed.after&&row.currentSourceEquation){requireEquation(resolveForwardSourceEquation(row),target.source,fixed.after);need(row.currentSourceEquation.beforePresent===target.available&&row.currentSourceEquation.beforeMode===target.mode&&same(row.currentSourceEquation.beforeIdentity,target.identity),'current target preimage coordinate changed');return row;}
   if(row[field]!==fixed.before)return row;
   const original=row.source??row.before??row.inverse;need(typeof original==='string','complete original producer source required');
   let input,actualInput,inputPresent;
   if(Object.hasOwn(fixed,'originalProducerSource')){
    need(EDGE_ORIGINALS.get(row.path)===fixed.originalProducerSourcePath&&original===fixed.originalProducerSource,'complete actual original RuntimeImport producer source differs');const physical=captured.capture(fixed.originalProducerSourcePath);need(physical.source===original,'complete immutable original producer input changed');input={path:fixed.originalProducerSourcePath,current:physical,row:{before:original,after:original}};actualInput=original;inputPresent=true;
   }else{
    const historicalArgument=row.currentSource??original,inputs=fixed.inputPaths.map(path=>({path,row:rows.get(path),current:state(path)})),matches=inputs.filter(value=>value.row&&value.row.before===historicalArgument);need(matches.length===1,'one fixed complete original producer input coordinate required: '+row.path);input=matches[0];actualInput=input.current?.source;inputPresent=input.current?.available??false;if(!inputPresent){need(fixed.freshProducedInput===true,'required actual original producer input missing');actualInput=input.row.after;}
   }
   const bank=createForwardSourceEquationBank(),normal=bank.equation(actualInput,original,'normalize-current-to-original-producer'),historical=bank.equation(original,fixed.before,'reproduce-complete-original-producer'),successor=bank.equation(fixed.before,fixed.after,'append-fixed-reviewed-source-successor'),currentProducer=bank.equation(actualInput,fixed.after,'complete-current-producer-source'),targetEquation=bank.equation(target.source,fixed.after,'complete-current-target-source');
   Object.assign(targetEquation,{path:row.path,beforePresent:target.available,beforeMode:target.mode,beforeIdentity:target.identity,inputPath:input.path,inputPresent,inputIdentity:input.current?.identity??null,inputMode:input.current?.mode??null,proposalOnly:true,activeCompilerQualification:false});
   const result={...row,[field]:fixed.after,currentSourceDataBank:bank.finish(),currentSourceEquation:targetEquation,currentProducerEquation:{...currentProducer,inputPath:input.path,inputPresent,inputIdentity:input.current?.identity??null,inputMode:input.current?.mode??null,inputKind:Object.hasOwn(fixed,'originalProducerSource')?'complete-immutable-original-producer-source':inputPresent?'actual-physical-source':'fresh-original-producer-data'},normalizationEquation:normal,historicalProducerEquation:historical,forwardOutputCustodySuccessor:successor,historicalProgram:{...row,coordinate:'complete-original-producer'},traceCoordinate:'historical-original-producer',stagesCoordinate:'historical-original-producer',sourceAuthority:false,semanticAuthority:false};
   requireEquation(resolveForwardSourceEquation(result),target.source,fixed.after);const currentProducerData=resolveForwardSourceEquation(result,currentProducer);
   if('source'in row)result.source=actualInput;if('before'in row)result.before=actualInput;if('inverse'in row)result.inverse=actualInput;if('beforeMeta'in row)result.beforeMeta=currentProducerData.beforeMeta;if('afterMeta'in row)result.afterMeta=currentProducerData.afterMeta;if('currentSource'in row)result.currentSource=actualInput;
   if('sourceSha256'in row)result.sourceSha256=hash(actualInput);if('beforeSha256'in row)result.beforeSha256=hash(actualInput);if('sha256'in row)result.sha256=hash(fixed.after);if('afterSha256'in row)result.afterSha256=hash(fixed.after);
   if(row.nativeBindings){result.nativeBindings=verifyNativeCopiedSourceBindingBatch(ownershipCompiler(),[{path:resolve(root,row.path),source:fixed.after}])[0];result.currentSourceEquation.nativeBindingsRole='current-row-nativeBindings';result.nativeCopiesCoordinate='historical-original-producer';}
   return result;
  };
  const producedInput=(path,after)=>{const fixed=rows.get(path);need(fixed&&fixed.optionalGeneratedTarget&&fixed.after===after,'one exact fresh original producer output source required');const physical=state(path);return Object.freeze({path,source:physical.available?physical.source:null,present:physical.available,mode:physical.mode,identity:physical.identity,producedSource:after});};
  const verifyCurrent=(row,field)=>{const fixed=rows.get(row.path);if(!fixed)return row;need(row[field]===fixed.after,'fixed current target source differs');const physical=state(row.path);requireEquation(resolveForwardSourceEquation(row),physical.source,fixed.after);need(row.currentSourceEquation.beforePresent===physical.available&&row.currentSourceEquation.beforeMode===physical.mode&&same(row.currentSourceEquation.beforeIdentity,physical.identity),'current target full preimage identity differs');return row;};
  const cases=()=>profile.cases.map(item=>{need(item&&typeof item.before==='string'&&typeof item.after==='string'&&typeof item.path==='string'&&typeof item.originalPath==='string','complete independent case source required');need(captured.capture(item.originalPath).source===item.before&&captured.capture(item.path).source===item.after,'complete live case source or original changed');return Object.freeze({...item});});
  return {history:Object.freeze({before,compose,verifyCurrent,producedInput,requireActive,rows:()=>[...rows.values()],cases,states:()=>[...current].map(([path,state])=>({path,...state})),author:()=>{need(captured.capture(EMPTY).source==='','complete new-helper original source must be empty');const historicalAfter=captured.capture(AUTHOR).source,successor=captureProtectedFlatWriterSourceSuccessor(captured.capture,SELF,historicalAfter),after=successor?.after??historicalAfter;need(captured.capture(SELF).source===after,'executing source-history helper changed');return {path:SELF,originalPath:EMPTY,before:'',after,historicalAfter,laterHistories:successor?[successor]:[],inputPaths:[],optionalGeneratedTarget:false,coordinate:'complete-new-source-history-author'};},git:captured.describeGit()}),close:finish};
 }catch(error){try{finish();}catch{}throw error;}
}
export function withFixedForwardWriterSources(root=ROOT,operation){const context=openFixedForwardWriterSources(root);return withCompleteSourceClosingFence(()=>operation(context.history),[()=>context.close()]);}
export async function withFixedForwardWriterSourcesAsync(root=ROOT,operation){const context=openFixedForwardWriterSources(root);let result,failed=false,primary;try{result=await operation(context.history);}catch(error){failed=true;primary=error;}try{context.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;}
export function assertActiveForwardCompilerSources(root=ROOT){return withFixedForwardWriterSources(root,history=>history.requireActive());}
export function proposeForwardOutputOwnershipSourceHistory({root=ROOT}={}){
 return withFixedForwardWriterSources(root,history=>{
  const originals=[...history.rows(),...history.cases(),history.author()],bindings=verifyNativeCopiedSourceBindingBatch(ownershipCompiler(),originals.map(row=>({path:resolve(root,row.path),source:row.after}))),files=[];
  for(let at=0;at<originals.length;at++){const row=originals[at],whole=equation(row.before,row.after,'complete-fixed-forward-source-cohort');files.push({...row,...whole,nativeBindings:bindings[at]});}
  return retainForwardSourceProposalAccounting({schema:'complete-forward-output-ownership-source-history-20261101',files,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN',runtimeCompilerRequiresAllAfter:true,bootstrapTargetsGrantNoActiveQualification:true});
 });
}
