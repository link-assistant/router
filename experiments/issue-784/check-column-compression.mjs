// Read-only bounded storage experiment; no semantic or executable authority.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {gzipSync as portableGzipSync} from '../../tools/translation/vendor/fflate/index.mjs';
import {compressionBaseline} from './compression-baseline.mjs';
const {raw}=compressionBaseline();
const container=JSON.parse(raw),tables=container.payload.columnTables;
assert.equal(container.columnEncoding,'hex-v1');
const variants=[];
for(const encoding of ['latin1']){
  const modified=JSON.parse(raw);
  modified.columnEncoding=encoding+'-v1';
  modified.payload.columnTables=tables.map(table=>table.map(text=>{
    const original=Buffer.from(text,'hex');
    const packed=['base64','latin1'].includes(encoding)?original:Buffer.from(
      (encoding==='gzip-base64'?gzipSync:portableGzipSync)(original,{level:9,mtime:0}));
    assert.ok((['base64','latin1'].includes(encoding)?packed:gunzipSync(packed,{maxOutputLength:1600000})).equals(original));
    const textOut=packed.toString(encoding==='latin1'?'latin1':'base64');
    assert.ok(Buffer.from(textOut,encoding==='latin1'?'latin1':'base64').equals(packed));
    return textOut;
  }));
  const bytes=Buffer.from(JSON.stringify(modified)+'\n');
  for(const level of [1,9]){
    const packed=gzipSync(bytes,{level,mtime:0});
    assert.ok(gunzipSync(packed,{maxOutputLength:32*1024*1024}).equals(bytes));
    variants.push({encoding,level,rawBytes:bytes.length,bytes:packed.length,fits:packed.length<=4194304});
  }
}
writeFileSync('ci-logs/restart-column-compression.json',JSON.stringify(variants,null,2)+'\n');
console.log(JSON.stringify(variants));
