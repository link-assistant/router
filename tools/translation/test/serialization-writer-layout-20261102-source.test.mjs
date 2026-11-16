// Complete real substitution/CST cases SOURCE, not executed while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {proposeSerializationWriterLayoutSources} from '../serialization-writer-layout-20261102-source.mjs';
const options={timeout:30000,concurrency:false};
function packet(){return JSON.parse(gunzipSync(fs.readFileSync(new URL('../source-profiles/serialization-writer-layout-20261102/complete-source.json.gz',import.meta.url)),{maxOutputLength:2097152}).toString('utf8'));}
test('all original writer sources retain complete substitutions CST and independent native import inverse',options,()=>{
 const original=packet(),inputs=original.rows.map(row=>({path:row.path,source:row.before}));
 const result=proposeSerializationWriterLayoutSources(inputs);
 assert.equal(result.sourceInstalled,false);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
 assert.equal(result.rows.length,3);assert.equal(result.files.length,4);
 for(let at=0;at<result.rows.length;at++){
  const row=result.rows[at];assert.equal(row.after,original.rows[at].after);assert.equal(row.inverse,inputs[at].source);
  assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);
  assert.equal(row.history.inverse,inputs[at].source);
 }
 assert.equal(result.rows[2].history.concrete,false);
 assert.equal(result.nativeImportHistory.inverse,original.nativeImportEquation.before);
 for(const row of result.files){assert.equal(row.beforePresent,false);assert.equal(row.history.inverse,'');}
});
test('a public verdict or similar header cannot substitute for original complete source',options,()=>{
 const original=packet(),inputs=original.rows.map(row=>({path:row.path,source:row.before}));
 inputs[0].source+='\n';assert.throws(()=>proposeSerializationWriterLayoutSources(inputs),/exact original serialization source/u);
 const forged=original.rows.map(row=>({path:row.path,source:row.before,sourceAuthority:true}));
 assert.throws(()=>proposeSerializationWriterLayoutSources(forged),/exact original serialization source/u);
});
