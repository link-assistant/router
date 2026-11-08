import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {deriveGuardedProofScanCostReceivingImport,prepareGuardedProofScanCostReceivingImports} from '../prepare-guarded-proof-receiving-imports.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

function cases(source){
 const ts=ownershipCompiler(),file=ts.createSourceFile('scan-costs.test.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='test'&&ts.isStringLiteral(node.arguments[0]))rows.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return rows;
}

test('the scan-cost relocation generator retains all eight complete original behaviors and both CST inverses',{timeout:60000},()=>{
 const plan=prepareGuardedProofScanCostReceivingImports(),row=plan.files[0];
 assert.equal(plan.files.length,1);assert.equal(row.path,'tools/translation/test/private-native-proof-scan-costs.test.mjs');assert.equal(plan.originalEightCasesAndDeadlinesUnchanged,true);assert.equal(plan.runtimeBodyChanged,false);assert.equal(plan.receivingExecuted,false);assert.equal(row.nativeInverse,row.before);assert.equal(row.inverse,row.before);assert.equal(row.runtimeBodyAndInstrumentationUnchanged,true);
 assert.equal(cases(row.before).length,8);assert.deepEqual(cases(row.after),cases(row.before));assert.deepEqual(row.selections.map(value=>value.owner),['fixture']);assert.deepEqual(row.stages.map(value=>value.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
});

test('the original stale fixture is reproduced and its one import follows the actual complete runtime',{timeout:60000},()=>{
 const plan=prepareGuardedProofScanCostReceivingImports(),row=plan.files[0],selection=row.selection;
 const before=row.after.slice(0,selection.afterSpan[0])+"'original-lexing-intrinsics.mjs'"+row.after.slice(selection.afterSpan[1]);
 assert.ok(row.actualPrivateSource.includes("from './guarded-proof-lexing-intrinsics.mjs'"));assert.equal(row.actualPrivateSource.includes("from './original-lexing-intrinsics.mjs'"),false);
 const repaired=deriveGuardedProofScanCostReceivingImport({testSource:before,privateSource:row.actualPrivateSource});assert.equal(repaired.selection.expected,"'original-lexing-intrinsics.mjs'");assert.equal(JSON.parse(repaired.selection.replacement),'guarded-proof-lexing-intrinsics.mjs');assert.equal(repaired.after,row.after);assert.equal(repaired.inverse,before);assert.deepEqual(cases(repaired.after),cases(before));
});

test('unknown runtime imports duplicate guards and altered original fixture dependencies remain refusals',{timeout:60000},()=>{
 const row=prepareGuardedProofScanCostReceivingImports().files[0],input={testSource:row.before,privateSource:row.actualPrivateSource};
 for(const privateSource of [input.privateSource.replace('./guarded-proof-lexing-intrinsics.mjs','./foreign-lexing.mjs'),input.privateSource+"\nimport {originalBatchedLexingIntrinsicsUnchanged as foreign} from './guarded-proof-lexing-intrinsics.mjs';\n"])assert.throws(()=>deriveGuardedProofScanCostReceivingImport({...input,privateSource}),/actual native selection|guarded runtime binding/);
 const testSource=input.testSource.replace("'private-frozen-json.mjs'","'foreign-frozen-json.mjs'");assert.notEqual(testSource,input.testSource);assert.throws(()=>deriveGuardedProofScanCostReceivingImport({...input,testSource}),/exact three original runtime dependencies/);
});
