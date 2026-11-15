import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {derivePairedProjectAccessorFixture,preparePairedProjectAccessorFixture,snapshotProjectAccessors} from './paired-project-accessor-fixture.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';

test('complete paired baseline keeps authenticated accessor source and every original CST inverse',{timeout:60000},async()=>{
 const plan=preparePairedProjectAccessorFixture();assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.baselineScope,'method-free-project-cases');assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.equation.inverse,plan.before);assert.equal(plan.relocated.inverse,plan.equation.after);
 assert.equal(transportConcreteSyntaxMeta(plan.relocated.afterMeta).source,plan.source);
 assert.deepEqual(plan.equation.stages.map(row=>row.phase),['language','repository']);
 for(const row of plan.equation.stages){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);}
 assert.equal(plan.nativeBindings.length,2);assert.ok(plan.nativeBindings.every(row=>row.nativeSemanticScopeChecked));
 const prior=await import('data:text/javascript;base64,'+Buffer.from(plan.source).toString('base64'));
 const source='pub const VALUE:u8=3;pub fn run(x:u8)->u8{x+VALUE}',options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
 const old=prior.translateProject(options),current=translateProject(options);
 assert.deepEqual(snapshotProjectAccessors(current.executableDeclarations),snapshotProjectAccessors(old.executableDeclarations));
 for(const result of [old,current]){
  const facade=result.executableDeclarations.find(row=>row.name==='run'),a=facade.checkedSource(),b=facade.checkedSource();
  assert.notEqual(a,b);assert.notEqual(a.declaration,b.declaration);assert.deepEqual(a,b);
  assert.ok(Object.isFrozen(b.declaration.body));assert.deepEqual(b.sourceSignature.params[0].type,{kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8',rustSourceType:true});
  const constant=result.executableDeclarations.find(row=>row.name==='VALUE');assert.throws(()=>constant.checkedSource(),/association differs/);
  facade.span.end++;assert.throws(()=>facade.checkedSource(),/association differs/);facade.span.end--;
  assert.deepEqual(facade.checkedSource(),a);
 }
 assert.equal(readFileSync(new URL('../fixtures/project-before-rule-pipeline-000151.mjs.txt',import.meta.url),'utf8'),plan.before);
});

test('paired receiving refuses modified frozen source duplicate helpers and changed complete accessor bodies',{timeout:60000},()=>{
 const before=readFileSync(new URL('../fixtures/project-before-rule-pipeline-000151.mjs.txt',import.meta.url),'utf8'),current=readFileSync(new URL('../project.mjs',import.meta.url),'utf8');
 assert.throws(()=>derivePairedProjectAccessorFixture(before+'\n',current),/complete frozen baseline differs/);
 assert.throws(()=>derivePairedProjectAccessorFixture(before,current+'\nfunction createProjectCheckedSource(){}'),/one original current complete accessor helper/);
 assert.throws(()=>derivePairedProjectAccessorFixture(before,current.replace('Original executable checked source association differs','different refusal')),/whole current accessor helper differs/);
 assert.throws(()=>derivePairedProjectAccessorFixture(before,current+'\nfunction {'),/native source grammar differs/);
});
