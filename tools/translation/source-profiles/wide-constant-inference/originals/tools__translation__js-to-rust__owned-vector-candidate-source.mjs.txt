import {captureOriginalOwnedVectorProfiles,checkOriginalOwnedVectorFunction} from './owned-vector-candidate-support.mjs';
// A fresh, explicit receiving-source transaction. Public source data is input,
// never a callable permit. Private membership is reissued after meta decoding.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from '../json-macro-features.mjs';
import {ownedVectorJsonFieldRuntimeAssets as hostRuntimeAssets} from '../vector-json-field-runtime-assets.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {selectOriginalRouterCoreFacade} from '../router-core-facade-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';
import {ownedCorePairedTypePath,prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';
import {ownedBase64Operation,ownedBase64Compatible,ownedBase64ReadonlyOctets,ownedBase64Result,readOwnedBase64ResultImportType,consumeOwnedBase64InputPrelude} from './owned-base64-source.mjs';
import {ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {ownedJsonReaderOperation,ownedJsonOptionalPayload,ownedJsonBorrowed} from './owned-json-source.mjs';
import {ownedJsonOptionalReaderOperation} from './owned-json-source.mjs';

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
 for(const name of ['owned-vector-text-runtime.mjs','owned-vector-text-runtime.d.mts','json-fields-runtime.mjs','json-fields-runtime.d.mts','json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts','json-runtime.d.mts','json-option-runtime.mjs','json-option-runtime.d.mts'])visit(name);
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
 assertReverseConcreteSourceHost();const data=ownedPlainData(input);exactKeys(data,['files','runtimeRoot','declarationRoot','vectorBindings',...(Object.hasOwn(data,'primitiveOperators')?['primitiveOperators']:[]),...(Object.hasOwn(data,'primitiveDefinitions')?['primitiveDefinitions']:[]),...(Object.hasOwn(data,'primitiveVectorDefinitions')?['primitiveVectorDefinitions']:[])]);if(Object.hasOwn(data,'primitiveOperators')&&data.primitiveOperators!==true)fail('explicit primitive operator context requires true');if(Object.hasOwn(data,'primitiveDefinitions')&&(data.primitiveDefinitions!==true||data.primitiveOperators!==true))fail('primitive definition profile requires explicit true and its complete primitive operator runtime');if(Object.hasOwn(data,'primitiveVectorDefinitions')&&(data.primitiveVectorDefinitions!==true||data.primitiveDefinitions!==true||data.primitiveOperators!==true))fail('vector definitions require the explicit complete primitive definition/operator source profile');ownedSourcePath(data.runtimeRoot);ownedSourcePath(data.declarationRoot);
 if(!Array.isArray(data.files)||!data.files.length||data.files.length>4096)fail('complete files required');
 const files=new Map();let bytes=0;
 for(const row of data.files){exactKeys(row,['path','source']);ownedSourcePath(row.path);if(typeof row.source!=='string'||files.has(row.path))fail('duplicate or invalid source');bytes+=Buffer.byteLength(row.source);if(bytes>16777216)fail('complete input byte budget');files.set(row.path,row.source);}
 const expected=ownedCoreRuntimeSources(data.runtimeRoot,data.declarationRoot);
 for(const row of expected)if(files.get(row.path)!==row.source)fail('registered materialized runtime differs: '+row.path);
 if(data.primitiveOperators===true||files.has(data.runtimeRoot+'/primitive-operator-runtime.mjs')||files.has(data.declarationRoot+'/primitive-operator-runtime.d.mts'))for(const row of ownedPrimitiveOperatorRuntimeSources(data.runtimeRoot,data.declarationRoot))if(files.get(row.path)!==row.source)fail('complete primitive operator runtime differs');
 const edge=rustEdge(files);
 const receipts=data.files.map(row=>({path:row.path,source:row.source,sha256:digest(row.source)}));
 const handle=Object.freeze({schema:'owned-core-source-context-v1'});
 contexts.set(handle,{data,files,receipts,edge});requireOwnedCoreSourceCurrent(handle);return handle;
}
export function requireOwnedCoreSourceCurrent(handle){
 assertReverseConcreteSourceHost();const state=contexts.get(handle);if(!state)fail('unissued source context');
 if(state.data.primitiveOperators===true||state.files.has(state.data.runtimeRoot+'/primitive-operator-runtime.mjs')||state.files.has(state.data.declarationRoot+'/primitive-operator-runtime.d.mts'))for(const row of ownedPrimitiveOperatorRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('current primitive operator runtime differs');
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
 const traversal={ts,syntax,file,source:state.files.get(path),checker:program.getTypeChecker(),runtimeRoot:state.data.runtimeRoot,vectorProfiles:captureOriginalOwnedVectorProfiles(state.data,path)};
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
 if(traversals.get(analysis)?.paired&&posix.dirname(target)===state.data.declarationRoot&&['primitive-operator-runtime.mjs','json-update-runtime.mjs','json-macro-runtime.mjs','base64-runtime.mjs','json-runtime.mjs','json-option-runtime.mjs'].includes(posix.basename(target))){
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
  if(target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'||target===state.data.runtimeRoot+'/primitive-operator-runtime.mjs'||target===state.data.runtimeRoot+'/json-update-runtime.mjs'||target===state.data.runtimeRoot+'/json-macro-runtime.mjs'||target===state.data.runtimeRoot+'/base64-runtime.mjs'||target===state.data.runtimeRoot+'/json-runtime.mjs'||target===state.data.runtimeRoot+'/json-option-runtime.mjs'||target===state.data.runtimeRoot+'/json-fields-runtime.mjs'){
   if(target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&name!=='requireScalarString'&&!ownedVectorTextScalarOperation(name))fail('only actual scalar string validation and fixed text scalar exports are registered');
   if(target===state.data.runtimeRoot+'/json-fields-runtime.mjs'){if(!ownedVectorJsonFieldOperation(name))fail('field export requires a supported copied plain/shared/primitive payload domain');requireOwnedVectorJsonFieldSources(state.files,state.data);}
   if(target===state.data.runtimeRoot+'/primitive-operator-runtime.mjs'&&(!ownedPrimitiveOperatorOperation(name)&&!((spec.isTypeOnly||declaration.importClause?.isTypeOnly)&&primitiveBitwiseAlias(name))||state.data.primitiveOperators!==true&&!ownedNativeClosedOperator(name)&&!((spec.isTypeOnly||declaration.importClause?.isTypeOnly)&&primitiveBitwiseAlias(name))))fail('unregistered primitive operator context or export');
   const typesOnly=spec.isTypeOnly||declaration.importClause?.isTypeOnly;
   const actual=typesOnly?syntax.get(state.data.declarationRoot+'/'+posix.basename(target).replace(/\.mjs$/u,'.d.mts')):syntax.get(target);
   const exported=actual?.statements.some(item=>item.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)&&((item.name?.text===name)||(ts.isVariableStatement(item)&&item.declarationList.declarations.some(node=>ts.isIdentifier(node.name)&&node.name.text===name))));
   if(typesOnly&&target===state.data.runtimeRoot+'/primitive-operator-runtime.mjs'&&primitiveBitwiseAlias(name)&&!ownedNativeScalarDeclaration(ts,checker,syntax,state.files,{canonicalPath:state.data.declarationRoot+'/primitive-operator-runtime.d.mts',mirrorPath:state.data.runtimeRoot+'/primitive-operator-runtime.d.mts',name,symbol}))fail('native scalar named import requires its actual current declaration symbol');
   if(!exported)fail('original runtime has no such export');return {target,name,links,local:node.text,typeOnly:!!typesOnly};
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
 if(!type)fail('written input domain required');type=ownedParenthesizedType(ts,type);
 if(type.kind===ts.SyntaxKind.StringKeyword)return 'str';
 if(type.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';
 if(type.kind===ts.SyntaxKind.VoidKeyword)return 'unit';
 if(type.kind===ts.SyntaxKind.BigIntKeyword)return 'usize';
 const collection=ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword?type.type:type;if(ts.isArrayTypeNode(collection)){const element=originalOwnedCoreType(handle,path,collection.elementType,analysis);if(element==='json-ref')return 'json-list-ref';if(element==='bool'||primitiveBitwiseType(element))return 'vec:'+element;fail('actual canonical JSON or closed primitive array element required');}
 if(ownedBase64ReadonlyOctets(ts,type))return 'bytes-ref';const base64Input=readOwnedBase64ResultImportType(ts,type,specifier=>originalImportTarget(path,specifier,analysis,state),state.data.runtimeRoot);if(base64Input)return base64Input;

 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text!=='ReturnType'){
  const binding=originalOwnedCoreImport(handle,path,type.typeName,analysis);
  if(binding.target===state.data.runtimeRoot+'/primitive-operator-runtime.mjs'&&primitiveBitwiseAlias(binding.name)&&!type.typeArguments)return primitiveBitwiseAlias(binding.name).name;
  if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&binding.name==='JsonValue'&&!type.typeArguments)return 'json-ref';
  if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&!type.typeArguments){if(binding.name==='Base64Error')return 'base64-error-ref';if(binding.name==='Base64Result')return 'base64-result';}
 }
 if(ts.isImportTypeNode(type)&&!type.isTypeOf&&ts.isLiteralTypeNode(type.argument)&&ts.isStringLiteral(type.argument.literal)&&type.qualifier&&ts.isIdentifier(type.qualifier)&&primitiveBitwiseAlias(type.qualifier.text)&&!type.typeArguments&&!type.attributes){
  requireOwnedCoreSourceCurrent(handle);const row=primitiveBitwiseAlias(type.qualifier.text),target=relative(path,type.argument.literal.text),runtime=state.data.runtimeRoot+'/primitive-operator-runtime.mjs',declaration=state.data.declarationRoot+'/primitive-operator-runtime.d.mts';if(![runtime,state.data.declarationRoot+'/primitive-operator-runtime.mjs'].includes(target))fail('unregistered native scalar type import');
  const selected=ownedNativeScalarDeclaration(ts,analysis.checker,analysis.syntax,state.files,{canonicalPath:declaration,mirrorPath:state.data.runtimeRoot+'/primitive-operator-runtime.d.mts',name:row.alias,symbol:analysis.checker.getSymbolAtLocation(type.qualifier)});if(!selected)fail('native scalar type import requires its actual current canonical or byte-equal mirrored declaration symbol');requireOwnedCoreSourceCurrent(handle);return row.name;
 }
 if(ts.isImportTypeNode(type)&&!type.isTypeOf&&ts.isLiteralTypeNode(type.argument)&&ts.isStringLiteral(type.argument.literal)&&type.qualifier?.text==='JsonValue'&&!type.typeArguments){
  if(originalImportTarget(path,type.argument.literal.text,analysis,state)!==state.data.runtimeRoot+'/json-macro-runtime.mjs')fail('unregistered type import');return 'json-ref';
 }
 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text==='ReturnType'&&type.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.typeName)?.declarations?.length)fail('shadowed ReturnType type');
  const query=type.typeArguments[0];if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis),op=ownedBase64Operation(binding.name);
   if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&op)return op.ret;
   const textScalar=ownedVectorTextScalarOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&textScalar)return textScalar.ret;
   const field=ownedVectorJsonFieldOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-fields-runtime.mjs'&&field)return field.ret;
   const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader)return reader.ret;
   const optional=ownedJsonOptionalReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-option-runtime.mjs'&&optional)return optional.ret;
   // Written output domain only; source-symbol and whole-body checks stay independent.
   if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&['json_macro_value','json_macro_null','json_macro_bool','json_macro_string','json_macro_u64','json_macro_i64','json_macro_array','json_macro_object'].includes(binding.name))return 'json-ref';
  }
 }
 // Map and byte domains must be written through the actual imported operation,
 // not a caller's similarly-shaped object/array declaration.
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&['0','1'].includes(type.indexType.literal.text)&&ts.isTypeReferenceNode(type.objectType)&&type.objectType.typeName.getText(file)==='Parameters'&&type.objectType.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.objectType.typeName)?.declarations?.length)fail('shadowed Parameters type');
  const query=type.objectType.typeArguments[0];
  if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis);
   const scalarConstructor=OPS[binding.name];if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&['json_macro_bool','json_macro_string','json_macro_u64','json_macro_i64'].includes(binding.name)&&scalarConstructor&&Number(type.indexType.literal.text)<scalarConstructor.args.length)return scalarConstructor.args[Number(type.indexType.literal.text)];
   const textScalar=ownedVectorTextScalarOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&textScalar&&Number(type.indexType.literal.text)<textScalar.args.length)return textScalar.args[Number(type.indexType.literal.text)];
   const base64=ownedBase64Operation(binding.name);if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&base64&&type.indexType.literal.text==='0')return base64.input;
   const field=ownedVectorJsonFieldOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-fields-runtime.mjs'&&field&&Number(type.indexType.literal.text)<field.args.length)return field.args[Number(type.indexType.literal.text)];
   const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader&&Number(type.indexType.literal.text)<reader.args.length)return reader.args[Number(type.indexType.literal.text)];
   const optional=ownedJsonOptionalReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-option-runtime.mjs'&&optional&&type.indexType.literal.text==='0')return optional.input;
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'&&type.indexType.literal.text==='0')return 'map-ref';
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_index_usize'&&type.indexType.literal.text==='1')return 'usize';
  }
 }
 fail('unregistered written type domain');
}

// The compiler traversal is entirely private. Only detached source/body facts
// leave this operation; every emission boundary reconstructs them afresh.
const OPS=Object.freeze({...BOUNDED_JSON_RUNTIME_OPERATIONS,
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
 const analysis=originalOwnedCoreModule(context,path),{ts,file,source}=analysis,program=[],diagnostics=[],items=[];let failed=false;
 try{
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
 }catch(error){failed=true;throw error;}finally{const frame=traversals.get(analysis);let fenceFailed=false,fenceError;try{if(failed||frame?.scalarEdges)requireOwnedCoreSourceCurrent(context);}catch(error){fenceFailed=true;fenceError=error;}finally{analysis.vectorProfiles?.clear();frame?.scalarFunctions?.clear();frame?.scalarActive?.clear();}if(!failed&&fenceFailed)throw fenceError;}
}
function checkFunction(context,path,declaration,analysis){
 const frame=traversals.get(analysis);if(!frame||frame.handle!==context||frame.paired)fail('actual same-invocation original function traversal required');frame.scalarFunctions??=new Map();frame.scalarActive??=new Set();if(frame.scalarFunctions.has(declaration))return frame.scalarFunctions.get(declaration);if(frame.scalarFunctions.size>=4096||frame.scalarActive.size>=32||frame.scalarActive.has(declaration))fail('bounded acyclic original source helper body required');frame.scalarActive.add(declaration);try{const item=checkFunctionBody(context,path,declaration,analysis);frame.scalarFunctions.set(declaration,item);return item;}finally{frame.scalarActive.delete(declaration);}
}
function checkFunctionBody(context,path,declaration,analysis){
 const {ts,file,source,checker}=analysis,nativeScalars=contexts.get(context).data.primitiveOperators===true,primitiveDefinitions=contexts.get(context).data.primitiveDefinitions===true,vectorDefinitions=contexts.get(context).data.primitiveVectorDefinitions===true;
 if(!declaration.name||!declaration.body||declaration.asteriskToken||declaration.typeParameters||declaration.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary original named function required');
 const name=rustName(declaration.name.text),params=[],sourceCalls=[],environment=new Map();let cells=0,paired=pairedFunction(context,path,declaration,analysis);
 const vectorCandidate=checkOriginalOwnedVectorFunction(path,declaration,analysis,paired,name,operand=>originalOwnedCoreImport(context,path,operand,analysis));if(vectorCandidate)return vectorCandidate;
 const vectorProfile=analysis.vectorProfiles?.get(declaration.name.text),jsonVectorProfile=['json-vector','json-value','json-scalar','primitive-scalar','primitive-expression-vector'].includes(vectorProfile?.kind)?vectorProfile:null;
 if(jsonVectorProfile?.kind==='primitive-scalar'&&nativeScalars&&jsonVectorProfile.vectorLocals!==true)fail('closed primitive source units retain their separate non-operator input profile');
 if(jsonVectorProfile&&(!paired||declaration.parameters.length!==jsonVectorProfile.parameters.length||paired.declaration.parameters.length!==declaration.parameters.length))fail('actual original Json vector parameter arity differs');
 const definitionWrittenPair=paired?.declaration.type?paired:null,writtenDefinitionResult=definitionWrittenPair?.declaration.type??ts.getJSDocReturnType(declaration),definitionReturnType=primitiveDefinitions?(writtenDefinitionResult?originalOwnedCoreType(context,definitionWrittenPair?.pair.typescript.path??path,writtenDefinitionResult,definitionWrittenPair?.analysis??analysis):vectorDefinitions&&primitiveUnitReturnSyntax(ts,declaration.body)?'unit':null):null,definitionUnit=definitionReturnType==='unit';
 const inference=vectorDefinitions||jsonVectorProfile?.kind==='primitive-expression-vector'||jsonVectorProfile?.vectorLocals===true?createPrimitiveVectorInference():null;let primitiveDefinitionLocals=0;
 const newVectorDefinition=vectorDefinitions&&primitiveVectorResultRole(definitionReturnType),expressionVector=jsonVectorProfile?.kind==='primitive-expression-vector'||jsonVectorProfile?.vectorLocals===true||vectorDefinitions,expressionVectorType=jsonVectorProfile?.type??definitionReturnType,expressionVectorElement=jsonVectorProfile?.element?.name??(newVectorDefinition?definitionReturnType.slice(4):null),moves=type=>ownedBase64Result(type)||type==='json-list-owned'||expressionVector&&(primitiveVectorResultRole(type)||inference?.pending(type));
 const primitiveLiteralBinding=entry=>entry&&Object.hasOwn(entry,'inferredPrimitiveLiteral')?entry.inferredPrimitiveLiteral:null;
 const writtenCompatible=(actual,written)=>inference?.pending(actual)?inference.compatible(actual,written):expressionVector&&written==='vec:usize'&&typeof actual==='string'&&actual.startsWith('vec:')&&primitiveBitwiseType(actual.slice(4))?true:jsonVectorProfile&&written==='json-list-ref'?actual==='json-list-owned':['json-scalar','primitive-scalar'].includes(jsonVectorProfile?.kind)&&!nativeScalars&&primitiveBitwiseType(actual)&&written==='usize'||ownedBase64Compatible(actual,written);
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
  if(type==='base64-result')base64Source(traversals.get(analysis).state.files);
  if(ownedJsonOptionalPayload(type))fail('optional public parameters require an independently checked carrier boundary');
  if(type==='text-owned')type='str';
  if(jsonVectorProfile){const native=jsonVectorProfile.parameters[index].name;if(type!==(native==='json'?'json-ref':native)&&!(!nativeScalars&&primitiveBitwiseType(native)&&type==='usize'))fail('actual original native Json input domain differs');type=native;}
  const identifier=param.name;
  const sourceName=bind(identifier,{type,root:jsonVectorProfile&&type==='json'||['json-ref','map-ref','str','bytes-ref','base64-error-ref'].includes(type)||ownedJsonBorrowed(type)||type==='json-option-input'?identifier.text:null,input:true},environment);
  params.push({name:sourceName,rust:rustName(sourceName),type});
 }
 // The complete available pair was selected before parameter domains.
 let boundedJsonBoundary=false,vectorFieldBoundary=false;const nativeOperatorHistory=createOwnedNativeBitwiseHistory(),sourceNativeOperators=nativeOperatorHistory.rows,hostCalls=[],byteInputs=new Set();
 const branchScope=scope=>new Map([...scope].map(([key,value])=>[key,moves(value.type)?{...value}:value]));
 const mergeMoves=(scope,yes,no)=>{for(const [key,value]of scope)if(moves(value.type))value.moved=!!yes.get(key)?.moved||!!no.get(key)?.moved;};
 const refine=(scope,condition,truth)=>{
  if(condition.kind==='not')return refine(scope,condition.value,!truth);
  if(condition.kind!=='option-test')return scope;
  const entry=scope.get(condition.value.name);if(entry)scope.set(condition.value.name,{...entry,some:truth===condition.some});return scope;
 };
 const resultOption=()=>{
  const written=declaration.type??ts.getJSDocReturnType(declaration);
  const type=written?originalOwnedCoreType(context,path,written,analysis):paired?.declaration.type?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis):null;
  if(!ownedJsonOptionalPayload(type))fail('optional constructor requires actual written operation return domain');return type;
 };
 function optionTest(node,scope,depth){
  const op=node.operatorToken.kind,left=node.left,right=node.right;
  if(![ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)||!ts.isPropertyAccessExpression(left)||left.questionDotToken||left.name.text!=='$'||!ts.isIdentifier(left.expression)||!ts.isStringLiteral(right)||!['Some','None'].includes(right.text))return null;
  const entry=scope.get(left.expression.text);if(!entry||checker.getSymbolAtLocation(left.expression)!==entry.symbol||!ownedJsonOptionalPayload(entry.type))fail('optional tag requires original typed binding');
  const value=expression(left.expression,scope,depth+1);return {kind:'option-test',value,some:(right.text==='Some')===(op===ts.SyntaxKind.EqualsEqualsEqualsToken),type:'bool',root:null};
 }

  // Fresh analyzed expressions only. Null is not a static-loan proof: only
  // an actual literal (or both independently checked literal alternatives) is.
  function stringLoan(value){
   if(value.type!=='str')return undefined;
   if(value.root!==null)return params.some(param=>param.name===value.root&&(['json-ref','map-ref','str','json-option-input'].includes(param.type)||jsonVectorProfile&&param.type==='json'||ownedJsonBorrowed(param.type)))?{root:value.root}:undefined;
   if(value.kind==='string')return {root:null};
   if(value.kind==='choose')return meetStringLoans(stringLoan(value.then),stringLoan(value.else));
   return undefined;
  }
  function meetStringLoans(left,right){
   if(!left||!right)return undefined;
   if(left.root===null)return right;
   if(right.root===null||left.root===right.root)return left;
   return undefined;
  }

 function expression(node,scope,depth,opaqueOperand=false,numericDomain=null){
  tick(depth);if(ts.isParenthesizedExpression(node))return expression(node.expression,scope,depth+1,opaqueOperand,numericDomain);
  if(expressionVector&&ts.isArrayLiteralExpression(node)){
   if(node.elements.length>4096||node.elements.some(item=>ts.isOmittedExpression(item)||ts.isSpreadElement(item)))fail('bounded dense primitive Vec elements required');
   if(inference){const hint=primitiveVectorResultRole(numericDomain)?numericDomain:null,element=hint?.slice(4)??null,items=node.elements.map(item=>inference.literal(ts,item)??expression(item,scope,depth+1,false,element));return inference.array(items,hint);}
   const element=expressionVectorElement,items=node.elements.map(item=>expression(item,scope,depth+1,false,element));
   if(items.some(item=>item.type!==element))fail('every actual vector item must retain the exact primitive domain');
   return {kind:'primitive-vector-literal',items,type:expressionVectorType,root:null};
  }
  if(jsonVectorProfile&&ts.isArrayLiteralExpression(node)){if(node.elements.length>4096||node.elements.some(item=>ts.isOmittedExpression(item)||ts.isSpreadElement(item)))fail('bounded dense canonical Json vector required');const items=node.elements.map(item=>expression(item,scope,depth+1));if(items.some(item=>!json(item.type)))fail('actual canonical Json vector elements required');return {kind:'json-vector-literal',items,type:'json-list-owned',root:null};}
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
   if(/\p{Surrogate}/u.test(node.text))fail('unpaired UTF16 string');return {kind:'string',value:node.text,type:'str',root:null};
  }
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool',root:null};
  if(primitiveBitwiseType(numericDomain)&&(ts.isBigIntLiteral(node)||ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand))){const negative=ts.isPrefixUnaryExpression(node);return ownedIntegerLiteral((negative?node.operand:node).text,{negative,domain:numericDomain});}
  if((jsonVectorProfile||vectorDefinitions)&&ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand)){const value=ownedIntegerLiteral(node.operand.text,{negative:true});if(vectorDefinitions&&value.value==='0')value.type='usize';return value;}
  if(ts.isBigIntLiteral(node)){
   const text=node.text.replace(/n$/u,'').replaceAll('_','');let value;try{value=BigInt(text);}catch{fail('invalid integer');}
   if(value<0n||value>18446744073709551615n)fail('u64 literal bound');return {kind:'integer',value:value.toString(),type:'usize',root:null};
  }
  if(ts.isObjectLiteralExpression(node)){
   const fields=node.properties,type=resultOption(),payload=ownedJsonOptionalPayload(type);
   if(fields.length<1||fields.length>2||fields.some(field=>!ts.isPropertyAssignment(field)||!ts.isIdentifier(field.name)&&!ts.isStringLiteral(field.name))||fields[0].name.text!=='$'||!ts.isStringLiteral(fields[0].initializer))fail('closed optional constructor required');
   const tag=fields[0].initializer.text;
   if(tag==='None'&&fields.length===1)return {kind:'option-none',type,root:null};
   if(tag!=='Some'||fields.length!==2||fields[1].name.text!=='field0')fail('closed optional constructor fields');
   const value=expression(fields[1].initializer,scope,depth+1);if(value.type!==payload||ownedJsonBorrowed(type)&&!value.root&&value.kind!=='string')fail('optional payload or live root differs');
   return {kind:'option-some',value,type,root:ownedJsonBorrowed(type)?value.root:null};
  }
  if(ts.isPropertyAccessExpression(node)&&!node.questionDotToken&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){
   const entry=scope.get(node.expression.text),payload=entry&&ownedJsonOptionalPayload(entry.type);
   if(!payload||entry.some!==true||checker.getSymbolAtLocation(node.expression)!==entry.symbol)fail('optional payload needs a dominating actual Some tag');
   const value=expression(node.expression,scope,depth+1);return {kind:'option-field',value,type:payload,root:ownedJsonBorrowed(entry.type)?entry.root:null};
  }
  if(ts.isIdentifier(node)){
   const value=scope.get(node.text);if(!value||checker.getSymbolAtLocation(node)!==value.symbol)fail('unknown, shadowed or moved binding');
   if(value.type==='json-option-input'&&!opaqueOperand)fail('opaque optional Json input requires its actual checked operation');
   if(inference&&primitiveLiteralBinding(value)){const literal=primitiveLiteralBinding(value);if(primitiveBitwiseType(numericDomain)){const negative=literal.value.startsWith('-');return ownedIntegerLiteral((negative?literal.value.slice(1):literal.value)+'n',{negative,domain:numericDomain});}return {kind:'integer',value:literal.value,type:literal.type,root:null};}
   if(moves(value.type)){if(value.moved)fail('native base64 result used after move');value.moved=true;}
   return {kind:'variable',name:node.text,type:value.type,root:value.root};
  }
  if(ts.isCallExpression(node)){
   if(node.questionDotToken||node.typeArguments?.length||node.arguments.some(ts.isSpreadElement))fail('optional/generic/spread call');
   if(ts.isIdentifier(node.expression)){const symbol=checker.getSymbolAtLocation(node.expression),declarations=symbol?.declarations,target=declarations?.length===1?declarations[0]:null;if(target&&ts.isFunctionDeclaration(target)&&target.getSourceFile()===file&&file.statements.includes(target)){
    if(!target.name||!primitiveDefinitions&&(!jsonVectorProfile||!['primitive-scalar',...(expressionVector?['primitive-expression-vector']:[])].includes(analysis.vectorProfiles?.get(target.name.text)?.kind)))fail('source calls require a complete actual closed primitive callee');const callee=checkFunction(context,path,target,analysis),origin=callee.vectorOrigin?.original,definitionRole=type=>type==='bool'||!!primitiveBitwiseType(type);if(primitiveDefinitions?(!!origin||!definitionRole(callee.returns)&&!(vectorDefinitions&&(callee.returns==='unit'||primitiveVectorResultRole(callee.returns)))||callee.params.some(param=>!definitionRole(param.type)&&!(vectorDefinitions&&param.type==='str'))||node.arguments.length!==callee.params.length):(!['primitive-scalar',...(expressionVector?['primitive-expression-vector']:[])].includes(callee.vectorOrigin?.kind)||!origin||origin.qualifiedName.split('.').slice(0,-1).join('.')!==jsonVectorProfile.original.qualifiedName.split('.').slice(0,-1).join('.')||origin.qualifiedName.split('.').some(part=>! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(part)||KEYS.has(part))||node.arguments.length!==callee.params.length))fail('actual ordinary primitive source callee/arity differs');const args=node.arguments.map((argument,index)=>{const role=callee.params[index].type;let value=expression(argument,scope,depth+1,false,role);if(primitiveBitwiseType(role)){value=scalarReturnLiteral(value,scope,depth+1);narrowOwnedNumericLiteral(value,role);}if(value.type!==role&&!(role==='u64'&&value.type==='usize'))fail('source callee argument differs from its actual native ABI');if(role==='str'&&!asciiStringLoan(value,scope))fail('source helper text requires an actual live borrowed/static loan');return value;});const frame=traversals.get(analysis);frame.scalarEdges=(frame.scalarEdges??0)+1;if(frame.scalarEdges>16384)fail('bounded original source-call edges required');const selected={path,javascript:callee.javascript,rust:origin?.qualifiedName??callee.name,localRust:callee.name,parameters:callee.params.map(param=>param.type),returns:callee.returns,span:[...callee.source.span]};sourceCalls.push(selected);return {kind:'source-scalar-call',callee:selected,args,type:callee.returns,root:null};
   }}
   const binding=originalOwnedCoreImport(context,path,node.expression,analysis),op=OPS[binding.name];
   const textScalar=ownedVectorTextScalarOperation(binding.name);if(textScalar&&binding.target===analysis.runtimeRoot+'/string-iterator-runtime.mjs'){if(!jsonVectorProfile&&!vectorDefinitions||binding.typeOnly||node.arguments.length!==textScalar.args.length)fail('fixed source-bound text scalar operation/arity required');requireOwnedCoreSourceCurrent(context);const args=node.arguments.map(argument=>expression(argument,scope,depth+1));if(args.some(value=>value.type!=='str'||!asciiStringLoan(value,scope)))fail('text scalar arguments need actual live borrowed/static text');hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);return {kind:'text-scalar-call',name:binding.name,args,type:textScalar.ret,root:null};}
   if(ownedPrimitiveOperatorOperation(binding.name)&&binding.target===analysis.runtimeRoot+'/primitive-operator-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);if(!nativeScalars&&(!jsonVectorProfile||!ownedNativeClosedOperator(binding.name)))fail('non-operator source units require a qualified total operation');if(binding.typeOnly)fail('primitive runtime call cannot use a type-only import');const value=readOwnedPrimitiveOperatorCall(ts,node,binding.name,(argument,domain)=>expression(argument,scope,depth+1,false,domain));if(!nativeScalars)requireOwnedNativeClosedCall(value);hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);return value;
   }
   const optional=ownedJsonOptionalReaderOperation(binding.name);
   if(optional&&binding.target===analysis.runtimeRoot+'/json-option-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);
    if(node.arguments.length!==1||!ts.isIdentifier(node.arguments[0]))fail('opaque optional Json operation requires one actual input binding');
    const argument=expression(node.arguments[0],scope,depth+1,true);
    if(argument.type!==optional.input||!params.some(param=>param.type===optional.input&&param.name===argument.root))fail('opaque optional Json root differs');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end],inputRoot:argument.root});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-option-call',name:binding.name,args:[argument],type:optional.ret,root:optional.root===null?null:argument.root};
   }
   const fieldOperation=ownedVectorJsonFieldOperation(binding.name);
   if(fieldOperation&&binding.target===analysis.runtimeRoot+'/json-fields-runtime.mjs'){
    if(!jsonVectorProfile||binding.typeOnly)fail('field/default operations require their actual owned JSON vector source profile');vectorFieldBoundary=true;requireOwnedCoreSourceCurrent(context);const args=node.arguments.map((argument,index)=>expression(argument,scope,depth+1,false,fieldOperation.args[index]));
    if(args.length!==fieldOperation.args.length||!json(args[0].type)||(fieldOperation.args[1]==='str'?args[1].type!=='str':!['u64','usize'].includes(args[1].type))||fieldOperation.args.slice(2).some((role,index)=>role==='str'?args[index+2].type!=='str':args[index+2].type!==role))fail('actual JSON field operand domains differ');
    const root=fieldOperation.root===null?null:args[0].root;if(fieldOperation.root!==null&&!root)fail('borrowed JSON field requires a live actual input root');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-field-call',name:binding.name,args,type:fieldOperation.ret,root};
   }
   const reader=ownedJsonReaderOperation(binding.name);
   if(reader&&binding.target===analysis.runtimeRoot+'/json-runtime.mjs'){
    // The fixed current JS/declaration closure and original Rust/Cargo JSON
    // profile were freshly joined by the genuine context. Rows are only DATA.
    requireOwnedCoreSourceCurrent(context);
    const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
    if(args.length!==reader.args.length||args.some((value,at)=>reader.args[at]==='json-ref'?!json(value.type):value.type!==reader.args[at]&&!(jsonVectorProfile&&!nativeScalars&&reader.args[at]==='usize'&&value.type==='u64')))fail('actual JSON reader operand domain differs');
    const root=reader.root===null?null:args[reader.root].root;if(reader.root!==null&&!root)fail('JSON reader loan requires a live original input');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-reader-call',name:binding.name,args,type:reader.ret,root};
   }
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
   if(op.boundedJson){if(!jsonVectorProfile||binding.typeOnly)fail('bounded JSON runtime aliases require their actual canonical native vector source');requireOwnedCoreSourceCurrent(context);if(!boundedJsonBoundary){boundedJsonRuntimeRustEdge(traversals.get(analysis).state.files);boundedJsonBoundary=true;}}
   const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
   if(args.length!==op.args.length||args.some((argument,index)=>!compatible(argument.type,op.args[index])&&!(jsonVectorProfile&&op.args[index]==='u64'&&argument.type==='u64')&&!(jsonVectorProfile&&!nativeScalars&&op.args[index]==='usize'&&argument.type==='u64')))fail('owned argument type differs');
   // Shared index loans from temporaries cannot outlive their owner. No alias
   // or public source flag changes the actual root identity.
   const root=op.root===undefined?null:args[op.root].root;
   if(op.root!==undefined&&!root)fail('index requires a live input root');
   hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
   return {kind:'owned-call',name:binding.name,args,type:op.ret,root};
  }
  const nativeBitwise=readOwnedNativeBitwiseExpression(ts,node,argument=>expression(argument,scope,depth+1),{enabled:nativeScalars});if(nativeBitwise){nativeOperatorHistory.retain(node,file,nativeBitwise);return nativeBitwise;}
  if(ts.isConditionalExpression(node)){
   const cond=expression(node.condition,scope,depth+1),a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false);let yes=expression(node.whenTrue,a,depth+1,false,numericDomain),no=expression(node.whenFalse,b,depth+1,false,numericDomain);
   if(jsonVectorProfile&&!nativeScalars){if(primitiveBitwiseType(yes.type)&&no.type==='usize'){no=scalarReturnLiteral(no,b,depth+1);narrowOwnedNumericLiteral(no,yes.type);}else if(primitiveBitwiseType(no.type)&&yes.type==='usize'){yes=scalarReturnLiteral(yes,a,depth+1);narrowOwnedNumericLiteral(yes,no.type);}}
   if(inference&&(inference.vector(yes.type)||inference.vector(no.type))){const joined=inference.join(yes.type,no.type);yes.type=joined;no.type=joined;}
   if(nativeScalars){cells+=joinOwnedNativeScalarChoiceOperands(yes,no,true);tick(depth);}const loan=yes.type==='str'&&no.type==='str'?meetStringLoans(jsonVectorProfile?asciiStringLoan(yes,a):stringLoan(yes),jsonVectorProfile?asciiStringLoan(no,b):stringLoan(no)):undefined;
   if(cond.type!=='bool'||yes.type!==no.type||yes.type==='str'&&!loan||yes.root!==no.root&&!loan&&yes.kind!=='option-none'&&no.kind!=='option-none')fail('conditional result or loan differs');mergeMoves(scope,a,b);return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:loan?loan.root:yes.kind==='option-none'?no.root:yes.root};
  }
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken){const value=expression(node.operand,scope,depth+1);if(value.type!=='bool')fail('boolean negation only');return {kind:'not',value,type:'bool',root:null};}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.GreaterThanEqualsToken].includes(node.operatorToken.kind)){
   const optional=optionTest(node,scope,depth);if(optional)return optional;
   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);joinOwnedNativeScalarOperands(left,right,nativeScalars);if(jsonVectorProfile&&!nativeScalars){for(const [literal,other]of [[left,right],[right,left]])if(literal.kind==='integer'&&literal.type==='usize'&&primitiveBitwiseType(other.type))narrowOwnedNumericLiteral(literal,other.type);}
   if(['<','<=','>','>='].includes(op)){if(!(ownedNativeIntegerDomain(left.type,nativeScalars)||jsonVectorProfile&&primitiveBitwiseType(left.type))||left.type!==right.type)fail('ordered comparison requires identical checked integer domains');}
   else if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':(!['bool','str','usize'].includes(left.type)&&!ownedNativeIntegerDomain(left.type,nativeScalars)&&!(jsonVectorProfile&&primitiveBitwiseType(left.type)))||left.type!==right.type)fail('identity/coercion comparison outside owned profile');
   const checked={kind:'binary',op,left,right,type:'bool',root:null};if(nativeScalars&&primitiveBitwiseType(left.type))nativeOperatorHistory.retain(node,file,checked);return checked;
  }
  fail('unimplemented expression '+ts.SyntaxKind[node.kind]);
 }
 let resultType=null,resultRoot=null,resultOnlyAbsent=true,stringResultLoan=null;
 // A literal supplies a value, never a signed-domain permit. Only a genuine
 // Some payload from the existing i64 reader can establish this local join.
 const scalarReturnValues=[];
 const i64Payload=value=>value.kind==='option-field'&&value.type==='i64'&&value.value.type==='i64-option';
 const fittingLiteral=value=>{
  if(value.kind!=='integer'||value.type!=='usize'||typeof value.value!=='string')return false;
  const text=value.value;if(!text.length||text.length>19||text.length>1&&text[0]==='0')return false;
  for(let at=0;at<text.length;at++)if(text[at]<'0'||text[at]>'9')return false;
  return text.length<19||text<='9223372036854775807';
 };
 function joinI64LiteralReturn(value){
  if(resultRoot!==null||value.root!==null)return;
  if(resultType==='i64'&&fittingLiteral(value)&&scalarReturnValues.some(i64Payload)){value.type='i64';return;}
  if(resultType==='usize'&&i64Payload(value)&&scalarReturnValues.length&&scalarReturnValues.every(fittingLiteral)){
   for(const literal of scalarReturnValues)literal.type='i64';resultType='i64';
  }
 }

 function joinPrimitiveDefinitionLiteralReturns(value){if(!primitiveDefinitions||!nativeScalars||value.root!==null||!scalarReturnValues.length)return;for(const previous of scalarReturnValues){cells+=joinOwnedNativeScalarChoiceOperands(previous,value,true);tick(0);}if(scalarReturnValues.every(previous=>previous.type===value.type))resultType=value.type;}
 function asciiStringLoan(value,scope){const loan=stringLoan(value);if(loan)return loan;if(value.type==='str'&&value.kind==='choose')return meetStringLoans(asciiStringLoan(value.then,scope),asciiStringLoan(value.else,scope));return value.type==='str'&&value.kind==='variable'&&value.root===null&&scope.get(value.name)?.asciiStaticLoan===true?{root:null}:undefined;}
 function scalarReturnLiteral(value,scope,depth){tick(depth);if(value.kind==='variable'){const constant=inference?primitiveLiteralBinding(scope.get(value.name))?.value:scope.get(value.name)?.constantInteger;if(typeof constant==='string')return {kind:'integer',value:constant,type:value.type,root:null};}if(value.kind==='choose')return {...value,then:scalarReturnLiteral(value.then,scope,depth+1),else:scalarReturnLiteral(value.else,scope,depth+1)};return value;}
 function finishNativeUnitReturn(checked){if(!checked.terminated&&(['json-scalar','primitive-scalar'].includes(jsonVectorProfile?.kind)&&jsonVectorProfile.type==='unit'||definitionUnit)){const value={kind:'unit',type:'unit',root:null};if(resultType!==null&&resultType!=='unit')fail('return domains differ');resultType='unit';resultRoot=null;scalarReturnValues.push(value);checked.body.push({kind:'return',value});checked.terminated=true;}return checked;}
 function block(statements,scope,depth){
  const body=[];let terminated=false;
  for(let statementIndex=0;statementIndex<statements.length;statementIndex++){const statement=statements[statementIndex];
   tick(depth);if(terminated)fail('statement after terminating return');
   if(ts.isVariableStatement(statement)){
    if(statement.modifiers?.length||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const)fail('only fresh immutable local declarations');
    for(const declaration of statement.declarationList.declarations){
     if(inference&&++primitiveDefinitionLocals>64)fail('bounded complete primitive local census required');
     if(!declaration.initializer||declaration.exclamationToken||declaration.type)fail('unsupported local declaration');let written=null;
     if(paired){
      const evidence=paired.evidence.locals.filter(item=>item.javascriptSpan[0]===declaration.getStart(file)&&item.javascriptSpan[1]===declaration.end);if(evidence.length!==1)fail('actual paired local span differs');
      const span=evidence[0].typeSpan;
      if(span){
       let actual;const find=node=>{if(ts.isVariableDeclaration(node)&&node.getStart(paired.analysis.file)===evidence[0].typescriptSpan[0]&&node.end===evidence[0].typescriptSpan[1])actual=node;ts.forEachChild(node,find);};find(paired.declaration.body);
       if(!actual?.type||actual.type.getStart(paired.analysis.file)!==span[0]||actual.type.end!==span[1])fail('actual paired local type differs');
       written=originalOwnedCoreType(context,paired.pair.typescript.path,actual.type,paired.analysis);

      }
     }
     let value=expression(declaration.initializer,scope,depth+1,false,primitiveBitwiseType(written)||inference&&primitiveVectorResultRole(written)?written:null);if(written!==null){if(jsonVectorProfile&&!nativeScalars&&primitiveBitwiseType(written)){value=scalarReturnLiteral(value,scope,depth+1);narrowOwnedNumericLiteral(value,written);}if(written==='json-ref'?!json(value.type):!writtenCompatible(value.type,written))fail('paired written local ABI differs');}
     const inferredPrimitiveLiteral=inference&&written===null&&!ts.getJSDocType(declaration)?value.kind==='integer'&&value.root===null&&(value.type==='usize'||value.type==='i64')?{type:value.type,value:value.value}:value.kind==='variable'?primitiveLiteralBinding(scope.get(value.name)):undefined:undefined;
     const constantInteger=jsonVectorProfile&&!nativeScalars?(value.kind==='integer'?value.value:value.kind==='variable'?scope.get(value.name)?.constantInteger:undefined):undefined;const staticTextLoan=jsonVectorProfile&&value.type==='str'?asciiStringLoan(value,scope):undefined;const name=bind(declaration.name,{type:value.type,root:value.root,...(inferredPrimitiveLiteral?{inferredPrimitiveLiteral}:{}),...(typeof constantInteger==='string'?{constantInteger}:{}),...(staticTextLoan?.root===null?{asciiStaticLoan:true}:{})},scope);if(!inferredPrimitiveLiteral)body.push({kind:'let',name,value});
    }
   }else if(ts.isExpressionStatement(statement)){const value=expression(statement.expression,scope,depth+1);if(value.type!=='unit'||!(value.kind==='owned-call'&&value.name==='router_vector_json_validate'&&boundedJsonBoundary||value.kind==='source-scalar-call'&&(vectorDefinitions||jsonVectorProfile?.kind==='primitive-scalar'||jsonVectorProfile?.kind==='primitive-expression-vector')))fail('only complete primitive source-unit calls or actual bounded JSON validation may be discarded');body.push({kind:'effect',value});
   }else if(ts.isReturnStatement(statement)&&!statement.expression&&(['json-scalar','primitive-scalar'].includes(jsonVectorProfile?.kind)&&jsonVectorProfile.type==='unit'||definitionUnit)){
    const value={kind:'unit',type:'unit',root:null};if(resultType!==null&&resultType!=='unit')fail('return domains differ');resultType='unit';resultRoot=null;scalarReturnValues.push(value);body.push({kind:'return',value});terminated=true;
   }else if(ts.isReturnStatement(statement)&&statement.expression){
    let value=expression(statement.expression,scope,depth+1,false,['json-scalar','primitive-scalar'].includes(jsonVectorProfile?.kind)&&!nativeScalars&&primitiveBitwiseType(jsonVectorProfile.type)?jsonVectorProfile.type:inference&&jsonVectorProfile?.kind==='primitive-expression-vector'?jsonVectorProfile.type:primitiveDefinitions&&(primitiveBitwiseType(definitionReturnType)||inference&&primitiveVectorResultRole(definitionReturnType))?definitionReturnType:null);if(['json-scalar','primitive-scalar'].includes(jsonVectorProfile?.kind)&&!nativeScalars&&primitiveBitwiseType(jsonVectorProfile.type)){value=scalarReturnLiteral(value,scope,depth+1);narrowOwnedNumericLiteral(value,jsonVectorProfile.type);}if(nativeScalars)nativeOperatorHistory.retainCopy(statement.expression,file,value);
    if(!(inference&&inference.vector(value.type))&&!(expressionVector&&value.type===expressionVectorType)&&!(jsonVectorProfile&&value.type==='json-list-owned')&&!(value.type==='unit'&&(definitionUnit||jsonVectorProfile?.kind==='primitive-scalar'&&jsonVectorProfile.type==='unit'))&&!['json','json-ref','bool','str','usize','text-owned','base64-result','u64','i64'].includes(value.type)&&!ownedJsonOptionalPayload(value.type)&&!primitiveBitwiseType(value.type))fail('unsupported owned result');
    if(value.type==='json-ref'&&!params.some(param=>param.name===value.root&&['json-ref','map-ref','json-option-ref'].includes(param.type)))fail('returned local loan');
    if(ownedJsonBorrowed(value.type)&&value.root&&!params.some(param=>param.name===value.root&&(['json-ref','map-ref','str','json-option-input'].includes(param.type)||ownedJsonBorrowed(param.type))))fail('returned local optional loan');
    if(inference&&resultType!==null&&(inference.vector(resultType)||inference.vector(value.type))){resultType=inference.join(resultType,value.type);value.type=resultType;}
    joinI64LiteralReturn(value);joinPrimitiveDefinitionLiteralReturns(value);
    const loan=value.type==='str'?(stringResultLoan===null?stringLoan(value):meetStringLoans(stringResultLoan,stringLoan(value))):undefined,effectiveRoot=loan?loan.root:value.root;
    if(value.type==='str'&&!loan)fail('returned str requires an actual literal or live input origin');
    if(resultType!==null&&(resultType!==value.type||resultRoot!==effectiveRoot&&!(value.type==='str'&&loan)&&!(ownedJsonOptionalPayload(value.type)&&(value.kind==='option-none'||resultOnlyAbsent))))fail('return domains differ');resultType=value.type;if(value.kind!=='option-none'){resultRoot=effectiveRoot;resultOnlyAbsent=false;}if(value.type==='str')stringResultLoan=loan;scalarReturnValues.push(value);body.push({kind:'return',value});terminated=true;
   }else if(ts.isIfStatement(statement)&&ts.isBlock(statement.thenStatement)&&!statement.elseStatement&&(jsonVectorProfile||primitiveDefinitions)){
    const cond=expression(statement.expression,scope,depth+1);if(cond.type!=='bool')fail('nonboolean guard condition');const a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=block(statement.thenStatement.statements,a,depth+1);if(!yes.terminated)fail('guard then branch must actually terminate');const no=finishNativeUnitReturn(block(statements.slice(statementIndex+1),b,depth+1));if(!no.terminated)fail('complete source guard continuation required');mergeMoves(scope,a,b);body.push({kind:'if',cond,then:yes.body,else:no.body});terminated=true;break;
   }else if(ts.isIfStatement(statement)&&ts.isBlock(statement.thenStatement)&&statement.elseStatement&&ts.isBlock(statement.elseStatement)){
    const cond=expression(statement.expression,scope,depth+1);if(cond.type!=='bool')fail('nonboolean condition');
    const a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=block(statement.thenStatement.statements,a,depth+1),no=block(statement.elseStatement.statements,b,depth+1);
    if(!yes.terminated||!no.terminated)fail('partial branch flow');mergeMoves(scope,a,b);body.push({kind:'if',cond,then:yes.body,else:no.body});terminated=true;
   }else fail('statement/effects outside owned profile');
  }
  return {body,terminated};
 }
 const statements=jsonVectorProfile?consumeJsonVectorInputPrelude(analysis,declaration,params,operand=>originalOwnedCoreImport(context,path,operand,analysis),jsonVectorProfile):consumeOwnedBase64InputPrelude(analysis,declaration,params,operand=>originalOwnedCoreImport(context,path,operand,analysis));const checked=finishNativeUnitReturn(block(statements,environment,0));if(!checked.terminated)fail('missing return');
 if(inference){const expected=jsonVectorProfile?.kind==='primitive-expression-vector'?jsonVectorProfile.type:definitionReturnType;if(inference.pending(resultType)&&primitiveVectorResultRole(expected))inference.compatible(resultType,expected);resultType=inference.finish(checked.body,resultType);}
 if(paired)for(let index=0;index<params.length;index++){
  const actual=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.parameters[index].type,paired.analysis);
  if((actual==='text-owned'?'str':actual)!==(jsonVectorProfile&&params[index].type==='json'?'json-ref':params[index].type)&&!(jsonVectorProfile&&!nativeScalars&&primitiveBitwiseType(params[index].type)&&actual==='usize'))fail('paired written parameter ABI differs');
 }
 const writtenReturn=declaration.type??ts.getJSDocReturnType(declaration);
 if(writtenReturn){
  const written=originalOwnedCoreType(context,path,writtenReturn,analysis);
  if(written==='json-ref'?!json(resultType):!writtenCompatible(resultType,written))fail('written return ABI differs from original checked body');
  // A written Value domain accepts owned or borrowed results; it never
  // supplies or changes the independently checked loan/root identity.
 }
 if(paired?.declaration.type){
  const written=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis);
  if(written==='json-ref'?!json(resultType):!writtenCompatible(resultType,written))fail('paired written return ABI differs');
 }
 if(params.some(param=>param.type==='bytes-ref'&&!byteInputs.has(param.name)))fail('octet input requires an actual fixed base64 operand');
 if(params.some(param=>param.type==='json-option-input'&&!hostCalls.some(call=>ownedJsonOptionalReaderOperation(call.name)&&call.inputRoot===param.name)))fail('opaque optional Json input requires validation');
 if(jsonVectorProfile?.kind==='primitive-scalar'&&(hostCalls.some(call=>!ownedVectorTextScalarOperation(call.name)&&!ownedNativeClosedOperator(call.name))||sourceNativeOperators.length))fail('closed primitive source unit requires separately qualified call/effect rules');
 if(primitiveDefinitions)(vectorDefinitions?assertOwnedPrimitiveVectorDefinition:assertOwnedPrimitiveDefinition)({params,returns:resultType,resultRoot,body:checked.body,hostCalls,sourceCalls});
 if(newVectorDefinition&&resultType!==definitionReturnType)fail('actual written primitive vector definition return differs');
 if(!hostCalls.length&&!sourceNativeOperators.length)nativeOperatorHistory.adoptCopies();
 if(jsonVectorProfile&&resultType!==jsonVectorProfile.type)fail('actual original native owned JSON return shape required');
 if(!hostCalls.length&&!sourceNativeOperators.length&&!params.some(param=>param.type==='base64-result')&&!jsonVectorProfile&&!primitiveDefinitions)fail('no actual owned-core call');
 const item={kind:'owned-function',name,...(sourceCalls.length?{sourceCalls}:{}),javascript:declaration.name.text,exported:!!declaration.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword),params,returns:resultType,resultRoot,body:checked.body,source:{path,source,span:[declaration.getStart(file),declaration.end]},...(jsonVectorProfile?{vectorOrigin:jsonVectorProfile}:{}),...(sourceNativeOperators.length?{sourceNativeOperators}:{}),hostCalls};
 if(paired)item.pairedSource={path:paired.pair.typescript.path,source:paired.pair.typescript.source,span:paired.evidence.typescriptSpan,parameters:paired.evidence.parameters,locals:paired.evidence.locals,returnSpan:paired.evidence.returnSpan,erasure:paired.pair.erasure.edits};
 if(vectorFieldBoundary)requireOwnedVectorJsonFieldSources(traversals.get(analysis).state.files,contexts.get(context).data);if(boundedJsonBoundary)boundedJsonRuntimeRustEdge(traversals.get(analysis).state.files);requireOwnedCoreSourceCurrent(context);return item;
}

export function ownedPrimitiveOperatorRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=primitiveOperatorRuntimeAssetPair(),rows=[],seen=new Set();
 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('runtime closure bounds');seen.add(name);
  const source=assets.get(name);if(typeof source!=='string')fail('unregistered materialized asset: '+name);const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name,file=parsed(ts,path,source);rows.push({path,source});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;
   const target=relative(path,specifier);if(posix.dirname(target)!==base)fail('runtime closure escape');visit(posix.basename(target));
  }
 }
 for(const name of ['primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])visit(name);
 for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
import {primitiveOperatorRuntimeAssetPair} from '../primitive-operator-runtime-sources.mjs';
import {ownedPrimitiveOperatorOperation,readOwnedPrimitiveOperatorCallWithDomains as readOwnedPrimitiveOperatorCall} from './owned-primitive-operator-source.mjs';

import {primitiveBitwiseType,primitiveBitwiseAlias} from '../primitive-bitwise-types.mjs';

import {ownedParenthesizedType} from './owned-type-parentheses.mjs';

import {ownedNativeScalarDeclaration} from './owned-native-scalar-declaration.mjs';

import {ownedNativeIntegerDomain,joinOwnedNativeScalarOperands,joinOwnedNativeScalarChoiceOperands} from './owned-native-scalar-flow.mjs';

import {readOwnedNativeBitwiseExpression,createOwnedNativeBitwiseHistory} from './owned-native-bitwise-source.mjs';

import {consumeJsonVectorInputPrelude} from './owned-vector-json-boundary.mjs';

function boundedJsonRuntimeRustEdge(files){
 const source=files.get('src/lib.rs');if(typeof source!=='string')fail('complete actual Rust root required');
 const views=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),items=originalModuleViewItems(views.views[0],source);
 const declarations=items.filter(item=>item.term==='mod'&&item.name==='translation_json_core');
 if(declarations.length!==1||source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_json_core;')fail('actual public Rust facade edge required');
 if(items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_json_core')))fail('competing Rust facade import');
 if(files.get('src/translation_json_core.rs')!==BOUNDED_JSON_CORE_SOURCE)fail('complete bounded native JSON library differs');const concrete=transportConcreteSyntaxSource(BOUNDED_JSON_CORE_SOURCE,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==BOUNDED_JSON_CORE_SOURCE)fail('complete bounded native JSON library CST inverse differs');
 if(typeof files.get('Cargo.toml')!=='string'||typeof files.get('Cargo.lock')!=='string')fail('complete receiving Cargo sources required');
 const dependencies=jsonMacroDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof;
 if(!dependencies)fail('actual locked JSON source profile required');const features=proveJsonMacroFeatures(dependencies);
 const modules=[{file:'src/lib.rs',path:[],source,sourceView:views.views[0],configurationCondition:views.views[0].configurationCondition}];
 for(const [path,name]of [['src/translation_json_core.rs',['translation_json_core']]]){
  const text=files.get(path),capture=captureSourceModuleViews({source:text,sourcePath:path}),sourceView=capture.views[0];
  modules.push({file:path,path:name,source:text,sourceView,configurationCondition:sourceView.configurationCondition});
 }
 const evidence=resolveModuleBindings({modules}),selected=selectOriginalBoundedJsonCore({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});
 return {path:selected.rootFile,span:[...selected.span],dependencyDigest:dependencies.digest,features:[...features.features],bindingDiagnostics:evidence.diagnostics};
}
import {BOUNDED_JSON_RUNTIME_OPERATIONS} from './bounded-json-runtime-operations.mjs';
import {BOUNDED_JSON_CORE_SOURCE} from '../bounded-json-core-source-data.mjs';
import {selectOriginalBoundedJsonCore} from '../bounded-json-core-call-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

import {ownedVectorJsonFieldOperation,requireOwnedVectorJsonFieldSources} from './owned-vector-json-fields.mjs';
import {ownedSourceIntegerLiteral as ownedIntegerLiteral,narrowOwnedNumericLiteral} from './owned-numeric-literals.mjs';

import {ownedVectorTextScalarOperation} from './owned-vector-text-scalars.mjs';

// Additive runtime closure for bulk fixed-width scalar source families.
export function ownedBulkRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const rows=new Map();for(const row of [...ownedCoreRuntimeSources(runtimeRoot,declarationRoot),...ownedPrimitiveOperatorRuntimeSources(runtimeRoot,declarationRoot)]){if(rows.has(row.path)&&rows.get(row.path).source!==row.source)fail('conflicting actual bulk runtime source');rows.set(row.path,row);}return [...rows.values()].sort((a,b)=>a.path.localeCompare(b.path));
}

import {ownedNativeClosedOperator,requireOwnedNativeClosedCall} from './owned-native-division-operators.mjs';

import {assertOwnedPrimitiveDefinition} from './owned-primitive-definition-family.mjs';

import {primitiveVectorResultRole} from './owned-source-effect-calls.mjs';
import {assertOwnedPrimitiveVectorDefinition} from './owned-primitive-vector-definition-family.mjs';

import {createPrimitiveVectorInference} from './owned-primitive-vector-inference.mjs';

import {primitiveUnitReturnSyntax} from './owned-unit-return-syntax.mjs';
