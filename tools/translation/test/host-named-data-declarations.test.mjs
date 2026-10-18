import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,posix} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {originalDataFreezeIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {HostChecker,hostData,HOST_CONTRACTS} from '../extensions/host-contracts.mjs';
import {dataAliasName,typeScriptType,typeScriptAliases,valueSchema} from '../type-layout.mjs';
import {NAMED_HOST_DECLARATION_SOURCE_PATHS,proposeNamedHostDeclarationSources,restoreNamedHostDeclarationSources} from '../migrate-host-named-declarations.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {assertReverseConcreteSourceHost} from '../js-to-rust/concrete-source.mjs';
import {ownedCoreRuntimeSources,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent,ownedCoreSourceData} from '../js-to-rust/owned-core-source.mjs';
import {translateOwnedCoreJavaScript,parseOwnedCoreMeta} from '../js-to-rust/translator.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const BASELINE='077889e3fb2ad2d4f3a96c756bf6087ef17678b1';
const HOST=NAMED_HOST_DECLARATION_SOURCE_PATHS[0],OWNED=NAMED_HOST_DECLARATION_SOURCE_PATHS[1];
const FAMILY_FILES=['json-runtime.d.mts','time-runtime.d.mts','integer-runtime.d.mts','float-runtime.d.mts'];
const ROOTS=['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts'];
// Exact689 source evolution is historical comparison DATA, never an issuer.
const READER_SOURCE_EVOLUTION=[{"before":"import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';","after":"import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';\nimport {ownedJsonReaderOperation,ownedJsonOptionalPayload,ownedJsonBorrowed} from './owned-json-source.mjs';"},{"before":"'base64-runtime.mjs','base64-runtime.d.mts'])visit(name);","after":"'base64-runtime.mjs','base64-runtime.d.mts','json-runtime.d.mts'])visit(name);"},{"before":"['json-update-runtime.mjs','json-macro-runtime.mjs','base64-runtime.mjs'].includes(posix.basename(target))","after":"['json-update-runtime.mjs','json-macro-runtime.mjs','base64-runtime.mjs','json-runtime.mjs'].includes(posix.basename(target))"},{"before":"target===state.data.runtimeRoot+'/base64-runtime.mjs'){","after":"target===state.data.runtimeRoot+'/base64-runtime.mjs'||target===state.data.runtimeRoot+'/json-runtime.mjs'){"},{"before":"if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&op)return op.ret;","after":"if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&op)return op.ret;\n   const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader)return reader.ret;"},{"before":"if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'","after":"const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader&&Number(type.indexType.literal.text)<reader.args.length)return reader.args[Number(type.indexType.literal.text)];\n   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'"},{"before":"root:['json-ref','map-ref','str','bytes-ref','base64-error-ref'].includes(type)?identifier.text:null","after":"root:['json-ref','map-ref','str','bytes-ref','base64-error-ref'].includes(type)||ownedJsonBorrowed(type)?identifier.text:null"},{"before":" const mergeMoves=(scope,yes,no)=>{for(const [key,value]of scope)if(ownedBase64Result(value.type))value.moved=!!yes.get(key)?.moved||!!no.get(key)?.moved;};","after":" const mergeMoves=(scope,yes,no)=>{for(const [key,value]of scope)if(ownedBase64Result(value.type))value.moved=!!yes.get(key)?.moved||!!no.get(key)?.moved;};\n const refine=(scope,condition,truth)=>{\n  if(condition.kind==='not')return refine(scope,condition.value,!truth);\n  if(condition.kind!=='option-test')return scope;\n  const entry=scope.get(condition.value.name);if(entry)scope.set(condition.value.name,{...entry,some:truth===condition.some});return scope;\n };\n const resultOption=()=>{\n  const written=declaration.type??ts.getJSDocReturnType(declaration);\n  const type=written?originalOwnedCoreType(context,path,written,analysis):paired?.declaration.type?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis):null;\n  if(!ownedJsonOptionalPayload(type))fail('optional constructor requires actual written operation return domain');return type;\n };\n function optionTest(node,scope,depth){\n  const op=node.operatorToken.kind,left=node.left,right=node.right;\n  if(![ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)||!ts.isPropertyAccessExpression(left)||left.questionDotToken||left.name.text!=='$'||!ts.isIdentifier(left.expression)||!ts.isStringLiteral(right)||!['Some','None'].includes(right.text))return null;\n  const entry=scope.get(left.expression.text);if(!entry||checker.getSymbolAtLocation(left.expression)!==entry.symbol||!ownedJsonOptionalPayload(entry.type))fail('optional tag requires original typed binding');\n  const value=expression(left.expression,scope,depth+1);return {kind:'option-test',value,some:(right.text==='Some')===(op===ts.SyntaxKind.EqualsEqualsEqualsToken),type:'bool',root:null};\n }\n"},{"before":"  if(ts.isIdentifier(node)){\n   const value=scope.get(node.text);","after":"  if(ts.isObjectLiteralExpression(node)){\n   const fields=node.properties,type=resultOption(),payload=ownedJsonOptionalPayload(type);\n   if(fields.length<1||fields.length>2||fields.some(field=>!ts.isPropertyAssignment(field)||!ts.isIdentifier(field.name)&&!ts.isStringLiteral(field.name))||fields[0].name.text!=='$'||!ts.isStringLiteral(fields[0].initializer))fail('closed optional constructor required');\n   const tag=fields[0].initializer.text;\n   if(tag==='None'&&fields.length===1)return {kind:'option-none',type,root:null};\n   if(tag!=='Some'||fields.length!==2||fields[1].name.text!=='field0')fail('closed optional constructor fields');\n   const value=expression(fields[1].initializer,scope,depth+1);if(value.type!==payload||ownedJsonBorrowed(type)&&!value.root&&value.kind!=='string')fail('optional payload or live root differs');\n   return {kind:'option-some',value,type,root:ownedJsonBorrowed(type)?value.root:null};\n  }\n  if(ts.isPropertyAccessExpression(node)&&!node.questionDotToken&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){\n   const entry=scope.get(node.expression.text),payload=entry&&ownedJsonOptionalPayload(entry.type);\n   if(!payload||entry.some!==true||checker.getSymbolAtLocation(node.expression)!==entry.symbol)fail('optional payload needs a dominating actual Some tag');\n   const value=expression(node.expression,scope,depth+1);return {kind:'option-field',value,type:payload,root:ownedJsonBorrowed(entry.type)?entry.root:null};\n  }\n  if(ts.isIdentifier(node)){\n   const value=scope.get(node.text);"},{"before":"   const base64=ownedBase64Operation(binding.name);\n   if(base64","after":"   const reader=ownedJsonReaderOperation(binding.name);\n   if(reader&&binding.target===analysis.runtimeRoot+'/json-runtime.mjs'){\n    // The fixed current JS/declaration closure and original Rust/Cargo JSON\n    // profile were freshly joined by the genuine context. Rows are only DATA.\n    requireOwnedCoreSourceCurrent(context);\n    const args=node.arguments.map(argument=>expression(argument,scope,depth+1));\n    if(args.length!==reader.args.length||args.some((value,at)=>reader.args[at]==='json-ref'?!json(value.type):value.type!==reader.args[at]))fail('actual JSON reader operand domain differs');\n    const root=reader.root===null?null:args[reader.root].root;if(reader.root!==null&&!root)fail('JSON reader loan requires a live original input');\n    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);\n    return {kind:'json-reader-call',name:binding.name,args,type:reader.ret,root};\n   }\n   const base64=ownedBase64Operation(binding.name);\n   if(base64"},{"before":"const cond=expression(node.condition,scope,depth+1),a=branchScope(scope),b=branchScope(scope),yes=expression(node.whenTrue,a,depth+1),no=expression(node.whenFalse,b,depth+1);\n   if(cond.type!=='bool'||yes.type!==no.type||yes.root!==no.root)fail('conditional result or loan differs');mergeMoves(scope,a,b);return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:yes.root};","after":"const cond=expression(node.condition,scope,depth+1),a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=expression(node.whenTrue,a,depth+1),no=expression(node.whenFalse,b,depth+1);\n   if(cond.type!=='bool'||yes.type!==no.type||yes.root!==no.root&&yes.kind!=='option-none'&&no.kind!=='option-none')fail('conditional result or loan differs');mergeMoves(scope,a,b);return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:yes.kind==='option-none'?no.root:yes.root};"},{"before":"   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);","after":"   const optional=optionTest(node,scope,depth);if(optional)return optional;\n   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);"},{"before":"if(!['json','json-ref','bool','str','usize','text-owned','base64-result'].includes(value.type))fail('unsupported owned result');","after":"if(!['json','json-ref','bool','str','usize','text-owned','base64-result','u64','i64'].includes(value.type)&&!ownedJsonOptionalPayload(value.type))fail('unsupported owned result');"},{"before":"    if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root))fail('return domains differ');resultType=value.type;resultRoot=value.root;body.push({kind:'return',value});terminated=true;","after":"    if(ownedJsonBorrowed(value.type)&&value.root&&!params.some(param=>param.name===value.root&&(['json-ref','map-ref','str'].includes(param.type)||ownedJsonBorrowed(param.type))))fail('returned local optional loan');\n    if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root&&value.kind!=='option-none'&&resultRoot!==null))fail('return domains differ');resultType=value.type;if(value.kind!=='option-none')resultRoot=value.root;body.push({kind:'return',value});terminated=true;"},{"before":"const a=branchScope(scope),b=branchScope(scope),yes=block(statement.thenStatement.statements,a,depth+1),no=block(statement.elseStatement.statements,b,depth+1);","after":"const a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=block(statement.thenStatement.statements,a,depth+1),no=block(statement.elseStatement.statements,b,depth+1);"},{"before":" let resultType=null,resultRoot=null;","after":" let resultType=null,resultRoot=null,resultOnlyAbsent=true;"},{"before":"if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root&&value.kind!=='option-none'&&resultRoot!==null))fail('return domains differ');resultType=value.type;if(value.kind!=='option-none')resultRoot=value.root;","after":"if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root&&!(ownedJsonOptionalPayload(value.type)&&(value.kind==='option-none'||resultOnlyAbsent))))fail('return domains differ');resultType=value.type;if(value.kind!=='option-none'){resultRoot=value.root;resultOnlyAbsent=false;}"},{"before":"['json-ref','map-ref'].includes(param.type)","after":"['json-ref','map-ref','json-option-ref'].includes(param.type)"},{"before":"  if(type==='base64-result')fail('native base64 result input control is not implemented');","after":"  if(type==='base64-result')fail('native base64 result input control is not implemented');\n  if(ownedJsonOptionalPayload(type))fail('optional public parameters require an independently checked carrier boundary');"}];
const CURRENT_ROOTS=[...ROOTS,'json-runtime.d.mts'];
function historicalReaderSource(source){
 const stages=[];
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'named-host-history:undo-complete-reader-source-evolution',apply:()=>{
   let value=source;
   for(const row of [...READER_SOURCE_EVOLUTION].reverse()){assert.equal(value.split(row.after).length,2,'unique complete689 source step');const at=value.indexOf(row.after),before=value;value=value.slice(0,at)+row.before+value.slice(at+row.after.length);stages.push({before,after:value,span:[at,at+row.after.length],expected:row.after,replacement:row.before});}
   let inverse=value;for(const row of READER_SOURCE_EVOLUTION){assert.equal(inverse.split(row.before).length,2);inverse=inverse.replace(row.before,()=>row.after);}assert.equal(inverse,source,'whole689 source inverse');
   return {source:value,actual:source,inverse,stages};
  }}]},
  {phase:'repository',rules:[{id:'named-host-history:retain-full-current-and-historical-CST',apply:row=>{
   const documents=[row.actual,row.source].map(source=>{const concrete=transportConcreteSyntaxSource(source,{language:'JavaScript'}),meta=serializeConcreteSyntaxMeta(concrete.document);assert.equal(transportConcreteSyntaxMeta(meta).source,source);return {source,meta};});return {...row,documents,authority:{source:false,owner:false,type:false,executable:false}};
  }}]},
 ]);const result=pipeline.run(null);return {...result.value,trace:result.trace};
}
const digest=value=>createHash('sha256').update(value).digest('hex');
const receipts=[];
function retain(label,value){receipts.push({label,value});const directory=process.env.ROUTER_NAMED_HOST_DECLARATIONS_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,String(receipts.length).padStart(2,'0')+'-'+label+'.json'),JSON.stringify({label,value,authority:{source:false,owner:false,type:false,executable:false}},(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item)+'\n');}return value;}
function test(title,body){return nodeTest(title,{timeout:60000},body);}
function original(path){return execFileSync('git',['show',BASELINE+':'+path],{cwd:root,encoding:'utf8',timeout:5000,maxBuffer:1048576});}
function current(){return Object.fromEntries(NAMED_HOST_DECLARATION_SOURCE_PATHS.map(path=>[path,readFileSync(join(root,path),'utf8')]));}
function temporary(t){const directory=mkdtempSync(join(tmpdir(),'router-named-declarations-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));return directory;}
function write(directory,path,source){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
function materialize(directory,assets){for(const [path,source]of assets)write(directory,path,source);}
function strict(directory,file,positive){
 const args=[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',join(directory,file)];
 let status=0,stdout='',stderr='';try{stdout=execFileSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:4194304,stdio:'pipe'});}catch(error){if(error.signal||!Number.isInteger(error.status))throw error;status=error.status;stdout=String(error.stdout??'');stderr=String(error.stderr??'');}
 const row=retain('strict-'+file.replace(/[^a-z0-9]+/giu,'-'),{command:[process.execPath,...args],status,stdout,stderr,source:readFileSync(join(directory,file),'utf8')});
 if(positive)assert.equal(status,0,stdout+'\n'+stderr);else assert.notEqual(status,0,'negative complete consumer unexpectedly compiled');return row;
}
function families(){return HOST_CONTRACTS.filter(contract=>['json','time','integer','float'].includes(contract.family));}
function declarationCensus(assets){
 const ts=ownershipCompiler(),rows=[];
 for(const family of ['json','time','integer','float']){
  const path=family+'-runtime.d.mts',source=assets.get(path),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(file.parseDiagnostics.length,0);
  const names=new Set(),functions=[];
  for(const node of file.statements)if(ts.isFunctionDeclaration(node)&&node.modifiers?.some(item=>item.kind===ts.SyntaxKind.ExportKeyword)){
   assert.ok(node.name&&ts.isIdentifier(node.name));const name=node.name.text;assert.equal(names.has(name),false,'duplicate actual declaration export '+family+':'+name);names.add(name);
   functions.push({name,span:[node.getStart(file),node.end],source:source.slice(node.getStart(file),node.end),parameters:node.parameters.map(parameter=>({span:[parameter.getStart(file),parameter.end],source:parameter.getText(file)})),returnSource:node.type?.getText(file)??null});
  }
  rows.push({family,path,source,functions});
 }
 return rows;
}
function checked(){const checker=new HostChecker('Rust',[]);return {checker,declarations:checker.program({language:'Rust',items:hostData(),main:null}).declarations};}
function closure(assets,runtimeRoot='runtime',declarationRoot=runtimeRoot,roots=ROOTS){
 assertReverseConcreteSourceHost();const ts=ownershipCompiler(),seen=new Set(),rows=[],stages=[];
 function visit(name){
  if(seen.has(name))return;assert.ok(seen.size<128&&!name.includes('/')&&(/\.(mjs|mts)$/u.test(name)));seen.add(name);
  const source=assets.get(name);assert.equal(typeof source,'string');const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name;
  const concrete=transportConcreteSyntaxSource(source,{language:name.endsWith('.mts')?'TypeScript':'JavaScript'}),meta=serializeConcreteSyntaxMeta(concrete.document),reparsed=transportConcreteSyntaxMeta(meta);assert.equal(reparsed.source,source);
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,name.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);rows.push({path,source});stages.push({path,source,meta});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;assert.ok(specifier.startsWith('./'));const target=posix.normalize(posix.join(posix.dirname(path),specifier));assert.equal(posix.dirname(target),base);visit(posix.basename(target));}
 }
 for(const name of roots)visit(name);for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return {rows:rows.sort((a,b)=>a.path.localeCompare(b.path)),stages};
}
const CALLER='import {router_core_json_copy as copy} from "./runtime/json-update-runtime.mjs";\n/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return copy(value);}\n';
function input(source=CALLER){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:readFileSync(join(root,'Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},{path:'caller.mjs',source}]};}
function outcome(action){try{return {mode:'return',value:action()};}catch(error){return {mode:'throw',name:error.name,message:error.message};}}

test('legacy assets stay exact while the explicit format changes only unused family declaration spelling',()=>{
 const sources=current(),actualRestored=restoreNamedHostDeclarationSources(sources),readerHistory=historicalReaderSource(actualRestored[OWNED]),restored={...actualRestored,[OWNED]:readerHistory.source},before=Object.fromEntries(NAMED_HOST_DECLARATION_SOURCE_PATHS.map(path=>[path,original(path)]));assert.deepEqual({...restored},before);retain('full689-current-to-historical-comparison-only',{sources,actualRestored,readerHistory});
 const old=hostRuntimeAssets(),named=hostRuntimeAssetsNamedDataAliases();retain('complete-old-assets',[...old]);retain('complete-named-assets',[...named]);assert.deepEqual([...old.keys()],[...named.keys()]);
 const changed=[];for(const [path,source]of old){if(named.get(path)!==source)changed.push(path);if(path.endsWith('.mjs')||!FAMILY_FILES.includes(path))assert.equal(named.get(path),source,path);}
 assert.deepEqual(changed.sort(),['integer-runtime.d.mts','json-runtime.d.mts','time-runtime.d.mts']);const {declarations}=checked(),names=Object.keys(valueSchema(declarations).types);assert.equal(names.length,38);
 for(const file of FAMILY_FILES)for(const name of names)assert.ok(named.get(file).includes('type '+dataAliasName(name)+' = '));
 retain('source-default-prefix',{baseline:BASELINE,before,restored,sha256:Object.fromEntries(Object.entries(sources).map(([path,source])=>[path,digest(source)])),changed});
});

test('all complete old and named host declarations satisfy independent strict bidirectional signature consumers',t=>{
 const directory=temporary(t),old=hostRuntimeAssets(),named=hostRuntimeAssetsNamedDataAliases();materialize(join(directory,'old'),old);materialize(join(directory,'named'),named);
 const contracts=families(),oldCensus=declarationCensus(old),namedCensus=declarationCensus(named),contractKeys=new Set();
 for(const contract of contracts){const key=contract.family+':'+contract.jsExport;assert.equal(contractKeys.has(key),false,'duplicate current contract key '+key);contractKeys.add(key);}
 const exported=[];for(const row of oldCensus){const counterpart=namedCensus.find(item=>item.family===row.family);assert.deepEqual(counterpart.functions.map(item=>item.name),row.functions.map(item=>item.name));for(const declaration of row.functions){const other=counterpart.functions.find(item=>item.name===declaration.name);assert.equal(other.parameters.length,declaration.parameters.length);exported.push({family:row.family,...declaration});}}
 for(const contract of contracts){const matches=exported.filter(row=>row.family===contract.family&&row.name===contract.jsExport);assert.equal(matches.length,1,'actual complete declaration missing contract '+contract.id);assert.equal(matches[0].parameters.length,contract.params.length);}
 const extras=exported.filter(row=>!contractKeys.has(row.family+':'+row.name));assert.deepEqual(extras.map(row=>row.family+':'+row.name),['integer:createIntegerRuntime']);
 retain('complete-independent-declaration-export-census',{contracts,contractKeys:[...contractKeys],oldCensus,namedCensus,exported,extras});
 let source='type Assert<T extends true> = T;\ntype Assignable<A,B> = [A] extends [B] ? true : false;\n';
 for(const family of ['json','time','integer','float'])source+=`import * as Old_${family} from './old/${family}-runtime.mjs';\nimport * as Named_${family} from './named/${family}-runtime.mjs';\n`;
 for(const [index,declaration]of exported.entries()){
  const a='typeof Old_'+declaration.family+'.'+declaration.name,b='typeof Named_'+declaration.family+'.'+declaration.name;
  source+=`type Forward_${index}=Assert<Assignable<${a},${b}>>;\ntype Reverse_${index}=Assert<Assignable<${b},${a}>>;\ntype Params_${index}=Assert<Assignable<Parameters<${a}>,Parameters<${b}>>>;\ntype Return_${index}=Assert<Assignable<ReturnType<${b}>,ReturnType<${a}>>>;\n`;
 }
 write(directory,'all-signatures.mts',source);strict(directory,'all-signatures.mts',true);retain('all-signature-subjects',{contracts,old:[...old],named:[...named],source});
});

test('complete old and named declarations both reject independent argument constructor readonly and return corruptions',t=>{
 const directory=temporary(t);materialize(join(directory,'old'),hostRuntimeAssets());materialize(join(directory,'named'),hostRuntimeAssetsNamedDataAliases());const rows=[];
 for(const mode of ['old','named']){
  const source=`import * as Json from './${mode}/json-runtime.mjs';\nimport * as Time from './${mode}/time-runtime.mjs';\nJson.serde_json_from_str(4n);\nJson.serde_json_from_str();\nTime.std_time_duration_new('wrong',0n);\nfunction wrongConstructor(value:Parameters<typeof Json.serde_json_value_is_null>[0]){const wrong:typeof value={$:'NotAConstructor'};return wrong;}\nfunction readonlyMutation(value:Parameters<typeof Json.serde_json_value_is_null>[0]){value.$='Null';}\nconst wrongReturn:string=Json.serde_json_value_is_null({$:'Null'});\n`;
  write(directory,mode+'-negative.mts',source);const row=strict(directory,mode+'-negative.mts',false);for(const code of ['TS2345','TS2554','TS2322','TS2540'])assert.ok(row.stdout.includes(code),code+' missing for '+mode);rows.push(row);
 }
 retain('negative-independent-complete-consumers',rows);
});

test('the actual selected runtime closure has identical complete source paths and canonical CST in both declaration formats',t=>{
 const old=closure(hostRuntimeAssets()),named=closure(hostRuntimeAssetsNamedDataAliases());retain('complete-old-selected-closure',old);retain('complete-named-selected-closure',named);
 assert.deepEqual(named.rows,old.rows);for(const file of FAMILY_FILES)assert.equal(old.rows.some(row=>row.path==='runtime/'+file),false);
 const legacyAssets=hostRuntimeAssets(),namedAssets=hostRuntimeAssetsNamedDataAliases(),expandedOld=closure(legacyAssets,'runtime','runtime',CURRENT_ROOTS),expandedNamed=closure(namedAssets,'runtime','runtime',CURRENT_ROOTS);
 assert.deepEqual(ownedCoreRuntimeSources(),expandedNamed.rows);assert.deepEqual(expandedOld.rows.map(row=>row.path),expandedNamed.rows.map(row=>row.path));const differences=[];for(const row of expandedOld.rows)if(row.source!==expandedNamed.rows.find(other=>other.path===row.path).source)differences.push(row.path);assert.deepEqual(differences,['runtime/json-runtime.d.mts']);
 assert.equal(expandedNamed.rows.find(row=>row.path==='runtime/json-runtime.d.mts').source,namedAssets.get('json-runtime.d.mts'));for(const row of named.rows)assert.equal(expandedNamed.rows.find(other=>other.path===row.path).source,row.source);
 const separated=closure(namedAssets,'runtime','declarations',CURRENT_ROOTS);assert.deepEqual(ownedCoreRuntimeSources('runtime','declarations'),separated.rows);
 const directory=temporary(t);for(const [mode,result]of [['old',expandedOld],['named',expandedNamed]])for(const row of result.rows)write(directory,mode+'/'+row.path,row.source);
 const jsonDeclarations=declarationCensus(legacyAssets).find(row=>row.family==='json'),counterpart=declarationCensus(namedAssets).find(row=>row.family==='json');assert.deepEqual(counterpart.functions.map(row=>row.name),jsonDeclarations.functions.map(row=>row.name));
 let source="import * as Old from './old/runtime/json-runtime.mjs';\nimport * as Named from './named/runtime/json-runtime.mjs';\ntype Assert<T extends true> = T;\ntype Assignable<A,B> = [A] extends [B] ? true : false;\n";
 for(const [at,row]of jsonDeclarations.functions.entries())source+=`type Forward_${at}=Assert<Assignable<typeof Old.${row.name},typeof Named.${row.name}>>;\ntype Reverse_${at}=Assert<Assignable<typeof Named.${row.name},typeof Old.${row.name}>>;\n`;
 write(directory,'selected-json-bidirectional.mts',source);const strictResult=strict(directory,'selected-json-bidirectional.mts',true);retain('full-current-expanded689-closure-and-strict-JSON-equivalence',{oldSix:old,namedSix:named,expandedOld,expandedNamed,separated,jsonDeclarations,counterpart,source,strictResult});
 const data=input(),context=createOwnedCoreSourceContext(data);requireOwnedCoreSourceCurrent(context);assert.deepEqual(ownedCoreSourceData(context),data);assert.throws(()=>requireOwnedCoreSourceCurrent({schema:'owned-core-source-context-v1'}),/unissued source context/);
 retain('fresh-private-context-source-data',{data,detached:ownedCoreSourceData(context)});
});

test('fresh receiving contexts refuse changed selected JS declarations licenses and source edges without cache reuse',()=>{
 const data=input();const selected=['runtime/json-update-runtime.mjs','runtime/json-update-runtime.d.mts',data.files.find(row=>/LICENSE|NOTICE/iu.test(row.path)).path,'src/lib.rs'];
 for(const path of selected){const changed={...data,files:data.files.map(row=>row.path===path?{...row,source:path==='src/lib.rs'?'pub mod missing;\n':row.source+'\n// independently changed complete original\n'}:{...row})};retain('complete-corrupt-'+path.replace(/[^a-z0-9]/giu,'-'),changed);assert.throws(()=>createOwnedCoreSourceContext(changed),TypeError);}
 const context=createOwnedCoreSourceContext(data),snapshot=ownedCoreSourceData(context);data.files[0].source+='\n// caller copy changed\n';requireOwnedCoreSourceCurrent(context);assert.deepEqual(ownedCoreSourceData(context),snapshot);
 retain('fresh-source-hash-receipts',snapshot.files.map(row=>({path:row.path,source:row.source,sha256:digest(row.source)})));
});

test('new format reentrancy retains explicit raw JSON and Math observations without claiming old schedule equality',()=>{
 const json=Object.getOwnPropertyDescriptor(JSON,'stringify'),math=Object.getOwnPropertyDescriptor(Math,'min'),jsonRows=[],mathRows=[];
 const modes=[['legacy',hostRuntimeAssets],['named',hostRuntimeAssetsNamedDataAliases]],clean=Object.fromEntries(modes.map(([mode,producer])=>[mode,[...producer()]]));
 for(const [mode,producer]of modes){
  const jsonCalls=[];let error,guardBefore;
  try{Object.defineProperty(JSON,'stringify',{...json,value:function(...args){jsonCalls.push({receiver:this===JSON,arguments:args});return Reflect.apply(json.value,this,args);}});guardBefore=originalDataFreezeIntrinsicsUnchanged();try{producer();}catch(caught){error=caught;}}
  finally{Object.defineProperty(JSON,'stringify',json);}
  const row=retain('explicit-json-guard-refusal-'+mode,{mode,guardBefore,jsonCalls,error:error?{name:error.name,message:error.message,stack:error.stack}:null});jsonRows.push(row);
  assert.equal(guardBefore,false);assert.ok(error instanceof TypeError);assert.equal(error.message,'Owned JSON original checker native operations changed');
 }
 for(const [mode,producer]of modes){
  const mathCalls=[];let error,nestedError,assets,nested,reentered=false,guardBefore;
  try{
   Object.defineProperty(Math,'min',{...math,value:function(...args){mathCalls.push({arguments:args,frame:new Error('actual Math.min observation')});if(!reentered){reentered=true;try{nested=hostRuntimeAssetsNamedDataAliases();}catch(caught){nestedError=caught;}}return Reflect.apply(math.value,this,args);}});
   guardBefore=originalDataFreezeIntrinsicsUnchanged();try{assets=producer();}catch(caught){error=caught;}
  }finally{Object.defineProperty(Math,'min',math);}
  const row=retain('explicit-math-only-reentry-'+mode,{mode,guardBefore,reentered,mathCalls:mathCalls.map(item=>({arguments:item.arguments,stack:item.frame.stack})),assets:assets?[...assets]:null,nested:nested?[...nested]:null,error:error?{name:error.name,message:error.message,stack:error.stack}:null,nestedError:nestedError?{name:nestedError.name,message:nestedError.message,stack:nestedError.stack}:null});mathRows.push(row);
  if(guardBefore){assert.equal(error,undefined);assert.deepEqual(row.assets,clean[mode]);if(mode==='legacy'){assert.ok(mathCalls.length>0);assert.equal(reentered,true);}if(reentered){assert.equal(nestedError,undefined);assert.deepEqual(row.nested,clean.named);}}
  else{assert.ok(error instanceof TypeError);assert.equal(error.message,'Owned JSON original checker native operations changed');}
  if(assets){const actual=closure(assets),expected=closure(new Map(clean[mode]));assert.deepEqual(actual.rows,expected.rows);retain('complete-math-only-selected-source-'+mode,{actual,expected});}
 }
 retain('complete-explicit-mode-observer-tapes',{jsonRows,mathRows});assert.deepEqual([...hostRuntimeAssetsNamedDataAliases()],clean.named);
});

test('fixed complete source rules retain language repository CST inverses and reject stale or hostile source data',()=>{
 const after=current(),before=restoreNamedHostDeclarationSources(after),proposal=proposeNamedHostDeclarationSources(before);retain('complete-two-source-proposal',proposal);
 assert.deepEqual(proposal.rows.map(row=>row.file),[HOST,OWNED]);for(const row of proposal.rows){assert.equal(row.before.source,before[row.file]);assert.equal(row.after.source,after[row.file]);assert.deepEqual(row.trace.map(item=>item.phase),['language','repository']);assert.equal(row.completeInverse,true);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.before.meta).source,stage.before.source);assert.equal(transportConcreteSyntaxMeta(stage.after.meta).source,stage.after.source);}}
 assert.deepEqual({...restoreNamedHostDeclarationSources(after)},{...before});assert.deepEqual(proposal.authority,{source:false,owner:false,type:false,executable:false});assert.equal(proposal.semanticChecksPassed,false);assert.equal(proposal.installApproved,false);
 const stale={...before,[HOST]:before[HOST].replace('return files;','return null;')};assert.throws(()=>proposeNamedHostDeclarationSources({...before,[OWNED]:before[OWNED].replace("import {hostRuntimeAssets}","import {other}")}));assert.throws(()=>proposeNamedHostDeclarationSources({...before,[HOST]:before[HOST]+'\nexport function hostRuntimeAssets(){}\n'}));assert.throws(()=>proposeNamedHostDeclarationSources({...before,[HOST]:'export function hostRuntimeAssets( {'}));
 // A changed body is proposal DATA, not automatically an admissible current source.
 const changed=proposeNamedHostDeclarationSources(stale);assert.equal(changed.installApproved,false);assert.notEqual(changed.rows[0].before.sha256,proposal.rows[0].before.sha256);retain('changed-unqualified-source-proposal',changed);
 let reads=0;const getter={...before};Object.defineProperty(getter,HOST,{enumerable:true,get(){reads++;return before[HOST];}});assert.throws(()=>proposeNamedHostDeclarationSources(getter),/own source data/);assert.equal(reads,0);assert.throws(()=>proposeNamedHostDeclarationSources(new Proxy(before,{})),/own source/);assert.throws(()=>proposeNamedHostDeclarationSources({...before,extra:''}),/exact two/);assert.throws(()=>restoreNamedHostDeclarationSources({...after,[HOST]:after[HOST].replace('namedAliases=new Set','namedAliases=new Map')}));
 const descriptors=Object.getOwnPropertyDescriptor(Object,'getOwnPropertyDescriptors'),mutable={...before};let mutations=0;
 try{Object.defineProperty(Object,'getOwnPropertyDescriptors',{...descriptors,value:function(value){const fields=Reflect.apply(descriptors.value,this,[value]);if(value===mutable){mutations++;mutable[HOST]+='\n// mutation after complete source snapshot\n';Object.defineProperty(Object,'getOwnPropertyDescriptors',descriptors);}return fields;}});assert.throws(()=>proposeNamedHostDeclarationSources(mutable),/source fields changed/);}finally{Object.defineProperty(Object,'getOwnPropertyDescriptors',descriptors);}
 assert.equal(mutations,1);retain('complete-source-between-capture-and-final-check',{before,mutated:mutable,mutations});
 const lazy=new Error('rejected native lazy stack source input');Object.setPrototypeOf(lazy,Object.prototype);lazy[HOST]=before[HOST];lazy[OWNED]=before[OWNED];
 const prepare=Object.getOwnPropertyDescriptor(Error,'prepareStackTrace');let prepared=0,rejected;
 try{Object.defineProperty(Error,'prepareStackTrace',{value:function(){prepared++;return 'unexpected native lazy stack materialization';},configurable:true,writable:true});try{proposeNamedHostDeclarationSources(lazy);}catch(error){rejected=error;}}
 finally{if(prepare)Object.defineProperty(Error,'prepareStackTrace',prepare);else delete Error.prepareStackTrace;}
 const lazyObservation=retain('rejected-native-lazy-stack',{prepared,inputKeys:Reflect.ownKeys(lazy),inputDescriptors:Object.getOwnPropertyDescriptors(lazy),rejection:rejected?{name:rejected.name,message:rejected.message,stack:rejected.stack}:null});
 assert.equal(lazyObservation.prepared,0);assert.ok(rejected instanceof TypeError);assert.match(rejected.message,/exact two source paths/);
});

test('genuine owned source issuance and strict emitted targets keep all fresh source and semantic fences',t=>{
 const data=input(),context=createOwnedCoreSourceContext(data),result=translateOwnedCoreJavaScript(CALLER,{sourcePath:'caller.mjs',context});retain('genuine-complete-reverse-result',{data,result});assert.equal(result.program.length,1);assert.match(result.rust,/crate::translation_core::json_copy/u);assert.ok(parseOwnedCoreMeta(result.meta,{context}).length===1);
 const directory=temporary(t);for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(directory,row.path,row.source);write(directory,'reverse.mts',result.typescript);strict(directory,'reverse.mts',true);requireOwnedCoreSourceCurrent(context);
 const originalMeta=result.meta;assert.throws(()=>parseOwnedCoreMeta(originalMeta.replace('copied','forged'),{context}),TypeError);assert.equal(result.meta,originalMeta);
 const {declarations}=checked(),entry=declarations.get('serde_json.Value'),names=new Set(Object.keys(valueSchema(declarations).types));assert.ok(entry);const descriptor=Object.getOwnPropertyDescriptor(entry,'ctors');try{Object.defineProperty(entry,'ctors',{...descriptor,value:null});assert.throws(()=>typeScriptType({kind:'data',name:'serde_json.Value'},declarations,{aliases:names}),/no constructors/);}finally{Object.defineProperty(entry,'ctors',descriptor);}
 assert.ok(typeScriptAliases(declarations).includes(dataAliasName('serde_json.Value')));requireOwnedCoreSourceCurrent(context);retain('final-source-currentness',{files:ownedCoreSourceData(context).files,meta:originalMeta});
});
