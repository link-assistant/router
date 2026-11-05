// Actual original target collector/immutable driver receiving SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {collectTargetBindingGapPlan20261103,openTargetBindingGapObservation20261103} from '../target-binding-gap-plan-20261103.mjs';
import {proposeTargetBindingGapPlanSources} from '../target-binding-gap-plan-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),revision='a'.repeat(40);
function file(source,path='js/src/binding-gap-case.mjs'){
 const bytes=Buffer.byteLength(source),blob=createHash('sha1').update('blob '+bytes+'\0').update(source).digest('hex');return {source,origin:{revision,path,mode:'100644',bytes,blob}};
}
test('original import/export aliases remain exact native observations and unproved dependency closure',{timeout:60000},()=>{
 for(const [path,source]of [['js/src/case.mjs','// Unicode 🌍 λ\r\nimport {value as renamed} from "./missing.mjs"; export {renamed as out};'],['ts/src/case.mts','// Unicode 🌍 λ\r\nimport type {Thing as Shape} from "./missing.mjs"; export type Public=Shape;']]){
  const plan=collectTargetBindingGapPlan20261103({files:[file(source,path)]});assert.ok(plan.rows.some(row=>row.evidence.kind==='import'&&row.evidence.original.includes(' as ')));assert.ok(plan.rows.some(row=>row.kind==='original-target-source-binding-review'));assert.match(plan.sourceCheckerBoundary,/noResolve/u);assert.equal(plan.scopeReviewComplete,false);assert.equal(plan.translationCoverage,null);assert.equal(plan.productionFunctionDenominator,null);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.verification,'UNRUN');assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
  for(const row of plan.rows){assert.deepEqual(row.requirements,['L02','B05']);assert.equal(row.reviewStatus,'OPEN');assert.equal(row.semanticAuthority,false);assert.equal(Object.isFrozen(row),true);}
  for(const row of plan.rows.filter(row=>row.kind==='original-target-binding-or-producer-review')){const {span,original}=row.evidence;assert.equal(source.slice(span.start,span.end),original);assert.equal(Buffer.from(source).subarray(span.byteStart,span.byteEnd).toString('utf8'),original);}
 }
});
test('native binding, grammar and source-domain refusals remain whole and never become accepted imports',{timeout:60000},()=>{
 for(const [source,kind]of [['export function broken(){return absentName;}','native-binding-refusal'],['export function incomplete(','native-grammar-refusal'],['// '+'x'.repeat(1048577),'native-source-domain']]){
  const plan=collectTargetBindingGapPlan20261103({files:[file(source)]});assert.ok(plan.originalDiagnostics.some(row=>row.kind===kind));assert.equal(plan.rows.filter(row=>row.kind==='original-target-native-diagnostic').length,plan.originalDiagnostics.length);assert.equal(plan.scopeReviewComplete,false);
 }
});
test('immutable snapshot frames expire and caller flags AST compilers getters and proxies cannot supply observations',{timeout:60000},()=>{
 const original=file('export function observed(){return 1;}'),frame=openTargetBindingGapObservation20261103({files:[original]});assert.equal(Object.isFrozen(frame.native.sources),true);assert.throws(()=>{frame.native.sources[0].origin.path='forged';});assert.equal(frame.describe().semanticAuthority,false);frame.close();assert.throws(()=>frame.describe(),/expired/u);
 assert.throws(()=>collectTargetBindingGapPlan20261103({files:[original],compiler:{},ast:{},sourceAuthority:true}));assert.throws(()=>collectTargetBindingGapPlan20261103({files:[{...original,ast:{}}]}));assert.throws(()=>collectTargetBindingGapPlan20261103({files:[{...original,origin:{...original.origin,blob:'b'.repeat(40)}}]}));
 let called=0;const getter={get files(){called++;throw Error('must not execute');}};assert.throws(()=>collectTargetBindingGapPlan20261103(getter));const proxy=new Proxy({files:[original]},{ownKeys(){called++;throw Error('must not execute');}});assert.throws(()=>collectTargetBindingGapPlan20261103(proxy));assert.equal(called,0);
 const coercion={toString(){called++;throw Error('origin coercion must not execute');}};assert.throws(()=>collectTargetBindingGapPlan20261103({files:[{...original,origin:{...original.origin,revision:coercion}}]}));assert.equal(called,0);
});
test('same-spelling JS and TS observations keep their complete distinct source origins',{timeout:60000},()=>{
 const source='import {value as same} from "./missing.mjs";export {same};',plan=collectTargetBindingGapPlan20261103({files:[file(source,'js/src/same.mjs'),file(source,'ts/src/same.mts')]});assert.equal(plan.sources.length,2);assert.equal(new Set(plan.rows.map(row=>row.id)).size,plan.rows.length);assert.ok(plan.rows.some(row=>row.origin.path==='js/src/same.mjs'));assert.ok(plan.rows.some(row=>row.origin.path==='ts/src/same.mts'));
 class Rows extends Array{*[Symbol.iterator](){throw Error('original own-data collector must ignore this iterator');}}const rows=new Rows();rows.push(file('export function ownData(){}'));assert.equal(collectTargetBindingGapPlan20261103({files:rows}).sources.length,1);
});
test('actual Router package exports stay review work rather than native function acceptance',{timeout:60000},()=>{
 const source=readFileSync(join(ROOT,'js/src/index.mjs'),'utf8'),plan=collectTargetBindingGapPlan20261103({files:[file(source,'js/src/index.mjs')]});assert.equal(plan.rows.filter(row=>row.evidence.kind==='export').length,4);assert.equal(plan.scopeReviewComplete,false);assert.equal(plan.productionFunctionDenominator,null);
});
test('the actual immutable driver and all ancestry cases retain complete old images and both rule sequences',{timeout:60000},()=>{
 const proposal=proposeTargetBindingGapPlanSources();assert.equal(proposal.files.length,5);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.newFiles){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);}
});
