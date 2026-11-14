// Test-only complete source history. No owner, runtime or property authority.
import assert from 'node:assert/strict';
import {prepareCoreUnicodeHostAssetHistory} from '../prepare-core-unicode-predicates.mjs';
import {readHostAssetSourceHistory} from './owned-reader-source-history.mjs';

export function readCurrentHostAssetSourceHistory(source){
 const plan=prepareCoreUnicodeHostAssetHistory(),row=plan.file;
 assert.equal(plan.semanticAuthority,false);assert.equal(plan.runtimeExecuted,false);assert.equal(plan.propertyQualified,false);
 assert.equal(typeof source,'string','complete primitive current host asset source');
 assert.equal(source,row.after,'complete current Unicode host asset source');
 assert.equal(row.current,row.after,'complete physical Unicode host asset source');
 const historical=readHostAssetSourceHistory(row.before);
 assert.equal(historical.actual,row.before);assert.equal(historical.inverse,row.before);
 assert.equal(row.inverse,row.before);
 return {source:historical.source,actual:source,inverse:row.after,historical,unicode:plan,semanticAuthority:false};
}
