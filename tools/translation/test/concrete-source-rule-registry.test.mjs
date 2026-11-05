// Independent complete source composition/replay cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcreteSourceRuleRegistry,applyConcreteSourceRulePlan,restoreConcreteSourceRulePlan} from '../concrete-source-rule-registry.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const input=()=>[
 {path:'rust/src/a.rs',language:'Rust',source:'pub fn pick()->bool{true}\r\n'},
 {path:'js/src/a.mjs',language:'JavaScript',source:'// 😀 unchanged\r\nconst value = [first.length, next];\r\n'},
 {path:'ts/src/a.mts',language:'TypeScript',source:'export const active: boolean = true;\n'},
];
const edit=(source,start,end,parts)=>({span:[start,end],expected:source.slice(start,end),parts});
function registry(calls=[]){return createConcreteSourceRuleRegistry([
 {id:'repository:child',phase:'repository',requires:['language:array'],plan:sources=>{
  calls.push('child');const source=sources[1].source,start=source.indexOf('first.length');return [{path:sources[1].path,templates:[edit(source,start,start+12,['length(first)'])]}];
 }},
 {id:'language:array',phase:'language',plan:sources=>{
  calls.push('array');assert.equal(Object.isFrozen(sources),true);assert.equal(Object.isFrozen(sources[1]),true);const source=sources[1].source,start=source.indexOf('['),end=source.indexOf(']')+1,left=source.indexOf('first.length'),right=source.indexOf('next');
  return [{path:sources[1].path,templates:[edit(source,start,end,['wrap(',{sourceSpan:[left,left+12]},', ',{sourceSpan:[right,right+4]},')'])]}];
 }},
 {id:'language:rust',phase:'language',plan:sources=>{const source=sources[0].source,start=source.indexOf('true');return [{path:sources[0].path,templates:[edit(source,start,start+4,['false'])]}];}},
 {id:'repository:typescript',phase:'repository',requires:['language:rust'],plan:sources=>{const source=sources[2].source,start=source.indexOf('true');return [{path:sources[2].path,templates:[edit(source,start,start+4,['false'])]}];}},
]);}
test('selected rule discovery composes nested original spans across both phases and all three languages',{timeout:60000},()=>{
 const before=input(),calls=[],plan=registry(calls).plan(before,['repository:child','repository:typescript']);
 assert.deepEqual(plan.trace.map(row=>row.phase),['language','language','repository','repository']);assert.deepEqual(calls,['array','child']);
 assert.deepEqual(plan.files.map(row=>row.after),['pub fn pick()->bool{false}\r\n','// 😀 unchanged\r\nconst value = wrap(length(first), next);\r\n','export const active: boolean = false;\n']);
 assert.equal(plan.files[1].composition.nestedEdits,1);for(const row of plan.files){assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
 assert.deepEqual(plan.stages.map(({id,phase})=>({id,phase})),plan.trace);assert.equal(plan.stages.length,4);
 assert.equal(plan.stages[0].files[1].after,'// 😀 unchanged\r\nconst value = wrap(first.length, next);\r\n');assert.equal(plan.stages[2].files[1].after,'// 😀 unchanged\r\nconst value = wrap(length(first), next);\r\n');
 for(let stage=0;stage<plan.stages.length;stage++)for(let file=0;file<before.length;file++){const row=plan.stages[stage].files[file];assert.equal(row.before,stage===0?before[file].source:plan.stages[stage-1].files[file].after);assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
 for(const flag of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','installationAuthority'])assert.equal(plan[flag],false);
 assert.equal(Object.isFrozen(before),false);assert.equal(Object.isFrozen(before[1]),false);
});
test('whole-cohort replay is idempotent and distinguishes original undo from a no-op current inverse',{timeout:60000},()=>{
 const before=input(),plan=registry().plan(before,['repository:child','repository:typescript']),copy=JSON.parse(JSON.stringify(plan)),first=applyConcreteSourceRulePlan(before,copy);assert.equal(first.applied,true);assert.equal(first.alreadyApplied,false);
 const current=first.files.map(({path,language,source})=>({path,language,source})),second=applyConcreteSourceRulePlan(current,copy);assert.equal(second.applied,false);assert.equal(second.alreadyApplied,true);
 for(let at=0;at<second.files.length;at++){const row=second.files[at];assert.equal(row.source,current[at].source);assert.equal(row.history.inverse,current[at].source);assert.equal(row.planOriginalInverse,before[at].source);assert.equal(row.planHistory.inverse,before[at].source);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,current[at].source);}
 assert.equal(second.installationAuthority,false);assert.equal(second.semanticAuthority,false);
 const restored=restoreConcreteSourceRulePlan(current,copy);assert.equal(restored.direction,'inverse');assert.equal(restored.applied,true);assert.deepEqual(restored.files.map(row=>row.source),before.map(row=>row.source));
 for(let at=0;at<restored.files.length;at++)assert.equal(restored.files[at].history.inverse,current[at].source);
 const restoredSources=restored.files.map(({path,language,source})=>({path,language,source}));assert.equal(restoreConcreteSourceRulePlan(restoredSources,copy).alreadyApplied,true);assert.equal(applyConcreteSourceRulePlan(restoredSources,copy).applied,true);
});
test('stale/mixed/missing/wrong-language cohorts and tampered full inverses refuse',{timeout:60000},()=>{
 const before=input(),plan=registry().plan(before,['repository:child','repository:typescript']);
 const variants=[before.slice(1),before.map((row,at)=>at===0?{...row,source:plan.files[0].after}:row),before.map((row,at)=>at===0?{...row,source:row.source+'// stale'}:row),before.map((row,at)=>at===0?{...row,language:'JavaScript'}:row)];
 for(const rows of variants){assert.throws(()=>applyConcreteSourceRulePlan(rows,plan));assert.throws(()=>restoreConcreteSourceRulePlan(rows,plan));}const changed=JSON.parse(JSON.stringify(plan));changed.files[0].inverse='wrong original';assert.throws(()=>applyConcreteSourceRulePlan(before,changed));assert.throws(()=>restoreConcreteSourceRulePlan(before,changed));
 const retained=JSON.parse(JSON.stringify(plan));retained.files[0].history.afterMeta=retained.files[0].history.beforeMeta;assert.throws(()=>applyConcreteSourceRulePlan(before,retained),/retained complete source history/u);
 for(const mutate of [value=>value.stages.shift(),value=>value.stages[0].files[0].after='changed intermediate source',value=>value.stages[0].phase='repository']){const changed=JSON.parse(JSON.stringify(plan));mutate(changed);assert.throws(()=>applyConcreteSourceRulePlan(before,changed));assert.throws(()=>restoreConcreteSourceRulePlan(before,changed));}
});
test('a parent rule cannot erase a child rule source reference and crossing/duplicate edits cannot last-write-win',{timeout:60000},()=>{
 const source=[{path:'js/src/a.mjs',language:'JavaScript',source:'const value = [a, b];\n'}],text=source[0].source,start=text.indexOf('['),end=text.indexOf(']')+1,child=text.indexOf('a,');
 const make=parts=>createConcreteSourceRuleRegistry([{id:'parent',phase:'language',plan:()=>[{path:source[0].path,templates:[edit(text,start,end,parts)]}]},{id:'child',phase:'repository',requires:['parent'],plan:()=>[{path:source[0].path,templates:[edit(text,child,child+1,['A'])]}]}]);
 assert.throws(()=>make(['generated_without_original_child']).plan(source,['child']),/nested edits/u);
 const duplicate=createConcreteSourceRuleRegistry([{id:'a',phase:'language',plan:()=>[{path:source[0].path,templates:[edit(text,start,end,['one'])]}]},{id:'b',phase:'repository',plan:()=>[{path:source[0].path,templates:[edit(text,start,end,['two'])]}]}]);assert.throws(()=>duplicate.plan(source),/duplicate/u);
 const crossing=createConcreteSourceRuleRegistry([{id:'left',phase:'language',plan:()=>[{path:source[0].path,templates:[edit(text,start,end-1,['left'])]}]},{id:'right',phase:'repository',plan:()=>[{path:source[0].path,templates:[edit(text,start+1,end,['right'])]}]}]);assert.throws(()=>crossing.plan(source),/crossing/u);
});
test('fresh planning does not cache source/results and source callbacks cannot smuggle accessors or asynchronous values',{timeout:60000},()=>{
 const calls=[],planner=registry(calls),before=input(),first=planner.plan(before,['repository:child']);before[1].source+='// second input\n';const second=planner.plan(before,['repository:child']);assert.deepEqual(calls,['array','child','array','child']);assert.notEqual(first.files[1].before,second.files[1].before);assert.match(second.files[1].after,/second input/u);
 let observed=0;const bad={path:'js/src/a.mjs',get templates(){observed++;throw Error('getter must not run');}};assert.throws(()=>createConcreteSourceRuleRegistry([{id:'bad',phase:'language',plan:()=>[bad]}]).plan(input()));assert.equal(observed,0);
 assert.throws(()=>createConcreteSourceRuleRegistry([{id:'async',phase:'language',plan:async()=>[]}]));
 assert.throws(()=>createConcreteSourceRuleRegistry([{id:'missing',phase:'language',plan:()=>[{path:'missing.mjs',templates:[]}]}]).plan(input()));
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('source callback primary'))]){let thrown=false;try{createConcreteSourceRuleRegistry([{id:'throws',phase:'language',plan:()=>{throw primary;}}]).plan(input());}catch(error){thrown=true;assert.equal(error,primary);}assert.equal(thrown,true);}
});
test('source inspection sees immutable originals and automatically selects a repository rule dependency',{timeout:60000},()=>{
 let probes=0;const planner=createConcreteSourceRuleRegistry([
  {id:'language:noop',phase:'language',plan:()=>[]},
  {id:'repository:source-family',phase:'repository',requires:['language:noop'],discover:rows=>{probes++;assert.equal(Object.isFrozen(rows),true);return rows[0].source.includes('pick');},plan:()=>[]},
 ]);
 const selected=planner.planDiscovered(input());assert.deepEqual(selected.discovery.selected,['language:noop','repository:source-family']);assert.equal(selected.discovery.sourceDiscovered,true);
 const different=input();different[0].source='pub fn other()->bool{false}\n';const empty=planner.planDiscovered(different);assert.deepEqual(empty.discovery.selected,[]);assert.equal(probes,2);assert.equal(empty.semanticAuthority,false);
 let getter=0;const bad=[{path:'rust/src/a.rs',language:'Rust',get source(){getter++;throw Error('getter');}}];assert.throws(()=>planner.planDiscovered(bad));assert.equal(getter,0);
});
