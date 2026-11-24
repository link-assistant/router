// Frozen pre-repair fixture for repeatable, bounded compression experiments.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

export function compressionBaseline(){
  const revision='7586d14b1331823be35a1289ad01c49e6018ffa9';
  const prefix='tools/translation/source-profiles/static-source-lifecycle/';
  const read=path=>execFileSync('git',['show',revision+':'+prefix+path],{maxBuffer:32*1024*1024});
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const index=JSON.parse(read('manifest.json')),original=read(index.archive);
  assert.equal(original.length,index.bytes);assert.equal(hash(original),index.sha256);
  const raw=gunzipSync(original,{maxOutputLength:32*1024*1024});
  assert.equal(raw.length,index.rawBytes);assert.equal(hash(raw),index.rawSha256);
  return {revision,index,original,raw};
}
