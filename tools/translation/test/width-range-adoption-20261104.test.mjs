// Complete installed source/chronology/native-preparer case source. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {syncBuiltinESMExports} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {proposeWidthCountedRangeSources20261104} from '../width-counted-ranges-20261104-profile.mjs';
import {proposeWidthRangeAdoptionControlSources20261104} from '../width-range-adoption-controls-20261104.mjs';
import {knownWidthRangeAdoptionSourceSuccessor20261104 as known} from '../width-range-adoption-source-history-20261104.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {knownProtectedContainedDirectSuccessor} from '../protected-contained-direct-20261102-history.mjs';
import {knownProtectedPreparerWriterSuccessor} from '../protected-preparer-writers-20261102-history.mjs';
import {prepareOwnedCountedForSources} from '../prepare-owned-counted-for-sources.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/width-range-reader-adoption-20261104/',limits={timeout:900000,concurrency:false},read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('all six actual outcome/cancellation readers adopt the complete width-aware import proposals',limits,()=>{
 const proposal=proposeWidthCountedRangeSources20261104();assert.equal(proposal.files.length,6);for(const row of proposal.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);const current=known({path:row.path,before:row.before});assert.ok(current);assert.equal(current.currentIsTerminal,true);assert.equal(current.after,row.after);assert.equal(current.nativeBindingQualified,false);}
});
test('the original API composes every original499 and cold reader/control source without enlarging its original index',limits,()=>{
 const before=gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/width-counted-range-segments-20261104/index499.before.json.gz'))).toString('utf8');assert.equal(read('tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json'),before);
 const registries=JSON.parse(read(BASE+'registry.json'));assert.deepEqual(registries.segments.map(row=>row.rows),[499,6,18]);for(const item of registries.segments.slice(1)){const index=JSON.parse(read(item.path));for(const row of index.rows)withExactSourceHistoryDataOperation(ROOT,()=>{const source=read(row.before.path),result=knownExactSourceSuccessor({path:row.path,before:source});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.inverse,source);assert.equal(result.currentIsTerminal,true);});}
});
test('all twenty complete preparer/engine/control ancestors retain both CST phases and original-to-current inverses',limits,()=>{
 const controls=proposeWidthRangeAdoptionControlSources20261104();assert.equal(controls.files.length,20);for(const row of controls.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);}
 const before=read('tools/translation/source-profiles/exact-source-mutable-scalar-families-20261104/engine.after.txt'),current=read('tools/translation/exact-source-successors-20261103.mjs'),result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.inverse,before);assert.equal(result.after,current);assert.equal(result.laterHistories.length,1);
});
test('complete old protected preparer and contained-source histories join the exact current preparer',limits,()=>{
 const path='tools/translation/prepare-native-substitution-copy.mjs',contained=read('tools/translation/source-profiles/protected-contained-direct-20261102/preparer-native.before.txt'),protectedBefore=read('tools/translation/source-profiles/protected-preparer-writers-20261102/tools__translation__prepare-native-substitution-copy.mjs.before.txt');
 for(const result of [knownProtectedContainedDirectSuccessor({path,before:contained}),knownProtectedPreparerWriterSuccessor({path,before:protectedBefore})]){assert.ok(result);assert.equal(result.currentAfter,read(path));assert.equal(result.sourceAuthority,false);}
});
test('the actual complete counted-for preparer retains its native binding checks and all original source history',limits,()=>{
 const plan=prepareOwnedCountedForSources();assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
test('an original499 source root needs no new registry to retain its original source-domain result',limits,t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original499-width-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const put=(path,raw)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);},raw=gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/width-counted-range-segments-20261104/index499.before.json.gz'))),index=JSON.parse(raw),path='tools/translation/prepare-native-substitution-copy.mjs',row=index.rows.find(row=>row.path===path);assert.ok(row);put('tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',raw);for(const side of ['before','after'])put(row[side].path,fs.readFileSync(join(ROOT,row[side].path)));put(path,read(row.after.path));assert.equal(fs.existsSync(join(root,BASE+'registry.json')),false);const result=knownExactSourceSuccessor({path,before:read(row.before.path)},{root});assert.ok(result);assert.equal(result.after,read(row.after.path));
});
test('unknown cold registry filesystem failures preserve falsy/frozen primaries without reading a hostile code getter',limits,t=>{
 const path='tools/translation/prepare-native-substitution-copy.mjs',before=proposeWidthRangeAdoptionControlSources20261104().files.find(row=>row.path===path).before,stat=fs.lstatSync;let touched=0;const accessor=Object.create(null);Object.defineProperty(accessor,'code',{get(){touched++;throw Error('must not read');}});for(const primary of [false,null,undefined,Object.freeze(Error('original stat failure')),accessor]){const mock=t.mock.method(fs,'lstatSync',(name,...args)=>{if(name===join(ROOT,BASE+'registry.json'))throw primary;return stat(name,...args);});syncBuiltinESMExports();let caught=false;try{try{known({path,before});}catch(error){caught=true;assert.equal(error,primary);}}finally{mock.mock.restore();syncBuiltinESMExports();}assert.equal(caught,true);}assert.equal(touched,0);
});
