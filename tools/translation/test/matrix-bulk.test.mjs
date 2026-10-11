import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createCompilationMatrix,DECLARED_FAMILY_PROFILES,compilationMatrixDescription} from '../compilation-matrix.mjs';
import {captureSourceCorpus,trackedSource} from '../source-corpus.mjs';
import {regenerate,planRegeneration,validateRegenerationPlan,OUTPUT_ROOTS} from '../bulk.mjs';
import {regenerateCompilationMatrix} from '../matrix-bulk.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const matrix=()=>createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
const paths=['src/lib.rs','src/windows.rs'];
function root(){const directory=mkdtempSync(join(tmpdir(),'router-matrix-bulk-'));mkdirSync(join(directory,'src'));return directory;}
function sources(directory){
  writeFileSync(join(directory,'src/lib.rs'),'pub const SHARED:u8=7;#[cfg(unix)]pub mod platform {pub const FAMILY:u8=11;pub fn value()->u8{super::SHARED+FAMILY}}#[cfg(windows)]#[path="windows.rs"]pub mod platform;#[cfg(unix)]pub fn result()->u8{platform::value()}#[cfg(windows)]pub fn result()->u8{platform::value()}');
  writeFileSync(join(directory,'src/windows.rs'),'pub const FAMILY:u8=23;pub fn value()->u8{super::SHARED+FAMILY}');
}
function snapshot(directory){
  const result={};
  function visit(path){if(!existsSync(join(directory,path)))return;for(const entry of readdirSync(join(directory,path),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())visit(child);else result[child]=hash(readFileSync(join(directory,child)));}}
  OUTPUT_ROOTS.forEach(visit);const inventory='parity/rust-source-inventory.json';if(existsSync(join(directory,inventory)))result[inventory]=hash(readFileSync(join(directory,inventory)));return result;
}

test('full profile drafts execute independent original families through meta into JavaScript and strict TypeScript',{timeout:30_000},async()=>{
  const directory=root();try{
    sources(directory);regenerate({root:directory,sources:paths});const baseline=snapshot(directory),selection=matrix();
    const corpus=captureSourceCorpus({root:directory,paths});
    const result=regenerateCompilationMatrix({root:directory,matrix:selection,sourceCorpus:corpus});assert.deepEqual(result.failures,[]);assert.deepEqual(snapshot(directory),baseline);
    assert.equal(result.manifest.sourceSetSha256,corpus.sourceSetSha256);assert.equal(result.manifest.runtimeParity,false);assert.equal(result.manifest.commonExecutableOutput,false);assert.equal(result.manifest.platformDomainComplete,false);
    for(const member of result.manifest.profiles){
      const project=member.projects.find(project=>project.entry==='src/lib.rs'),meta=JSON.parse(readFileSync(join(directory,project.targets.meta),'utf8'));
      const target={meta,javascript:readFileSync(join(directory,project.targets.javascript),'utf8'),typescript:readFileSync(join(directory,project.targets.typescript),'utf8')};
      await verifyTypedTargets(target,api=>{assert.equal(api.SHARED,7n);if(member.name==='neutral')assert.equal(api.result,undefined);else assert.equal(api.result(),member.name==='unix-family'?18n:30n);});
      const inventory=JSON.parse(readFileSync(join(directory,member.inventory),'utf8'));
      assert.equal(inventory.originalSourceCorpus.sourceSetSha256,corpus.sourceSetSha256);assert.equal(inventory.explicitCompilationMatrix.sha256,selection.sha256);assert.equal(inventory.explicitCompilationMatrix.profileSha256,member.profileSha256);
      assert.deepEqual(inventory.sources.map(source=>source.sha256),corpus.sources.map(source=>source.sha256));
      assert.equal(inventory.runtimeParity,false);
    }
    assert.deepEqual(regenerateCompilationMatrix({root:directory,matrix:selection,sourceCorpus:corpus,check:true}).failures,[]);
    const unix=result.manifest.profiles.find(member=>member.name==='unix-family'),windows=result.manifest.profiles.find(member=>member.name==='windows-family');
    rmSync(join(directory,unix.projects[0].targets.javascript));writeFileSync(join(directory,windows.projects[0].targets.typescript),'stale');
    const extra=unix.directory+'/packages/javascript/generated/rust-project/extra.mjs';writeFileSync(join(directory,extra),'extra');
    const failed=regenerateCompilationMatrix({root:directory,matrix:selection,sourceCorpus:corpus,check:true}).failures;
    assert.ok(failed.includes('missing: '+unix.projects[0].targets.javascript));assert.ok(failed.includes('stale: '+windows.projects[0].targets.typescript));assert.ok(failed.includes('unexpected: '+extra));
    regenerateCompilationMatrix({root:directory,matrix:selection,sourceCorpus:corpus});assert.equal(existsSync(join(directory,extra)),false);assert.deepEqual(snapshot(directory),baseline);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('profile output requires private matrix and source corpus identities, exact profile and safe directory',()=>{
  const directory=root();try{
    sources(directory);const selection=matrix(),corpus=captureSourceCorpus({root:directory,paths}),neutral=compilationMatrixDescription(selection).profiles.find(member=>member.name==='neutral');
    for(const changed of [{matrix:structuredClone(selection)},{sourceCorpus:structuredClone(corpus)},{outputPrefix:'../outside'},{compilationProfile:{flags:{test:false,unix:true,windows:false}}}])assert.throws(()=>planRegeneration({root:directory,sourceCorpus:corpus,matrix:selection,compilationProfile:neutral.compilationProfile,outputPrefix:neutral.directory,...changed}),TypeError);
    assert.throws(()=>validateRegenerationPlan({schema:'checked-bulk-output-plan-v1'}),/Unsealed/);
    assert.throws(()=>regenerateCompilationMatrix({root:directory,matrix:selection,sourceCorpus:corpus,entries:['src/absent.rs']}),/original tracked/);
    assert.equal(existsSync(join(directory,'profiles')),false);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('a later profile symlink refusal prevents every profile write and preserves outside files',()=>{
  const directory=root(),outside=mkdtempSync(join(tmpdir(),'router-matrix-outside-'));try{
    sources(directory);const selection=matrix(),members=compilationMatrixDescription(selection).profiles;
    mkdirSync(join(directory,'profiles'));writeFileSync(join(outside,'sentinel'),'owned fixture');symlinkSync(outside,join(directory,members.at(-1).directory),'dir');
    assert.throws(()=>regenerateCompilationMatrix({root:directory,matrix:selection,sources:paths}),/symbolic link/);
    assert.equal(readFileSync(join(outside,'sentinel'),'utf8'),'owned fixture');
    for(const member of members.slice(0,-1))assert.equal(existsSync(join(directory,member.directory)),false);
    assert.equal(existsSync(join(directory,`profiles/matrix-${selection.sha256}.json`)),false);
  }finally{rmSync(directory,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});

test('reusable CLI drafts and checks the complete tracked profile corpus without a Rust build',{timeout:30_000},()=>{
  const directory=root();try{
    sources(directory);
    execFileSync('git',['init','--quiet'],{cwd:directory,stdio:'pipe'});execFileSync('git',['add',...paths],{cwd:directory,stdio:'pipe'});
    const script=fileURLToPath(new URL('../../../scripts/translate-router.mjs',import.meta.url));
    const invoke=extra=>JSON.parse(execFileSync(process.execPath,[script,'--root',directory,'--profile-matrix',...extra],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
    const written=invoke([]),checked=invoke(['--check']);
    assert.equal(written.kind,'independent-profile-bulk-inventory-v1');assert.equal(written.mode,'write');assert.equal(checked.mode,'check');
    assert.equal(checked.sourceSetSha256,written.sourceSetSha256);assert.equal(checked.matrixSha256,written.matrixSha256);
    assert.equal(written.profiles.length,3);assert.ok(written.profiles.every(profile=>profile.totals.sources===2));
    assert.equal(written.runtimeParity,false);assert.equal(written.commonExecutableOutput,false);assert.equal(existsSync(join(directory,'target')),false);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('whole unchanged lib and Unix listener retain separate original configured graphs and all unresolved obligations',{timeout:30_000},async()=>{
  const directory=root(),repository=fileURLToPath(new URL('../../../',import.meta.url));try{
    const originals={'src/lib.rs':'3c9605387b5454634325dbbf7604e0ad919931be17dac05905a60ea0268286af','src/unix_listener.rs':'f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5'};
    for(const [path,expected]of Object.entries(originals)){const source=trackedSource(repository,path);assert.equal(hash(source),expected);writeFileSync(join(directory,path),source);}
    const result=regenerateCompilationMatrix({root:directory,matrix:matrix(),sources:Object.keys(originals)});
    for(const member of result.manifest.profiles){
      const project=member.projects.find(project=>project.entry==='src/lib.rs'),meta=JSON.parse(readFileSync(join(directory,project.targets.meta),'utf8'));
      assert.equal(meta.moduleEdges.some(edge=>edge.to==='src/unix_listener.rs'),member.name==='unix-family');
      assert.ok(meta.refused.length||meta.moduleDiagnostics.length);assert.equal(meta.runtimeParity,false);
      assert.deepEqual(Object.fromEntries(result.manifest.sources.map(source=>[source.source,source.sha256])),originals);
      await verifyTypedTargets({meta,javascript:readFileSync(join(directory,project.targets.javascript),'utf8'),typescript:readFileSync(join(directory,project.targets.typescript),'utf8')},()=>{});
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
});
