// Independently compare complete historical sources before installing a proposal.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,basename} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {decodeStaticSourceTextData} from '../../tools/translation/static-source-layout-storage.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const label=process.argv[2]??'restart-static';
const receipt=JSON.parse(readFileSync('ci-logs/'+label+'-proposal.json'));
const installed='tools/translation/source-profiles/static-source-lifecycle';
const read=folder=>{
  const index=JSON.parse(readFileSync(join(folder,'manifest.json')));
  const packed=readFileSync(join(folder,index.archive));
  assert.equal(packed.length,index.bytes);assert.equal(hash(packed),index.sha256);
  const raw=gunzipSync(packed,{maxOutputLength:64*1024*1024});
  assert.equal(raw.length,index.rawBytes);assert.equal(hash(raw),index.rawSha256);
  return decodeStaticSourceTextData(raw,index).bundle;
};
const original=read(installed),proposed=read(receipt.output);
assert.deepEqual(proposed.profiles,original.profiles);
assert.deepEqual(proposed.cases,original.cases);
assert.deepEqual(proposed.authority,original.authority);
for(const profile of original.profiles)for(const row of profile.files){
  assert.equal(proposed.sources[row.sourceId].source,original.sources[row.sourceId].source);
}
for(const row of proposed.current.files){
  const actual=readFileSync(row.path);
  assert.equal(actual.length,row.bytes);assert.equal(hash(actual),row.sourceId);
  assert.equal(proposed.sources[row.sourceId].source,actual.toString('utf8'));
}
assert.ok(readFileSync(join(receipt.output,'NOTICE.md')).equals(readFileSync(join(installed,'NOTICE.md'))));
for(const row of receipt.files){const bytes=readFileSync(join(receipt.output,basename(row.path)));
  assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);}
const result={historicalProfiles:proposed.profiles.map(row=>({revision:row.revision,files:row.files.length})),
  historicalSourceBytesUnchanged:true,currentFiles:proposed.current.files.length,
  currentPhysicalBytesMatch:true,noticeUnchanged:true,semanticAuthority:false};
writeFileSync('ci-logs/'+label+'-review.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
