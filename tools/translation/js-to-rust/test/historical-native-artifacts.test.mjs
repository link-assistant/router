import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {historicalNativePortableArtifacts} from './historical-native-artifacts.mjs';
import {historicalNativeSources} from './historical-native-source.mjs';

test('matching historical artifacts retain every original native source and all six outputs per module',()=>{
 const artifacts=historicalNativePortableArtifacts(),historical=historicalNativeSources();
 assert.equal(artifacts.revision,'eb2dad1c0a18394dc1aad46413e11401e74eb502');
 assert.equal(artifacts.files.size,314);
 assert.equal(artifacts.manifest.modules.length,52);
 assert.deepEqual(artifacts.translation.nativeCoverage.map(row=>row.path),historical.paths.filter(path=>path.startsWith('js/src/')&&path.endsWith('.mjs')));
 for(const module of artifacts.manifest.modules){
  assert.equal(module.sha256,createHash('sha256').update(historical.source(module.path)).digest('hex'));
  assert.equal(module.outputs.length,6);
  for(const output of module.outputs){
   const source=artifacts.source(output.path);
   assert.equal(Buffer.byteLength(source),output.bytes);
   assert.equal(createHash('sha256').update(source).digest('hex'),output.sha256);
  }
 }
 assert.deepEqual(artifacts.manifest.topLevel,{sourceItems:788,translatedItems:74,unsupportedItems:714,fullDomainTranslatedItems:73,conditionalPrivateBodyDraftItems:1});
 assert.deepEqual(artifacts.manifest.scopedFunctions,{sourceItems:705,translatedItems:66,unsupportedItems:639,fullDomainTranslatedItems:54,conditionalPrivateBodyDraftItems:12});
});

test('new current modules cannot enter the fixed historical cohort or change its private source data',()=>{
 const artifacts=historicalNativePortableArtifacts();
 const path='tools/translation/js-to-rust/generated/native-portable/scoped/geolocation.lino';
 assert.throws(()=>artifacts.source(path),/Unknown historical native artifact/);
 const original=artifacts.source('parity/js-native-portable-draft.json');
 artifacts.files.set('parity/js-native-portable-draft.json','changed caller copy');
 assert.equal(artifacts.source('parity/js-native-portable-draft.json'),original);
 assert.equal(artifacts.manifest.contract.runtimeParity,false);
});

test('changed complete historical artifact archive refuses before returning any file',t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-historical-native-artifacts-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const bytes=readFileSync(new URL('../../fixtures/historical-native-portable-artifacts.json.gz',import.meta.url));
 bytes[bytes.length-1]^=1;
 const archive=join(directory,'changed.gz');writeFileSync(archive,bytes);
 assert.throws(()=>historicalNativePortableArtifacts({archive}),/archive changed/);
});
