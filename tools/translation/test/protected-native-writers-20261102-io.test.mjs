// Independent actual I/O mutation policy case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {writeNew,writeReceipt,linkNew,unlinkOwned,renameOwned,quarantinePublic,readRow} from '../native-leaf-move-recovery-20261101-io.mjs';
import {withProtectedNativeWriter,verifyProtectedNativeWriter} from '../protected-native-writers-20261102.mjs';
const limits={timeout:60000,concurrency:false};
const supported=['linux','darwin'].includes(process.platform)&&Number.isInteger(fs.constants.O_DIRECTORY)&&Number.isInteger(fs.constants.O_NOFOLLOW);
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-native-writer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(name,source)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),source);};
 const read=name=>fs.readFileSync(join(root,name),'utf8');
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 put('rust/src/original.rs','// independent original\n');put('rust/src/stage.rs','// independent stage\n');put('translation/.keep','');
 return {root,put,read,policy,row:name=>readRow(root,name),exists:name=>fs.existsSync(join(root,name))};
}
for(const category of ['authored','unmanaged'])test(category+' protection blocks direct create receipt link unlink rename and quarantine operations',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t),protect=name=>a.policy(category==='authored'?[name]:[],category==='unmanaged'?[name]:[]);
 protect('rust/src/new.rs');assert.throws(()=>writeNew(a.root,'rust/src/new.rs','// new\n',0o644),/explicit authored\/unmanaged/u);assert.equal(a.exists('rust/src/new.rs'),false);
 protect('translation/new.json');assert.throws(()=>writeReceipt(a.root,'translation/new.json',{independent:true}),/explicit authored\/unmanaged/u);assert.equal(a.exists('translation/new.json'),false);
 let row=a.row('rust/src/original.rs');protect('rust/src/linked.rs');assert.throws(()=>linkNew(a.root,'rust/src/original.rs','rust/src/linked.rs',row.source,row.identity,row.mode),/explicit authored\/unmanaged/u);assert.equal(a.exists('rust/src/linked.rs'),false);
 protect('rust/src/original.rs');assert.throws(()=>unlinkOwned(a.root,'rust/src/original.rs',row.source,row.identity,row.mode),/explicit authored\/unmanaged/u);assert.equal(a.read('rust/src/original.rs'),row.source);
 assert.throws(()=>renameOwned(a.root,'rust/src/original.rs','rust/src/renamed.rs',row.source,row.identity,row.mode),/explicit authored\/unmanaged/u);assert.equal(a.exists('rust/src/renamed.rs'),false);
 assert.throws(()=>quarantinePublic(a.root,'rust/src/original.rs','rust/src/quarantine.rs',row.source,row.identity,row.mode),/explicit authored\/unmanaged/u);assert.equal(a.exists('rust/src/quarantine.rs'),false);
 const stage=a.row('rust/src/stage.rs');assert.throws(()=>renameOwned(a.root,'rust/src/stage.rs','rust/src/original.rs',stage.source,stage.identity,stage.mode,row),/explicit authored\/unmanaged/u);assert.equal(a.read('rust/src/stage.rs'),stage.source);assert.equal(a.read('rust/src/original.rs'),row.source);
 protect('rust/src/quarantine.rs');assert.throws(()=>quarantinePublic(a.root,'rust/src/original.rs','rust/src/quarantine.rs',row.source,row.identity,row.mode),/explicit authored\/unmanaged/u);assert.equal(a.read('rust/src/original.rs'),row.source);
});
test('ordinary direct writes preserve modes and exact source inodes through link rename quarantine and cleanup',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();
 const id=writeNew(a.root,'rust/src/created.rs','// generated\n',0o644),before=a.row('rust/src/created.rs');assert.deepEqual(before.identity,id);
 linkNew(a.root,'rust/src/created.rs','rust/src/link.rs',before.source,id,0o644);assert.deepEqual(a.row('rust/src/link.rs').identity,id);
 renameOwned(a.root,'rust/src/link.rs','rust/src/moved.rs',before.source,id,0o644);assert.deepEqual(a.row('rust/src/moved.rs').identity,id);
 quarantinePublic(a.root,'rust/src/moved.rs','rust/src/quarantine.rs',before.source,id,0o644);assert.deepEqual(a.row('rust/src/quarantine.rs').identity,id);
 unlinkOwned(a.root,'rust/src/quarantine.rs',before.source,id,0o644);assert.equal(a.read('rust/src/created.rs'),before.source);assert.equal(a.exists('rust/src/quarantine.rs'),false);
 const receipt={independent:'same receipt'};writeReceipt(a.root,'translation/receipt.json',receipt);a.policy(['translation/receipt.json']);const inode=a.row('translation/receipt.json').identity;writeReceipt(a.root,'translation/receipt.json',receipt);assert.deepEqual(a.row('translation/receipt.json').identity,inode);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen write failure'))])test('policy closing retains exact thrown value '+String(primary),limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();const write=fs.writeSync,open=fs.openSync;let hit=false,openedFd=null;
 const opening=t.mock.method(fs,'openSync',(name,...rest)=>{const fd=open(name,...rest);if(name===join(a.root,'rust/src/new.rs'))openedFd=fd;return fd;});
 const mock=t.mock.method(fs,'writeSync',(...args)=>{if(!hit){hit=true;a.policy(['rust/src/new.rs']);throw primary;}return write(...args);});
 let caught=false;try{writeNew(a.root,'rust/src/new.rs','// interrupted\n',0o644);}catch(error){caught=true;assert.equal(error,primary);}finally{mock.mock.restore();opening.mock.restore();}
 assert.ok(Number.isInteger(openedFd));assert.throws(()=>fs.fstatSync(openedFd),error=>error.code==='EBADF');
 assert.equal(caught,true);assert.equal(hit,true);assert.equal(a.exists('rust/src/new.rs'),true);
});
test('caught and restored policy failure still revokes nested writers and the next operation rechecks fresh source',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();const original=a.read('translation/source-ownership.json');
 assert.throws(()=>withProtectedNativeWriter(a.root,()=>{a.put('translation/source-ownership.json',original+'\n');assert.throws(()=>verifyProtectedNativeWriter(a.root));a.put('translation/source-ownership.json',original);assert.throws(()=>writeNew(a.root,'rust/src/refused.rs','// refused\n',0o644));}),/policy/u);
 assert.equal(a.exists('rust/src/refused.rs'),false);writeNew(a.root,'rust/src/fresh.rs','// fresh\n',0o644);assert.equal(a.read('rust/src/fresh.rs'),'// fresh\n');
});
test('direct durable I/O cannot remove its own ownership policy or bypass policy with malformed DATA',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();const row=a.row('translation/source-ownership.json');
 assert.throws(()=>unlinkOwned(a.root,'translation/source-ownership.json',row.source,row.identity,row.mode),/source or policy retained/u);assert.equal(a.read('translation/source-ownership.json'),row.source);
 a.put('translation/source-ownership.json','{"schema":"other","authored":[],"unmanaged":[]}');assert.throws(()=>writeNew(a.root,'rust/src/malformed.rs','// forbidden\n',0o644));assert.equal(a.exists('rust/src/malformed.rs'),false);
});

test('same-policy quarantine retains and restores an unexpected regular inode without inventing source permission',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.policy();const row=a.row('rust/src/original.rs'),rename=fs.renameSync;let raced=false;
 const mock=t.mock.method(fs,'renameSync',(from,to,...rest)=>{if(!raced&&from===join(a.root,'rust/src/original.rs')){raced=true;a.put('rust/src/original.rs','// independent captured replacement\n');}return rename(from,to,...rest);});
 try{assert.throws(()=>quarantinePublic(a.root,'rust/src/original.rs','rust/src/quarantine.rs',row.source,row.identity,row.mode),/unexpected public replacement/u);}finally{mock.mock.restore();}
 assert.equal(raced,true);assert.equal(a.read('rust/src/original.rs'),'// independent captured replacement\n');assert.equal(a.read('rust/src/quarantine.rs'),'// independent captured replacement\n');assert.deepEqual(a.row('rust/src/original.rs').identity,a.row('rust/src/quarantine.rs').identity);
});

test('identical bytes and mode cannot hide replacement of a protected destination inode',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t);a.put('rust/src/stage.rs',a.read('rust/src/original.rs'));a.policy(['rust/src/original.rs']);const source=a.row('rust/src/stage.rs'),target=a.row('rust/src/original.rs');
 assert.notEqual(source.identity.ino,target.identity.ino);assert.throws(()=>renameOwned(a.root,'rust/src/stage.rs','rust/src/original.rs',source.source,source.identity,source.mode,target),/explicit authored\/unmanaged/u);assert.deepEqual(a.row('rust/src/original.rs').identity,target.identity);assert.deepEqual(a.row('rust/src/stage.rs').identity,source.identity);
});

test('total nested policy scopes across distinct roots remain bounded and retire after refusal',limits,t=>{
 const roots=Array.from({length:65},()=>fixture(t));let reached=0;
 const enter=index=>withProtectedNativeWriter(roots[index].root,()=>{reached++;if(index+1<roots.length)return enter(index+1);return null;});
 assert.throws(()=>enter(0),/complete protected native writer nesting bound/u);assert.equal(reached,64);assert.equal(withProtectedNativeWriter(roots[0].root,()=>7),7);
});

test('protected same-path and same-inode hard-link renames retain genuine original no-op behavior',limits,t=>{
 if(!supported){t.skip('original durability platform unavailable');return;}const a=fixture(t),name='rust/src/original.rs';fs.linkSync(join(a.root,name),join(a.root,'rust/src/alias.rs'));a.policy([name,'rust/src/alias.rs']);const row=a.row(name),alias=a.row('rust/src/alias.rs');
 renameOwned(a.root,name,name,row.source,row.identity,row.mode,row);assert.deepEqual(a.row(name).identity,row.identity);
 renameOwned(a.root,name,'rust/src/alias.rs',row.source,row.identity,row.mode,alias);assert.deepEqual(a.row(name).identity,row.identity);assert.deepEqual(a.row('rust/src/alias.rs').identity,row.identity);
});
