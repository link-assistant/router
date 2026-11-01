// Fresh complete source/binding composition, SOURCE DRAFT, UNRUN.
// This API supplies parser namespace setup; it is not executable admission.
import {constants,lstatSync,opendirSync,openSync,readSync,fstatSync,closeSync,realpathSync,readlinkSync} from 'node:fs';
import {resolve,join,isAbsolute} from 'node:path';
import {types} from 'node:util';
import {compilationProfile} from './cfg-profile.mjs';
import {resolveModuleGraph} from './project.mjs';
import {resolveModuleBindings,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withSourceInputValidation,invalidateActiveSourceOperations,withSourceFailureOperation} from './source-failure-operations.mjs';

const LIMITS=Object.freeze({files:512,directoryEntries:8192,directoryDepth:32,sourceBytes:32000000,fileBytes:2097152,parsers:512,nesting:16});
const active=[]; // Invocation-local stack only, cleared on every exit.
const fail=message=>{throw new TypeError('Complete source binding batch: '+message);};
function record(value,fields){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own-data options required');
 for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!fields.includes(key)||!Object.hasOwn(field,'value'))fail('unknown or accessor option');}
 return value;
}
function relative(value){if(typeof value!=='string'||/[\\\0:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('complete repository-relative path required');return value;}
function ownDenseStrings(value){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>64||Reflect.ownKeys(value).length!==value.length+1)fail('dense bounded module path required');
 return Array.from({length:value.length},(_,index)=>{const row=Object.getOwnPropertyDescriptor(value,String(index));if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string'||!/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(row.value))fail('own module path identifiers required');return row.value;});
}
function sourceGuard(operation){try{return withSourceInputValidation(operation);}catch(error){invalidateActiveSourceOperations();for(const frame of active)if(!frame.failed){frame.failed=true;frame.error=error;}throw error;}}
function identity(stat,stable=false){
 const keys=stable?['dev','ino','mode','uid','gid']:['dev','ino','mode','nlink','uid','gid','size','mtimeNs','ctimeNs'];
 return Object.fromEntries(keys.map(key=>{if(typeof stat[key]!=='bigint')fail('complete bigint filesystem identity required');return [key,String(stat[key])];}));
}
function exactIdentity(before,after){if(JSON.stringify(before)!==JSON.stringify(after))fail('complete physical source input identity changed');}
function census(root,directory,declaredRoot){
 const rows=[],directories=[],ancestors=[],leaves=[];let bytes=0,entries=0;
 if(typeof constants.O_NOFOLLOW!=='number')fail('physical source reads require native no-follow support');
 if(realpathSync(declaredRoot)!==root)fail('physical root identity changed');
 // Retain both the declared alias path and canonical target ancestry. Stable
 // platform aliases (such as /var) are recorded, never silently re-resolved.
 const checkedAncestors=new Set();
 for(const target of [declaredRoot,root]){
  const parts=target.split('/').filter(Boolean);if(parts.length>64)fail('physical root ancestor bound');let path='/';
  for(const part of ['',...parts]){if(part)path=join(path,part);if(checkedAncestors.has(path))continue;checkedAncestors.add(path);
   const stat=lstatSync(path,{bigint:true});if(!stat.isDirectory()&&!stat.isSymbolicLink())fail('root ancestors must remain directories or recorded aliases');
   ancestors.push({path,stable:true,identity:identity(stat,true),link:stat.isSymbolicLink()?readlinkSync(path):null});
  }
 }
 const rootStat=lstatSync(root,{bigint:true});if(rootStat.isSymbolicLink()||!rootStat.isDirectory())fail('physical root identity changed');
 let component=root;
 for(const part of directory.split('/')){component=join(component,part);const stat=lstatSync(component,{bigint:true});if(stat.isSymbolicLink()||!stat.isDirectory())fail('source directory components must be physical directories');const stable=component!==join(root,directory);ancestors.push({path:component,stable,identity:identity(stat,stable),link:null});}
 function visit(path,depth){
  if(depth>LIMITS.directoryDepth)fail('complete source directory depth bound');const physical=join(root,path),before=lstatSync(physical,{bigint:true});
  if(before.isSymbolicLink()||!before.isDirectory())fail('source directories must retain their physical identity');
  const names=[],handle=opendirSync(physical);let primaryDirectoryFailed=false;
  try{for(let child;(child=handle.readSync())!==null;){if(++entries>LIMITS.directoryEntries)fail('complete source directory entry bound');names.push(child.name);}}
  catch(error){primaryDirectoryFailed=true;throw error;}finally{try{handle.closeSync();}catch(error){if(!primaryDirectoryFailed)throw error;}}
  names.sort();directories.push({path,identity:identity(before),names});
  for(const name of names){const child=path+'/'+name,leaf=join(root,child),stat=lstatSync(leaf,{bigint:true}),original=identity(stat);
   if(stat.isSymbolicLink())fail('symlinked source-directory entries require a separate proof');
   if(stat.isDirectory()){visit(child,depth+1);exactIdentity(original,identity(lstatSync(leaf,{bigint:true})));continue;}
   // Non-Rust names and metadata remain part of the complete physical census.
   leaves.push({path:child,identity:original});
   if(!name.endsWith('.rs')){exactIdentity(original,identity(lstatSync(leaf,{bigint:true})));continue;}
   if(!stat.isFile())fail('Rust source inputs must be ordinary files');
   if(rows.length>=LIMITS.files||stat.size>BigInt(LIMITS.fileBytes))fail('complete Rust source count/byte bound');
   const fd=openSync(leaf,constants.O_RDONLY|constants.O_NOFOLLOW);let raw,primaryReadFailed=false;
   try{
    const opened=fstatSync(fd,{bigint:true});if(!opened.isFile())fail('Rust source descriptor must remain an ordinary file');exactIdentity(original,identity(opened));
    if(opened.size<0n||opened.size>BigInt(LIMITS.fileBytes))fail('complete Rust source byte bound');
    const expected=Number(opened.size),buffer=Buffer.alloc(expected+1);let count=0;
    while(count<buffer.length){const read=readSync(fd,buffer,count,Math.min(65536,buffer.length-count),null);if(read===0)break;count+=read;}
    if(count!==expected)fail('physical Rust source grew or reached early EOF');raw=buffer.subarray(0,count);
    exactIdentity(original,identity(fstatSync(fd,{bigint:true})));exactIdentity(original,identity(lstatSync(leaf,{bigint:true})));
   }catch(error){primaryReadFailed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primaryReadFailed)throw error;}}
   const source=raw.toString('utf8');if(!Buffer.from(source,'utf8').equals(raw))fail('physical Rust source must be exact UTF8');
   bytes+=raw.length;if(bytes>LIMITS.sourceBytes)fail('combined complete Rust source byte bound');rows.push({path:child,source});
  }
  exactIdentity(identity(before),identity(lstatSync(physical,{bigint:true})));
 }
 visit(directory,0);
 // Close every original ancestor after traversal as well as at operation exit.
 for(const ancestor of ancestors){const stat=lstatSync(ancestor.path,{bigint:true});exactIdentity(ancestor.identity,identity(stat,ancestor.stable));if(ancestor.link!==(stat.isSymbolicLink()?readlinkSync(ancestor.path):null))fail('physical root ancestor alias changed');}
 if(realpathSync(declaredRoot)!==root)fail('physical root identity changed');
 return {rows,directories,ancestors,leaves,entries,bytes};
}
function sameCensus(before,after){
 if(before.entries!==after.entries||JSON.stringify(before.directories)!==JSON.stringify(after.directories)||before.rows.length!==after.rows.length)fail('complete physical source census changed');
 if(JSON.stringify(before.ancestors)!==JSON.stringify(after.ancestors)||JSON.stringify(before.leaves)!==JSON.stringify(after.leaves))fail('complete physical source input identity changed');
 for(let index=0;index<before.rows.length;index++)if(before.rows[index].path!==after.rows[index].path||before.rows[index].source!==after.rows[index].source)fail('complete physical source input changed');
}
function synchronous(value){
 if(value===null||!['object','function'].includes(typeof value))return value;
 if(types.isProxy(value)||types.isPromise(value))fail('source binding operation must complete synchronously');
 const then=Object.getOwnPropertyDescriptor(value,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source binding operation must complete synchronously');return value;
}
/** All parser configurations share one fresh complete original namespace closure. */
function sourceBindingBulk(input,operation){
 record(input,['root','sourceDirectory','entry','compilationProfile']);
 for(const key of ['root','sourceDirectory','entry'])if(!Object.hasOwn(input,key))fail('complete own source option required: '+key);
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one synchronous callback required');
 if(active.length>=LIMITS.nesting)fail('nested complete source operation bound');
 if(typeof input.root!=='string'||!isAbsolute(input.root))fail('absolute physical root required');
 const declaredRoot=resolve(input.root),directory=relative(input.sourceDirectory),entry=relative(input.entry);if(!entry.endsWith('.rs')||!entry.startsWith(directory+'/'))fail('entry must be Rust source inside the complete source directory');
 if(directory.split('/').length>LIMITS.directoryDepth)fail('source directory ancestor bound');
 const frame={active:true,failed:false,error:undefined};active.push(frame);
 let snapshot=null,root=null,graph=null,binding=null,profile=null,result,primary=false,primaryError;
 const current=()=>sourceGuard(()=>{if(!frame.active)fail('source binding operation expired');sameCensus(snapshot,census(root,directory,declaredRoot));if(frame.failed)throw frame.error;});
 try{
  sourceGuard(()=>{root=realpathSync(declaredRoot);profile=compilationProfile(input.compilationProfile);snapshot=census(root,directory,declaredRoot);});
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'language:serialize-reparse-every-complete-physical-Rust-source',apply:()=>snapshot.rows.map(row=>{const concrete=transportConcreteSyntaxSource(row.source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('whole physical source CST inverse differs');return {path:row.path,source:row.source,concreteSyntax:concrete.meta};})},
    {id:'language:resolve-original-whole-module-graph-and-fresh-private-binding-closure',apply:sources=>{
     const files=new Map(sources.map(row=>[row.path,row.source]));
     graph=resolveModuleGraph({entry,paths:sources.map(row=>row.path),readSource:path=>{if(!files.has(path))fail('graph requested source outside complete physical census');return files.get(path);},compilationProfile:profile});
     // Use the established conservative issuer. Unknown attributes, producers,
     // external crates and ambiguous aliases retain its original refusals.
     binding=resolveModuleBindings({modules:graph.modules,compilationProfile:profile});
     assertResolvedSourceScopeOrigin(binding.scopes,{modules:graph.modules,compilationProfile:profile});
     for(const module of graph.modules)originalSourceModuleItems(module);
     return sources;
    }},
   ]},
   {phase:'repository',rules:[{id:'repository:retain-complete-original-sources-graph-and-binding-diagnostics',apply:sources=>Object.freeze({
    schema:'router-source-binding-bulk-20261101-v1',sources:Object.freeze(sources.map(row=>Object.freeze(row))),
    entry,sourceDirectory:directory,compilationProfile:profile,
    graphDiagnostics:Object.freeze(graph.diagnostics.map(row=>Object.freeze({...row}))),
    bindingDiagnostics:binding.diagnostics,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,
   })}]},
  ]);
  const prepared=sourceGuard(()=>run.run(null));current();
  function configureOne(parser,modulePath){
   const path=ownDenseStrings(modulePath),scope=binding.scopes.find(row=>JSON.stringify(row.path)===JSON.stringify(path)),module=graph.modules.find(row=>JSON.stringify(row.path)===JSON.stringify(path));
   if(!scope||!module)fail('actual complete graph module required');
   if(graph.diagnostics.length)fail('original complete module graph retains unresolved diagnostics');
   assertResolvedSourceScopeOrigin(binding.scopes,{modules:graph.modules,compilationProfile:profile});originalSourceModuleItems(module);
   // Original configuration retains unresolved flags, visibility, macro
   // subnamespaces and aliases. It does not prove a callable implementation.
   return configureParserSourceScope(parser,scope,binding.scopes,path);
  }
  function fencedBatch(work){
   if(!frame.active)fail('source binding operation expired');
   let value,failed=false,error;
   try{current();value=sourceGuard(work);}catch(thrown){failed=true;error=thrown;}
   finally{if(!failed&&frame.failed){failed=true;error=frame.error;}try{current();}catch(closing){if(!failed){failed=true;error=closing;}}}
   if(failed)throw error;return value;
  }
  const api=Object.freeze({
   evidence:prepared.value,trace:prepared.trace,
   configure(parser,modulePath){return fencedBatch(()=>configureOne(parser,modulePath));},
   configureMany(requests){return fencedBatch(()=>{
    if(!Array.isArray(requests)||types.isProxy(requests)||Object.getPrototypeOf(requests)!==Array.prototype||requests.length<1||requests.length>LIMITS.parsers||Reflect.ownKeys(requests).length!==requests.length+1)fail('dense bounded parser configuration batch required');
    const selected=Array.from({length:requests.length},(_,index)=>{
     const field=Object.getOwnPropertyDescriptor(requests,String(index));if(!field||!Object.hasOwn(field,'value'))fail('own parser configuration required');
     const row=record(field.value,['parser','modulePath']);for(const key of ['parser','modulePath'])if(!Object.hasOwn(row,key))fail('complete parser configuration required');
     return {parser:row.parser,modulePath:ownDenseStrings(row.modulePath)};
    });
    // No callback, frame or bypass option enters this loop. Every parser still
    // receives its own original complete origin/view/namespace configuration.
    return selected.map(row=>configureOne(row.parser,row.modulePath));
   });},
   assertCurrent(){if(!frame.active)fail('source binding operation expired');current();},
  });
  result=synchronous(operation(api));
 }catch(error){primary=true;primaryError=error;}
 finally{
  // Keep the first caught source failure while still doing complete closure.
  if(!primary&&frame.failed){primary=true;primaryError=frame.error;}
  // Even callback/source failures replay the complete physical closing check.
  try{if(snapshot&&root)sourceGuard(()=>sameCensus(snapshot,census(root,directory,declaredRoot)));}catch(error){if(!primary){primary=true;primaryError=error;}}
  if(!primary&&frame.failed){primary=true;primaryError=frame.error;}
  frame.active=false;frame.error=undefined;active.pop();snapshot=null;graph=null;binding=null;profile=null;root=null;
 }
 if(primary)throw primaryError;return result;
}

export function withSourceBindingBulk20261101(input,operation){
 return withSourceFailureOperation(()=>sourceBindingBulk(input,operation));
}
