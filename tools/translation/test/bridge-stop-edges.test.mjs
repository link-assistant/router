import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {associatedOriginalSourceReader} from './associated-original-context.mjs';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const file='src/bridge_response.rs';
const source=associatedOriginalSourceReader('bridge-stop-edges.test.mjs')(file);
const cases=JSON.parse(readFileSync(new URL('../../../parity/fixtures/translation/bridge-stop-edge-cases.json',import.meta.url),'utf8'));
const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});

test('complete original stop semantics executes shared Rust edge expectations in JS and strict TS',{timeout:60_000},async()=>{
 const result=translateSource(source,file);
 assert.equal(result.ir.items.map(row=>row.source).join(''),source);
 for(const name of ['stop_semantics','complete','incomplete'])assert.equal(result.ir.items.find(row=>row.name===name)?.status,'executable');
 assert.equal(result.ir.runtimeParity,false);
 assert.equal(cases.length,12);
 await verifyTypedTargets(result,api=>{
  for(const row of cases){
   const expected={$:'StopSemantics',chat_finish_reason:row.chat_finish_reason,response_status:row.response_status,incomplete_reason:row.incomplete_reason===null?none:some(row.incomplete_reason),refusal:row.refusal};
   const actual=api.stop_semantics(row.reason===null?none:some(row.reason));
   assert.deepEqual(actual,expected,JSON.stringify(row.reason));
   assert.equal(Object.isFrozen(actual),true);
   assert.equal(Object.isFrozen(actual.incomplete_reason),true);
   assert.notStrictEqual(actual,api.stop_semantics(row.reason===null?none:some(row.reason)));
  }
 },{childTimeoutMs:30_000});
});
