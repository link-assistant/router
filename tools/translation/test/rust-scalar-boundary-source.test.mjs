// Source-only regression draft. Rust must run in JS-gated CI, never locally.
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRustScalarBoundaries} from '../prepare-rust-scalar-boundaries.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60_000};

test('independent Rust boundary source retains every complete production helper and both CST inverses',limits,()=>{
 const plan=prepareRustScalarBoundaries(),rust=plan.files.find(row=>row.path.endsWith('.rs'));
 assert.equal(plan.files.length,2);assert.equal(plan.rustExecuted,false);assert.equal(plan.semanticAuthority,false);
 assert.equal(rust.current,rust.after);assert.equal(rust.nativeSelection.name,'translation_scalar_boundary_tests');assert.equal(rust.nativeSelection.nativeRustGrammarChecked,false);
 assert.deepEqual(rust.originalProductionHelpers.map(row=>row.name),['safe_number','safe_percentage','safe_numeric_string','safe_string']);
 for(const helper of rust.originalProductionHelpers){assert.equal(rust.before.slice(...helper.span),helper.source);assert.equal(rust.after.slice(...helper.span),helper.source);}
 assert.ok(rust.after.includes('#[cfg(test)]\nmod translation_scalar_boundary_tests'));
 for(const row of plan.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(transportConcreteSyntaxMeta(row.stages[0].afterMeta).source,row.language);assert.equal(transportConcreteSyntaxMeta(row.stages[1].afterMeta).source,row.after);}
});
test('actual original root receipt replaces only the stale whole-module assertion',limits,()=>{
 const row=prepareRustScalarBoundaries().files.find(row=>row.path.endsWith('.mjs'));
 assert.equal(row.current,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.ok(row.after.includes('assert.equal(hash(source),originalModuleInput.sha256)'));
 assert.ok(row.after.includes("historicalWholeSourceSha256:'e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad'"));
 assert.ok(row.after.includes("assert.equal(hash(source.slice(item.start,item.end)),'0f6e667a69815ab806ed7e03e1c225d5f0a720d5d8d6ad423ff1f2263d93b301')"));
 assert.ok(row.after.includes('loadDeriveDependencyProof({manifest,lock})'));assert.ok(row.after.includes('loadJsonMacroSourceProof({manifest,lock})'));assert.ok(row.after.includes('compilationProfile:corpus.inputs.compilationProfile'));
});
