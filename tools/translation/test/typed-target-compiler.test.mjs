import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const fixture=()=>{
 const source='pub fn choose(value:bool)->u32{if value{3}else{7}}';
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
 assert.deepEqual(result.meta.executable.filter(row=>row.term==='fn').map(row=>row.name),['choose']);
 return result;
};
test('repository compiler strictly emits an independent target and preserves its original behavior',async()=>{
 const result=fixture();let executions=0;
 await verifyTypedTargets(result,api=>{assert.equal(api.choose(true),3n);assert.equal(api.choose(false),7n);executions++;},{childTimeoutMs:20000});
 assert.equal(executions,2);
});
test('invalid emitted TypeScript is rejected before either runtime verification callback',async()=>{
 const result=fixture();let executions=0;
 await assert.rejects(verifyTypedTargets({...result,typescript:result.typescript+'\nconst ml_invalid_fixture: string = 1;'},()=>{executions++;},{childTimeoutMs:20000}),error=>/not assignable to type 'string'/.test(String(error.stdout)));
 assert.equal(executions,0);
});
test('explicit compiler overrides remain mandatory and cannot silently fall back to a local compiler',async()=>{
 const saved=process.env.ROUTER_TRANSLATION_TSC;let executions=0;
 try{
  process.env.ROUTER_TRANSLATION_TSC='/nonexistent/router-759-explicit-compiler';
  await assert.rejects(verifyTypedTargets(fixture(),()=>{executions++;},{childTimeoutMs:20000}),error=>error.code==='ENOENT');
 }finally{if(saved===undefined)delete process.env.ROUTER_TRANSLATION_TSC;else process.env.ROUTER_TRANSLATION_TSC=saved;}
 assert.equal(executions,0);
});
