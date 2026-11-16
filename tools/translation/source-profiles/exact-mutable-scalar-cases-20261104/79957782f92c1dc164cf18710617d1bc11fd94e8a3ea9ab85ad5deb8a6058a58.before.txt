import {proposeExactScalarEarlyReturnControlSources20261104} from '../exact-source-scalar-early-return-controls-20261104.mjs';
import {proposeExactOrderedHelperGraphControlSources20261104} from '../exact-source-ordered-helper-graph-controls-20261104.mjs';
import {proposeExactOrderedScalarHelperControlSources20261104} from '../exact-source-ordered-scalar-helper-controls-20261104.mjs';
import {proposeExactScalarPrimitivesControlSources} from '../exact-source-scalar-primitives-controls-20261103.mjs';
import {proposeExactScalarArgumentsControlSources} from '../exact-source-scalar-arguments-controls-20261103.mjs';
// Complete installed source/lifetime cases. SOURCE ONLY; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeCopyScalarHelperLocalSources20261103} from '../copy-scalar-helper-locals-20261103-profile.mjs';
import {withExactScalarLocalsSourceFamilyData,proposeExactScalarLocalsSourceIndex} from '../exact-source-scalar-locals-families-20261103.mjs';
import {proposeExactScalarLocalsControlSources} from '../exact-source-scalar-locals-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {withOwnedCopyHelperSourceOperation as coreFence} from '../js-to-rust/owned-core-source.mjs';
import {withOwnedCopyHelperSourceOperation as vectorFence} from '../js-to-rust/owned-vector-candidate-source.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-scalar-locals-families-20261103/';
const OLD='tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/helper-inputs.json.gz',INPUT='tools/translation/source-profiles/copy-scalar-helper-total-primitives-20261103/helper-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('both original native readers install the complete local-binding proposal',{timeout:900000},()=>{
 const proposal=proposeCopyScalarHelperLocalSources20261103();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,2);
 for(const row of proposal.files){const current=read(row.path);if(current!==row.after){const later=knownExactSourceSuccessor({path:row.path,before:row.after});assert.ok(later,row.path);assert.equal(later.currentIsTerminal,true);assert.equal(later.after,current);}assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);}
 for(const row of proposal.newFiles)assert.equal(read(row.path),row.source);
});
test('all401 originals precede eleven complete local/helper case continuations',{timeout:900000},()=>{
 const proposal=proposeExactScalarLocalsSourceIndex(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index401.before.json.gz'))));
 assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-scalar-arguments-families-20261103/index412.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,412);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,271);assert.deepEqual(proposal.index.rows.slice(0,401),previous.rows);assert.equal(proposal.images.length,22);
 for(const row of proposal.images)assert.equal(read(row.path),row.source);
 withExactScalarLocalsSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const result=knownExactSourceSuccessor({path:row.path,before:row.before});assert.ok(result,row.path);assert.equal(result.after,read(row.path));assert.equal(result.currentIsTerminal,true);assert.equal(result.inverse,row.before);assert.equal(result.nativeBindingQualified,false);}}));
});
test('eleven complete controls retain the separate401 to412 source engine',{timeout:60000},()=>{
 const controls=proposeExactScalarLocalsControlSources();assert.equal(controls.files.length,11);for(const row of controls.files){const operands=proposeExactScalarArgumentsControlSources().files.find(value=>value.path===row.path);if(operands)assert.equal(operands.before,row.after);const primitives=proposeExactScalarPrimitivesControlSources().files.find(value=>value.path===row.path);if(primitives)assert.equal(primitives.before,operands?.after??row.after);const ordered=proposeExactOrderedScalarHelperControlSources20261104().files.find(value=>value.path===row.path);if(ordered)assert.equal(ordered.before,primitives?.after??operands?.after??row.after);const helperGraph=proposeExactOrderedHelperGraphControlSources20261104().files.find(value=>value.path===row.path);if(helperGraph)assert.equal(helperGraph.before,ordered?.after??primitives?.after??operands?.after??row.after);const early=proposeExactScalarEarlyReturnControlSources20261104().files.find(value=>value.path===row.path);if(early)assert.equal(early.before,helperGraph?.after??ordered?.after??primitives?.after??operands?.after??row.after);assert.equal(read(row.path),early?.after??helperGraph?.after??ordered?.after??primitives?.after??operands?.after??row.after);assert.equal(row.inverse,row.before);}
 const before=read('tools/translation/source-profiles/exact-source-copy-scalar-helper-families-20261103/engine.after.txt'),current=read('tools/translation/exact-source-successors-20261103.mjs'),result=knownExactSourceCompilerEngineEpoch({before,current});assert.ok(result);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.laterHistories.length,6);
});
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-scalar-local-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const rows=[];
 for(const path of [OLD,INPUT]){const raw=fs.readFileSync(join(ROOT,path));for(const row of JSON.parse(gunzipSync(raw)).rows){rows.push(row);fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.source);}fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),raw);}return {root,rows};
}
for(const [name,fence] of [['core',coreFence],['vector',vectorFence]]){
 test(name+' old four and current fourteen inputs are checked before and after use',{timeout:60000},t=>{
  const {root,rows}=fixture(t);assert.equal(rows.length,18);assert.equal(fence(()=>true,{root}),true);
  for(const row of rows){fs.writeFileSync(join(root,row.path),row.source+'\nchanged');assert.throws(()=>fence(()=>true,{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');return true;},{root}),TypeError);fs.writeFileSync(join(root,row.path),row.source);}assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' caught/restored local implementation failures remain fatal to the enclosing operation',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);assert.throws(()=>fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');try{fence(()=>true,{root});}catch{}finally{fs.writeFileSync(join(root,row.path),row.source);}return true;},{root}),TypeError);assert.equal(fence(()=>true,{root}),true);
 });
 test(name+' exact original callback primaries survive all closing checks',{timeout:60000},t=>{
  const {root,rows}=fixture(t),row=rows.at(-1);for(const primary of [false,0,'',null,undefined,Object.freeze({original:true})]){let caught=false;try{fence(()=>{fs.writeFileSync(join(root,row.path),row.source+'\nchanged');throw primary;},{root});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{fs.writeFileSync(join(root,row.path),row.source);}assert.equal(caught,true);}assert.throws(()=>fence(async()=>true,{root}),TypeError);assert.throws(()=>fence(()=>Promise.resolve(true),{root}),TypeError);
 });
}
