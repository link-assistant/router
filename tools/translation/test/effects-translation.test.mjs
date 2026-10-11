import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';

async function compiled(source,operation,{project=false}={}) {
  const directory=mkdtempSync(join(tmpdir(),'router-checked-effects-'));
  try {
    mkdirSync(join(directory,'runtime'));
    const assets=effectRuntimeAssets();
    writeFileSync(join(directory,'runtime/effects.mjs'),assets.javascript);
    writeFileSync(join(directory,'runtime/effects.d.mts'),assets.declarations);
    writeFileSync(join(directory,'package.json'),JSON.stringify({type:'module'}));
    const result=project?translateProject({entry:'input.rs',paths:Object.keys(source),readSource:path=>source[path]}):translateSource(source,'input.rs');
    if(!project)assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.map(item=>item.diagnostic)));
    writeFileSync(join(directory,'input.mjs'),result.javascript);writeFileSync(join(directory,'input.ts'),result.typescript);
    execFileSync(process.env.ROUTER_TSC ?? '/Users/konard/.bun/bin/tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',join(directory,'input.ts')],{encoding:'utf8'});
    const module=await import(pathToFileURL(join(directory,'input.mjs')).href);
    const runtime=await import(pathToFileURL(join(directory,'runtime/effects.mjs')).href);
    await operation(module.translated,runtime,result);
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('checked Result propagation aborts later effects and preserves exact OS error payload',async()=>{
  await compiled('fn copy(path: &str, dest: &str) -> std::io::Result<()> { let text = std::fs::read_to_string(path)?; std::fs::write(dest, text)?; Ok(()) }',async(api,runtime)=>{
    const operations=[];
    const fs={sync:{readFileSync(path){operations.push(['read',path]);return Buffer.from('\ufeffsnow 雪');},writeFileSync(path,text){operations.push(['write',path,Buffer.from(text).toString('utf8')]);}}};
    assert.deepEqual(runtime.withEffectCapabilities({fs},()=>api.copy('in','out')),{$:'Ok',field0:null});
    assert.deepEqual(operations,[['read','in'],['write','out','\ufeffsnow 雪']]);
    operations.length=0;
    fs.sync.readFileSync=path=>{operations.push(['read',path]);throw Object.assign(new Error('fixture missing'),{code:'ENOENT'});};
    const failure=runtime.withEffectCapabilities({fs},()=>api.copy('missing','untouched'));
    assert.equal(failure.$,'Err');assert.equal(failure.field0.kind,'NotFound');assert.equal(failure.field0.message,'fixture missing');assert.equal(Object.isFrozen(failure.field0),true);
    assert.deepEqual(operations,[['read','missing']]);
  });
});

test('Rust async function and host futures begin only when polled and execute in await order',async()=>{
  await compiled('async fn copy(path: &str, dest: &str) -> std::io::Result<()> { let text = tokio::fs::read_to_string(path).await?; tokio::fs::write(dest, text).await?; Ok(()) }',async(api,runtime)=>{
    const operations=[];
    const fs={async:{async readFile(path){operations.push(['read',path]);return Buffer.from('lazy');},async writeFile(path,text){operations.push(['write',path,Buffer.from(text).toString('utf8')]);}}};
    const value=api.copy('in','out');assert.deepEqual(operations,[]);
    const result=await runtime.withEffectCapabilities({fs},()=>Promise.resolve(value));
    assert.deepEqual(result,{$:'Ok',field0:null});assert.deepEqual(operations,[['read','in'],['write','out','lazy']]);
  });
});

test('async cross-module calls and scoped effect aliases lower checked dependency bodies',async()=>{
  const sources={'input.rs':'mod child; async fn read(path: &str) -> std::io::Result<String> { Ok(child::read(path).await?) }','child.rs':'use tokio::fs::read_to_string as load; pub async fn read(path: &str) -> std::io::Result<String> { load(path).await }'};
  await compiled(sources,async(api,runtime,result)=>{
    assert.equal(result.meta.refused.length,0);assert.equal(result.meta.runtimeParity,false);
    const output=await runtime.withEffectCapabilities({fs:{async:{readFile:async()=>Buffer.from('graph')}}},()=>Promise.resolve(api.read('fixture')));
    assert.deepEqual(output,{$:'Ok',field0:'graph'});
  },{project:true});
});

test('Option propagation returns None from nested value expressions without later evaluation',async()=>{
  await compiled('fn optional(value: Option<i32>) -> Option<i32> { let result = { let current = value?; current + 1 }; Some(result) }',async(api)=>{
    assert.deepEqual(api.optional({$:'None'}),{$:'None'});
    assert.deepEqual(api.optional({$:'Some',field0:7n}),{$:'Some',field0:8n});
    assert.throws(()=>api.optional({$:'Some',field0:2147483647n}),/overflow/);
  });
});

test('effect adapter faults remain exceptions and are never caught as Rust Result errors',async()=>{
  await compiled('fn read(path: &str) -> std::io::Result<String> { Ok(std::fs::read_to_string(path)?) }',async(api,runtime)=>{
    assert.throws(()=>runtime.withEffectCapabilities({fs:{sync:{readFileSync:()=>42}}},()=>api.read('fixture')),TypeError);
    assert.throws(()=>api.read('\ud800'),/Rust value domain/);
  });
});

test('unsupported conversion, unsafe effects, shadowed namespaces and transitive constant effects stay carried',()=>{
  const sources=[
    'fn wrong(path: &str) -> Result<String, String> { Ok(std::fs::read_to_string(path)?) }',
    'fn wrong(path: &str) -> std::io::Result<String> { tokio::fs::read_to_string(path).await }',
    'fn unsafe_call() { unsafe { std::env::set_var("A", "B"); } }',
    'mod std { } fn wrong(path: &str) -> std::io::Result<String> { std::fs::read_to_string(path) }',
    'fn read() -> Result<String, std::env::VarError> { std::env::var("A") } const BAD: Result<String, std::env::VarError> = read();',
  ];
  for(const source of sources){const result=translateSource(source);assert.ok(result.ir.items.filter(item=>item.term === 'fn' && item.name !== 'read' || item.term === 'const').every(item=>item.status === 'carried'),source);}
});

test('ambiguous imported effects and conditional namespace shadows never select a host implementation',()=>{
  for(const source of [
    'use std::fs::read_to_string as load; use std::env::var as load; fn read(path: &str) -> std::io::Result<String> { load(path) }',
    '#[cfg(feature = "custom")] mod std; fn read(path: &str) -> std::io::Result<String> { std::fs::read_to_string(path) }',
  ]) {
    const result=translateProject({entry:'input.rs',paths:['input.rs'],readSource:()=>source});
    assert.equal(result.meta.executable.filter(entry=>entry.term === 'fn').length,0);
    assert.ok(result.meta.refused.length > 0);
  }
});
