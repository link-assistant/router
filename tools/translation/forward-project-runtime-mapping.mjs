// Per-proposal registered runtime packaging. These equations grant no admission.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {ownedCoreRuntimeSources} from './js-to-rust/owned-outcome-source.mjs';
import {effectRuntimeAssets} from './effect-assets.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {posix} from 'node:path';
const FILE=8*1024*1024,TOTAL=16*1024*1024,COUNT=128;
const need=(value,message)=>{if(!value)throw new TypeError('Forward project runtime mapping: '+message);};
const BUILTINS=new Set(['node:util','node:crypto','node:buffer','node:http','node:https','node:dns','node:net','node:fs','node:fs/promises','node:os','node:async_hooks']);
function path(value){
 need(typeof value==='string'&&value.length>0&&value.length<=4096&&!value.startsWith('/')&&!/[\\:\0\r\n]/u.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical repository-relative source path required');return value;
}
function parsed(source,language,name){
 need(typeof source==='string'&&Buffer.byteLength(source)<=FILE,'bounded complete source required');need(['JavaScript','TypeScript'].includes(language),'explicit native target language required');
 const concrete=transportConcreteSyntaxSource(source,{language});need(transportConcreteSyntaxMeta(concrete.meta).source===source,'complete runtime mapping CST inverse');
 const ts=ownershipCompiler(),file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'complete native runtime source grammar');
 const nodes=[];let cells=0;
 const visit=(node,depth=0)=>{
  need(++cells<=200000&&depth<=256,'complete runtime edge census bound');
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){need(ts.isStringLiteral(node.moduleSpecifier),'literal registered static module edge');nodes.push(node.moduleSpecifier);}
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){need(node.arguments.length===1&&ts.isStringLiteral(node.arguments[0]),'literal registered dynamic module edge');nodes.push(node.arguments[0]);}
  if(ts.isImportTypeNode(node)){need(ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal),'literal registered native type edge');nodes.push(node.argument.literal);}
  ts.forEachChild(node,child=>visit(child,depth+1));
 };
 visit(file);return {file,nodes};
}
function currentAssets(){
 const map=new Map(),add=(name,source)=>{path(name);need(!map.has(name)&&typeof source==='string'&&Buffer.byteLength(source)<=FILE,'unique complete registered runtime source required');map.set(name,source);};
 for(const row of ownedCoreRuntimeSources('runtime')){need(row.path.startsWith('runtime/'),'actual registered runtime root');add(row.path.slice('runtime/'.length),row.source);}
 const effects=effectRuntimeAssets();add('effects.mjs',effects.javascript);add('effects.d.mts',effects.declarations);return map;
}
function quotedRelative(specifier,original){
 // Keep the original literal delimiter so inverse relocation restores all bytes.
 return original.startsWith("'")?"'"+specifier.replace(/\\/gu,'\\\\').replace(/'/gu,"\\'")+"'":JSON.stringify(specifier);
}
export function createForwardProjectRuntimeMapping(){
 let assets=null;const used=new Set(),all=()=>assets??=currentAssets();
 return {
  rewrite({source,language,sourcePath,targetPath,fromRoot,toRoot}){
   for(const value of [sourcePath,targetPath,fromRoot,toRoot])path(value);
   return createRulePipeline([
    {phase:'language',rules:[{id:'javascript:reparse-complete-native-import-source-census',apply:()=>parsed(source,language,sourcePath)}]},
    {phase:'repository',rules:[{id:'router:relocate-only-registered-runtime-module-spans',apply:({file,nodes})=>{
     const edits=[],keys=new Set(),seen=new Set();
     for(const node of nodes){
      if(BUILTINS.has(node.text))continue;need(node.text.startsWith('.'),'registered relative runtime import required');
      const full=posix.normalize(posix.join(posix.dirname(sourcePath),node.text));need(full.startsWith(fromRoot+'/'),'actual target import escapes its runtime root');
      const key=full.slice(fromRoot.length+1);need(all().has(key),'target runtime module has no complete registered source');keys.add(key);used.add(key);
      const relative=posix.relative(posix.dirname(targetPath),toRoot+'/'+key),next=relative.startsWith('.')?relative:'./'+relative,start=node.getStart(file),expected=source.slice(start,node.end);
      if(seen.has(start))continue;seen.add(start);edits.push({start,end:node.end,expected,replacement:quotedRelative(next,expected)});
     }
     edits.sort((a,b)=>a.start-b.start);const parts=[];let end=0;
     for(const edit of edits){need(edit.start>=end&&source.slice(edit.start,edit.end)===edit.expected,'complete target runtime source span differs');parts.push(source.slice(end,edit.start),edit.replacement);end=edit.end;}
     parts.push(source.slice(end));const after=parts.join('');need(Buffer.byteLength(after)<=FILE,'relocated complete source file limit');
     const history=source===after?null:transportConcreteSourceEquations([{before:source,after,language}])[0];return {source:after,keys:[...keys],history};
    }}]},
   ]).run(null).value;
  },
  sources(root,seeds){
   path(root);need(Array.isArray(seeds)&&seeds.length<=COUNT,'bounded runtime source seed census');if(!seeds.length)return [];
   const rows=[],seen=new Set(),map=all();let bytes=0;
   const retain=key=>{
    if(seen.has(key))return false;path(key);need(seen.size<COUNT,'bounded complete runtime source closure');const source=map.get(key);need(typeof source==='string','complete registered runtime source required');
    bytes+=Buffer.byteLength(source);need(bytes<=TOTAL,'complete runtime source byte limit');seen.add(key);used.add(key);rows.push({path:root+'/'+key,source});return true;
   };
   const visit=key=>{
    if(!retain(key))return;
    if(/\.(?:mjs|mts)$/u.test(key))for(const node of parsed(map.get(key),key.endsWith('.mts')?'TypeScript':'JavaScript',key).nodes){
     if(BUILTINS.has(node.text))continue;need(node.text.startsWith('.'),'runtime dependency requires registered relative source');const next=posix.normalize(posix.join(posix.dirname(key),node.text));path(next);visit(next);
    }
    if(key.endsWith('.mjs')){const declaration=key.slice(0,-4)+'.d.mts';if(map.has(declaration))visit(declaration);}
   };
   for(const key of seeds)visit(key);for(const key of map.keys())if(/LICENSE|NOTICE/iu.test(key))retain(key);return rows.sort((left,right)=>left.path.localeCompare(right.path));
  },
  verify(){if(!assets)return;const current=currentAssets();for(const key of used)need(current.get(key)===assets.get(key),'complete registered runtime source changed during proposal');},
 };
}
