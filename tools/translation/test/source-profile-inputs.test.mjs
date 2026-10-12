import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,renameSync,truncateSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {discoverSourceProfileInputs,SOURCE_PROFILE_INPUT_LIMITS} from '../source-profile-inputs.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),prefix='tools/translation/source-profiles/';
function fixture(files,run){
  const root=mkdtempSync(join(tmpdir(),'router-profile-inputs-')),git=(...args)=>execFileSync('git',args,{cwd:root,timeout:5000,stdio:'pipe'});
  try{git('init','-q');for(const [path,bytes]of Object.entries(files)){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);}git('add','--','.');return run(root,git);}finally{rmSync(root,{recursive:true,force:true});}
}

test('new nested profile families and original licenses are discovered by stable path and exact bytes',()=>{
  const files={[prefix+'unlisted/child/pin.rs.gz']:Buffer.from([0,255,1]),[prefix+'unlisted/LICENSE-MIT']:'original license',[prefix+'alpha/manifest.json']:'{}',[prefix+'unlisted/draft-receipt.json']:'{"runtimeParity":false}',[prefix+'unlisted/é.rs']:'source'};
  fixture(files,root=>{const entries=discoverSourceProfileInputs({root});assert.deepEqual(entries.map(entry=>entry.path),Object.keys(files).sort());for(const entry of entries){assert.equal(entry.sha256,hash(files[entry.path]));assert.equal(entry.bytes,Buffer.byteLength(files[entry.path]));assert.equal(entry.semanticAuthority,false);}assert.deepEqual(discoverSourceProfileInputs({root}),entries);assert.equal(Object.isFrozen(entries),true);});
});

test('working original pin and license byte changes update fingerprints without pretending the index blob changed',()=>{
  fixture({[prefix+'any/pin.rs.gz']:'first',[prefix+'any/LICENSE']:'license'},root=>{const before=discoverSourceProfileInputs({root});writeFileSync(join(root,prefix+'any/pin.rs.gz'),'second');const after=discoverSourceProfileInputs({root});assert.equal(after[1].gitBlob,before[1].gitBlob);assert.notEqual(after[1].sha256,before[1].sha256);assert.equal(after[1].sha256,hash('second'));writeFileSync(join(root,prefix+'any/LICENSE'),'changed license');assert.notEqual(discoverSourceProfileInputs({root})[0].sha256,before[0].sha256);});
});

test('missing tracked original profile bytes and an empty profile root fail closed',()=>{
  fixture({[prefix+'a/pin']:'source'},root=>{rmSync(join(root,prefix+'a/pin'));assert.throws(()=>discoverSourceProfileInputs({root}),/ENOENT/);});
  fixture({'README.md':'no profiles'},root=>assert.throws(()=>discoverSourceProfileInputs({root}),/empty/));
});

test('unknown and ignored profile bytes require an actual tracked freeze',()=>{
  fixture({[prefix+'a/pin']:'source','.gitignore':'ignored.pin\n'},root=>{writeFileSync(join(root,prefix+'a/ignored.pin'),'unfrozen');assert.throws(()=>discoverSourceProfileInputs({root}),/untracked/);});
});

test('tracked final symbolic links and nested substituted directories cannot grant pin fingerprints',()=>{
  fixture({[prefix+'a/pin']:'source'},(root,git)=>{rmSync(join(root,prefix+'a/pin'));symlinkSync('../target',join(root,prefix+'a/pin'));git('add','--',prefix+'a/pin');assert.throws(()=>discoverSourceProfileInputs({root}),/nonregular/);});
  fixture({[prefix+'a/pin']:'source'},root=>{renameSync(join(root,prefix+'a'),join(root,'outside'));symlinkSync(join(root,'outside'),join(root,prefix+'a'),'dir');assert.throws(()=>discoverSourceProfileInputs({root}),/untracked|regular-file/);});
});

test('file count individual bytes total bytes and attempted wider public limits remain bounded',()=>{
  fixture({[prefix+'a/one']:'123',[prefix+'a/two']:'456'},root=>{
    for(const limits of [{files:1},{fileBytes:2},{totalBytes:5}])assert.throws(()=>discoverSourceProfileInputs({root,limits}),/finite bounds/);
    for(const limits of [{files:SOURCE_PROFILE_INPUT_LIMITS.files+1},{fileBytes:NaN},{totalBytes:0},{unknown:1}])assert.throws(()=>discoverSourceProfileInputs({root,limits}),/limits/);
    truncateSync(join(root,prefix+'a/one'),SOURCE_PROFILE_INPUT_LIMITS.fileBytes+1);assert.throws(()=>discoverSourceProfileInputs({root}),/finite bounds/);
  });
});

test('repository subdirectories cannot replace the original tracked input root',()=>{
  fixture({[prefix+'a/pin']:'source'},root=>assert.throws(()=>discoverSourceProfileInputs({root:join(root,'tools')}),/worktree root/));
});

test('actual complete wrapping and bool profiles include every reused pinned source and original license',()=>{
  const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),entries=discoverSourceProfileInputs({root}),byPath=new Map(entries.map(entry=>[entry.path,entry]));
  for(const family of ['fixed-wrapping','primitive-bool-from']){
    const directory=join(root,prefix+family),manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
    assert.equal(byPath.has(prefix+family+'/manifest.json'),true);
    for(const pin of manifest.sources){const path=resolve(directory,pin.file).slice(root.length+1),entry=byPath.get(path);assert.notEqual(entry,undefined);assert.equal(entry.sha256,pin.compressedSha256);assert.equal(entry.bytes,pin.compressedBytes);}
  }
  for(const license of ['LICENSE-MIT.gz','LICENSE-APACHE.gz'])assert.equal(byPath.has(prefix+'fixed-wrapping/'+license),true);
  assert.equal(entries.every(entry=>entry.semanticAuthority===false),true);
});
