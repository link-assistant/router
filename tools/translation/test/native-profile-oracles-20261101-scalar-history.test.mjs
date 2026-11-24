// Independent whole-history case sources. UNRUN; no native child is allowed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {readNativeScalarOperationalSuccessorSource,visitNativeScalarOperationalSourceEquations} from '../native-profile-oracles-20261101-scalar-history.mjs';
import {visitNativeProfilePortableIntegrationSources} from '../native-profile-oracles-20261101-portable-history.mjs';
import {readBoundedTrackedSourceBytes,withBoundedTrackedSourceOperation} from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {withNativeOracleReadOnlySourceGit,withoutNativeOracleSubprocesses} from './native-profile-oracles-20261101-fixture.mjs';
const options={timeout:60000,concurrency:false},root=fileURLToPath(new URL('../../../',import.meta.url));
const archive='tools/translation/source-profiles/native-profile-oracles-20261101/scalar-integration.json.gz';
const predecessor='tools/translation/source-profiles/native-profile-oracles-20261101/portable-integration.json.gz';
function sourceCase(run){return withNativeOracleReadOnlySourceGit(root,()=>withBoundedTrackedSourceOperation(root,()=>{
 const packet=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(readBoundedTrackedSourceBytes(root,archive,{maxBytes:2097152}),{maxOutputLength:4194304})));
 assert.equal(packet.schema,'native-profile-scalar-integration-complete-sources-v1');assert.equal(packet.rows.length,7);
 assert.equal(packet.predecessorArchive.path,predecessor);assert.equal(packet.execution,'UNRUN');
 return run(packet);
}));}
test('every complete actual operational successor delivers two-phase serialized/reparsed CST and full inverse',options,()=>sourceCase(packet=>{
 const events=[];const receipt=visitNativeScalarOperationalSourceEquations(event=>{
  const row=packet.rows[events.length];assert.ok(row);assert.equal(event.path,row.path);assert.equal(event.history.before,row.before);assert.equal(event.history.after,row.after);assert.equal(event.history.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,row.after);
  assert.deepEqual(event.history.trace.map(item=>item.phase),['language','repository']);
  assert.equal(readBoundedTrackedSourceBytes(root,row.path,{maxBytes:2097152}).toString('utf8'),row.after);
  assert.equal(readNativeScalarOperationalSuccessorSource(row.path,row.before),row.after);
  assert.equal(event.semanticAuthority,false);assert.equal(event.rustAuthority,false);events.push(event.path);return null;
 });
 assert.deepEqual(events,packet.rows.map(row=>row.path));assert.equal(receipt.receipts.length,7);assert.equal(receipt.execution,'UNRUN');assert.equal(receipt.rustAuthority,false);assert.equal(receipt.semanticAuthority,false);
}));
test('all original seven portable rows survive and every changed row joins the complete original-after image',options,()=>sourceCase(packet=>{
 const old=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(readBoundedTrackedSourceBytes(root,predecessor,{maxBytes:2097152}),{maxOutputLength:4194304})));
 const oldPaths=old.rows.map(row=>row.path),observed=[];
 const receipt=visitNativeProfilePortableIntegrationSources(event=>{
  const row=old.rows[observed.length];assert.ok(row);assert.equal(event.path,row.path);assert.equal(event.history.before,row.before);assert.equal(event.history.after,row.after);assert.equal(event.history.inverse,row.before);
  const next=packet.rows.find(next=>next.path===row.path);
  if(next){assert.equal(next.before,row.after);assert.equal(readNativeScalarOperationalSuccessorSource(next.path,next.before),next.after);}
  else assert.equal(readBoundedTrackedSourceBytes(root,row.path,{maxBytes:2097152}).toString('utf8'),row.after);
  observed.push(event.path);return null;
 });
 assert.deepEqual(observed,oldPaths);assert.equal(observed.length,7);assert.equal(receipt.historicalRowsRemainUnchanged,true);
}));
test('third native workload preserves every original control case, command and deadline',options,()=>sourceCase(packet=>{
 const row=packet.rows.find(row=>row.path.endsWith('/native-profile-oracles-20261101-control.test.mjs'));
 for(const match of row.before.matchAll(/test\('([^']+)'/gu))assert.ok(row.after.includes("test('"+match[1]+"'"),match[1]);
 const control=packet.rows[0];assert.ok(control.before.includes("id:'persistent-output-20261101'"));assert.ok(control.before.includes("id:'dynamic-primitive-output-20261101'"));
 assert.ok(control.after.includes("id:'json-scalar-readers-20261101'"));
 assert.ok(control.after.includes('deadlineMs:1200000'));assert.ok(control.after.includes('jobs:2'));
 const materialize=packet.rows.find(row=>row.path.endsWith('-materialize.mjs'));
 assert.ok(materialize.after.includes('if(object.parent)archives.push(object.parent)'));
 assert.ok(materialize.after.includes("['json-scalar-readers-20261101',visitPortableJsonScalarReadersSourceEquations]"));
 assert.throws(()=>readNativeScalarOperationalSuccessorSource('../outside',control.before));
 assert.throws(()=>readNativeScalarOperationalSuccessorSource(control.path,control.before+'\n'));
}));
for(const [index,primary]of [undefined,null,false,0,'',Object.freeze(Error('scalar history primary'))].entries())test('source closing preserves exact primary '+index,options,()=>sourceCase(()=>{
 let caught=false;try{visitNativeScalarOperationalSourceEquations(()=>{throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);
}));
test('detached history DATA cannot start native work, even on a hosted test runner',options,async()=>{
 const receipt=sourceCase(()=>visitNativeScalarOperationalSourceEquations(()=>null));
 await withoutNativeOracleSubprocesses(async()=>{
  const gate=await import('../native-profile-oracles-20261101-gate.mjs');
  const native=await import('../native-profile-oracles-20261101-process.mjs');
  for(const fake of [receipt,structuredClone(receipt),{...receipt,executionAuthority:true}]){
   await assert.rejects(gate.requireNativeProfileOracleCiGate(fake),/foreign gate/);
   await assert.rejects(native.runNativeProfileOracle(fake,{}),/foreign gate/);
  }
 });
});
