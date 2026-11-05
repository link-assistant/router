// Reusable source construction, never a semantic or original-owner issuer.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {types} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {nativeSourceHistoryFiles,collectNativeSourceDescendants,nativeSourceHistoryOriginalGuards,nativeSourceHistoryOverlap} from './native-source-descendants.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Native substitution source copy: '+message);};
function currentSource(path,allowMissing=false){try{return readFileSync(path,'utf8');}catch(error){if(allowMissing&&error.code==='ENOENT')return null;throw error;}}
function localPath(root,path){
 need(typeof path==='string'&&path.length>0&&!isAbsolute(path),'relative source path');
 const absolute=resolve(root,path),local=relative(root,absolute);
 need(local!==''&&!local.startsWith('../')&&!isAbsolute(local),'source remains inside repository');return absolute;
}
function parsed(ts,path,source){
 need(typeof source==='string'&&Buffer.byteLength(source)<=8388608,'bounded complete primitive source');
 need(source.split('\n').length-(source.endsWith('\n')?1:0)<1000,'original repository file-size convention');
 const operation=__nativeSourceOperation,reuse=originalNativeSourceOperationCurrent(operation,ts);let file=reuse?operation.files.get(path)?.get(source):null;
 if(!file)file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 need(!file.parseDiagnostics.length,'complete native source grammar');
 if(reuse&&!operation.files.get(path)?.has(source)){
  const bytes=Buffer.byteLength(source);if(bytes<=4194304){if(operation.entries>=64||operation.bytes+bytes>4194304){operation.files.clear();operation.entries=0;operation.bytes=0;}if(!operation.files.has(path))operation.files.set(path,new Map());operation.files.get(path).set(source,file);operation.entries++;operation.bytes+=bytes;}
 }
 return file;
}
function nativeOwner(ts,file,edit,select){
 const {start,end,expected,owner}=edit;
 need(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>=start&&end<=file.text.length&&file.text.slice(start,end)===expected,'exact original edit span');
 need(typeof edit.replacement==='string','primitive replacement source');
 if(owner.kind==='end-of-module'){
  need(start===file.text.length&&end===start&&expected==='','native module-end append');return {kind:owner.kind,span:[start,end]};
 }
 let matches=select(owner);if(Object.hasOwn(owner,'span')){need(owner.kind==='import'&&Array.isArray(owner.span)&&owner.span.length===2&&owner.span.every(Number.isSafeInteger),'complete original import declaration span required');matches=matches.filter(node=>node.getStart(file)===owner.span[0]&&node.end===owner.span[1]);}need(matches.length===1,'unique native-selected original owner');const node=matches[0];
 need(start>=node.getStart(file)&&end<=node.end,'whole edit belongs to original native owner');
  return {kind:owner.kind,name:owner.name,...(owner.kind==='call'?{argument:owner.argument}:{}),span:[node.getStart(file),node.end],editSpan:[start,end]};
}
function substitute(ts,path,before,edits){
 need(Array.isArray(edits)&&edits.length<=128,'bounded ordered substitution sequence');
 const file=parsed(ts,path,before),select=createNativeSourceOwnerIndex(ts,file,edits),selections=edits.map(edit=>nativeOwner(ts,file,edit,select));
 const ordered=edits.map((edit,index)=>({...edit,index})).sort((a,b)=>a.start-b.start||a.end-b.end||a.index-b.index);
 let cursor=0,after='';for(const edit of ordered){need(edit.start>=cursor,'nonoverlapping native source substitutions');after+=before.slice(cursor,edit.start)+edit.replacement;cursor=edit.end;}after+=before.slice(cursor);
 parsed(ts,path,after);return {after,selections};
}

/** Full inputs and rules are freshly read. A digest fixes a copy, not meaning. */
export function prepareNativeSubstitutionCopy({root,archive,pin,id,laterPlans=[]}={}){
 if(!__nativeSourceOperation)return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive,pin,id,laterPlans}));
 root=resolve(root);const archivePath=localPath(root,archive),packed=readFileSync(archivePath);
 need(packed.length<=8388608&&hash(packed)===pin,'complete pinned original/rule archive');
 const original=JSON.parse(gunzipSync(packed,{maxOutputLength:16777216}));
 need(original.schema==='native-substitution-source-copy-v1'&&original.id===id&&Array.isArray(original.files)&&original.files.length>0&&original.files.length<=64,'whole source-copy family');
 need(Array.isArray(laterPlans)&&laterPlans.length<=16,'bounded explicit later source DATA layers');
 const ts=ownershipCompiler();need(ts.version==='5.9.3','lockfile TypeScript 5.9.3');const seen=new Set(),files=[],originalGuards=[],descendantFiles=collectNativeSourceDescendants(laterPlans,new Set(original.files.map(row=>row.path)));
 for(const row of original.files){
  const path=localPath(root,row.path);need(!seen.has(path),'unique complete original file');seen.add(path);
  const before=row.source;need(hash(before)===row.sha256&&Buffer.byteLength(before)===row.bytes,'complete original source bytes');
  if(row.originalPath&&row.originalPath!==row.path){const originalPath=localPath(root,row.originalPath);need(readFileSync(originalPath,'utf8')===before,'complete physical original implementation differs');originalGuards.push({path:originalPath,source:before});}
  const language=substitute(ts,path,before,row.languageEdits),repository=substitute(ts,path,language.after,row.repositoryEdits),after=repository.after;
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'javascript:native-selected-source-copy-substitutions',apply:value=>{need(value===before,'whole original join');return language.after;}}]},
   {phase:'repository',rules:[{id:id+':repository-format-and-source-issuer-integration',apply:value=>{need(value===language.after,'whole language join');return after;}}]},
  ]).run(before);
  const stages=transportConcreteSourceEquations([{before,after:language.after,language:'JavaScript'},{before:language.after,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
  need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language.after,'full serialized/reparsed CST equations and inverses');
  let currentAfter=after;const laterHistories=[],parallelHistories=[];
  for(const later of laterPlans){
   need(later.schema==='native-substitution-source-copy-plan-v1'&&Array.isArray(later.files)&&later.sourceAuthority===false&&later.semanticAuthority===false,'later layer is source equation DATA only');
   const candidates=nativeSourceHistoryFiles(later).filter(value=>value.path===row.path);need(candidates.length<=1,'unique later source equation');
   if(!candidates.length)continue;const next=candidates[0];if(next.before!==currentAfter){const overlap=nativeSourceHistoryOverlap({before,after,language:language.after,currentAfter,laterHistories,parallelHistories},next);need(overlap&&next.inverse===next.before,'complete adjacent or overlapping source history join');parsed(ts,path,next.currentAfter??next.after);parallelHistories.push({...next,overlapEquation:overlap.equation});continue;}need(next.inverse===next.before,'complete adjacent source history inverse');
   const end=next.currentAfter??next.after;parsed(ts,path,end);
   const equation=transportConcreteSourceEquations([{before:currentAfter,after:end,language:'JavaScript'}])[0];need(equation.inverse===currentAfter,'complete later source inverse');
   laterHistories.push({id:later.id,before:currentAfter,after:end,equation,stages:next.stages,laterHistories:next.laterHistories??[],parallelHistories:next.parallelHistories??[],path:next.path,...(next.originalPath?{originalPath:next.originalPath,originalSource:next.before}:{}),sourceAuthority:false,semanticAuthority:false});currentAfter=end;
  }
  const current=currentSource(path,Boolean(row.originalPath&&row.originalPath!==row.path));need(current===null||current===before||current===after||current===currentAfter,'unknown physical copied implementation');
  files.push({path:row.path,...(row.originalPath?{originalPath:row.originalPath}:{}),before,language:language.after,after,current,currentAfter,laterHistories,parallelHistories,stages,trace:run.trace,nativeSelections:{language:language.selections,repository:repository.selections},inverse:before});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.currentAfter})));
 files.forEach((row,index)=>{row.nativeBindings=bindings[index];need(currentSource(resolve(root,row.path),Boolean(row.originalPath&&row.originalPath!==row.path))===row.current,'physical source changed during construction');});
 for(const original of originalGuards)need(readFileSync(original.path,'utf8')===original.source,'complete original implementation changed');
 for(const later of laterPlans)for(const row of nativeSourceHistoryFiles(later)){need(currentSource(localPath(root,row.path),Boolean(row.originalPath&&row.originalPath!==row.path))===row.current,'complete descendant physical source changed');if(row.originalPath&&row.originalPath!==row.path)need(currentSource(localPath(root,row.originalPath))===row.before,'complete descendant original implementation changed');}
 for(const later of laterPlans)for(const guard of nativeSourceHistoryOriginalGuards(later))need(currentSource(localPath(root,guard.path))===guard.source,'complete nested descendant original implementation changed');
 need(readFileSync(archivePath).equals(packed),'complete original/rule input changed');
 return {schema:'native-substitution-source-copy-plan-v1',id,files,descendantFiles,originalInputs:original.files,sourceAuthority:false,semanticAuthority:false,receivingExecuted:false};
}

export function writeNativeSubstitutionCopy(plan,{root}={}){
 // The producer must be called again by the caller immediately before applying.
 // This low-level writer is a development operation; it issues no gate stamp.
 root=resolve(root);for(const row of plan.files)need(currentSource(localPath(root,row.path),Boolean(row.originalPath&&row.originalPath!==row.path))===row.current,'stale copy proposal');
 for(const row of plan.files)writeFileSync(localPath(root,row.path),row.currentAfter??row.after);
}

// Private syntax trees live only inside one complete synchronous source
// operation. They never supply source binding, owner or semantic verdicts.
let __nativeSourceOperation=null;
function originalNativeSourceOperationCurrent(operation,ts){
 if(!operation||operation.disabled)return false;
 if(operation.compiler&&operation.compiler!==ts||!ownershipCompilerRuntimeNativeCurrent(ts)){operation.files.clear();operation.entries=0;operation.bytes=0;operation.disabled=true;return false;}
 operation.compiler=ts;return true;
}
export function withNativeSubstitutionOperation(operation){
 need(typeof operation==='function'&&!types.isProxy(operation)&&!types.isAsyncFunction(operation),'one synchronous original source operation required');
 const previous=__nativeSourceOperation,frame=previous??{compiler:null,disabled:false,files:new Map(),entries:0,bytes:0,depth:0};need(frame.depth<256,'bounded complete nested source operation');frame.depth++;__nativeSourceOperation=frame;
 try{const result=operation();need(!types.isPromise(result)&&!(result&&typeof result==='object'&&types.isProxy(result)),'source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');need(!then||Object.hasOwn(then,'value')&&typeof then.value!=='function','source operation cannot return an own thenable/accessor');}return result;}
 finally{frame.depth--;if(!previous){frame.files.clear();frame.entries=0;frame.bytes=0;frame.compiler=null;}__nativeSourceOperation=previous;}
}
export function nativeSubstitutionCopyHasChanges(plan){return nativeSourceHistoryFiles(plan).some(row=>row.current!==(row.currentAfter??row.after));}

import {createNativeSourceOwnerIndex} from './native-source-owner-index.mjs';
