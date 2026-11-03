import {proposeExactOrderedHelperGraphControlSources20261104} from '../exact-source-ordered-helper-graph-controls-20261104.mjs';
import {proposeExactOrderedScalarHelperControlSources20261104} from '../exact-source-ordered-scalar-helper-controls-20261104.mjs';
import {proposeExactScalarPrimitivesControlSources} from '../exact-source-scalar-primitives-controls-20261103.mjs';
import {proposeExactScalarArgumentsControlSources} from '../exact-source-scalar-arguments-controls-20261103.mjs';
import {proposeExactScalarLocalsControlSources} from '../exact-source-scalar-locals-controls-20261103.mjs';
import {proposeExactCopyScalarHelperControlSources} from '../exact-source-copy-scalar-helper-controls-20261103.mjs';
// Original complete source/native lifetime cases. SOURCE ONLY, UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeBooleanHelperSources20261103} from '../boolean-helper-20261103-profile.mjs';
import {proposeBooleanHelperDocumentSources20261103} from '../boolean-helper-documents-20261103-profile.mjs';
import {proposeBooleanHelperInstalledSources20261103} from '../boolean-helper-installed-20261103-profile.mjs';
import {withExactBooleanHelperSourceFamilyData,proposeExactBooleanHelperSourceIndex} from '../exact-source-boolean-helper-families-20261103.mjs';
import {proposeExactBooleanHelperControlSources} from '../exact-source-boolean-helper-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {withOwnedBooleanHelperSourceOperation as coreFence} from '../js-to-rust/owned-core-source.mjs';
import {withOwnedBooleanHelperSourceOperation as vectorFence} from '../js-to-rust/owned-vector-candidate-source.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const BASE='tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/';
const INPUT=BASE+'helper-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('both complete helper reader proposals precede the actual source-custodied installation',{timeout:900000},()=>{
 const first=proposeBooleanHelperSources20261103(),second=proposeBooleanHelperDocumentSources20261103(),installed=proposeBooleanHelperInstalledSources20261103();
 assert.equal(first.files.length,2);assert.equal(second.files.length,2);assert.equal(second.copies.length,2);assert.equal(installed.files.length,6);assert.equal(installed.newFiles.length,2);
 for(const row of second.files)assert.equal(first.files.find(original=>original.path===row.path).after,row.before);
 for(const row of installed.files){
  const previous=second.files.find(original=>original.path===row.path)??second.copies.find(original=>original.path===row.path);
  if(previous)assert.equal(previous.after,row.before);
  const current=read(row.path);if(current!==row.after){const later=knownExactSourceSuccessor({path:row.path,before:row.after});assert.ok(later,row.path);assert.equal(later.currentIsTerminal,true);assert.equal(later.after,current);}assert.equal(row.inverse,row.before);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);
 }
 for(const row of installed.newFiles)assert.equal(read(row.path),row.source);
});
test('all original374 equations remain before seventeen new whole-source edges',{timeout:900000},()=>{
 const proposal=proposeExactBooleanHelperSourceIndex(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index374.before.json.gz'))));
 assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-copy-scalar-helper-families-20261103/index391.before.json.gz'))).toString('utf8'));
 assert.equal(proposal.index.rows.length,391);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,269);
 assert.deepEqual(proposal.index.rows.slice(0,374),previous.rows);assert.equal(proposal.images.length,34);
 for(const row of proposal.images)assert.equal(read(row.path),row.source);
 withExactBooleanHelperSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){
  const result=knownExactSourceSuccessor({path:row.path,before:row.before});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.currentIsTerminal,true);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);
 }}));
});
test('the source engine has a separate original374 to391 transition',{timeout:60000},()=>{
 const controls=proposeExactBooleanHelperControlSources();assert.equal(controls.files.length,9);
 for(const row of controls.files){const scalar=proposeExactCopyScalarHelperControlSources().files.find(value=>value.path===row.path);if(scalar)assert.equal(scalar.before,row.after);const locals=proposeExactScalarLocalsControlSources().files.find(value=>value.path===row.path);if(locals)assert.equal(locals.before,scalar?.after??row.after);const operands=proposeExactScalarArgumentsControlSources().files.find(value=>value.path===row.path);if(operands)assert.equal(operands.before,locals?.after??scalar?.after??row.after);const primitives=proposeExactScalarPrimitivesControlSources().files.find(value=>value.path===row.path);if(primitives)assert.equal(primitives.before,operands?.after??locals?.after??scalar?.after??row.after);const ordered=proposeExactOrderedScalarHelperControlSources20261104().files.find(value=>value.path===row.path);if(ordered)assert.equal(ordered.before,primitives?.after??operands?.after??locals?.after??scalar?.after??row.after);const helperGraph=proposeExactOrderedHelperGraphControlSources20261104().files.find(value=>value.path===row.path);if(helperGraph)assert.equal(helperGraph.before,ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??row.after);assert.equal(read(row.path),helperGraph?.after??ordered?.after??primitives?.after??operands?.after??locals?.after??scalar?.after??row.after);assert.equal(row.inverse,row.before);}
 const before=read('tools/translation/source-profiles/exact-source-collection-description-families-20261103/engine.after.txt');
 const current=read('tools/translation/exact-source-successors-20261103.mjs');
 const result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.laterHistories.length,7);
});
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-Boolean-helper-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const archive=fs.readFileSync(join(ROOT,INPUT)),rows=JSON.parse(gunzipSync(archive)).rows;
 for(const row of rows){fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.source);}
 fs.mkdirSync(dirname(join(root,INPUT)),{recursive:true});fs.writeFileSync(join(root,INPUT),archive);return {root,rows};
}
for(const [name,fence] of [['core',coreFence],['vector',vectorFence]]){
 test(name+' source restriction detects every complete helper input before and after use',{timeout:60000},t=>{
  const {root,rows}=fixture(t);assert.equal(fence(()=>42,{root}),42);
  for(const row of rows){
   fs.writeFileSync(join(root,row.path),row.source+'\nchanged');assert.throws(()=>fence(()=>42,{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);
   assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');return 42;},{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);
  }
  assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' caught/restored nested failures poison the enclosing source operation',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows[0];
  assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');try{fence(()=>true,{root});}catch{}finally{fs.writeFileSync(join(root,row.path),row.source);}return true;},{root}),TypeError);
  assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' source closing preserves every exact callback primary',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows[0];
  for(const primary of [false,0,'',null,undefined,Object.freeze({original:true})]){
   let caught=false;try{fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');throw primary;},{root});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{fs.writeFileSync(join(root,row.path),row.source);}assert.equal(caught,true);
  }
  assert.throws(()=>fence(async()=>true,{root}),TypeError);assert.throws(()=>fence(()=>Promise.resolve(true),{root}),TypeError);
 });
}
