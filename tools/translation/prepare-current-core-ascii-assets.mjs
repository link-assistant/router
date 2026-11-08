import {composeOwnedRuntimeImportEdges} from './prepare-owned-runtime-import-current.mjs';
import {composeOwnedCorePrivateAnalysisRetention} from './prepare-owned-core-private-analysis-retention.mjs';
// A separate, explicit ASCII asset/read schedule; old full builders stay exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareCoreAsciiReverseSources} from './prepare-core-ascii-reverse-sources.mjs';
import {composeCoreAsciiBaseAssets} from './prepare-current-core-ascii-base-assets.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';
import {currentUnicodeAssetInputs,requireCurrentUnicodeAssetInputs} from './current-unicode-asset-inputs.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const HOST='tools/translation/host-assets.mjs',HELPER='tools/translation/ascii-runtime-assets.mjs',DATA='tools/translation/ascii-runtime-assets-source-data.mjs',SOURCE='tools/translation/js-to-rust/owned-core-source.mjs';
const NAMES=['string-iterator-runtime.mjs','whitespace-data.mjs','string-iterator-runtime.d.mts'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned ASCII asset preparation: '+message);};
function timing(stage){if(process.env.ROUTER_TRANSLATION_PRODUCER_TRACE==='1')process.stderr.write(JSON.stringify({producer:"current-core-ascii-assets",stage,timeMs:Date.now()})+'\n');}
function originals(){
 const packed=readFileSync(new URL('./source-profiles/core-ascii/assets-originals.json.gz',import.meta.url));
 if(packed.length!==18161||hash(packed)!=='628ea63fafc598ec0e0db0a6b8b7253c033b4ee1ad8692434641b351acb99d15')fail('original source archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:150000});if(raw.length!==81694||hash(raw)!=='f30651dc1502fbd44771c88b05b307b793843e1510eca82630e651d82bf2d28d')fail('complete originals changed');
 const packet=JSON.parse(raw.toString('utf8'));if(packet.schema!=='router-owned-ascii-assets-originals-v1'||packet.files.length!==4)fail('complete original source records');
 for(const row of packet.files)if(hash(row.source)!==row.sha256)fail('complete source hash differs');return packet.files;
}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function detached(ts,node){const copy=ts.getSynthesizedDeepClone(node),clear=value=>{ts.setTextRange(value,{pos:-1,end:-1});ts.setOriginalNode(value,undefined);ts.forEachChild(value,clear);};clear(copy);return copy;}
function copySource(ts,path,source){const file=parse(ts,path,source),copies=file.statements.map(node=>detached(ts,node)),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));if(JSON.stringify(shape(ts,parse(ts,path,copy)))!==JSON.stringify(shape(ts,file)))fail('complete native source copy differs');return {source,copy,completeNativeAstCopy:true};}
function selectedProducer(ts,source){
 const file=parse(ts,resolve(ROOT,HOST),source),functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='hostRuntimeAssetsNamedDataAliases');
 if(functions.length!==1||!functions[0].body||functions[0].parameters.length)fail('one complete actual named asset producer');
 const body=functions[0].body,selected=[];
 for(const statement of body.statements){
  if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))continue;
  const call=statement.expression,callee=call.expression;
  if(!ts.isPropertyAccessExpression(callee)||!ts.isIdentifier(callee.expression)||callee.expression.text!=='files'||callee.name.text!=='set'||call.arguments.length!==2||!ts.isStringLiteral(call.arguments[0])||!NAMES.includes(call.arguments[0].text))continue;
  selected.push({name:call.arguments[0].text,node:statement});
 }
 if(selected.length!==3||selected.some((row,index)=>row.name!==NAMES[index]))fail('all three exact direct original set statements');
 const maps=body.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.length===1&&ts.isIdentifier(node.declarationList.declarations[0].name)&&node.declarationList.declarations[0].name.text==='files');
 const exits=body.statements.filter(node=>ts.isReturnStatement(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='files');
 if(maps.length!==1||exits.length!==1)fail('actual private files binding and result');
 const declaration=maps[0].declarationList.declarations[0];if(!declaration.initializer||!ts.isNewExpression(declaration.initializer)||!ts.isIdentifier(declaration.initializer.expression)||declaration.initializer.expression.text!=='Map'||declaration.initializer.arguments?.length)fail('exact original private Map allocation');
 const imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='node:fs').flatMap(node=>node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)?[...node.importClause.namedBindings.elements]:[]).filter(node=>node.name.text==='readFileSync'&&(node.propertyName??node.name).text==='readFileSync');
 if(imports.length!==1)fail('one actual filesystem source import');
 const options={allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host=ts.createCompilerHost(options),original=host.getSourceFile;host.getSourceFile=(name,...args)=>resolve(name)===file.fileName?file:original(name,...args);
 const native=ts.createProgram([file.fileName],options,host),checker=native.getTypeChecker(),links=[];
 for(const row of selected){const visit=node=>{if(ts.isIdentifier(node)&&['files','readFileSync'].includes(node.text)){const symbol=checker.getSymbolAtLocation(node),expected=node.text==='files'?declaration:imports[0];if(symbol?.declarations?.length!==1||symbol.declarations[0]!==expected)fail('selected native lexical source binding differs');links.push({name:node.text,span:[node.getStart(file),node.end],declaration:[expected.getStart(file),expected.end]});}ts.forEachChild(node,visit);};visit(row.node);}
 const nodes=[maps[0],...selected.map(row=>row.node),exits[0]],printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true});
 const copies=nodes.map(node=>detached(ts,node)),printed=copies.map(node=>printer.printNode(ts.EmitHint.Unspecified,node,file));
 for(let at=0;at<nodes.length;at++)if(JSON.stringify(shape(ts,nodes[at]))!==JSON.stringify(shape(ts,parse(ts,'selected-copy.mjs',printed[at]).statements[0])))fail('complete selected native subtree differs');
 return {selected,links,statements:printed,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(ROOT,HOST),source)};
}
function helperSource(statements){
 const verify='for(const row of pins){const source=apply(get,files,[row.name]);if(hash(source)!==row.sha256||source!==row.source)throw new TypeError("ASCII selected asset source changed: "+row.name); }\nassertReverseConcreteSourceHost();\nreturn files;';
 return `// GENERATED: exact selected native asset statements; explicit new read schedule.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {ASCII_RUNTIME_ASSET_SOURCE,ASCII_RUNTIME_ASSET_SHA256,ASCII_HOST_ASSET_SOURCE,ASCII_HOST_ASSET_SHA256,ASCII_SELECTED_ASSET_JSON} from './ascii-runtime-assets-source-data.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function hostCoreAsciiRuntimeAssets(){
 assertReverseConcreteSourceHost();
 const current=readFileSync(new URL('./ascii-runtime-assets.mjs',import.meta.url),'utf8');
 if(hash(current)!==ASCII_RUNTIME_ASSET_SHA256||current!==ASCII_RUNTIME_ASSET_SOURCE)throw new TypeError('ASCII selected asset producer source changed');
 const parent=readFileSync(new URL('./host-assets.mjs',import.meta.url),'utf8');
 if(hash(parent)!==ASCII_HOST_ASSET_SHA256||parent!==ASCII_HOST_ASSET_SOURCE)throw new TypeError('ASCII original asset producer source changed');
 assertReverseConcreteSourceHost();
 const parse=JSON.parse,apply=Reflect.apply,get=Map.prototype.get,pins=parse(ASCII_SELECTED_ASSET_JSON);
${statements.map(statement=>statement==='return files;'?verify:statement+'\nassertReverseConcreteSourceHost();').join('\n')}
}
export function coreAsciiAssetReadSchedule(){return {schema:'router-ascii-selected-assets-v1',producerSources:['ascii-runtime-assets.mjs','host-assets.mjs'],selectedAssets:${JSON.stringify(NAMES)},runtimeReads:['extensions/string-iterator-runtime.mjs','extensions/whitespace-data.mjs'],declarationSource:'host-assets.mjs:hostRuntimeAssetsNamedDataAliases',unrelatedAssetReads:false,hostCheckerExecuted:false,fullBuilderCallbackParity:false};}
`;}

function afterSources(ts,rows){
 const sources=Object.fromEntries(rows.map(row=>[row.path,row.source])),selection=selectedProducer(ts,sources[HOST]),helper=helperSource(selection.statements);
 const selected=selection.selected.map(row=>{const argument=row.node.expression.arguments[1],source=ts.isStringLiteral(argument)?argument.text:sources['tools/translation/extensions/'+row.name];if(typeof source!=='string')fail('complete selected original asset source');return {name:row.name,source,sha256:hash(source)};});
 const data='// GENERATED: complete original/native producer source DATA, never runtime authority.\n'+[['ASCII_RUNTIME_ASSET_SOURCE',helper],['ASCII_RUNTIME_ASSET_SHA256',hash(helper)],['ASCII_HOST_ASSET_SOURCE',sources[HOST]],['ASCII_HOST_ASSET_SHA256',hash(sources[HOST])],['ASCII_SELECTED_ASSET_JSON',JSON.stringify(selected)]].map(([name,value])=>'export const '+name+'='+JSON.stringify(value)+';').join('\n')+'\n';
 const before=sources[SOURCE],needle="export function ownedCoreAsciiRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){\n ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=hostRuntimeAssets(),rows=[],seen=new Set();";
 if(before.split(needle).length!==2)fail('exact complete original ASCII-only source closure');
 const after=before.replace(needle,needle.replace('assets=hostRuntimeAssets()','assets=hostCoreAsciiRuntimeAssets()')).replace("import {ownedAsciiOperation} from './owned-ascii-source.mjs';","import {ownedAsciiOperation} from './owned-ascii-source.mjs';\nimport {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';");
 if(after===before||after.split('hostCoreAsciiRuntimeAssets').length!==3)fail('one new selected import and ASCII call');
 return {selection,files:[{path:HELPER,before:'',after:helper},{path:DATA,before:'',after:data},{path:SOURCE,before,after}]};
}
function prepare(ts,row,root,equation){
 const {before,after}=row;
 if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');
 const stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true})),beforeMeta=equation.beforeMeta,afterMeta=equation.afterMeta;
  let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {...row,current,sourceLanguage:'JavaScript',beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta,inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:[copySource(ts,row.path,before),copySource(ts,row.path,after)],completeNativeAstCopy:true};
}
export function prepareCoreAsciiAssets({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 timing('prepare:start');const rows=originals();timing('prepare:originals');
 const inputs=currentUnicodeAssetInputs(rows,root);timing('prepare:unicode-inputs');
 const historical=afterSources(ts,rows);timing('prepare:historical');
 const result=afterSources(ts,inputs.rows),parent=inputs.rows.find(row=>row.path===HOST);timing('prepare:current');
 const all=[...historical.files,...result.files],equations=transportConcreteNamedSourcePhases(all.map(row=>({before:row.before,middle:row.before,after:row.after,language:'JavaScript',rules:["ascii-assets:retain-complete-original-source","ascii-assets:explicit-selected-read-schedule","ascii-assets:restore-complete-language-input","ascii-assets:restore-complete-original-input"]})));
 timing('prepare:concrete-equations');
 const historicalFiles=historical.files.map((row,at)=>prepare(ts,row,root,equations[at])),files=result.files.map((row,at)=>prepare(ts,row,root,equations[historical.files.length+at]));
 requireCurrentUnicodeAssetInputs(inputs);
 timing('prepare:complete');
 return {schema:"router-owned-ascii-assets-v1",typescriptVersion:ts.version,files,selection:{path:HOST,source:parent.source,sha256:parent.sha256,statements:result.selection.selected.map(row=>({name:row.name,span:[row.node.getStart(),row.node.end],source:row.node.getText()})),nativeBindings:result.selection.nativeBindings,nativeLexicalBindings:result.selection.links},historical:{files:historicalFiles,selection:{selected:historical.selection.selected.map(row=>({name:row.name,span:[row.node.getStart(),row.node.end],source:row.node.getText()})),links:historical.selection.links,statements:historical.selection.statements,nativeBindings:historical.selection.nativeBindings},originals:rows},currentInputComposition:inputs,runtimeExecuted:false,rustExecuted:false,semanticAuthority:false,fullBuilderCallbackParity:false};
}
export function composeCoreAsciiAssets(prior,options={}){
 // Authenticate the whole archived predecessor before native/CST preparation.
 // Accepted inputs retain complete preparation and its final comparison.
 const rows=originals(),before=new Map([[HELPER,''],[DATA,''],[SOURCE,rows.find(row=>row.path===SOURCE).source]]);
 for(const [path,source]of before)if(Object.hasOwn(prior,path)&&prior[path]&&prior[path].after!==source)fail('preceding complete source equation differs: '+path);
const plan=prepareCoreAsciiAssets(options),sources={...prior};for(const row of plan.files){if(sources[row.path]&&sources[row.path].after!==row.before)fail('preceding complete source equation differs: '+row.path);sources[row.path]=row;}return {sources,layers:[plan],historicalSources:prior};}
export function prepareCurrentCoreAsciiAssets(options={}){const birth=prepareCoreAsciiAssets(options),base=composeCoreAsciiBaseAssets(Object.fromEntries(birth.files.map(row=>[row.path,row])),options),retention=composeOwnedCorePrivateAnalysisRetention(base.sources,options),runtime=composeOwnedRuntimeImportEdges(retention.sources,options);return {schema:'current-owned-ascii-assets-v1',birth,layers:[birth,...base.layers,...retention.layers,...runtime.layers],files:Object.values(runtime.sources),semanticAuthority:false};}
export function prepareCurrentCoreAsciiReverseAssets(options={}){
 timing('reverse:start');const birth=prepareCoreAsciiReverseSources(options);timing('reverse:birth');
 const assets=composeCoreAsciiAssets(Object.fromEntries(birth.files.map(row=>[row.path,row])),options);timing('reverse:assets');
 const base=composeCoreAsciiBaseAssets(assets.sources,options);timing('reverse:base');
 const retention=composeOwnedCorePrivateAnalysisRetention(base.sources,options);timing('reverse:retention');
 const runtime=composeOwnedRuntimeImportEdges(retention.sources,options);timing('reverse:runtime');
 return {schema:'current-owned-ascii-reverse-assets-v1',birth,layers:[birth,...assets.layers,...base.layers,...retention.layers,...runtime.layers],files:Object.values(runtime.sources),semanticAuthority:false};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('usage: --write|--check');const plan=prepareCurrentCoreAsciiAssets();
 if(args[0]==='--write'){for(const row of plan.files)if(row.current!==null&&!plan.layers.flatMap(layer=>layer.files.filter(part=>part.path===row.path).flatMap(part=>[part.before,part.after])).includes(row.current))fail('physical complete parent differs: '+row.path);for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated ASCII assets are stale');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),fullBuilderCallbackParity:false,rustExecuted:false}));
}
