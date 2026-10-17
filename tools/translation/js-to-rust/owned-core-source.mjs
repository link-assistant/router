// A fresh, explicit receiving-source transaction. Public source data is input,
// never a callable permit. Private membership is reissued after meta decoding.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from '../json-macro-features.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';

const contexts=new WeakMap(),traversals=new WeakMap();
const fail=message=>{throw new TypeError('Owned reverse source: '+message);};
const digest=source=>createHash('sha256').update(source).digest('hex');
export function ownedSourcePath(path){
 if(typeof path!=='string'||path.length>1024||path.startsWith('/')||path.includes('\\')||path.includes(':')||/[\x00-\x1f]/u.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid relative path');
 return path;
}
export function ownedPlainData(input){
 let cells=0,units=0;const active=new Set();
 function visit(value,depth){
  if(++cells>100000||depth>160)fail('data budget');
  if(value===null||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string'){units+=value.length;if(units>16777216)fail('source budget');return value;}
  if(typeof value!=='object'||types.isProxy(value)||active.has(value))fail('non-data input');
  const array=Array.isArray(value),parent=Object.getPrototypeOf(value);
  if(array?parent!==Array.prototype:parent!==Object.prototype&&parent!==null)fail('foreign data prototype');
  const keys=Reflect.ownKeys(value);if(keys.some(k=>typeof k!=='string'||k==='stack'))fail('unknown data key');
  const fields=Object.getOwnPropertyDescriptors(value);
  for(const key of keys)if(!Object.hasOwn(fields[key],'value'))fail('data accessor');
  active.add(value);let result;
  if(array){const n=fields.length.value;if(!Number.isSafeInteger(n)||n<0||n>4096||keys.length!==n+1)fail('dense array required');result=[];for(let i=0;i<n;i++){if(!Object.hasOwn(fields,String(i)))fail('sparse array');result.push(visit(fields[i].value,depth+1));}}
  else{result={};for(const key of keys)Object.defineProperty(result,key,{value:visit(fields[key].value,depth+1),enumerable:true,writable:true,configurable:true});}
  active.delete(value);return result;
 }
 return visit(input,0);
}
function exactKeys(value,keys){if(Object.keys(value).sort().join('\0')!==[...keys].sort().join('\0'))fail('unknown source record field');}
function parsed(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.ts')||path.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('native source syntax: '+path);return file;
}
function relative(from,specifier){
 if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('nonrelative source import');
 const name=posix.normalize(posix.join(posix.dirname(from),specifier));ownedSourcePath(name);return name;
}
/** Complete registered static runtime closure, freshly read on each operation. */
export function ownedCoreRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=hostRuntimeAssets(),rows=[],seen=new Set();
 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('runtime closure bounds');seen.add(name);
  const source=assets.get(name);if(typeof source!=='string')fail('unregistered materialized asset: '+name);const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name,file=parsed(ts,path,source);rows.push({path,source});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;
   const target=relative(path,specifier);if(posix.dirname(target)!==base)fail('runtime closure escape');visit(posix.basename(target));
  }
 }
 for(const name of ['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts'])visit(name);
 for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
function rustEdge(files){
 const source=files.get('src/lib.rs');if(typeof source!=='string')fail('complete actual Rust root required');
 const views=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),items=originalModuleViewItems(views.views[0],source);
 const declarations=items.filter(item=>item.term==='mod'&&item.name==='translation_core');
 if(declarations.length!==1||source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('actual public Rust facade edge required');
 if(items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing Rust facade import');
 if(files.get('src/translation_core.rs')!==ROUTER_FORMATTING_FACADE_SOURCE||files.get('src/translation_core/primitives.rs')!==ROUTER_CORE_PRIMITIVES_SOURCE)fail('complete owned Rust sources differ');
 if(typeof files.get('Cargo.toml')!=='string'||typeof files.get('Cargo.lock')!=='string')fail('complete receiving Cargo sources required');
 const dependencies=jsonMacroDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof;
 if(!dependencies)fail('actual locked JSON source profile required');const features=proveJsonMacroFeatures(dependencies);
 const modules=[{file:'src/lib.rs',path:[],source,sourceView:views.views[0],configurationCondition:'active'}];
 for(const [path,name]of [['src/translation_core.rs',['translation_core']],['src/translation_core/primitives.rs',['translation_core','primitives']]])modules.push({file:path,path:name,source:files.get(path),configurationCondition:'active'});
 const evidence=resolveModuleBindings({modules}),scope=evidence.scopes.find(scope=>scope.file==='src/lib.rs'&&scope.path.length===0);
 const binding=scope?.bindings.filter(binding=>binding.name==='translation_core'&&binding.namespace==='type');
 if(!scope||scope.unresolvedTypeScope||scope.unresolvedMacroScope||binding?.length!==1||binding[0].status!=='resolved'||binding[0].kind!=='mod'||binding[0].source!=='src/lib.rs'||binding[0].target?.join('::')!=='crate::translation_core')fail('original facade namespace remains unresolved');
 return {path:'src/lib.rs',span:[declarations[0].start,declarations[0].end],dependencyDigest:dependencies.digest,features:[...features.features]};
}
/** Fresh source selection; no source/owner/verdict is shared across calls. */
export function createOwnedCoreSourceContext(input){
 assertReverseConcreteSourceHost();const data=ownedPlainData(input);exactKeys(data,['files','runtimeRoot','declarationRoot']);ownedSourcePath(data.runtimeRoot);ownedSourcePath(data.declarationRoot);
 if(!Array.isArray(data.files)||!data.files.length||data.files.length>4096)fail('complete files required');
 const files=new Map();let bytes=0;
 for(const row of data.files){exactKeys(row,['path','source']);ownedSourcePath(row.path);if(typeof row.source!=='string'||files.has(row.path))fail('duplicate or invalid source');bytes+=Buffer.byteLength(row.source);if(bytes>16777216)fail('complete input byte budget');files.set(row.path,row.source);}
 const expected=ownedCoreRuntimeSources(data.runtimeRoot,data.declarationRoot);
 for(const row of expected)if(files.get(row.path)!==row.source)fail('registered materialized runtime differs: '+row.path);
 const edge=rustEdge(files);
 const receipts=data.files.map(row=>({path:row.path,source:row.source,sha256:digest(row.source)}));
 const handle=Object.freeze({schema:'owned-core-source-context-v1'});
 contexts.set(handle,{data,files,receipts,edge});requireOwnedCoreSourceCurrent(handle);return handle;
}
export function requireOwnedCoreSourceCurrent(handle){
 assertReverseConcreteSourceHost();const state=contexts.get(handle);if(!state)fail('unissued source context');
 for(const row of state.receipts)if(digest(row.source)!==row.sha256||state.files.get(row.path)!==row.source)fail('source receipt differs');
 for(const row of ownedCoreRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('current runtime differs');
 rustEdge(state.files);assertReverseConcreteSourceHost();
}
/** Detached full original data, used to reconstruct private authority on read. */
export function ownedCoreSourceData(handle){requireOwnedCoreSourceCurrent(handle);return ownedPlainData(contexts.get(handle).data);}
// Native AST/Program/checker storage is confined to a single fresh traversal.
// Neither the receiving handle nor issued emission facts retains it.
export function originalOwnedCoreModule(handle,path){
 requireOwnedCoreSourceCurrent(handle);const state=contexts.get(handle);ownedSourcePath(path);const ts=ownershipCompiler(),syntax=new Map();
 for(const [name,source]of state.files)if(/\.(?:mjs|mts|ts)$/u.test(name))syntax.set(name,parsed(ts,name,source));
 const file=syntax.get(path);if(!file)fail('actual original module absent');
 const host={getSourceFile:name=>syntax.get(name),getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>syntax.has(name),readFile:name=>state.files.get(name),getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n',resolveModuleNames:(names,from)=>names.map(name=>{
  if(!name.startsWith('.'))return undefined;const target=relative(from,name),declaration=target.replace(/\.mjs$/u,'.d.mts');
  const paired=posix.dirname(target)===state.data.runtimeRoot?state.data.declarationRoot+'/'+posix.basename(declaration):declaration;
  const selected=syntax.has(declaration)?declaration:syntax.has(paired)?paired:target;return syntax.has(selected)?{resolvedFileName:selected,extension:selected.endsWith('.d.mts')?ts.Extension.Dmts:selected.endsWith('.mts')?ts.Extension.Mts:selected.endsWith('.ts')?ts.Extension.Ts:ts.Extension.Mjs}:undefined;
 })};
 const program=ts.createProgram([...syntax.keys()],{allowJs:true,checkJs:true,noLib:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022},host);
 const traversal={ts,syntax,file,source:state.files.get(path),checker:program.getTypeChecker(),runtimeRoot:state.data.runtimeRoot};
 traversals.set(traversal,{handle,state});return traversal;
}
/** Resolve an actual source import symbol, including only exact named reexports. */
export function originalOwnedCoreImport(handle,path,node,analysis){
 const {file,ts,checker,syntax}=analysis,privateState=traversals.get(analysis);assertReverseConcreteSourceHost();const state=contexts.get(handle);
 if(!privateState||privateState.handle!==handle||privateState.state!==state||file.fileName!==path)fail('foreign source traversal');
 if(!ts.isIdentifier(node))fail('direct original imported call required');
 const symbol=checker.getSymbolAtLocation(node),declarations=symbol?.declarations;
 if(!declarations||declarations.length!==1||!ts.isImportSpecifier(declarations[0]))fail('callee is not the actual import symbol');
 const spec=declarations[0],declaration=spec.parent.parent.parent;
 if(declaration.getSourceFile()!==file||!ts.isStringLiteral(declaration.moduleSpecifier))fail('foreign import declaration');
 let target=relative(path,declaration.moduleSpecifier.text),name=(spec.propertyName??spec.name).text,ownerFile=file,ownerDeclaration=declaration;const links=[];
 for(let depth=0;depth<32;depth++){
  const source=state.files.get(target);if(source===undefined)fail('import target missing');links.push({path:target,name,source,from:{path:ownerFile.fileName,span:[ownerDeclaration.getStart(ownerFile),ownerDeclaration.end]}});
  if(target===state.data.runtimeRoot+'/json-update-runtime.mjs'||target===state.data.runtimeRoot+'/json-macro-runtime.mjs'){
   const typesOnly=spec.isTypeOnly||declaration.importClause?.isTypeOnly;
   const actual=typesOnly?syntax.get(state.data.declarationRoot+'/'+posix.basename(target).replace(/\.mjs$/u,'.d.mts')):syntax.get(target);
   const exported=actual?.statements.some(item=>item.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)&&((item.name?.text===name)||(ts.isVariableStatement(item)&&item.declarationList.declarations.some(node=>ts.isIdentifier(node.name)&&node.name.text===name))));
   if(!exported)fail('original runtime has no such export');return {target,name,links,local:node.text};
  }
  const next=syntax.get(target);if(!next||next.statements.length!==1)fail('only a single transparent reexport declaration');let selected=null;
  for(const item of next.statements){
   if(!ts.isExportDeclaration(item)||!item.moduleSpecifier||!item.exportClause||!ts.isNamedExports(item.exportClause))fail('nontransparent reexport module');
   for(const leaf of item.exportClause.elements){if(leaf.name.text!==name)fail('extra reexport requires independent source closure');if(leaf.name.text===name){if(selected)fail('competing export');selected={target:relative(target,item.moduleSpecifier.text),name:(leaf.propertyName??leaf.name).text,owner:item,file:next};}}
  }
  if(!selected)fail('export not found');target=selected.target;name=selected.name;ownerDeclaration=selected.owner;ownerFile=selected.file;
 }
 fail('reexport depth');
}

export function originalOwnedCoreType(handle,path,type,analysis){
 const {ts,file}=analysis,privateState=traversals.get(analysis);if(privateState?.handle!==handle)fail('foreign type traversal');const state=privateState.state;
 if(!type)fail('written input domain required');
 if(type.kind===ts.SyntaxKind.StringKeyword)return 'str';
 if(type.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';

 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)){
  const binding=originalOwnedCoreImport(handle,path,type.typeName,analysis);
  if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&binding.name==='JsonValue'&&!type.typeArguments)return 'json-ref';
 }
 if(ts.isImportTypeNode(type)&&!type.isTypeOf&&ts.isLiteralTypeNode(type.argument)&&ts.isStringLiteral(type.argument.literal)&&type.qualifier?.text==='JsonValue'&&!type.typeArguments){
  if(relative(path,type.argument.literal.text)!==state.data.runtimeRoot+'/json-macro-runtime.mjs')fail('unregistered type import');return 'json-ref';
 }
 // Map and byte domains must be written through the actual imported operation,
 // not a caller's similarly-shaped object/array declaration.
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&['0','1'].includes(type.indexType.literal.text)&&ts.isTypeReferenceNode(type.objectType)&&type.objectType.typeName.getText(file)==='Parameters'&&type.objectType.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.objectType.typeName)?.declarations?.length)fail('shadowed Parameters type');
  const query=type.objectType.typeArguments[0];
  if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis);
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'&&type.indexType.literal.text==='0')return 'map-ref';
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_index_usize'&&type.indexType.literal.text==='1')return 'usize';
  }
 }
 fail('unregistered written type domain');
}
