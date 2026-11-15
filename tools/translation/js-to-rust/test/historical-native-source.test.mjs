import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalNativeSources,materializeHistoricalNativeSources} from './historical-native-source.mjs';

test('fixed historical censuses retain all 59 original modules and 52 complete native parents',()=>{
  const fixture=historicalNativeSources();
  assert.equal(fixture.paths.length,59);
  assert.equal(fixture.paths.filter(path=>path.startsWith('js/src/')&&path.endsWith('.mjs')).length,52);
  assert.equal(fixture.source('packages/javascript/native/server.mjs'),fixture.source('js/src/server.mjs'));
  assert.throws(()=>fixture.source('js/src/geolocation.mjs'),/Unknown historical/u);
  assert.throws(()=>fixture.source('../server.mjs'),/Unknown historical/u);
  const original=fixture.source('js/src/server.mjs');
  fixture.files.set('js/src/server.mjs','changed by caller');
  assert.equal(fixture.source('js/src/server.mjs'),original);
});

test('changed archive bytes refuse before any historical source can be returned',t=>{
  const directory=mkdtempSync(join(tmpdir(),'router-historical-native-data-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const bytes=readFileSync(new URL('../../fixtures/historical-native-source.json.gz',import.meta.url));
  bytes[bytes.length-1]^=1;
  const archive=join(directory,'changed.gz');writeFileSync(archive,bytes);
  assert.throws(()=>historicalNativeSources({archive}),/archive changed/u);
});

test('receiving historical tree contains exact original files and keeps the installed compiler dependency',t=>{
  const directory=mkdtempSync(join(tmpdir(),'router-historical-native-tree-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const root=fileURLToPath(new URL('../../../../',import.meta.url));
  const fixture=materializeHistoricalNativeSources(directory,root);
  for(const [path,source]of fixture.files)assert.equal(readFileSync(join(directory,path),'utf8'),source);
  assert.equal(JSON.parse(readFileSync(join(directory,'js/node_modules/typescript/package.json'))).version,'5.9.3');
});
