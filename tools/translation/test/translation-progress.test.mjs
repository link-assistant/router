import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {translationProgressReporter} from '../translation-progress.mjs';
import {translateProject} from '../project.mjs';
import {planRegeneration,applyRegenerationPlan,OUTPUT_ROOTS} from '../bulk.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../compilation-matrix.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadProjectMetaStorage} from '../project-meta-storage.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source='pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{self.value}}pub fn plus(v:u8)->u8{Counter{value:v}.read()}pub fn bad()->u8{unknown()}';
const fields=new Set(['schema','stage','state','entry','source','profile','declaration','phase','completed','total','attempt','remaining','outputs','bytes']);
function assertRecords(records){
  assert.ok(records.length>0);
  for(const row of records){assert.ok(Object.isFrozen(row));assert.equal(row.schema,'rust-meta-translation-progress-v1');assert.ok(Object.keys(row).every(key=>fields.has(key)));assert.ok(Object.values(row).every(value=>typeof value==='string'||Number.isSafeInteger(value)));}
}
function folder(){
  const root=mkdtempSync(join(tmpdir(),'router-translation-progress-'));
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'Cargo.toml'),'[package]\nname="progress-fixture"\nversion="0.1.0"\nedition="2024"\n');
  writeFileSync(join(root,'src/lib.rs'),source);
  return root;
}
function snapshot(root){
  const result=[];
  function visit(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){if(entry.name==='.git')continue;const relative=path?path+'/'+entry.name:entry.name;if(entry.isDirectory())visit(relative);else result.push([relative,hash(readFileSync(join(root,relative)))]);}}
  visit('');return result.sort(([a],[b])=>a<b?-1:a>b?1:0);
}
test('diagnostic records are frozen bounded scalar data and reject hostile descriptors without callbacks',()=>{
  const records=[],emit=translationProgressReporter(row=>records.push(row));
  emit({stage:'corpus',state:'start'});emit({stage:'standalone',state:'advance',source:'src/Ω.rs',completed:32,total:40});assertRecords(records);
  assert.throws(()=>{records[0].state='end';},TypeError);
  for(const record of [{stage:'unknown',state:'start'},{stage:'plan',state:'unknown'},{stage:'plan',state:'end',bytes:-1},{stage:'plan',state:'end',bytes:Infinity},{stage:'plan',state:'end',source:'x'.repeat(4097)},{stage:'plan',state:'end',source:{}},{stage:'plan',state:'end',proof:{}},{stage:'plan',state:'end',[Symbol('proof')]:true}])assert.throws(()=>emit(record),TypeError);
  let calls=0;
  const accessor={stage:'plan',get state(){calls++;return 'end';}};
  const proxy=new Proxy({stage:'plan',state:'end'},{get(){calls++;throw Error('get');},getPrototypeOf(){calls++;throw Error('prototype');},ownKeys(){calls++;throw Error('keys');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}});
  assert.throws(()=>emit(accessor),TypeError);assert.throws(()=>emit(proxy),TypeError);assert.equal(calls,0);assert.equal(records.length,2);
  const oversized=Object.fromEntries(Array.from({length:fields.size},(_,at)=>['unknown'+at,0]));assert.throws(()=>emit(oversized),/field budget/);
  const hidden={stage:'plan',state:'end'};Object.defineProperty(hidden,'completed',{value:0});assert.throws(()=>emit(hidden),TypeError);
  assert.throws(()=>translationProgressReporter({}),TypeError);
});
test('project diagnostics preserve exact Rust meta JavaScript and strict TypeScript results',{timeout:90_000},async()=>{
  const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source},plain=translateProject(options),records=[],traced=translateProject({...options,progress:row=>records.push(row)});
  assert.equal(JSON.stringify(traced.meta),JSON.stringify(plain.meta));assert.equal(traced.javascript,plain.javascript);assert.equal(traced.typescript,plain.typescript);assertRecords(records);
  assert.equal(traced.meta.refused.some(row=>row.name==='bad'),true);assert.equal(traced.meta.executable.some(row=>row.name==='bad'),false);
  for(const stage of ['project-graph','namespace','module-parse','method-parse','semantic-check','target-emit','project-serialize'])assert.ok(records.some(row=>row.stage===stage&&row.state==='end'));
  assert.ok(records.some(row=>row.stage==='semantic-check'&&row.state==='advance'&&row.remaining>0));
  const refusal=records.filter(row=>row.stage==='semantic-refusal');assert.ok(refusal.some(row=>row.declaration==='bad'&&row.source==='src/lib.rs'&&row.phase==='declaration-bodies'));
  await verifyTypedTargets(traced,api=>{assert.equal(api.plus(0n),0n);assert.equal(api.plus(255n),255n);assert.throws(()=>api.plus(256n),RangeError);assert.equal('bad'in api,false);},{childTimeoutMs:30_000});
});
test('generated Default and Clone diagnostics delimit every original module without changing target bytes',()=>{
  const cargoManifest=readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock=readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'),deriveDependencies=loadDeriveDependencyProof({manifest:cargoManifest,lock});
  const sources=new Map([['src/lib.rs','mod model;pub fn value(v:u8)->u8{v}'],['src/model.rs','#[derive(Clone,Default)]pub enum Flag{#[default]Off,On}']]),options={entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),cargoManifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE};
  const plain=translateProject(options),records=[],traced=translateProject({...options,progress:row=>records.push(row)});assertRecords(records);assert.deepEqual(traced.meta,plain.meta);assert.equal(traced.javascript,plain.javascript);assert.equal(traced.typescript,plain.typescript);
  for(const stage of ['generated-default','generated-clone']){
    const rows=records.filter(row=>row.stage===stage);assert.deepEqual(rows.map(row=>row.state),['start','advance','advance','end']);assert.deepEqual(rows.filter(row=>row.state==='advance').map(row=>[row.source,row.completed]),[['src/lib.rs',0],['src/model.rs',1]]);assert.equal(rows.at(-1).completed,2);assert.ok(rows.every(row=>row.total===2));
    const sentinel=new Error(stage+' callback');assert.throws(()=>translateProject({...options,progress:row=>{if(row.stage===stage&&row.state==='advance')throw sentinel;}}),error=>error===sentinel);
  }
});
test('full fixture plans remain byte-identical and callback failures write no partial artifacts',{timeout:90_000},()=>{
  const root=folder();
  try{
    const options={root,sources:['src/lib.rs'],entries:['src/lib.rs']},plain=planRegeneration(options),records=[],traced=planRegeneration({...options,progress:row=>records.push(row)});
    assert.deepEqual(traced.outputs,plain.outputs);assert.equal(JSON.stringify(traced.manifest),JSON.stringify(plain.manifest));assertRecords(records);
    assert.ok(records.some(row=>row.stage==='plan'&&row.state==='end'&&row.outputs===traced.outputs.length&&row.bytes===traced.expectedBytes));
    const before=snapshot(root),sentinel=new TranslationError('progress-sentinel','fixture diagnostic callback failed',{start:0,end:1});
    for(const [stage,state]of [['corpus','start'],['module-parse','advance'],['semantic-check','advance'],['semantic-refusal','advance'],['plan','end']]){
      assert.throws(()=>planRegeneration({...options,progress:row=>{if(row.stage===stage&&row.state===state)throw sentinel;}}),error=>error===sentinel);assert.deepEqual(snapshot(root),before);
    }
    for(const output of OUTPUT_ROOTS)assert.equal(existsSync(join(root,output)),false);
    assert.deepEqual(applyRegenerationPlan(traced).failures,[]);assert.deepEqual(applyRegenerationPlan(plain,{check:true}).failures,[]);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('actual canonical and all three profile CLIs report monotonic diagnostics with unchanged stdout and artifact bytes',{timeout:300_000},()=>{
  const root=folder(),script=fileURLToPath(new URL('../../../scripts/translate-router.mjs',import.meta.url));
  const fullSource=source+'#[cfg(unix)]pub fn unix_only()->u8{1u8}#[cfg(windows)]pub fn windows_only()->u8{2u8}';
  writeFileSync(join(root,'src/lib.rs'),fullSource);
  const expectedProfiles=compilationMatrixDescription(createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES})).profiles;
  const run=args=>execFileSync(process.execPath,[script,'--root',root,'--entry','src/lib.rs',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30_000});
  try{
    execFileSync('git',['init','--quiet'],{cwd:root,stdio:'pipe',timeout:30_000});execFileSync('git',['add','--','Cargo.toml','src/lib.rs'],{cwd:root,stdio:'pipe',timeout:30_000});
    for(const args of [[],['--profile-matrix']]){
      const plain=run(args),before=snapshot(root);
      const traced=spawnSync(process.execPath,[script,'--root',root,'--entry','src/lib.rs',...args,'--progress'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30_000});
      assert.equal(traced.error,undefined);assert.equal(traced.status,0);assert.equal(traced.signal,null);assert.equal(traced.stdout,plain);assert.deepEqual(snapshot(root),before);
      const events=traced.stderr.trim().split('\n').map(line=>JSON.parse(line));assert.ok(events.length>0);
      let previous=0;for(const event of events){assert.equal(event.schema,'rust-meta-translation-progress-v1');assert.ok(Number.isSafeInteger(event.elapsedMilliseconds)&&event.elapsedMilliseconds>=previous);previous=event.elapsedMilliseconds;}
      if(args.length){
        assert.deepEqual(events.filter(row=>row.stage==='profile'&&row.state==='end').map(row=>row.profile),['neutral','unix-family','windows-family']);
        for(const member of JSON.parse(traced.stdout).profiles){
          const project=member.projects[0],meta=loadProjectMetaStorage(readFileSync(join(root,project.targets.meta)),{metaPath:project.targets.meta,targets:project.targets,read:name=>readFileSync(join(root,name))}).meta;
          assert.deepEqual(meta.compilationProfile,expectedProfiles.find(row=>row.name===member.name).compilationProfile);assert.equal(meta.sources[0].sha256,hash(fullSource));assert.equal(meta.runtimeParity,false);
          const items=meta.configurationEvidence.find(row=>row.source==='src/lib.rs').items;
          for(const [name,family]of [['unix_only','unix-family'],['windows_only','windows-family']]){
            const condition=items.find(row=>fullSource.slice(row.span.start,row.span.end).includes('fn '+name+'('));assert.ok(condition);
            const expected=member.name==='neutral'?'unknown':member.name===family?'active':'inactive';assert.equal(condition.status,expected);assert.equal(meta.executable.some(row=>row.name===name),expected==='active');
          }
        }
      }
      const checked=execFileSync(process.execPath,[script,'--root',root,'--entry','src/lib.rs',...args,'--check','--progress'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30_000});
      assert.equal(JSON.parse(checked).mode,'check');assert.deepEqual(snapshot(root),before);
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});
