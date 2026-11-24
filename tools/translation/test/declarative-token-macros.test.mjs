import test from 'node:test';
import assert from 'node:assert/strict';
import * as source from '../declarative-macros.mjs';
import * as tokens from '../declarative-token-macros.mjs';
import {createDeclarativeMacroEngine} from '../declarative-macro-engine.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
const syntax='macro_rules! sample {($value:ty)=>{($value)};}';
const options={name:'sample',owner:['fixture']};

test('token and source AST engines reject each other definitions expansions and forwarding brands',()=>{
  const input=originalMacroTrees('u8'),sourceDefinition=source.compileDeclarativeMacro(syntax,options),tokenDefinition=tokens.compileDeclarativeMacro(syntax,options);
  assert.throws(()=>source.expandDeclarativeMacro(tokenDefinition,input),/sealed/);
  assert.throws(()=>tokens.expandDeclarativeMacro(sourceDefinition,input),/sealed/);
  const sourceExpansion=source.expandDeclarativeMacro(sourceDefinition,input),tokenExpansion=tokens.expandDeclarativeMacro(tokenDefinition,input);
  assert.equal(source.isDeclarativeExpansion(tokenExpansion),false);assert.equal(tokens.isDeclarativeExpansion(sourceExpansion),false);
  assert.throws(()=>source.declarativeSubInput(tokenExpansion),/Unsealed/);assert.throws(()=>tokens.declarativeNamespaceObservation(sourceExpansion),/privately checked/);
  assert.throws(()=>source.expandDeclarativeMacro(sourceDefinition,tokens.declarativeSubInput(tokenExpansion,[0])),/original or privately forwarded/);
  assert.throws(()=>tokens.expandDeclarativeMacro(tokenDefinition,source.declarativeSubInput(sourceExpansion,[0])),/original or privately forwarded/);
  const separate=createDeclarativeMacroEngine();assert.throws(()=>separate.expandDeclarativeMacro(tokenDefinition,input),/sealed/);
});

test('token-only engine rejects AST contexts without reading or invoking their callbacks',()=>{
  let reads=0,calls=0;const fragments={parse(){calls++;return {end:1,capture:{}};}};
  Object.defineProperty(fragments,'isOriginalMacroFragmentContext',{get(){reads++;return ()=>true;}});
  assert.throws(()=>tokens.compileDeclarativeMacro(syntax,{...options,sourceFragments:fragments}),/Token-only/);
  assert.equal(reads,0);assert.equal(calls,0);
  assert.throws(()=>tokens.compileDeclarativeMacro('macro_rules! sample {($value:pat)=>{$value};}',options),/outside the checked/);
  assert.equal(tokens.expandDeclarativeMacro(tokens.compileDeclarativeMacro(syntax,options),originalMacroTrees('u8')).generatedBehavior,false);
});
