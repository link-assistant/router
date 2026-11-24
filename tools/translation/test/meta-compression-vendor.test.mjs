import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {gzipSync} from '../vendor/fflate/index.mjs';
import {deriveMetaCompressionVendor} from '../prepare-meta-compression-vendor.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),original=()=>({source:readFileSync(new URL('../source-profiles/meta-compression/fflate-0.8.3.umd.js',import.meta.url),'utf8'),license:readFileSync(new URL('../source-profiles/meta-compression/LICENSE',import.meta.url),'utf8')});
test('copied complete upstream compressor restores byte boundaries and Unicode with native independent decoding',{timeout:60000},()=>{
 const inputs=[Buffer.alloc(0),Buffer.from('Ω😀\r\n\0 retained JSON'),...([1,65535,65536,65537,131072].map(size=>Buffer.from(Array.from({length:size},(_,at)=>(at*17+(at>>>8))&255))))];
 for(const input of inputs){const first=Buffer.from(gzipSync(input,{level:6,mtime:0})),second=Buffer.from(gzipSync(input,{level:6,mtime:0}));assert.deepEqual(first,second);assert.deepEqual(gunzipSync(first,{maxOutputLength:Math.max(input.length,1)}),input);assert.deepEqual(first.subarray(4,8),Buffer.alloc(4));}
});
test('fixed gzip fixture has identical canonical bytes in Node and Bun',{timeout:60000},()=>{
 const input=Buffer.from('Complete CST metadata \u03a9\ud83d\ude00\r\n'.repeat(4096)),packed=Buffer.from(gzipSync(input,{level:6,mtime:0}));
 assert.deepEqual(gunzipSync(packed,{maxOutputLength:input.length}),input);
 assert.equal(input.length,122880);assert.equal(hash(input),'72956ef8c83f588695ef78d56b52eb4717aa29f3624baeee46ce813f95a8991c');
 assert.equal(packed.length,373);assert.equal(hash(packed),'68b3f9fa6400623521dabc37d4270200c396103d3edaa37c6a01927289f69892');
});
test('actual producer preserves complete original body license CST inverse and fixed rule order',{timeout:60000},()=>{
 const inputs=original(),proposal=deriveMetaCompressionVendor(inputs);assert.equal(readFileSync(new URL('../vendor/fflate/index.mjs',import.meta.url),'utf8'),proposal.text);assert.equal(readFileSync(new URL('../vendor/fflate/LICENSE',import.meta.url),'utf8'),inputs.license);
 assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,inputs.source);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,proposal.text);assert.equal(proposal.inverse,inputs.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);
 const manifest=JSON.parse(readFileSync(new URL('../source-profiles/meta-compression/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.version,'0.8.3');for(const row of manifest.files){const bytes=readFileSync(new URL('../source-profiles/meta-compression/'+row.path,import.meta.url));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);}
});
test('changed missing copied or truncated upstream implementation and license refuse before proposals',{timeout:60000},()=>{
 const inputs=original();for(const changed of [{...inputs,source:inputs.source+' '},{...inputs,source:inputs.source.slice(1)},{...inputs,license:inputs.license+' '},{...inputs,license:''},{license:inputs.license}])assert.throws(()=>deriveMetaCompressionVendor(changed),/Complete pinned/);
});
