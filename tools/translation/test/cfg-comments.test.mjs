import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {rustTokens} from '../rust-structure.mjs';
import {itemConfiguration,PRODUCTION_PROFILE,compilationProfile,isAbsentConditionalAttribute,isInertConditionalAttribute} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const retain=(name,value)=>{const output=process.env.ROUTER_CFG_COMMENT_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}};
const condition=(source,profile=PRODUCTION_PROFILE)=>itemConfiguration(rustTokens(source),profile);

test('leading ordinary comments preserve actual configuration and exact UTF16 attribute spans',{timeout:5000},()=>{
 const observations=[];
 for(const prefix of ['// before 😀\n','/* before λ😀 */\n','// first\n/* nested /* child */ rest */\n']){
  const source=prefix+'#[cfg(test)] pub fn hidden()->u8{1}',result=condition(source);assert.equal(result.status,'inactive');assert.equal(result.attributes.length,1);assert.equal(source.slice(result.attributes[0].span.start,result.attributes[0].span.end),'#[cfg(test)]');assert.equal(result.attributes[0].evaluation.value,false);observations.push({source,result});
 }
 retain('01-complete-prefixes',observations);
});

test('interleaved comments never erase later conditions or extend an attribute witness',{timeout:5000},()=>{
 const source='/* prefix */ #[cfg_attr(test,doc="absent")] // 😀 between\n/* between */ #[cfg(test)] pub fn hidden()->u8{1}',result=condition(source);assert.equal(result.status,'inactive');assert.deepEqual(result.attributes.map(row=>row.name),['cfg_attr','cfg']);assert.equal(isAbsentConditionalAttribute(result.attributes[0]),true);assert.deepEqual(result.attributes.map(row=>source.slice(row.span.start,row.span.end)),['#[cfg_attr(test,doc="absent")]','#[cfg(test)]']);
 retain('02-interleaved-originals',{source,result});
});

test('documentation comments do not select unknown literal-doc owners or drop malformed predicates',{timeout:5000},()=>{
 const observations=[];
 for(const prefix of ['/// original documentation\n','/** original documentation */\n','//! original inner documentation\n']){
  for(const profile of [null,compilationProfile({flags:{docs:true}}),compilationProfile({flags:{docs:false}})]){
   const source=prefix+'#[cfg_attr(docs,doc="candidate")] pub fn value()->u8{1}',result=condition(source,profile),attribute=result.attributes[0];assert.equal(result.status,profile?.flags.docs===false?'active':'unknown');assert.equal(isInertConditionalAttribute(attribute),profile?.flags.docs===false);assert.equal(attribute.evaluation.literalDocumentationCandidate.callerOwnerResolved,false);observations.push({source,profile,result});
  }
 }
 const source='// before\n#[cfg(not(test,))] pub fn value()->u8{1}',result=condition(source);assert.equal(result.status,'unknown');assert.ok(result.diagnostics.length);retain('03-unresolved-owners-and-grammar',{observations,source,result});
});

test('complete original commented items keep inactive functions absent through checked meta JavaScript and strict TypeScript',{timeout:60000},async()=>{
 const source='// 😀 before\n#[cfg(test)] pub fn hidden()->u8{9}\n/* before retained */ pub fn retained()->u8{7}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});retain('04-complete-original-and-translation',{source,result});assert.equal(result.meta.executable.some(row=>row.name==='hidden'),false);assert.equal(result.meta.executable.some(row=>row.name==='retained'),true);const observations=[];
 try{await verifyTypedTargets(result,api=>{assert.equal(api.retained(),7n);assert.equal(api.hidden,undefined);observations.push({retained:String(api.retained()),hidden:typeof api.hidden});},{childTimeoutMs:20000});}finally{retain('04-target-observations',observations);}assert.equal(observations.length,2);
});
