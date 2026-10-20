import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {internalDigestAdoptionHistory} from './internal-digest-adoption-history.mjs';
import {PRIVATE_METADATA_DIGEST_SOURCE_PATHS} from '../migrate-private-metadata-digests.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const sources=()=>Object.fromEntries(PRIVATE_METADATA_DIGEST_SOURCE_PATHS.map(path=>[path,readFileSync(new URL('../../../'+path,import.meta.url),'utf8')]));
test('complete current source and every appended extension retain the exact original adoption equation',()=>{
 const actual=sources(),history=internalDigestAdoptionHistory(actual),path=PRIVATE_METADATA_DIGEST_SOURCE_PATHS[0];assert.equal(Buffer.byteLength(history.before[path]),58416);assert.ok(history.suffix.includes('function kindBatchedExpectedSamePrototype('));assert.equal(history.inverse,actual[path]);assert.equal(history.adoptionSources[path]+history.suffix,actual[path]);assert.equal(history.compilerAuthority,false);assert.deepEqual(history.trace.map(row=>row.phase),['language','repository']);
 for(const row of history.documents)assert.equal(transportConcreteSyntaxMeta(row.meta).source,actual[row.path]);assert.equal(transportConcreteSyntaxMeta(history.adoptionMeta).source,history.adoptionSources[path]);
 for(const row of history.proposal.rows)assert.equal(row.after.source,history.adoptionSources[row.file]);
});
test('later source trivia and declarations are retained in full without altering the adopted factory',()=>{
 const actual=sources(),path=PRIVATE_METADATA_DIGEST_SOURCE_PATHS[0];actual[path]+='\n// café 😀\r\nexport const retainedHistoryTail = 7;\r\n';const history=internalDigestAdoptionHistory(actual);assert.ok(history.suffix.endsWith('export const retainedHistoryTail = 7;\r\n'));assert.equal(history.inverse,actual[path]);
});
test('changed complete adopted factory or malformed later syntax refuses the historical equation',()=>{
 const actual=sources(),path=PRIVATE_METADATA_DIGEST_SOURCE_PATHS[0];assert.throws(()=>internalDigestAdoptionHistory({...actual,[path]:actual[path].replace('let qualifiedCreate=null;','let qualifiedCreate=undefined;')}),/derived kernel/);assert.throws(()=>internalDigestAdoptionHistory({...actual,[path]:actual[path]+'\nconst broken = ;'}),/grammar/);
});
test('source accessors proxies and incomplete source records refuse without invoking getters',()=>{
 const actual=sources(),path=PRIVATE_METADATA_DIGEST_SOURCE_PATHS[0];let calls=0;Object.defineProperty(actual,path,{enumerable:true,get(){calls++;return '';}});assert.throws(()=>internalDigestAdoptionHistory(actual),/primitive/);assert.equal(calls,0);assert.throws(()=>internalDigestAdoptionHistory(new Proxy(sources(),{get(){calls++;}})),/ordinary/);assert.equal(calls,0);assert.throws(()=>internalDigestAdoptionHistory({}),/source set/);
});
