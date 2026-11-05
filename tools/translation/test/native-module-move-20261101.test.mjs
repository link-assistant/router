// Independent tiny real-project and guarded rollback case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planNativeLeafModuleMove,applyNativeLeafModuleMove} from '../native-module-move-20261101.mjs';
import {captureNativeLeafMoveSourceHistory} from '../native-module-move-20261101-source-history.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
function fixture(t,{explicit=false}={}){
 const root=fs.mkdtempSync(join(tmpdir(),'router-native-leaf-move-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(name,source)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),source);},read=name=>fs.readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Leaf source fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Complete native module baseline']);};
 const owner=(explicit?'#[path = "leaf.rs"]\n':'')+'pub mod leaf;\npub fn answer()->bool{leaf::value()}\npub fn count()->u64{leaf::number()}\n',leaf='// unchanged leaf Unicode 雪😀\npub fn value()->bool{true}\npub fn number()->u64{7_u64}\n';
 const unit={schema:'router-forward-project-unit-v1',id:'leaf',entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/leaf.mjs',typescript:'ts/src/leaf.mts',meta:'translation/leaf.json',inverse:'literals'};
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',fs.readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',fs.readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));write(unit.entry,owner);write('rust/src/leaf.rs',leaf);write('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();const initial={root,manifestPath:'unit.json'};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(initial)),initial);
 const request={schema:'router-native-leaf-module-move-20261101-v1',id:'leaf-move',entry:unit.entry,from:'rust/src/leaf.rs',to:'rust/src/renamed.rs',module:'leaf',javascript:unit.javascript,typescript:unit.typescript,meta:unit.meta,baselineRevision:null};write('move.json',JSON.stringify(request));commit();const options={root,manifestPath:'move.json'};
 return {root,unit,owner,leaf,request,write,read,git,commit,options,save:()=>write('move.json',JSON.stringify(request)),plan:()=>planNativeLeafModuleMove(options),apply:plan=>applyNativeLeafModuleMove(JSON.stringify(plan),options)};
}
for(const explicit of [false,true])test('actual '+(explicit?'explicit':'default')+' leaf relocation retains logical namespace, consumers and complete source',limits,async t=>{
 const api=fixture(t,{explicit}),js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript),plan=api.plan();assert.equal(plan.noOp,false);assert.equal(plan.moves.length,1);assert.equal(plan.moves[0].source,api.leaf);assert.equal(plan.moves[0].inverse.source,api.leaf);assert.ok(plan.equations.find(row=>row.path===api.unit.entry).history.inverse===api.owner);
 const result=api.apply(plan);assert.deepEqual(result.cleanupFailures,[]);assert.equal(fs.existsSync(join(api.root,api.request.from)),false);assert.equal(api.read(api.request.to),api.leaf);assert.ok(api.read(api.unit.entry).includes('#[path = "renamed.rs"]\npub mod leaf;'));assert.equal(api.read(api.unit.javascript),js);assert.equal(api.read(api.unit.typescript),ts);assert.deepEqual(fs.readdirSync(join(api.root,'rust/src')).sort(),['lib.rs','renamed.rs']);
 const loaded=await import(pathToFileURL(join(api.root,api.unit.javascript)));assert.equal(loaded.translated.answer(),true);assert.equal(loaded.translated.count(),7n);assert.equal(loaded.translated['leaf.value'](),true);assert.equal(loaded.translated['leaf.number'](),7n);
 await verifyTypedTargets({javascript:js,typescript:ts,meta:{entry:api.unit.entry}},target=>{assert.equal(target.answer(),true);assert.equal(target.count(),7n);assert.equal(target['leaf.value'](),true);assert.equal(target['leaf.number'](),7n);},{childTimeoutMs:20000});
 api.commit();const noOp=api.plan();assert.equal(noOp.noOp,true);assert.deepEqual(noOp.outputs,[]);assert.deepEqual(noOp.moves,[]);assert.deepEqual(api.plan(),noOp);assert.deepEqual(api.apply(noOp).changed,[]);
});
test('preexisting destination, changed source/Cargo/modes and incorrect logical name cannot become move permits',limits,t=>{
 const api=fixture(t);api.write(api.request.to,'// independently authored destination');assert.throws(()=>api.plan(),/unique original source/u);assert.equal(api.read(api.request.to),'// independently authored destination');fs.rmSync(join(api.root,api.request.to));api.write(api.request.from,api.leaf+'// authored change');assert.throws(()=>api.plan(),/differs from exact baseline/u);api.write(api.request.from,api.leaf);
 const cargo=api.read('Cargo.toml');api.write('Cargo.toml',cargo+'\n# changed configuration');assert.throws(()=>api.plan(),/differs from exact baseline/u);api.write('Cargo.toml',cargo);fs.chmodSync(join(api.root,api.request.from),0o755);assert.throws(()=>api.plan(),/differs from exact baseline/u);fs.chmodSync(join(api.root,api.request.from),0o644);api.request.module='other';api.save();assert.throws(()=>api.plan(),/original external module/u);
});
test('nested modules, include macros and unresolved consumers retain semantic/topology refusal',limits,t=>{
 const api=fixture(t);api.write(api.request.from,api.leaf+'mod nested {}\n');api.commit();assert.throws(()=>api.plan(),/root-owned external leaf|function-only/u);api.write(api.request.from,'pub fn value()->bool{include!("unknown.rs")}\n');api.commit();assert.throws(()=>api.plan(),/unknown producers|ordinary|semantic/u);
 api.write(api.request.from,api.leaf);api.write(api.unit.entry,api.owner.replace('leaf::value()','leaf::missing()'));api.commit();assert.throws(()=>api.plan(),/semantic|scope|baseline/u);
});
test('forged move/delete protocol, later owner edit and current revision never install saved proposals',limits,t=>{
 const api=fixture(t),plan=api.plan(),forged=structuredClone(plan);forged.moves[0].source='pub fn injected(){}';assert.throws(()=>api.apply(forged),/fresh native leaf checking/u);assert.equal(api.read(api.request.from),api.leaf);assert.equal(fs.existsSync(join(api.root,api.request.to)),false);
 api.write(api.unit.entry,api.owner+'\n// later owner source\n');assert.throws(()=>api.apply(plan));api.write(api.unit.entry,api.owner);api.write('checkpoint.txt','new revision');api.commit();assert.throws(()=>api.apply(plan),/fresh native leaf checking/u);assert.equal(api.read(api.request.from),api.leaf);
});
test('guarded adapter preserves primary failure and restores exact move/owner/targets after late metadata failure',limits,t=>{
 const api=fixture(t),plan=api.plan(),beforeMeta=api.read(api.unit.meta),rename=fs.renameSync,failure=new Error('independent injected metadata replacement failure');
 t.mock.method(fs,'renameSync',(from,to,...rest)=>{if(to===join(api.root,api.unit.meta))throw failure;return rename(from,to,...rest);});
 assert.throws(()=>api.apply(plan),error=>{assert.equal(error,failure);assert.deepEqual(error.rollbackFailures,[]);assert.deepEqual(error.recoveryPaths,[]);return true;});assert.equal(api.read(api.unit.entry),api.owner);assert.equal(api.read(api.request.from),api.leaf);assert.equal(fs.existsSync(join(api.root,api.request.to)),false);assert.equal(api.read(api.unit.meta),beforeMeta);assert.deepEqual(fs.readdirSync(join(api.root,'rust/src')).sort(),['leaf.rs','lib.rs']);
});
test('a destination appearing during the no-overwrite link is preserved and the original remains exact',limits,t=>{
 const api=fixture(t),plan=api.plan(),link=fs.linkSync;let raced=false;
 t.mock.method(fs,'linkSync',(from,to,...rest)=>{if(!raced&&to===join(api.root,api.request.to)){raced=true;fs.writeFileSync(to,'// independent racing destination',{flag:'wx'});}return link(from,to,...rest);});assert.throws(()=>api.apply(plan));assert.equal(api.read(api.request.from),api.leaf);assert.equal(api.read(api.request.to),'// independent racing destination');assert.equal(api.read(api.unit.entry),api.owner);
});
test('copied cold project moves its own exact leaf; linked source ancestors and malformed move scope refuse',limits,t=>{
 const api=fixture(t),copy=fs.mkdtempSync(join(tmpdir(),'router-leaf-copy-'));t.after(()=>fs.rmSync(copy,{recursive:true,force:true}));fs.cpSync(api.root,copy,{recursive:true});const options={root:copy,manifestPath:'move.json'},plan=planNativeLeafModuleMove(options);applyNativeLeafModuleMove(JSON.stringify(plan),options);assert.equal(fs.readFileSync(join(copy,api.request.to),'utf8'),api.leaf);assert.equal(api.read(api.request.from),api.leaf);
 api.request.to='rust/src/folder/renamed.rs';api.save();assert.throws(()=>api.plan(),/same-directory/u);api.request.to='rust/src/renamed.rs';api.save();fs.rmSync(join(api.root,'rust/src'),{recursive:true});fs.symlinkSync(join(copy,'rust/src'),join(api.root,'rust/src'));assert.throws(()=>api.plan(),/ancestor/u);
});
test('complete original transaction snapshot and authored adapter keep both CST phases and a full inverse',limits,()=>{
 const history=captureNativeLeafMoveSourceHistory();assert.equal(history.inverse,history.before);assert.equal(history.history.inverse,history.before);assert.deepEqual(history.trace.map(row=>row.phase),['language','repository']);assert.equal(history.freshnessQualified,false);assert.equal(history.receivingExecuted,false);
});
