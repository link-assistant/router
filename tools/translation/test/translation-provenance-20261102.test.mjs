// Independent byte-transport/refusal expectations. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translationProvenanceCatalogue,withTranslationProvenanceData,requireTranslationProvenancePaths,requireTranslationProvenanceBytes} from '../translation-provenance-20261102.mjs';
const limits={timeout:60000},name='tools/translation/vendor/example/LICENSE';
// Synthetic byte fixture only; "abc" is deliberately not a license assertion.
function catalogue(){return {schema:'router-translation-provenance-v1',implementationBaseline:'a'.repeat(40),references:[{repository:'https://example.invalid/source',reference:'https://example.invalid/reference',commit:'b'.repeat(40),copiedSource:true,approach:'independent byte transport fixture'}],groups:[{id:'fixture',license:'not-a-legal-assertion',licensePaths:[name],sourceBoundary:'three known independent bytes'}],files:[{path:name,bytes:3,sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',group:'fixture',role:'synthetic-byte-fixture'}],requiredNotices:[name],receivingDependencies:[],verification:'UNRUN',semanticAuthority:false,runtimeParity:false};}
test('exact declared bytes and required notices compare without granting semantic authority',limits,()=>{
 const data=catalogue(),summary=requireTranslationProvenancePaths(data,[name,'tools/translation/local-adapter.mjs']);assert.equal(summary.declaredFiles,1);assert.equal(summary.mandatoryNotices,1);assert.equal(summary.sourceAuthority,false);assert.equal(summary.semanticAuthority,false);assert.equal(summary.runtimeParity,false);
 assert.equal(requireTranslationProvenanceBytes(data,name,Buffer.from('abc')).bytes,3);assert.throws(()=>requireTranslationProvenanceBytes(data,name,Buffer.from('abd')));assert.throws(()=>requireTranslationProvenanceBytes(data,name,Buffer.from('ab')));
});
test('missing licenses unknown vendor files duplicate paths and catalogue changes cannot disappear',limits,()=>{
 const data=catalogue();assert.throws(()=>requireTranslationProvenancePaths(data,[]),/missing/u);assert.throws(()=>requireTranslationProvenancePaths(data,[name,name]),/duplicate/u);assert.throws(()=>requireTranslationProvenancePaths(data,[name,'tools/translation/vendor/unreviewed/source.js']),/uncatalogued/u);
 for(const mutate of [data=>data.files.splice(0),data=>data.groups[0].licensePaths.push('outside/LICENSE'),data=>data.files.push({...data.files[0]}),data=>data.files[0].path='../escape',data=>data.semanticAuthority=true]){const changed=catalogue();mutate(changed);assert.throws(()=>translationProvenanceCatalogue(changed));}
});
test('ordinary own data is required before getters proxies sparse arrays or coercion can run',limits,()=>{
 let hits=0;const proxy=new Proxy({}, {get(){hits++;throw Error('trap');},ownKeys(){hits++;throw Error('trap');}});assert.throws(()=>translationProvenanceCatalogue(proxy));assert.equal(hits,0);
 const data=catalogue();Object.defineProperty(data,'files',{enumerable:true,get(){hits++;throw Error('getter');}});assert.throws(()=>translationProvenanceCatalogue(data));assert.equal(hits,0);
 const paths=[];Object.defineProperty(paths,'0',{enumerable:true,get(){hits++;return name;}});paths.length=1;assert.throws(()=>requireTranslationProvenancePaths(catalogue(),paths));assert.throws(()=>requireTranslationProvenancePaths(catalogue(),new Array(1)));assert.equal(hits,0);
});
test('invocation-local expected indexes expire and caught failures cannot revive a scope',limits,()=>{
 let escaped;withTranslationProvenanceData(catalogue(),view=>{escaped=view;const names=view.files();names.length=0;assert.deepEqual(view.files(),[name]);return view.bytes(name,Buffer.from('abc'));});assert.throws(()=>escaped.files(),/expired/u);
 assert.throws(()=>withTranslationProvenanceData(catalogue(),view=>{try{view.bytes(name,Buffer.from('bad'));}catch{}return {passed:true};}),/invalidated/u);
 assert.throws(()=>withTranslationProvenanceData(catalogue(),()=>Promise.resolve()));
});
test('the actual source catalogue preserves all three requested upstream references and the adapted reverse license',limits,()=>{
 const data=translationProvenanceCatalogue(JSON.parse(readFileSync(new URL('../translation-provenance-20261102.json',import.meta.url),'utf8')));
 const references=new Map(data.references.map(row=>[row.id,row]));assert.equal(references.get('meta-language').commit,'e46e196db5ec34bf13a73b8645aa38d409737e60');assert.equal(references.get('formal-ai').commit,'e9f057c8300cab787f746afbcc0133cef80e2948');assert.equal(references.get('relative-meta-logic').copiedSource,false);
 const reverse=readFileSync(new URL('../js-to-rust/vendor/LICENSE',import.meta.url)),original=readFileSync(new URL('../vendor/formal-ai/LICENSE',import.meta.url));assert.deepEqual(reverse,original);
 assert.ok(data.groups.some(group=>group.id==='formal-ai-adapted'&&group.licensePaths.includes('tools/translation/js-to-rust/vendor/LICENSE')));assert.ok(data.receivingDependencies.every(row=>row.sourceCopiedByThisCatalogue===false));
});
