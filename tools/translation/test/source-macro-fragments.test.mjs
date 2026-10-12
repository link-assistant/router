import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {originalMacroInvocation} from '../macro-token-trees.mjs';
import {createOriginalMacroFragmentContext,isOriginalMacroFragmentContext,parseOriginalMacroFragment,isOriginalMacroAstFragment,originalMacroFragmentAst} from '../source-macro-fragments.mjs';
const setup=source=>{const parser=new HostRustParser(tokenizeRust(source)),input=originalMacroInvocation(source).trees,context=createOriginalMacroFragmentContext(parser,input,{sourceStart:0});return {parser,input,context};};
test('actual source expression and pattern productions capture complete original opaque intervals',()=>{
  const {parser,input,context}=setup('matches!(subject(),Some(n) | None if n>2)'),before=parser.cursor.index,subject=parseOriginalMacroFragment(context,'expr',input,0);
  assert.equal(subject.end,2);assert.equal(subject.capture.fragment,'expr');assert.equal(parser.cursor.index,before);
  const pattern=parseOriginalMacroFragment(context,'pat',input,subject.end+1);
  assert.equal(pattern.capture.ast.k,'or');assert.equal(input[pattern.end].text,'if');
  const guard=parseOriginalMacroFragment(context,'expr',input,pattern.end+1);assert.equal(guard.end,input.length);assert.equal(guard.capture.ast.k,'binary');
  assert.equal(originalMacroFragmentAst(context,pattern.capture),pattern.capture.ast);assert.equal(isOriginalMacroAstFragment(pattern.capture),true);assert.equal(Object.isFrozen(pattern.capture.trees),true);
  for(const key of ['macroOwnerResolved','namespaceAuthority','runtimeAuthority','applicationEffectCompleteness'])assert.equal(pattern.capture[key],false,key);
});
test('clones different sources parser module mutation and source intervals cannot claim captured ASTs',()=>{
  const first=setup('matches!(value,Some(n))'),second=setup('matches!(value,Some(n))'),capture=parseOriginalMacroFragment(first.context,'pat',first.input,2).capture;
  assert.equal(isOriginalMacroFragmentContext(structuredClone(first.context)),false);assert.equal(isOriginalMacroAstFragment(structuredClone(capture)),false);
  assert.throws(()=>originalMacroFragmentAst(second.context,capture),/differently owned/);assert.throws(()=>parseOriginalMacroFragment(first.context,'pat',second.input,2),/mismatched/);
  assert.throws(()=>createOriginalMacroFragmentContext(first.parser,originalMacroInvocation('matches!(other,Some(n))').trees,{sourceStart:0}),/exact original/);
  assert.throws(()=>createOriginalMacroFragmentContext(first.parser,first.input,{sourceStart:0,modulePath:['invented']}),/actual parser module/);
  const forged=setup('matches!(value,Some(n))');forged.parser.expr=()=>({k:'bool',value:true});assert.throws(()=>parseOriginalMacroFragment(forged.context,'expr',forged.input,0),/callbacks|method identity/);
  first.parser.modulePath=['changed'];assert.throws(()=>parseOriginalMacroFragment(first.context,'expr',first.input,0),/identity changed/);
});
test('unproved expression and pattern grammar keeps original parser refusals',()=>{
  for(const source of ['matches!(unsafe {value},Some(n))','matches!(value,ref n)','matches!(value,&Some(n))']) {
    const row=setup(source);assert.throws(()=>parseOriginalMacroFragment(row.context,source.includes('unsafe')?'expr':'pat',row.input,source.includes('unsafe')?0:2));
  }
});
