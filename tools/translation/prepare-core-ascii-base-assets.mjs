// New ASCII base-source schedule; original builders and non-ASCII inputs stay exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {posix,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hostRuntimeAssetsNamedDataAliases} from './host-assets.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const HOST='tools/translation/host-assets.mjs',RETENTION='tools/translation/json-retention-runtime-assets.mjs',SOURCE='tools/translation/js-to-rust/owned-core-source.mjs',HELPER='tools/translation/ascii-base-runtime-assets.mjs',DATA='tools/translation/ascii-base-runtime-assets-source-data.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned ASCII base preparation: '+message);};
function originals(){
 const packed=readFileSync(new URL('./source-profiles/core-ascii/base-assets-originals.json.gz',import.meta.url));
 if(packed.length!==46455||hash(packed)!=='3ee12d009e4d56ad278286cebdd046e6df95f401d2a019bb4ce25800125c1b35')fail('complete original source archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:250000});if(raw.length!==207333||hash(raw)!=='899c61549a2d1be0c88c3232c4d5d2a073d50d1fca8b624fa3f2e5ba9dd0fb72')fail('complete original bytes changed');
 const packet=JSON.parse(raw.toString('utf8'));if(packet.schema!=='router-owned-ascii-base-originals-v1'||packet.files.length!==5)fail('five complete original source inputs required');for(const row of packet.files)if(hash(row.source)!==row.sha256)fail('complete source hash differs');return packet.files;
}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mts')||path.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function detached(ts,node){const copy=ts.getSynthesizedDeepClone(node),clear=value=>{ts.setTextRange(value,{pos:-1,end:-1});ts.setOriginalNode(value,undefined);ts.forEachChild(value,clear);};clear(copy);return copy;}
function copySource(ts,path,source){const file=parse(ts,path,source),copies=file.statements.map(node=>detached(ts,node)),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));if(JSON.stringify(shape(ts,parse(ts,path,copy)))!==JSON.stringify(shape(ts,file)))fail('complete native source copy differs');return {source,copy,completeNativeAstCopy:true};}
function originalFunction(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1||!rows[0].body||rows[0].parameters.length>2)fail('one complete original function: '+name);return rows[0];}
function oldClosure(ts,source,assets){
 const file=parse(ts,SOURCE,source),fn=originalFunction(ts,file,'ownedCoreRuntimeSources'),loops=fn.body.statements.filter(node=>ts.isForOfStatement(node)&&ts.isArrayLiteralExpression(node.expression)&&ts.isExpressionStatement(node.statement)&&ts.isCallExpression(node.statement.expression)&&ts.isIdentifier(node.statement.expression.expression)&&node.statement.expression.expression.text==='visit');
 if(loops.length!==1||loops[0].expression.elements.some(node=>!ts.isStringLiteral(node)))fail('actual complete base closure root literal nodes');
 const roots=loops[0].expression.elements.map(node=>node.text),seen=new Set(),selected=new Map(),imports=[];
 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('original runtime closure bound');seen.add(name);
  const body=assets.get(name);if(typeof body!=='string')fail('original selected asset absent: '+name);selected.set(name,body);const native=parse(ts,name,body);
  for(const node of native.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   if(!ts.isStringLiteral(node.moduleSpecifier))fail('native module import is not literal');const spec=node.moduleSpecifier.text;imports.push({name,source:body,span:[node.getStart(native),node.end],specifier:spec});
   if(spec==='node:util'||spec==='node:crypto')continue;if(!spec.startsWith('./')&&!spec.startsWith('../'))fail('nonrelative original base import');const target=posix.normalize(posix.join(posix.dirname(name),spec));if(posix.dirname(target)!=='.')fail('original materialized runtime import escapes');visit(posix.basename(target));
  }
 }
 for(const name of roots)visit(name);for(const [name,body]of assets)if(/LICENSE|NOTICE/iu.test(name))selected.set(name,body);
 if(selected.size!==33)fail('complete pinned base runtime universe differs');return {roots,imports,rows:[...selected].sort(([left],[right])=>left.localeCompare(right)).map(([name,source])=>({name,source,sha256:hash(source)}))};
}
function selectedBody(ts,source,names){
 const path=resolve(ROOT,HOST),file=parse(ts,path,source),fn=originalFunction(ts,file,'hostRuntimeAssetsNamedDataAliases'),body=fn.body.statements,selected=new Set(names),first=body.slice(0,4),expected=[['checker','program'],['types','aliases'],['namedAliases'],['files']];
 for(let at=0;at<4;at++)if(!ts.isVariableStatement(first[at])||first[at].declarationList.declarations.map(row=>ts.isIdentifier(row.name)?row.name.text:null).join('\0')!==expected[at].join('\0'))fail('complete actual HostChecker/type/alias declarations');
 const collision=node=>{if(ts.isIdentifier(node)&&(node.text.startsWith('__asciiBase')||node.text==='assertReverseConcreteSourceHost'||node.text==='createHash'))fail('new helper binding would capture an original identifier');ts.forEachChild(node,collision);};collision(fn);
 const print=node=>ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printNode(ts.EmitHint.Unspecified,detached(ts,node),file),guard=ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createIdentifier('assertReverseConcreteSourceHost'),undefined,[])),retained=[...first],copies=[...first.map(node=>print(node)+'\nassertReverseConcreteSourceHost();')],arraySelections=[];
 const guarded=statement=>{const rows=ts.isBlock(statement)?[...statement.statements]:[statement],nodes=[detached(ts,guard)];for(const node of rows)nodes.push(detached(ts,node),detached(ts,guard));return ts.factory.createBlock(nodes,true);};
 for(const node of body.slice(4)){
  if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)){
   const call=node.expression,key=call.arguments[0],callee=call.expression;
   if(ts.isPropertyAccessExpression(callee)&&ts.isIdentifier(callee.expression)&&callee.expression.text==='files'&&callee.name.text==='set'&&call.arguments.length===2&&ts.isStringLiteral(key)&&selected.has(key.text)){retained.push(node);copies.push(print(node)+'\nassertReverseConcreteSourceHost();');}
   continue;
  }
  if(!ts.isForOfStatement(node))continue;
  if(ts.isArrayLiteralExpression(node.expression)){
   if(node.expression.elements.some(value=>!ts.isStringLiteral(value)))fail('actual selected source loop literal nodes');
   const declarations=ts.isVariableDeclarationList(node.initializer)?node.initializer.declarations:[];if(declarations.length!==1||!ts.isIdentifier(declarations[0].name))fail('actual selected file/family loop binding');const variable=declarations[0].name.text;
   let values;
   if(variable==='family'){
    const set=ts.isBlock(node.statement)?node.statement.statements.filter(row=>ts.isExpressionStatement(row)&&ts.isCallExpression(row.expression)&&ts.isPropertyAccessExpression(row.expression.expression)&&row.expression.expression.expression.text==='files'&&row.expression.expression.name.text==='set'):[];
    if(set.length!==1)fail('actual dynamic declaration set');const key=set[0].expression.arguments[0];if(!ts.isBinaryExpression(key)||key.operatorToken.kind!==ts.SyntaxKind.PlusToken||!ts.isIdentifier(key.left)||key.left.text!==variable||!ts.isStringLiteral(key.right))fail('actual dynamic declaration key equation');values=node.expression.elements.filter(value=>selected.has(value.text+key.right.text));
    if(values.length!==1||values[0].text!=='json')fail('complete selected dynamic JSON declaration family');
   }else if(variable==='file')values=node.expression.elements.filter(value=>selected.has(value.text));else fail('unmodeled original source loop binding');
   if(!values.length)continue;const expression=ts.factory.createArrayLiteralExpression(values.map(value=>detached(ts,value))),copy=ts.factory.updateForOfStatement(detached(ts,node),node.awaitModifier,detached(ts,node.initializer),expression,guarded(node.statement));
   retained.push(node);arraySelections.push({span:[node.expression.getStart(file),node.expression.end],before:node.expression.getText(file),values:values.map(value=>value.text),body:node.statement.getText(file)});copies.push(print(copy));continue;
  }
  if(ts.isCallExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='jsonRetentionRuntimeAssets'){
   retained.push(node);copies.push(print(ts.factory.updateForOfStatement(detached(ts,node),node.awaitModifier,detached(ts,node.initializer),detached(ts,node.expression),guarded(node.statement))));
  }
 }
 if(arraySelections.filter(row=>row.values.includes('json')).length!==1||!retained.some(node=>ts.isForOfStatement(node)&&ts.isCallExpression(node.expression)))fail('dynamic JSON and actual retention dependency closure preserved');
 const imported=new Map();for(const statement of file.statements)if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))for(const node of statement.importClause.namedBindings.elements)imported.set(node.name.text,node);
 const bound=new Map(imported);for(const row of first)for(const declaration of row.declarationList.declarations)bound.set(declaration.name.text,declaration);
 const options={allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host=ts.createCompilerHost(options),read=host.getSourceFile;host.getSourceFile=(name,...args)=>resolve(name)===path?file:read(name,...args);const program=ts.createProgram([path],options,host),checker=program.getTypeChecker(),links=[];
 for(const original of retained){const visit=node=>{if(ts.isIdentifier(node)&&bound.has(node.text)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)&&!(ts.isPropertyAssignment(node.parent)&&node.parent.name===node)){const expected=bound.get(node.text),symbol=checker.getSymbolAtLocation(node);if(symbol?.declarations?.length!==1||symbol.declarations[0]!==expected)fail('actual original native lexical binding differs: '+node.text);links.push({name:node.text,span:[node.getStart(file),node.end],declaration:[expected.getStart(file),expected.end]});}ts.forEachChild(node,visit);};visit(original);}
 for(const node of retained){const clone=detached(ts,node),printed=print(clone),parsed=parse(ts,'complete-original-subtree.mjs',printed);if(JSON.stringify(shape(ts,node))!==JSON.stringify(shape(ts,parsed.statements[0])))fail('complete detached original native subtree differs');}
 const imports=file.statements.filter(ts.isImportDeclaration).map(print).join('\n');return {source:copies.join('\n'),imports,retained:retained.map(node=>({span:[node.getStart(file),node.end],source:node.getText(file)})),arraySelections,nativeLexicalBindings:links,nativeBindings:verifyNativeCopiedSourceBindings(ts,path,source)};
}
function helperSource(selection,closure){return `// GENERATED: explicit ASCII base asset schedule, copied native producer nodes.
${selection.imports}
import {createHash} from 'node:crypto';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {ASCII_BASE_HELPER_SOURCE,ASCII_BASE_HELPER_SHA256,ASCII_BASE_PARENT_JSON,ASCII_BASE_ASSET_JSON} from './ascii-base-runtime-assets-source-data.mjs';
const __asciiBaseHash=source=>createHash('sha256').update(source).digest('hex');
export function hostCoreAsciiBaseRuntimeAssets(){
 assertReverseConcreteSourceHost();
 const __asciiBaseCurrent=readFileSync(new URL('./ascii-base-runtime-assets.mjs',import.meta.url),'utf8');
 if(__asciiBaseHash(__asciiBaseCurrent)!==ASCII_BASE_HELPER_SHA256||__asciiBaseCurrent!==ASCII_BASE_HELPER_SOURCE)throw new TypeError('ASCII base helper source changed');
 assertReverseConcreteSourceHost();
 const __asciiBaseApply=Reflect.apply,__asciiBaseParse=JSON.parse,__asciiBaseGet=Map.prototype.get,__asciiBaseSize=Object.getOwnPropertyDescriptor(Map.prototype,'size').get;
 const __asciiBaseParents=__asciiBaseParse(ASCII_BASE_PARENT_JSON),__asciiBasePins=__asciiBaseParse(ASCII_BASE_ASSET_JSON);
 for(const __asciiBaseRow of __asciiBaseParents){const __asciiBaseActual=readFileSync(new URL('./'+__asciiBaseRow.path,import.meta.url),'utf8');if(__asciiBaseHash(__asciiBaseActual)!==__asciiBaseRow.sha256||__asciiBaseActual!==__asciiBaseRow.source)throw new TypeError('ASCII base original producer source changed: '+__asciiBaseRow.path);assertReverseConcreteSourceHost();}
${selection.source}
 if(__asciiBaseApply(__asciiBaseSize,files,[])!==__asciiBasePins.length)throw new TypeError('ASCII base selected source universe differs');
 for(const __asciiBaseRow of __asciiBasePins){const __asciiBaseActual=__asciiBaseApply(__asciiBaseGet,files,[__asciiBaseRow.name]);if(__asciiBaseHash(__asciiBaseActual)!==__asciiBaseRow.sha256||__asciiBaseActual!==__asciiBaseRow.source)throw new TypeError('ASCII base selected source changed: '+__asciiBaseRow.name);}
 assertReverseConcreteSourceHost();return files;
}
export function coreAsciiBaseAssetSchedule(){return {schema:'router-ascii-base-selected-assets-v1',selectedAssets:33,selectedNames:${JSON.stringify(closure.rows.map(row=>row.name))},producerSources:['ascii-base-runtime-assets.mjs','host-assets.mjs','json-retention-runtime-assets.mjs'],hostCheckerExecuted:true,completeHostData:true,completeNamedAliases:true,generatedDeclarationFamilies:['json'],unrelatedAssetReads:false,fullBuilderCallbackParity:false};}
`;}
function afterSources(ts,rows){
 const originals=Object.fromEntries(rows.map(row=>[row.path,row.source])),assets=hostRuntimeAssetsNamedDataAliases(),closure=oldClosure(ts,originals[SOURCE],assets),selection=selectedBody(ts,originals[HOST],closure.rows.map(row=>row.name)),helper=helperSource(selection,closure),parents=[HOST,RETENTION].map(path=>({path:path.slice('tools/translation/'.length),source:originals[path],sha256:hash(originals[path])}));
 const data='// GENERATED: complete canonical source DATA, never a remembered source verdict.\n'+[['ASCII_BASE_HELPER_SOURCE',helper],['ASCII_BASE_HELPER_SHA256',hash(helper)],['ASCII_BASE_PARENT_JSON',JSON.stringify(parents)],['ASCII_BASE_ASSET_JSON',JSON.stringify(closure.rows)]].map(([name,value])=>'export const '+name+'='+JSON.stringify(value)+';').join('\n')+'\n';
 const before=originals[SOURCE];let after=before;
 const rootNeedle=" const expected=ownedCoreRuntimeSources(data.runtimeRoot,data.declarationRoot);",rootAfter=" const expected=(__asciiSourceApply(__asciiSourceHas,files,[data.runtimeRoot+'/string-iterator-runtime.mjs'])?ownedCoreAsciiBaseRuntimeSources:ownedCoreRuntimeSources)(data.runtimeRoot,data.declarationRoot);";
 const currentNeedle=' for(const row of ownedCoreRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))',currentAfter=" for(const row of (__asciiSourceApply(__asciiSourceHas,state.files,[state.data.runtimeRoot+'/string-iterator-runtime.mjs'])?ownedCoreAsciiBaseRuntimeSources:ownedCoreRuntimeSources)(state.data.runtimeRoot,state.data.declarationRoot))";
 for(const [left,right]of [[rootNeedle,rootAfter],[currentNeedle,currentAfter]]){if(after.split(left).length!==2)fail('one actual ASCII-only source context selection');after=after.replace(left,right);}
 for(const name of ['createOwnedCoreSourceContext(input)','requireOwnedCoreSourceCurrent(handle)']){
  const start='export function '+name+'{\n assertReverseConcreteSourceHost();';if(after.split(start).length!==2)fail('one complete guarded source context entry');after=after.replace(start,start+'const __asciiSourceHas=Map.prototype.has,__asciiSourceApply=Reflect.apply;');
 }

 const sourceFile=parse(ts,SOURCE,before);const collision=node=>{if(ts.isIdentifier(node)&&node.text.startsWith('__asciiSource'))fail('new source selector binding would capture an original identifier');ts.forEachChild(node,collision);};collision(sourceFile);const fn=originalFunction(ts,sourceFile,'ownedCoreRuntimeSources'),copied=fn.getText(sourceFile).replace('ownedCoreRuntimeSources(', 'ownedCoreAsciiBaseRuntimeSources(').replace('assets=hostRuntimeAssets()','assets=hostCoreAsciiBaseRuntimeAssets()');
 if(copied===fn.getText(sourceFile)||copied.split('hostCoreAsciiBaseRuntimeAssets').length!==2)fail('actual complete base-source closure copy');
 after=after.replace("import {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';","import {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';\nimport {hostCoreAsciiBaseRuntimeAssets} from '../ascii-base-runtime-assets.mjs';")+'\n// Explicit ASCII presence source profile; original full builder above remains exact.\n'+copied+'\n';
 if(after.split('hostCoreAsciiBaseRuntimeAssets').length!==3)fail('exact new selected import and base call');const finalSource=parse(ts,SOURCE,after);for(const name of ['ownedCoreRuntimeSources','rustEdge','base64Source'])if(originalFunction(ts,sourceFile,name).getText(sourceFile)!==originalFunction(ts,finalSource,name).getText(finalSource))fail('unchanged original public/Rust ABI body differs');return {files:[{path:HELPER,before:'',after:helper},{path:DATA,before:'',after:data},{path:SOURCE,before,after}],selection,closure};
}
function prepare(ts,row,root){
 const {before,after}=row,first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),stages=[];let document=first.document;
 const rule=(left,right,id)=>({id,edits:[{span:[0,left.length],expected:left,replacement:right}]});
 for(const phase of ['language','repository']){
  const wire=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(wire);if(fresh.source!==before)fail('complete stage input differs');const target=phase==='language'?before:after;
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?[rule(before,before,'ascii-base:retain-complete-original-source')]:[],repositoryRules:phase==='repository'?[rule(before,after,'ascii-base:explicit-selected-read-schedule')]:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);
  if(last.source!==target)fail('complete source substitution differs');const undo=applyConcreteSyntaxSubstitutions(last.document,{languageRules:phase==='language'?[rule(target,before,'ascii-base:restore-complete-language-input')]:[],repositoryRules:phase==='repository'?[rule(target,before,'ascii-base:restore-complete-original-input')]:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==before)fail('complete inverse differs');stages.push({phase,before,after:target,beforeMeta:wire,afterMeta,trace:run.trace,completeInverse:true});document=last.document;
 }
 let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {...row,current,sourceLanguage:'JavaScript',beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:[copySource(ts,row.path,before),copySource(ts,row.path,after)],completeNativeAstCopy:true};
}

export function prepareCoreAsciiBaseAssets({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const rows=originals();
 for(const row of rows)if(readFileSync(resolve(root,row.path),'utf8')!==row.source&&row.path!==SOURCE)fail('complete original producer/dependency changed: '+row.path);
 const result=afterSources(ts,rows);
 return {schema:'router-owned-ascii-base-assets-v1',typescriptVersion:ts.version,files:result.files.map(row=>prepare(ts,row,root)),selection:{source:rows.find(row=>row.path===HOST).source,...result.selection},closure:result.closure,originalSourcePublicBuilderUnchanged:true,nonAsciiContextsUnchanged:true,runtimeExecuted:false,rustExecuted:false,semanticAuthority:false,fullBuilderCallbackParity:false};
}
export function composeCoreAsciiBaseAssets(prior,options={}){
 // A complete archived predecessor mismatch needs no native parse or CST work.
 // This is a new source-only API; no accepted operand or source check is skipped.
 const rows=originals(),before=new Map([[HELPER,''],[DATA,''],[SOURCE,rows.find(row=>row.path===SOURCE).source]]);
 for(const [path,source]of before)if(Object.hasOwn(prior,path)&&prior[path].after!==source)fail('preceding complete source equation differs: '+path);
 const plan=prepareCoreAsciiBaseAssets(options),sources={...prior};for(const row of plan.files){if(sources[row.path]&&sources[row.path].after!==row.before)fail('preceding complete source equation differs: '+row.path);sources[row.path]=row;}return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('usage: --write|--check');const plan=prepareCoreAsciiBaseAssets();
 if(args[0]==='--write'){for(const row of plan.files)if(row.current!==null&&![row.before,row.after].includes(row.current))fail('physical complete parent differs: '+row.path);for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated ASCII base assets are stale');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),selectedAssets:plan.closure.rows.length,fullBuilderCallbackParity:false,rustExecuted:false}));
}
