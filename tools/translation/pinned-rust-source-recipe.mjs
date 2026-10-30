// Source-construction DATA only. A pinned recipe grants no Rust type,
// namespace, ownership, effect, executable or runtime-parity authority.
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {types} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Pinned Rust source recipe: '+message);};
const MAX_BYTES=8388608,MAX_FILES=32,MAX_EDITS=128;
function local(root,path){
 need(typeof path==='string'&&path.length<4096&&!isAbsolute(path)&&!path.includes('\\')&&!/[\x00-\x1f:]/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical relative path required');
 const absolute=resolve(root,path),name=relative(root,absolute);
 need(name&&!name.startsWith('../')&&!isAbsolute(name),'path must remain inside source root');
 // Reject both leaf and intermediate symlinks before reading pinned inputs.
 need(!lstatSync(absolute).isSymbolicLink()&&realpathSync(absolute)===absolute&&lstatSync(absolute).isFile(),'ordinary current source file required');return absolute;
}
function fields(value,names){
 need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype,'JSON source record required');
 const keys=Object.keys(value);need(keys.length===names.length&&names.every(key=>Object.hasOwn(value,key)),'closed complete source record required');return value;
}
function sequence(value,bound,label){need(Array.isArray(value)&&value.length<=bound&&value.every((_,at)=>Object.hasOwn(value,at)),label+' bound');return value;}
function edit(value,source,items,call){
 const extra=['ownerKind','operandRecipe','replacementOperand'].filter(name=>Object.hasOwn(value,name));fields(value,['span','expected','replacement','owner','operation','operand','ownership',...extra]);
 need(Array.isArray(value.span)&&value.span.length===2&&value.span.every(Number.isSafeInteger),'exact UTF-16 source span required');
 const [start,end]=value.span;need(start>=0&&end>start&&end<=source.length&&source.slice(start,end)===value.expected&&typeof value.replacement==='string','complete original edit differs');
 need(typeof value.owner==='string'&&typeof value.operation==='string'&&typeof value.operand==='string'&&typeof value.ownership==='string','primitive recipe description required');
 const left=call?start:start+value.expected.length-value.expected.trimStart().length,right=call?end:end-(value.expected.length-value.expected.trimEnd().length);
 const owners=items.filter(item=>!item.comment&&item.start<=left&&item.end>=right),ownerKind=value.ownerKind??'fn';need(['fn','impl'].includes(ownerKind),'explicit lexical item kind required');
 need(owners.length===1&&owners[0].name===value.owner&&(call?owners[0].term===ownerKind:['local-import','format'].includes(value.operation)?owners[0].term===ownerKind:value.operation==='import'&&owners[0].term==='use'),'unique original lexical item required');
 const tokens=rustTokens(value.expected).filter(token=>token.type!=='comment');
 need(tokens.length>0&&(!call||tokens[0].start===0&&tokens.at(-1).end===value.expected.length),'complete token-bounded substitution required');
 const originalTokens=owners[0].tokens.filter(token=>token.start<end&&token.end>start);
 need(originalTokens.length>0&&originalTokens.every(token=>token.start>=start&&token.end<=end),'substitution cannot cut an original token, literal or comment');
 const significant=originalTokens.filter(token=>token.type!=='comment');need(significant.length===tokens.length&&significant.every((token,at)=>token.start===start+tokens[at].start&&token.end===start+tokens[at].end&&token.type===tokens[at].type&&token.text===tokens[at].text),'complete original token association differs');
 if(call){
  need(['borrow-text','borrow-bytes','move-text','move-bytes','copy-array32'].includes(value.ownership)&&value.operand.length>0,'explicit unchanged operand convention required');
  const open=value.expected.indexOf('(');need(open>=0&&value.expected.endsWith(')')&&value.expected.slice(open+1,-1)===value.operand,'complete original operand differs');
  if(Object.hasOwn(value,'operandRecipe')){
   need(value.operandRecipe==='scalar-text-sha256-base64url-fusion'&&value.operation==='sha256_base64_url_no_pad'&&value.ownership==='borrow-text','explicit source-only fusion recipe required');
   const match=/^Sha256::digest\(([A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*)\.as_bytes\(\)\)$/u.exec(value.operand);need(match&&value.replacementOperand==='&'+match[1]&&tokens.map(token=>token.text).join('')==='base64::engine::general_purpose::URL_SAFE_NO_PAD.encode('+value.operand+')','complete original UTF8 digest/base64 source intent differs');
  }else need(!Object.hasOwn(value,'replacementOperand'),'unchanged operand recipe required');
 }else if(value.operation==='format'){
  const before=rustTokens(value.expected),after=rustTokens(value.replacement);need(before.length===after.length&&before.every((token,at)=>token.type===after[at].type&&token.text===after[at].text),'repository format must preserve every original token and comment');
 }else need(tokens[0].text==='use'&&tokens.at(-1).text===';','complete original use declaration required');
 return {span:[start,end],expected:value.expected,replacement:value.replacement};
}
function edits(rows,source,call){
 sequence(rows,MAX_EDITS,'edit');const items=sourceItems(source),selected=rows.map(row=>edit(row,source,items,call));
 for(let at=1;at<selected.length;at++)need(selected[at-1].span[1]<=selected[at].span[0],'ordered nonoverlapping original edits required');return selected;
}
function substituted(document,phase,id,rows){
 const run=applyConcreteSyntaxSubstitutions(document,{languageRules:phase==='language'?[{id,edits:rows}]:[],repositoryRules:phase==='repository'?[{id,edits:rows}]:[]});
 const meta=serializeConcreteSyntaxMeta(run.value),source=transportConcreteSyntaxMeta(meta).source;
 return {document:run.value,meta,source,trace:run.trace};
}
/** Reopens the complete pinned archive and every current source per invocation. */
export function preparePinnedRustSourceRecipe(options){
 need(options&&typeof options==='object'&&!types.isProxy(options)&&Object.getPrototypeOf(options)===Object.prototype,'ordinary source configuration required');
 const required=['root','archive','pin','id'],keys=Reflect.ownKeys(options),names=[...required,...['targetPrefix','laterPlans'].filter(name=>keys.includes(name))];need(keys.length===names.length&&required.every(name=>keys.includes(name)),'closed source configuration required');const configuration=Object.fromEntries(names.map(name=>{const field=Object.getOwnPropertyDescriptor(options,name);need(field&&Object.hasOwn(field,'value'),'source configuration accessors are refused');return [name,field.value];}));let {root,archive,pin,id}=configuration;const targetPrefix=configuration.targetPrefix??'crate::translation_core::';need(typeof targetPrefix==='string'&&/^crate::[A-Za-z_][A-Za-z_0-9]*(?:::[A-Za-z_][A-Za-z_0-9]*)*::$/u.test(targetPrefix),'explicit qualified repository target required');
 need(typeof root==='string'&&typeof archive==='string'&&typeof pin==='string'&&/^[a-f0-9]{64}$/u.test(pin)&&typeof id==='string'&&id.length>0&&id.length<=160,'explicit bounded source recipe configuration required');
 root=realpathSync(resolve(root));const archivePath=local(root,archive),packed=readFileSync(archivePath);
 need(packed.length<=1048576&&hash(packed)===pin,'complete pinned archive differs');
 const bytes=gunzipSync(packed,{maxOutputLength:MAX_BYTES});
 const profile=fields(JSON.parse(bytes.toString('utf8')),['schema','id','guards','files']);need(profile.schema==='pinned-rust-source-recipe-v1'&&profile.id===id,'source recipe identity differs');
 sequence(profile.guards,16,'source guard');sequence(profile.files,MAX_FILES,'source file');need(profile.files.length>0,'complete source file batch required');
 let retained=bytes.length;const guarded=new Map(),paths=new Set();
 const read=path=>{const text=readFileSync(local(root,path),'utf8');need(text.length<=2097152&&Buffer.byteLength(text)<=MAX_BYTES,'original source bound');return text;};
 for(const row of profile.guards){fields(row,['path','sha256']);need(!guarded.has(row.path),'unique guard source required');const source=read(row.path);retained+=Buffer.byteLength(source);need(retained<=MAX_BYTES&&hash(source)===row.sha256,'complete current operation source guard differs');guarded.set(row.path,source);}
 const descendants=capturePinnedRustRecipeDescendants(configuration.laterPlans??[],read);retained+=descendants.bytes;need(retained<=MAX_BYTES,'complete descendant source retention bound');const files=[];
 for(const row of profile.files){
  fields(row,['path','source','sha256','afterSha256','calls','repositoryEdits']);need(typeof row.path==='string'&&row.path.endsWith('.rs')&&!paths.has(row.path)&&typeof row.source==='string'&&row.source.length<=2097152&&hash(row.source)===row.sha256,'complete distinct Rust original required');paths.add(row.path);
  const current=read(row.path),before=transportConcreteSyntaxSource(row.source,{language:'Rust'});need(transportConcreteSyntaxMeta(before.meta).source===row.source,'complete original CST inverse differs');
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'rust-source:retain-complete-call-and-unchanged-operand-intents',apply:()=>{const candidates=edits(row.calls,row.source,true),state=substituted(before.document,'language','rust-source:retain-original-source-and-call-intents',[]);return {...state,candidates};}}]},
   {phase:'repository',rules:[{id:'router-source:bind-qualified-core-and-adjust-actual-imports',apply:state=>{
    for(const selected of row.calls)need(selected.replacement===targetPrefix+selected.operation+'('+(selected.replacementOperand??selected.operand)+')','qualified repository operation required');
    const calls=substituted(state.document,'repository','router-source:qualified-owned-core-call-substitution',state.candidates),result=substituted(calls.document,'repository','router-source:actual-core-import-adoption',edits(row.repositoryEdits,calls.source,false));return {...result,middle:calls.source,languageMeta:state.meta,languageTrace:state.trace};
   }}]},
  ]).run(null),state=run.value,after=state.source;
  need(hash(after)===row.afterSha256&&after.split('\n').length-(after.endsWith('\n')?1:0)<1000,'complete proposed Rust source or file-size convention differs');
  const history=joinPinnedRustRecipeDescendants(row.path,after,descendants.files);need(current===row.source||current===after||current===history.currentAfter,'concurrent source change requires an explicit next recipe');
  const inverse=substituted(state.document,'repository','router-source:restore-whole-original-source',[{span:[0,after.length],expected:after,replacement:row.source}]);need(inverse.source===row.source,'whole original source inverse differs');
  retained+=Buffer.byteLength(current)+Buffer.byteLength(after);need(retained<=MAX_BYTES,'complete recipe retention bound');
  files.push({path:row.path,before:row.source,current,after,currentAfter:history.currentAfter,laterHistories:history.histories,inverse:inverse.source,beforeMeta:before.meta,languageMeta:state.languageMeta,afterMeta:state.meta,trace:run.trace,selections:row.calls,importEdits:row.repositoryEdits,originalLexicalItemsOnly:true});
 }
 for(const [path,source]of guarded)need(read(path)===source,'original operation source changed during proposal');for(const row of files)need(read(row.path)===row.current,'original application source changed during proposal');verifyPinnedRustRecipeDescendants(descendants,read);need(hash(readFileSync(archivePath))===pin,'original recipe archive changed during proposal');
 return {schema:'pinned-rust-source-recipe-proposal-v1',id,files,descendantFiles:descendants.files,guards:[...guarded].map(([path,source])=>({path,source,sha256:hash(source)})).concat(descendants.guards.map(({path,source})=>({path,source,sha256:hash(source)}))),retainedBytes:retained,semanticAuthority:false,namespaceAuthority:false,ownershipAuthority:false,executableAdmission:false,runtimeParity:false,receivingExecuted:false,crossInvocationCache:false};
}

import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
function sourceRecipeOwn(value,name){
 need(value&&typeof value==='object'&&!types.isProxy(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),'ordinary descendant source data required');const field=Object.getOwnPropertyDescriptor(value,name);need(field&&Object.hasOwn(field,'value'),'complete descendant own source data required');return field.value;
}
function sourceRecipeArray(value,bound){
 need(Array.isArray(value)&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Array.prototype,'ordinary descendant array required');const size=Object.getOwnPropertyDescriptor(value,'length');need(size&&Object.hasOwn(size,'value')&&Number.isSafeInteger(size.value)&&size.value>=0&&size.value<=bound,'descendant array bound');const result=[];for(let at=0;at<size.value;at++){const field=Object.getOwnPropertyDescriptor(value,String(at));need(field&&Object.hasOwn(field,'value'),'dense descendant own data required');result.push(field.value);}return result;
}
function capturePinnedRustRecipeDescendants(plans,read){
 const files=[],guards=[];let bytes=0;
 for(const plan of sourceRecipeArray(plans,16)){
  need(sourceRecipeOwn(plan,'schema')==='pinned-rust-source-recipe-proposal-v1','complete descendant proposal required');
  need(sourceRecipeArray(sourceRecipeOwn(plan,'descendantFiles'),MAX_FILES).length===0,'direct pinned descendants required; nested histories must be supplied explicitly in order');
  for(const key of ['semanticAuthority','namespaceAuthority','ownershipAuthority','executableAdmission','runtimeParity','receivingExecuted'])need(sourceRecipeOwn(plan,key)===false,'source-only descendant data required');
  const names=new Set();for(const row of sourceRecipeArray(sourceRecipeOwn(plan,'files'),MAX_FILES)){
   const result={};for(const name of ['path','before','after','current','currentAfter','inverse'])result[name]=sourceRecipeOwn(row,name);
   need(typeof result.path==='string'&&!names.has(result.path),'distinct descendant file required');names.add(result.path);for(const name of ['before','after','current','currentAfter','inverse'])need(typeof result[name]==='string'&&result[name].length<=2097152&&Buffer.byteLength(result[name])<=MAX_BYTES,'bounded complete descendant source required');
   need(result.inverse===result.before&&read(result.path)===result.current,'descendant whole source or inverse differs');bytes+=Buffer.byteLength(result.before)+Buffer.byteLength(result.currentAfter);need(bytes<=MAX_BYTES&&files.length<MAX_FILES,'descendant source retention bound');files.push(result);
  }
  for(const row of sourceRecipeArray(sourceRecipeOwn(plan,'guards'),16)){
   const path=sourceRecipeOwn(row,'path'),source=sourceRecipeOwn(row,'source'),sha256=sourceRecipeOwn(row,'sha256');need(typeof path==='string'&&typeof source==='string'&&source.length<=2097152&&hash(source)===sha256&&read(path)===source,'complete descendant operation guard differs');bytes+=Buffer.byteLength(source);need(bytes<=MAX_BYTES&&guards.length<MAX_FILES,'descendant guard bound');guards.push({path,source});
  }
 }
 return {files,guards,bytes};
}
function joinPinnedRustRecipeDescendants(path,after,descendants){
 let currentAfter=after;const histories=[];
 for(const row of descendants.filter(row=>row.path===path)){
  need(row.before===currentAfter,'complete adjacent descendant source differs');const equation=transportConcreteSourceEquations([{before:currentAfter,after:row.currentAfter,language:'Rust'}])[0];need(equation.inverse===currentAfter,'complete descendant CST inverse differs');histories.push({before:currentAfter,after:row.currentAfter,inverse:currentAfter,equation,sourceAuthority:false,semanticAuthority:false});currentAfter=row.currentAfter;
 }
 return {currentAfter,histories};
}
function verifyPinnedRustRecipeDescendants(descendants,read){
 for(const row of descendants.files)need(read(row.path)===row.current,'descendant application source changed during proposal');for(const row of descendants.guards)need(read(row.path)===row.source,'descendant operation source changed during proposal');
}
