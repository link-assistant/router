import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {deriveNativeOutputTextSourceSet,deriveCurrentNativeOutputTextSourceSet,deriveNativeMatrixBoundarySources} from '../prepare-native-output-text-retention.mjs';
import {readNativeOutputRetentionPredecessors,readNativeMatrixTracePredecessors,prepareCurrentNativeOutputTextRetention,assertCurrentNativeOutputTextInputsFresh} from '../prepare-current-native-output-text-retention.mjs';
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
 const traceHistory=readNativeMatrixTracePredecessors();assert.equal(traceHistory.files.length,14);
 assert.equal(traceHistory.commit,'52e2c0461f00e79a1dcd04b475138acd3ec28d17');
 assert.equal(traceHistory.semanticAuthority,false);assert.equal(traceHistory.performanceQualified,false);
});

// This is a new complete-history case. Every existing retention case keeps its
// original 60000-ms deadline; this additional double-cohort proof has its own cap.
test('all seven original and current native equations join exact committed outputs and complete CST inverses',{timeout:120000},()=>{
 const plan=prepareCurrentNativeOutputTextRetention();assert.equal(plan.files.length,7);
 assert.equal(plan.prerequisites.ownedField.files.length,9);assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.performanceQualified,false);assert.equal(plan.runtimeParity,false);
 const changed=[],traceChanged=[];
 assert.equal(plan.traceFiles.length,7);assert.equal(plan.traceHistory.files.length,14);
 const traceSources=new Map(plan.traceHistory.files.map(row=>[row.path,row.source]));
 for(const [at,row]of plan.files.entries()){
  const trace=plan.traceFiles[at];assert.equal(trace.path,row.path);
  assert.equal(trace.after,traceSources.get(trace.path));assert.equal(trace.inverse,trace.before);
  assert.equal(row.current,row.after,row.path);assert.equal(readFileSync(row.path,'utf8'),row.after);
  assert.equal(row.inverse,row.before);assert.equal(row.historical.inverse,row.historical.before);
  assert.equal(row.sourceHistory.before,row.historical.after);assert.equal(row.sourceHistory.after,row.after);
  assert.equal(row.sourceHistory.inverse,row.historical.after);
  if(row.historical.after!==row.after)changed.push(row.path);
  if(trace.after!==row.after)traceChanged.push(row.path);
  for(const candidate of [row,row.historical,trace]){
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
 assert.deepEqual(traceChanged,['tools/translation/native-owned-field-isolated-matrix-session.mjs','tools/translation/native-owned-field-isolated-matrix-profile.mjs']);
 assert.equal(changed.length,4);assert.equal(assertCurrentNativeOutputTextInputsFresh(plan),true);
 const cli=plan.files.at(-1),ts=ownershipCompiler(),parse=source=>ts.createSourceFile(cli.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),old=parse(cli.historical.after),current=parse(cli.after);
 const deferred=['../tools/translation/owned-field-bulk.mjs','../tools/translation/owned-field-matrix-bulk.mjs','../tools/translation/compilation-matrix.mjs'];
 for(const node of old.statements){
  if(ts.isImportDeclaration(node)&&deferred.includes(node.moduleSpecifier.text)){
   assert.equal(current.statements.filter(row=>ts.isImportDeclaration(row)&&row.moduleSpecifier.text===node.moduleSpecifier.text).length,0);
  }else assert.equal(current.statements.filter(row=>row.getText(current)===node.getText(old)).length,1,'whole original CLI statement');
 }
 const edits=cli.stages[1].edits.filter(row=>row.id.startsWith('repository:defer-native-cli:'));
 assert.equal(edits.length,3);assert.ok(edits.every(row=>row.replacement===''));
 const contract=cli.stages[1].edits.find(row=>row.id==='repository:explicit-native-cli-contract');
 assert.ok(contract.replacement.startsWith("if(!retainOutputText||ownedCoreDefinitions)throw new TypeError("));
 for(const path of deferred)assert.equal(contract.replacement.split('await import('+JSON.stringify(path)+')').length,2);
 assert.ok(contract.replacement.includes('const {regenerate}=retainOutputText?{}:await import('));
 assert.ok(contract.replacement.includes('const {createCompilationMatrix,DECLARED_FAMILY_PROFILES}=profileMatrix?await import('));
 const producer=plan.producerEvolution.equation;
 assert.equal(producer.inverse,producer.before);assert.equal(transportConcreteSyntaxMeta(producer.afterMeta).source,readFileSync(plan.producerEvolution.path,'utf8'));
});

test('incomplete duplicate and unrelated source cohorts refuse before creating a native candidate',{timeout:60000},()=>{
 const history=readNativeOutputRetentionPredecessors(),first=history.files[0];
 for(const rows of [[],Array(7).fill(first),Array(7).fill({path:'unrelated.mjs',source:'export const x=1;'}),Array(7).fill({path:first.path})])for(const derive of [deriveNativeOutputTextSourceSet,deriveCurrentNativeOutputTextSourceSet])assert.throws(()=>derive(rows),TypeError);
 const trace=readNativeMatrixTracePredecessors(),paths=['tools/translation/owned-field-isolated-matrix-session.mjs','tools/translation/owned-field-isolated-matrix-profile.mjs'];
 const boundaries=paths.map(path=>trace.files.find(row=>row.path===path));
 for(const rows of [[],[boundaries[0]],Array(2).fill(boundaries[0]),Array(2).fill({path:'unrelated.mjs',source:'export const x=1;'}),boundaries.map(row=>({path:row.path}))])assert.throws(()=>deriveNativeMatrixBoundarySources(rows),TypeError);
 for(const at of [0,1]){
  const rows=boundaries.map(row=>({...row}));
  rows[at].source=rows[at].source.replace('"retained-owned-field-bulk.mjs"','"unproved-planner.mjs"');
  assert.notEqual(rows[at].source,boundaries[at].source);
  assert.throws(()=>deriveNativeMatrixBoundarySources(rows),/original two-planner boundary differs/);
 }
});
