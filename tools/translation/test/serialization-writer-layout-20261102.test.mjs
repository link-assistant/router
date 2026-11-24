// Independent operational cases SOURCE. All execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {withSerializationWriterSync as sync,withSerializationWriterAsync as asyncWriter} from '../serialization-writer-layout-20261102.mjs';
import {produceNativeAffinityDescriptor} from '../serialization-schema/native-descriptor.mjs';
import {produceBulkSerialization} from '../serialization-schema/bulk.mjs';
const options={timeout:30000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-schema-writer-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,body)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),body);};
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 return {root,put,policy};
}
test('actual producers capture malformed policy before source generation or native import',options,async t=>{
 const f=fixture(t);f.put('translation/source-ownership.json','{"schema":"foreign"}');
 assert.throws(()=>produceBulkSerialization({root:f.root,write:true}),/explicit source ownership policy/u);
 await assert.rejects(produceNativeAffinityDescriptor({root:f.root,write:true,applyImport:true}),/explicit source ownership policy/u);
 assert.equal(fs.existsSync(join(f.root,'js')),false);
});
test('all public destinations preflight before earlier artifact replacement',options,t=>{
 const f=fixture(t),first=join(f.root,'js/src/first.mjs'),last=join(f.root,'ts/src/last.ts');
 f.put('js/src/first.mjs','original');f.policy([],['ts/src/last.ts']);
 assert.throws(()=>sync(f.root,true,writer=>{writer.preflight([first,last]);writer.writeArtifact(first,'changed','.schema-tmp-');}),/authored\/unmanaged/u);
 assert.equal(fs.readFileSync(first,'utf8'),'original');assert.equal(fs.existsSync(last),false);
});
test('wx stage and rename retain original output bytes creation mode and temporary naming',options,t=>{
 const f=fixture(t);f.policy();const target=join(f.root,'js/src/output.mjs'),control=join(f.root,'control');
 const previous=process.umask(0o077);try{
  fs.writeFileSync(control,'control');
  sync(f.root,true,writer=>writer.writeArtifact(target,'export const value=1;\n','.schema-tmp-'));
  assert.equal(fs.readFileSync(target,'utf8'),'export const value=1;\n');
  assert.equal(fs.statSync(target).mode&0o777,fs.statSync(control).mode&0o777);
  assert.equal(fs.existsSync(target+'.schema-tmp-'+process.pid),false);
 }finally{process.umask(previous);}
});
test('caught inner denial poisons the original same-root async operation across awaits',options,async t=>{
 const f=fixture(t);f.policy(['js/src/protected.mjs']);let denied;
 await assert.rejects(asyncWriter(f.root,true,async writer=>{
  await Promise.resolve();try{sync(f.root,true,inner=>inner.preflight([join(f.root,'js/src/protected.mjs')]));}catch(error){denied=error;}
  await Promise.resolve();writer.writeArtifact(join(f.root,'js/src/later.mjs'),'forbidden','.serialization-tmp-');
 }),error=>error===denied);
 assert.equal(fs.existsSync(join(f.root,'js/src/later.mjs')),false);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('frozen primary'))]){
 test('closing policy failure preserves exact primary '+String(primary),options,async t=>{
  const f=fixture(t);f.policy();let caught=false;
  try{await asyncWriter(f.root,true,async()=>{f.policy(['js/src/now-protected.mjs']);throw primary;});}
  catch(error){caught=true;assert.equal(error,primary);}assert.equal(caught,true);
 });
}
test('restored policy cannot regain admission and leaked writers expire',options,async t=>{
 const f=fixture(t);f.policy();let leaked;
 await asyncWriter(f.root,true,async writer=>{leaked=writer;await Promise.resolve();writer.verify();});
 assert.throws(()=>leaked.writeArtifact(join(f.root,'js/src/leaked.mjs'),'forbidden','.schema-tmp-'),/expired operation/u);
 const policy=join(f.root,'translation/source-ownership.json'),before=fs.readFileSync(policy);
 await assert.rejects(asyncWriter(f.root,true,async writer=>{f.policy(['js/src/hidden.mjs']);fs.writeFileSync(policy,before);await Promise.resolve();writer.verify();}),/changed|restored|revoked/u);
 assert.equal(fs.existsSync(join(f.root,'js/src/leaked.mjs')),false);
});
test('read-only mode retains original producer callback and does not load mutation policy',options,t=>{
 const f=fixture(t);f.put('translation/source-ownership.json','malformed');
 assert.equal(sync(f.root,false,(writer,root)=>{assert.equal(writer,null);assert.equal(root,f.root);return 17;}),17);
});
test('unknown apply-mode header refuses before native import or artifact mutation',options,async t=>{
 const f=fixture(t);f.policy();
 const packet=JSON.parse(gunzipSync(fs.readFileSync(new URL('../source-profiles/serialization-writer-layout-20261102/complete-source.json.gz',import.meta.url)),{maxOutputLength:2097152}).toString('utf8'));
 const changed='// unreviewed native header\n'+packet.nativeImportEquation.after;
 f.put('js/src/affinity-schema.mjs',changed);
 await assert.rejects(produceNativeAffinityDescriptor({root:f.root,write:true,applyImport:true}),/exact reviewed original or already imported source/u);
 assert.equal(fs.readFileSync(join(f.root,'js/src/affinity-schema.mjs'),'utf8'),changed);
 assert.equal(fs.existsSync(join(f.root,'tools')),false);
});
