// Independent complete case SOURCE. UNRUN: execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,renameSync,symlinkSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planPairedSyncReconciliation,applyPairedSyncReconciliation} from '../paired-sync-reconcile-20261101.mjs';
import {createReconcileSourceCapture,boundedReconcileWireBytes} from '../paired-sync-reconcile-20261101-support.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
function fixture(t,replacement={}){
 const root=mkdtempSync(join(tmpdir(),'router-paired-reconcile-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,source)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),source);},read=name=>readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Independent paired fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Complete common paired baseline']);};
 const unit={schema:'router-forward-project-unit-v1',id:'paired',entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/paired.mjs',typescript:'ts/src/paired.mts',meta:'translation/paired.json',inverse:replacement.inverse??'literals'};
 const native=replacement.native??'pub fn label()->&\'static str{"paired_before_雪"}\npub fn count()->u64{7_u64}\n';
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));write(unit.entry,native);write('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 const options={root,manifestPath:'unit.json'},initial=planForwardProjectUnitSynchronization(options);applyForwardProjectUnitSynchronization(JSON.stringify(initial),options);commit();
 const change=(from,to)=>{for(const name of [unit.javascript,unit.typescript]){const before=read(name);assert.ok(before.includes(from));write(name,before.replace(from,to));}};
 return {root,unit,native,options,write,read,git,commit,change,manifest:change=>write('unit.json',JSON.stringify({...unit,...change})),plan:()=>planPairedSyncReconciliation(options),apply:plan=>applyPairedSyncReconciliation(JSON.stringify(plan),options)};
}
test('fresh actual original compiler reproduces unchanged pair deterministically without writes',limits,async t=>{
 const api=fixture(t),plan=api.plan();assert.equal(plan.units[0].disposition,'no-op');assert.deepEqual(plan.outputs,[]);assert.deepEqual(api.plan(),plan);assert.deepEqual((await api.apply(plan)).changed,[]);assert.equal(plan.semanticAuthority,false);assert.equal(plan.runtimeParity,false);
});
test('independent JS/TS Unicode literal edits agree through canonical Rust and retain both authored files',limits,async t=>{
 const api=fixture(t);api.change('paired_before_雪','paired_after_😀');const js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript),plan=api.plan();
 assert.equal(plan.units[0].disposition,'reconciled');assert.equal(plan.outputs.some(row=>[api.unit.javascript,api.unit.typescript].includes(row.path)),false);
 const native=plan.outputs.find(row=>row.path===api.unit.entry);assert.equal(native.before,api.native);assert.equal(native.inverse,api.native);assert.ok(native.after.includes('paired_after_😀'));assert.ok(native.after.includes('7_u64'));
 assert.equal(plan.equations.find(row=>row.path===api.unit.javascript).history.inverse,js);assert.equal(plan.equations.find(row=>row.path===api.unit.typescript).history.inverse,ts);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
 await api.apply(plan);assert.equal(api.read(api.unit.javascript),js);assert.equal(api.read(api.unit.typescript),ts);assert.equal(api.read(api.unit.entry),native.after);
 const loaded=await import(pathToFileURL(join(api.root,api.unit.javascript)));assert.equal(loaded.translated.label(),'paired_after_😀');assert.equal(loaded.translated.count(),7n);
 await verifyTypedTargets({javascript:js,typescript:ts,meta:{entry:api.unit.entry}},target=>{assert.equal(target.label(),'paired_after_😀');assert.equal(target.count(),7n);},{childTimeoutMs:20000});
 api.commit();assert.deepEqual(api.plan().outputs,[]);api.change('paired_after_😀','paired_second_雪');await api.apply(api.plan());assert.ok(api.read(api.unit.entry).includes('paired_second_雪'));
});
test('two independently changed scalar literals must both agree; a differing scalar preserves all sources',limits,t=>{
 const api=fixture(t);api.change('paired_before_雪','both_selected');
 const ts=api.read(api.unit.typescript);assert.ok(ts.includes('7n'));api.write(api.unit.typescript,ts.replace(/\b7n\b/u,'8n'));
 const before=[api.read(api.unit.entry),api.read(api.unit.javascript),api.read(api.unit.typescript)];assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);
 assert.deepEqual([api.read(api.unit.entry),api.read(api.unit.javascript),api.read(api.unit.typescript)],before);
});
test('return-expression family checks both actual formula edits and reproduces fixed Boolean vectors',limits,async t=>{
 const before='pub fn gate(first:bool,second:bool)->bool{first&&second}\n',after='pub fn gate(first:bool,second:bool)->bool{first||second}\n';
 const api=fixture(t,{inverse:'return-expressions',native:before}),authored=fixture(t,{inverse:'return-expressions',native:after});
 // The separate source-authored crate supplies complete canonical edit text;
 // expected behavior comes from fixed independent Boolean vectors below.
 api.write(api.unit.javascript,authored.read(authored.unit.javascript));api.write(api.unit.typescript,authored.read(authored.unit.typescript));
 const js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript),plan=api.plan();assert.equal(plan.units[0].disposition,'reconciled');await api.apply(plan);assert.equal(api.read(api.unit.javascript),js);assert.equal(api.read(api.unit.typescript),ts);
 await verifyTypedTargets({javascript:js,typescript:ts,meta:{entry:api.unit.entry}},target=>{for(const [first,second,expected]of [[false,false,false],[false,true,true],[true,false,true],[true,true,true]])assert.equal(target.gate(first,second),expected);},{childTimeoutMs:20000});
});
test('different literal values and harmless unauthorized extra trivia fail without canonicalizing authored files',limits,t=>{
 const api=fixture(t),js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript);api.write(api.unit.javascript,js.replace('paired_before_雪','one'));api.write(api.unit.typescript,ts.replace('paired_before_雪','two'));
 assert.throws(()=>api.plan(),/conflicting complete canonical Rust/u);assert.ok(api.read(api.unit.typescript).includes('two'));
 api.write(api.unit.typescript,ts.replace('paired_before_雪','one')+'\n// authored extra source\n');const authored=api.read(api.unit.typescript);assert.throws(()=>api.plan());assert.equal(api.read(api.unit.typescript),authored);
});
test('one peer, concurrent native source, Cargo and explicit authority cannot be selected away',limits,t=>{
 const api=fixture(t),js=api.read(api.unit.javascript);api.write(api.unit.javascript,js.replace('paired_before_雪','one'));assert.throws(()=>api.plan(),/one edited peer/u);
 api.write(api.unit.typescript,api.read(api.unit.typescript).replace('paired_before_雪','one'));api.write(api.unit.entry,api.native+'\n// concurrent original\n');assert.throws(()=>api.plan(),/concurrent native\/Cargo/u);api.write(api.unit.entry,api.native);
 const cargo=api.read('Cargo.toml');api.write('Cargo.toml',cargo+'\n# concurrent workspace\n');assert.throws(()=>api.plan(),/concurrent native\/Cargo/u);api.write('Cargo.toml',cargo);api.manifest({authority:'JavaScript'});assert.throws(()=>api.plan(),/auto authority/u);
});
test('a committed stale paired baseline cannot turn current edits into source authority',limits,t=>{
 const api=fixture(t);api.write(api.unit.javascript,api.read(api.unit.javascript)+'\n// stale committed peer\n');api.commit();api.change('paired_before_雪','both_next');assert.throws(()=>api.plan(),/committed paired baseline differs/u);
});
test('native additions/deletions/renames and missing peers retain explicit topology refusals',limits,t=>{
 const api=fixture(t),js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript);api.change('paired_before_雪','both_next');api.write('rust/src/added.rs','// new native source\n');assert.throws(()=>api.plan(),/addition\/deletion\/rename/u);rmSync(join(api.root,'rust/src/added.rs'));
 api.write(api.unit.javascript,js);api.write(api.unit.typescript,ts);api.write('rust/src/unused.rs','// original native source\n');api.commit();api.change('paired_before_雪','both_next');rmSync(join(api.root,'rust/src/unused.rs'));assert.throws(()=>api.plan(),/addition\/deletion\/rename/u);
 api.write('rust/src/renamed.rs','// original native source\n');assert.throws(()=>api.plan(),/addition\/deletion\/rename/u);rmSync(join(api.root,'rust/src/renamed.rs'));api.write('rust/src/unused.rs','// original native source\n');
 rmSync(join(api.root,api.unit.typescript));assert.throws(()=>api.plan(),/both actual edited peers/u);assert.ok(api.read(api.unit.javascript).includes('both_next'));
});
test('fresh complete reissue rejects altered native output, source edits and changed revision',limits,async t=>{
 const api=fixture(t);api.change('paired_before_雪','both_next');const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.entry).after+='\npub fn injected(){}\n';await assert.rejects(api.apply(forged),/fresh source translation/u);
 const ts=api.read(api.unit.typescript);api.write(api.unit.typescript,ts.replace('both_next','different_later'));await assert.rejects(api.apply(plan));assert.equal(api.read(api.unit.entry),api.native);api.write(api.unit.typescript,ts);
 api.write('revision.txt','new revision');api.commit();await assert.rejects(api.apply(plan));assert.equal(api.read(api.unit.entry),api.native);
});
test('cold copied project issues its own current checker facts without retained project state',limits,async t=>{
 const api=fixture(t);api.change('paired_before_雪','copied_next');const copy=mkdtempSync(join(tmpdir(),'router-reconcile-copied-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));cpSync(api.root,copy,{recursive:true});
 const options={root:copy,manifestPath:'unit.json'},plan=planPairedSyncReconciliation(options);assert.equal(plan.units[0].disposition,'reconciled');await applyPairedSyncReconciliation(JSON.stringify(plan),options);assert.ok(readFileSync(join(copy,api.unit.entry),'utf8').includes('copied_next'));assert.equal(api.read(api.unit.entry),api.native);
});
test('source DATA scope closes same-name directory replacement and latches caught/restored read failures',t=>{
 const root=mkdtempSync(join(tmpdir(),'router-reconcile-closing-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'rust/src'),{recursive:true});writeFileSync(join(root,'rust/src/lib.rs'),'// source 雪\n');
 const capture=createReconcileSourceCapture(root),tree=capture.census('rust/src');renameSync(join(root,'rust/src'),join(root,'rust/old'));mkdirSync(join(root,'rust/src'));writeFileSync(join(root,'rust/src/lib.rs'),'// source 雪\n');assert.throws(()=>capture.close(tree),/closing failures/u);
 const fresh=createReconcileSourceCapture(root);fresh.capture('rust/src/lib.rs');symlinkSync(join(root,'rust/src/lib.rs'),join(root,'linked.rs'));assert.throws(()=>fresh.capture('linked.rs'));rmSync(join(root,'linked.rs'));writeFileSync(join(root,'linked.rs'),'// restored ordinary source');assert.throws(()=>fresh.close(),/closing failures/u);
});
test('linked ancestors refuse before source enumeration or leaf reads',t=>{
 const root=mkdtempSync(join(tmpdir(),'router-reconcile-ancestor-')),outside=mkdtempSync(join(tmpdir(),'router-reconcile-outside-'));t.after(()=>rmSync(root,{recursive:true,force:true}));t.after(()=>rmSync(outside,{recursive:true,force:true}));
 mkdirSync(join(outside,'src'));writeFileSync(join(outside,'src/lib.rs'),'// external source');symlinkSync(outside,join(root,'rust'));
 const capture=createReconcileSourceCapture(root);assert.throws(()=>capture.census('rust/src'),/ancestor refused/u);assert.throws(()=>capture.capture('rust/src/lib.rs'),/ancestor refused/u);assert.throws(()=>capture.close(),/closing failures/u);
});
test('full wire accounting includes repeated DAG/string occurrences and refuses unsafe source DATA',()=>{
 const source={text:'雪😀\n"\\\u0000'},value={first:source,second:source};assert.equal(boundedReconcileWireBytes(value),Buffer.byteLength(JSON.stringify(value)));
 let called=0;const getter={};Object.defineProperty(getter,'source',{enumerable:true,get(){called++;return 'x';}});assert.throws(()=>boundedReconcileWireBytes(getter));assert.equal(called,0);
 const cycle={};cycle.self=cycle;assert.throws(()=>boundedReconcileWireBytes(cycle));assert.throws(()=>boundedReconcileWireBytes(new Proxy({},{})));
});
