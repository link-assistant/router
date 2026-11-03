// Independent source-only cases. No verification has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {captureProtectedNativeTemporaryPrefix as capture} from '../protected-native-temporary-prefix-20261103.mjs';
import {withProtectedNativeAsyncWriter} from '../protected-reviewed-adoption-20261102.mjs';
import {proposeProtectedNativeTemporaryPrefixSources} from '../protected-native-temporary-prefix-20261103-profile.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),limits={timeout:60000,concurrency:false};
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'native-prefix-source-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(join(root,'out'));fs.mkdirSync(join(root,'translation'));fs.writeFileSync(join(root,'owned.txt'),'owned');fs.writeFileSync(join(root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['owned.txt'],unmanaged:[]}));return root;}
test('actual native naming creates only a disjoint peer and expires every observation',limits,t=>{
 const root=fixture(t),prefix=join(root,'out','complete-'),observer=capture({root,protectedNames:['owned.txt','out/other-missing/deep'],prefix});const created=fs.mkdtempSync(prefix);observer.close(created);assert.ok(basename(created).startsWith('complete-'));assert.equal(fs.readFileSync(join(root,'owned.txt'),'utf8'),'owned');assert.throws(()=>observer.close(),/expired/u);
});
test('protected missing candidates and missing ancestors refuse before any native entry exists',limits,t=>{
 const root=fixture(t),before=fs.readdirSync(join(root,'out'));for(const name of ['complete-ABCDEF','complete-abcdefghijk/deep','COMPLETE-abcdef','complete-abcdef.'])assert.throws(()=>capture({root,protectedNames:['out/'+name],prefix:join(root,'out','complete-')}),/protected missing/u);assert.deepEqual(fs.readdirSync(join(root,'out')),before);
});
test('dangling native symlink and protected directory aliases are inspected before creation',limits,t=>{
 const root=fixture(t);fs.symlinkSync(join(root,'out','complete-abcdef','deep'),join(root,'dangling'));assert.throws(()=>capture({root,protectedNames:['dangling'],prefix:join(root,'out','complete-')}),/protected missing/u);fs.symlinkSync(join(root,'out'),join(root,'directory-alias'));assert.throws(()=>capture({root,protectedNames:['directory-alias'],prefix:join(root,'out','complete-')}),/protected directory/u);assert.deepEqual(fs.readdirSync(join(root,'out')),[]);
});
test('source edits and changed negative endpoints are detected on closing, with one-shot expiry',limits,t=>{
 const root=fixture(t),observer=capture({root,protectedNames:['owned.txt','out/missing'],prefix:join(root,'out','complete-')});fs.writeFileSync(join(root,'owned.txt'),'changed');fs.mkdirSync(join(root,'out','missing'));assert.throws(()=>observer.close(),/changed/u);assert.throws(()=>observer.close(),/expired/u);
});
test('bounded source observation refuses ambiguous aliases without invoking caller getters',limits,t=>{
 const root=fixture(t);assert.throws(()=>capture({root,protectedNames:['out/complete-名名名名名名'],prefix:join(root,'out','complete-')}),/ambiguous/u);assert.throws(()=>capture({root,protectedNames:['owned.txt'],prefix:join(root,'out','complete-'),maximumRetainedBytes:0}),/bound/u);let calls=0;const names=[];Object.defineProperty(names,'0',{get(){calls++;return 'owned.txt';},enumerable:true});assert.throws(()=>capture({root,protectedNames:names,prefix:join(root,'out','complete-')}));assert.equal(calls,0);
});
test('actual general lease retains fixed executable and caller roots without a creation callback',limits,async t=>{
 const root=fixture(t);let expired;await withProtectedNativeAsyncWriter(ROOT,async()=>withProtectedNativeAsyncWriter(root,async lease=>{expired=lease;const created=lease.makeTemporaryDirectory(join(root,'out','complete-'));assert.ok(fs.lstatSync(created).isDirectory());lease.verify();}));assert.throws(()=>expired.makeTemporaryDirectory(join(root,'out','complete-')),/expired/u);
});
test('caught source admission veto remains sticky through all actual owner closes',limits,async t=>{
 const root=fixture(t);fs.writeFileSync(join(root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:['out/complete-abcdef'],unmanaged:[]}));let first;await assert.rejects(withProtectedNativeAsyncWriter(ROOT,async()=>withProtectedNativeAsyncWriter(root,async lease=>{try{lease.makeTemporaryDirectory(join(root,'out','complete-'));}catch(error){first=error;}assert.ok(first);assert.throws(()=>lease.verify(),error=>error===first);})),error=>error===first);assert.deepEqual(fs.readdirSync(join(root,'out')),[]);
});
test('complete source packet retains every original parent and actual Node call site',()=>{
 const proposal=proposeProtectedNativeTemporaryPrefixSources();assert.equal(proposal.files.length,5);assert.equal(proposal.newFiles.length,1);for(const row of [...proposal.files,...proposal.newFiles]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(fs.readFileSync(join(ROOT,row.path),'utf8'),row.after);}const runner=proposal.files.find(row=>row.path==='scripts/run-node-tests.mjs');assert.ok(runner.before.includes('fs.mkdtempSync('));assert.ok(runner.after.includes('scope.makeTemporaryDirectory('));assert.equal(runner.after.includes('outputDirectory=fs.mkdtempSync('),false);
});
