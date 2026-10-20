import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,openSync,ftruncateSync,closeSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeCanonicalDeriveTrial,canonicalTrialCases,joinCanonicalTrialCases,canonicalTrialBunCompletions,isCanonicalTrialSourcePath,preflightCanonicalTrialPaths} from '../prepare-builtin-canonical-trial.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const testPath=new URL('./derive-bang-context.test.mjs',import.meta.url);
const actualSource=()=>readFileSync(testPath,'utf8');
const originalCases=()=>canonicalTrialCases(ownershipCompiler(),actualSource());
// These completion fixtures qualify only the strict join, never original workload performance.
const completions=cases=>cases.map((row,index)=>({name:row.name,durationMs:index+0.25,passed:true,skipped:false,todo:false}));

test('isolated trial copies the complete actual candidate into the original physical codec path and preserves original twelve cases',{timeout:60000},()=>{
 const original=readFileSync(new URL('../builtin-source-meta.mjs',import.meta.url),'utf8'),candidate=readFileSync(new URL('../builtin-source-meta-canonical-candidate.mjs',import.meta.url),'utf8');
 const plan=proposeCanonicalDeriveTrial({root});
 assert.equal(plan.path,'tools/translation/builtin-source-meta.mjs');assert.equal(plan.original,original);assert.equal(plan.inverse,original);assert.equal(plan.candidate,candidate);assert.notEqual(plan.original,plan.candidate);
 assert.equal(plan.productionSelected,false);assert.equal(plan.trialSelected,true);assert.equal(plan.performanceQualified,false);assert.equal(plan.originalPublicAPIUnchanged,true);
 assert.equal(plan.sequence.languageRules.length,1);assert.equal(plan.sequence.repositoryRules.length,1);assert.equal(plan.sequence.languageRules[0].edits[0].expected,original);assert.equal(plan.sequence.repositoryRules[0].edits[0].replacement,candidate);
 assert.equal(plan.test.source,actualSource());assert.equal(plan.test.cases.length,12);assert.equal(plan.test.sha256,'e3a53b40da1ec47965be2c21c063b4297f7394c00ffd827cd30715ee74756e0e');
 assert.deepStrictEqual(plan.test.cases.filter(row=>row.deadline.kind==='finite-source-deadline').map(row=>row.deadline.milliseconds),[60000,60000]);
 assert.equal(readFileSync(new URL('../builtin-source-meta.mjs',import.meta.url),'utf8'),original);assert.equal(actualSource(),plan.test.source);
});

test('native original source case joins retain full spans and distinguish declared limits from undeclared defaults',{timeout:60000},()=>{
 const source=actualSource(),cases=originalCases();assert.equal(cases.length,12);assert.equal(new Set(cases.map(row=>row.name)).size,12);
 for(const row of cases){const call=source.slice(row.sourceCallSpan.start,row.sourceCallSpan.end);assert.ok(call.startsWith('test('));assert.ok(call.includes(row.name));assert.ok(row.line>0);assert.ok(row.column>0);}
 assert.equal(cases.filter(row=>row.deadline.kind==='default-no-source-deadline').length,10);
 const changed=canonicalTrialCases(ownershipCompiler(),source.replace('{timeout:60_000}','{timeout:60_001}'));
 assert.equal(changed.filter(row=>row.deadline.kind==='finite-source-deadline')[0].deadline.milliseconds,60001);
 assert.throws(()=>canonicalTrialCases(ownershipCompiler(),source.replace('{timeout:60_000}','{timeout:60_000,skip:true}')),/timeout declaration/);
 assert.throws(()=>canonicalTrialCases(ownershipCompiler(),source.replace('{timeout:60_000}','{timeout:limit}')),/timeout declaration/);
});

test('complete joins enforce both original sixty-second limits while leaving default limits uninferred',{timeout:60000},()=>{
 const cases=originalCases(),rows=completions(cases),joined=joinCanonicalTrialCases(cases,rows);assert.equal(joined.passed,true);assert.equal(joined.defaultDeadlinesInferred,false);assert.equal(joined.originalCaseLimitsChanged,false);assert.equal(joined.records.length,12);
 for(const [index,row]of cases.entries())if(row.deadline.kind==='finite-source-deadline'){
  const changed=structuredClone(rows);changed[index].durationMs=60000;assert.equal(joinCanonicalTrialCases(cases,changed).passed,true);changed[index].durationMs=60000.0001;const failed=joinCanonicalTrialCases(cases,changed);assert.equal(failed.passed,false);assert.equal(failed.records[index].durationBreach,true);assert.deepStrictEqual(failed.records[index].originalSourceCase,row);
 }
 const defaultIndex=cases.findIndex(row=>row.deadline.kind==='default-no-source-deadline'),longDefault=structuredClone(rows);longDefault[defaultIndex].durationMs=100000;assert.equal(joinCanonicalTrialCases(cases,longDefault).records[defaultIndex].durationBreach,false);
});

test('missing duplicate unknown skipped todo and nonfinite completion records cannot qualify the original whole file',{timeout:60000},()=>{
 const cases=originalCases(),rows=completions(cases);assert.throws(()=>joinCanonicalTrialCases(cases,rows.slice(1)),/all original twelve/);assert.throws(()=>joinCanonicalTrialCases(cases,[...rows,rows[0]]),/all original twelve/);
 for(const change of [{name:'foreign case'},{name:rows[1].name},{skipped:true},{todo:true},{durationMs:NaN},{durationMs:Infinity},{durationMs:-1}]){const changed=structuredClone(rows);Object.assign(changed[0],change);assert.throws(()=>joinCanonicalTrialCases(cases,changed),/unknown duplicate skipped or incomplete/);}
 const changed=structuredClone(rows);changed[0].passed=false;assert.equal(joinCanonicalTrialCases(cases,changed).passed,false);
});

test('Bun complete raw completion syntax joins exact original names without inventing reported source positions',{timeout:60000},()=>{
 const cases=originalCases(),lines=cases.map((row,index)=>'\u001b[32m(pass)\u001b[0m '+row.name+' ['+(index+0.25)+'ms]');
 const observed=canonicalTrialBunCompletions([Buffer.from('bun test v1.4.3\n\n'+lines.slice(0,6).join('\n')+'\n'),Buffer.from(lines.slice(6).join('\n')+'\n\n 12 pass\n 0 fail\n')]);
 const joined=joinCanonicalTrialCases(cases,observed);assert.equal(joined.passed,true);assert.equal(joined.records.length,12);for(const [index,row]of joined.records.entries()){assert.equal(row.name,cases[index].name);assert.equal(row.durationMs,index+0.25);assert.equal(row.actualBunLine,'(pass) '+cases[index].name+' ['+(index+0.25)+'ms]');assert.equal(Object.hasOwn(row,'line'),false);assert.deepStrictEqual(row.originalSourceCase,cases[index]);}
});

test('Bun omitted timing missing nested original name mutations failures and skips remain failures',{timeout:60000},()=>{
 const cases=originalCases(),lines=cases.map(row=>'(pass) '+row.name+' [1.25ms]');
 const missingTiming=[...lines];missingTiming[0]='(pass) '+cases[0].name;assert.throws(()=>joinCanonicalTrialCases(cases,canonicalTrialBunCompletions([Buffer.from(missingTiming.join('\n'))])),/incomplete/);
 const changedName=[...lines];changedName[9]=changedName[9].replace('CatalogRecord','CatalogRecordChanged');assert.throws(()=>joinCanonicalTrialCases(cases,canonicalTrialBunCompletions([Buffer.from(changedName.join('\n'))])),/unknown/);
 const failed=[...lines];failed[9]=failed[9].replace('(pass)','(fail)');assert.equal(joinCanonicalTrialCases(cases,canonicalTrialBunCompletions([Buffer.from(failed.join('\n'))])).passed,false);
 for(const status of ['skip','todo']){const changed=[...lines];changed[0]=changed[0].replace('(pass)','('+status+')');assert.throws(()=>joinCanonicalTrialCases(cases,canonicalTrialBunCompletions([Buffer.from(changed.join('\n'))])),/skipped/);}
 const duplicate=[...lines];duplicate[0]=duplicate[1];assert.throws(()=>joinCanonicalTrialCases(cases,canonicalTrialBunCompletions([Buffer.from(duplicate.join('\n'))])),/duplicate/);
});

test('trial input selector retains actual compiler profiles vendors whole tests fixtures scripts and original Rust Cargo inputs',{timeout:60000},()=>{
 for(const path of ['rust/src/lib.rs','rust/Cargo.toml','Cargo.lock','other/original/Cargo.toml','tools/translation/builtin-source-meta.mjs','tools/translation/prepare-isolated-project-compiler.mjs','tools/translation/vendor/original.bin','tools/translation/js-to-rust/vendor/module-syntax.mjs','tools/translation/source-profiles/derive-dependencies/original.crate','tools/translation/test/derive-bang-context.test.mjs','tools/translation/test/fixtures/repository-paths.mjs','tools/translation/js-to-rust/test/whole.test.mjs','scripts/run-node-tests.mjs','js/package-lock.json'])assert.equal(isCanonicalTrialSourcePath(path),true,path);
 for(const path of ['tools/translation/meta/large.json','tools/translation/projects/lib.meta.json','tools/translation/generated/proposal.mjs','tools/translation/js-to-rust/generated/large.json','tools/translation/source-profiles/isolated-project-compiler/large.json','unrelated/large.json'])assert.equal(isCanonicalTrialSourcePath(path),false,path);
});

test('complete stat-only size census refuses oversized sparse files total bytes and file counts before body reads',{timeout:60000},t=>{
 const folder=mkdtempSync(join(tmpdir(),'router-canonical-trial-census-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));writeFileSync(join(folder,'small.mjs'),'original');
 const first=preflightCanonicalTrialPaths(folder,['small.mjs']);assert.equal(first.totalBytes,8);assert.deepStrictEqual(first.limits,{files:8192,fileBytes:32*1024*1024,totalBytes:256*1024*1024});
 const sparse=(name,size)=>{const fd=openSync(join(folder,name),'wx');try{ftruncateSync(fd,size);}finally{closeSync(fd);}};
 sparse('oversized.bin',32*1024*1024+1);assert.throws(()=>preflightCanonicalTrialPaths(folder,['oversized.bin']),/input bytes exceeded before body reads/);
 const paths=[];for(let index=0;index<9;index++){const path='sparse-'+index+'.bin';sparse(path,32*1024*1024);paths.push(path);}assert.throws(()=>preflightCanonicalTrialPaths(folder,paths),/input bytes exceeded before body reads/);
 assert.throws(()=>preflightCanonicalTrialPaths(folder,Array.from({length:8193},(_,index)=>'unread-'+index)),/input file count exceeded before body reads/);assert.throws(()=>preflightCanonicalTrialPaths(folder,['small.mjs','small.mjs']),/input file count exceeded before body reads/);
 mkdirSync(join(folder,'directory'));assert.throws(()=>preflightCanonicalTrialPaths(folder,['directory']),/regular unlinked physical path/);
});
