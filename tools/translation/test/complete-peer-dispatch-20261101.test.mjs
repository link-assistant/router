// Independent all-seven-edit-set batch case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planCompletePeerDispatch,applyCompletePeerDispatch} from '../complete-peer-dispatch-20261101.mjs';
import {prepareCompletePeerDispatchSourceEquations} from '../complete-peer-dispatch-20261101-source-equations.mjs';
import {planPairedSyncDispatch} from '../paired-sync-dispatch-20261101.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},beforeValue='complete_before_雪',afterValue='complete_after_😀';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-complete-dispatch-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,source)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),source);},read=name=>readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Complete source fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Exact common complete-peer baseline']);};
 const native='pub fn label()->&\'static str{"complete_before_雪"}\npub fn count()->u64{7_u64}\n',units=['first','second'].map(id=>({schema:'router-forward-project-unit-v1',id,entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/'+id+'.mjs',typescript:'ts/src/'+id+'.mts',meta:'translation/'+id+'.json',inverse:'literals'}));
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));write('rust/src/lib.rs',native);for(const unit of units)write(unit.id+'.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 for(const unit of units){const options={root,manifestPath:unit.id+'.json'};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(options)),options);}
 const bulk={schema:'router-complete-peer-dispatch-20261101-v1',baselineRevision:null,units:units.map(unit=>({id:unit.id,planner:'forward-project-complete',manifestPath:unit.id+'.json',nativeRoot:'rust/src',watched:[{path:unit.entry,language:'Rust'},{path:unit.javascript,language:'JavaScript'},{path:unit.typescript,language:'TypeScript'},...['Cargo.toml','rust/Cargo.toml','Cargo.lock'].map(path=>({path,language:'Rust'}))]}))};write('bulk.json',JSON.stringify(bulk));commit();const options={root,manifestPath:'bulk.json'};
 const edit=(languages,to=afterValue,indices=[0,1])=>{const paths=[];if(languages.includes('Rust'))paths.push('rust/src/lib.rs');for(const index of indices){if(languages.includes('JavaScript'))paths.push(units[index].javascript);if(languages.includes('TypeScript'))paths.push(units[index].typescript);}for(const name of paths){const source=read(name);assert.ok(source.includes(beforeValue));write(name,source.replace(beforeValue,to));}return paths;};
 return {root,units,native,bulk,options,write,read,git,commit,edit,save:()=>write('bulk.json',JSON.stringify(bulk)),plan:()=>planCompletePeerDispatch(options),apply:plan=>applyCompletePeerDispatch(JSON.stringify(plan),options)};
}
// Independently written expected routes, not derived from implementation tables.
const combinations=[
 {languages:['Rust'],producer:'original-forward-project',writesNative:false},
 {languages:['JavaScript'],producer:'original-forward-project',writesNative:true},
 {languages:['TypeScript'],producer:'original-forward-project',writesNative:true},
 {languages:['JavaScript','TypeScript'],producer:'fresh-paired-reconciliation',writesNative:true},
 {languages:['Rust','JavaScript'],producer:'fresh-triple-reconciliation',writesNative:false},
 {languages:['Rust','TypeScript'],producer:'fresh-triple-reconciliation',writesNative:false},
 {languages:['Rust','JavaScript','TypeScript'],producer:'fresh-triple-reconciliation',writesNative:false},
];
for(const combination of combinations)test('complete two-unit batch: '+combination.languages.join(' + '),limits,async t=>{
 const api=fixture(t),paths=api.edit(combination.languages),authored=new Map(paths.map(name=>[name,api.read(name)])),plan=api.plan();
 assert.deepEqual(plan.units.map(row=>row.changedLanguages),[combination.languages,combination.languages]);assert.deepEqual(plan.units.map(row=>row.selectedProducer),[combination.producer,combination.producer]);
 const writes=plan.outputs.filter(row=>row.before!==row.after);assert.equal(writes.some(row=>row.path==='rust/src/lib.rs'),combination.writesNative);assert.equal(plan.outputs.filter(row=>row.path==='rust/src/lib.rs').length,combination.writesNative?1:0);
 for(const name of paths)assert.equal(writes.some(row=>row.path===name),false);for(const row of plan.outputs)assert.equal(row.inverse,row.before);await api.apply(plan);for(const [name,source]of authored)assert.equal(api.read(name),source);assert.equal(api.read('rust/src/lib.rs'),api.native.replace(beforeValue,afterValue));
 for(const unit of api.units){assert.ok(api.read(unit.javascript).includes(afterValue));assert.ok(api.read(unit.typescript).includes(afterValue));const loaded=await import(pathToFileURL(join(api.root,unit.javascript)));assert.equal(loaded.translated.label(),afterValue);assert.equal(loaded.translated.count(),7n);}
 const unit=api.units[0];await verifyTypedTargets({javascript:api.read(unit.javascript),typescript:api.read(unit.typescript),meta:{entry:unit.entry}},target=>{assert.equal(target.label(),'complete_after_😀');assert.equal(target.count(),7n);},{childTimeoutMs:20000});api.commit();assert.deepEqual(api.plan().outputs,[]);
});
test('complete-kind unchanged batch retains deterministic bookkeeping no-op without semantic authority',limits,async t=>{
 const api=fixture(t),plan=api.plan();assert.deepEqual(plan.outputs,[]);assert.deepEqual(plan.units.map(row=>row.disposition),['no-op','no-op']);assert.deepEqual(plan.units.map(row=>row.selectedProducer),[null,null]);assert.deepEqual(api.plan(),plan);assert.deepEqual((await api.apply(plan)).changed,[]);assert.equal(plan.semanticAuthority,false);assert.equal(plan.runtimeParity,false);
});
test('different real routes may share authored native source without changing that source',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript'],afterValue,[0]);api.edit(['TypeScript'],afterValue,[1]);const plan=api.plan();assert.deepEqual(plan.units.map(row=>row.selectedProducer),['fresh-triple-reconciliation','fresh-triple-reconciliation']);assert.deepEqual(plan.units.map(row=>row.changedLanguages),[['Rust','JavaScript'],['Rust','TypeScript']]);assert.equal(plan.outputs.some(row=>row.path==='rust/src/lib.rs'),false);await api.apply(plan);assert.ok(api.read(api.units[0].typescript).includes(afterValue));assert.ok(api.read(api.units[1].javascript).includes(afterValue));
});
test('a native-only second unit uses original forward emission alongside a triple-reconciled first unit',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript'],afterValue,[0]);const plan=api.plan();assert.deepEqual(plan.units.map(row=>row.selectedProducer),['fresh-triple-reconciliation','original-forward-project']);assert.equal(plan.outputs.some(row=>row.path==='rust/src/lib.rs'),false);await api.apply(plan);assert.ok(api.read(api.units[1].typescript).includes(afterValue));
});
test('unchanged consuming unit refuses another unit native output before installation',limits,t=>{
 const api=fixture(t);api.edit(['JavaScript'],afterValue,[0]);const untouched=api.read(api.units[1].javascript);assert.throws(()=>api.plan(),/cross-unit dependency output lacks independently agreed/u);assert.equal(api.read('rust/src/lib.rs'),api.native);assert.equal(api.read(api.units[1].javascript),untouched);
});
test('differing paired native projections and triple authored-native conflicts remain complete conflicts',limits,t=>{
 const api=fixture(t);api.edit(['JavaScript','TypeScript'],'first_choice',[0]);api.edit(['JavaScript','TypeScript'],'second_choice',[1]);assert.throws(()=>api.plan(),/competing bulk outputs/u);assert.equal(api.read('rust/src/lib.rs'),api.native);
 api.write('rust/src/lib.rs',api.native.replace(beforeValue,'first_choice'));const native=api.read('rust/src/lib.rs');assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.equal(api.read('rust/src/lib.rs'),native);assert.ok(api.read(api.units[1].typescript).includes('second_choice'));
});
test('new kind cannot select away changed Cargo, topology, missing peers or authored native trivia',limits,t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);const cargo=api.read('Cargo.toml');api.write('Cargo.toml',cargo+'\n# independently edited Cargo\n');assert.throws(()=>api.plan(),/native\/Cargo edit/u);api.write('Cargo.toml',cargo);
 api.write('rust/src/added.rs','// topology change');assert.throws(()=>api.plan(),/topology-reconciliation/u);rmSync(join(api.root,'rust/src/added.rs'));api.write('rust/src/lib.rs',api.read('rust/src/lib.rs')+'\n// authored native trivia\n');assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.ok(api.read('rust/src/lib.rs').includes('authored native trivia'));
 api.write('rust/src/lib.rs',api.native.replace(beforeValue,afterValue));rmSync(join(api.root,api.units[0].typescript));assert.throws(()=>api.plan(),/topology-reconciliation/u);assert.ok(api.read(api.units[0].javascript).includes(afterValue));
});
test('old paired dispatcher retains original kind/domain while new schema remains closed',limits,t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript']);api.bulk.units.forEach(unit=>{unit.planner='forward-project-paired';});api.save();assert.throws(()=>api.plan(),/concurrent-reconciliation/u);
 api.bulk.schema='router-paired-sync-dispatch-20261101-v1';api.save();assert.throws(()=>planPairedSyncDispatch(api.options),/concurrent-reconciliation/u);api.bulk.schema='router-complete-peer-dispatch-20261101-v1';api.bulk.units[0].planner='trust-native';api.save();assert.throws(()=>api.plan(),/supported planner/u);
});
test('exact full baseline coordinates, forged outputs and later authored source cannot install saved batch',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','TypeScript']);const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.kind==='checked-unchanged-peer-projection').after+='\nexport const injected=true;\n';await assert.rejects(api.apply(forged),/fresh source translation/u);
 const current=api.read('rust/src/lib.rs');api.write('rust/src/lib.rs',current+'\n// later source');await assert.rejects(api.apply(plan));api.write('rust/src/lib.rs',current);api.bulk.baselineRevision='0'.repeat(40);api.save();assert.throws(()=>api.plan(),/baseline/u);
});
test('copied cold complete batch independently reissues checker paths; linked native ancestors refuse',limits,async t=>{
 const api=fixture(t);api.edit(['Rust','JavaScript','TypeScript']);const copy=mkdtempSync(join(tmpdir(),'router-complete-copy-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));cpSync(api.root,copy,{recursive:true});const options={root:copy,manifestPath:'bulk.json'},plan=planCompletePeerDispatch(options);await applyCompletePeerDispatch(JSON.stringify(plan),options);assert.equal(plan.outputs.some(row=>row.path.endsWith('.rs')),false);assert.ok(readFileSync(join(copy,'rust/src/lib.rs'),'utf8').includes(afterValue));
 rmSync(join(api.root,'rust/src'),{recursive:true});symlinkSync(join(copy,'rust/src'),join(api.root,'rust/src'));assert.throws(()=>api.plan(),/ancestor|directory/u);
});
test('complete immutable paired-dispatch origin reconstructs all new source with both CST phases and full inverse',limits,()=>{
 const plan=prepareCompletePeerDispatchSourceEquations();assert.equal(plan.inverse,plan.before);assert.equal(plan.equation.inverse,plan.before);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);assert.ok(plan.after.includes('planTripleSyncReconciliation'));assert.equal(plan.receivingExecuted,false);assert.equal(plan.semanticAuthority,false);
});
