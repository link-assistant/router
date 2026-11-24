// Independent native/JS/TS reconciliation case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,cpSync,chmodSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planTripleSyncReconciliation,applyTripleSyncReconciliation} from '../triple-sync-reconcile-20261101.mjs';
import {captureTripleSyncReconciliationSourceHistory} from '../triple-sync-reconcile-20261101-source-history.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-triple-reconcile-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,source)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),source);},read=name=>readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Triple source fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Exact committed triple baseline']);};
 const unit={schema:'router-forward-project-unit-v1',id:'triple',entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/triple.mjs',typescript:'ts/src/triple.mts',meta:'translation/triple.json',inverse:'literals'};
 const native='pub fn label()->&\'static str{"triple_before_雪"}\npub fn count()->u64{7_u64}\n';
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));write(unit.entry,native);write('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 const options={root,manifestPath:'unit.json'};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(options)),options);commit();
 const edit=(languages,from='triple_before_雪',to='triple_after_😀')=>{for(const language of languages){const name=language==='Rust'?unit.entry:language==='JavaScript'?unit.javascript:unit.typescript,before=read(name);assert.ok(before.includes(from));write(name,before.replace(from,to));}};
 return {root,unit,native,options,write,read,git,commit,edit,plan:()=>planTripleSyncReconciliation(options),apply:plan=>applyTripleSyncReconciliation(JSON.stringify(plan),options)};
}
for(const targets of [['JavaScript'],['TypeScript'],['JavaScript','TypeScript']])test('authored Rust + '+targets.join(' + ')+' agree exactly; only untouched peer can be installed',limits,async t=>{
 const api=fixture(t),languages=['Rust',...targets],authoredPaths=languages.map(language=>language==='Rust'?api.unit.entry:language==='JavaScript'?api.unit.javascript:api.unit.typescript);api.edit(languages);const authored=new Map(authoredPaths.map(name=>[name,api.read(name)])),plan=api.plan();
 assert.equal(plan.units[0].disposition,'reconciled');for(const name of authoredPaths)assert.equal(plan.outputs.some(row=>row.path===name),false);
 assert.equal(plan.outputs.filter(row=>row.kind==='checked-unchanged-peer-projection').length,targets.length===2?0:1);for(const row of plan.outputs)assert.equal(row.before,row.inverse);
 const nativeHistory=plan.equations.find(row=>row.path===api.unit.entry);assert.equal(nativeHistory.authored,true);assert.equal(nativeHistory.history.inverse,api.native);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
 await api.apply(plan);for(const [name,source]of authored)assert.equal(api.read(name),source);assert.ok(api.read(api.unit.javascript).includes('triple_after_😀'));assert.ok(api.read(api.unit.typescript).includes('triple_after_😀'));
 const loaded=await import(pathToFileURL(join(api.root,api.unit.javascript)));assert.equal(loaded.translated.label(),'triple_after_😀');assert.equal(loaded.translated.count(),7n);
 await verifyTypedTargets({javascript:api.read(api.unit.javascript),typescript:api.read(api.unit.typescript),meta:{entry:api.unit.entry}},target=>{assert.equal(target.label(),'triple_after_😀');assert.equal(target.count(),7n);},{childTimeoutMs:20000});
 api.commit();api.edit(['Rust','TypeScript'],'triple_after_😀','triple_second_雪');const second=api.plan();await api.apply(second);assert.ok(api.read(api.unit.javascript).includes('triple_second_雪'));
});
test('native plus peer conflicts and an extra authored native comment refuse instead of normalizing Rust',limits,t=>{
 const api=fixture(t);api.edit(['Rust'],'triple_before_雪','native_choice');api.edit(['JavaScript'],'triple_before_雪','target_choice');const native=api.read(api.unit.entry),js=api.read(api.unit.javascript);assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.equal(api.read(api.unit.entry),native);assert.equal(api.read(api.unit.javascript),js);
 api.write(api.unit.javascript,js.replace('target_choice','native_choice'));api.write(api.unit.entry,native+'\n// separately authored native trivia\n');const authored=api.read(api.unit.entry);assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.equal(api.read(api.unit.entry),authored);
});
test('all three edited languages require every independent target inverse to match actual native bytes',limits,t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript'],'triple_before_雪','first_choice');api.edit(['TypeScript'],'triple_before_雪','second_choice');const source=api.read(api.unit.typescript);assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.equal(api.read(api.unit.typescript),source);assert.ok(api.read(api.unit.entry).includes('first_choice'));
});
test('native-only, script-only and fully unchanged operations keep explicit existing API boundaries',limits,t=>{
 const api=fixture(t);assert.throws(()=>api.plan(),/actual native source edit/u);api.edit(['JavaScript']);assert.throws(()=>api.plan(),/actual native source edit/u);api.write(api.unit.javascript,api.read(api.unit.javascript).replace('triple_after_😀','triple_before_雪'));api.edit(['Rust']);assert.throws(()=>api.plan(),/native-only edits/u);
});
test('unchanged committed peer must be the exact original native projection',limits,t=>{
 const api=fixture(t);api.write(api.unit.typescript,api.read(api.unit.typescript)+'\n// stale committed peer\n');api.commit();api.edit(['Rust','JavaScript']);assert.throws(()=>api.plan(),/committed paired baseline differs/u);assert.ok(api.read(api.unit.entry).includes('triple_after_😀'));
});
test('Cargo, native topology, mode changes and missing current peer remain fail-closed',limits,t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);const cargo=api.read('Cargo.toml');api.write('Cargo.toml',cargo+'\n# concurrent config\n');assert.throws(()=>api.plan(),/native\/Cargo edit/u);api.write('Cargo.toml',cargo);
 api.write('rust/src/extra.rs','// unqualified new module');assert.throws(()=>api.plan(),/addition\/deletion\/rename/u);rmSync(join(api.root,'rust/src/extra.rs'));chmodSync(join(api.root,api.unit.entry),0o755);assert.throws(()=>api.plan(),/native source mode edit/u);chmodSync(join(api.root,api.unit.entry),0o644);
 rmSync(join(api.root,api.unit.typescript));assert.throws(()=>api.plan(),/both actual edited peers/u);assert.ok(api.read(api.unit.javascript).includes('triple_after_😀'));
});
test('unsupported changed target structure and explicit authority cannot grant native agreement',limits,t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);api.write(api.unit.javascript,api.read(api.unit.javascript)+'\nexport function unchecked(value){return value.anything();}\n');assert.throws(()=>api.plan());
 api.write('unit.json',JSON.stringify({...api.unit,authority:'Rust'}));assert.throws(()=>api.plan(),/auto authority/u);
});
test('forged untouched-peer output and later authored native changes cannot install a saved proposal',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.typescript).after+='\nexport const injected=true;\n';await assert.rejects(api.apply(forged),/fresh source translation/u);
 const native=api.read(api.unit.entry);api.write(api.unit.entry,native+'\n// later authored\n');await assert.rejects(api.apply(plan));assert.equal(api.read(api.unit.entry),native+'\n// later authored\n');assert.ok(api.read(api.unit.typescript).includes('triple_before_雪'));
});
test('exact ancestor baseline works across unrelated current commits and stale revisions refuse',limits,async t=>{
 const api=fixture(t),baseline=api.git(['rev-parse','HEAD']).trim();api.edit(['Rust','TypeScript']);api.write('checkpoint.txt','later current revision');api.git(['add','checkpoint.txt']);api.git(['commit','--quiet','-m','Unrelated checkpoint']);api.write('unit.json',JSON.stringify({...api.unit,baselineRevision:baseline}));
 const plan=api.plan();assert.equal(plan.sourceBaselineRevision,baseline);api.write('checkpoint.txt','another current revision');api.git(['add','checkpoint.txt']);api.git(['commit','--quiet','-m','Another checkpoint']);await assert.rejects(api.apply(plan),/fresh source translation/u);
});
test('copied cold project reissues native/target facts and linked ancestors refuse',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);const copy=mkdtempSync(join(tmpdir(),'router-triple-copy-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));cpSync(api.root,copy,{recursive:true});const options={root:copy,manifestPath:'unit.json'},plan=planTripleSyncReconciliation(options);await applyTripleSyncReconciliation(JSON.stringify(plan),options);assert.ok(readFileSync(join(copy,api.unit.typescript),'utf8').includes('triple_after_😀'));assert.ok(api.read(api.unit.typescript).includes('triple_before_雪'));
 rmSync(join(api.root,'rust/src'),{recursive:true});symlinkSync(join(copy,'rust/src'),join(api.root,'rust/src'));assert.throws(()=>api.plan(),/ancestor|directory/u);
});
test('full original paired planner remains exact and its additive native-source copy retains complete CST inverse',limits,()=>{
 const history=captureTripleSyncReconciliationSourceHistory();assert.equal(history.inverse,history.before);assert.equal(history.equation.inverse,history.before);assert.deepEqual(history.trace.map(row=>row.phase),['language','repository']);assert.equal(history.freshnessQualified,false);assert.equal(history.receivingExecuted,false);
});
