import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';

const limits={timeout:30000},fixture=()=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=> 'pub fn choose(value:bool)->u32{if value{3}else{7}}'});
async function environment(changes,run){
 const before=Object.fromEntries(Object.keys(changes).map(key=>[key,process.env[key]]));
 try{for(const [key,value]of Object.entries(changes))if(value===undefined)delete process.env[key];else process.env[key]=value;return await run();}
 finally{for(const [key,value]of Object.entries(before))if(value===undefined)delete process.env[key];else process.env[key]=value;}
}

test('whole cohort target checks use installed strict TypeScript without an ambient compiler',limits,async()=>{
 const result=fixture();let executions=0;
 await environment({PATH:'',ROUTER_TRANSLATION_TSC:undefined},()=>verifyCohortTargets(result,api=>{assert.equal(api.choose(true),3n);assert.equal(api.choose(false),7n);executions++;}));
 assert.equal(executions,2);
});

test('invalid whole cohort TypeScript still refuses before either runtime callback',limits,async()=>{
 const result=fixture();let executions=0;
 await environment({PATH:'',ROUTER_TRANSLATION_TSC:undefined},()=>assert.rejects(verifyCohortTargets({...result,typescript:result.typescript+'\nconst ml_invalid_cohort_fixture: string = 1;'},()=>{executions++;}),/not assignable to type 'string'/));
 assert.equal(executions,0);
});

test('a missing explicit whole cohort compiler remains fatal without a fallback',limits,async()=>{
 let executions=0;
 await environment({ROUTER_TRANSLATION_TSC:'/nonexistent/router-explicit-cohort-compiler'},()=>assert.rejects(verifyCohortTargets(fixture(),()=>{executions++;}),error=>error.cause?.code==='ENOENT'));
 assert.equal(executions,0);
});
