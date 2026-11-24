import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePinnedArithmeticCopySource,isArithmeticCopySource,arithmeticCopyExpansionProofs,arithmeticCopyExpansionLineage} from '../arithmetic-copy-source.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeExpansionLineage,declarativeSubInput} from '../declarative-macros.mjs';
import {originalMacroTrees,freezeMacroTree} from '../macro-token-trees.mjs';
import {originalMacroSequenceFollowRule} from '../macro-follow-source.mjs';
import {originalPrimitiveCloneExpansion} from '../extensions/primitive-clone-source.mjs';
test('actual full pinned Copy invocation recursively emits original empty impls with opaque type captures',()=>{
  const proof=compilePinnedArithmeticCopySource(),expansions=arithmeticCopyExpansionProofs(proof);assert.equal(proof.source.sha256,'db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809');assert.equal(proof.definition.name,'marker_impls');assert.equal(proof.implementations.length,20);assert.equal(expansions.length,21);assert.equal(proof.implementations.every(row=>row.trait==='Copy'&&row.target.kind==='fragment'&&row.target.fragment==='ty'&&row.body.children.length===0),true);
  const originalToken=tree=>{while(tree?.kind==='fragment'&&['ident','tt'].includes(tree.fragment)&&tree.trees.length===1)tree=tree.trees[0];return tree?.kind==='token'?tree.text:null;},tokens=proof.implementations.map(row=>row.target.trees.map(originalToken));assert.equal(tokens.some(row=>row.length===1&&row[0]==='u32'),true);assert.equal(tokens.some(row=>row.length===1&&row[0]==='u64'),true);assert.equal(tokens.filter(row=>row[0]==='*').length,2);for(let at=1;at<expansions.length;at++)assert.equal(arithmeticCopyExpansionLineage(expansions[at]).parent,expansions[at-1]);assert.equal(expansions.at(-1).trees.length,0);
  for(const key of ['primitiveTypeOwnerVerified','callerMacroOwnerVerified','traitOwnerVerified','attributeOwnerVerified','copyContractVerified','namespaceAuthority','parseAdmission','applicationEffectCompleteness','runtimeParity'])assert.equal(proof[key],false,key);
});
test('original Copy expansion seals cannot be reconstructed from cloned or publicly refrozen output syntax',()=>{
  const proof=compilePinnedArithmeticCopySource(),clone=structuredClone(proof);assert.equal(isArithmeticCopySource(clone),false);assert.throws(()=>arithmeticCopyExpansionProofs(freezeMacroTree(clone)),/Unsealed/);const expansion=arithmeticCopyExpansionProofs(proof)[0];assert.throws(()=>arithmeticCopyExpansionLineage(structuredClone(expansion)),/Unsealed/);assert.throws(()=>declarativeExpansionLineage(expansion),/Unsealed/);assert.equal(proof.generatedImplSyntaxVerified,true);assert.equal(proof.copyContractVerified,false);
});
test('type follow constraints examine optional-prefix and empty-suffix paths without exposing opaque capture matching',()=>{
  const valid='macro_rules! take {($t:ty $(, $($rest:tt)*)?)=>{$t};}',definition=compileDeclarativeMacro(valid,{name:'take',owner:['fixture']});for(const source of ['u32','u32,u64','*const u32','*mut u64']){const expansion=expandDeclarativeMacro(definition,originalMacroTrees(source));assert.equal(expansion.trees[0].kind,'fragment');assert.equal(expansion.trees[0].fragment,'ty');assert.equal(expansion.ownerVerified,false);}
  for(const source of ['*u32','*const','*mut'])assert.throws(()=>expandDeclarativeMacro(definition,originalMacroTrees(source)),/does not match/);
  const repeated=compileDeclarativeMacro('macro_rules! list {($($t:ty),*)=>{$($t),*};}',{name:'list',owner:['fixture']}),output=expandDeclarativeMacro(repeated,originalMacroTrees('u32,u64'));assert.equal(output.trees.filter(tree=>tree.kind==='fragment'&&tree.fragment==='ty').length,2);
  for(const pattern of ['$t:ty $(, $rest:tt)? foo','$t:ty $(, $rest:tt)? $(; $tail:tt)* foo','$t:ty $($(, $rest:tt)*)? foo','$t:ty $($rest:tt)*','$( $t:ty )? foo','$( $( $t:ty )? ),* foo'])assert.throws(()=>compileDeclarativeMacro('macro_rules! bad {('+pattern+')=>{};}',{name:'bad',owner:['fixture']}),/unproved Rust follow set/);
});
test('former separatorless type refusal follows the actual compiler rule and retains opaque source projections',()=>{
  const source='macro_rules! bad {($( $t:ty )*)=>{};}',definition=compileDeclarativeMacro(source,{name:'bad',owner:['fixture']});
  for(const input of ['','u32 bool *const u64']){const output=expandDeclarativeMacro(definition,originalMacroTrees(input));assert.deepEqual(output.trees,[]);assert.equal(output.ownerVerified,false);assert.equal(output.namespaceComplete,false);assert.equal(output.generatedBehavior,false);}
  const rule=originalMacroSequenceFollowRule();assert.equal(rule.includeOwnFirst,false);assert.equal(rule.includeSeparator,true);
  const completeOriginal=originalPrimitiveCloneExpansion();assert.equal(completeOriginal.members.length,18);assert.equal(completeOriginal.expansion.generatedBehavior,false);
  const projection=compileDeclarativeMacro('macro_rules! project {($( $t:ty )*)=>{$($t)*};}',{name:'project',owner:['independent']}),output=expandDeclarativeMacro(projection,originalMacroTrees('u32 bool *const u64'));
  assert.equal(output.trees.length,3);assert.ok(output.trees.every(tree=>tree.kind==='fragment'&&tree.fragment==='ty'));
  const receiver=compileDeclarativeMacro('macro_rules! receive {(u32)=>{WRONG};($t:ty)=>{OPAQUE};}',{name:'receive',owner:['independent']});
  const one=expandDeclarativeMacro(projection,originalMacroTrees('u32')),forwarded=expandDeclarativeMacro(receiver,declarativeSubInput(one));assert.equal(forwarded.trees[0].text,'OPAQUE');
  assert.throws(()=>expandDeclarativeMacro(projection,structuredClone(originalMacroTrees('u32'))),/original or privately forwarded/);assert.throws(()=>declarativeSubInput(structuredClone(one)),/Unsealed/);
});
