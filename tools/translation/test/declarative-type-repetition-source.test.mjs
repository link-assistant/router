import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-token-macros.mjs';
import {originalMacroTrees,originalMacroTreeText} from '../macro-token-trees.mjs';
import {originalMacroSequenceFollowRule,assertOriginalMacroSequenceFollowRule} from '../macro-follow-source.mjs';
import {originalPrimitiveCloneExpansion,assertOriginalPrimitiveCloneExpansion} from '../extensions/primitive-clone-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const compile=(matcher,output='$($t)*')=>compileDeclarativeMacro('macro_rules! independent {('+matcher+')=>{'+output+'};}',{name:'independent',owner:['fixture']});
const render=proof=>proof.trees.map(originalMacroTreeText).join(' ');
test('selected original compiler suffix and separator control flow retains source without namespace or runtime authority',()=>{
  const rule=originalMacroSequenceFollowRule();assert.equal(assertOriginalMacroSequenceFollowRule(rule),rule);
  assert.equal(rule.includeOwnFirst,false);assert.equal(rule.includeSeparator,true);
  assert.equal(rule.suffix.span.start,40253);assert.equal(rule.sequence.span.start,42069);
  assert.match(rule.sequence.original,/check_matcher_core\(sess, node_id, first_sets, &seq_rep.tts, my_suffix\)/);
  assert.equal(rule.namespaceAuthority,false);assert.equal(rule.runtimeAuthority,false);assert.equal(rule.wholeCompilerExecuted,false);
  assert.throws(()=>assertOriginalMacroSequenceFollowRule(structuredClone(rule)),/private original source/);
  assert.throws(()=>assertOriginalMacroSequenceFollowRule({...rule,includeOwnFirst:true}),/private original source/);
});
test('complete unchanged core Clone invocation expands every actual original type and attributes',()=>{
  const proof=originalPrimitiveCloneExpansion();assert.equal(assertOriginalPrimitiveCloneExpansion(proof),proof);
  assert.equal(hash(proof.source.original),proof.source.sha256);
  assert.deepEqual(proof.members.map(row=>row.target),['usize','u8','u16','u32','u64','u128','isize','i8','i16','i32','i64','i128','f16','f32','f64','f128','bool','char']);
  for(const member of proof.members){
    assert.equal(member.bodySource.trim(),'* self');assert.match(member.implSource,/# \[stable \(feature = "rust1" , since = "1.0.0"\)\]/);
    assert.match(member.methodSource,/# \[inline \(always\)\]/);assert.equal(member.bodyChecked,false);assert.equal(member.traitOwnerResolved,false);
  }
  assert.equal(proof.expansion.namespaceComplete,false);assert.equal(proof.expansion.generatedBehavior,false);assert.equal(proof.namespaceAuthority,false);assert.equal(proof.runtimeAuthority,false);
  assert.throws(()=>assertOriginalPrimitiveCloneExpansion(structuredClone(proof)),/private original source/);
  assert.throws(()=>expandDeclarativeMacro(proof.definition,structuredClone(proof.invocation.trees)),/original or privately forwarded/);
  assert.throws(()=>expandDeclarativeMacro(structuredClone(proof.definition),proof.invocation.trees),/sealed/);
});
for(const [matcher,input,output,expected] of [
  ['$($t:ty)*','u8 bool i64','$($t)*','u8 bool i64'],
  ['$($t:ty)+','Option<u8> (u8,bool) *const u16','$($t)*','Option < u8 > (u8 , bool) * const u16'],
  ['$($t:ty),*','u8,bool','$($t)*','u8 bool'],
  ['$($t:ty)?','','$($t)?',''],
  ['$($t:ty)?','u8','$($t)?','u8'],
  ['$($t:ty);+','u8;bool','$($t)*','u8 bool']
])test('general source repetition grammar: '+matcher+' input '+input,()=>assert.equal(render(expandDeclarativeMacro(compile(matcher,output),originalMacroTrees(input))),expected));
test('explicit forbidden followers remain refused inside repetitions and nullable exits',()=>{
  for(const matcher of ['$($t:ty $u:ty)*','$($t:ty)* ending','$($t:ty)ending*','$t:ty $u:ty','$($t:expr)? ending','$($t:expr)ending*'])assert.throws(()=>compile(matcher,matcher.includes('$u')?'':'$($t)*'),/follow set/);
  const ambiguous=compile('$($t:ty)* as','');assert.throws(()=>expandDeclarativeMacro(ambiguous,originalMacroTrees('u8 as')),/ambiguous/);
  const budget=compile('$($t:ty)*');assert.throws(()=>expandDeclarativeMacro(budget,originalMacroTrees('u8 bool'),{repetitions:1}),/budget/);
});
test('new separatorless type capture remains opaque when forwarded into independent original matchers',()=>{
  const sender=compile('$($t:ty)*'),forward=expandDeclarativeMacro(sender,originalMacroTrees('u8'));
  const receiver=compileDeclarativeMacro('macro_rules! independent {(u8)=>{WRONG};($t:ty)=>{OPAQUE};}',{name:'independent',owner:['fixture']});
  assert.equal(render(expandDeclarativeMacro(receiver,declarativeSubInput(forward))),'OPAQUE');
  assert.throws(()=>declarativeSubInput(structuredClone(forward)),/Unsealed/);
});
