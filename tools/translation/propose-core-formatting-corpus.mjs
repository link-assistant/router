// Corpus adoption is a source proposal, never semantic admission. Actual
// translation still checks every migrated caller through the owned facade.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,dirname,basename,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {migrateCoreFormatting} from './migrate-core-formatting.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-primitives.mjs';

const fail=message=>{throw new TypeError('Core formatting corpus proposal: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
const samePath=(left,right)=>left.length===right.length&&left.every((word,index)=>word===right[index]);
function inputFiles(files){
  if(!files||typeof files!=='object'||types.isProxy(files)||Array.isArray(files)||![null,Object.prototype].includes(Object.getPrototypeOf(files)))fail('complete own source map required');
  const keys=Reflect.ownKeys(files);if(keys.length>4096)fail('source file count exceeded');
  const result=Object.create(null);let size=0;
  for(const path of keys){
    if(typeof path!=='string'||!path.endsWith('.rs')||path.length>4096||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust source path required');
    const row=Object.getOwnPropertyDescriptor(files,path);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string'||row.value.length>2_000_000)fail('source rows require bounded primitive strings');
    size+=row.value.length;if(size>32*1024*1024)fail('complete source corpus budget exceeded');result[path]=row.value;
  }
  return result;
}
function context(module,graph){
  const ancestors=[];
  for(let depth=0;depth<module.path.length;depth++){
    const found=graph.modules.filter(candidate=>samePath(candidate.path,module.path.slice(0,depth)));
    if(found.length!==1||found[0].configurationCondition!=='active')fail('ancestor origin or configuration is ambiguous');
    ancestors.push(found[0]);
  }
  const sources=[],seen=new Set(),macroUseSources=Object.create(null),macroUseOrigins=[];
  for(const ancestor of ancestors){
    if(!seen.has(ancestor.file)){sources.push({path:ancestor.file,source:ancestor.source,sha256:hash(ancestor.source)});seen.add(ancestor.file);}
    for(const item of originalSourceModuleItems(ancestor))if(item.term==='mod'&&item.tokens.some(token=>token.text==='macro_use')){
      const children=graph.modules.filter(candidate=>samePath(candidate.path,[...ancestor.path,item.name]));
      if(children.length!==1||children[0].configurationCondition!=='active')fail('parent macro_use has no unique active complete source');
      const child=children[0];
      if(Object.hasOwn(macroUseSources,item.name)&&macroUseSources[item.name]!==child.source)fail('same-name parent macro imports have different source origins');
      macroUseSources[item.name]=child.source;macroUseOrigins.push({name:item.name,path:child.file,module:[...child.path],source:child.source,sha256:hash(child.source)});
    }
  }
  return {ancestors:sources,macroUseOrigins,rootSource:sources.map(row=>row.source).join('\n'),macroUseSources};
}
export function proposeCoreFormattingCorpus({entry='src/lib.rs',files,compilationProfile=PRODUCTION_PROFILE}={}){
  const original=inputFiles(files);if(typeof entry!=='string'||!Object.hasOwn(original,entry))fail('actual tracked entry source required');
  const paths=Object.keys(original).sort(),graph=resolveModuleGraph({entry,paths,readSource:path=>original[path],compilationProfile}),rows=[];
  const roots=graph.modules.filter(module=>module.path.length===0),cores=graph.modules.filter(module=>samePath(module.path,['translation_core'])),leaves=graph.modules.filter(module=>samePath(module.path,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!=='src/translation_core.rs'||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!=='src/translation_core/primitives.rs'||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('actual complete owned facade and primitive leaf must be present before corpus adoption');
  const declarations=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(declarations.length!==1||roots[0].source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core declaration required');
  if(originalSourceModuleItems(roots[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing root core alias is unsupported');
  for(const path of paths){
    // Inline views are retained by the graph, but the existing per-file rule
    // selects only free functions in the physical module's top-level body.
    const origins=graph.modules.filter(module=>module.file===path&&module.sourceView?.modulePath.length===0),originFacts=origins.map(module=>({module:[...module.path],condition:module.configurationCondition,sourceViewDigest:module.sourceView.digest}));
    if(origins.length!==1){rows.push({path,status:'skipped',reason:origins.length?'multiple physical module origins':'not in the actual entry module graph',origins:originFacts});continue;}
    const module=origins[0];
    if(module.configurationCondition!=='active'){rows.push({path,status:'skipped',reason:'module configuration is not active',origins:originFacts});continue;}
    const candidates=originalSourceModuleItems(module).filter(item=>item.term==='fn').some(item=>{
      const tokens=item.tokens.filter(token=>token.type!=='comment');
      return tokens.some((token,index)=>(token.text==='format!'||token.text==='format'&&tokens[index+1]?.text==='!')&&!['::','#'].includes(tokens[index-1]?.text));
    });
    if(!candidates){rows.push({path,status:'unchanged',reason:'no bare format macro in the supported top-level function domain',origins:originFacts});continue;}
    let scope,proposal;
    try{scope=context(module,graph);proposal=migrateCoreFormatting(original[path],{rootSource:scope.rootSource,macroUseSources:scope.macroUseSources});}
    catch(error){if(!(error instanceof TypeError))throw error;rows.push({path,status:'skipped',reason:error.message,origins:originFacts,...(scope?{scope}:{} )});continue;}
    if(proposal.before.source!==original[path])fail('complete original source association changed');
    rows.push({path,status:proposal.edits.length?'proposed':'unchanged',origins:originFacts,scope,proposal,
      untouchedInlineModules:graph.modules.filter(candidate=>candidate.file===path&&candidate.sourceView?.modulePath.length).map(candidate=>({module:[...candidate.path],bodySpan:candidate.sourceView.bodySpan,reason:'inline module function traversal is outside this initial per-file rule'}))});
  }
  const inputs=paths.map(path=>({path,source:original[path],sha256:hash(original[path])})),summary={files:paths.length,proposed:rows.filter(row=>row.status==='proposed').length,unchanged:rows.filter(row=>row.status==='unchanged').length,skipped:rows.filter(row=>row.status==='skipped').length,selectedFunctions:rows.reduce((total,row)=>total+(row.proposal?.functions.length??0),0)};
  return {schema:'router-owned-formatting-corpus-proposal-v1',entry,compilationProfile:graph.compilationProfile,inputs,rows,summary,moduleEdges:graph.edges,moduleDiagnostics:graph.diagnostics,
    semanticAdmission:false,migrationSemantics:'maintainer-authorized source adoption; all checked source/meta/target obligations remain',libraryImplementation:'untranslated-rust-std-format'};
}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}
function readSources(root){
  const files=Object.create(null),identities=[];let visited=0,units=0;
  function visit(path){
    if(++visited>20_000)fail('source path census budget exceeded');
    const absolute=join(root,path),before=lstatSync(absolute);if(before.isSymbolicLink())fail('linked source path is unsupported');
    if(before.isDirectory()){for(const name of readdirSync(absolute).sort())visit(path+'/'+name);return;}
    if(!path.endsWith('.rs'))return;if(!before.isFile()||before.size>8_000_000||identities.length>=4096)fail('regular bounded Rust source required');
    const bytes=readFileSync(absolute),source=bytes.toString('utf8'),after=lstatSync(absolute);
    if(!sameFile(before,after)||!Buffer.from(source,'utf8').equals(bytes))fail('source identity or UTF8 encoding changed');units+=source.length;if(source.length>2_000_000||units>32*1024*1024)fail('complete source corpus budget exceeded');files[path]=source;identities.push({path,before});
  }
  visit('src');return {files,identities};
}
function outputDirectory(root,output){
  const parent=realpathSync(dirname(output)),target=join(parent,basename(output)),inside=(a,b)=>a===b||a.startsWith(b+'/');
  if(inside(target,root)||inside(root,target))fail('physical output overlaps original source');
  const before=lstatSync(parent);mkdirSync(output,{recursive:false});const after=lstatSync(parent),created=lstatSync(output);
  if(before.dev!==after.dev||before.ino!==after.ino||before.mode!==after.mode||realpathSync(output)!==target||!created.isDirectory()||created.isSymbolicLink())fail('output parent identity changed');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY');
  const root=realpathSync(resolve(args[1])),output=resolve(args[3]),source=readSources(root),proposal=proposeCoreFormattingCorpus({files:source.files});
  // Rejoin every complete physical input after all callback-capable graph/CST
  // work, before opening the outside proposal directory or writing any output.
  const final=readSources(root);if(JSON.stringify(Object.keys(final.files))!==JSON.stringify(Object.keys(source.files)))fail('complete source path census changed during proposal');
  for(const row of source.identities)if(!sameFile(row.before,lstatSync(join(root,row.path)))||final.files[row.path]!==source.files[row.path])fail('original corpus changed during proposal');
  const report=JSON.stringify(proposal,null,2)+'\n';if(Buffer.byteLength(report)>256*1024*1024)fail('complete proposal report budget exceeded');
  outputDirectory(root,output);
  for(const row of proposal.rows)if(row.status==='proposed'){const target=join(output,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.proposal.after.source,{flag:'wx'});}
  writeFileSync(join(output,'proposal.json'),report,{flag:'wx'});
}
