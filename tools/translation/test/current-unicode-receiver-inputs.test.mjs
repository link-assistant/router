import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {currentUnicodeAssetInputs,requireCurrentUnicodeAssetInputs} from '../current-unicode-asset-inputs.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const host='tools/translation/extensions/host-contracts.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function originals(){
 const packed=fs.readFileSync(new URL('../source-profiles/core-ascii/base-assets-originals.json.gz',import.meta.url));
 assert.equal(hash(packed),'3ee12d009e4d56ad278286cebdd046e6df95f401d2a019bb4ce25800125c1b35');
 const raw=gunzipSync(packed,{maxOutputLength:250000});
 assert.equal(hash(raw),'899c61549a2d1be0c88c3232c4d5d2a073d50d1fca8b624fa3f2e5ba9dd0fb72');
 const rows=JSON.parse(raw).files;assert.equal(rows.length,5);return rows;
}
function physicalInputs(run){
 const directory=fs.mkdtempSync(join(tmpdir(),'router-unicode-receiver-inputs-'));
 try{
  const unicode=JSON.parse(gunzipSync(fs.readFileSync(new URL('../source-profiles/core-unicode-predicates/originals.json.gz',import.meta.url)),{maxOutputLength:300000}));
  const receiver=JSON.parse(fs.readFileSync(new URL('../source-profiles/shared-f64-receiver-evolution/manifest.json',import.meta.url),'utf8'));
  const paths=new Set([...originals(),...unicode.files,...receiver.files,...receiver.helpers].map(row=>row.path));
  assert.ok(paths.size<32);
  for(const path of paths){const target=join(directory,path);fs.mkdirSync(dirname(target),{recursive:true});fs.copyFileSync(join(root,path),target);}
  run(directory);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
}

test('actual ASCII inputs compose complete Unicode and shared receiver histories with both inverses',
 {timeout:60000},()=>physicalInputs(directory=>{
 const input=currentUnicodeAssetInputs(originals(),directory);
 const unicode=input.unicode.files.find(row=>row.path===host);
 const receiver=input.receiverEvolution.files.find(row=>row.path===host);
 const original=input.originals.find(row=>row.path===host),current=input.rows.find(row=>row.path===host);
 assert.equal(unicode.before,original.source);assert.equal(receiver.before,unicode.after);
 assert.notEqual(receiver.before,receiver.after);assert.equal(receiver.equation.inverse,unicode.after);
 assert.equal(current.source,receiver.after);assert.equal(current.sha256,hash(receiver.after));
 assert.equal(current.source,fs.readFileSync(new URL('../../../'+host,import.meta.url),'utf8'));
 assert.equal(input.receiverEvolution.typescriptVersion,'5.9.3');
 assert.equal(input.receiverEvolution.productionExecutableGain,0);assert.equal(input.semanticAuthority,false);
 for(const row of input.receiverEvolution.files){
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(stage.inverse,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  }
  assert.equal(row.nativeBindings.length,2);
  assert.ok(row.nativeBindings.every(binding=>binding.nativeSemanticScopeChecked&&binding.typescriptVersion==='5.9.3'));
 }
 requireCurrentUnicodeAssetInputs(input);
 fs.appendFileSync(join(directory,host),'\n');
 assert.throws(()=>requireCurrentUnicodeAssetInputs(input),/complete asset input changed during preparation/);
}));

test('unknown complete host changes still refuse before publishing an ASCII input plan',
 {timeout:60000},()=>physicalInputs(directory=>{
 fs.appendFileSync(join(directory,host),'\n');
 assert.throws(()=>currentUnicodeAssetInputs(originals(),directory),
  /unknown physical source predecessor or successor|unknown complete current asset input/);
}));
