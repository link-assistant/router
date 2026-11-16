// Complete current source/old-domain receiving cases SOURCE ONLY, all UNRUN.
import test from 'node:test';
import {proposeExactRecoverySourceControlSources} from '../exact-source-temporary-recovery-controls-20261103.mjs';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {proposeExactTemporarySourceIndex,withExactTemporarySourceFamilyData} from '../exact-source-temporary-families-20261103.mjs';
import {proposeExactTemporarySourceControlSources} from '../exact-source-temporary-controls-20261103.mjs';
import {proposeExactJsonPackagingSourceControlSources} from '../exact-source-json-packaging-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {knownProtectedSourceDiagnosticSuccessor} from '../protected-source-diagnostics-20261103-history.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-temporary-families-20261103/',INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',ENGINE='tools/translation/exact-source-successors-20261103.mjs',read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('all temporary-source parents reproduce the current index while retaining the original282 exactly',{timeout:60000},()=>{
 const proposal=proposeExactTemporarySourceIndex(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index282.before.json.gz'))));assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-json-packaging-families-20261103/index292.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,292);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,226);assert.deepEqual(proposal.index.rows.slice(0,282),previous.rows);assert.equal(proposal.images.length,20);for(const image of proposal.images)assert.equal(read(image.path),image.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);
});
test('each actual temporary-source parent joins its whole original and independently current bytes',{timeout:60000},()=>{
 withExactTemporarySourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.currentIsTerminal,true);assert.equal(known.inverse,row.before);assert.equal(known.semanticAuthority,false);assert.equal(known.nativeBindingQualified,false);}}));
});
test('all five earlier diagnostic sources retain historical after and append the actual native-temporary continuation',{timeout:60000},()=>{
 for(const [role,path] of [['unit','tools/translation/unit-runtime-materialization.mjs'],['sync-adapter','tools/translation/protected-native-writers-20261102.mjs'],['async-adapter','tools/translation/protected-reviewed-adoption-20261102.mjs'],['node-helper','tools/translation/protected-node-evidence-writers-20261103.mjs'],['node-runner','scripts/run-node-tests.mjs']]){const prefix='tools/translation/source-profiles/protected-source-diagnostics-20261103/',before=read(prefix+role+'.before.txt'),oldAfter=read(prefix+role+'.after.txt'),known=knownProtectedSourceDiagnosticSuccessor({root:ROOT,path,before});assert.equal(known.after,oldAfter);assert.equal(known.currentAfter,read(path));assert.equal(known.laterHistories.length,3);assert.equal(known.laterHistories[0].before,oldAfter);assert.equal(known.laterHistories[0].currentAfter,read(path));}
});
test('control changes retain both complete sources outside the self-hashed engine graph',{timeout:60000},()=>{
 const controls=proposeExactTemporarySourceControlSources();assert.equal(controls.files.length,3);for(const row of controls.files){const current=read(row.path);let terminal=row.after;for(const batch of [proposeExactJsonPackagingSourceControlSources(),proposeExactRecoverySourceControlSources()]){const later=batch.files.find(later=>later.path===row.path&&later.before===terminal);if(later)terminal=later.after;}assert.equal(current,terminal);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const current=read(ENGINE),before=read('tools/translation/source-profiles/exact-source-current-families-20261103/engine.after.txt'),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});assert.equal(known.after,current);assert.equal(known.laterHistories.length,3);assert.equal(known.nativeBindingQualified,false);
});
test('original198 and282 engine domains require no temporary-source companion in a receiving root',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'old-engine-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const originalBase='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/';for(const path of [ENGINE,...['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>originalBase+name),'tools/translation/source-profiles/exact-source-current-families-20261103/engine.after.txt']){fs.mkdirSync(join(root,path,'..'),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}const before=read(originalBase+'engine.before.txt');for(const path of [originalBase+'engine.after.txt','tools/translation/source-profiles/exact-source-current-families-20261103/engine.after.txt']){const current=read(path);fs.writeFileSync(join(root,ENGINE),current);const known=knownExactSourceCompilerEngineEpoch({root,before,current});assert.ok(known);assert.equal(known.after,current);}assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);
});
