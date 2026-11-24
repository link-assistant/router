// Source selection DATA only. Every body/type/owner is reissued by the original
// outcome/project checker after capture. No descriptor field grants admission.
import {readdirSync} from 'node:fs';
import {resolve,join,posix,sep} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {rustTokens} from './rust-structure.mjs';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {ownedCoreMapRuntimeSources} from './js-to-rust/owned-outcome-source.mjs';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {types} from 'node:util';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Ordered map original unit inputs: '+message);};
const names=['ordered-text-map-20261102-runtime.mjs','ordered-text-map-20261102-runtime.d.mts','ordered-text-map-callers-20261102-pair-runtime.mjs','ordered-text-map-callers-20261102-pair-runtime.d.mts'];
/** Preserve the old exported runtime closure; add a separate fixed closure. */
export function orderedMapUnitRuntimeSources(unit){
 const roots=[unit.runtimes.JavaScript,unit.runtimes.TypeScript],rows=ownedCoreMapRuntimeSources(...roots),result=new Map(rows.map(row=>[row.path,row.source]));
 if(roots[0]!==roots[1])for(const row of rows){const root=roots.find(root=>row.path.startsWith(root+'/'));if(!root)fail('actual map runtime escaped declared roots');const other=roots.find(candidate=>candidate!==root);result.set(other+row.path.slice(root.length),row.source);}
 return [...result].map(([path,source])=>({path,source}));
}
export function orderedMapUnitReferences({unit,current,dependencies={},runtimeSources=[]}){
 const ts=ownershipCompiler(),files=new Map(runtimeSources.map(row=>[row.path,row.source])),starts=[],targets=new Set();let cells=0;
 for(const root of [unit.runtimes.JavaScript,unit.runtimes.TypeScript])for(const name of names)targets.add(root+'/'+name);
 for(const language of ['JavaScript','TypeScript']){if(typeof current[language]==='string'){files.set(unit.paths[language],current[language]);starts.push(unit.paths[language]);}for(const row of dependencies[language]??[])if(typeof row.source==='string'){files.set(row.path,row.source);starts.push(row.path);}}
 const visited=new Set(),edges=new Map();
 const reaches=(path,depth=0)=>{if(targets.has(path))return true;if(depth>160)fail('original unit dependency depth');if(visited.has(path))return false;visited.add(path);if(!edges.has(path)){const source=files.get(path),next=[];if(typeof source==='string'){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('actual unit source parse diagnostics');const visit=(node,nesting=0)=>{if(++cells>1000000||nesting>160)fail('original unit source selection budget');let specifier=null;if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))specifier=node.moduleSpecifier.text;else if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal))specifier=node.argument.literal.text;if(specifier&&(specifier.startsWith('./')||specifier.startsWith('../')))next.push(posix.normalize(posix.join(posix.dirname(path),specifier)));ts.forEachChild(node,child=>visit(child,nesting+1));};visit(file);}edges.set(path,next);}return edges.get(path).some(next=>reaches(next,depth+1));};
 if(starts.some(path=>reaches(path)))return true;
 if(typeof current.Rust==='string'){const tokens=rustTokens(current.Rust);if(tokens.length>200000)fail('original unit Rust token budget');return tokens.some(token=>token.type==='ident'&&(token.text==='translation_ordered_text_map_core'||token.text==='OrderedTextMap'));}return false;
}
/** Retain physical identities in this invocation only; close on every outcome. */
export function withOrderedMapUnitSourceScope(root,run){
 requireSynchronousSourceCallback(run);const custody=createOrderedMapCanonicalSourceCustody(root),sources=new Map();let bytes=0,active=true,poisoned=false,primary;
 const read=(path,capture)=>{const absolute=resolve(root,path);if(absolute===resolve(root)||!absolute.startsWith(resolve(root)+sep))fail('native source escaped root');const source=custody.read(absolute);if(sources.has(path)){if(sources.get(path)!==source)fail('captured source bytes changed');return source;}if(sources.size>=32768||bytes+Buffer.byteLength(source)>67108864)fail('original planner source retention bounds');const recorded=capture(path);if(recorded!==source)fail('original planner/source custody read differs');sources.set(path,source);bytes+=Buffer.byteLength(source);return source;};
 const captureNative=(unit,declared,capture)=>{if(!active)fail('source operation already closed');if(poisoned)throw primary;try{
  const byLogical=new Map(unit.nativeSources.map(row=>[row.path,row.sourcePath])),result=new Map(declared.map(row=>[row.path,row.source])),library=byLogical.get('src/lib.rs');if(typeof library!=='string'||!library.endsWith('/lib.rs')&&library!=='lib.rs')fail('actual original library mapping required');
  const sourceDirectory=posix.dirname(library),paths=[];let entries=0;
  const physical=logical=>byLogical.get(logical)??(logical.startsWith('src/')?posix.join(sourceDirectory,logical.slice(4)):null);
  for(const row of declared){const path=physical(row.path);if(path===null||read(path,capture)!==row.source)fail('original declared native mapping changed');}
  const visit=(directory,logical)=>{const absolute=join(root,directory);custody.directory(absolute);for(const entry of readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(++entries>32768)fail('native path census bound');if(entry.isSymbolicLink())fail('linked original native module');const path=posix.join(directory,entry.name),name=posix.join(logical,entry.name);if(entry.isDirectory())visit(path,name);else if(entry.isFile()&&entry.name.endsWith('.rs'))paths.push(name);}custody.directory(absolute);};
  visit(sourceDirectory,'src');for(const logical of byLogical.keys())if(logical.endsWith('.rs')&&!paths.includes(logical))paths.push(logical);
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,compilationProfile:PRODUCTION_PROFILE,readSource:logical=>{const path=physical(logical);if(path===null)fail('missing actual native module path mapping');const source=read(path,capture);result.set(logical,source);return source;}});if(graph.diagnostics.length)fail('actual native module closure differs: '+JSON.stringify(graph.diagnostics));
  if(result.size>512||[...result.values()].reduce((sum,source)=>sum+Buffer.byteLength(source),0)>8388608)fail('native logical input bounds');custody.close();return [...result].map(([path,source])=>({path,source}));
 }catch(error){if(!poisoned){poisoned=true;primary=error;}throw primary;}};
 return withCompleteSourceClosingFence(()=>{try{const result=run(Object.freeze({captureNative}));if(types.isPromise(result)||types.isProxy(result)||result!==null&&['object','function'].includes(typeof result)&&Reflect.has(result,'then'))fail('source operation must finish synchronously');return result;}finally{active=false;}},[()=>withCompleteSourceClosingFence(()=>{if(poisoned)throw primary;for(const [path,source]of sources)if(custody.read(resolve(root,path))!==source)fail('complete original native bytes changed');},[custody.close])]);
}
