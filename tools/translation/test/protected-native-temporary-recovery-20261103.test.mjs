// Actual native creation plus controlled source-observation failure. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {withProtectedNativeAsyncWriter} from '../protected-reviewed-adoption-20261102.mjs';
import {createProtectedSourceDiagnosticCollector,withProtectedSourceDiagnostics} from '../protected-source-diagnostics-20261103.mjs';
import {proposeProtectedNativeTemporaryRecoverySources} from '../protected-native-temporary-recovery-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('a post-creation source fault retains the real native recovery path and every exact falsy/frozen primary',{timeout:120000,concurrency:false},async t=>{
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'native-temporary-recovery-')));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 for(const [ordinal,primary]of [undefined,null,false,0,'',Object.freeze(new Error('frozen actual source observation fault'))].entries()){
  const root=join(parent,String(ordinal)),out=join(root,'out'),owned=join(root,'owned.txt');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(join(root,'translation'));fs.writeFileSync(owned,'source');fs.writeFileSync(join(root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['owned.txt'],unmanaged:[]}));const collector=createProtectedSourceDiagnosticCollector(),original=fs.lstatSync;let faulted=false,afterFaultReads=0,caught=false;
  try{await withProtectedSourceDiagnostics(collector,()=>withProtectedNativeAsyncWriter(ROOT,async()=>withProtectedNativeAsyncWriter(root,async lease=>{
   // Only the source observer faults. Native mkdtemp and all successful Stats
   // remain real; no supplied creation callback or forged metadata is used.
   fs.lstatSync=function(path,...args){if(path===owned){if(faulted)afterFaultReads++;else if(fs.readdirSync(out).some(name=>name.startsWith('complete-'))){faulted=true;throw primary;}}return original.call(fs,path,...args);};
   lease.makeTemporaryDirectory(join(out,'complete-'));
  })));}catch(error){caught=true;assert.equal(error,primary);}finally{fs.lstatSync=original;}
  assert.equal(caught,true);assert.equal(faulted,true);assert.ok(afterFaultReads>0,'source checks must still be attempted after the fault');const records=collector.close().records,event=records.find(row=>row.message.text==='Native temporary directory retained for explicit recovery');assert.ok(event,'real caller-owned recovery record required');assert.equal(event.recoveryPaths.paths.length,1);const created=event.recoveryPaths.paths[0];assert.equal(join(out,fs.readdirSync(out)[0]),created);assert.equal(fs.lstatSync(created).isDirectory(),true);assert.equal(fs.readFileSync(owned,'utf8'),'source');if(primary&&typeof primary==='object')assert.equal(Object.hasOwn(primary,'protectedTemporaryDirectoryRecovery'),false);
 }
});
test('recovery source correction preserves all three complete original parents and source phase inverses',{timeout:60000},()=>{
 const proposal=proposeProtectedNativeTemporaryRecoverySources();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(fs.readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);assert.equal(stage.history.inverse,stage.before);}}assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
});
