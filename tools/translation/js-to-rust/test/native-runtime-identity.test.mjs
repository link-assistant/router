import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypeScript,runtimeAST} from '../native-typescript.mjs';
import {matchesNativeRuntimeAST} from '../native-runtime-identity.mjs';

const ts=loadTypeScript(resolve('.'));

test('direct runtime comparison preserves the complete public normalized tree',{timeout:60000},()=>{
 const sources=[
  '',
  '// Ω😀\r\nexport const value="猫😀";\r\n',
  '/** doc */ export function run(value){return value?.child?.(1)??null;}',
  'export const run=value=>(value?.child).value;',
  'export const run=value=>(value?.child)["value"];',
  'export const run=value=>(value?.child)();',
  'export const run=value=>new (value?.child)();',
  'export const run=value=>(value?.child)`literal`;',
  'export function run(value){return (((value+1)));}',
  'export function run(value){return /Ω+/u.test(value)&&1n===0x1n;}',
  'export class Base{constructor(){this.value=1;}static flag(){return true;}read(){return this.value;}}',
  'export async function* run(){yield await Promise.resolve(1);}',
 ];
 for(const source of sources){
  const expected=runtimeAST(ts,source),erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,useDefineForClassFields:false}}).outputText;
  assert.deepEqual(runtimeAST(ts,erased),expected);
  assert.equal(matchesNativeRuntimeAST(ts,erased,expected),true,source);
 }
});

test('relative import normalization is explicit and leaves other literal data intact',{timeout:60000},()=>{
 const source='import value from "./entry.mjs";export {other} from "./dependency.mjs";export const load=()=>import("./late.mjs");export const data="./entry.mjs";';
 const target=source.replace('"./entry.mjs"','"./entry.js"').replace('"./dependency.mjs"','"./dependency.js"').replace('"./late.mjs"','"./late.js"');
 const expected=runtimeAST(ts,source,{rewriteImports:true});
 assert.deepEqual(runtimeAST(ts,target),expected);assert.equal(matchesNativeRuntimeAST(ts,target,expected),true);
 assert.equal(matchesNativeRuntimeAST(ts,target.replace('data="./entry.mjs"','data="./entry.js"'),expected),false);
});

test('runtime differences reject optional boundaries order literals and missing syntax',{timeout:60000},()=>{
 const pairs=[
  ['export const run=v=>(v?.child).value;','export const run=v=>v?.child.value;'],
  ['export const run=v=>(v?.child)();','export const run=v=>v?.child();'],
  ['export const run=()=>f(a(),b());','export const run=()=>f(b(),a());'],
  ['export const value="😀";','export const value="🦊";'],
  ['export const value=1n;','export const value=2n;'],
  ['export const value=0;','export const value=-0;'],
  ['export const value=/a/u;','export const value=/b/u;'],
  ['export const value=7;',''],
 ];
 for(const [source,target]of pairs){
  const expected=runtimeAST(ts,source);assert.notDeepEqual(runtimeAST(ts,target),expected);
  assert.equal(matchesNativeRuntimeAST(ts,target,expected),false,source);
 }
 const expected=runtimeAST(ts,'export const value=7;');
 assert.throws(()=>matchesNativeRuntimeAST(ts,'export const =;',expected),/invalid runtime syntax/u);
 for(const malformed of [null,[],[0],[ts.SyntaxKind.SourceFile,false,[]]])assert.equal(matchesNativeRuntimeAST(ts,'',malformed),false);
});
