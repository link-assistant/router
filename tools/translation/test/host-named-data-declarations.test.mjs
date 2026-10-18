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
const root=fileURLToPath(new URL('../../../',import.meta.url));
const BASELINE='077889e3fb2ad2d4f3a96c756bf6087ef17678b1';
const HOST=NAMED_HOST_DECLARATION_SOURCE_PATHS[0],OWNED=NAMED_HOST_DECLARATION_SOURCE_PATHS[1];
const FAMILY_FILES=['json-runtime.d.mts','time-runtime.d.mts','integer-runtime.d.mts','float-runtime.d.mts'];
const ROOTS=['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts'];
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
function closure(assets,runtimeRoot='runtime',declarationRoot=runtimeRoot){
 assertReverseConcreteSourceHost();const ts=ownershipCompiler(),seen=new Set(),rows=[],stages=[];
 function visit(name){
  if(seen.has(name))return;assert.ok(seen.size<128&&!name.includes('/')&&(/\.(mjs|mts)$/u.test(name)));seen.add(name);
  const source=assets.get(name);assert.equal(typeof source,'string');const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name;
  const concrete=transportConcreteSyntaxSource(source,{language:name.endsWith('.mts')?'TypeScript':'JavaScript'}),meta=serializeConcreteSyntaxMeta(concrete.document),reparsed=transportConcreteSyntaxMeta(meta);assert.equal(reparsed.source,source);
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,name.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);rows.push({path,source});stages.push({path,source,meta});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;assert.ok(specifier.startsWith('./'));const target=posix.normalize(posix.join(posix.dirname(path),specifier));assert.equal(posix.dirname(target),base);visit(posix.basename(target));}
 }
 for(const name of ROOTS)visit(name);for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return {rows:rows.sort((a,b)=>a.path.localeCompare(b.path)),stages};
}
const CALLER='import {router_core_json_copy as copy} from "./runtime/json-update-runtime.mjs";\n/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return copy(value);}\n';
function input(source=CALLER){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:readFileSync(join(root,'Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},{path:'caller.mjs',source}]};}
function outcome(action){try{return {mode:'return',value:action()};}catch(error){return {mode:'throw',name:error.name,message:error.message};}}

test('legacy assets stay exact while the explicit format changes only unused family declaration spelling',()=>{
 const sources=current(),restored=restoreNamedHostDeclarationSources(sources),before=Object.fromEntries(NAMED_HOST_DECLARATION_SOURCE_PATHS.map(path=>[path,original(path)]));assert.deepEqual({...restored},before);
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

test('the actual selected runtime closure has identical complete source paths and canonical CST in both declaration formats',()=>{
 const old=closure(hostRuntimeAssets()),named=closure(hostRuntimeAssetsNamedDataAliases());retain('complete-old-selected-closure',old);retain('complete-named-selected-closure',named);
 assert.deepEqual(named.rows,old.rows);assert.deepEqual(ownedCoreRuntimeSources(),old.rows);for(const file of FAMILY_FILES)assert.equal(old.rows.some(row=>row.path==='runtime/'+file),false);
 const separated=closure(hostRuntimeAssets(),'runtime','declarations');assert.deepEqual(ownedCoreRuntimeSources('runtime','declarations'),separated.rows);
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
