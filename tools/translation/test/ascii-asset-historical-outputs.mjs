// Complete historical comparison DATA. This does not issue compiler authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const names=['ascii-runtime-assets.mjs','ascii-runtime-assets-source-data.mjs',
 'ascii-base-runtime-assets.mjs','ascii-base-runtime-assets-source-data.mjs'];
const sha=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
export function readHistoricalAsciiAsset(path){
 const packed=readFileSync(new URL('./fixtures/ascii-asset-historical-outputs.json.gz',import.meta.url));
 assert.equal(packed.length,60929);
 assert.equal(sha(packed),'22ae85d5200ed151810b79c563ca11dd45981844d9018bb986c2cc6f66121cc8');
 const raw=gunzipSync(packed,{maxOutputLength:1_000_000});
 assert.equal(raw.length,270662);
 assert.equal(sha(raw),'16ab95467d186728e17586b5efc021df76092242552aa4cb8aadfa1c1c7d4789');
 const data=JSON.parse(raw.toString('utf8'));
 assert.equal(data.schema,'complete-historical-ascii-asset-outputs-v1');
 assert.equal(data.revision,'088e4772d42cecc544f6ea260fef6a8af89bad03');
 assert.equal(data.sourceAuthority,false);assert.equal(data.semanticAuthority,false);
 assert.deepEqual(data.files.map(row=>row.path),names.map(name=>'tools/translation/'+name));
 for(const row of data.files){
  const bytes=Buffer.from(row.source,'utf8');
  assert.equal(bytes.toString('utf8'),row.source);assert.equal(bytes.length,row.bytes);
  assert.equal(sha(bytes),row.sha256);
  assert.equal(sha(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1'),row.gitBlob);
 }
 const selected=data.files.filter(row=>row.path===path);
 assert.equal(selected.length,1,'one complete original historical ASCII asset: '+path);
 return selected[0].source;
}
