// Full actual source-index/current-terminal cases, SOURCE ONLY and UNRUN.
import test from 'node:test';
import {proposeExactRecoverySourceControlSources} from '../exact-source-temporary-recovery-controls-20261103.mjs';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {proposeExactJsonPackagingSourceIndex,withExactJsonPackagingSourceFamilyData} from '../exact-source-json-packaging-families-20261103.mjs';
import {proposeExactJsonPackagingSourceControlSources} from '../exact-source-json-packaging-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {proposeBorrowedJsonToolPredicateSourceSuccessors} from '../borrowed-json-tool-predicate-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-json-packaging-families-20261103/',INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',ENGINE='tools/translation/exact-source-successors-20261103.mjs',read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('all packaging/project/strict-TS families reproduce the complete308 index and preserve original292',{timeout:60000},()=>{
 const proposal=proposeExactJsonPackagingSourceIndex(),previous=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index292.before.json.gz'))));assert.equal(proposal.indexText,gunzipSync(fs.readFileSync(join(ROOT,'tools/translation/source-profiles/exact-source-temporary-recovery-families-20261103/index308.before.json.gz'))).toString('utf8'));assert.equal(proposal.index.rows.length,308);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,234);assert.deepEqual(proposal.index.rows.slice(0,292),previous.rows);assert.equal(proposal.images.length,32);for(const image of proposal.images)assert.equal(read(image.path),image.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.sourceInstalled,false);
});
test('all sixteen complete old/new parents reach actual physical terminals through the original graph',{timeout:60000},()=>{
 withExactJsonPackagingSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.currentIsTerminal,true);assert.equal(known.inverse,row.before);assert.equal(known.semanticAuthority,false);for(const stage of known.stages)assert.equal(stage.history.inverse,stage.before);}}));
});
test('the original proposal still joins both actual current packaging parents without issuing a caller permit',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolPredicateSourceSuccessors();assert.equal(proposal.files.length,2);for(const row of proposal.files){assert.equal(row.currentAfter,read(row.path));assert.equal(row.laterHistories[0].before,row.after);assert.equal(row.laterHistories[0].after,row.currentAfter);assert.equal(row.laterHistories[0].inverse,row.after);}assert.equal(proposal.privateCallerQualified,false);assert.equal(proposal.allChecks,'UNRUN');
});
test('the new independent controls retain all complete sources, CST phases and a separate engine epoch',{timeout:60000},()=>{
 const controls=proposeExactJsonPackagingSourceControlSources();assert.equal(controls.files.length,3);for(const row of controls.files){const current=read(row.path),later=proposeExactRecoverySourceControlSources().files.find(later=>later.path===row.path&&later.before===row.after);assert.equal(current,later?later.after:row.after);assert.equal(row.inverse,row.before);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}const current=read(ENGINE),before=read('tools/translation/source-profiles/exact-source-temporary-families-20261103/engine.after.txt'),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});assert.equal(known.after,current);assert.equal(known.laterHistories.length,2);assert.equal(known.nativeBindingQualified,false);
});
test('a copied original292 root does not require the newer JSON packaging companion',{timeout:60000},t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'original292-source-domain-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const original='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>original+name).concat(['tools/translation/source-profiles/exact-source-current-families-20261103/engine.after.txt','tools/translation/source-profiles/exact-source-temporary-families-20261103/engine.after.txt']);for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}const current=read(paths.at(-1));fs.mkdirSync(dirname(join(root,ENGINE)),{recursive:true});fs.writeFileSync(join(root,ENGINE),current);assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);const result=knownExactSourceCompilerEngineEpoch({root,before:read(original+'engine.before.txt'),current});assert.ok(result);assert.equal(result.after,current);
});
