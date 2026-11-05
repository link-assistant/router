// Independent actual sink policy case SOURCE. All Node/native/CST execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
import {writeNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
import {writeMixedNativeSubstitutionCopy} from '../prepare-mixed-native-substitution-copy.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-preparer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);};
 const read=path=>fs.readFileSync(join(root,path),'utf8'),raw=path=>fs.readFileSync(join(root,path));
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 put('js/src/first.mjs','// original first\n');put('ts/src/second.ts','// original second\n');put('rust/src/value.rs','// original Rust source\n');
 const row=(path,after)=>({path,current:read(path),after});
 return {root,put,read,raw,policy,row};
}
for(const [name,write]of [['native',writeNativeSubstitutionCopy],['mixed',writeMixedNativeSubstitutionCopy]]){
 test(name+' sink preflights protected later rows before any earlier source write',limits,t=>{const a=fixture(t),before=a.read('js/src/first.mjs'),plan={files:[a.row('js/src/first.mjs','// changed first\n'),a.row('ts/src/second.ts','// changed second\n')]};a.policy([],['ts/src/second.ts']);assert.throws(()=>write(plan,{root:a.root,force:true,ignoreOwnership:true}),/authored\/unmanaged/u);assert.equal(a.read('js/src/first.mjs'),before);assert.equal(a.read('ts/src/second.ts'),'// original second\n');});
 test(name+' sink retains stale checks modes currentAfter and exact original Buffer/TypedArray writing',limits,t=>{const a=fixture(t);a.policy();fs.chmodSync(join(a.root,'js/src/first.mjs'),0o600);const beforeMode=fs.statSync(join(a.root,'js/src/first.mjs')).mode&0o777;const plan={files:[{...a.row('js/src/first.mjs','unused'),currentAfter:'// selected currentAfter\n'},{...a.row('ts/src/second.ts','unused'),currentAfter:Buffer.from([0,255,128,42])}]};write(plan,{root:a.root});assert.equal(a.read('js/src/first.mjs'),'// selected currentAfter\n');assert.equal(fs.statSync(join(a.root,'js/src/first.mjs')).mode&0o777,beforeMode);assert.deepEqual(a.raw('ts/src/second.ts'),Buffer.from([0,255,128,42]));const row=a.row('js/src/first.mjs',new Uint8Array([7,8,9]));write({files:[row]},{root:a.root});assert.deepEqual(a.raw('js/src/first.mjs'),Buffer.from([7,8,9]));a.put('js/src/first.mjs','// changed later\n');assert.throws(()=>write({files:[row]},{root:a.root}),/stale copy proposal/u);assert.equal(a.read('js/src/first.mjs'),'// changed later\n');});
 test(name+' sink cannot hide protected truncation behind equal final bytes or alternate path spelling',limits,t=>{const a=fixture(t),path='js/src/first.mjs',row=a.row(path,a.read(path));a.policy([path]);assert.throws(()=>write({files:[row]},{root:a.root}),/authored\/unmanaged/u);assert.equal(a.read(path),row.current);assert.throws(()=>write({files:[{...row,path:'js/src/../src/first.mjs'}]},{root:a.root}),/authored\/unmanaged/u);assert.equal(a.read(path),row.current);});
 test(name+' sink keeps new-file creation mode and protected missing destinations',limits,t=>{const a=fixture(t),path='js/src/new.mjs',row={path,originalPath:'js/src/first.mjs',current:null,after:'// new\n'};a.policy([path]);assert.throws(()=>write({files:[row]},{root:a.root}),/authored\/unmanaged/u);assert.equal(fs.existsSync(join(a.root,path)),false);a.policy();const original=process.umask(0o077);try{fs.writeFileSync(join(a.root,'js/src/control.mjs'),row.after);write({files:[row]},{root:a.root});assert.equal(fs.statSync(join(a.root,path)).mode&0o777,fs.statSync(join(a.root,'js/src/control.mjs')).mode&0o777);}finally{process.umask(original);}});
 test(name+' sink captures malformed policy before stale/source callbacks and never grants native authority',limits,t=>{const a=fixture(t);a.put('translation/source-ownership.json','{"schema":"other","authored":[],"unmanaged":[]}');assert.throws(()=>write({sourceAuthority:true,semanticAuthority:true,files:[{path:'js/src/first.mjs',current:'wrong',after:'// forbidden\n'}]},{root:a.root}),/explicit source ownership policy/u);assert.equal(a.read('js/src/first.mjs'),'// original first\n');});
}
test('mixed Rust output remains a source-byte sink rather than an invented Rust parser/compiler lane',limits,t=>{const a=fixture(t);a.policy(['rust/src/value.rs']);const row=a.row('rust/src/value.rs','pub fn generated()->u8{7}\n');assert.throws(()=>writeMixedNativeSubstitutionCopy({files:[row]},{root:a.root}),/authored\/unmanaged/u);a.policy();writeMixedNativeSubstitutionCopy({files:[row]},{root:a.root});assert.equal(a.read('rust/src/value.rs'),row.after);});
test('policy epoch change after the first real write prevents later source writes and retires the operation',limits,t=>{const a=fixture(t);a.policy();const plan={files:[a.row('js/src/first.mjs','// first after\n'),a.row('ts/src/second.ts','// second after\n')]},original=fs.writeFileSync;let hit=false;const mock=t.mock.method(fs,'writeFileSync',(path,...rest)=>{const result=original(path,...rest);if(!hit&&path===join(a.root,'js/src/first.mjs')){hit=true;a.policy(['ts/src/second.ts']);}return result;});syncBuiltinESMExports();try{assert.throws(()=>writeNativeSubstitutionCopy(plan,{root:a.root}),/policy/u);}finally{mock.mock.restore();syncBuiltinESMExports();}assert.equal(hit,true);assert.equal(a.read('ts/src/second.ts'),'// original second\n');a.policy();writeNativeSubstitutionCopy({files:[a.row('ts/src/second.ts','// fresh after\n')]},{root:a.root});assert.equal(a.read('ts/src/second.ts'),'// fresh after\n');});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent mode failure'))])test('added mode observation preserves original exact FS thrown value '+String(primary),limits,t=>{const a=fixture(t);a.policy();const plan={files:[a.row('js/src/first.mjs','// refused after\n')]},stat=fs.statSync;let hit=false;const mock=t.mock.method(fs,'statSync',(path,...rest)=>{if(path===join(a.root,'js/src/first.mjs')){hit=true;throw primary;}return stat(path,...rest);});let caught=false;try{writeNativeSubstitutionCopy(plan,{root:a.root});}catch(error){caught=true;assert.equal(error,primary);}finally{mock.mock.restore();}assert.equal(caught,true);assert.equal(hit,true);assert.equal(a.read('js/src/first.mjs'),'// original first\n');});

for(const [name,write]of [['native',writeNativeSubstitutionCopy],['mixed',writeMixedNativeSubstitutionCopy]]){
 test(name+' public source rows remain uncapped and preflight every batch before first write',limits,t=>{
  const a=fixture(t),path='js/src/first.mjs',original=a.read(path),rows=Array.from({length:4101},()=>a.row(path,'// would write\n'));rows.push(a.row('ts/src/second.ts','// forbidden late\n'));a.policy(['ts/src/second.ts']);
  assert.throws(()=>write({files:rows},{root:a.root}),/authored\/unmanaged/u);assert.equal(a.read(path),original);
  a.policy();write({files:rows.slice(0,-1)},{root:a.root});assert.equal(a.read(path),'// would write\n');
 });
 test(name+' original iterable duplicate path and unprotected inode alias row order survives',limits,t=>{
  const a=fixture(t);a.policy();fs.linkSync(join(a.root,'js/src/first.mjs'),join(a.root,'js/src/alias.mjs'));const rows=new Set([a.row('js/src/first.mjs','// first\n'),a.row('js/src/alias.mjs','// alias second\n'),a.row('js/src/first.mjs','// final\n')]);
  write({files:rows},{root:a.root});assert.equal(a.read('js/src/first.mjs'),'// final\n');assert.equal(a.read('js/src/alias.mjs'),'// final\n');
 });
 for(const link of ['symlink','hardlink'])test(name+' actual '+link+' sink cannot truncate unlisted alias to protected source',limits,t=>{
  const a=fixture(t);a.policy(['js/src/first.mjs']);if(link==='symlink')fs.symlinkSync('first.mjs',join(a.root,'js/src/alias.mjs'));else fs.linkSync(join(a.root,'js/src/first.mjs'),join(a.root,'js/src/alias.mjs'));const row=a.row('js/src/alias.mjs',a.read('js/src/first.mjs'));
  assert.throws(()=>write({files:[row]},{root:a.root}),/policy alias/u);assert.equal(a.read('js/src/first.mjs'),row.current);
 });
}
