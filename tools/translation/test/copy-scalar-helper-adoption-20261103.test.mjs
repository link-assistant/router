import {proposeExactScalarArgumentsControlSources} from '../exact-source-scalar-arguments-controls-20261103.mjs';
import {proposeExactScalarLocalsControlSources} from '../exact-source-scalar-locals-controls-20261103.mjs';
// Actual complete source installation/history cases. SOURCE ONLY, UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeCopyScalarHelperSources20261103} from '../copy-scalar-helper-20261103-profile.mjs';
import {withExactCopyScalarHelperSourceFamilyData,proposeExactCopyScalarHelperSourceIndex} from '../exact-source-copy-scalar-helper-families-20261103.mjs';
import {proposeExactCopyScalarHelperControlSources} from '../exact-source-copy-scalar-helper-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {withOwnedCopyHelperSourceOperation as coreFence} from '../js-to-rust/owned-core-source.mjs';
import {withOwnedCopyHelperSourceOperation as vectorFence} from '../js-to-rust/owned-vector-candidate-source.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const BASE='tools/translation/source-profiles/exact-source-copy-scalar-helper-families-20261103/';
const OLD='tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/helper-inputs.json.gz';
const INPUT='tools/translation/source-profiles/copy-scalar-helper-arguments-20261103/helper-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('two original readers and four complete implementation copies are actually installed',{timeout:900000},()=>{
 const proposal=proposeCopyScalarHelperSources20261103();assert.equal(proposal.files.length,2);assert.equal(proposal.copies.length,4);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.inputSources.length,6);
 for(const row of [...proposal.files,...proposal.copies]){const current=read(row.path);if(current!==row.after){const later=knownExactSourceSuccessor({path:row.path,before:row.after});assert.ok(later,row.path);assert.equal(later.currentIsTerminal,true);assert.equal(later.after,current);}assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);}
 for(const row of proposal.newFiles)assert.equal(read(row.path),row.source);
});
test('all391 original source equations remain before ten complete scalar/case continuations',{timeout:900000},()=>{
 const proposal=proposeExactCopyScalarHelperSourceIndex(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index391.before.json.gz'))));
 assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-scalar-locals-families-20261103/index401.before.json.gz'))).toString('utf8'));
 assert.equal(proposal.index.rows.length,401);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,270);assert.deepEqual(proposal.index.rows.slice(0,391),previous.rows);assert.equal(proposal.images.length,20);
 for(const row of proposal.images)assert.equal(read(row.path),row.source);
 withExactCopyScalarHelperSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const result=knownExactSourceSuccessor({path:row.path,before:row.before});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.currentIsTerminal,true);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);}}));
});
test('all ten complete controls retain a separate391 to401 source engine transition',{timeout:60000},()=>{
 const controls=proposeExactCopyScalarHelperControlSources();assert.equal(controls.files.length,10);for(const row of controls.files){const locals=proposeExactScalarLocalsControlSources().files.find(value=>value.path===row.path);if(locals)assert.equal(locals.before,row.after);const operands=proposeExactScalarArgumentsControlSources().files.find(value=>value.path===row.path);if(operands)assert.equal(operands.before,locals?.after??row.after);assert.equal(read(row.path),operands?.after??locals?.after??row.after);assert.equal(row.inverse,row.before);}
 const before=read('tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/engine.after.txt'),current=read('tools/translation/exact-source-successors-20261103.mjs');
 const result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.laterHistories.length,3);
});
test('an original391 root needs no later Copy scalar source companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original391-copy-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const first='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>first+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(first+'engine.before.txt'),current}));
});
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-copy-scalar-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const rows=[];
 for(const path of [OLD,INPUT]){const raw=fs.readFileSync(join(ROOT,path));for(const row of JSON.parse(gunzipSync(raw)).rows){rows.push(row);fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.source);}fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);}
 return {root,rows};
}
for(const [name,fence] of [['core',coreFence],['vector',vectorFence]]){
 test(name+' Copy source operation checks the old four and current eight complete inputs',{timeout:60000},t=>{
  const {root,rows}=fixture(t);assert.equal(rows.length,12);assert.equal(fence(()=>true,{root}),true);
  for(const row of rows){fs.writeFileSync(join(root,row.path),row.source+'\nchanged');assert.throws(()=>fence(()=>true,{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');return true;},{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);}
  assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' caught/restored nested input failures invalidate the enclosing Copy operation',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');try{fence(()=>true,{root});}catch{}finally{fs.writeFileSync(join(root,row.path),row.source);}return true;},{root}),TypeError);assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' all exact primaries survive complete old/new source closing failures',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);
  for(const primary of [false,0,'',null,undefined,Object.freeze({original:true})]){let caught=false;try{fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');throw primary;},{root});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{fs.writeFileSync(join(root,row.path),row.source);}assert.equal(caught,true);}
  assert.throws(()=>fence(async()=>true,{root}),TypeError);assert.throws(()=>fence(()=>Promise.resolve(true),{root}),TypeError);
 });
}
