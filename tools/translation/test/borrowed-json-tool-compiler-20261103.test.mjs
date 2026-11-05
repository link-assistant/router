import {proposeWidthRangeAdoptionControlSources20261104} from '../width-range-adoption-controls-20261104.mjs';
import {proposeExactMutableScalarControlSources20261104} from '../exact-source-mutable-scalar-controls-20261104.mjs';
import {proposeExactScalarEarlyReturnControlSources20261104} from '../exact-source-scalar-early-return-controls-20261104.mjs';
import {proposeExactOrderedHelperGraphControlSources20261104} from '../exact-source-ordered-helper-graph-controls-20261104.mjs';
import {proposeExactOrderedScalarHelperControlSources20261104} from '../exact-source-ordered-scalar-helper-controls-20261104.mjs';
import {proposeExactScalarPrimitivesControlSources} from '../exact-source-scalar-primitives-controls-20261103.mjs';
import {proposeExactScalarArgumentsControlSources} from '../exact-source-scalar-arguments-controls-20261103.mjs';
import {proposeExactScalarLocalsControlSources} from '../exact-source-scalar-locals-controls-20261103.mjs';
import {proposeExactCopyScalarHelperControlSources} from '../exact-source-copy-scalar-helper-controls-20261103.mjs';
import {proposeExactBooleanHelperControlSources} from '../exact-source-boolean-helper-controls-20261103.mjs';
import {proposeExactCollectionDescriptionControlSources} from '../exact-source-collection-description-controls-20261103.mjs';
import {proposeExactBorrowedPredicateControlSources} from '../exact-source-borrowed-predicate-controls-20261103.mjs';
import {proposeExactBorrowedJsonContextControlSources} from '../exact-source-borrowed-json-context-controls-20261103.mjs';
import {proposeExactBorrowedJsonLifetimeControlSources} from '../exact-source-borrowed-json-lifetimes-controls-20261103.mjs';
// Source ancestry/adoption case source only. UNRUN during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {proposeBorrowedJsonToolCompilerSources,withBorrowedJsonToolCompilerSources} from '../borrowed-json-tool-compiler-20261103-profile.mjs';
import {proposeExactBorrowedJsonCompilerSourceIndex,withExactBorrowedJsonCompilerSourceFamilyData} from '../exact-source-borrowed-json-compiler-families-20261103.mjs';
import {proposeExactBorrowedJsonCompilerControlSources} from '../exact-source-borrowed-json-compiler-controls-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {matchesExactSourceEpoch,knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const BASE='tools/translation/source-profiles/exact-source-borrowed-json-compiler-families-20261103/';
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json';
const ENGINE='tools/translation/exact-source-successors-20261103.mjs';
const read=path=>readFileSync(join(ROOT,path),'utf8');
test('all sixteen original compiler parents and seventeen created sources retain complete ancestry',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolCompilerSources();assert.equal(proposal.files.length,16);assert.equal(proposal.newFiles.length,17);
 assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.files){
  assert.equal(matchesExactSourceEpoch(row,read(row.path),{root:ROOT}),true);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
 }
 const copies=proposal.newFiles.filter(row=>row.sourceOrigin.kind==='complete-original-module-copy');assert.equal(copies.length,6);
 for(const row of proposal.newFiles){assert.equal(matchesExactSourceEpoch({path:row.path,before:row.after,after:row.after,inverse:row.after},read(row.path),{root:ROOT}),true);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.after);assert.equal(row.semanticAuthority,false);}
 for(const row of copies){assert.equal(row.history.before,row.sourceOrigin.before);assert.equal(row.history.inverse,row.sourceOrigin.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.sourceOrigin.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
});
test('the actual whole-source guard closes on ordinary results and exact callback primaries',{timeout:60000},()=>{
 const marker=Object.freeze({ordinary:true});assert.equal(withBorrowedJsonToolCompilerSources(()=>marker),marker);
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('compiler consumer'))]){
  let thrown=false;try{withBorrowedJsonToolCompilerSources(()=>{throw primary;});}catch(error){thrown=true;assert.equal(error,primary);}assert.equal(thrown,true);
 }
});
test('the original315 index is retained verbatim before eighteen complete successors',{timeout:60000},()=>{
 const proposal=proposeExactBorrowedJsonCompilerSourceIndex(),old=JSON.parse(gunzipSync(readFileSync(join(ROOT,BASE+'index315.before.json.gz'))));
 assert.equal(proposal.indexText,gunzipSync(readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-borrowed-json-lifetimes-families-20261103/index333.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,333);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,239);
 assert.deepEqual(proposal.index.rows.slice(0,315),old.rows);assert.equal(proposal.images.length,36);
 for(const image of proposal.images)assert.equal(read(image.path),image.source);
 assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);
 withExactBorrowedJsonCompilerSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{
  for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.currentIsTerminal,true);assert.equal(known.inverse,row.before);assert.equal(known.nativeBindingQualified,false);}
 }));
});
test('complete source controls retain the separate original315 engine transition',{timeout:60000},()=>{
 const mutableControls=proposeExactMutableScalarControlSources20261104().files;const widthControls=proposeWidthRangeAdoptionControlSources20261104().files;const controls=proposeExactBorrowedJsonCompilerControlSources();assert.equal(controls.files.length,4);
 for(const row of controls.files){const latest=proposeExactBorrowedJsonLifetimeControlSources().files.find(value=>value.path===row.path);if(latest)assert.equal(latest.before,row.after);const terminal=proposeExactBorrowedJsonContextControlSources().files.find(value=>value.path===row.path);if(terminal)assert.equal(terminal.before,latest?.after??row.after);const final=proposeExactBorrowedPredicateControlSources().files.find(value=>value.path===row.path);if(final)assert.equal(final.before,terminal?.after??latest?.after??row.after);const newest=proposeExactCollectionDescriptionControlSources().files.find(value=>value.path===row.path);if(newest)assert.equal(newest.before,final?.after??terminal?.after??latest?.after??row.after);const current=proposeExactBooleanHelperControlSources().files.find(value=>value.path===row.path);if(current)assert.equal(current.before,newest?.after??final?.after??terminal?.after??latest?.after??row.after);const scalar=proposeExactCopyScalarHelperControlSources().files.find(value=>value.path===row.path);if(scalar)assert.equal(scalar.before,current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const locals=proposeExactScalarLocalsControlSources().files.find(value=>value.path===row.path);if(locals)assert.equal(locals.before,scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const operands=proposeExactScalarArgumentsControlSources().files.find(value=>value.path===row.path);if(operands)assert.equal(operands.before,locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const primitives=proposeExactScalarPrimitivesControlSources().files.find(value=>value.path===row.path);if(primitives)assert.equal(primitives.before,operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const ordered=proposeExactOrderedScalarHelperControlSources20261104().files.find(value=>value.path===row.path);if(ordered)assert.equal(ordered.before,primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const helperGraph=proposeExactOrderedHelperGraphControlSources20261104().files.find(value=>value.path===row.path);if(helperGraph)assert.equal(helperGraph.before,ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const early=proposeExactScalarEarlyReturnControlSources20261104().files.find(value=>value.path===row.path);if(early)assert.equal(early.before,helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const mutable=mutableControls.find(value=>value.path===row.path);if(mutable)assert.equal(mutable.before,early?.after??helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);const width=widthControls.find(value=>value.path===row.path);if(width)assert.equal(width.before,mutable?.after??early?.after??helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);assert.equal(read(row.path),width?.after??mutable?.after??early?.after??helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??current?.after??newest?.after??final?.after??terminal?.after??latest?.after??row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const before=read('tools/translation/source-profiles/exact-source-temporary-recovery-families-20261103/engine.after.txt'),current=read(ENGINE),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});
 assert.ok(known);assert.equal(known.after,current);assert.equal(known.laterHistories.length,15);assert.equal(known.inverse,before);assert.equal(known.nativeBindingQualified,false);
});
