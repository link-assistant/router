// Independent exact decimal/source bounds regression SOURCE. Deliberately UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
import {checkAsyncControlCallerFlow,emitAsyncControlCallerFlow} from '../async-control-caller-flow.mjs';
import {translateAsyncControlCallerJavaScript} from '../async-control-callers.mjs';
import {prepareAsyncU64LiteralBoundSources} from '../../prepare-async-u64-literal-bound-sources.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets} from './async-control-receiving-fixture.mjs';
const limits={timeout:60000},prelude='import {router_async_channel as channel} from "./runtime/async-control-runtime.mjs";\n',source=literal=>prelude+'export function bounded(){return channel('+literal+');}',translate=literal=>translateAsyncControlCallerJavaScript(source(literal),asyncControlReceivingInput().options);
function parsedFlow(literal){const ts=ownershipCompiler(),text='function caller(){return channel('+literal+');}',file=ts.createSourceFile('literal.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const declaration=file.statements[0];return ()=>checkAsyncControlCallerFlow(ts,declaration.body.statements,[],new Map([['channel','router_async_channel']]));}
test('exact bounded decimal DATA selection needs no BigInt host conversion and keeps every native boundary',limits,()=>{
 const fixtures=[['0n','0'],['1n','1'],['9007199254740993n','9007199254740993'],['18_446_744_073_709_551_615n','18446744073709551615']],reads=fixtures.map(([literal])=>parsedFlow(literal)),original=Object.getOwnPropertyDescriptor(globalThis,'BigInt');let calls=0;try{Object.defineProperty(globalThis,'BigInt',{...original,value(){calls++;throw new Error('unneeded host BigInt conversion');}});for(const [index,[,wanted]]of fixtures.entries()){const flow=reads[index]();assert.equal(flow.tail.value.args[0].value,wanted);assert.ok(emitAsyncControlCallerFlow(flow).includes(wanted+'_u64'));}}finally{Object.defineProperty(globalThis,'BigInt',original);}assert.equal(calls,0);
});
test('decimal overflow huge digit strings and unselected radix syntax refuse before any host BigInt conversion',limits,()=>{
 const reads=['18446744073709551616n','99999999999999999999n','100000000000000000000n','9'.repeat(128)+'n','0xffffn','0b100n'].map(parsedFlow),original=Object.getOwnPropertyDescriptor(globalThis,'BigInt');let calls=0;try{Object.defineProperty(globalThis,'BigInt',{...original,value(){calls++;throw new Error('unneeded host BigInt conversion');}});for(const read of reads)assert.throws(read,/bounded|decimal|overflow/u);}finally{Object.defineProperty(globalThis,'BigInt',original);}assert.equal(calls,0);
});
test('actual complete source and strict TS retain valid small channels and exact InvalidInput at maximum native capacity',limits,async()=>{
 for(const [literal,wanted]of [['0n','Err'],['1n','Ok'],['18_446_744_073_709_551_615n','Err']]){const result=translate(literal);assert.equal(result.javascript,source(literal));await verifyAsyncControlTargets(result,async(api,runtime)=>{const value=api.bounded();assert.equal(value.$,wanted);if(value.$==='Ok')runtime.router_async_dispose(value.field0[1]);else assert.equal(value.field0.$,'InvalidInput');});}for(const literal of ['18446744073709551616n','9'.repeat(128)+'n'])assert.throws(()=>translate(literal));
});
test('two complete source equations retain all original input bounds native owners phases and full inverses',limits,()=>{
 const plan=prepareAsyncU64LiteralBoundSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
