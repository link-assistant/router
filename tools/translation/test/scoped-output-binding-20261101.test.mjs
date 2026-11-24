// Independent receiving/refusal SOURCE only. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeScopedOutputBindingSources,translateScopedOutputBindingProject,synchronizeScopedOutputBindingExpandedProject} from '../scoped-output-binding-20261101.mjs';
import {captureScopedOutputBindingProductionOwners} from '../scoped-output-binding-20261101-production-sources.mjs';
import {verifyCrossModuleHelperTargets as verifyTargets} from './cross-module-helper-bulk-20261101-fixture.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const limits={timeout:60000};
const options=files=>({entry:'src/lib.rs',paths:Object.keys(files),readSource:name=>files[name]});
const definition='macro_rules! choose {($value:tt)=>{{ $value }}}';
function fixture(){return {'src/lib.rs':'#[macro_use] mod output; pub mod child; pub fn direct()->u8{choose!(7)}','src/output.rs':definition,'src/child.rs':'pub fn inherited()->u8{if true {choose!(9)} else {0}}'};}
test('actual ordered child macro_use expands body calls and independently receives both targets',limits,async()=>{
 const files=fixture(),result=translateScopedOutputBindingProject(options(files));assert.equal(result.sourceExpansion.refusals.length,0);assert.equal(result.sourceExpansion.edits.length,2);assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.productionOutputExecutable,false);
 for(const row of result.sourceExpansion.files){assert.equal(row.before,files[row.sourcePath]);assert.equal(row.history.inverse,files[row.sourcePath]);}
 await verifyTargets(result,api=>{assert.equal(api.direct(),7n);assert.equal(api['child.inherited'](),9n);});
});
test('independent local child shadow follows exact original declaration order',limits,async()=>{
 const files=fixture();files['src/child.rs']='macro_rules! choose {($value:tt)=>{{11}}} pub fn inherited()->u8{choose!(9)}';
 const result=translateScopedOutputBindingProject(options(files));assert.equal(result.sourceExpansion.refusals.length,0);await verifyTargets(result,api=>{assert.equal(api.direct(),7n);assert.equal(api['child.inherited'](),11n);});
});
test('missing prior binding unknown body macro imports exports cfg and function-local rules never acquire a selection',limits,()=>{
 for(const source of [
  'pub fn run()->u8{choose!(7)} '+definition,
  definition+' pub fn run()->u8{unknown!(7)}',
  'use other::choose; '+definition+' pub fn run()->u8{choose!(7)}',
  '#[macro_export] '+definition+' pub fn run()->u8{choose!(7)}',
  '#[cfg(unix)] '+definition+' pub fn run()->u8{choose!(7)}',
  definition+' pub fn run()->u8{macro_rules! choose {()=>{9}} choose!()}',
  definition+' pub fn run()->u8{qualified::choose!(7)}',
 ]){const result=proposeScopedOutputBindingSources(options({'src/lib.rs':source}));assert.equal(result.sourceExpansion.edits.length,0);assert.ok(result.sourceExpansion.refusals.length+result.sourceExpansion.predecessor.refusals.length>0);}
});
test('root generated items cannot silently influence new body selection',limits,()=>{
 const source='macro_rules! root {()=>{pub fn added()->u8{1}}} root!(); '+definition+' pub fn run()->u8{choose!(7)}';
 const result=proposeScopedOutputBindingSources(options({'src/lib.rs':source}));assert.equal(result.sourceExpansion.edits.length,0);assert.ok(result.sourceExpansion.refusals.length>0);
});
test('existing nested unknown format_args refusal retains scoped output transport',limits,()=>{
 const files={'src/lib.rs':'#[macro_use] mod output; pub fn run(){println!("hello");}','src/output.rs':'macro_rules! println {($($arg:tt)*)=>{crate::operation_output::write(false,format_args!($($arg)*))}}'};
 const result=proposeScopedOutputBindingSources(options(files));assert.equal(result.sourceExpansion.edits.length,0);assert.ok(result.sourceExpansion.refusals.some(row=>/nested macro/u.test(row.message)));assert.equal(result.sourceExpansion.files[0].after,files['src/lib.rs']);
});
test('changed originals poison enclosing source operations even if the private failure is caught and source restored',limits,()=>{
 const files=fixture(),original=files['src/child.rs'];let reads=0;
 assert.throws(()=>withSourceFailureOperation(()=>{try{proposeScopedOutputBindingSources({...options(files),readSource:name=>name==='src/child.rs'&&++reads===2?original+' ':files[name]});}catch{}files['src/child.rs']=original;return 0;}),/invalidated/u);
});
test('both actual target edit lanes recheck whole expanded native source and keep macro-origin inverse unsupported',limits,async()=>{
 for(const language of ['javascript','typescript']){
  const files={'src/lib.rs':definition+' pub fn direct()->u8{choose!(7)}'},input=options(files),before=translateScopedOutputBindingProject(input),changed=before[language].replace('7n','8n');assert.notEqual(changed,before[language]);
  const result=synchronizeScopedOutputBindingExpandedProject(input,{[language]:changed}),reverse=result.sourceExpansion.semanticReverse;assert.equal(reverse.literalEditCount,1);assert.ok(reverse.rustEdits[0].after.includes('8'));assert.equal(reverse.rustEdits[0].history.inverse,before.sourceExpansion.files[0].after);assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);
  await verifyTargets({javascript:reverse.javascript,typescript:reverse.typescript,meta:{entry:'src/lib.rs'}},api=>assert.equal(api.direct(),8n));
 }
});
test('complete actual production owners are inert full-source data with independent inverses',limits,()=>{
 const result=captureScopedOutputBindingProductionOwners();assert.equal(result.value.rows.length,4);for(const [at,equation]of result.value.equations.entries())assert.equal(equation.inverse,result.value.rows[at].before);assert.equal(result.value.productionPairAdmitted,false);assert.equal(result.value.sourcePrioritization.coverage,false);
});
