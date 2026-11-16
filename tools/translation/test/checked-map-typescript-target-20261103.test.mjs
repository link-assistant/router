// Target type/refusal and complete source-history case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {tsType} from '../translate.mjs';
import {readSourceProfileFileSync} from '../ordered-text-map-callers-20261102-source-storage.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('target annotation never turns a copied map tag into an unchecked unknown boundary',()=>{
 for(const kind of ['routerOrderedTextMap','routerStandardTextMap'])assert.throws(()=>tsType({kind}));
 assert.equal(tsType({kind:'bool'}),'boolean');assert.equal(tsType({kind:'string'}),'string');assert.equal(tsType({kind:'unsupported-source-domain'}),'unknown');
});
test('actual target helper successor retains whole source and independent CST inverse',{timeout:60000},()=>{
 const value=JSON.parse(gunzipSync(readSourceProfileFileSync(new URL('../source-profiles/checked-map-typescript-target-20261103/complete-source.json.gz',import.meta.url)),{maxOutputLength:1048576}).toString('utf8'));assert.equal(value.rows.length,1);
 const row=value.rows[0],history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];assert.equal(history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,row.after);assert.deepEqual(row.sequences.map(sequence=>sequence.phase),['language','repository']);
});
