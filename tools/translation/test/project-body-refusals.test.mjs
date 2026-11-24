import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram,checkProjectProgram} from '../extensions/host-contracts.mjs';
import {declarationRefusals} from '../extensions/declaration-refusals.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {translateProject} from '../project.mjs';
import {serializeProgram} from '../semantic-meta.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project=(files,options={})=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],...options});
function failure(run){try{run();}catch(error){return error;}assert.fail('Original unsupported source must be refused');}
const check=source=>checkProjectProgram(parseRust(source),{collectIndependentBodies:true});

test('optional body collection retains independent original errors and ordinary first-failure behavior',()=>{
  const source='pub fn first()->u8{missingA()} pub fn second()->u8{missingB()} pub fn good()->u8{7} fn main(){}';
  const batch=declarationRefusals(failure(()=>check(source)));
  assert.deepEqual(batch.map(entry=>entry.name),['first','second']);
  assert.ok(batch.every(entry=>entry.phase==='declaration-bodies'&&entry.error instanceof TranslationError));
  for(const run of [()=>checkProgram(parseRust(source)),()=>checkProjectProgram(parseRust(source))]){
    const ordinary=failure(run);assert.ok(ordinary instanceof TranslationError);
    assert.equal(declarationRefusals(ordinary),null);assert.equal(ordinary.reason,batch[0].error.reason);
    assert.deepEqual(ordinary.span,batch[0].error.span);
  }
  assert.throws(()=>checkProjectProgram(parseRust('fn main(){}'),{collectIndependentBodies:'yes'}),/explicit boolean/);
});

test('nested original body errors retain actual module owners and exact failing name spans',()=>{
  const source='mod left{pub fn first()->u8{missingA}} mod right{pub fn second()->u8{missingB}} fn main(){}';
  const batch=declarationRefusals(failure(()=>check(source)));
  assert.deepEqual(batch.map(entry=>entry.name),['left.first','right.second']);
  assert.deepEqual(batch.map(entry=>source.slice(entry.error.span.start,entry.error.span.end)),['missingA','missingB']);
});

test('every caller is rechecked and target behavior matches ordinary project removal',{timeout:30000},async()=>{
  const files={
    'src/lib.rs':'mod broken;pub fn good(value:u8)->u8{value+2} pub fn caller()->u8{broken::middle()}',
    'src/broken.rs':'pub fn first()->u8{missing()} pub fn second()->u8{other_missing()} pub fn middle()->u8{first()}',
  };
  const batched=project(files),ordinary=project(files,{collectIndependentBodies:false});
  assert.deepEqual(batched.meta.executable.map(entry=>entry.name),['good']);
  const refused=result=>result.meta.refused.map(entry=>({name:entry.name,message:entry.message,span:entry.span})).sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(refused(batched),refused(ordinary));
  assert.deepEqual(refused(batched).map(entry=>entry.name),['broken.first','broken.middle','broken.second','caller']);
  assert.equal(batched.javascript,ordinary.javascript);assert.equal(batched.typescript,ordinary.typescript);
  await verifyCohortTargets(batched,api=>{assert.deepEqual(Object.keys(api),['good']);assert.equal(api.good(4n),6n);assert.throws(()=>api.good(255n),RangeError);});
});

test('original signature errors still finish their refusal phase before any body phase',()=>{
  const source='pub fn first(value:MissingA)->u8{missing()} pub fn second()->MissingB{other()} pub fn third()->u8{absent()} fn main(){}';
  const batch=declarationRefusals(failure(()=>check(source)));
  assert.deepEqual(batch.map(entry=>entry.name),['first','second']);
  assert.ok(batch.every(entry=>entry.phase==='declaration-types'));
});

test('body collection cannot bypass constant evaluation or escaping-source-borrow proofs',()=>{
  for(const source of ['const BAD:u8=255u8+1u8;fn main(){}',"pub fn bad(value:&str)->&'static str{value}fn main(){}"]){
    const error=failure(()=>check(source));assert.ok(error instanceof TranslationError);
    assert.equal(declarationRefusals(error),null);assert.match(error.reason,/constant evaluation|escaping source borrow/);
  }
  const checked=check('const GOOD:u8=7u8;pub fn read()->u8{GOOD}fn main(){}');
  assert.equal(checked.declarations.get('GOOD').constantEvaluationProof.sourceLinksVerified,true);
});

test('generated declarations and source-capture exceptions cannot mint an original-body batch',()=>{
  const generated={language:'Rust',main:null,items:[{k:'fn',name:'ml_generated',generated:true,params:[],ret:{kind:'fixed',bits:8,signed:false},span:{start:0,end:10},body:{k:'name',path:['missing'],span:{start:5,end:6}}}]};
  const ordinary=failure(()=>checkProjectProgram(generated,{collectIndependentBodies:true}));
  assert.ok(ordinary instanceof TranslationError);assert.equal(declarationRefusals(ordinary),null);
  let reads=0;const surface=parseRust('pub fn good()->u8{1}fn main(){}');
  Object.defineProperty(surface.items[0].body,'hidden',{enumerable:true,get(){reads++;return 0;}});
  const internal=failure(()=>checkProjectProgram(surface,{collectIndependentBodies:true}));
  assert.equal(declarationRefusals(internal),null);assert.match(internal.message,/accessor|data property/);assert.equal(reads,0);
});

test('128 independent invalid bodies never become callable stubs in either target',{timeout:30000},async()=>{
  const source=Array.from({length:128},(_,index)=>`pub fn bad${index}()->u8{missing${index}()}`).join(' ')+' pub fn good()->u8{11}';
  const result=project({'src/lib.rs':source});
  assert.equal(result.meta.refused.length,128);assert.equal(new Set(result.meta.refused.map(entry=>entry.name)).size,128);
  assert.deepEqual(result.meta.executable.map(entry=>entry.name),['good']);
  await verifyCohortTargets(result,api=>{assert.deepEqual(Object.keys(api),['good']);assert.equal(api.good(),11n);});
});

test('successful complete programs retain exactly the ordinary checked semantic serialization',()=>{
  const source='pub enum Mode{A,B} pub fn pick(value:Mode)->u8{match value{Mode::A=>1,Mode::B=>2}} pub fn make()->u8{4} pub fn caller()->u8{make()} fn main(){}';
  assert.equal(serializeProgram(check(source)),serializeProgram(checkProgram(parseRust(source))));
});
