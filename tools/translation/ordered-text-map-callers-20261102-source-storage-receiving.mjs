// Dedicated receiving SOURCE: actual complete native/canonical callers retained.
// Not a coverage/catalogue row and not imported by production qualification.
import './test/ordered-text-map-callers-20261102-canonical-cases.mjs';
import './test/ordered-text-map-callers-20261102-unit-cases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync,renameSync,writeFileSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {openReadonlySourceProfiles,closeReadonlySourceProfiles,withReadonlySourceProfiles,readReadonlySourceProfileBytes,readSourceProfileFileSync,captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {compactSparseGit,compactSparsePhysicalCensus} from './compact-sparse-git-io-20261102.mjs';
import {readonlySourceProfileConsumerSourceData} from './ordered-text-map-callers-20261102-source-storage-profile.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),receiptPath=join(root,'ordered-text-map-callers-20261102-source-storage-package.json');
const profile='tools/translation/source-profiles/ordered-text-map-callers-20261102-source-storage/ordered-text-map-callers-20261102-source-storage-source-history.json.gz';
test('complete receiving source profile is actual committed cold DATA; code and native inputs stay physical',{timeout:60000},()=>{
 const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));assert.equal(receipt.schema,'readonly-full-compiler-source-package-20261103-v1');assert.equal(receipt.localPackageCommitAuthority,false);assert.equal(receipt.sourceAuthority,false);assert.equal(receipt.semanticAuthority,false);assert.equal(receipt.compilerExecuted,false);assert.equal(receipt.requiresFreshProcess,true);assert.equal(receipt.allLogicalSourcesRetained,true);assert.equal(receipt.allVaultPathsPhysicallyHot,false);
 assert.equal(compactSparseGit(root,['rev-parse','--verify','HEAD'],{maxBytes:1024}).trim(),receipt.localPackageSourceCommit);assert.equal(compactSparseGit(root,['rev-parse','HEAD^{tree}'],{maxBytes:1024}).trim(),receipt.localPackageSourceTree);
 assert.equal(compactSparseGit(root,['ls-files','-v','--',profile],{maxBytes:8192}),'S '+profile+'\n');assert.throws(()=>lstatSync(join(root,profile)),{code:'ENOENT'});assert.ok(lstatSync(join(root,'tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json')).isFile());
 for(const path of ['rust/src/lib.rs','rust/src/openai.rs','rust/src/translation_ordered_text_map_core.rs','rust/tests/borrowed_standard_map_20261102_test.rs','rust/tests/ordered-text-map-callers-20261102_test.rs','tools/translation/extensions/host-contracts.mjs','tools/translation/exact-source-successors-20261103.mjs'])assert.ok(lstatSync(join(root,path)).isFile(),path);
 const rows=readonlySourceProfileConsumerSourceData();assert.equal(rows.length,13);for(const row of rows)assert.equal(readFileSync(join(root,row.path),'utf8'),row.after);assert.ok(compactSparsePhysicalCensus(receipt.container,{maximum:402653184}).total<=402653184);
});
test('byte adapter preserves binary/text behavior and original read bounds; private receipts do not serialize',{timeout:60000},()=>{
 const bytes=readSourceProfileFileSync(join(root,profile));assert.ok(Buffer.isBuffer(bytes));assert.deepEqual(readSourceProfileFileSync(new URL('./source-profiles/ordered-text-map-callers-20261102-source-storage/ordered-text-map-callers-20261102-source-storage-source-history.json.gz',import.meta.url)),bytes);
 withReadonlySourceProfiles(root,token=>{assert.deepEqual(readReadonlySourceProfileBytes(token,profile),bytes);assert.throws(()=>readReadonlySourceProfileBytes(JSON.parse(JSON.stringify(token)),profile));});assert.throws(()=>withReadonlySourceProfiles(root,token=>readReadonlySourceProfileBytes(token,profile,{maximum:0})));
});
test('source operation expiry and caught failure remain sticky; exact falsy primary survives all closers',{timeout:60000},()=>{
 let expired;withReadonlySourceProfiles(root,token=>{expired=token;readReadonlySourceProfileBytes(token,profile);});assert.throws(()=>readReadonlySourceProfileBytes(expired,profile));
 const token=openReadonlySourceProfiles(root);let primary,observed=false;try{readReadonlySourceProfileBytes(token,profile,{maximum:0});}catch(error){primary=error;observed=true;}assert.equal(observed,true);try{readReadonlySourceProfileBytes(token,profile);}catch(error){assert.equal(error,primary);}assert.throws(()=>closeReadonlySourceProfiles(token),error=>error===primary);
 for(const primary of [null,undefined,false,0,'']){let caught=false,closed=0;try{withReadonlySourceProfiles(root,()=>withCompleteSourceClosingFence(()=>{throw primary;},[()=>{closed++;},()=>{closed++;throw Object.freeze({closing:true});} ]));}catch(error){caught=true;assert.equal(error,primary);}assert.equal(caught,true);assert.equal(closed,2);}
});
test('retained compressed source refuses same-byte replacement and restored original descriptor identity',{timeout:60000},()=>{
 // Receiving root is test-owned. These are separate complete storage epochs;
 // no original checkout or compiler-global type/body verdict is reused.
 const handle=captureReadonlySourceProfile(join(root,profile)),path=join(root,'.readonly-source-profiles-20261103','descriptor.json'),backup=path+'.case-original',raw=readFileSync(path);assert.ok(handle);renameSync(path,backup);let caught=false;try{writeFileSync(path,raw,{flag:'wx',mode:0o600});assert.throws(()=>handle.requireCurrent());}finally{try{unlinkSync(path);}finally{renameSync(backup,path);}}
 try{handle.requireCurrent();}catch{caught=true;}assert.equal(caught,true);assert.throws(()=>handle.requireCurrent());
});
