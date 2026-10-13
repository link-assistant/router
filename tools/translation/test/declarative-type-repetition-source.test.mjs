import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeDefinitionHeader} from '../declarative-token-macros.mjs';
import {originalMacroTrees,originalMacroTreeText} from '../macro-token-trees.mjs';
import {originalTopLevelMacroInvocations} from '../macro-token-trees.mjs';
import {sourceItems} from '../rust-structure.mjs';
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
function originalBuiltinRegistration(){
  const root=new URL('../source-profiles/builtin-derive-bang/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',root))),pin=profile.sources.find(row=>row.path==='compiler/rustc_builtin_macros/src/lib.rs'),packed=readFileSync(new URL(pin.archive,root)),raw=gunzipSync(packed);
  assert.equal(hash(packed),pin.archiveSha256);assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);
  const source=raw.toString('utf8'),owners=sourceItems(source).filter(item=>item.term==='fn'&&item.name==='register_builtin_macros');assert.equal(owners.length,1);
  const tokens=owners[0].tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),body=source.slice(tokens[open].end,tokens.at(-1).start),calls=originalTopLevelMacroInvocations(body).filter(row=>row.path.join('::')==='register_derive');assert.equal(calls.length,1);
  const definition=compileDeclarativeMacro(body,{name:'register_derive',owner:['rustc_builtin_macros']}),expansion=expandDeclarativeMacro(definition,calls[0].trees);
  return {source,pin,owner:owners[0],body,definition,invocation:calls[0],expansion};
}
test('complete original single-rule register_derive preserves all twelve callback expressions and derive constructors',()=>{
  const result=originalBuiltinRegistration();assert.equal(result.definition.declarationForm,'single-rule-decl-macro');assert.equal(result.definition.rules.length,1);
  const groups=result.expansion.trees.filter((tree,index)=>tree.kind==='group'&&tree.delimiter==='('&&result.expansion.trees[index-1]?.text==='register');assert.equal(groups.length,12);
  const names=['Clone','Copy','ConstParamTy','UnsizedConstParamTy','Debug','Default','Eq','Hash','Ord','PartialEq','PartialOrd','CoercePointee'];
  const callbacks=['clone::expand_deriving_clone','bounds::expand_deriving_copy','bounds::expand_deriving_const_param_ty','bounds::expand_deriving_unsized_const_param_ty','debug::expand_deriving_debug','default::expand_deriving_default','eq::expand_deriving_eq','hash::expand_deriving_hash','ord::expand_deriving_ord','partial_eq::expand_deriving_partial_eq','partial_ord::expand_deriving_partial_ord','coerce_pointee::expand_deriving_coerce_pointee'];
  for(const [index,group]of groups.entries()){
    const rendered=originalMacroTreeText(group);assert.equal(rendered,'(sym :: '+names[index]+' , SyntaxExtensionKind :: LegacyDerive (Arc :: new (BuiltinDerive ('+callbacks[index].replaceAll('::',' :: ')+'))))');
  }
  const header=declarativeDefinitionHeader(result.definition);assert.equal(header.kind,'macro');assert.equal(header.visibility,null);assert.equal(header.sourceVerified,true);assert.equal(header.hygieneVerified,false);
  assert.equal(result.expansion.ownerVerified,false);assert.equal(result.expansion.namespaceComplete,false);assert.equal(result.expansion.generatedBehavior,false);
  assert.throws(()=>expandDeclarativeMacro(structuredClone(result.definition),result.invocation.trees),/sealed/);assert.throws(()=>expandDeclarativeMacro(result.definition,structuredClone(result.invocation.trees)),/original or privately forwarded/);
});
test('general single-rule declarations preserve original header attributes visibility and matcher spans',()=>{
  const source='#[unknown] #[cfg(feature="unproved")] pub macro independent($($t:ty)*) {$($t)*}',definition=compileDeclarativeMacro(source,{name:'independent',owner:['fixture']}),header=declarativeDefinitionHeader(definition);
  assert.equal(render(expandDeclarativeMacro(definition,originalMacroTrees('bool u16'))),'bool u16');assert.equal(source.slice(definition.matcherSpan.start,definition.matcherSpan.end),'($($t:ty)*)');
  assert.equal(source.slice(header.span.start,header.span.end),source);assert.equal(header.visibility.sourceSha256,hash(source));assert.equal(header.attributes.length,2);assert.equal(header.attributes[0].ownerResolved,false);assert.equal(header.attributes[1].ownerResolved,false);assert.equal(header.attributeOwnersResolved,false);
  assert.throws(()=>declarativeDefinitionHeader(structuredClone(definition)),/Unsealed/);
});
test('single-rule syntax retains forbidden followers ambiguity and capture budgets independently of its name',()=>{
  for(const source of ['macro independent($t:ty trailing){$t}','macro independent($t:expr trailing){$t}','macro independent($t:ty,$t:ty){$t}','macro independent($t:ident){$missing}','macro independent($t:ident)[$t]','macro independent[$t:ident]{$t}','macro independent($t:ident){$t} macro independent($u:ident){$u}'])assert.throws(()=>compileDeclarativeMacro(source,{name:'independent',owner:['fixture']}),/follow set|Duplicate|Unbound|top-level/);
  const ambiguous=compileDeclarativeMacro('macro independent($($t:ident)* ending) {}',{name:'independent',owner:['fixture']});assert.throws(()=>expandDeclarativeMacro(ambiguous,originalMacroTrees('ending')),/ambiguous/);
  const repeat=compileDeclarativeMacro('macro independent($($t:ty)*) {$($t)*}',{name:'independent',owner:['fixture']});assert.throws(()=>expandDeclarativeMacro(repeat,originalMacroTrees('u8 bool'),{repetitions:1}),/budget/);
  const forwarded=expandDeclarativeMacro(repeat,originalMacroTrees('u8')),opaque=compileDeclarativeMacro('macro independent($t:ty) {OPAQUE}',{name:'independent',owner:['fixture']});assert.equal(render(expandDeclarativeMacro(opaque,declarativeSubInput(forwarded))),'OPAQUE');
});
