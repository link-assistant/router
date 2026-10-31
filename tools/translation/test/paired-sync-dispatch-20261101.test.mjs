// Independent complete batch/conflict case SOURCE. All execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planPairedSyncDispatch,applyPairedSyncDispatch,inspectPairedSyncDispatchEdits} from '../paired-sync-dispatch-20261101.mjs';
import {planPairedSyncBulk} from '../paired-sync-bulk-20261101.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {assertPairedSyncChildAfterAgreement} from '../paired-sync-dispatch-20261101-after-agreement.mjs';
import {preparePairedSyncDispatchSourceEquations} from '../paired-sync-dispatch-20261101-source-equations.mjs';
const limits={timeout:60000};
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-paired-dispatch-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,source)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),source);},read=name=>readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Independent batch fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Complete common dispatch baseline']);};
 const native='pub fn label()->&\'static str{"dispatch_before_雪"}\n';
 const units=['first','second'].map(id=>({schema:'router-forward-project-unit-v1',id,entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/'+id+'.mjs',typescript:'ts/src/'+id+'.mts',meta:'translation/'+id+'.json',inverse:'literals'}));
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));write('rust/src/lib.rs',native);
 for(const unit of units)write(unit.id+'.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 for(const unit of units){const options={root,manifestPath:unit.id+'.json'};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(options)),options);}
 const bulk={schema:'router-paired-sync-dispatch-20261101-v1',baselineRevision:null,units:units.map(unit=>({id:unit.id,planner:'forward-project-paired',manifestPath:unit.id+'.json',nativeRoot:'rust/src',watched:[{path:unit.entry,language:'Rust'},{path:unit.javascript,language:'JavaScript'},{path:unit.typescript,language:'TypeScript'},...['Cargo.toml','rust/Cargo.toml','Cargo.lock'].map(path=>({path,language:'Rust'}))]}))};
 write('bulk.json',JSON.stringify(bulk));commit();const options={root,manifestPath:'bulk.json'};
 const edit=(index,next)=>{for(const name of [units[index].javascript,units[index].typescript]){const before=read(name);assert.ok(before.includes('dispatch_before_雪'));write(name,before.replace('dispatch_before_雪',next));}};
 return {root,units,native,bulk,write,read,git,commit,options,edit,save:()=>write('bulk.json',JSON.stringify(bulk)),plan:()=>planPairedSyncDispatch(options),apply:plan=>applyPairedSyncDispatch(JSON.stringify(plan),options)};
}
test('two independently checked canonical pairs merge one identical complete native output',limits,async t=>{
 const api=fixture(t);api.edit(0,'dispatch_after_😀');api.edit(1,'dispatch_after_😀');const authored=api.units.flatMap(unit=>[unit.javascript,unit.typescript]).map(path=>[path,api.read(path)]),plan=api.plan();
 assert.deepEqual(plan.units.map(row=>row.disposition),['reconciled','reconciled']);assert.deepEqual(plan.units.map(row=>row.selectedProducer),['fresh-paired-reconciliation','fresh-paired-reconciliation']);
 assert.equal(plan.outputs.filter(row=>row.path==='rust/src/lib.rs').length,1);assert.equal(plan.outputs.filter(row=>row.kind==='complete-paired-reconciliation-review').length,2);for(const [name]of authored)assert.equal(plan.outputs.some(row=>row.path===name),false);
 const native=plan.outputs.find(row=>row.path==='rust/src/lib.rs');assert.equal(native.before,api.native);assert.equal(native.inverse,api.native);assert.ok(native.after.includes('dispatch_after_😀'));assert.ok(plan.equations.some(row=>row.path==='rust/src/lib.rs'));
 await api.apply(plan);assert.equal(api.read('rust/src/lib.rs'),native.after);for(const [name,source]of authored)assert.equal(api.read(name),source);
 for(const unit of api.units){const loaded=await import(pathToFileURL(join(api.root,unit.javascript)));assert.equal(loaded.translated.label(),'dispatch_after_😀');}
 const unit=api.units[0];await verifyTypedTargets({javascript:api.read(unit.javascript),typescript:api.read(unit.typescript),meta:{entry:unit.entry}},target=>assert.equal(target.label(),'dispatch_after_😀'),{childTimeoutMs:20000});
 api.commit();const noOp=api.plan();assert.deepEqual(noOp.outputs,[]);assert.deepEqual(noOp.units.map(row=>row.disposition),['no-op','no-op']);assert.deepEqual(api.plan(),noOp);
});
test('different independently valid paired native results conflict before any file is installed',limits,t=>{
 const api=fixture(t);api.edit(0,'first_changed');api.edit(1,'second_changed');const before=api.units.flatMap(unit=>[unit.javascript,unit.typescript,unit.meta]).map(name=>[name,api.read(name)]);
 assert.throws(()=>api.plan(),/competing bulk outputs/u);assert.equal(api.read('rust/src/lib.rs'),api.native);for(const [name,source]of before)assert.equal(api.read(name),source);
});
test('one differing edited peer refuses through its actual inverse agreement rather than dispatch DATA',limits,t=>{
 const api=fixture(t);api.edit(0,'matching_first');api.edit(1,'matching_first');const second=api.units[1];api.write(second.typescript,api.read(second.typescript).replace('matching_first','differing_second'));
 assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.equal(api.read('rust/src/lib.rs'),api.native);assert.ok(api.read(second.typescript).includes('differing_second'));
});
test('unchanged other unit cannot authorize a generated write to its captured native dependency',limits,t=>{
 const api=fixture(t);api.edit(0,'first_changed');const untouched=api.read(api.units[1].javascript);assert.throws(()=>api.plan(),/cross-unit dependency output lacks independently agreed/u);assert.equal(api.read(api.units[1].javascript),untouched);assert.equal(api.read('rust/src/lib.rs'),api.native);
});
test('noncanonical paired trivia and native concurrent edits keep all authored peers',limits,t=>{
 const api=fixture(t);api.edit(0,'both_changed');api.edit(1,'both_changed');const first=api.units[0],authored=api.read(first.typescript)+'\n// separately authored trivia\n';api.write(first.typescript,authored);assert.throws(()=>api.plan());assert.equal(api.read(first.typescript),authored);
 api.write(first.typescript,authored.replace('\n// separately authored trivia\n',''));api.write(first.entry,api.native+'\n// concurrent original\n');assert.throws(()=>api.plan(),/concurrent-reconciliation/u);assert.ok(api.read(first.entry).includes('concurrent original'));
});
test('explicit new planner kind is required; legacy bulk and ordinary forward kinds keep concurrent refusal',limits,t=>{
 const api=fixture(t);api.edit(0,'both_changed');api.edit(1,'both_changed');api.bulk.units[0].planner='forward-project';api.save();assert.throws(()=>api.plan(),/concurrent-reconciliation/u);
 api.bulk.schema='router-paired-sync-bulk-20261101-v1';api.bulk.units.forEach(unit=>{unit.planner='forward-project';});api.save();assert.throws(()=>planPairedSyncBulk(api.options),/concurrent-reconciliation/u);
});
test('single-language dispatch keeps original forward checks and still protects another captured dependency',limits,t=>{
 const api=fixture(t),unit=api.units[0];api.bulk.units=[api.bulk.units[0]];api.save();api.write(unit.javascript,api.read(unit.javascript).replace('dispatch_before_雪','single_changed'));
 const plan=api.plan();assert.equal(plan.units[0].selectedProducer,'original-forward-project');assert.equal(plan.units[0].authority,'JavaScript');assert.ok(plan.outputs.some(row=>row.path===unit.typescript));
});
test('complete bulk/child ancestor coordinate must agree exactly',limits,t=>{
 const api=fixture(t),baseline=api.git(['rev-parse','HEAD']).trim();api.edit(0,'both_changed');api.edit(1,'both_changed');api.write('checkpoint.txt','later commit');api.git(['add','checkpoint.txt']);api.git(['commit','--quiet','-m','Unrelated current revision']);api.bulk.baselineRevision=baseline;api.save();
 assert.throws(()=>api.plan(),/child and bulk baseline coordinates differ/u);
 for(const unit of api.units)api.write(unit.id+'.json',JSON.stringify({...unit,baselineRevision:baseline}));const plan=api.plan();assert.equal(plan.sourceBaselineRevision,baseline);assert.equal(plan.units[0].disposition,'reconciled');
});
test('topology deletion and byte-exact rename stay DATA review and never reach paired installation',limits,t=>{
 const api=fixture(t);api.edit(0,'both_changed');api.edit(1,'both_changed');api.write('rust/src/renamed.rs',api.native);rmSync(join(api.root,'rust/src/lib.rs'));
 assert.throws(()=>api.plan(),error=>{assert.match(error.message,/topology-reconciliation/u);assert.deepEqual(error.review.renames,[{language:'Rust',from:'rust/src/lib.rs',to:'rust/src/renamed.rs'}]);assert.equal(error.review.semanticAuthority,false);return true;});assert.equal(api.read('rust/src/renamed.rs'),api.native);
});
test('forged native output, later paired edit and current revision cannot install a saved batch',limits,async t=>{
 const api=fixture(t);api.edit(0,'both_changed');api.edit(1,'both_changed');const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path==='rust/src/lib.rs').after+='\npub fn injected(){}\n';await assert.rejects(api.apply(forged),/fresh source translation/u);
 const unit=api.units[1],ts=api.read(unit.typescript);api.write(unit.typescript,ts.replace('both_changed','later_authored'));await assert.rejects(api.apply(plan));assert.equal(api.read('rust/src/lib.rs'),api.native);api.write(unit.typescript,ts);api.write('revision.txt','new');api.commit();await assert.rejects(api.apply(plan));assert.equal(api.read('rust/src/lib.rs'),api.native);
});
test('copied cold batch reissues both original checker paths and refuses linked ancestors',limits,async t=>{
 const api=fixture(t);api.edit(0,'copied_changed');api.edit(1,'copied_changed');const copy=mkdtempSync(join(tmpdir(),'router-dispatch-copy-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));cpSync(api.root,copy,{recursive:true});
 const options={root:copy,manifestPath:'bulk.json'},plan=planPairedSyncDispatch(options);await applyPairedSyncDispatch(JSON.stringify(plan),options);assert.ok(readFileSync(join(copy,'rust/src/lib.rs'),'utf8').includes('copied_changed'));assert.equal(api.read('rust/src/lib.rs'),api.native);
 rmSync(join(api.root,'rust/src'),{recursive:true});symlinkSync(join(copy,'rust/src'),join(api.root,'rust/src'));assert.throws(()=>api.plan(),/ancestor|directory/u);
});
test('copied DATA inspector remains conservative for exact text, mode changes and concurrent languages',()=>{
 const source=text=>({source:text,mode:0o644}),rows=[{path:'js/src/a.mjs',language:'JavaScript',baseline:source('before'),current:source('after')},{path:'ts/src/a.mts',language:'TypeScript',baseline:source('before'),current:source('after')}];
 const result=inspectPairedSyncDispatchEdits(rows);assert.equal(result.disposition,'concurrent-reconciliation');assert.equal(result.semanticAuthority,false);assert.equal(result.authority,null);assert.deepEqual(result.changedLanguages,['JavaScript','TypeScript']);
});
test('shared DATA guard requires every consuming child to agree on full before/after bytes and mode',()=>{
 const output={path:'rust/src/lib.rs',before:'native before',after:'native after',mode:0o644},child=id=>({id,inputs:new Map([[output.path,output.before]]),outputs:new Map([[output.path,{...output}]])}),first=child('first'),second=child('second');
 assert.doesNotThrow(()=>assertPairedSyncChildAfterAgreement([first,second],new Map([[output.path,output]])));
 second.outputs.clear();assert.throws(()=>assertPairedSyncChildAfterAgreement([first,second],new Map([[output.path,output]])),/cross-unit dependency/u);second.outputs.set(output.path,{...output,after:'different'});assert.throws(()=>assertPairedSyncChildAfterAgreement([first,second],new Map([[output.path,output]])));
 second.outputs.set(output.path,{...output,mode:0o755});assert.throws(()=>assertPairedSyncChildAfterAgreement([first,second],new Map([[output.path,output]])));second.outputs.set(output.path,{...output});second.inputs.set(output.path,'different original');assert.throws(()=>assertPairedSyncChildAfterAgreement([first,second],new Map([[output.path,output]])));
});
test('both complete pre-fix source snapshots rejoin actual shared-guard modules and exact CST inverses',limits,()=>{
 const plan=preparePairedSyncDispatchSourceEquations();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.includes('assertPairedSyncChildAfterAgreement(children,outputs)'));}
 assert.equal(plan.preserved.length,2);for(const row of plan.preserved)assert.equal(row.before+row.appended,row.after);assert.equal(plan.receivingExecuted,false);
});
