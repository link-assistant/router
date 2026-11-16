// Complete physical source packet regressions; storage grants no authority.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {proposeWholeOwnerProofByteCanonicalTrial,wholeOwnerProofByteTrialFilePacket,decodeWholeOwnerProofByteTrialFilePacket} from '../whole-owner-proof-byte-trial-support.mjs';
const root=new URL('../../../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function proposal(){return proposeWholeOwnerProofByteCanonicalTrial({root:root.pathname});}
test('all sixteen coherent sources remain complete while actual unchanged AST helpers use original byte packets',{timeout:60000},()=>{
 const plan=proposal(),same=plan.overlays.filter(row=>row.original===row.candidate);assert.equal(plan.overlays.length,16);
 for(const name of ['builtin-debug-ast-route.mjs','builtin-eq-ast-route.mjs','builtin-partial-eq-ast-route.mjs','builtin-ordering-ast-route.mjs'])assert.ok(same.some(row=>row.path==='tools/translation/'+name));
 for(const row of same){const fact=plan.requiredSourceInputs.find(fact=>fact.path===row.path),original=readFileSync(new URL(row.path,root));assert.ok(fact);assert.equal(original.toString(),row.original);const packet=wholeOwnerProofByteTrialFilePacket(fact,original,Buffer.from(row.candidate),{overlays:plan.overlays});assert.equal(packet.trial.sourceAssociation,'same-original-source');assert.equal(Object.hasOwn(packet.trial,'base64'),false);const decoded=decodeWholeOwnerProofByteTrialFilePacket(packet,fact,{overlays:plan.overlays});assert.deepEqual(decoded.original,original);assert.deepEqual(decoded.trial,original);
  assert.throws(()=>wholeOwnerProofByteTrialFilePacket(fact,original,Buffer.from(row.candidate+'\n'),{overlays:plan.overlays}));
  for(const mutate of [value=>{value.trial.base64='Zm9yZ2Vk';},value=>{value.trial.sourceAssociation='complete-candidate-source';},value=>{value.original.sha256='0'.repeat(64);}] ) {const changed=structuredClone(packet);mutate(changed);assert.throws(()=>decodeWholeOwnerProofByteTrialFilePacket(changed,fact,{overlays:plan.overlays}));}
 }
});
test('the codec must change and changed targets retain strict full-byte difference and membership refusals',{timeout:60000},()=>{
 const plan=proposal(),row=plan.overlays.find(row=>row.path==='tools/translation/builtin-source-meta.mjs'),fact=plan.requiredSourceInputs.find(fact=>fact.path===row.path),original=Buffer.from(row.original);assert.notEqual(row.original,row.candidate);
 const packet=wholeOwnerProofByteTrialFilePacket(fact,original,Buffer.from(row.candidate),{overlays:plan.overlays});assert.equal(packet.trial.sourceAssociation,'complete-candidate-source');assert.equal(typeof packet.trial.base64,'string');assert.deepEqual(decodeWholeOwnerProofByteTrialFilePacket(packet,fact,{overlays:plan.overlays}).trial,Buffer.from(row.candidate));
 const noCodecChange=plan.overlays.map(value=>value===row?{...value,candidate:value.original}:value);assert.throws(()=>wholeOwnerProofByteTrialFilePacket(fact,original,original,{overlays:noCodecChange}));
 assert.throws(()=>wholeOwnerProofByteTrialFilePacket(fact,original,Buffer.from(row.candidate),{overlays:[...plan.overlays.slice(1),plan.overlays[1]]}));
 const same=plan.overlays.find(value=>value.original===value.candidate),lossy=plan.overlays.map(value=>value===same?{...value,original:'\ufffd',candidate:'\ud800'}:value),bytes=Buffer.from('\ufffd'),lossyFact={path:same.path,bytes:bytes.length,sha256:hash(bytes)};
 assert.throws(()=>wholeOwnerProofByteTrialFilePacket(lossyFact,bytes,Buffer.from('\ud800'),{overlays:lossy}));
});
