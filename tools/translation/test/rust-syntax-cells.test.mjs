// Unrun whole-source syntax regressions for the bulk drafting phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rustSyntaxCells,equalRustSyntaxCells,sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {prepareRustSyntaxCells} from '../prepare-rust-syntax-cells.mjs';
const limits={timeout:60_000};
test('native Rust token cells preserve complete code while keeping nested comments opaque',limits,()=>{
 const source='pub fn value()->f64{1.0}';assert.equal(sameRustSourceSyntax(source,'/* outer /* nested fn hidden(){} */ tail */\n pub fn value ( ) -> f64 { 1.0 }'),true);
 assert.equal(sameRustSourceSyntax(source,'pub fn value()->f64{2.0}'),false);assert.equal(sameRustSourceSyntax(source,source+'pub fn extra()->f64{0.0}'),false);
});
test('literal contents and attributes remain source tokens rather than trivia or name hints',limits,()=>{
 assert.equal(sameRustSourceSyntax('pub fn value()->String{"λ😀".to_string()}','pub fn value()->String{"λ".to_string()}'),false);
 assert.equal(sameRustSourceSyntax('#[unknown]pub fn value()->f64{1.0}','pub fn value()->f64{1.0}'),false);
 const left=rustSyntaxCells('pub fn value()->f64{1.0}'),right=rustSyntaxCells('pub fn value()->f64{1.0}');assert.notEqual(left,right);assert.equal(equalRustSyntaxCells(left,right),true);right[right.length-2][1]='2.0';assert.equal(equalRustSyntaxCells(left,right),false);
});
test('complete inverse and paired API source copies retain native selections and both CST equations',limits,()=>{
 const plan=prepareRustSyntaxCells();assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
});
