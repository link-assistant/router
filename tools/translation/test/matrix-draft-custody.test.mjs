import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {retainMatrixDraft} from '../matrix-draft-custody.mjs';

function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-matrix-custody-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const staging=join(root,'.staging');mkdirSync(join(staging,'profiles/p'),{recursive:true});
 const bytes=Buffer.from('complete output\n'),path='profiles/p/output.mjs';writeFileSync(join(staging,path),bytes);
 const output={path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 return {root,staging,plans:[{outputs:[output],manifest:{runtimeParity:false}}],inputs:{head:'a'.repeat(40)},directory:'js/node_modules/.matrix-drafts'};
}
test('draft retention is opt-in and preserves every full original byte without authority',t=>{
 const value=fixture(t);assert.equal(retainMatrixDraft({...value,directory:undefined}),null);
 const attempt=retainMatrixDraft(value),record=JSON.parse(readFileSync(join(attempt,'manifest.json')));
 assert.deepEqual(record.plans,value.plans);assert.deepEqual(record.inputs,value.inputs);
 assert.equal(record.members.length,1);assert.equal(record.semanticAuthority,false);assert.equal(record.runtimeParity,false);
 assert.deepEqual(gunzipSync(readFileSync(join(attempt,record.members[0].storedAs))),readFileSync(join(value.staging,value.plans[0].outputs[0].path)));
});
test('damaged output fails custody and removes its partial attempt',t=>{
 const value=fixture(t);writeFileSync(join(value.staging,value.plans[0].outputs[0].path),'changed output');
 assert.throws(()=>retainMatrixDraft(value),/size differs|hash differs/);
 assert.deepEqual(readdirSync(join(value.root,value.directory)),[]);
});
test('escaping, generated-tree and linked custody paths cannot change external files',t=>{
 const value=fixture(t);
 for(const directory of ['../outside','profiles/output',value.root])assert.throws(()=>retainMatrixDraft({...value,directory}),/relative child path|require js/);
 mkdirSync(join(value.root,'js'));symlinkSync(value.staging,join(value.root,'js/node_modules'),'dir');
 assert.throws(()=>retainMatrixDraft(value),/symbolic links/);
 assert.deepEqual(readFileSync(join(value.staging,value.plans[0].outputs[0].path)),Buffer.from('complete output\n'));
});
test('complete computed ordinary and owned indices retain exact bytes without creating checked-in indices',t=>{
 const value=fixture(t),computedIndices=[
  {path:'profiles/matrix-'+ 'a'.repeat(64)+'.json',content:'{\n "ordinary": "exact spacing and λ"\n}\n'},
  {path:'profiles/owned-definitions-matrix-'+ 'a'.repeat(64)+'.json',content:'{"owned": true}\r\n'},
 ];
 const attempt=retainMatrixDraft({...value,computedIndices}),record=JSON.parse(readFileSync(join(attempt,'manifest.json')));
 assert.equal(record.schema,'unqualified-isolated-matrix-draft-v2');assert.equal(record.indices.length,2);
 assert.equal(record.completeIndexBytes,computedIndices.reduce((n,row)=>n+Buffer.byteLength(row.content),0));
 for(const [at,row]of record.indices.entries()){
  const expected=computedIndices[at];assert.equal(row.path,expected.path);assert.equal(existsSync(join(value.root,row.path)),false);
  const bytes=gunzipSync(readFileSync(join(attempt,row.storedAs)));assert.deepEqual(bytes,Buffer.from(expected.content));
  assert.equal(row.bytes,bytes.length);assert.equal(row.sha256,createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(record.semanticAuthority,false);assert.equal(record.runtimeParity,false);
});
test('malformed computed index data is refused without invoking getters or leaving partial custody',t=>{
 const value=fixture(t),good={path:'profiles/matrix-'+ 'a'.repeat(64)+'.json',content:'{}\n'};let called=false;
 const accessor={path:good.path,get content(){called=true;throw Error('getter must not run');}};
 const incidental=[good];incidental.extra=true;
 for(const computedIndices of [[],[good,good],new Array(1),incidental,[accessor],new Proxy([good],{}),[new Proxy(good,{})],
  [{...good,path:'../index.json'}],[{...good,content:'invalid JSON'}],[{...good,content:'"\ud800"'}]]){
  assert.throws(()=>retainMatrixDraft({...value,computedIndices}));
  assert.deepEqual(readdirSync(join(value.root,value.directory)),[]);
 }
 assert.equal(called,false);assert.deepEqual(readFileSync(join(value.staging,value.plans[0].outputs[0].path)),Buffer.from('complete output\n'));
});
