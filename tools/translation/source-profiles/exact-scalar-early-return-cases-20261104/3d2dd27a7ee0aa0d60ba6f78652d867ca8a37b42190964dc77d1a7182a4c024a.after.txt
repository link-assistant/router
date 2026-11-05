import {proposeExactScalarEarlyReturnControlSources20261104} from '../exact-source-scalar-early-return-controls-20261104.mjs';
import {proposeExactOrderedHelperGraphControlSources20261104} from '../exact-source-ordered-helper-graph-controls-20261104.mjs';
import {proposeExactOrderedScalarHelperControlSources20261104} from '../exact-source-ordered-scalar-helper-controls-20261104.mjs';
import {proposeExactScalarPrimitivesControlSources} from '../exact-source-scalar-primitives-controls-20261103.mjs';
import {proposeExactScalarArgumentsControlSources} from '../exact-source-scalar-arguments-controls-20261103.mjs';
import {proposeExactScalarLocalsControlSources} from '../exact-source-scalar-locals-controls-20261103.mjs';
import {proposeExactCopyScalarHelperControlSources} from '../exact-source-copy-scalar-helper-controls-20261103.mjs';
import {proposeExactBooleanHelperControlSources} from '../exact-source-boolean-helper-controls-20261103.mjs';
// Complete actual source adoption/history case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposePrimitiveCollectionDescriptionSources} from '../primitive-collection-descriptions-20261103-profile.mjs';
import {proposeVectorOperationDescriptionSources} from '../vector-operation-descriptions-20261103-profile.mjs';
import {proposeCollectionDescriptionInstalledSources} from '../collection-description-install-20261103-profile.mjs';
import {proposeExactCollectionDescriptionSourceIndex,withExactCollectionDescriptionSourceFamilyData} from '../exact-source-collection-description-families-20261103.mjs';
import {proposeExactCollectionDescriptionControlSources} from '../exact-source-collection-description-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-collection-description-families-20261103/';
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',ENGINE='tools/translation/exact-source-successors-20261103.mjs';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('five actual candidate modules retain both complete proposals and all seven installed parent equations',{timeout:60000},()=>{
 const proposals=[proposePrimitiveCollectionDescriptionSources(),proposeVectorOperationDescriptionSources()],installed=proposeCollectionDescriptionInstalledSources();assert.equal(installed.files.length,7);assert.equal(installed.newFiles.length,0);
 const originals=proposals.flatMap(row=>row.plan.files);assert.equal(originals.length,10);
 for(const row of installed.files){
  assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
  const original=originals.find(value=>value.path===row.path);if(original){assert.equal(original.before,row.before);assert.equal(original.after,row.after);}
 }
 for(const row of originals.filter(row=>row.path.endsWith('.d.mts'))){assert.equal(row.after,row.before);assert.equal(read(row.path),row.after);}
 for(const proposal of proposals)for(const row of proposal.newFiles){assert.equal(read(row.path),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);}
 assert.equal(installed.semanticAuthority,false);assert.equal(installed.nativeBindingQualified,false);
});
test('the complete original361 index precedes thirteen current collection/case source equations',{timeout:60000},()=>{
 const proposal=proposeExactCollectionDescriptionSourceIndex(),old=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index361.before.json.gz'))));assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/index374.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,374);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,264);assert.deepEqual(proposal.index.rows.slice(0,361),old.rows);assert.equal(proposal.images.length,26);
 for(const image of proposal.images)assert.equal(read(image.path),image.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);
 withExactCollectionDescriptionSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.inverse,row.before);assert.equal(known.currentIsTerminal,true);assert.equal(known.nativeBindingQualified,false);}}));
});
test('eight complete controls retain the separate361 to374 engine transition',{timeout:60000},()=>{
 const controls=proposeExactCollectionDescriptionControlSources();assert.equal(controls.files.length,8);for(const row of controls.files){const latest=proposeExactBooleanHelperControlSources().files.find(value=>value.path===row.path);if(latest)assert.equal(latest.before,row.after);const scalar=proposeExactCopyScalarHelperControlSources().files.find(value=>value.path===row.path);if(scalar)assert.equal(scalar.before,latest?.after??row.after);const locals=proposeExactScalarLocalsControlSources().files.find(value=>value.path===row.path);if(locals)assert.equal(locals.before,scalar?.after??latest?.after??row.after);const operands=proposeExactScalarArgumentsControlSources().files.find(value=>value.path===row.path);if(operands)assert.equal(operands.before,locals?.after??scalar?.after??latest?.after??row.after);const primitives=proposeExactScalarPrimitivesControlSources().files.find(value=>value.path===row.path);if(primitives)assert.equal(primitives.before,operands?.after??locals?.after??scalar?.after??latest?.after??row.after);const ordered=proposeExactOrderedScalarHelperControlSources20261104().files.find(value=>value.path===row.path);if(ordered)assert.equal(ordered.before,primitives?.after??operands?.after??locals?.after??scalar?.after??latest?.after??row.after);const helperGraph=proposeExactOrderedHelperGraphControlSources20261104().files.find(value=>value.path===row.path);if(helperGraph)assert.equal(helperGraph.before,ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??latest?.after??row.after);const early=proposeExactScalarEarlyReturnControlSources20261104().files.find(value=>value.path===row.path);if(early)assert.equal(early.before,helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??latest?.after??row.after);assert.equal(read(row.path),early?.after??helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??latest?.after??row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const before=read('tools/translation/source-profiles/exact-source-borrowed-predicate-families-20261103/engine.after.txt'),current=read(ENGINE),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});assert.ok(known);assert.equal(known.inverse,before);assert.equal(known.after,current);assert.equal(known.laterHistories.length,9);assert.equal(known.nativeBindingQualified,false);
});
test('an original361 root requires no later collection engine companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original361-collection-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const first='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>first+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}const current=read(paths.at(-1));fs.mkdirSync(dirname(join(root,ENGINE)),{recursive:true});fs.writeFileSync(join(root,ENGINE),current);assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(first+'engine.before.txt'),current}));
});
