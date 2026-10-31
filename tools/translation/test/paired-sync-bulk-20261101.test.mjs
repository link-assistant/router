// Independent receiving/edit/conflict case SOURCE. Entire file is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectPairedSyncEdits,planPairedSyncBulk,applyPairedSyncBulk} from '../paired-sync-bulk-20261101.mjs';
import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from '../forward-project-unit-synchronization.mjs';

const limits={timeout:60000};
const state=(source,mode=0o644)=>({source,mode:source===null?null:mode});
const row=(path,language,before,after)=>({path,language,baseline:state(before),current:state(after)});
test('complete equal bytes and modes produce deterministic bookkeeping no-op only',()=>{
 const rows=[row('ts/src/a.mts','TypeScript','// 雪😀\n','// 雪😀\n'),row('rust/src/lib.rs','Rust','pub fn a(){}','pub fn a(){}')];
 const result=inspectPairedSyncEdits(rows);assert.equal(result.disposition,'no-op');assert.equal(result.authority,null);assert.deepEqual(result.edits,[]);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceAuthority,false);
 assert.deepEqual(inspectPairedSyncEdits([...rows].reverse()),result);
});
for(const language of ['Rust','JavaScript','TypeScript'])test(language+' same-language independent dependency edits select one direction',()=>{
 const result=inspectPairedSyncEdits([row('source/a',''+language,'first','first edited'),row('source/b',language,'second','second edited')]);
 assert.equal(result.disposition,'translate');assert.equal(result.authority,language);assert.deepEqual(result.edits.map(item=>item.inverse),['first','second']);
});
test('simultaneous paired edits remain conflicts even when textual edits are identical',()=>{
 const result=inspectPairedSyncEdits([row('js/src/a.mjs','JavaScript','before','after'),row('ts/src/a.mts','TypeScript','before','after')]);
 assert.equal(result.disposition,'concurrent-reconciliation');assert.equal(result.authority,null);assert.deepEqual(result.changedLanguages,['JavaScript','TypeScript']);
 assert.equal(result.edits[0].before,'before');assert.equal(result.edits[1].after,'after');
});
test('Rust and target edits preserve differing complete originals in conflict review',()=>{
 const result=inspectPairedSyncEdits([row('rust/src/lib.rs','Rust','native before','native after'),row('js/src/a.mjs','JavaScript','js before','js after')]);
 assert.equal(result.disposition,'concurrent-reconciliation');assert.deepEqual(result.edits.map(item=>[item.path,item.before,item.after]),[['js/src/a.mjs','js before','js after'],['rust/src/lib.rs','native before','native after']]);
});
test('unique byte-exact rename is explicit topology DATA and never an implicit delete',()=>{
 const result=inspectPairedSyncEdits([row('rust/src/old.rs','Rust','// unchanged 雪\n',null),row('rust/src/new.rs','Rust',null,'// unchanged 雪\n')]);
 assert.equal(result.disposition,'topology-reconciliation');assert.deepEqual(result.renames,[{language:'Rust',from:'rust/src/old.rs',to:'rust/src/new.rs'}]);assert.deepEqual(result.deletions,[]);assert.deepEqual(result.additions,[]);assert.equal(result.authority,null);
});
test('ambiguous copies, changed rename bytes and cross-language moves retain additions/deletions',()=>{
 const ambiguous=inspectPairedSyncEdits([row('old/a','Rust','same',null),row('old/b','Rust','same',null),row('new/a','Rust',null,'same')]);
 assert.deepEqual(ambiguous.renames,[]);assert.deepEqual(ambiguous.deletions,['old/a','old/b']);assert.deepEqual(ambiguous.additions,['new/a']);
 for(const added of [row('new/a','Rust',null,'changed'),row('new/a','JavaScript',null,'same')])assert.deepEqual(inspectPairedSyncEdits([row('old/a','Rust','same',null),added]).renames,[]);
});
test('deletion, addition, mode-only edits and exact UTF8 differences stay visible',()=>{
 assert.equal(inspectPairedSyncEdits([row('rust/src/a.rs','Rust','before',null)]).disposition,'topology-reconciliation');
 const changed=row('js/src/a.mjs','JavaScript','same','same');changed.current.mode=0o755;assert.equal(inspectPairedSyncEdits([changed]).disposition,'translate');
 const unicode=inspectPairedSyncEdits([row('js/src/a.mjs','JavaScript','é','e\u0301')]);assert.equal(unicode.edits.length,1);assert.equal(unicode.edits[0].inverse,'é');
});
test('closed source DATA refuses getters, proxies, sparse rows, duplicate and escaping paths',()=>{
 const original=row('js/src/a.mjs','JavaScript','old','new');
 for(const value of [[original,original],[{...original,path:'../escape'}],[{...original,current:{source:'new',mode:0o777}}],[{...original,permit:true}],new Array(1)])assert.throws(()=>inspectPairedSyncEdits(value));
 let calls=0;const getter={...original};Object.defineProperty(getter,'current',{enumerable:true,get(){calls++;return state('new');}});assert.throws(()=>inspectPairedSyncEdits([getter]));assert.equal(calls,0);
 assert.throws(()=>inspectPairedSyncEdits([new Proxy(original,{})]));
});

function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-paired-bulk-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,text)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),text);};
 const read=name=>readFileSync(join(root,name),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Source fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 const commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Common exact source baseline']);};
 const unit={schema:'router-forward-project-unit-v1',id:'bulk',entry:'rust/src/lib.rs',authority:'auto',javascript:'js/src/bulk.mjs',typescript:'ts/src/bulk.mts',meta:'translation/bulk.json',inverse:'literals'};
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));
 write(unit.entry,'pub fn label()->&\'static str{"before_bulk_雪"}\n');write('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 const originalOptions={root,manifestPath:'unit.json'},initial=planForwardProjectUnitSynchronization(originalOptions);applyForwardProjectUnitSynchronization(JSON.stringify(initial),originalOptions);
 const watched=[{path:unit.entry,language:'Rust'},{path:unit.javascript,language:'JavaScript'},{path:unit.typescript,language:'TypeScript'},...['Cargo.toml','rust/Cargo.toml','Cargo.lock'].map(path=>({path,language:'Rust'}))];
 const bulk={schema:'router-paired-sync-bulk-20261101-v1',baselineRevision:null,units:[{id:'bulk',planner:'forward-project',manifestPath:'unit.json',nativeRoot:'rust/src',watched}]};write('bulk.json',JSON.stringify(bulk));commit();
 const options={root,manifestPath:'bulk.json'};return {root,unit,bulk,write,read,git,commit,options,plan:()=>planPairedSyncBulk(options),apply:plan=>applyPairedSyncBulk(JSON.stringify(plan),options)};
}
test('copied cold project is deterministic on no-op and remains no-op after installation',limits,async t=>{
 const api=fixture(t),plan=api.plan();assert.deepEqual(plan.outputs,[]);assert.equal(plan.units[0].disposition,'no-op');assert.deepEqual(api.plan(),plan);assert.deepEqual((await api.apply(plan)).changed,[]);
 const copy=mkdtempSync(join(tmpdir(),'router-paired-cold-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));cpSync(api.root,copy,{recursive:true});
 const cold=planPairedSyncBulk({root:copy,manifestPath:'bulk.json'});assert.deepEqual(cold.outputs,[]);assert.deepEqual(cold.units,plan.units);assert.equal(cold.crossInvocationCache,false);
});
for(const language of ['Rust','JavaScript','TypeScript'])test(language+' edit uses actual compiler/inverse; second edit uses the new exact baseline',limits,async t=>{
 const api=fixture(t),name=language==='Rust'?api.unit.entry:language==='JavaScript'?api.unit.javascript:api.unit.typescript;
 const original=api.read(name);assert.ok(original.includes('before_bulk_雪'));api.write(name,original.replace('before_bulk_雪','after_bulk_😀'));
 const plan=api.plan();assert.equal(plan.units[0].authority,language);assert.ok(plan.equations.length>=2);for(const output of plan.outputs)assert.equal(output.inverse,output.before);
 const installed=await api.apply(plan);assert.ok(installed.changed.length>=2);assert.ok(api.read(api.unit.entry).includes('after_bulk_😀'));assert.ok(api.read(api.unit.javascript).includes('after_bulk_😀'));assert.ok(api.read(api.unit.typescript).includes('after_bulk_😀'));
 api.commit();assert.deepEqual(api.plan().outputs,[]);api.write(api.unit.entry,api.read(api.unit.entry).replace('after_bulk_😀','second_bulk_雪'));const second=api.plan();assert.equal(second.units[0].authority,'Rust');await api.apply(second);assert.ok(api.read(api.unit.typescript).includes('second_bulk_雪'));
});
test('concurrent identical/differing paired edits and source deletion never overwrite originals',limits,t=>{
 const api=fixture(t),js=api.read(api.unit.javascript),ts=api.read(api.unit.typescript);
 for(const next of ['same_edited_雪','different_edited_😀']){
  api.write(api.unit.javascript,js.replace('before_bulk_雪','same_edited_雪'));api.write(api.unit.typescript,ts.replace('before_bulk_雪',next));
  assert.throws(()=>api.plan(),/concurrent-reconciliation/u);assert.ok(api.read(api.unit.javascript).includes('same_edited_雪'));assert.ok(api.read(api.unit.typescript).includes(next));
 }
 api.write(api.unit.javascript,js);api.write(api.unit.typescript,ts);rmSync(join(api.root,api.unit.javascript));assert.throws(()=>api.plan(),/topology-reconciliation/u);assert.equal(api.read(api.unit.typescript),ts);
});
test('deleted native inventory and byte-exact rename refuse with all other sources retained',limits,t=>{
 const api=fixture(t);api.write('rust/src/unused.rs','// standalone source 雪\n');api.commit();api.write('rust/src/renamed.rs',api.read('rust/src/unused.rs'));rmSync(join(api.root,'rust/src/unused.rs'));
 assert.throws(()=>api.plan(),error=>{assert.match(error.message,/topology-reconciliation/u);assert.deepEqual(error.review.renames,[{language:'Rust',from:'rust/src/unused.rs',to:'rust/src/renamed.rs'}]);assert.equal(error.review.semanticAuthority,false);return true;});assert.equal(api.read('rust/src/renamed.rs'),'// standalone source 雪\n');
});
test('saved no-op cannot hide later edits, forged outputs, changed manifest or revision',limits,async t=>{
 const api=fixture(t),saved=api.plan(),js=api.read(api.unit.javascript);api.write(api.unit.javascript,js.replace('before_bulk_雪','authored_after_plan'));
 await assert.rejects(api.apply(saved));assert.ok(api.read(api.unit.javascript).includes('authored_after_plan'));api.write(api.unit.javascript,js);
 const forged=structuredClone(saved);forged.outputs.push({path:api.unit.javascript,before:js,after:'export const injected=true;',inverse:js,mode:0o644,kind:'paired-javascript'});await assert.rejects(api.apply(forged),/fresh source translation/u);
 api.write('bulk.json',JSON.stringify({...api.bulk,extra:true}));await assert.rejects(api.apply(saved));api.write('bulk.json',JSON.stringify(api.bulk));api.write('revision.txt','new');api.commit();await assert.rejects(api.apply(saved),/fresh source translation/u);
});
test('missing declared dependency, omitted Cargo input and linked native census fail closed',limits,t=>{
 const api=fixture(t);api.bulk.units[0].watched.push({path:'missing.mjs',language:'JavaScript'});api.write('bulk.json',JSON.stringify(api.bulk));assert.throws(()=>api.plan(),/missing from baseline and current/u);api.bulk.units[0].watched.pop();
 api.bulk.units[0].watched=api.bulk.units[0].watched.filter(row=>row.path!=='Cargo.lock');api.write('bulk.json',JSON.stringify(api.bulk));assert.throws(()=>api.plan(),/Cargo\/workspace dependency omitted/u);
 api.bulk.units[0].watched.push({path:'Cargo.lock',language:'Rust'});api.write('bulk.json',JSON.stringify(api.bulk));api.write('outside.rs','// external');symlinkSync(join(api.root,'outside.rs'),join(api.root,'rust/src/linked.rs'));assert.throws(()=>api.plan(),/linked native tree/u);
});

// Additive independent cross-unit regression SOURCE. All preceding cases are
// preserved byte-for-byte in the retained complete pre-fix source snapshot.
function secondBulkUnit(api){
 const unit={...api.unit,id:'second',javascript:'js/src/second.mjs',typescript:'ts/src/second.mts',meta:'translation/second.json'},manifestPath='second-unit.json';
 api.write(manifestPath,JSON.stringify(unit));const options={root:api.root,manifestPath};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(options)),options);
 api.bulk.units.push({id:'second',planner:'forward-project',manifestPath,nativeRoot:'rust/src',watched:[{path:unit.entry,language:'Rust'},{path:unit.javascript,language:'JavaScript'},{path:unit.typescript,language:'TypeScript'},...['Cargo.toml','rust/Cargo.toml','Cargo.lock'].map(path=>({path,language:'Rust'}))]});api.write('bulk.json',JSON.stringify(api.bulk));api.commit();return unit;
}
test('original bulk no-op consumer cannot silently retain a stale native dependency',limits,t=>{
 const api=fixture(t),second=secondBulkUnit(api),untouched=api.read(second.javascript);api.write(api.unit.javascript,api.read(api.unit.javascript).replace('before_bulk_雪','first_only_😀'));
 assert.throws(()=>api.plan(),/cross-unit dependency output lacks independently agreed/u);assert.equal(api.read(second.javascript),untouched);assert.ok(api.read(api.unit.entry).includes('before_bulk_雪'));
});
test('original bulk still merges shared native output when both real single-authority producers agree',limits,async t=>{
 const api=fixture(t),second=secondBulkUnit(api);for(const unit of [api.unit,second])api.write(unit.javascript,api.read(unit.javascript).replace('before_bulk_雪','both_agreed_😀'));
 const plan=api.plan();assert.equal(plan.outputs.filter(row=>row.path===api.unit.entry).length,1);await api.apply(plan);for(const unit of [api.unit,second])assert.ok(api.read(unit.typescript).includes('both_agreed_😀'));assert.ok(api.read(api.unit.entry).includes('both_agreed_😀'));
});
