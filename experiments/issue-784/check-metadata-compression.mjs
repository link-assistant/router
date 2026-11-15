// Read-only bounded metadata factoring experiment; preserve every value and key.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {compressionBaseline} from './compression-baseline.mjs';
const {raw}=compressionBaseline();
const container=JSON.parse(raw),payload=container.payload.payload;
assert.equal(container.metadataEncoding,'source-index-v1');
const ids=Object.keys(payload.sources),references=[];
for(const profile of [...payload.profiles,payload.current])references.push(...profile.files);
for(const stage of payload.lineage)for(const wrapped of stage.files){
  if(Array.isArray(wrapped)&&wrapped[0]==='router-lineage-row-v1'){
    const row=wrapped[1];for(const side of ['before','after'])if(row[side])references.push(row[side]);
  }
}
let count=0;
for(const row of references){
  const source=payload.sources[ids[row.sourceId]];
  assert.ok(source&&source.gitBlob===row.gitBlob);
  row.gitBlob=row.sourceId;count++;
}
container.metadataEncoding='source-and-blob-index-v1';
const modified=Buffer.from(JSON.stringify(container)+'\n');
const variants=[1,9].map(level=>{const packed=gzipSync(modified,{level,mtime:0});
  assert.ok(gunzipSync(packed,{maxOutputLength:32*1024*1024}).equals(modified));
  return {level,bytes:packed.length,fits:packed.length<=4194304};});
for(const row of references)row.gitBlob=payload.sources[ids[row.gitBlob]].gitBlob;
container.metadataEncoding='source-index-v1';
assert.ok(Buffer.from(JSON.stringify(container)+'\n').equals(raw));
const result={rawBytes:modified.length,references:count,variants,completeBytesRestored:true};
writeFileSync('ci-logs/restart-metadata-compression.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
