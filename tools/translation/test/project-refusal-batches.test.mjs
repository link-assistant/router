// Authored source-only cases; UNRUN until the publisher grants this draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram,checkProjectProgram} from '../extensions/host-contracts.mjs';
import {declarationRefusals} from '../extensions/declaration-refusals.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {translateProject,originalProjectDeclarationRefusalRange} from '../project.mjs';
import {serializeProgram} from '../semantic-meta.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
function failure(run) {try{run();}catch(error){return error;}assert.fail('The original source must remain refused');}

test('independent original function signatures fail together before any body can become checked IR',()=>{
  const source='pub fn first(v:MissingA)->u8{0} pub fn second()->MissingB{missing()} pub fn good()->u8{7} fn main(){}';
  const error=failure(()=>checkProjectProgram(parseRust(source))),batch=declarationRefusals(error);
  assert.deepEqual(batch.map(entry=>entry.name),['first','second']);
  assert.ok(batch.every(entry=>entry.phase==='declaration-types'&&entry.error instanceof TranslationError));
  assert.ok(batch.every(entry=>entry.error.reason.startsWith('unknown type')));
  const ordinary=failure(()=>checkProgram(parseRust(source)));
  assert.ok(ordinary instanceof TranslationError);assert.equal(declarationRefusals(ordinary),null);
  assert.equal(ordinary.reason,batch[0].error.reason);assert.deepEqual(ordinary.span,batch[0].error.span);
});

test('independent missing layout field types retain each original owner and exact source span',()=>{
  const source='pub struct Left{pub value:MissingA} pub struct Right{pub value:MissingB} pub fn good()->u8{9} fn main(){}';
  const batch=declarationRefusals(failure(()=>checkProjectProgram(parseRust(source))));
  assert.deepEqual(batch.map(entry=>entry.name),['Left','Right']);
  assert.deepEqual(batch.map(entry=>source.slice(entry.error.span.start,entry.error.span.end)),['MissingA','MissingB']);
});

test('removing failed layouts and signatures also removes every transitive caller, preserving typed independent behavior',{timeout:30000},async()=>{
  const result=project({
    'src/lib.rs':'mod model;mod broken;pub fn good(v:u8)->u8{v+2} pub fn caller()->u8{broken::middle()} pub fn amount(value:model::Record)->u8{value.value}',
    'src/model.rs':'pub struct Record{pub value:Missing} pub struct Other{pub value:AlsoMissing}',
    'src/broken.rs':'pub fn first(value:Missing)->u8{0} pub fn second(value:OtherMissing)->u8{0} pub fn middle()->u8{first(0)}',
  });
  assert.deepEqual(result.meta.executable.map(entry=>entry.name),['good']);
  for(const name of ['model.Record','model.Other','broken.first','broken.second','broken.middle','caller','amount'])assert.ok(result.meta.refused.some(entry=>entry.name===name),name);
  await verifyCohortTargets(result,api=>{assert.deepEqual(Object.keys(api),['good']);assert.equal(api.good(4n),6n);assert.throws(()=>api.good(255n),RangeError);});
});

test('body refusals retain single-failure behavior and cannot admit a signature-only implementation',{timeout:30000},async()=>{
  const source='pub fn first()->u8{missing()} pub fn second()->u8{other_missing()} pub fn good()->u8{3} fn main(){}';
  const error=failure(()=>checkProjectProgram(parseRust(source)));
  assert.ok(error instanceof TranslationError);assert.equal(declarationRefusals(error),null);
  const result=project({'src/lib.rs':source.replace('fn main(){}','')});
  assert.deepEqual(result.meta.executable.map(entry=>entry.name),['good']);
  assert.deepEqual(result.meta.refused.map(entry=>entry.name),['first','second']);
  await verifyCohortTargets(result,api=>assert.equal(api.good(),3n));
});

test('successful complete programs retain exactly the ordinary semantic serialization',()=>{
  const source='pub enum Mode{A,B} pub struct Value{pub amount:u8} pub fn pick(value:Mode)->u8{match value{Mode::A=>1,Mode::B=>2}} pub fn add(value:u8)->u8{value+1} fn main(){}';
  assert.equal(serializeProgram(checkProjectProgram(parseRust(source))),serializeProgram(checkProgram(parseRust(source))));
});

test('generated generic layouts keep ordinary refusals and sealed batches cannot be forged',()=>{
  const source='pub fn bad(value:Option<Missing>)->u8{0} fn main(){}';
  const error=failure(()=>checkProjectProgram(parseRust(source)));
  assert.ok(error instanceof TranslationError);assert.equal(declarationRefusals(error),null);
  let reads=0;const forged=Object.defineProperty({},'errors',{get(){reads++;return [];}});
  assert.equal(declarationRefusals(forged),null);assert.equal(reads,0);
  const genuine=failure(()=>checkProjectProgram(parseRust('pub fn bad(value:Missing)->u8{0} fn main(){}')));
  assert.ok(declarationRefusals(genuine));assert.equal(declarationRefusals({...genuine}),null);
  const item=parseRust(source).items.find(entry=>entry.generated);
  assert.ok(item);
  const traps={get(){reads++;throw new Error('must not read caller fields');},getPrototypeOf(){reads++;throw new Error('must not inspect caller prototype');},ownKeys(){reads++;throw new Error('must not enumerate caller');}};
  for(const value of [item,structuredClone(item),new Proxy(item,traps),Object.defineProperty({},'generated',{get(){reads++;return item.generated;}})])assert.equal(originalProjectDeclarationRefusalRange(value,[]),null);
  assert.equal(reads,0);
});

test('successful signature phases do not bypass original constant evaluation or local lifetime checks',()=>{
  for(const source of ['const BAD:u8=255u8+1u8;fn main(){}',"pub fn bad(value:&str)->u8{let held:&'static str=value;0} fn main(){}"]){
    const error=failure(()=>checkProjectProgram(parseRust(source)));
    assert.ok(error instanceof TranslationError);assert.equal(declarationRefusals(error),null);
    assert.match(error.reason,/constant evaluation|static borrow constraint|static source parameter/);
  }
  const checked=checkProjectProgram(parseRust('const GOOD:u8=7u8;pub fn read()->u8{GOOD} fn main(){}'));
  assert.equal(checked.declarations.get('GOOD').constantEvaluationProof.sourceLinksVerified,true);
});

test('a bulk set of independent missing source types cannot leak unchecked declarations into targets',{timeout:30000},async()=>{
  const ordinary=Array.from({length:128},(_,index)=>`pub fn bad${index}(value:Missing${index})->u8{0}`).join(' ');
  const generic=Array.from({length:64},(_,index)=>`pub fn option${index}(value:Option<OptionMissing${index}>)->u8{0} pub fn result${index}(value:Result<ResultMissing${index},u8>)->u8{0} pub fn tuple${index}(value:(TupleMissing${index},u8))->u8{0}`).join(' ');
  const source=ordinary+' '+generic+' pub fn good()->u8{11}',events=[];
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,progress:event=>events.push(event)});
  assert.equal(result.meta.refused.length,512);assert.equal(new Set(result.meta.refused.map(entry=>entry.name)).size,512);
  const layouts=events.filter(event=>event.stage==='semantic-refusal'&&event.declaration.startsWith('Router'));
  assert.equal(layouts.length,192);assert.ok(layouts.every(event=>event.phase==='declaration-types'&&event.attempt===0));
  assert.ok(events.filter(event=>event.stage==='semantic-refusal').every(event=>event.phase==='declaration-types'));
  assert.deepEqual(result.meta.executable.map(entry=>entry.name),['good']);
  await verifyCohortTargets(result,api=>{assert.deepEqual(Object.keys(api),['good']);assert.equal(api.good(),11n);});
  // A real original type alias with an unresolved target cannot issue nominal
  // method ownership. Its privately extracted members still have exact ranges
  // for refusing signatures/layouts, without admitting any method or macro.
  const files={'src/lib.rs':'pub mod broken;pub fn call_removed()->u8{broken::Args::bad0(0)}pub fn good()->u8{13}',
    'src/broken.rs':'pub type Args=MissingOwner;impl Args{'+Array.from({length:32},(_,index)=>`pub fn bad${index}(&self)->Option<Missing${index}>{None}`).join(' ')+'}'};
  const partialEvents=[],partial=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],progress:event=>partialEvents.push(event)});
  const signatureFailures=partialEvents.filter(event=>event.stage==='semantic-refusal'&&event.declaration.startsWith('broken.ml_impl_'));
  const layoutFailures=partialEvents.filter(event=>event.stage==='semantic-refusal'&&event.declaration.startsWith('RouterOption_'));
  assert.equal(signatureFailures.length,32);assert.ok(signatureFailures.every(event=>event.phase==='declaration-types'&&event.attempt===1));
  assert.equal(layoutFailures.length,32);assert.ok(layoutFailures.every(event=>event.phase==='declaration-types'&&event.attempt===0));
  assert.equal(partial.meta.refused.length,65);assert.ok(partial.meta.refused.some(entry=>entry.name==='call_removed'));
  assert.deepEqual(partial.checkedMethodDeclarations,[]);assert.deepEqual(partial.meta.executable.map(entry=>entry.name),['good']);
  await verifyCohortTargets(partial,api=>{assert.deepEqual(Object.keys(api),['good']);assert.equal(api.good(),13n);});
});
