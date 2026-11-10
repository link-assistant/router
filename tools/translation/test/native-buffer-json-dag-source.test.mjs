import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {prepareNativeBufferJsonDag} from '../prepare-native-buffer-json-dag.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('complete native Buffer source retains the original closed codec both CST phases whole inverse and fresh original input refusal',{timeout:60000},()=>{
 const plan=prepareNativeBufferJsonDag();
 assert.equal(readFileSync(resolve(ROOT,plan.path),'utf8'),plan.after);
 assert.equal(plan.inverse,plan.before);assert.equal(plan.originalCodecChanged,false);
 assert.equal(plan.nativeBindings.nativeSemanticScopeChecked,true);
 assert.equal(plan.typescript,'5.9.3');
 assert.equal(plan.productionExecutableGain,0);assert.equal(plan.runtimeAuthority,false);
 assert.equal(plan.receivingQualified,false);assert.equal(plan.performanceQualified,false);
 const root=mkdtempSync(resolve(tmpdir(),'native-buffer-original-source-'));
 try{
  for(const path of ['tools/translation/source-profiles/native-buffer-json-dag/source-rules.json',
   'tools/translation/test/fixtures/complete-closed-json-dag-hook-wire.mjs']){
   mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),readFileSync(resolve(ROOT,path)));
  }
  const path=resolve(root,'tools/translation/test/fixtures/complete-closed-json-dag-hook-wire.mjs');
  writeFileSync(path,readFileSync(path,'utf8')+'\n// changed actual original source\n');
  assert.throws(()=>prepareNativeBufferJsonDag({root}),/Complete original codec changed/u);
 }finally{rmSync(root,{recursive:true,force:true});}
});
