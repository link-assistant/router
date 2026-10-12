import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from '../declarative-macros.mjs';
import {loadStandardMatchesSourceProfile,standardMatchesOriginalDefinition} from '../matches-source-profile.mjs';
import {originalMacroInvocation} from '../macro-token-trees.mjs';
import {createOriginalMacroFragmentContext,isOriginalMacroFragmentContext,parseOriginalMacroFragment,isOriginalMacroAstFragment,originalMacroFragmentAst} from '../source-macro-fragments.mjs';
const setup=(source,options={})=>{const parser=new HostRustParser(tokenizeRust(source)),input=originalMacroInvocation(source).trees,context=createOriginalMacroFragmentContext(parser,input,{sourceStart:0,...options});return {parser,input,context};};
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

test('actual pinned rule transcribes private source AST fragments instead of constructing match rows',()=>{
  const profile=loadStandardMatchesSourceProfile(),row=setup('matches!(subject(),Some(n) | None if n>2,)',{definitionProfile:profile});
  const definition=compileDeclarativeMacro(standardMatchesOriginalDefinition(profile),{name:profile.name,owner:['core'],sourceFragments:row.context}),expanded=expandDeclarativeMacro(definition,row.input);
  assert.equal(expanded.trees[0].text,'match');assert.equal(expanded.trees[1].fragment,'expr');assert.equal(expanded.trees[2].delimiter,'{');
  const body=expanded.trees[2].children,pattern=body[0],guard=body.find(tree=>tree.kind==='fragment'&&tree.fragment==='expr');
  assert.equal(pattern.fragment,'pat');assert.equal(originalMacroFragmentAst(row.context,pattern.sourceAstCapture).k,'or');assert.equal(originalMacroFragmentAst(row.context,guard.sourceAstCapture).k,'binary');
  assert.equal(body.filter(tree=>tree.text==='true').length,1);assert.equal(body.filter(tree=>tree.text==='false').length,1);
  assert.equal(expanded.ownerVerified,false);assert.equal(expanded.namespaceComplete,false);assert.equal(expanded.generatedBehavior,false);
});
test('source AST grammar cannot certify a different definition edition or reconstructed source context',()=>{
  const profile=loadStandardMatchesSourceProfile(),row=setup('matches!(value,Some(n))',{definitionProfile:profile}),source=standardMatchesOriginalDefinition(profile);
  assert.throws(()=>compileDeclarativeMacro(source,{name:profile.name,owner:['core'],sourceFragments:structuredClone(row.context)}),/private original/);
  assert.throws(()=>compileDeclarativeMacro(source+' ',{name:profile.name,owner:['core'],sourceFragments:row.context}),/definition\/source edition differs/);
  assert.throws(()=>compileDeclarativeMacro(source,{name:'different',owner:['core'],sourceFragments:row.context}),/definition\/source edition differs/);
  assert.throws(()=>createOriginalMacroFragmentContext(row.parser,row.input,{sourceStart:0,definitionProfile:structuredClone(profile)}),/private pinned/);
  assert.throws(()=>compileDeclarativeMacro(source,{name:profile.name,owner:['core']}),/fragment is outside/);
  assert.throws(()=>compileDeclarativeMacro('macro_rules! bad {($($value:expr)? trailing)=>{};}',{name:'bad',owner:['fixture']}),/expression fragment has an unproved Rust follow set/);
});
