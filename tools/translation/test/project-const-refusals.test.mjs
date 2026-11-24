import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {HostChecker,parseRust,checkProjectProgram} from '../extensions/host-contracts.mjs';
import {checkConstEligibilityRefusals,checkCollectedDeclarationTypes,declarationRefusals} from '../extensions/declaration-refusals.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project=(source,options={})=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,...options});
const failure=run=>{try{run();}catch(error){return error;}assert.fail('A mandatory source proof must fail');};
const bad='pub const fn trim(value:&str)->&str{value.trim()} pub const fn fallback(value:Option<u8>)->u8{value.unwrap_or(1u8)}';

test('original const eligibility refusals are removed together and callers are checked afresh',{timeout:30000},async()=>{
  const events=[],source=bad+' pub fn caller(value:&str)->&str{trim(value)} pub const GOOD:u8=7u8; pub const fn good(value:u8)->u8{value+GOOD}';
  const result=project(source,{progress:event=>events.push(event)}),ordinary=project(source,{collectIndependentBodies:false});
  const refused=target=>target.meta.refused.map(({name,message,span})=>({name,message,span})).sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(refused(result),refused(ordinary));
  assert.equal(result.javascript,ordinary.javascript);assert.equal(result.typescript,ordinary.typescript);
  assert.deepEqual(events.filter(event=>event.stage==='semantic-refusal'&&event.phase==='const-eligibility').map(event=>event.declaration),['trim','fallback']);
  assert.deepEqual(result.meta.executable.map(item=>item.name),['GOOD','good']);
  await verifyCohortTargets(result,api=>{assert.equal(api.GOOD,7n);assert.equal(api.good(2n),9n);assert.throws(()=>api.good(255n),RangeError);});
});

test('nested const methods retain their independently captured original owners',()=>{
  const events=[],result=project('mod left{'+bad+'} pub fn good()->bool{true}',{progress:event=>events.push(event)});
  assert.deepEqual(events.filter(event=>event.stage==='semantic-refusal'&&event.phase==='const-eligibility').map(event=>event.declaration),['left.trim','left.fallback']);
  assert.deepEqual(result.meta.executable.map(item=>item.name),['good']);
  assert.equal(result.meta.refused.length,2);assert.ok(result.meta.refused.every(item=>/const eligibility/u.test(item.message)));
});

test('ordinary standalone checks retain first failure and their original error span',()=>{
  const source=bad+' fn main(){}',ordinary=failure(()=>checkProjectProgram(parseRust(source)));
  assert.equal(declarationRefusals(ordinary),null);assert.match(ordinary.reason,/const eligibility/u);
  const collected=failure(()=>checkProjectProgram(parseRust(source),{collectIndependentBodies:true}));
  assert.equal(declarationRefusals(collected),null,'Non-project caller metadata cannot mint an original post-check batch');
  assert.equal(collected.reason,ordinary.reason);assert.deepEqual(collected.span,ordinary.span);
});

test('post-check collection cannot bypass constant evaluation or escaping borrow proofs',()=>{
  for(const source of ['pub const OVER:u8=255u8+1u8;pub fn good()->u8{1}',"pub fn escaped(value:&str)->&'static str{value}pub fn good()->u8{1}"]){
    const result=project(source);assert.deepEqual(result.meta.executable.map(item=>item.name),['good']);
    assert.equal(result.meta.refused.length,1);assert.match(result.meta.refused[0].message,/constant evaluation|escaping source borrow/u);
  }
});

test('internal exceptions and unattributed post-check errors keep ordinary failure',()=>{
  for(const internal of [false,true]){
    let escaped=false;
    class Broken extends HostChecker{
      program(surface){const program=super.program(surface);checkConstEligibilityRefusals(this,program,entry=>{throw internal?new Error('internal invariant'):unsupported('post-check','unattributed original fixture',entry.span);});escaped=true;return program;}
    }
    const error=failure(()=>checkCollectedDeclarationTypes(new Broken('Rust',[]),parseRust('pub const GOOD:u8=1;fn main(){}'),{collectIndependentBodies:true}));
    assert.equal(escaped,false);assert.equal(declarationRefusals(error),null);assert.match(error.message,/internal invariant|unattributed original fixture/u);
  }
});
