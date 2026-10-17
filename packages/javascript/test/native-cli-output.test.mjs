import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNativeArguments,runNativeCli} from '../native/cli.mjs';
import {tokenTable} from '../native/cli-output.mjs';

test('global flags precede or follow commands and client arguments after delimiter are preserved',()=> {
  const before=parseNativeArguments(['--data-dir','state','--verbose','tokens','list','--json']);assert.equal(before.name,'tokens.list');assert.deepEqual(before.options,{data_dir:'state',verbose:true});assert.equal(before.global.json,true);
  assert.deepEqual(parseNativeArguments(['--config=file.json','version']).global,{configPath:'file.json'});
  const client=parseNativeArguments(['with','codex','--','--json','--config','vendor.toml']);assert.deepEqual(client.options.client_args,['--json','--config','vendor.toml']);assert.equal(client.global.json,undefined);
  assert.throws(()=>parseNativeArguments(['--token-secret','private','version']),/secret/);
});
test('human output and errors are separate streams while --json retains one complete machine result',async()=> {
  let stdout='',stderr='';const io={stdout:{write:text=>stdout+=text},stderr:{write:text=>stderr+=text},env:{}};
  assert.equal(await runNativeCli(['version'],io),0);assert.match(stdout,/^router \S+ \(unknown\)\n$/);assert.equal(stderr,'');
  stdout='';assert.equal(await runNativeCli(['imaginary'],io),2);assert.equal(stdout,'');assert.match(stderr,/Unknown native command/);
  stdout='';stderr='';assert.equal(await runNativeCli(['imaginary','--json'],io),2);assert.equal(JSON.parse(stdout).success,false);assert.equal(stderr,'');
});
test('local and remote token tables use the Rust field order, defaults and limit rendering',()=> {
  const table=tokenTable([{id:'one',issued_at:12,expires_at:34,revoked:false,used_requests:2,max_requests:5,used_tokens:7,reserved_tokens:8,rate_limit_per_minute:9,scope:'admin',label:'fixture'}]);
  const [header,row]=table.split('\n');assert.match(header,/^id\s+issued_at\s+expires_at\s+revoked\s+requests\s+tokens\s+reserved\s+rpm\s+scope\s+label$/);assert.match(row,/one\s+12\s+34\s+false\s+2\/5\s+7\/-\s+8\s+9\s+admin\s+fixture$/);
});
