// Complete installed source/lifetime cases. SOURCE ONLY; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeOrderedMutableScalarSources20261104} from '../ordered-mutable-scalars-20261104-profile.mjs';
import {withExactMutableScalarSourceFamilyData20261104,proposeExactMutableScalarSourceIndex20261104} from '../exact-source-mutable-scalar-families-20261104.mjs';
import {proposeExactMutableScalarControlSources20261104} from '../exact-source-mutable-scalar-controls-20261104.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {withOwnedOrderedScalarHelperSourceOperation as coreFence} from '../js-to-rust/owned-core-source.mjs';
import {withOwnedOrderedScalarHelperSourceOperation as vectorFence} from '../js-to-rust/owned-vector-candidate-source.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-mutable-scalar-families-20261104/';
const OLD='tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/helper-inputs.json.gz',INPUT='tools/translation/source-profiles/copy-scalar-helper-total-primitives-20261103/helper-inputs.json.gz';
const ORDERED='tools/translation/source-profiles/ordered-mutable-scalars-20261104/helper-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('both original native readers install the complete mutable scalar proposal',{timeout:900000},()=>{
 const proposal=proposeOrderedMutableScalarSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.inputSources.length,9);assert.equal(proposal.copies.length,1);
 for(const row of [...proposal.files,...proposal.copies]){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);}
 for(const row of proposal.newFiles)assert.equal(read(row.path),row.source);
});
test('all482 originals precede seventeen complete mutable/case continuations',{timeout:900000},()=>{
 const proposal=proposeExactMutableScalarSourceIndex20261104(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index482.before.json.gz'))));
 assert.equal(proposal.indexText,read('tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json'));assert.equal(proposal.index.rows.length,499);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,277);assert.deepEqual(proposal.index.rows.slice(0,482),previous.rows);assert.equal(proposal.images.length,34);
 for(const row of proposal.images)assert.equal(read(row.path),row.source);
 withExactMutableScalarSourceFamilyData20261104(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const result=knownExactSourceSuccessor({path:row.path,before:row.before});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.currentIsTerminal,true);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);}}));
});
test('seventeen complete controls retain the separate482 to499 source engine',{timeout:60000},()=>{
 const controls=proposeExactMutableScalarControlSources20261104();assert.equal(controls.files.length,17);for(const row of controls.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);}
 const before=read('tools/translation/source-profiles/exact-source-scalar-early-return-families-20261104/engine.after.txt'),current=read('tools/translation/exact-source-successors-20261103.mjs'),result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.laterHistories.length,1);
});
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-scalar-local-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const rows=[];
 for(const path of [OLD,INPUT,ORDERED]){const raw=fs.readFileSync(join(ROOT,path));for(const row of JSON.parse(gunzipSync(raw)).rows){rows.push(row);fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.source);}fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);}return {root,rows};
}
for(const [name,fence] of [['core',coreFence],['vector',vectorFence]]){
 test(name+' original four, fourteen Copy and nine ordered inputs are checked before and after use',{timeout:60000},t=>{
  const {root,rows}=fixture(t);assert.equal(rows.length,27);assert.equal(fence(()=>true,{root}),true);
  for(const row of rows){fs.writeFileSync(join(root,row.path),row.source+'\nchanged');assert.throws(()=>fence(()=>true,{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');return true;},{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);}assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' caught/restored local implementation failures remain fatal to the enclosing operation',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');try{fence(()=>true,{root});}catch{}finally{fs.writeFileSync(join(root,row.path),row.source);}return true;},{root}),TypeError);assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' exact original callback primaries survive all closing checks',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);for(const primary of [false,0,'',null,undefined,Object.freeze({original:true})]){let caught=false;try{fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');throw primary;},{root});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{fs.writeFileSync(join(root,row.path),row.source);}assert.equal(caught,true);}assert.throws(()=>fence(async()=>true,{root}),TypeError);assert.throws(()=>fence(()=>Promise.resolve(true),{root}),TypeError);
 });
}
test('an original412 root does not require the later argument companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original412-argument-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});
test('an original424 root does not require the total primitive companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original424-primitive-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103','exact-source-scalar-arguments-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});
test('an original437 root does not require the ordered helper companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original437-ordered-helper-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103','exact-source-scalar-arguments-families-20261103','exact-source-scalar-primitives-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});
test('an original451 root does not require the helper graph companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original451-helper-graph-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103','exact-source-scalar-arguments-families-20261103','exact-source-scalar-primitives-families-20261103','exact-source-ordered-scalar-helper-families-20261104'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});
test('an original466 root does not require the scalar early-return companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original466-early-return-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103','exact-source-scalar-arguments-families-20261103','exact-source-scalar-primitives-families-20261103','exact-source-ordered-scalar-helper-families-20261104','exact-source-ordered-helper-graph-families-20261104'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});

test('an original482 root does not require the mutable scalar companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original482-mutable-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const initial='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>initial+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103','exact-source-borrowed-predicate-families-20261103','exact-source-collection-description-families-20261103','exact-source-boolean-helper-families-20261103','exact-source-copy-scalar-helper-families-20261103','exact-source-scalar-locals-families-20261103','exact-source-scalar-arguments-families-20261103','exact-source-scalar-primitives-families-20261103','exact-source-ordered-scalar-helper-families-20261104','exact-source-ordered-helper-graph-families-20261104','exact-source-scalar-early-return-families-20261104'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}
 const current=read(paths.at(-1)),engine='tools/translation/exact-source-successors-20261103.mjs';fs.mkdirSync(dirname(join(root,engine)),{recursive:true});fs.writeFileSync(join(root,engine),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(initial+'engine.before.txt'),current}));
});
