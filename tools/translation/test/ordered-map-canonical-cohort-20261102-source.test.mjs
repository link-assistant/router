// Actual two-sequence/full-CST source proposal cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {proposeCanonicalMapCohortSourceCopies} from '../ordered-map-canonical-cohort-20261102-source.mjs';
const options={timeout:30000,concurrency:false};
function packet(){return JSON.parse(gunzipSync(fs.readFileSync(new URL('../source-profiles/ordered-map-canonical-cohort-20261102/complete-source.json.gz',import.meta.url)),{maxOutputLength:2097152}).toString('utf8'));}
test('complete original sync retains exact source inversion ordered phases and every authored source',options,()=>{
 const original=packet(),row=original.rows[0],result=proposeCanonicalMapCohortSourceCopies({path:row.path,source:row.before});
 assert.equal(result.after,row.after);assert.equal(result.inverse,row.before);assert.equal(result.history.inverse,row.before);
 assert.deepEqual(result.trace.map(stage=>stage.phase),['language','repository']);
 assert.equal(result.sourceInstalled,false);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
 assert.equal(result.files.length,original.authored.length);
 for(let at=0;at<result.files.length;at++){
  assert.equal(result.files[at].path,original.authored[at].path);assert.equal(result.files[at].source,original.authored[at].source);
  if(result.files[at].path.endsWith('.mjs'))assert.equal(result.files[at].history.inverse,'');
 }
});
test('similar current bytes or public source flags cannot replace the original module',options,()=>{
 const row=packet().rows[0];assert.throws(()=>proposeCanonicalMapCohortSourceCopies({path:row.path,source:row.before+'\n'}),/complete original synchronization module/u);
 assert.throws(()=>proposeCanonicalMapCohortSourceCopies({path:row.path,source:row.before,sourceAuthority:true}),/complete original synchronization module/u);
});
