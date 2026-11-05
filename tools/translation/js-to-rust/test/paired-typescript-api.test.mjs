// Complete API-format regressions are source only until bulk drafting finishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {translatePortableRust} from '../portable-rust.mjs';
import {preservePairedTypeScriptAPI} from '../paired-typescript-api.mjs';
import {preparePairedTypeScriptAPI} from '../../prepare-paired-typescript-api.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
const optional='export type Count=number; type Maybe<T>=T|undefined; export function normalize(value?:Count):Maybe<Count>{if(value===undefined){return undefined;}return value+1;}';
function pair(original,rust){const next=translatePortableRust(rust);return {next,formatted:preservePairedTypeScriptAPI({original,typescript:next.typescript,program:next.program,rustSource:rust})};}

test('paired aliases and optional public parameters survive a real Rust behavior change',limits,async()=>{
 const first=translateTypeScript(optional),rust=first.rust.replace('+ 1.0','+ 2.0');assert.notEqual(rust,first.rust);const {next,formatted}=pair(optional,rust);
 assert.ok(formatted.typescript.includes('export type Count=number;'));assert.ok(formatted.typescript.includes('type Maybe<T>=T|undefined;'));assert.match(formatted.typescript,/value\?\s*:\s*Count/);assert.match(formatted.typescript,/\): Maybe<Count>/);
 assert.equal(formatted.history.equations[0].inverse,next.typescript);assert.equal(formatted.history.equations[1].inverse,transportConcreteSyntaxMeta(formatted.history.equations[0].afterMeta).source);assert.deepEqual(formatted.history.trace.map(row=>row.phase),['language','repository']);assert.equal(formatted.history.runtimeAuthority,false);
 const consumer='\nexport function withoutArgument(){return normalize();}\n';
 await verifyTypedTargets({...next,typescript:formatted.typescript+consumer,javascript:next.javascript+consumer},(_api,_result,module)=>{assert.equal(module.normalize(1),3);assert.equal(module.normalize(undefined),undefined);assert.equal(module.withoutArgument(),undefined);},{childTimeoutMs:20_000});
});
test('a required union parameter stays required while its exact scalar aliases are restored',limits,()=>{
 const original='type Maybe<T>=T|undefined; export function identity(value:Maybe<number>):Maybe<number>{return value;}',first=translateTypeScript(original),{formatted}=pair(original,first.rust);
 assert.match(formatted.typescript,/value: Maybe<number>/);assert.equal(formatted.typescript.includes('value?:'),false);assert.ok(formatted.typescript.includes('type Maybe<T>=T|undefined;'));
});
test('paired formatting cannot use forged signature data to replace authoritative Rust semantics',limits,()=>{
 const original='export function identity(value:string):string{return value;}',numeric=translateTypeScript('export function identity(value:number):number{return value;}'),next=translatePortableRust(numeric.rust),program=JSON.parse(JSON.stringify(next.program));
 program[0].params[0].type='string';program[0].returns='string';
 assert.throws(()=>preservePairedTypeScriptAPI({original,typescript:next.typescript,program,rustSource:numeric.rust}),/authoritative complete Rust syntax/);
});
test('a type-only paired file retains its actual aliases with a reversible independent witness',limits,()=>{
 const original='export type Count<T=number>=T;',numeric=translateTypeScript('export function identity(value:number):number{return value;}'),{formatted}=pair(original,numeric.rust);
 assert.ok(formatted.typescript.startsWith(original));assert.equal(formatted.history.typeOnlyWitness.inverse,original);assert.deepEqual(formatted.history.matchedFunctions,[]);
});
test('invalid or unsupported paired source refuses before it can overwrite a public API',limits,()=>{
 const numeric=translateTypeScript('export function identity(value:number):number{return value;}');
 for(const original of ['export function identity(value:string):number{return value;}','interface Domain{value:number} export function identity(value:Domain):number{return value.value;}'])assert.throws(()=>pair(original,numeric.rust));
});
test('whole synchronizer source retains the paired API integration with both CST inverses',limits,()=>{
 const plan=preparePairedTypeScriptAPI(),row=plan.files[0];assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);
});
