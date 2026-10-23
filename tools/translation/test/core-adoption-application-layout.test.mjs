import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {prepareCoreAdoptionApplicationLayout} from '../prepare-core-adoption-application-layout.mjs';
import {exportTranslatorBundle} from '../export-bundle.mjs';
import {applyReviewedCoreAdoption,recoverReviewedCoreAdoption} from '../apply-reviewed-core-adoption.mjs';
import {repositorySourcePath} from './fixtures/repository-paths.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const original='pub mod translation_core;\npub fn picked(value:&crate::translation_core::Json)->crate::translation_core::Maybe<&crate::translation_core::Str>{value.get("name").and_then(crate::translation_core::Json::as_str)}\n';
const runtimeFiles=['scripts/propose-core-adoption.py','scripts/review-core-adoption.py','tools/translation/core_adoption_review.py','tools/translation/core_adoption_json_readers_review.py'];
function write(root,path,raw){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);}
function git(root,...args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false',...args],{encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});}
test('application layout is derived from complete native selections and both full CST inverses',{timeout:60000},()=>{
 const plan=prepareCoreAdoptionApplicationLayout();assert.equal(plan.semanticAuthority,false);assert.equal(plan.changedResourceBounds,false);assert.equal(plan.acrossInvocationCache,false);
 assert.equal(plan.files.length,1);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const [index,stage]of row.stages.entries())assert.equal(stage.inverse,index?row.language:row.before);
  assert.deepEqual(row.nativeSelections.map(selection=>selection.id),['guard-all-tracked-nested-cargo','classify-exact-cargo-basenames','census-actual-rust-package','install-only-actual-production-prefix','bind-shared-operational-layout']);
 }
});
test('nested Rust receiving preserves all Cargo guards and applies and recovers exact reviewed source',{timeout:60000},async()=>{
 const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-nested-adoption-'))),root=join(directory,'source'),run=join(directory,'proposal'),vectors=[];
 const command=(script,args)=>{
  const child=spawnSync('python3',['-B',join(root,script),...args],{encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});
  vectors.push({script,args,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message}});
  assert.equal(child.signal,null);assert.equal(child.status,0,JSON.stringify(vectors.at(-1)));return JSON.parse(child.stdout);
 };
 try{
  exportTranslatorBundle({sourceRoot:ROOT,output:root});
  for(const path of runtimeFiles)write(root,path,fs.readFileSync(join(ROOT,path)));
  write(root,'tools/translation/fixtures/real-source-provenance.json',fs.readFileSync(join(ROOT,'tools/translation/fixtures/real-source-provenance.json')));
  for(const path of ['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml'])write(root,'rust/'+path,fs.readFileSync(join(ROOT,repositorySourcePath(path,ROOT))));
  write(root,'Cargo.lock',fs.readFileSync(join(ROOT,'Cargo.lock')));
  write(root,'Cargo.toml','[workspace]\nmembers = ["rust"]\nresolver = "2"\n');
  write(root,'rust/src/lib.rs',original);write(root,'rust/tests/guard.rs','// outside production\n');
  write(root,'experiments/guard/Cargo.toml','[package]\nname="guard-only"\nversion="0.0.0"\n');write(root,'experiments/guard/Cargo.lock','version = 4\n');
  const actual=process.env.ROUTER_TRANSLATION_TSC?dirname(dirname(resolve(process.env.ROUTER_TRANSLATION_TSC))):join(ROOT,'js/node_modules/typescript');
  assert.equal(JSON.parse(fs.readFileSync(join(actual,'package.json'))).version,'5.9.3');fs.cpSync(actual,join(root,'js/node_modules/typescript'),{recursive:true,dereference:true});write(root,'.gitignore','js/node_modules/\n');
  git(root,'init','-q');git(root,'add','.');git(root,'-c','commit.gpgsign=false','-c','user.name=Receiving fixture','-c','user.email=receiving@example.invalid','commit','-qm','nested complete inputs');const head=git(root,'rev-parse','HEAD').trim();
  const produced=command('scripts/propose-core-adoption.py',['--root',root,'--expected-head',head,'--output',run,'--sequence','json-readers']);assert.equal(produced.inputsUnchanged,true);assert.equal(produced.capSeconds,900);
  const reviewed=command('scripts/review-core-adoption.py',['--root',root,'--expected-head',head,'--run',run,'--review-directory','review','--review-monitor-directory','review-monitor']);assert.equal(reviewed.reviewerQualified,true);assert.equal(reviewed.capSeconds,180);
  const reportRaw=fs.readFileSync(join(run,'review/review.json')),planRaw=fs.readFileSync(join(run,'review/installation-plan.json')),indexRaw=fs.readFileSync(join(run,'migration-proposal/index.json')),report=JSON.parse(reportRaw),plan=JSON.parse(planRaw);
  assert.equal(report.allTrackedRustCargoGuards,11);assert.equal(report.sourceFiles,5);assert.equal(report.installedTypeScriptFiles,132);assert.equal(report.uniqueSelectedCompleteFunctions,1);assert.deepEqual(plan.files.map(row=>row.path),['rust/src/lib.rs']);assert.equal(report.semanticAdmission,false);
  const options={root,run,output:join(directory,'application'),head,reviewDirectory:'review',reviewMonitorDirectory:'review-monitor',reviewSha256:hash(reportRaw),planSha256:hash(planRaw),indexSha256:hash(indexRaw)};
  const applied=await applyReviewedCoreAdoption(options);assert.equal(applied.sourceInstalled,true);assert.equal(applied.changedFiles,1);
  const after=fs.readFileSync(join(root,'rust/src/lib.rs'),'utf8');assert.notEqual(after,original);assert.match(after,/__router_json_reader_/);assert.equal(fs.existsSync(join(root,'src')),false);
  const recovered=await recoverReviewedCoreAdoption({application:options.output,output:join(directory,'recovery'),stateSha256:hash(fs.readFileSync(join(options.output,'application-state.json')))});
  assert.equal(recovered.complete,true);assert.equal(fs.readFileSync(join(root,'rust/src/lib.rs'),'utf8'),original);assert.equal(git(root,'status','--porcelain'),'');
 }finally{
  const output=process.env.ROUTER_CORE_RECEIVING_VECTOR_DIR;if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(join(output,'nested-application-workflow.json'),JSON.stringify({vectors})+'\n');}
  fs.rmSync(directory,{recursive:true,force:true});
 }
});
