// Bounded read-only check of the actual source fixture's export compatibility.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {TRANSLATOR_EXPORT_LIMITS} from '../../tools/translation/export-bundle.mjs';
import {gzipSync as portableGzipSync} from '../../tools/translation/vendor/fflate/index.mjs';
import {compressionBaseline} from './compression-baseline.mjs';

const {original,raw}=compressionBaseline();
const variants=[];
for(const options of [{level:8},{level:7}]){
  const packed=gzipSync(raw,{...options,mtime:0});
  assert.ok(gunzipSync(packed,{maxOutputLength:32*1024*1024}).equals(raw));
  variants.push({options,bytes:packed.length,fits:packed.length<=TRANSLATOR_EXPORT_LIMITS.fileBytes});
}
const result={originalBytes:original.length,variants,
  exportFileLimit:TRANSLATOR_EXPORT_LIMITS.fileBytes,
  completeUncompressedBytesUnchanged:true};
result.portable=[];
for(const mem of [8,10,12]){
  const portable=Buffer.from(portableGzipSync(raw,{level:9,mem,mtime:0}));
  assert.ok(gunzipSync(portable,{maxOutputLength:32*1024*1024}).equals(raw));
  result.portable.push({level:9,mem,bytes:portable.length,fits:portable.length<=TRANSLATOR_EXPORT_LIMITS.fileBytes});
}
const gnu=spawnSync('/usr/bin/gzip',['-9','-n'],{input:raw,maxBuffer:32*1024*1024});
assert.equal(gnu.status,0);
assert.ok(gunzipSync(gnu.stdout,{maxOutputLength:32*1024*1024}).equals(raw));
result.gnu={bytes:gnu.stdout.length,fits:gnu.stdout.length<=TRANSLATOR_EXPORT_LIMITS.fileBytes};
writeFileSync('ci-logs/restart-compression-experiment.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
