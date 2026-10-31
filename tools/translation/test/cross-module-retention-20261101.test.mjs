// Independent complete source-history/lifecycle case SOURCE. Entirely UNRUN.
// No GC, WeakRef, heap timing or memory measurements are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCrossModuleRetentionSources} from '../cross-module-retention-20261101-prepare.mjs';
import {prepareCrossModuleHelperBulkSources} from '../cross-module-helper-bulk-20261101-prepare.mjs';
import {prepareCrossModuleHelperBulkSourceEquation} from '../cross-module-helper-bulk-20261101-profile.mjs';
import {prepareNativeHelperSyntaxOriginSources} from '../prepare-native-helper-syntax-origin-sources.mjs';
import {withCrossModuleHelperBulkSourceOperation} from '../cross-module-helper-bulk-20261101.mjs';
const limits={timeout:60000},rootPath='tools/translation/router-core-json-updates.mjs';
test('complete retention successor preserves immutable original/current history and reaches the installed source',limits,()=>{
 const successor=prepareCrossModuleRetentionSources(),old=prepareCrossModuleHelperBulkSources(),ancestor=prepareNativeHelperSyntaxOriginSources();assert.equal(successor.files.length,3);
 const actual=readFileSync(new URL('../router-core-json-updates.mjs',import.meta.url),'utf8'),row=successor.files.find(row=>row.path===rootPath);
 assert.equal(row.current,actual);assert.equal(row.currentAfter,actual);assert.equal(row.inverse,row.before);
 const frozen=readFileSync(new URL('../source-profiles/cross-module-helper-bulk-20261101/originals/cross-module-helper-bulk-20261101-current.mjs.txt',import.meta.url),'utf8');assert.equal(row.before,frozen);assert.notEqual(actual,frozen);
 for(const plan of [old,ancestor])assert.equal(plan.files.find(row=>row.path===rootPath).currentAfter,actual);
 for(const file of successor.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}
 const retained=prepareCrossModuleHelperBulkSourceEquation();assert.equal(retained.value.after,frozen);assert.equal(retained.value.currentAfter,actual);assert.equal(retained.value.knownDescendant.before,frozen);assert.equal(retained.value.knownDescendant.after,actual);
});
test('nested synchronous scopes and ordinary thrown values retain exact results and leave later scopes independent',limits,()=>{
 assert.equal(withCrossModuleHelperBulkSourceOperation(()=>withCrossModuleHelperBulkSourceOperation(()=>37)),37);
 for(const primary of [null,undefined,Symbol('primary'),new Error('application callback')]){
  let thrown=false;try{withCrossModuleHelperBulkSourceOperation(()=>{throw primary;});}catch(error){thrown=true;assert.equal(error,primary);}assert.equal(thrown,true);
  assert.equal(withCrossModuleHelperBulkSourceOperation(()=>41),41);
 }
 let invoked=false;assert.throws(()=>withCrossModuleHelperBulkSourceOperation(async()=>{invoked=true;}));assert.equal(invoked,false);
});
