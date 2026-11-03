// Complete source/history cases only. All execution deferred and UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeBorrowedJsonSourceContextSources} from '../borrowed-json-source-context-20261103-profile.mjs';
import {proposeExactBorrowedJsonContextSourceIndex,withExactBorrowedJsonContextSourceFamilyData} from '../exact-source-borrowed-json-context-families-20261103.mjs';
import {proposeExactBorrowedJsonContextControlSources} from '../exact-source-borrowed-json-context-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-borrowed-json-context-families-20261103/';
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',ENGINE='tools/translation/exact-source-successors-20261103.mjs';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('the original complete caller registry and actual receiving case retain source CST/inverse ancestry',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonSourceContextSources();assert.equal(proposal.files.length,1);assert.equal(proposal.newFiles.length,1);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.newFiles){assert.equal(read(row.path),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
});
test('the original342 index remains whole before five current context/case equations',{timeout:60000},()=>{
 const proposal=proposeExactBorrowedJsonContextSourceIndex(),old=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index342.before.json.gz'))));assert.equal(proposal.indexText,read(INDEX));assert.equal(proposal.index.rows.length,347);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,247);assert.deepEqual(proposal.index.rows.slice(0,342),old.rows);assert.equal(proposal.images.length,10);
 for(const image of proposal.images)assert.equal(read(image.path),image.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);
 withExactBorrowedJsonContextSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.currentIsTerminal,true);assert.equal(known.inverse,row.before);assert.equal(known.nativeBindingQualified,false);}}));
});
test('all six complete controls retain the separate original342 engine transition',{timeout:60000},()=>{
 const proposal=proposeExactBorrowedJsonContextControlSources();assert.equal(proposal.files.length,6);for(const row of proposal.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const before=read('tools/translation/source-profiles/exact-source-borrowed-json-lifetimes-families-20261103/engine.after.txt'),current=read(ENGINE),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});assert.ok(known);assert.equal(known.inverse,before);assert.equal(known.after,current);assert.equal(known.laterHistories.length,1);assert.equal(known.nativeBindingQualified,false);
});
test('an original342 receiving root requires no later context source companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-original342-context-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const first='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>first+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}const current=read(paths.at(-1));fs.mkdirSync(dirname(join(root,ENGINE)),{recursive:true});fs.writeFileSync(join(root,ENGINE),current);assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);
 const known=knownExactSourceCompilerEngineEpoch({root,before:read(first+'engine.before.txt'),current});assert.ok(known);assert.equal(known.after,current);assert.equal(known.nativeBindingQualified,false);
});
