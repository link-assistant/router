import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,posix} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
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
 const contracts=families();assert.equal(contracts.length,98);assert.equal(contracts.reduce((total,contract)=>total+contract.params.length,0),126);
 let source='type Assert<T extends true> = T;\ntype Assignable<A,B> = [A] extends [B] ? true : false;\n';
 for(const family of ['json','time','integer','float'])source+=`import * as Old_${family} from './old/${family}-runtime.mjs';\nimport * as Named_${family} from './named/${family}-runtime.mjs';\n`;
 for(const [index,contract]of contracts.entries()){
  const a='typeof Old_'+contract.family+'.'+contract.jsExport,b='typeof Named_'+contract.family+'.'+contract.jsExport;
  source+=`type Forward_${index}=Assert<Assignable<${a},${b}>>;\ntype Reverse_${index}=Assert<Assignable<${b},${a}>>;\ntype Params_${index}=Assert<Assignable<Parameters<${a}>,Parameters<${b}>>>;\ntype Return_${index}=Assert<Assignable<ReturnType<${b}>,ReturnType<${a}>>>;\n`;
 }
 source+="import type {createIntegerRuntime as OldInteger} from './old/integer-runtime.mjs';\nimport type {createIntegerRuntime as NamedInteger} from './named/integer-runtime.mjs';\ntype IntegerFactory=Assert<Assignable<typeof OldInteger,typeof NamedInteger>>;\n";
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
 const json=Object.getOwnPropertyDescriptor(JSON,'stringify'),math=Object.getOwnPropertyDescriptor(Math,'min'),rows=[];
 for(const [mode,producer]of [['legacy',hostRuntimeAssets],['named',hostRuntimeAssetsNamedDataAliases]]){
  const jsonCalls=[],mathCalls=[];let reentered=false,nested;
  try{
   Object.defineProperty(JSON,'stringify',{...json,value:function(...args){jsonCalls.push({receiver:this===JSON,arguments:args});if(!reentered){reentered=true;nested=hostRuntimeAssetsNamedDataAliases();}return Reflect.apply(json.value,this,args);}});
   Object.defineProperty(Math,'min',{...math,value:function(...args){mathCalls.push(args);return Reflect.apply(math.value,this,args);}});
   const assets=producer();rows.push({mode,jsonCalls,mathCalls,assets:[...assets],nested:[...nested]});
  }finally{Object.defineProperty(JSON,'stringify',json);Object.defineProperty(Math,'min',math);}
 }
 retain('complete-explicit-mode-observer-tapes',rows);assert.ok(rows[0].mathCalls.length>rows[1].mathCalls.length);assert.ok(rows[0].jsonCalls.length>rows[1].jsonCalls.length);for(const row of rows){assert.equal(row.nested.find(([path])=>path==='base64-runtime.mjs')[1],row.assets.find(([path])=>path==='base64-runtime.mjs')[1]);assert.ok(row.jsonCalls.length>0);}
 assert.deepEqual([...hostRuntimeAssetsNamedDataAliases()],[...hostRuntimeAssetsNamedDataAliases()]);
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
