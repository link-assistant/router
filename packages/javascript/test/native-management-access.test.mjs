import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ManagementAccess,normalizeManagementPeer } from '../native/management-access.mjs';
import { normalizeConfig } from '../native/config.mjs';
import { decodeLino } from '../native/storage.mjs';
test('mapped socket addresses normalize and default recovery exempts loopback',async () => {
  assert.equal(normalizeManagementPeer('::ffff:127.0.0.1'),'127.0.0.1');
  assert.equal(normalizeManagementPeer('2001:0DB8:0:0:0:0:0:1'),'2001:db8::1');
  assert.throws(() => normalizeManagementPeer('unknown'),error => error.status === 403);
  const access = new ManagementAccess({persistent:false});
  for (let index = 0; index < 10; index++) assert.equal(await access.failure('127.0.0.2'),null);
  assert.equal(access.check('127.0.0.2'),null);
});
test('successful authentication clears failures, preserves active bans, and wall-clock changes cannot shorten lockout',async () => {
  let wall = 1000, monotonic = 0;
  const access = new ManagementAccess({persistent:false,clock:() => wall,monotonic:() => monotonic,config:{lockout_failures:2,lockout_secs:10}});
  assert.equal(await access.failure('192.0.2.1'),null); access.success('192.0.2.1');
  assert.equal(await access.failure('192.0.2.1'),null);
  assert.deepEqual(await access.failure('192.0.2.1'),{client_ip:'192.0.2.1',expires_at:1010});
  wall = 50000; access.success('192.0.2.1'); assert.equal(access.check('192.0.2.1'),10);
  monotonic = 9.1; assert.equal(access.check('192.0.2.1'),1);
  monotonic = 10; assert.equal(access.check('192.0.2.1'),null);
});
test('bounded peer tracking backs off new clients until expired failures are pruned',async () => {
  let now = 0;
  const access = new ManagementAccess({persistent:false,maxClients:2,monotonic:() => now,config:{lockout_failures:3,lockout_secs:10}});
  await access.failure('192.0.2.1'); await access.failure('192.0.2.2');
  assert.equal(access.check('192.0.2.3'),1); assert.equal(await access.failure('192.0.2.3'),null);
  now = 10; assert.equal(access.check('192.0.2.3'),null); assert.equal(access.attempts.size,0);
});
test('lockout file carries Rust diagnostic shape and is never reloaded as ban authority',async t => {
  const home = await mkdtemp(join(tmpdir(),'router-native-lockout-')); t.after(() => rm(home,{recursive:true,force:true}));
  const options = {dataDir:home,config:{lockout_failures:1,lockout_secs:10},clock:() => 100,monotonic:() => 0};
  const access = new ManagementAccess(options); await access.failure('192.0.2.1');
  assert.deepEqual(JSON.parse(JSON.stringify(decodeLino(await readFile(join(home,'management-lockouts.lenv'),'utf8')))),[{client_ip:'192.0.2.1',expires_at:110}]);
  assert.equal(new ManagementAccess(options).check('192.0.2.1'),null);
});
test('management configuration rejects invalid switches and retains deliberate disable controls',() => {
  assert.throws(() => normalizeConfig({}, {MANAGEMENT_ALLOW_REMOTE:'maybe'}),error => error.code === 'invalid_config');
  assert.throws(() => normalizeConfig({}, {MANAGEMENT_LOCKOUT_FAILURES:'-1'}),error => error.code === 'invalid_config');
  assert.deepEqual(normalizeConfig({}, {MANAGEMENT_ALLOW_REMOTE:'yes',MANAGEMENT_LOCKOUT_FAILURES:'0',MANAGEMENT_LOCKOUT_SECS:'0',MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK:'off'}).management,
    {allow_remote:true,exempt_loopback:false,lockout_failures:0,lockout_secs:0});
});
