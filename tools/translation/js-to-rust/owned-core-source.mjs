// A fresh, explicit receiving-source transaction. Public source data is input,
// never a callable permit. Private membership is reissued after meta decoding.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from '../json-macro-features.mjs';
import {hostRuntimeAssetsNamedDataAliases as hostRuntimeAssets} from '../host-assets.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {selectOriginalRouterCoreFacade} from '../router-core-facade-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';
import {ownedCorePairedTypePath,prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';
import {ownedBase64Operation,ownedBase64Compatible,ownedBase64ReadonlyOctets,ownedBase64Result} from './owned-base64-source.mjs';
import {ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';

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
 for(const name of ['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts'])visit(name);
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
 const modules=[{file:'src/lib.rs',path:[],source,sourceView:views.views[0],configurationCondition:views.views[0].configurationCondition}];
 for(const [path,name]of [['src/translation_core.rs',['translation_core']],['src/translation_core/primitives.rs',['translation_core','primitives']]]){
  const text=files.get(path),capture=captureSourceModuleViews({source:text,sourcePath:path}),sourceView=capture.views[0];
  modules.push({file:path,path:name,source:text,sourceView,configurationCondition:sourceView.configurationCondition});
 }
 const evidence=resolveModuleBindings({modules}),selected=selectOriginalRouterCoreFacade({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});
 return {path:selected.rootFile,span:[...selected.span],dependencyDigest:dependencies.digest,features:[...features.features],bindingDiagnostics:evidence.diagnostics};
}
// Full fixed native library sources are rejoined for every selected base64 use.
// These bytes establish the explicit library-unit ABI, not Engine permission.
function base64Source(files){
 if(files.get('src/translation_core/base64.rs')!==ROUTER_CORE_BASE64_SOURCE)fail('complete owned base64 leaf required');
 const concrete=transportConcreteSyntaxSource(files.get('src/translation_core/base64.rs'),{language:'Rust'});
 if(concrete.source!==ROUTER_CORE_BASE64_SOURCE)fail('complete base64 native CST source differs');
 const capture=captureSourceModuleViews({source:concrete.source,sourcePath:'src/translation_core/base64.rs'}),functions=originalModuleViewItems(capture.views[0],concrete.source).filter(item=>item.term==='fn');
 if(functions.length!==13||functions.some(item=>!ownedBase64Operation('router_core_'+item.name)))fail('actual complete base64 source operations differ');
 const proof=deriveDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof;
 if(!proof)fail('actual locked base64 dependency required');
 const actual=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));
 if(actual.dependency.package!=='base64'||actual.dependency.version!=='0.23.1')fail('actual base64 package source required');
 return actual;
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
 rustEdge(state.files);if(state.files.has('src/translation_core/base64.rs')&&state.files.get('src/translation_core/base64.rs')!==ROUTER_CORE_BASE64_SOURCE)fail('current base64 leaf differs');assertReverseConcreteSourceHost();
}
/** Detached full original data, used to reconstruct private authority on read. */
export function ownedCoreSourceData(handle){requireOwnedCoreSourceCurrent(handle);return ownedPlainData(contexts.get(handle).data);}
// Native AST/Program/checker storage is confined to a single fresh traversal.
// Neither the receiving handle nor issued emission facts retains it.
function originalOwnedCoreModule(handle,path){
 requireOwnedCoreSourceCurrent(handle);const state=contexts.get(handle);ownedSourcePath(path);const ts=ownershipCompiler(),syntax=new Map();
 for(const [name,source]of state.files)if(/\.(?:mjs|mts|ts)$/u.test(name))syntax.set(name,parsed(ts,name,source));
 const file=syntax.get(path);if(!file)fail('actual original module absent');
 const host={getSourceFile:name=>syntax.get(name),getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>syntax.has(name),readFile:name=>state.files.get(name),getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n',resolveModuleNames:(names,from)=>names.map(name=>{
  if(!name.startsWith('.'))return undefined;const target=relative(from,name),declaration=target.replace(/\.mjs$/u,'.d.mts');
  const paired=posix.dirname(target)===state.data.runtimeRoot?state.data.declarationRoot+'/'+posix.basename(declaration):declaration;
  const selected=syntax.has(declaration)?declaration:syntax.has(paired)?paired:target;return syntax.has(selected)?{resolvedFileName:selected,extension:selected.endsWith('.d.mts')?ts.Extension.Dmts:selected.endsWith('.mts')?ts.Extension.Mts:selected.endsWith('.ts')?ts.Extension.Ts:ts.Extension.Mjs}:undefined;
 })};
 const program=ts.createProgram([...syntax.keys()],{allowJs:true,checkJs:true,noLib:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022},host);
 if(program.getSyntacticDiagnostics(file).length)fail('native source syntax: '+path);
 const traversal={ts,syntax,file,source:state.files.get(path),checker:program.getTypeChecker(),runtimeRoot:state.data.runtimeRoot};
 traversals.set(traversal,{handle,state});return traversal;
}
function pairedFunction(handle,path,declaration,analysis){
 const privateState=traversals.get(analysis);if(privateState?.handle!==handle)fail('foreign paired traversal');
 const {state}=privateState;
 if(analysis.pairedTypes===undefined){
  const target=ownedCorePairedTypePath(path,state.files,state.data.runtimeRoot,state.data.declarationRoot);
  analysis.pairedTypes=target===null?null:prepareOwnedCorePairedTypes(path,analysis.source,target,state.files.get(target));
 }
 const pair=analysis.pairedTypes;if(!pair)return null;
 const span=[declaration.getStart(analysis.file),declaration.end],selected=pair.functions.filter(item=>item.javascriptSpan[0]===span[0]&&item.javascriptSpan[1]===span[1]);
 if(selected.length!==1)fail('actual paired function span differs');
 const evidence=selected[0],file=analysis.syntax.get(pair.typescript.path);
 if(!file||file.text!==pair.typescript.source)fail('complete paired original source differs');
 const nodes=file.statements.filter(node=>analysis.ts.isFunctionDeclaration(node)&&node.getStart(file)===evidence.typescriptSpan[0]&&node.end===evidence.typescriptSpan[1]);
 if(nodes.length!==1||nodes[0].name.text!==declaration.name.text)fail('actual paired native declaration differs');
 const typed={...analysis,file,source:file.text};traversals.set(typed,{handle,state,paired:true});
 return {declaration:nodes[0],analysis:typed,evidence,pair};
}
function originalImportTarget(from,specifier,analysis,state){
 const target=relative(from,specifier);
 // A paired TS import resolves its genuine .d.mts in declarationRoot. Its
 // fixed runtime counterpart remains the independently checked JS callee.
 if(traversals.get(analysis)?.paired&&posix.dirname(target)===state.data.declarationRoot&&['json-update-runtime.mjs','json-macro-runtime.mjs','base64-runtime.mjs'].includes(posix.basename(target))){
  const runtime=state.data.runtimeRoot+'/'+posix.basename(target);
  if(state.files.has(target)&&state.files.get(target)!==state.files.get(runtime))fail('paired runtime counterpart differs');return runtime;
 }
 return target;
}
/** Resolve an actual source import symbol, including only exact named reexports. */
function originalOwnedCoreImport(handle,path,node,analysis){
 const {file,ts,checker,syntax}=analysis,privateState=traversals.get(analysis);assertReverseConcreteSourceHost();const state=contexts.get(handle);
 if(!privateState||privateState.handle!==handle||privateState.state!==state||file.fileName!==path)fail('foreign source traversal');
 if(!ts.isIdentifier(node))fail('direct original imported call required');
 const symbol=checker.getSymbolAtLocation(node),declarations=symbol?.declarations;
 if(!declarations||declarations.length!==1||!ts.isImportSpecifier(declarations[0]))fail('callee is not the actual import symbol');
 const spec=declarations[0],declaration=spec.parent.parent.parent;
 if(declaration.getSourceFile()!==file||!ts.isStringLiteral(declaration.moduleSpecifier))fail('foreign import declaration');
 let target=originalImportTarget(path,declaration.moduleSpecifier.text,analysis,state),name=(spec.propertyName??spec.name).text,ownerFile=file,ownerDeclaration=declaration;const links=[];
 for(let depth=0;depth<32;depth++){
  const source=state.files.get(target);if(source===undefined)fail('import target missing');links.push({path:target,name,source,from:{path:ownerFile.fileName,span:[ownerDeclaration.getStart(ownerFile),ownerDeclaration.end]}});
  if(target===state.data.runtimeRoot+'/json-update-runtime.mjs'||target===state.data.runtimeRoot+'/json-macro-runtime.mjs'||target===state.data.runtimeRoot+'/base64-runtime.mjs'){
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

function originalOwnedCoreType(handle,path,type,analysis){
 const {ts,file}=analysis,privateState=traversals.get(analysis);if(privateState?.handle!==handle)fail('foreign type traversal');const state=privateState.state;
 if(!type)fail('written input domain required');
 if(type.kind===ts.SyntaxKind.StringKeyword)return 'str';
 if(type.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';
 if(ownedBase64ReadonlyOctets(ts,type))return 'bytes-ref';

 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text!=='ReturnType'){
  const binding=originalOwnedCoreImport(handle,path,type.typeName,analysis);
  if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&binding.name==='JsonValue'&&!type.typeArguments)return 'json-ref';
  if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&!type.typeArguments){if(binding.name==='Base64Error')return 'base64-error-ref';if(binding.name==='Base64Result')return 'base64-result';}
 }
 if(ts.isImportTypeNode(type)&&!type.isTypeOf&&ts.isLiteralTypeNode(type.argument)&&ts.isStringLiteral(type.argument.literal)&&type.qualifier?.text==='JsonValue'&&!type.typeArguments){
  if(originalImportTarget(path,type.argument.literal.text,analysis,state)!==state.data.runtimeRoot+'/json-macro-runtime.mjs')fail('unregistered type import');return 'json-ref';
 }
 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text==='ReturnType'&&type.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.typeName)?.declarations?.length)fail('shadowed ReturnType type');
  const query=type.typeArguments[0];if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis),op=ownedBase64Operation(binding.name);
   if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&op)return op.ret;
  }
 }
 // Map and byte domains must be written through the actual imported operation,
 // not a caller's similarly-shaped object/array declaration.
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&['0','1'].includes(type.indexType.literal.text)&&ts.isTypeReferenceNode(type.objectType)&&type.objectType.typeName.getText(file)==='Parameters'&&type.objectType.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.objectType.typeName)?.declarations?.length)fail('shadowed Parameters type');
  const query=type.objectType.typeArguments[0];
  if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis);
   const base64=ownedBase64Operation(binding.name);if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&base64&&type.indexType.literal.text==='0')return base64.input;
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'&&type.indexType.literal.text==='0')return 'map-ref';
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_index_usize'&&type.indexType.literal.text==='1')return 'usize';
  }
 }
 fail('unregistered written type domain');
}

// The compiler traversal is entirely private. Only detached source/body facts
// leave this operation; every emission boundary reconstructs them afresh.
const OPS=Object.freeze({
 router_core_json_copy:{args:['json'],ret:'json',rust:'json_copy'},
 router_core_json_with_field:{args:['json','str','json'],ret:'json',rust:'json_with_field'},
 router_core_json_index_str:{args:['json','str'],ret:'json-ref',rust:'json_index_str',root:0},
 router_core_json_index_usize:{args:['json','usize'],ret:'json-ref',rust:'json_index_usize',root:0},
 router_core_json_map_index:{args:['map-ref','str'],ret:'json-ref',rust:'json_map_index',root:0},
 json_macro_value:{args:['json'],ret:'json',rust:'json_copy'},
 json_macro_null:{args:[],ret:'json',rust:null},
 json_macro_bool:{args:['bool'],ret:'json',rust:null},
 json_macro_string:{args:['str'],ret:'json',rust:null},
 json_macro_u64:{args:['u64'],ret:'json',rust:null},
 json_macro_i64:{args:['i64'],ret:'json',rust:null},
});
const KEYS=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual'.split(' '));
function rustName(name){
 if(!/^[a-z][A-Za-z0-9_]*$/u.test(name)||KEYS.has(name))fail('nonportable declaration name');
 const rust=name.replace(/[A-Z]/gu,c=>'_'+c.toLowerCase());if(KEYS.has(rust))fail('reserved declaration name');return rust;
}
const json=type=>type==='json'||type==='json-ref';
const compatible=(actual,wanted)=>wanted==='json'?json(actual):wanted==='i64'?actual==='i64'||actual==='usize':wanted==='u64'?actual==='usize':actual===wanted;
export function analyzeOriginalOwnedCoreSource(context,path){
 const analysis=originalOwnedCoreModule(context,path),{ts,file,source}=analysis,program=[],diagnostics=[],items=[];
 const functions=file.statements.filter(ts.isFunctionDeclaration);
 // Top-level evaluation, namespace imports and unsupported exports are not
 // silently erased. Their full source remains in the refusal manifest.
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('only actual named imports');
   for(const spec of item.importClause.namedBindings.elements)originalOwnedCoreImport(context,path,spec.name,analysis);continue;
  }
  if(ts.isFunctionDeclaration(item))continue;
  if(ts.isEmptyStatement(item))continue;
  fail('top-level evaluation or unsupported declaration');
 }
 for(const declaration of functions){
  const span=[declaration.getStart(file),declaration.end],name=declaration.name?.text??null;
  try{const item=checkFunction(context,path,declaration,analysis);program.push(item);items.push({name,span,status:'translated'});}
  catch(error){if(!(error instanceof TypeError))throw error;const diagnostic={kind:'owned-core',name,span,message:error.message};diagnostics.push(diagnostic);items.push({name,span,status:'unsupported',diagnostic});}
 }
 requireOwnedCoreSourceCurrent(context);return {program,diagnostics,items,source,path};
}
function checkFunction(context,path,declaration,analysis){
 const {ts,file,source,checker}=analysis;
 if(!declaration.name||!declaration.body||declaration.asteriskToken||declaration.typeParameters||declaration.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary original named function required');
 const name=rustName(declaration.name.text),params=[],environment=new Map();let cells=0,paired=null;
 const tick=depth=>{if(++cells>100000||depth>160)fail('whole function flow budget');};
 function bind(identifier,value,scope){
  if(!ts.isIdentifier(identifier)||scope.has(identifier.text)||identifier.text.startsWith('__ro'))fail('duplicate, reserved or nonidentifier binding');
  const rust=rustName(identifier.text);if([...scope.values()].some(binding=>binding.rust===rust))fail('colliding Rust binding');
  const symbol=checker.getSymbolAtLocation(identifier);if(!symbol)fail('unresolved lexical declaration');scope.set(identifier.text,{...value,symbol,rust});return identifier.text;
 }
 for(let index=0;index<declaration.parameters.length;index++){
  const param=declaration.parameters[index];
  if(param.dotDotDotToken||param.questionToken||param.initializer||param.modifiers?.length)fail('default/rest/optional parameter');
  const written=param.type??ts.getJSDocType(param);let type;
  if(written)type=originalOwnedCoreType(context,path,written,analysis);
  else{
   paired??=pairedFunction(context,path,declaration,analysis);
   type=paired?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.parameters[index].type,paired.analysis):originalOwnedCoreType(context,path,undefined,analysis);
  }
  if(type==='base64-result')fail('native base64 result input control is not implemented');
  if(type==='text-owned')type='str';
  const identifier=param.name;
  const sourceName=bind(identifier,{type,root:['json-ref','map-ref','str','bytes-ref','base64-error-ref'].includes(type)?identifier.text:null,input:true},environment);
  params.push({name:sourceName,rust:rustName(sourceName),type});
 }
 if(declaration.parameters.length===0)paired=pairedFunction(context,path,declaration,analysis);
 const hostCalls=[],byteInputs=new Set();
 const branchScope=scope=>new Map([...scope].map(([key,value])=>[key,ownedBase64Result(value.type)?{...value}:value]));
 const mergeMoves=(scope,yes,no)=>{for(const [key,value]of scope)if(ownedBase64Result(value.type))value.moved=!!yes.get(key)?.moved||!!no.get(key)?.moved;};
 function expression(node,scope,depth){
  tick(depth);if(ts.isParenthesizedExpression(node))return expression(node.expression,scope,depth+1);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
   if(/\p{Surrogate}/u.test(node.text))fail('unpaired UTF16 string');return {kind:'string',value:node.text,type:'str',root:null};
  }
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool',root:null};
  if(ts.isBigIntLiteral(node)){
   const text=node.text.replace(/n$/u,'').replaceAll('_','');let value;try{value=BigInt(text);}catch{fail('invalid integer');}
   if(value<0n||value>18446744073709551615n)fail('u64 literal bound');return {kind:'integer',value:value.toString(),type:'usize',root:null};
  }
  if(ts.isIdentifier(node)){
   const value=scope.get(node.text);if(!value||checker.getSymbolAtLocation(node)!==value.symbol)fail('unknown, shadowed or moved binding');
   if(ownedBase64Result(value.type)){if(value.moved)fail('native base64 result used after move');value.moved=true;}
   return {kind:'variable',name:node.text,type:value.type,root:value.root};
  }
  if(ts.isCallExpression(node)){
   if(node.questionDotToken||node.typeArguments?.length||node.arguments.some(ts.isSpreadElement))fail('optional/generic/spread call');
   const binding=originalOwnedCoreImport(context,path,node.expression,analysis),op=OPS[binding.name];
   const base64=ownedBase64Operation(binding.name);
   if(base64&&binding.target===analysis.runtimeRoot+'/base64-runtime.mjs'){
    base64Source(traversals.get(analysis).state.files);
    if(node.arguments.length!==1)fail('fixed base64 arity');const argument=expression(node.arguments[0],scope,depth+1);
    if(!ownedBase64Compatible(argument.type,base64.input))fail('actual base64 argument domain differs');
    if(base64.input==='bytes-ref'){if(!argument.root||!params.some(param=>param.name===argument.root&&param.type==='bytes-ref'))fail('base64 octets require a live original input');byteInputs.add(argument.root);}
    if(base64.input==='base64-error-ref'&&!argument.root)fail('native error requires a live original input');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
    return {kind:'base64-call',name:binding.name,args:[argument],type:base64.ret,root:null,copy:base64.copy};
   }
   const expected=analysis.runtimeRoot+'/'+(binding.name.startsWith('json_macro_')?'json-macro-runtime.mjs':'json-update-runtime.mjs');
   if(['json_macro_array','json_macro_object'].includes(binding.name)&&binding.target===expected){
    if(node.arguments.length!==1||!ts.isArrayLiteralExpression(node.arguments[0])||node.arguments[0].elements.length>4096)fail('literal dense JSON constructor required');
    const values=[],keys=new Set();
    for(const element of node.arguments[0].elements){
     if(ts.isSpreadElement(element)||ts.isOmittedExpression(element))fail('dense literal JSON constructor required');
     if(binding.name==='json_macro_array'){const value=expression(element,scope,depth+1);if(!json(value.type))fail('JSON array element domain');values.push(value);}
     else{
      if(!ts.isArrayLiteralExpression(element)||element.elements.length!==2||!ts.isStringLiteral(element.elements[0])||ts.isSpreadElement(element.elements[1])||ts.isOmittedExpression(element.elements[1]))fail('literal JSON entry pair required');
      const key=element.elements[0].text;if(/\p{Surrogate}/u.test(key)||keys.has(key))fail('invalid or duplicate literal JSON key');keys.add(key);
      const value=expression(element.elements[1],scope,depth+1);if(!json(value.type))fail('JSON object value domain');values.push({key,value});
     }
    }
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
    return binding.name==='json_macro_array'?{kind:'json-array',items:values,type:'json',root:null}:{kind:'json-object',entries:values,type:'json',root:null};
   }
   if(!op||binding.target!==expected)fail('unregistered source operation');
   const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
   if(args.length!==op.args.length||args.some((argument,index)=>!compatible(argument.type,op.args[index])))fail('owned argument type differs');
   // Shared index loans from temporaries cannot outlive their owner. No alias
   // or public source flag changes the actual root identity.
   const root=op.root===undefined?null:args[op.root].root;
   if(op.root!==undefined&&!root)fail('index requires a live input root');
   hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
   return {kind:'owned-call',name:binding.name,args,type:op.ret,root};
  }
  if(ts.isConditionalExpression(node)){
   const cond=expression(node.condition,scope,depth+1),a=branchScope(scope),b=branchScope(scope),yes=expression(node.whenTrue,a,depth+1),no=expression(node.whenFalse,b,depth+1);
   if(cond.type!=='bool'||yes.type!==no.type||yes.root!==no.root)fail('conditional result or loan differs');mergeMoves(scope,a,b);return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:yes.root};
  }
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken){const value=expression(node.operand,scope,depth+1);if(value.type!=='bool')fail('boolean negation only');return {kind:'not',value,type:'bool',root:null};}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)){
   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);
   if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':!['bool','str','usize'].includes(left.type)||left.type!==right.type)fail('identity/coercion comparison outside owned profile');
   return {kind:'binary',op,left,right,type:'bool',root:null};
  }
  fail('unimplemented expression '+ts.SyntaxKind[node.kind]);
 }
 let resultType=null,resultRoot=null;
 function block(statements,scope,depth){
  const body=[];let terminated=false;
  for(const statement of statements){
   tick(depth);if(terminated)fail('statement after terminating return');
   if(ts.isVariableStatement(statement)){
    if(statement.modifiers?.length||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const)fail('only fresh immutable local declarations');
    for(const declaration of statement.declarationList.declarations){
     if(!declaration.initializer||declaration.exclamationToken||declaration.type)fail('unsupported local declaration');const value=expression(declaration.initializer,scope,depth+1);
     if(paired){
      const evidence=paired.evidence.locals.filter(item=>item.javascriptSpan[0]===declaration.getStart(file)&&item.javascriptSpan[1]===declaration.end);if(evidence.length!==1)fail('actual paired local span differs');
      const span=evidence[0].typeSpan;
      if(span){
       let actual;const find=node=>{if(ts.isVariableDeclaration(node)&&node.getStart(paired.analysis.file)===evidence[0].typescriptSpan[0]&&node.end===evidence[0].typescriptSpan[1])actual=node;ts.forEachChild(node,find);};find(paired.declaration.body);
       if(!actual?.type||actual.type.getStart(paired.analysis.file)!==span[0]||actual.type.end!==span[1])fail('actual paired local type differs');
       const written=originalOwnedCoreType(context,paired.pair.typescript.path,actual.type,paired.analysis);
       if(written==='json-ref'?!json(value.type):!ownedBase64Compatible(value.type,written))fail('paired written local ABI differs');
      }
     }
     const name=bind(declaration.name,{type:value.type,root:value.root},scope);body.push({kind:'let',name,value});
    }
   }else if(ts.isReturnStatement(statement)&&statement.expression){
    const value=expression(statement.expression,scope,depth+1);
    if(!['json','json-ref','bool','str','usize','text-owned','base64-result'].includes(value.type))fail('unsupported owned result');
    if(value.type==='json-ref'&&!params.some(param=>param.name===value.root&&['json-ref','map-ref'].includes(param.type)))fail('returned local loan');
    if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root))fail('return domains differ');resultType=value.type;resultRoot=value.root;body.push({kind:'return',value});terminated=true;
   }else if(ts.isIfStatement(statement)&&ts.isBlock(statement.thenStatement)&&statement.elseStatement&&ts.isBlock(statement.elseStatement)){
    const cond=expression(statement.expression,scope,depth+1);if(cond.type!=='bool')fail('nonboolean condition');
    const a=branchScope(scope),b=branchScope(scope),yes=block(statement.thenStatement.statements,a,depth+1),no=block(statement.elseStatement.statements,b,depth+1);
    if(!yes.terminated||!no.terminated)fail('partial branch flow');mergeMoves(scope,a,b);body.push({kind:'if',cond,then:yes.body,else:no.body});terminated=true;
   }else fail('statement/effects outside owned profile');
  }
  return {body,terminated};
 }
 const checked=block(declaration.body.statements,environment,0);if(!checked.terminated)fail('missing return');
 if(paired)for(let index=0;index<params.length;index++){
  const actual=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.parameters[index].type,paired.analysis);
  if((actual==='text-owned'?'str':actual)!==params[index].type)fail('paired written parameter ABI differs');
 }
 const writtenReturn=declaration.type??ts.getJSDocReturnType(declaration);
 if(writtenReturn){
  const written=originalOwnedCoreType(context,path,writtenReturn,analysis);
  if(written==='json-ref'?!json(resultType):!ownedBase64Compatible(resultType,written))fail('written return ABI differs from original checked body');
  // A written Value domain accepts owned or borrowed results; it never
  // supplies or changes the independently checked loan/root identity.
 }
 if(paired?.declaration.type){
  const written=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis);
  if(written==='json-ref'?!json(resultType):!ownedBase64Compatible(resultType,written))fail('paired written return ABI differs');
 }
 if(params.some(param=>param.type==='bytes-ref'&&!byteInputs.has(param.name)))fail('octet input requires an actual fixed base64 operand');
 if(!hostCalls.length)fail('no actual owned-core call');
 const item={kind:'owned-function',name,javascript:declaration.name.text,exported:!!declaration.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword),params,returns:resultType,resultRoot,body:checked.body,source:{path,source,span:[declaration.getStart(file),declaration.end]},hostCalls};
 if(paired)item.pairedSource={path:paired.pair.typescript.path,source:paired.pair.typescript.source,span:paired.evidence.typescriptSpan,parameters:paired.evidence.parameters,locals:paired.evidence.locals,returnSpan:paired.evidence.returnSpan,erasure:paired.pair.erasure.edits};
 requireOwnedCoreSourceCurrent(context);return item;
}
