// Full actual source-corpus authoring/continuation case SOURCE; all UNRUN.
import test from 'node:test';
import {proposeExactRecoverySourceControlSources} from '../exact-source-temporary-recovery-controls-20261103.mjs';

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeExactCurrentSourceIndex,withExactCurrentSourceFamilyData} from '../exact-source-current-families-20261103.mjs';
import {proposeExactCurrentSourceControlSources} from '../exact-source-current-controls-20261103.mjs';
import {proposeExactTemporarySourceControlSources} from '../exact-source-temporary-controls-20261103.mjs';
import {proposeExactJsonPackagingSourceControlSources} from '../exact-source-json-packaging-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {extendExactSourceIndexData,extendExactSourceIndexCompactData} from '../exact-source-index-builder-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-current-families-20261103/',INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json';
test('all installed source families regenerate the complete current index without executing packet code',{timeout:60000},()=>{
 const proposal=proposeExactCurrentSourceIndex(),current=gunzipSync(readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-temporary-families-20261103/index282.before.json.gz'))).toString('utf8'),previous=JSON.parse(gunzipSync(readFileSync(join(ROOT,BASE+'index198.before.json.gz'))).toString('utf8'));assert.equal(proposal.indexText,current);assert.equal(proposal.index.rows.length,282);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,222);assert.equal(proposal.images.length,168);assert.deepEqual(proposal.index.rows.slice(0,198),previous.rows);assert.equal(current.split('\n').length,2);assert.equal(proposal.previousPreserved,true);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.sourceInstalled,false);
 for(const row of proposal.images)assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.source);
 assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.index.rows.some(row=>['tools/translation/exact-source-successors-20261103.mjs','tools/translation/exact-source-compiler-epochs-20261103.mjs'].includes(row.path)),false);
});
test('actual installed whole parents reach their complete current sources through the shared graph',{timeout:60000},()=>{
 const index=JSON.parse(readFileSync(join(ROOT,INDEX),'utf8')),paths=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-source.mjs','tools/translation/js-to-rust/owned-core-operations.mjs','tools/translation/js-to-rust/owned-vector-candidate-operations.mjs','tools/translation/unit-runtime-materialization.mjs','tools/translation/ordered-text-map-callers-20261102-source-storage.mjs','scripts/run-node-tests.mjs','tools/translation/protected-source-diagnostics-20261103.mjs','tools/translation/translate.mjs','rust/src/openai_tools.rs'];
 withExactSourceHistoryDataOperation(ROOT,()=>{for(const path of paths){const row=index.rows.find(row=>row.path===path);assert.ok(row,path);const before=readFileSync(join(ROOT,row.before.path),'utf8'),current=readFileSync(join(ROOT,path),'utf8'),known=knownExactSourceSuccessor({path,before},{root:ROOT});assert.ok(known,path);assert.equal(known.after,current);assert.equal(known.inverse,before);assert.equal(known.currentIsTerminal,true);assert.equal(known.semanticAuthority,false);assert.equal(known.nativeBindingQualified,false);}});
});
test('original pretty layout and new compact layout preserve identical complete index/image DATA',{timeout:60000},()=>{
 withExactCurrentSourceFamilyData(input=>{const pretty=extendExactSourceIndexData(input),compact=extendExactSourceIndexCompactData(input);assert.deepEqual(compact.index,pretty.index);assert.deepEqual(compact.images,pretty.images);assert.equal(compact.indexText,JSON.stringify(pretty.index)+'\n');assert.ok(pretty.indexText.includes('\n  "rows"'));assert.equal(compact.semanticAuthority,false);});
});
test('current engine/source controls retain complete source equations and all old engine predecessors',{timeout:60000},()=>{
 const controls=proposeExactCurrentSourceControlSources();assert.equal(controls.files.length,3);for(const row of controls.files){const current=readFileSync(join(ROOT,row.path),'utf8');let terminal=row.after;for(const batch of [proposeExactTemporarySourceControlSources(),proposeExactJsonPackagingSourceControlSources(),proposeExactRecoverySourceControlSources()]){const later=batch.files.find(later=>later.path===row.path&&later.before===terminal);if(later)terminal=later.after;}assert.equal(current,terminal);assert.equal(row.inverse,row.before);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 const engine=controls.files.find(row=>row.path==='tools/translation/exact-source-successors-20261103.mjs'),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before:engine.before,current:readFileSync(join(ROOT,engine.path),'utf8')});assert.ok(known);assert.equal(known.after,readFileSync(join(ROOT,engine.path),'utf8'));assert.equal(known.inverse,engine.before);assert.equal(known.nativeBindingQualified,false);assert.equal(known.laterHistories.length,4);
});
test('source family callback failures stay exact and synchronous source-only result boundaries remain',{timeout:60000},()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze({ordinary:true})]){let caught=false;try{withExactCurrentSourceFamilyData(()=>{throw primary;});}catch(error){caught=true;assert.equal(error,primary);}assert.equal(caught,true);}
 assert.throws(()=>withExactCurrentSourceFamilyData(()=>Promise.resolve()));
});
