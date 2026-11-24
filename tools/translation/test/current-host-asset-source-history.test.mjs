import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCurrentHostAssetSourceHistory} from './current-host-asset-source-history.mjs';
import {readHostAssetSourceHistory} from './owned-reader-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const current=()=>readFileSync(new URL('../host-assets.mjs',import.meta.url),'utf8');
test('complete current Unicode host declarations retain the full original source and both exact inverses',{timeout:60000},()=>{
 const source=current(),history=readCurrentHostAssetSourceHistory(source),row=history.unicode.file;
 assert.equal(history.actual,source);assert.equal(history.inverse,source);
 assert.equal(history.source,history.historical.source);
 assert.equal(history.semanticAuthority,false);assert.equal(history.unicode.propertyQualified,false);
 assert.equal(row.before,history.historical.actual);assert.equal(row.inverse,row.before);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);
 assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,source);
 assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
 assert.equal(row.after.split('export declare function router_core_strip_unicode_whitespace').length,3);
 assert.equal(row.before.includes('export declare function router_core_strip_unicode_whitespace'),false);
 assert.throws(()=>readHostAssetSourceHistory(source),/complete current reader differs/);
});
test('changed complete Unicode host sources cannot acquire an original history',{timeout:60000},()=>{
 const source=current();
 assert.throws(()=>readCurrentHostAssetSourceHistory(source+'\n// changed'),/complete current Unicode host asset source/);
});
