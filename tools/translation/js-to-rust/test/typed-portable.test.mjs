// Independent regression source only: execution is deferred during bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript,translateTypeScriptConcreteSyntaxMeta,readTypeScriptSourceMeta} from '../typed-portable.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60000};

test('native scalar aliases parameter return and local annotations retain all constraints and whole source inverse',limits,()=>{
 const source='type Count=number; export function twice(value: Count): Count { const doubled: Count = value * 2; return doubled; }';
 const result=translateTypeScript(source);assert.match(result.rust,/fn twice/);assert.match(result.rust,/f64/);assert.ok(result.javascript.includes('@param {number} value'));assert.ok(result.javascript.includes('@returns {number}'));assert.equal(result.javascript.includes('type Count='),false);assert.equal(result.javascript.includes(': Count'),false);assert.equal(result.typeAnnotationHistory.contracts.length,1);assert.equal(result.typeAnnotationHistory.locals.length,1);
 assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);assert.equal(transportConcreteSyntaxMeta(result.originalTypeScriptConcreteSyntax.meta).source,source);assert.deepEqual(result.typedSourceRuleTrace.map(row=>row.phase),['language','language','repository']);assert.equal(readTypeScriptSourceMeta(result.meta,source).length,1);
});
test('independent string and boolean signatures reach the existing Rust semantic emitter',limits,()=>{
 const source='type Flag = boolean; type Label = string; export function choose(flag: Flag, yes: Label, no: Label): Label { if(flag){return yes;} return no; }';
 const result=translateTypeScript(source);assert.match(result.javascript,/@param \{boolean\} flag/);assert.match(result.javascript,/@param \{string\} yes/);assert.match(result.typescript,/boolean/);assert.match(result.rust,/bool/);assert.match(result.rust,/str/);assert.equal(result.runtimeParity,false);assert.equal(result.wholeRouterSynchronization,false);
});
test('annotation mismatches remain errors rather than erased type claims',limits,()=>{
 for(const source of [
  'export function wrong(value: number): string { return value; }',
  'export function wrong(value: string): number { return value; }',
  'export function wrong(value: number): number { const local: boolean = value; return value; }',
  'export const limit: boolean = 3; export function identity(value: number): number { return value; }',
 ])assert.throws(()=>translateTypeScript(source));
});
test('closed nullable and undefined scalar aliases retain distinct existing absence contracts',limits,()=>{
 for(const [annotation,contract,rust]of [['string | null','string|null','JsNullable'],['null | number','number|null','JsNullable'],['boolean | undefined','boolean|undefined','JsOptional']]){
  const source='type Maybe='+annotation+'; export function identity(value: Maybe): Maybe {return value;}';
  const result=translateTypeScript(source);assert.ok(result.javascript.includes('@param {'+contract+'} value'));assert.ok(result.rust.includes(rust));assert.equal(result.typeAnnotationHistory.contracts[0].parameters[0].type,contract);assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);
 }
 for(const source of ['export function mixed(value: string | null | undefined): string | null | undefined {return value;}','export function narrowed(value: true): true {return value;}','export function omitted(value?: string): string | undefined {return value;}'])assert.throws(()=>translateTypeScript(source),TypeError);
});
test('cycles unresolved aliases opaque types and runtime assertions retain explicit refusals',limits,()=>{
 for(const source of [
  'type A=B; type B=A; export function cycle(value: A): A { return value; }',
  'export function missing(value: Missing): number { return 1; }',
  'export function anyValue(value: any): number { return value; }',
  'export function asserted(value: number): number { return value as number; }',
  'export function asserted(value: number): number { return value!; }',
  'export function asserted(value: number): number { return value satisfies number; }',
  'interface Value {x:number} export function object(value: Value): number {return value.x;}',
  'enum Value {One} export function enumValue(value: Value): number {return value;}',
  'export async function eager(value: number): Promise<number> {return value;}',
 ])assert.throws(()=>translateTypeScript(source),TypeError);
});
test('source-linked native TypeScript concrete input and changed semantic payload keep fresh associations',limits,()=>{
 const source='export function identity(value: number): number {return value;}';
 const concrete=transportConcreteSyntaxSource(source,{language:'TypeScript'}),first=translateTypeScript(source),second=translateTypeScriptConcreteSyntaxMeta(concrete.meta);assert.equal(first.meta,second.meta);assert.equal(first.rust,second.rust);assert.equal(first.typescript,second.typescript);
 assert.throws(()=>translateTypeScriptConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).meta),/TypeScript concrete input/);assert.throws(()=>readTypeScriptSourceMeta(first.meta,source.replace('return value','return value + 1')),/freshly checked/);assert.throws(()=>readTypeScriptSourceMeta(first.meta+'\n',source),/freshly checked/);
});
test('complete scalar targets execute independent binary64 and string branch cases in JavaScript and strict TypeScript',limits,async()=>{
 const source='export function identity(value: number): number {return value;} export function choose(flag: boolean, yes: string, no: string): string {if(flag){return yes;}return no;}';
 const result=translateTypeScript(source);await verifyTypedTargets(result,(_api,_result,module)=>{
  for(const value of [0,-0,1,-1,Number.MIN_VALUE,Number.MAX_VALUE,Infinity,-Infinity,NaN])assert.ok(Object.is(module.identity(value),value));
  assert.equal(module.choose(true,'雪','🦀'),'雪');assert.equal(module.choose(false,'雪','🦀'),'🦀');assert.equal(module.choose(true,'','other'),'');
 },{childTimeoutMs:20000});
});
