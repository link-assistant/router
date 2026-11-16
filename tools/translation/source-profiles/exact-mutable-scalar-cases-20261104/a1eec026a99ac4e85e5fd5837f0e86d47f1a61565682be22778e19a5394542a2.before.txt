import {proposeExactScalarEarlyReturnControlSources20261104} from '../exact-source-scalar-early-return-controls-20261104.mjs';
import {proposeExactOrderedHelperGraphControlSources20261104} from '../exact-source-ordered-helper-graph-controls-20261104.mjs';
// Complete installed source/lifetime cases. SOURCE ONLY; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeOrderedScalarHelperNativeSources20261104} from '../ordered-scalar-helper-native-20261104-profile.mjs';
import {withExactOrderedScalarHelperSourceFamilyData20261104,proposeExactOrderedScalarHelperSourceIndex20261104} from '../exact-source-ordered-scalar-helper-families-20261104.mjs';
import {proposeExactOrderedScalarHelperControlSources20261104} from '../exact-source-ordered-scalar-helper-controls-20261104.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {withOwnedOrderedScalarHelperSourceOperation as coreFence} from '../js-to-rust/owned-core-source.mjs';
import {withOwnedOrderedScalarHelperSourceOperation as vectorFence} from '../js-to-rust/owned-vector-candidate-source.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-ordered-scalar-helper-families-20261104/';
const OLD='tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/helper-inputs.json.gz',INPUT='tools/translation/source-profiles/copy-scalar-helper-total-primitives-20261103/helper-inputs.json.gz';
const ORDERED='tools/translation/source-profiles/ordered-scalar-early-return-20261104/helper-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('both original native readers install the complete ordered native proposal',{timeout:900000},()=>{
 const proposal=proposeOrderedScalarHelperNativeSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,6);assert.equal(proposal.copies.length,5);assert.equal(proposal.inputSources.length,6);
 for(const row of [...proposal.files,...proposal.copies]){const current=read(row.path);if(current!==row.after){const later=knownExactSourceSuccessor({path:row.path,before:row.after});assert.ok(later,row.path);assert.equal(later.currentIsTerminal,true);assert.equal(later.after,current);}assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);}
 for(const row of proposal.newFiles)assert.equal(read(row.path),row.source);
});
test('all437 originals precede fourteen complete local/helper case continuations',{timeout:900000},()=>{
 const proposal=proposeExactOrderedScalarHelperSourceIndex20261104(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index437.before.json.gz'))));
 assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-ordered-helper-graph-families-20261104/index451.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,451);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,274);assert.deepEqual(proposal.index.rows.slice(0,437),previous.rows);assert.equal(proposal.images.length,28);
 for(const row of proposal.images)assert.equal(read(row.path),row.source);
 withExactOrderedScalarHelperSourceFamilyData20261104(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const result=knownExactSourceSuccessor({path:row.path,before:row.before});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.currentIsTerminal,true);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);}}));
});
test('fourteen complete controls retain the separate437 to451 source engine',{timeout:60000},()=>{
 const controls=proposeExactOrderedScalarHelperControlSources20261104();assert.equal(controls.files.length,14);for(const row of controls.files){const helperGraph=proposeExactOrderedHelperGraphControlSources20261104().files.find(value=>value.path===row.path);if(helperGraph)assert.equal(helperGraph.before,row.after);const early=proposeExactScalarEarlyReturnControlSources20261104().files.find(value=>value.path===row.path);if(early)assert.equal(early.before,helperGraph?.after??row.after);assert.equal(read(row.path),early?.after??helperGraph?.after??row.after);assert.equal(row.inverse,row.before);}
 const before=read('tools/translation/source-profiles/exact-source-scalar-primitives-families-20261103/engine.after.txt'),current=read('tools/translation/exact-source-successors-20261103.mjs'),result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.laterHistories.length,3);
});
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-scalar-local-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const rows=[];
 for(const path of [OLD,INPUT,ORDERED]){const raw=fs.readFileSync(join(ROOT,path));for(const row of JSON.parse(gunzipSync(raw)).rows){rows.push(row);fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.source);}fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);}return {root,rows};
}
for(const [name,fence] of [['core',coreFence],['vector',vectorFence]]){
 test(name+' original four, fourteen Copy and eight ordered inputs are checked before and after use',{timeout:60000},t=>{
  const {root,rows}=fixture(t);assert.equal(rows.length,26);assert.equal(fence(()=>true,{root}),true);
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
