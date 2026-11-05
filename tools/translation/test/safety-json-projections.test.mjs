import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {translateProject} from '../project.mjs';
import {prepareSafetyJsonProjections} from '../prepare-safety-json-projections.mjs';
import {proposeCoreJsonTypeMatches} from '../migrate-core-json-type-matches.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
const project=source=>{
 const files={'src/lib.rs':'pub mod translation_core; pub mod safety_identifier;','src/safety_identifier.rs':source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE};
 return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
};
test('both production JSON validators use ordered source substitutions with complete CST inverses',{timeout:60000},()=>{
 const plan=prepareSafetyJsonProjections(),proposal=plan.proposal;
 assert.equal(plan.files[0].current,plan.files[0].after);assert.equal(proposal.inverse,proposal.before);assert.equal(proposal.semanticAuthority,false);
 assert.deepEqual(proposal.selections.map(row=>row.name),['validate_openai_value','validate_openai_user_value']);
 assert.deepEqual(proposal.stages.map(row=>row.phase),['language','repository']);
 for(const stage of proposal.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);}
 assert.equal(proposeCoreJsonTypeMatches(proposal.after).selections.length,0);
 for(const source of [proposal.before.replaceAll('crate::translation_core::Json::','Foreign::'),proposal.before.replaceAll('Some(_) => Err','Some(false) => Err')])assert.equal(proposeCoreJsonTypeMatches(source).selections.length,0);
});
test('production source preparation refuses changed actual libraries and a private crate edge',{timeout:60000},t=>{
 const plan=prepareSafetyJsonProjections(),directory=mkdtempSync(join(tmpdir(),'router-safety-library-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const put=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
 for(const row of plan.libraryInputs)put(row.path,row.source);
 put('tools/translation/source-profiles/core-json-type-matches/safety_identifier.rs.txt',plan.files[0].before);put('rust/src/safety_identifier.rs',plan.files[0].before);
 assert.equal(prepareSafetyJsonProjections({root:directory}).files[0].after,plan.files[0].after);
 for(const row of plan.libraryInputs.slice(0,2)){put(row.path,row.source+'\n');assert.throws(()=>prepareSafetyJsonProjections({root:directory}),/actual owned library source/);put(row.path,row.source);}
 put('rust/src/lib.rs','mod translation_core;\n');assert.throws(()=>prepareSafetyJsonProjections({root:directory}),/public owned library edge/);
});
test('all five complete production safety functions execute after JSON pattern lowering',{timeout:60000},async()=>{
 const plan=prepareSafetyJsonProjections(),before=project(plan.files[0].before),after=project(plan.files[0].after),names=['validate_openai','validate_openai_value','validate_openai_user','validate_openai_user_value','anthropic_user_id'];
 for(const name of ['validate_openai_value','validate_openai_user_value'])assert.equal(before.meta.executable.some(row=>row.name==='safety_identifier.'+name),false);
 for(const name of names)assert.ok(after.meta.executable.some(row=>row.name==='safety_identifier.'+name),name+': complete production function executes');
 for(const row of before.meta.executable)assert.ok(after.meta.executable.some(value=>value.name===row.name),row.name+': no executable function lost');
 assert.equal(readFileSync(new URL('../../../rust/src/safety_identifier.rs',import.meta.url),'utf8'),plan.files[0].after);
 await verifyTypedTargets(after,api=>{
  const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value}),ok={$:'Ok',field0:null};
  const json=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
  for(const name of ['validate_openai_value','validate_openai_user_value']){
   const run=value=>api['safety_identifier.'+name](value);
   assert.deepEqual(run(none),ok);assert.deepEqual(run(some(json(null))),ok);
   for(const value of ['', 'a'.repeat(64),'😀'.repeat(64),'e\u0301'.repeat(32)])assert.deepEqual(run(some(json(value))),ok);
   const label=name==='validate_openai_value'?'safety_identifier':'user';
   for(const value of [false,true,0,-1,1.25,[],{},['text'],{text:'value'}])assert.deepEqual(run(some(json(value))),{$:'Err',field0:label+' must be a string'});
   for(const value of ['a'.repeat(65),'😀'.repeat(65),'e\u0301'.repeat(33)])assert.deepEqual(run(some(json(value))),{$:'Err',field0:label+' must contain at most 64 characters'});
  }
  assert.deepEqual(api['safety_identifier.anthropic_user_id'](json({metadata:{user_id:'Ω😀'}})),{$:'Ok',field0:{$:'Some',field0:'Ω😀'}});
 },{childTimeoutMs:20000});
});
