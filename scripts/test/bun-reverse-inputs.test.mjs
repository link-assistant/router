import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runBunReverseFiles} from '../run-bun-reverse-files.mjs';
import {prepareBunReverseFiles} from '../prepare-bun-reverse-files.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

test('copied reverse coordinator and all original controls retain complete source CST equations',()=>{
 for(const output of prepareBunReverseFiles()){
  assert.equal(transportConcreteSyntaxMeta(output.beforeWire).source,readFileSync(new URL('../../'+output.beforePath,import.meta.url),'utf8'));
  assert.equal(transportConcreteSyntaxMeta(output.afterWire).source,output.source);
  assert.equal(readFileSync(new URL('../../'+output.path,import.meta.url),'utf8'),output.source);
  assert.equal(output.wholeInverse,true);
  assert.deepEqual(output.trace.map(row=>row.phase),['language','repository']);
 }
});

test('real Git input vectors retain JS, TS, Rust and forward owned definitions; mutations fail after every whole file runs',async()=>{
 const root=mkdtempSync(join(tmpdir(),'router-bun-reverse-inputs-'));
 const original={
  'rust/src/lib.rs':'pub fn value()->u8{1}\n',
  'Cargo.toml':'[workspace]\nmembers=["rust"]\n',
  'rust/Cargo.toml':'[package]\nname="fixture"\nversion="0.1.0"\n',
  'Cargo.lock':'version = 4\n',
  'js/src/value.mjs':'export const value=1;\n',
  'ts/src/value.ts':'export const value:number=1;\n',
  'parity/js-first-translation.json':'{"fixture":true}\n',
  'tools/translation/generated/owned-definitions/index.json':'{"completeOriginal":true}\n',
  'js/generated/owned-definitions/value.mjs':'export const owned=1;\n',
  'ts/generated/owned-definitions/value.ts':'export const owned:number=1;\n',
 };
 const put=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
 const a='tools/translation/js-to-rust/test/a.test.mjs',b='tools/translation/js-to-rust/test/b.test.mjs';
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:root,encoding:'utf8'});
 try{
  for(const [path,source]of Object.entries(original))put(path,source);
  put(a,'{}');put(b,'{}');
  put('scripts/fake-bun.mjs',`#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);if(args.length!==2||args[0]!=='test')throw Error('Changed complete file command');
const control=JSON.parse(readFileSync(args[1],'utf8'));if(control.mutate)writeFileSync(control.mutate,'changed');console.log('complete original file ran');
`);
  chmodSync(join(root,'scripts/fake-bun.mjs'),0o755);
  git('init','-q');git('config','user.name','Reverse Inputs');git('config','user.email','reverse@example.invalid');git('add','.');git('commit','-qm','original reverse fixture');
  let iteration=0;
  for(const path of ['js/src/value.mjs','ts/src/value.ts','tools/translation/generated/owned-definitions/index.json']){
   for(const [input,source]of Object.entries(original))put(input,source);
   put(a,JSON.stringify({mutate:join(root,path)}));
   const output=join(root,'node_modules','evidence-'+iteration++);
   const result=await runBunReverseFiles({root,bun:join(root,'scripts/fake-bun.mjs'),outputDirectory:output});
   assert.equal(result.exitCode,1);assert.equal(result.inputsUnchanged,false);assert.equal(result.allDiscoveredFilesExecuted,true);
   assert.deepEqual(result.records.map(row=>row.status),['passed','passed']);
   const before=JSON.parse(readFileSync(join(output,'inputs-before.json'),'utf8'));
   const after=JSON.parse(readFileSync(join(output,'inputs-after.json'),'utf8'));
   for(const [input,source]of Object.entries(original)){
    const observed=before.files.find(row=>row.path===input);assert.ok(observed,input);
    assert.equal(observed.bytes,Buffer.byteLength(source));assert.equal(observed.sha256,createHash('sha256').update(source).digest('hex'));
   }
   assert.deepEqual(after.files.filter(row=>JSON.stringify(row)!==JSON.stringify(before.files.find(previous=>previous.path===row.path))).map(row=>row.path),[path]);
   assert.equal(result.originalPerCaseDeadlinesUnchanged,true);assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
