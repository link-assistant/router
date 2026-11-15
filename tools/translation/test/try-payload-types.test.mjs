import {repositorySourceURL,repositorySourcePath,repositoryCratePaths} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
// Explicit root declaration projection: retain the complete physical parent
// and facade descendants. This is not whole-crate execution qualification.
function currentCapabilitiesProject(){
  const read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),originalRoot=read('src/lib.rs');
  const declarations=sourceItems(originalRoot).filter(item=>item.term==='mod'&&['translation_core','capabilities'].includes(item.name));
  assert.equal(declarations.length,2);
  const projection=declarations.map(item=>originalRoot.slice(item.start,item.end)).join('\n');assert.notEqual(hash(projection),hash(originalRoot));
  const paths=repositoryCratePaths(execFileSync('git',['ls-tree','-r','--name-only','HEAD','--',repositorySourcePath('src',root)],{cwd:root,encoding:'utf8',maxBuffer:1024*1024}).trim().split('\n'),root);
  const manifest=read('Cargo.toml'),lock=read('Cargo.lock');
  const result=translateProject({entry:'src/lib.rs',paths,readSource:path=>path==='src/lib.rs'?projection:read(path),cargoManifest:manifest,deriveDependencies:loadDeriveDependencyProof({manifest,lock}),compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.sources.find(row=>row.source==='src/lib.rs').sha256,hash(projection));
  for(const row of result.meta.sources.filter(row=>row.source!=='src/lib.rs'))assert.equal(row.sha256,hash(read(row.source)),row.source+' complete physical source');
  for(const path of ['src/capabilities.rs','src/translation_core.rs','src/translation_core/primitives.rs'])assert.ok(result.meta.sources.some(row=>row.source===path));
  return result;
}
function json(value){
  if(value===null)return tag('Null');
  if(typeof value==='string')return tag('String',{field0:value});
  if(typeof value==='boolean')return tag('Bool',{field0:value});
  if(Array.isArray(value))return tag('Array',{field0:Object.freeze(value.map(json))});
  const entries=Object.keys(value).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(key=>tag('MapEntry',{key,value:json(value[key])}));
  return tag('Object',{field0:tag('Map',{entries:Object.freeze(entries)})});
}

test('genuine Option and Result try preserve success payload and residual types',{timeout:30_000},async()=>{
  const source='pub fn optional(value:Option<u8>)->Option<bool>{let n=value?;Some(n>2)} pub fn result(value:Result<u8,u16>)->Result<bool,u16>{let n=value?;Ok(n>2)}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  assert.match(result.typescript,/function ml_router_try<T>\(value: Readonly/);
  assert.match(result.typescript,/function ml_router_try<R extends Readonly/);
  const typeChecks=`\nfunction fixtureTryTypeChecks(option:Readonly<{$:'Some';field0:bigint}>|Readonly<{$:'None'}>, result:Readonly<{$:'Ok';field0:string}>|Readonly<{$:'Err';field0:boolean}>) {
    const number:bigint=ml_router_try(option,true);
    const text:string=ml_router_try(result,false);
    // @ts-expect-error Success payload is bigint, never any or unknown.
    const wrong:string=ml_router_try(option,true);
    // @ts-expect-error A standard Option cannot select Result propagation.
    ml_router_try(option,false);
    // @ts-expect-error A standard Result cannot select Option propagation.
    ml_router_try(result,true);
    // @ts-expect-error Genuine Err residual cannot be retyped as a success payload.
    const wrongResult:boolean=ml_router_try(result,false);
    return [number,text];
  }\n`;
  await verifyCohortTargets({...result,typescript:result.typescript+typeChecks},api=>{
    for(const [input,expected]of [[none,none],[some(2n),some(false)],[some(3n),some(true)]])assert.deepEqual(api.optional(input),expected);
    assert.deepEqual(api.result(tag('Ok',{field0:3n})),tag('Ok',{field0:true}));
    assert.deepEqual(api.result(tag('Ok',{field0:2n})),tag('Ok',{field0:false}));
    assert.deepEqual(api.result(tag('Err',{field0:65535n})),tag('Err',{field0:65535n}));
    assert.throws(()=>api.optional(tag('Ok',{field0:3n})),TypeError);
    assert.throws(()=>api.result(tag('Err',{field0:65536n})),TypeError);
  });
});

test('whole original capabilities propagates typed JSON arrays into ordinary any closures in both outputs',{timeout:60_000},async()=>{
  const path='src/capabilities.rs',source=readFileSync(new URL('./fixtures/capabilities-try-original.rs.txt',import.meta.url),'utf8');
  assert.equal(hash(source),'7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222');
  const item=sourceItems(source).find(item=>item.name==='unsatisfiable_forced_tool_choice');assert.deepEqual([item.start,item.end],[6112,6808]);
  assert.equal(hash(source.slice(item.start,item.end)),'be78dd12b76f8f6baac481f5072b0700ad3962ae52641c0dfbbb192df7313f97');
  const deriveDependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
  const project=translateProject({entry:path,paths:[path],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,deriveDependencies});
  assert.deepEqual(project.meta.executable.find(entry=>entry.name===item.name)?.span,{start:item.start,end:item.end});
  const draft=translateSource(source,path,{projectDeclarations:project.executableDeclarations,projectSourceScopes:project.sourceScopes});
  const translated=draft.ir.items.find(entry=>entry.name===item.name);assert.equal(translated.status,'executable');assert.equal(translated.sha256,hash(source.slice(item.start,item.end)));
  const why='tool_choice requires a tool call, but the request offers only server-side tools that the provider executes itself; use tool_choice auto or add a client tool';
  for(const result of [project,draft])await verifyCohortTargets(result,api=>{
    for(const [input,forced,expected]of [
      [none,true,none],[some(json(null)),true,none],[some(json([])),true,none],
      [some(json([{type:'web_search'}])),false,none],
      [some(json([{type:'web_search'}])),true,some(why)],
      [some(json([{type:'web_search_preview'},{type:'web_fetch'}])),true,some(why)],
      [some(json([{type:'function'}])),true,none],[some(json([{}])),true,none],
      [some(json([{type:false}])),true,none],
      [some(json([{type:'web_search'},{type:'custom'}])),true,none],
    ])assert.deepEqual(api.unsatisfiable_forced_tool_choice(input,forced),expected);
    let reads=0;const proxy=new Proxy(json([{type:'web_search'}]),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});
    assert.throws(()=>api.unsatisfiable_forced_tool_choice(some(proxy),true),TypeError);assert.equal(reads,0);
  });
  assert.equal(project.meta.runtimeParity,false);assert.equal(draft.ir.runtimeParity,false);
});

test('labeled root projection retains whole current capabilities and typed JSON any closures in both outputs',{timeout:60_000},async()=>{
  const path='src/capabilities.rs',source=readFileSync(repositorySourceURL(path,root),'utf8');
  assert.equal(hash(source),'f51ba943b456a099a7cae5ae2073cd8d5d912bf23c117fc76ec1016cd50ebbd4');
  const item=sourceItems(source).find(item=>item.name==='unsatisfiable_forced_tool_choice');assert.deepEqual([item.start,item.end],[6306,7098]);
  assert.equal(hash(source.slice(item.start,item.end)),'433656a1dd4e0a2390776e9f5d1dd2a6978a48878b382e59f8080eefce0eb22c');
  const project=currentCapabilitiesProject();
  assert.deepEqual(project.meta.executable.find(entry=>entry.source===path&&entry.name==='capabilities.'+item.name)?.span,{start:item.start,end:item.end});
  const draft=translateSource(source,path,{projectDeclarations:project.executableDeclarations,projectSourceScopes:project.sourceScopes});
  const translated=draft.ir.items.find(entry=>entry.name===item.name);assert.equal(translated.status,'executable');assert.equal(translated.sha256,hash(source.slice(item.start,item.end)));
  const why='tool_choice requires a tool call, but the request offers only server-side tools that the provider executes itself; use tool_choice auto or add a client tool';
  for(const result of [project,draft])await verifyCohortTargets(result,api=>{
    const operation=api[result===project?'capabilities.'+item.name:item.name];assert.equal(typeof operation,'function');
    for(const [input,forced,expected]of [
      [none,true,none],[some(json(null)),true,none],[some(json([])),true,none],
      [some(json([{type:'web_search'}])),false,none],
      [some(json([{type:'web_search'}])),true,some(why)],
      [some(json([{type:'web_search_preview'},{type:'web_fetch'}])),true,some(why)],
      [some(json([{type:'function'}])),true,none],[some(json([{}])),true,none],
      [some(json([{type:false}])),true,none],
      [some(json([{type:'web_search'},{type:'custom'}])),true,none],
    ])assert.deepEqual(operation(input,forced),expected);
    let reads=0;const proxy=new Proxy(json([{type:'web_search'}]),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});
    assert.throws(()=>operation(some(proxy),true),TypeError);assert.equal(reads,0);
  });
  assert.equal(project.meta.runtimeParity,false);assert.equal(draft.ir.runtimeParity,false);
});
