import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareAttributeOwnerNodeProfile} from '../prepare-attribute-owner-node-profile.mjs';
import {originalAttributeOwnerBulkCryptoReady} from '../attribute-owner-bulk-crypto.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('separate current official Node profile preserves every original pin and complete native guard inverse',{timeout:60000},()=>{
 const plan=prepareAttributeOwnerNodeProfile();
 assert.equal(plan.files.length,2);assert.equal(plan.originalProfilePreserved,true);assert.equal(plan.privateIssuersUnchanged,true);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeParity,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.typescriptVersion,'5.9.3');
 assert.deepEqual(plan.profiles.map(row=>row.version),['20.19.4','20.20.2']);
 for(const input of plan.inputs){const bytes=readFileSync(resolve(root,input.path));assert.equal(hash(bytes),input.sha256);assert.equal(bytes.toString('base64'),input.base64);}
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 const guard=plan.files.find(row=>row.path.endsWith('attribute-owner-bulk-crypto.mjs'));
 assert.equal(hash(guard.before),'9725a02c0c7111635f998cacfe213f529562da6cad41d1348e8702fdfc8831f9');
 assert.notEqual(plan.profiles[0].values.Hash,plan.profiles[1].values.Hash);
 for(const profile of plan.profiles){assert.equal(profile.spans.length,7);for(const row of profile.spans){const text=readFileSync(resolve(root,row.path),'utf8');assert.equal(text.slice(...row.span),row.source);assert.equal(row.source,profile.values[row.name]);}}
});

test('one changed complete current source license or original generated profile refuses preparation',{timeout:60000},()=>{
 const plan=prepareAttributeOwnerNodeProfile();
 for(const suffix of ['node-v20.20.2/hash.js','node-v20.20.2/LICENSE.gz','attribute-owner-bulk-crypto-source.mjs','node-v20.19.4/attribute-owner-bulk-crypto.mjs.gz']){
  const dir=mkdtempSync(resolve(tmpdir(),'router-node-profile-refusal-'));
  try{
   for(const input of plan.inputs){const path=resolve(dir,input.path);mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,Buffer.from(input.base64,'base64'));}
   const input=plan.inputs.find(row=>row.path.endsWith(suffix));assert.ok(input);
   const bytes=Buffer.from(input.base64,'base64');bytes[bytes.length-1]^=1;writeFileSync(resolve(dir,input.path),bytes);
   assert.throws(()=>prepareAttributeOwnerNodeProfile({root:dir}),/pin differs|license|generated function source differs|qualification guard|incorrect|check|length/iu);
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
});

test('exact current Node ABI qualifies while unlisted runtimes retain their original fallback',{timeout:60000},()=>{
 if(!process.versions.bun&&['20.19.4','20.20.2'].includes(process.versions.node))assert.equal(originalAttributeOwnerBulkCryptoReady(),true);
 else assert.equal(originalAttributeOwnerBulkCryptoReady(),false);
 const fixture=fileURLToPath(new URL('./fixtures/attribute-owner-node-profile-child.mjs',import.meta.url));
 for(const kind of ['unknown-version','observed-update','inherited-symbol-accessor']){
  const run=spawnSync(process.execPath,[fixture,kind],{encoding:'utf8',timeout:12500,maxBuffer:1024*1024});
  assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');
  assert.deepEqual(JSON.parse(run.stdout),{kind,ready:false,observations:0,restoredReady:false});
 }
});
