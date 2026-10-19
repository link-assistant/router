import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,renameSync,truncateSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {discoverCompilerSourceInputs,COMPILER_SOURCE_INPUT_LIMITS} from '../compiler-source-inputs.mjs';
const prefix='tools/translation/',hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(files,run){
  const root=mkdtempSync(join(tmpdir(),'router-compiler-inputs-')),git=(...args)=>execFileSync('git',args,{cwd:root,timeout:5000,stdio:'pipe'});
  try{git('init','-q');for(const [path,bytes]of Object.entries(files)){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);}git('add','--','.');return run(root,git);}finally{rmSync(root,{recursive:true,force:true});}
}

test('unlisted original compiler helpers vendor modules and descriptors receive complete stable fingerprints',()=>{
  const selected={[prefix+'new-helper.mjs']:'export const actual=1;', [prefix+'extensions/new/runtime.d.mts']:'export const actual: number;', [prefix+'vendor/new/backend.js']:'export const backend=1;', [prefix+'vendor/new/package.json']:'{"type":"module"}'};
  const excluded={[prefix+'test/new.test.mjs']:'test', [prefix+'serialization-schema/new.test.mjs']:'test', [prefix+'serialization-schema/bulk-generated/input.ts']:'generated', [prefix+'serialization-schema/bulk-generated/input.meta.json']:'{}', [prefix+'fixtures/input.json']:'{}', [prefix+'meta/input.meta.json']:'{}', [prefix+'projects/input.meta.json']:'{}', [prefix+'js-to-rust/generated/input.ts']:'generated', [prefix+'source-profiles/new/manifest.json']:'{}', [prefix+'README.md']:'documentation'};
  fixture({...selected,...excluded},root=>{const entries=discoverCompilerSourceInputs({root});assert.deepEqual(entries.map(entry=>entry.path),Object.keys(selected).sort());for(const entry of entries){assert.equal(entry.sha256,hash(selected[entry.path]));assert.equal(entry.bytes,Buffer.byteLength(selected[entry.path]));assert.equal(entry.semanticAuthority,false);}assert.deepEqual(discoverCompilerSourceInputs({root}),entries);assert.ok(Object.isFrozen(entries));});
});

test('actual compiler edits change original byte hashes without claiming a changed indexed blob',()=>{
  fixture({[prefix+'future-helper.mjs']:'first'},root=>{const before=discoverCompilerSourceInputs({root});writeFileSync(join(root,prefix+'future-helper.mjs'),'second');const after=discoverCompilerSourceInputs({root});assert.equal(after[0].gitBlob,before[0].gitBlob);assert.equal(after[0].sha256,hash('second'));assert.notEqual(after[0].sha256,before[0].sha256);});
});

test('unknown ignored compiler modules require tracking while new fixtures cannot change compiler fingerprints',()=>{
  fixture({[prefix+'helper.mjs']:'source','.gitignore':'ignored.mjs\n'},(root,git)=>{mkdirSync(join(root,prefix+'test'));writeFileSync(join(root,prefix+'test/untracked.test.mjs'),'fixture');assert.equal(discoverCompilerSourceInputs({root}).length,1);writeFileSync(join(root,prefix+'ignored.mjs'),'unknown compiler');assert.throws(()=>discoverCompilerSourceInputs({root}),/untracked/);git('add','-f','--',prefix+'ignored.mjs');assert.equal(discoverCompilerSourceInputs({root}).length,2);});
});

test('tracked symbolic modules substituted directories and missing original files fail closed',()=>{
  fixture({[prefix+'helper.mjs']:'source'},(root,git)=>{rmSync(join(root,prefix+'helper.mjs'));symlinkSync('../outside',join(root,prefix+'helper.mjs'));git('add','--',prefix+'helper.mjs');assert.throws(()=>discoverCompilerSourceInputs({root}),/nonregular/);});
  fixture({[prefix+'nested/helper.mjs']:'source'},root=>{renameSync(join(root,prefix+'nested'),join(root,'outside'));symlinkSync(join(root,'outside'),join(root,prefix+'nested'),'dir');assert.throws(()=>discoverCompilerSourceInputs({root}),/untracked|regular-file/);});
  fixture({[prefix+'helper.mjs']:'source'},root=>{rmSync(join(root,prefix+'helper.mjs'));assert.throws(()=>discoverCompilerSourceInputs({root}),/ENOENT/);});
});

test('excluded generated and fixture links cannot replace original compiler inputs',()=>{
  fixture({[prefix+'helper.mjs']:'source',[prefix+'projects/retained.mjs']:'output',[prefix+'test/fixture.mjs']:'fixture'},(root,git)=>{for(const name of ['projects/retained.mjs','test/fixture.mjs']){const path=prefix+name;rmSync(join(root,path));symlinkSync('../outside',join(root,path));git('add','--',path);}const entries=discoverCompilerSourceInputs({root});assert.deepEqual(entries.map(entry=>entry.path),[prefix+'helper.mjs']);assert.equal(entries[0].sha256,hash('source'));});
});

test('compiler file count individual bytes and total input bytes retain finite bounds',()=>{
  fixture({[prefix+'one.mjs']:'123',[prefix+'two.mjs']:'456'},root=>{for(const limits of [{files:1},{fileBytes:2},{totalBytes:5}])assert.throws(()=>discoverCompilerSourceInputs({root,limits}),/finite bounds/);for(const limits of [{files:COMPILER_SOURCE_INPUT_LIMITS.files+1},{fileBytes:NaN},{totalBytes:0},{unknown:1}])assert.throws(()=>discoverCompilerSourceInputs({root,limits}),/limits/);truncateSync(join(root,prefix+'one.mjs'),COMPILER_SOURCE_INPUT_LIMITS.fileBytes+1);assert.throws(()=>discoverCompilerSourceInputs({root}),/finite bounds/);});
});

test('empty compiler selections and substituted repository roots cannot issue fingerprints',()=>{
  fixture({[prefix+'test/only.test.mjs']:'fixture'},root=>assert.throws(()=>discoverCompilerSourceInputs({root}),/empty/));
  fixture({[prefix+'helper.mjs']:'source'},root=>assert.throws(()=>discoverCompilerSourceInputs({root:join(root,'tools')}),/worktree root/));
});

test('actual compiler discovery retains helpers omitted by earlier manual inventory and their full original bytes',()=>{
  const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),entries=discoverCompilerSourceInputs({root}),byPath=new Map(entries.map(entry=>[entry.path,entry]));
  for(const name of ['derive-generic-parameters.mjs','derive-numeric-helpers.mjs','macro-subnamespaces.mjs','builtin-source-call-frames.mjs','format-source-meta.mjs','compiler-source-inputs.mjs','tracked-inputs.mjs']){const path=prefix+name,bytes=readFileSync(join(root,path));assert.equal(byPath.get(path)?.sha256,hash(bytes));assert.equal(byPath.get(path)?.bytes,bytes.length);assert.equal(byPath.get(path)?.semanticAuthority,false);}
});
