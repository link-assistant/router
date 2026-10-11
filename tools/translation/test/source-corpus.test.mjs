import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {captureSourceCorpus,sourceCorpusPaths,sourceCorpusText,assertSourceCorpusSelection,trackedSource,SOURCE_CORPUS_LIMITS} from '../source-corpus.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(run){const root=mkdtempSync(join(tmpdir(),'router-source-corpus-'));try{mkdirSync(join(root,'src'));return run(root);}finally{rmSync(root,{recursive:true,force:true});}}

test('private source corpus retains exact complete Rust and Cargo bytes across later edits',()=>fixture(root=>{
  const source='pub fn value()->u8{7}',cargo='[package]\nname="fixture"\nversion="0.1.0"\n';
  writeFileSync(join(root,'src/lib.rs'),source);writeFileSync(join(root,'Cargo.toml'),cargo);
  const corpus=captureSourceCorpus({root,paths:['src/lib.rs']});
  writeFileSync(join(root,'src/lib.rs'),'pub fn value()->u8{9}');writeFileSync(join(root,'Cargo.toml'),cargo+'edition="2021"\n');
  assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),source);assert.equal(sourceCorpusText(corpus,root,'Cargo.toml'),cargo);assert.equal(sourceCorpusText(corpus,root,'Cargo.lock'),null);
  assert.deepEqual(sourceCorpusPaths(corpus,root),['src/lib.rs']);assert.equal(corpus.sources[0].sha256,hash(source));assert.equal(corpus.sources[0].bytes,Buffer.byteLength(source));
  assert.ok(Object.isFrozen(corpus)&&Object.isFrozen(corpus.sources)&&Object.isFrozen(corpus.sources[0]));
  assert.equal(corpus.namespaceAuthority,false);assert.equal(corpus.runtimeAuthority,false);
  assert.notEqual(captureSourceCorpus({root,paths:['src/lib.rs']}).sourceSetSha256,corpus.sourceSetSha256);
  assert.throws(()=>sourceCorpusText(structuredClone(corpus),root,'src/lib.rs'),/unsealed/);
  assert.throws(()=>sourceCorpusPaths(corpus,join(root,'other')),/another repository/);
  assert.throws(()=>sourceCorpusText(corpus,root,'src/missing.rs'),/absent/);
  assert.deepEqual(assertSourceCorpusSelection(corpus,root,['src/lib.rs']),['src/lib.rs']);
  assert.throws(()=>assertSourceCorpusSelection(corpus,root,['src/changed.rs']),/differs/);
}));

test('source capture rejects path proxies, getters, holes, incidental properties and unsafe names without callbacks',()=>fixture(root=>{
  writeFileSync(join(root,'src/lib.rs'),'pub const VALUE:u8=7;');let calls=0;
  const getter=[];Object.defineProperty(getter,'0',{enumerable:true,get(){calls++;return 'src/lib.rs';}});
  const proxy=new Proxy(['src/lib.rs'],{get(){calls++;throw new Error('trap');},getPrototypeOf(){calls++;throw new Error('trap');}});
  const incidental=['src/lib.rs'];incidental.extra=true;
  for(const paths of [getter,proxy,Array(1),incidental,[],['src/lib.rs','src/lib.rs'],['../lib.rs'],['/src/lib.rs'],['src\\lib.rs'],['src/lib.rs\0'],['src/lib.txt']])assert.throws(()=>captureSourceCorpus({root,paths}),TypeError);
  assert.equal(calls,0);
  const corpus=captureSourceCorpus({root,paths:['src/lib.rs']});
  for(const paths of [getter,proxy,Array(1),incidental,[],['src/lib.rs','src/lib.rs']])assert.throws(()=>assertSourceCorpusSelection(corpus,root,paths),TypeError);
  assert.equal(calls,0);
}));

test('source capture refuses oversized or invalid UTF-8 originals before translation',()=>fixture(root=>{
  writeFileSync(join(root,'src/lib.rs'),Buffer.from([0xc3,0x28]));
  assert.throws(()=>captureSourceCorpus({root,paths:['src/lib.rs']}),/exact UTF-8/);
  writeFileSync(join(root,'src/lib.rs'),'a'.repeat(SOURCE_CORPUS_LIMITS.sourceBytes+1));
  assert.throws(()=>captureSourceCorpus({root,paths:['src/lib.rs']}),/byte budget/);
}));

test('sparse tracked Rust and Cargo files retain HEAD bytes while ordinary deletions fail',()=>fixture(root=>{
  const source='pub const VALUE:u8=7;',cargo='[package]\nname="fixture"\nversion="0.1.0"\n';
  writeFileSync(join(root,'src/lib.rs'),source);writeFileSync(join(root,'Cargo.toml'),cargo);
  const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
  git('init','--quiet');git('add','src/lib.rs','Cargo.toml');
  git('-c','user.name=Translation fixture','-c','user.email=translation-fixture@example.invalid','commit','--quiet','-m','fixture');
  git('update-index','--skip-worktree','src/lib.rs','Cargo.toml');rmSync(join(root,'src/lib.rs'));rmSync(join(root,'Cargo.toml'));
  const corpus=captureSourceCorpus({root,paths:['src/lib.rs']});
  assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),source);assert.equal(sourceCorpusText(corpus,root,'Cargo.toml'),cargo);assert.equal(trackedSource(root,'src/lib.rs'),source);
  git('update-index','--no-skip-worktree','src/lib.rs');
  assert.throws(()=>captureSourceCorpus({root,paths:['src/lib.rs']}),error=>error.code==='ENOENT');
}));
