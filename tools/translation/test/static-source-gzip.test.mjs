import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareZopfliVendor} from '../prepare-zopfli-vendor.mjs';
import {gzipStaticSourceStorage} from '../static-source-gzip.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('complete pinned C/WebAssembly package retains all original members license and native source inverse',{timeout:60000},()=>{
  const plan=prepareZopfliVendor();assert.equal(plan.files.length,9);assert.equal(plan.precompiledC,true);assert.equal(plan.rustExecuted,false);assert.equal(plan.semanticAuthority,false);
  let changed=0;for(const row of plan.files){assert.equal(row.current,row.after);if(row.equation){changed++;assert.equal(row.equation.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);assert.deepEqual(row.trace.map(phase=>phase.phase),['language','repository']);}else assert.equal(row.after,row.before);}
  assert.equal(changed,1);assert.equal(plan.files.find(row=>row.originalMember==='LICENSE.md').originalBytesUnchanged,true);
});

test('ordinary binary empty and Unicode source payloads keep exact existing gzip bytes',{timeout:60000},()=>{
  const cases=[Buffer.alloc(0),Buffer.from('λ😀\0\r\n// source'),Buffer.from(Array.from({length:256},(_,at)=>at)),Buffer.alloc(3*1024*1024,97)];
  for(const input of cases){const actual=gzipStaticSourceStorage(input);assert.ok(actual.equals(gzipSync(input,{level:9,mtime:0})));assert.ok(gunzipSync(actual).equals(input));}
});

test('complete actual source-bank compression fits the unchanged export cap with every original byte retained',{timeout:60000},()=>{
  const packed=readFileSync(new URL('../source-profiles/static-source-lifecycle/originals.json.gz',import.meta.url)),manifest=JSON.parse(readFileSync(new URL('../source-profiles/static-source-lifecycle/manifest.json',import.meta.url))),raw=gunzipSync(packed);
  assert.equal(raw.length,manifest.rawBytes);assert.equal(hash(raw),manifest.rawSha256);
  const actual=gzipStaticSourceStorage(raw);assert.ok(actual.length<=4*1024*1024);assert.ok(gunzipSync(actual).equals(raw));
});

test('malformed compressor input retains native rejection instead of becoming source metadata',{timeout:60000},()=>{
  for(const value of [null,undefined,{},Symbol('input')])assert.throws(()=>gzipStaticSourceStorage(value),TypeError);
});
