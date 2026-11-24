import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,symlink,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Checker} from '../extensions/core.mjs';
import {EFFECT_DATA,EFFECT_CONTRACTS,effectContract} from '../extensions/effects-contracts.mjs';
import * as effects from '../extensions/effects-runtime.mjs';
async function temporary(t) {const path=await mkdtemp(join(tmpdir(),'router-translator-effects-'));t.after(()=>rm(path,{recursive:true,force:true}));return path;}
const io = code => Object.assign(new Error(`independent ${code} failure`),{code});
test('effect layouts resolve through the copied semantic checker and every contract names an actual adapter',()=>{
  const checker=new Checker('Rust',[]),program=checker.program({language:'Rust',items:structuredClone(EFFECT_DATA)});
  assert.equal(program.declarations.get('std.io.Error').ctors[0].fields[2].type.name,'RouterOption_3_i32');
  assert.equal(program.declarations.get(checker.resolveType(effectContract('std::fs::read_to_string').ret,[],{start:0,end:0}).name).ctors[1].fields[0].type.name,'std.io.Error');
  assert.equal(program.declarations.get('std.env.VarError').ctors[1].fields[0].type.name,'std.ffi.OsString');
  assert.equal(EFFECT_CONTRACTS.length,11);
  for (const contract of EFFECT_CONTRACTS) {assert.equal(typeof effects[contract.jsExport],'function');assert.equal(effectContract(contract.rustPath),contract);assert.ok(Object.isFrozen(contract));checker.resolveType(contract.ret,[],{start:0,end:0});}
  assert.equal(effectContract('unimplemented::operation'),undefined);
});
test('synchronous filesystem effects round trip exact Unicode bytes, truncate writes and preserve a leading BOM',async t=>{
  const root=await temporary(t),directory=join(root,'a','b'),path=join(directory,'file.txt');
  assert.deepEqual(effects.std_fs_create_dir_all(directory),{$:'Ok',field0:null});
  assert.deepEqual(effects.std_fs_write(path,'\ufeffΩ 🦀\n'),{$:'Ok',field0:null});
  assert.deepEqual(await readFile(path),Buffer.from([0xef,0xbb,0xbf,0xce,0xa9,0x20,0xf0,0x9f,0xa6,0x80,0x0a]));
  assert.equal(effects.std_fs_read_to_string(path).field0,'\ufeffΩ 🦀\n');
  assert.deepEqual(effects.std_fs_write(path,'x'),{$:'Ok',field0:null});assert.equal((await stat(path)).size,1);
  assert.deepEqual(effects.std_fs_remove_file(path),{$:'Ok',field0:null});
  const absent=effects.std_fs_read_to_string(path);assert.equal(absent.$,'Err');assert.equal(absent.field0.kind,'NotFound');assert.ok(Object.isFrozen(absent.field0));
  assert.deepEqual(effects.std_fs_create_dir_all(''),{$:'Ok',field0:null});
});
test('async effects return awaited immutable Result values and remove a symlink without touching its target',async t=>{
  const root=await temporary(t),directory=join(root,'dir'),target=join(directory,'target'),link=join(root,'link');
  assert.deepEqual(await effects.tokio_fs_create_dir_all(directory),{$:'Ok',field0:null});
  assert.deepEqual(await effects.tokio_fs_write(target,'retained'),{$:'Ok',field0:null});
  await symlink(target,link);assert.equal((await effects.tokio_fs_read_to_string(link)).field0,'retained');
  assert.deepEqual(await effects.tokio_fs_remove_file(link),{$:'Ok',field0:null});assert.equal(await readFile(target,'utf8'),'retained');
  assert.equal((await effects.tokio_fs_remove_file(link)).field0.kind,'NotFound');
});
test('invalid UTF-8 and NUL paths return Rust operation errors, while invalid value domains abort',async t=>{
  const root=await temporary(t),path=join(root,'bad');await writeFile(path,Buffer.from([0xf0,0x80,0x80,0x80]));
  for (const read of [effects.std_fs_read_to_string,effects.tokio_fs_read_to_string]) {const result=await read(path);assert.equal(result.$,'Err');assert.equal(result.field0.kind,'InvalidData');assert.deepEqual(result.field0.raw_os_error,{$:'None'});}
  assert.equal(effects.std_fs_remove_file('a\0b').field0.kind,'InvalidInput');assert.equal((await effects.tokio_fs_write('a\0b','x')).field0.kind,'InvalidInput');
  assert.throws(()=>effects.std_fs_write(path,'\ud800'),TypeError);assert.throws(()=>effects.std_fs_read_to_string(7),TypeError);
});
test('OS error kinds remain Results, interrupted reads retry, and adapter defects cannot become success',async()=>{
  let reads=0;
  const capability={fs:{sync:{readFileSync:()=>{if (++reads === 1) throw io('EINTR');return Buffer.from('after-retry');},unlinkSync:()=>{throw io('EINTR');}},async:{readFile:async()=>{throw io('EACCES');}}}};
  assert.equal(effects.std_fs_read_to_string('fixture',capability).field0,'after-retry');assert.equal(reads,2);
  assert.equal(effects.std_fs_remove_file('fixture',capability).field0.kind,'Interrupted');
  const denied=await effects.tokio_fs_read_to_string('fixture',capability);assert.equal(denied.$,'Err');assert.equal(denied.field0.kind,'PermissionDenied');
  assert.throws(()=>effects.std_fs_read_to_string('fixture',{fs:{sync:{readFileSync:()=>{throw new TypeError('adapter defect');}}}}),/adapter defect/);
  assert.throws(()=>effects.std_fs_read_to_string('fixture',{fs:{sync:{readFileSync:()=> 'silently decoded'}}}),/must return bytes/);
  assert.throws(()=>effects.std_fs_write('fixture','x',{fs:{sync:{writeFileSync:()=>Promise.resolve()}}}),/returned a future/);
  await assert.rejects(effects.tokio_fs_read_to_string('fixture',{fs:{async:{}}}),/has no async/);
});
test('environment effects distinguish absence, empty strings and original non-Unicode bytes',()=>{
  const environment=new Map([['EMPTY',''],['UNICODE','Ω'],['BYTES',Buffer.from([0xff,0x00,0xfe])]]),capability={environment};
  assert.deepEqual(effects.std_env_var('EMPTY',capability),{$:'Ok',field0:''});assert.deepEqual(effects.std_env_var('UNICODE',capability),{$:'Ok',field0:'Ω'});
  assert.deepEqual(effects.std_env_var('MISSING',capability),{$:'Err',field0:{$:'NotPresent'}});
  assert.deepEqual(effects.std_env_var('A=B',capability),{$:'Err',field0:{$:'NotPresent'}});assert.equal(effects.std_env_var('A\0B',capability).field0.$,'NotPresent');
  assert.deepEqual(effects.std_env_var('BYTES',capability),{$:'Err',field0:{$:'NotUnicode',field0:{$:'OsString',bytes:[255n,0n,254n]}}});
  assert.equal(effects.std_env_set_var('NEW','owned',capability),null);assert.equal(environment.get('NEW'),'owned');assert.equal(effects.std_env_remove_var('NEW',capability),null);assert.equal(environment.has('NEW'),false);
  for (const key of ['','A=B','A\0B']) assert.throws(()=>effects.std_env_set_var(key,'x',capability),RangeError);
  assert.throws(()=>effects.std_env_set_var('KEY','bad\0value',capability),RangeError);
});
test('scoped capabilities survive awaits and concurrent translation invocations without global environment mutation',async()=>{
  const name='ROUTER_TRANSLATOR_EFFECT_FIXTURE',before=process.env[name];
  const run=value=>effects.withEffectCapabilities({environment:new Map(),fs:{async:{readFile:async()=>{await new Promise(resolve=>setTimeout(resolve,2));return Buffer.from(value);}}}},async()=>{
    effects.std_env_set_var(name,value);await new Promise(resolve=>setTimeout(resolve,2));
    assert.equal(effects.std_env_var(name).field0,value);assert.equal((await effects.tokio_fs_read_to_string('injected')).field0,value);
  });
  await Promise.all([run('one'),run('two')]);assert.equal(process.env[name],before);
});
