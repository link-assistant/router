// Capture genuine producer output as historical test DATA. Never install it.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {prepareCurrentCoreAsciiReverseAssets} from '../../tools/translation/prepare-core-ascii-assets.mjs';
const path='tools/translation/js-to-rust/owned-core-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(process.argv.length,3,'one fresh output path required');
const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const plan=prepareCurrentCoreAsciiReverseAssets();
const layers=plan.layers.flatMap(layer=>layer.files.filter(row=>row.path===path).map(row=>({schema:layer.schema,row})));
assert.equal(layers.length,4);
for(let at=0;at<layers.length;at++){
 const {row}=layers[at];assert.equal(row.path,path);assert.equal(row.inverse,row.before);
 assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));
 assert.equal(row.nativeCopies.length,2);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 if(at)assert.equal(layers[at-1].row.after,row.before);
}
assert.equal(layers.at(-1).row.after,readFileSync(path,'utf8'));
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead);
const raw=Buffer.from(JSON.stringify({schema:'owned-reader-complete-source-history-v1',sourceHead,path,layers,semanticAuthority:false})+'\n');
assert.ok(raw.length<64*1024*1024,'complete fixture raw bound');
const packed=gzipSync(raw,{level:9});writeFileSync(process.argv[2],packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(process.argv[2])),raw);
console.log(JSON.stringify({sourceHead,layers:layers.length,rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed),installed:false,semanticAuthority:false}));
