// Complete original lifetime source/adoption cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {proposeBorrowedJsonToolLifetimeSources} from '../borrowed-json-tool-lifetimes-20261103-profile.mjs';
import {proposeExactBorrowedJsonLifetimeSourceIndex,withExactBorrowedJsonLifetimeSourceFamilyData} from '../exact-source-borrowed-json-lifetimes-families-20261103.mjs';
import {proposeExactBorrowedJsonLifetimeControlSources} from '../exact-source-borrowed-json-lifetimes-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const BASE='tools/translation/source-profiles/exact-source-borrowed-json-lifetimes-families-20261103/';
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json';
const ENGINE='tools/translation/exact-source-successors-20261103.mjs',read=path=>readFileSync(join(ROOT,path),'utf8');
test('six complete original parents and all three created sources retain their original CST/inverses',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolLifetimeSources();assert.equal(proposal.files.length,6);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.newFiles){assert.equal(read(row.path),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
 assert.ok(proposal.newFiles.some(row=>row.path.endsWith('.rs')));
});
test('the full original333 index precedes nine exact source successors',{timeout:60000},()=>{
 const proposal=proposeExactBorrowedJsonLifetimeSourceIndex(),previous=JSON.parse(gunzipSync(readFileSync(join(ROOT,BASE+'index333.before.json.gz'))));
 assert.equal(proposal.indexText,read(INDEX));assert.equal(proposal.index.rows.length,342);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,245);assert.deepEqual(proposal.index.rows.slice(0,333),previous.rows);assert.equal(proposal.images.length,18);
 for(const image of proposal.images)assert.equal(read(image.path),image.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);
});
test('each current lifetime source is an exact terminal of its complete original equation',{timeout:60000},()=>{
 withExactBorrowedJsonLifetimeSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{
  for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.currentIsTerminal,true);assert.equal(known.inverse,row.before);assert.equal(known.nativeBindingQualified,false);}
 }));
});
test('all five complete controls and the separate333→342 engine transition remain retained',{timeout:60000},()=>{
 const controls=proposeExactBorrowedJsonLifetimeControlSources();assert.equal(controls.files.length,5);for(const row of controls.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const before=read('tools/translation/source-profiles/exact-source-borrowed-json-compiler-families-20261103/engine.after.txt'),current=read(ENGINE),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});assert.ok(known);assert.equal(known.after,current);assert.equal(known.inverse,before);assert.equal(known.laterHistories.length,1);assert.equal(known.nativeBindingQualified,false);
});
