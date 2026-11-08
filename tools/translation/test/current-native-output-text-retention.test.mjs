import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {deriveNativeOutputTextSourceSet} from '../prepare-native-output-text-retention.mjs';
import {readNativeOutputRetentionPredecessors,prepareCurrentNativeOutputTextRetention,assertCurrentNativeOutputTextInputsFresh} from '../prepare-current-native-output-text-retention.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('complete committed native predecessor archive retains original codecs and independent phase machinery',{timeout:60000},()=>{
 const history=readNativeOutputRetentionPredecessors();assert.equal(history.files.length,17);
 assert.equal(history.commit,'a7bcf9526b0835f634b900e91fc30fc9c8301581');
 const path='tools/translation/prepare-native-output-text-retention.mjs';
 const old=history.files.find(row=>row.path===path).source,current=readFileSync(path,'utf8'),ts=ownershipCompiler();
 assert.equal(ts.version,'5.9.3');
 const parse=source=>ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),before=parse(old),after=parse(current);
 assert.deepEqual(before.parseDiagnostics,[]);assert.deepEqual(after.parseDiagnostics,[]);
 for(const name of ['syntax','phase','copied','deriveNativeOutputTextRetention','admission','assertNativeOutputTextInputsFresh']){
  const select=file=>file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  const a=select(before),b=select(after);assert.equal(a.length,1);assert.equal(b.length,1);
  assert.equal(a[0].getText(before),b[0].getText(after),name);
 }
 assert.equal(history.semanticAuthority,false);assert.equal(history.performanceQualified,false);
});

// This is a new complete-history case. Every existing retention case keeps its
// original 60000-ms deadline; this additional double-cohort proof has its own cap.
test('all seven original and current native equations join exact committed outputs and complete CST inverses',{timeout:120000},()=>{
 const plan=prepareCurrentNativeOutputTextRetention();assert.equal(plan.files.length,7);
 assert.equal(plan.prerequisites.ownedField.files.length,9);assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.performanceQualified,false);assert.equal(plan.runtimeParity,false);
 let changed=0;
 for(const row of plan.files){
  assert.equal(row.current,row.after,row.path);assert.equal(readFileSync(row.path,'utf8'),row.after);
  assert.equal(row.inverse,row.before);assert.equal(row.historical.inverse,row.historical.before);
  assert.equal(row.sourceHistory.before,row.historical.after);assert.equal(row.sourceHistory.after,row.after);
  assert.equal(row.sourceHistory.inverse,row.historical.after);
  if(row.historical.after!==row.after)changed++;
  for(const candidate of [row,row.historical]){
   assert.equal(candidate.nativeBindings.nativeSemanticScopeChecked,true);
   assert.equal(candidate.nativeBindings.strictTypecheck,false);assert.equal(candidate.nativeBindings.semanticAuthority,false);
   assert.equal(candidate.nativeCopies.length,2);assert.ok(candidate.nativeCopies.every(copy=>copy.completeNativeAstCopy));
   assert.deepEqual(candidate.stages.map(stage=>stage.phase),['language','repository']);
   for(const stage of candidate.stages){
    assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
    assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
   }
  }
  assert.deepEqual(row.sourceHistory.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.sourceHistory.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 }
 assert.equal(changed,2);assert.equal(assertCurrentNativeOutputTextInputsFresh(plan),true);
 const producer=plan.producerEvolution.equation;
 assert.equal(producer.inverse,producer.before);assert.equal(transportConcreteSyntaxMeta(producer.afterMeta).source,readFileSync(plan.producerEvolution.path,'utf8'));
});

test('incomplete duplicate and unrelated source cohorts refuse before creating a native candidate',{timeout:60000},()=>{
 const history=readNativeOutputRetentionPredecessors(),first=history.files[0];
 for(const rows of [[],Array(7).fill(first),Array(7).fill({path:'unrelated.mjs',source:'export const x=1;'}),Array(7).fill({path:first.path})])assert.throws(()=>deriveNativeOutputTextSourceSet(rows),TypeError);
});
