// Full original source-package cases. Explicit receiving entry; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {withCanonicalMapCompilerCohort,canonicalMapCompilerStep,verifyCanonicalMapCompilerCohort} from '../ordered-map-canonical-cohort-20261102.mjs';
import {synchronizationSteps} from '../../../scripts/sync-router.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const options={timeout:60000,concurrency:false};
export function registerCanonicalMapCohortReceivingCases(){
 test('complete14 plus three original canonical parents share one fixed scoped compiler source cohort',options,()=>{
  let token,compiledRoot;
  withCanonicalMapCompilerCohort({deadline:performance.now()+60000},(current,report)=>{
   token=current;compiledRoot=report.root;assert.equal(report.sourceAuthority,false);assert.equal(report.semanticAuthority,false);
   const steps=synchronizationSteps({root:ROOT,direction:'both',check:true,profiles:true});
   for(const step of steps){const mapped=canonicalMapCompilerStep(current,step);
    assert.equal(mapped.id,step.id);assert.equal(mapped.timeoutMs,step.timeoutMs);assert.equal(mapped.args.length,step.args.length);
    if(step.args[0]==='--input-type=module'){
     const old=/^import \* as producer from ("(?:[^"\\]|\\.)*");/u.exec(step.args[2]);
     const rewritten=/^import \* as producer from ("(?:[^"\\]|\\.)*");/u.exec(mapped.args[2]);
     assert.ok(old&&rewritten);assert.ok(JSON.parse(rewritten[1]).startsWith(pathToFileURL(report.root+'/').href));
     assert.equal(step.args[2].slice(old[0].length),mapped.args[2].slice(rewritten[0].length));
     assert.deepEqual(mapped.args.slice(3),step.args.slice(3));
    }else{assert.equal(mapped.args[0],join(report.root,'scripts/translate-router-flat-native-owned-field-meta.mjs'));assert.deepEqual(mapped.args.slice(1),step.args.slice(1));}
   }
   verifyCanonicalMapCompilerCohort(current);
  });
  assert.equal(fs.existsSync(compiledRoot),false);assert.throws(()=>verifyCanonicalMapCompilerCohort(token),/expired operational cohort/u);
 });
 test('caught altered compiler input poisons the actual full cohort even after source restoration',options,t=>{
  let primary,ownedParent;
  t.after(()=>{if(ownedParent)fs.rmSync(ownedParent,{recursive:true,force:true});});
  assert.throws(()=>withCanonicalMapCompilerCohort({deadline:performance.now()+60000},(token,report)=>{
   ownedParent=dirname(dirname(report.root));
   const path=join(report.root,'tools/translation/js-to-rust/owned-core-source.mjs'),before=fs.readFileSync(path);
   fs.writeFileSync(path,Buffer.concat([before,Buffer.from('\n// changed source\n')]));
   try{verifyCanonicalMapCompilerCohort(token);}catch(error){primary=error;}
   fs.writeFileSync(path,before);
   assert.throws(()=>canonicalMapCompilerStep(token,{id:'javascript-meta-rust',timeoutMs:120000,args:['--input-type=module','--eval','import * as producer from '+JSON.stringify(pathToFileURL(join(ROOT,'scripts/regenerate-js-first.mjs')).href)+';']}),error=>error===primary);
  }),error=>error===primary);
 });
 test('original deadline and synchronous scope remain mandatory before any cold compiler invocation',options,()=>{
  assert.throws(()=>withCanonicalMapCompilerCohort({deadline:performance.now()-1},()=>{}),/original finite producer deadline/u);
  assert.throws(()=>withCanonicalMapCompilerCohort({deadline:performance.now()+60000},async()=>{}),/synchronous/u);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))registerCanonicalMapCohortReceivingCases();
