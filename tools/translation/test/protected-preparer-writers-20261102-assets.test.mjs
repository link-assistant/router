// Independent real binary mirror writer cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
import {synchronizeRustAssets} from '../../../scripts/sync-rust-assets.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-rust-assets-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,value)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),value);},raw=path=>fs.readFileSync(join(root,path));
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 const originals=new Map([['LICENSE',Buffer.from('Independent license\n')],['schemas/asset.json',Buffer.from('{"independent":true}\n')],['openapi/router.yaml',Buffer.from('openapi: 3.1.0\n')],['ui/dist/logo.bin',Buffer.from([0,255,254,128,1,42])],['docs/provider-evidence/anthropic-adaptive-thinking.json',Buffer.from('{"evidence":"fixture"}\n')]]);
 for(const [path,bytes]of originals)put(path,bytes);return {root,put,raw,policy,originals,run:check=>synchronizeRustAssets({root,check})};
}
test('actual mirror writer preserves all binary bytes original modes manifest and read-only check behavior',limits,t=>{
 const a=fixture(t);a.policy();const first=a.run(false);assert.equal(first.files,5);assert.equal(first.rustExecuted,false);
 for(const [path,bytes]of a.originals)assert.deepEqual(a.raw('rust/'+path),bytes);
 const manifest=JSON.parse(a.raw('rust/shared-assets.json'));assert.equal(manifest.schema,'rust-shared-assets-v1');assert.equal(manifest.bytes,[...a.originals.values()].reduce((sum,value)=>sum+value.length,0));
 const target='rust/ui/dist/logo.bin';fs.chmodSync(join(a.root,target),0o600);const before=fs.statSync(join(a.root,target));a.policy([...a.originals.keys()].map(path=>'rust/'+path).concat('rust/shared-assets.json'));assert.equal(a.run(false).changed,0);assert.equal(fs.statSync(join(a.root,target)).ino,before.ino);assert.equal(fs.statSync(join(a.root,target)).mode,before.mode);assert.equal(a.run(true).changed,0);
});
test('protected binary targets and metadata manifest remain byte/inode exact without UTF8 normalization',limits,t=>{
 const a=fixture(t);a.run(false);const path='rust/ui/dist/logo.bin',before=a.raw(path),inode=fs.statSync(join(a.root,path)).ino;a.put('ui/dist/logo.bin',Buffer.from([254,0,255,7]));a.policy([],[path]);assert.throws(()=>a.run(false),/authored\/unmanaged/u);assert.deepEqual(a.raw(path),before);assert.equal(fs.statSync(join(a.root,path)).ino,inode);
 a.policy(['rust/shared-assets.json']);const manifest=a.raw('rust/shared-assets.json'),manifestInode=fs.statSync(join(a.root,'rust/shared-assets.json')).ino;assert.throws(()=>a.run(false),/authored\/unmanaged/u);assert.deepEqual(a.raw('rust/shared-assets.json'),manifest);assert.equal(fs.statSync(join(a.root,'rust/shared-assets.json')).ino,manifestInode);
});
test('protected missing targets and parent directories cannot be created by the actual mirror writer',limits,t=>{
 const a=fixture(t);a.policy(['rust/LICENSE']);assert.throws(()=>a.run(false),/authored\/unmanaged/u);assert.equal(fs.existsSync(join(a.root,'rust/LICENSE')),false);
 a.policy(['rust']);assert.throws(()=>a.run(false),/authored\/unmanaged/u);assert.equal(fs.existsSync(join(a.root,'rust')),false);
});
test('source policy is captured before binary producer enumeration and original source-link refusals stay fatal',limits,t=>{
 const a=fixture(t);a.put('translation/source-ownership.json','{"schema":"other","authored":[],"unmanaged":[]}');fs.unlinkSync(join(a.root,'LICENSE'));assert.throws(()=>a.run(false),/explicit source ownership policy/u);assert.equal(fs.existsSync(join(a.root,'rust')),false);
 a.put('LICENSE',a.originals.get('LICENSE'));a.policy();fs.symlinkSync(join(a.root,'LICENSE'),join(a.root,'ui/dist/linked'));assert.throws(()=>a.run(false),/Linked asset source/u);assert.equal(fs.existsSync(join(a.root,'rust')),false);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen asset failure'))])test('actual asset writer preserves exact thrown value '+String(primary),limits,t=>{
 const a=fixture(t);a.policy();const original=fs.writeFileSync;let hit=false;const mock=t.mock.method(fs,'writeFileSync',(path,...rest)=>{if(!hit&&path===join(a.root,'rust/LICENSE')){hit=true;a.policy(['rust/LICENSE']);throw primary;}return original(path,...rest);});syncBuiltinESMExports();let caught=false;
 try{a.run(false);}catch(error){caught=true;assert.equal(error,primary);}finally{mock.mock.restore();syncBuiltinESMExports();}assert.equal(caught,true);assert.equal(hit,true);assert.equal(fs.existsSync(join(a.root,'rust/LICENSE')),false);
});

test('actual binary sink vetoes unlisted hard-link aliases to authored sources and policy-self',limits,t=>{
 const a=fixture(t);a.run(false);const protectedPath='private-authored.bin',original=Buffer.from([0,255,17,128]);a.put(protectedPath,original);a.policy([protectedPath]);fs.unlinkSync(join(a.root,'rust/LICENSE'));fs.linkSync(join(a.root,protectedPath),join(a.root,'rust/LICENSE'));
 assert.throws(()=>a.run(false),/policy alias/u);assert.deepEqual(a.raw(protectedPath),original);
 fs.unlinkSync(join(a.root,'rust/LICENSE'));fs.linkSync(join(a.root,'translation/source-ownership.json'),join(a.root,'rust/LICENSE'));const policy=a.raw('translation/source-ownership.json');assert.throws(()=>a.run(false),/policy alias/u);assert.deepEqual(a.raw('translation/source-ownership.json'),policy);
});
