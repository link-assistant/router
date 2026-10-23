// Reusable source construction, never a semantic or original-owner issuer.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Native substitution source copy: '+message);};
function localPath(root,path){
 need(typeof path==='string'&&path.length>0&&!isAbsolute(path),'relative source path');
 const absolute=resolve(root,path),local=relative(root,absolute);
 need(local!==''&&!local.startsWith('../')&&!isAbsolute(local),'source remains inside repository');return absolute;
}
function parsed(ts,path,source){
 need(typeof source==='string'&&Buffer.byteLength(source)<=8388608,'bounded complete primitive source');
 need(source.split('\n').length-(source.endsWith('\n')?1:0)<1000,'original repository file-size convention');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 need(!file.parseDiagnostics.length,'complete native source grammar');return file;
}
function nativeOwner(ts,file,edit){
 const {start,end,expected,owner}=edit;
 need(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>=start&&end<=file.text.length&&file.text.slice(start,end)===expected,'exact original edit span');
 need(typeof edit.replacement==='string','primitive replacement source');
 if(owner.kind==='end-of-module'){
  need(start===file.text.length&&end===start&&expected==='','native module-end append');return {kind:owner.kind,span:[start,end]};
 }
 let matches=[];
 const visit=node=>{
  if(owner.kind==='function'&&ts.isFunctionDeclaration(node)&&node.name?.text===owner.name||owner.kind==='import'&&ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text===owner.name)matches.push(node);
  ts.forEachChild(node,visit);
 };
 visit(file);need(matches.length===1,'unique native-selected original owner');const node=matches[0];
 need(start>=node.getStart(file)&&end<=node.end,'whole edit belongs to original native owner');
 return {kind:owner.kind,name:owner.name,span:[node.getStart(file),node.end],editSpan:[start,end]};
}
function substitute(ts,path,before,edits){
 need(Array.isArray(edits)&&edits.length<=128,'bounded ordered substitution sequence');
 const file=parsed(ts,path,before),selections=edits.map(edit=>nativeOwner(ts,file,edit));
 const ordered=edits.map((edit,index)=>({...edit,index})).sort((a,b)=>a.start-b.start||a.end-b.end||a.index-b.index);
 let cursor=0,after='';for(const edit of ordered){need(edit.start>=cursor,'nonoverlapping native source substitutions');after+=before.slice(cursor,edit.start)+edit.replacement;cursor=edit.end;}after+=before.slice(cursor);
 parsed(ts,path,after);return {after,selections};
}

/** Full inputs and rules are freshly read. A digest fixes a copy, not meaning. */
export function prepareNativeSubstitutionCopy({root,archive,pin,id}={}){
 root=resolve(root);const archivePath=localPath(root,archive),packed=readFileSync(archivePath);
 need(packed.length<=8388608&&hash(packed)===pin,'complete pinned original/rule archive');
 const original=JSON.parse(gunzipSync(packed,{maxOutputLength:16777216}));
 need(original.schema==='native-substitution-source-copy-v1'&&original.id===id&&Array.isArray(original.files)&&original.files.length>0&&original.files.length<=64,'whole source-copy family');
 const ts=ownershipCompiler();need(ts.version==='5.9.3','lockfile TypeScript 5.9.3');const seen=new Set(),files=[];
 for(const row of original.files){
  const path=localPath(root,row.path);need(!seen.has(path),'unique complete original file');seen.add(path);
  const before=row.source;need(hash(before)===row.sha256&&Buffer.byteLength(before)===row.bytes,'complete original source bytes');
  const language=substitute(ts,path,before,row.languageEdits),repository=substitute(ts,path,language.after,row.repositoryEdits),after=repository.after;
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'javascript:native-selected-source-copy-substitutions',apply:value=>{need(value===before,'whole original join');return language.after;}}]},
   {phase:'repository',rules:[{id:id+':repository-format-and-source-issuer-integration',apply:value=>{need(value===language.after,'whole language join');return after;}}]},
  ]).run(before);
  const stages=transportConcreteSourceEquations([{before,after:language.after,language:'JavaScript'},{before:language.after,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
  need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language.after,'full serialized/reparsed CST equations and inverses');
  const current=readFileSync(path,'utf8');need(current===before||current===after,'unknown physical copied implementation');
  files.push({path:row.path,before,language:language.after,after,current,stages,trace:run.trace,nativeSelections:{language:language.selections,repository:repository.selections},inverse:before});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));
 files.forEach((row,index)=>{row.nativeBindings=bindings[index];need(readFileSync(resolve(root,row.path),'utf8')===row.current,'physical source changed during construction');});
 need(readFileSync(archivePath).equals(packed),'complete original/rule input changed');
 return {schema:'native-substitution-source-copy-plan-v1',id,files,originalInputs:original.files,sourceAuthority:false,semanticAuthority:false,receivingExecuted:false};
}

export function writeNativeSubstitutionCopy(plan,{root}={}){
 // The producer must be called again by the caller immediately before applying.
 // This low-level writer is a development operation; it issues no gate stamp.
 root=resolve(root);for(const row of plan.files)need(readFileSync(localPath(root,row.path),'utf8')===row.current,'stale copy proposal');
 for(const row of plan.files)writeFileSync(localPath(root,row.path),row.after);
}
