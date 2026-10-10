import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, writeFile, lstat, readdir, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { executeManagedOperation, acquireManagedReference, normalizeManagedOrigin, selectedManagedServer } from '../native/managed-server.mjs';

const fixtures = [], fixture = (id,operation,run) => fixtures.push({id,operation,run});
const operate = (dir,name,options = {},extra = {}) => executeManagedOperation({name,options,config:{data_dir:dir,providers:[],accounts:[]},env:{},...extra});
const statePath = dir => join(dir,'native-managed','state.json');
const state = async dir => JSON.parse(await readFile(statePath(dir),'utf8'));
async function temporary(run) {
  const dir = await realpath(await mkdtemp(join(tmpdir(),'router-native-managed-')));
  try { await run(dir); }
  finally {await operate(dir,'server.stop').catch(()=>{}); await rm(dir,{recursive:true,force:true});}
}
fixture('managed-start-ready-owned','server.start',()=>temporary(async dir=> {
  const started = await operate(dir,'server.start'), first = await state(dir);
  const status = await operate(dir,'server.status');
  assert.equal(status.managed.state,'running'); assert.ok(started.output[0].includes(status.managed.url));
  assert.equal((await fetch(status.managed.url+'/health')).status,200);
  assert.equal((await fetch(status.managed.url+'/api/management/tokens')).status,401);
  assert.notEqual(first.pid,process.pid); assert.equal(first.engine,'node');
  assert.equal((await lstat(statePath(dir))).mode & 0o777,0o600); assert.equal((await lstat(join(dir,'native-managed'))).mode & 0o777,0o700);
  await operate(dir,'server.start'); assert.equal((await state(dir)).pid,first.pid);
  assert.equal(JSON.stringify(status).includes(first.control_key),false); assert.equal(JSON.stringify(status).includes(first.token_secret),false);
}));
fixture('managed-stop-preserves-volume','server.stop',()=>temporary(async dir=> {
  await operate(dir,'server.start'); const first = await state(dir);
  const files = await readdir(join(dir,'native-managed','data')); assert.ok(files.includes('tokens.lino'));
  await operate(dir,'server.stop'); assert.equal((await operate(dir,'server.status')).managed.state,'stopped');
  assert.equal((await state(dir)).pid,null); assert.deepEqual(await readdir(join(dir,'native-managed','data')),files);
  await assert.rejects(fetch(`http://127.0.0.1:${first.port}/health`));
  await operate(dir,'server.stop'); await operate(dir,'server.start'); assert.notEqual((await state(dir)).boot_id,first.boot_id);
}));
fixture('managed-status-absence-selection','server.status',()=>temporary(async dir=> {
  const report = await operate(dir,'server.status'); assert.equal(report.managed.present,false); assert.equal(report.managed.state,'absent'); assert.equal(report.selection.source,'managed');
  const env = {ROUTER_URL:'https://Environment.Example:443/',LINK_ASSISTANT_ROUTER_TOKEN:'fixture-secret'};
  const selected = await operate(dir,'server.status',{}, {env});
  assert.deepEqual(selected.selection,{source:'environment',url:'https://environment.example',token_configured:true});
  assert.equal(JSON.stringify(selected).includes(env.LINK_ASSISTANT_ROUTER_TOKEN),false);
}));
fixture('managed-use-private-validated-selection','server.use',()=>temporary(async dir=> {
  await operate(dir,'server.use',{server:'https://Inference.Example:443/',management_server:'https://Admin.Example:8443/',token_stdin:true,run_max_requests:4},{invocation:{stdin:'fixture-token\nignored'}});
  const path = join(dir,'native-managed','server.json'), saved = JSON.parse(await readFile(path,'utf8'));
  assert.deepEqual(saved,{server:'https://inference.example',management_server:'https://admin.example:8443',token:'fixture-token',run_max_requests:4});
  assert.equal((await lstat(path)).mode & 0o777,0o600);
  assert.deepEqual((await operate(dir,'server.status')).selection,{source:'persisted',url:saved.server,token_configured:true});
  assert.equal(await selectedManagedServer({config:{data_dir:dir},env:{}}),saved.server);
  for (const server of ['no-scheme','https://username:secret@example.test/','https://example.test/path','https://example.test/?query=1']) await assert.rejects(operate(dir,'server.use',{server}),/absolute http/);
  assert.deepEqual(JSON.parse(await readFile(path,'utf8')),saved);
  await assert.rejects(operate(dir,'server.use',{clear:true,server:'https://example.test'}),/cannot be combined/);
  await assert.rejects(operate(dir,'server.use',{server:'https://example.test',ca_cert:'ignored.pem'}),error=>error.code === 'unsupported');
  await operate(dir,'server.use',{clear:true}); await operate(dir,'server.use',{clear:true});
  assert.equal(await selectedManagedServer({config:{data_dir:dir},env:{}}),null);
  assert.equal((await operate(dir,'server.status')).selection.source,'managed');
  assert.equal(normalizeManagedOrigin('http://[::1]:8080/'),'http://[::1]:8080');
}));
fixture('managed-claim-once-restart-valid','server.claim',()=>temporary(async dir=> {
  await operate(dir,'server.start'); const initial = await state(dir);
  const claimed = await operate(dir,'server.claim'), token = claimed.output[0];
  assert.ok(token.startsWith('la_sk_')); assert.equal((await state(dir)).claimed,true);
  assert.equal((await fetch(`http://127.0.0.1:${initial.port}/api/management/tokens`,{headers:{authorization:`Bearer ${token}`}})).status,200);
  await assert.rejects(operate(dir,'server.claim'),/already claimed/);
  await operate(dir,'server.stop'); await operate(dir,'server.start'); const restarted = await state(dir);
  assert.equal(restarted.token_secret,initial.token_secret); assert.equal(restarted.bootstrap_token,token);
  assert.equal((await fetch(`http://127.0.0.1:${restarted.port}/api/management/tokens`,{headers:{authorization:`Bearer ${token}`}})).status,200);
  await assert.rejects(operate(dir,'server.claim'),/already claimed/);
}));
fixture('managed-remove-confirmation-owned-volume','server.remove',()=>temporary(async dir=> {
  await operate(dir,'server.start'); await writeFile(join(dir,'unrelated.txt'),'keep');
  await assert.rejects(operate(dir,'server.remove'),/requires --yes/);
  assert.equal((await operate(dir,'server.status')).managed.state,'running');
  await operate(dir,'server.remove',{yes:true}); assert.equal((await operate(dir,'server.status')).managed.present,false);
  await assert.rejects(lstat(join(dir,'native-managed','data')),error=>error.code === 'ENOENT');
  assert.equal(await readFile(join(dir,'unrelated.txt'),'utf8'),'keep');
}));
fixture('managed-concurrent-start-stop','server.start',()=>temporary(async dir=> {
  const starts = await Promise.all(Array.from({length:4},()=>operate(dir,'server.start')));
  assert.equal(new Set(starts.map(result=>result.output[0])).size,1);
  const first = await state(dir); assert.equal((await operate(dir,'server.status')).managed.state,'running');
  await Promise.all(Array.from({length:3},()=>operate(dir,'server.stop')));
  assert.equal((await operate(dir,'server.status')).managed.state,'stopped');
  assert.equal((await state(dir)).token_secret,first.token_secret);
}));
fixture('managed-stale-pid-fails-closed','server.stop',()=>temporary(async dir=> {
  await operate(dir,'server.start'); const original = await state(dir);
  try {
    await writeFile(statePath(dir),JSON.stringify({...original,pid:process.pid}));
    assert.equal((await operate(dir,'server.status')).managed.state,'unverified');
    for (const name of ['server.start','server.stop','server.claim']) await assert.rejects(operate(dir,name),/identity/);
    await assert.rejects(operate(dir,'server.remove',{yes:true}),/identity/);
    assert.equal((await state(dir)).pid,process.pid);
    assert.equal((await fetch(`http://127.0.0.1:${original.port}/health`)).status,200);
  } finally {await writeFile(statePath(dir),JSON.stringify(original));}
}));
fixture('managed-forged-control-and-claim-fail','server.claim',()=>temporary(async dir=> {
  await operate(dir,'server.start'); const original = await state(dir);
  const counterfeit = createServer((req,res)=>res.end(JSON.stringify({pid:original.pid,healthy:true,boot_id:original.boot_id,mac:'forged'})));
  await new Promise(done=>counterfeit.listen(0,'127.0.0.1',done));
  try {
    await writeFile(statePath(dir),JSON.stringify({...original,control_port:counterfeit.address().port}));
    await assert.rejects(operate(dir,'server.stop'),/identity/); assert.equal((await operate(dir,'server.status')).managed.state,'unverified');
    await writeFile(statePath(dir),JSON.stringify({...original,bootstrap_token:'forged-token'}));
    await assert.rejects(operate(dir,'server.claim'),/mismatched/); assert.equal((await state(dir)).claimed,false);
  } finally {await writeFile(statePath(dir),JSON.stringify(original)); await new Promise(done=>counterfeit.close(done));}
}));
fixture('managed-reap-dead-reference','server.reap',()=>temporary(async dir=> {
  const module = new URL('../native/managed-server.mjs',import.meta.url).href;
  const script = `import {acquireManagedReference} from ${JSON.stringify(module)}; await acquireManagedReference({config:{data_dir:process.env.FIXTURE_STATE,providers:[],accounts:[]}});`;
  const child = spawn(process.execPath,['--input-type=module','-e',script],{env:{PATH:process.env.PATH ?? '',FIXTURE_STATE:dir},stdio:'ignore'});
  const exited = await new Promise((done,reject)=> {child.once('error',reject); child.once('exit',code=>done(code));});
  assert.equal(exited,0); const held = await state(dir); assert.equal(held.keep_running,false); assert.equal(held.references[0].pid,child.pid);
  assert.equal((await operate(dir,'server.status')).managed.state,'running');
  await operate(dir,'server.reap',{pid:child.pid});
  assert.equal((await operate(dir,'server.status')).managed.state,'stopped'); assert.equal((await state(dir)).references.length,0);
}));
fixture('managed-reap-live-pid-refused','server.reap',()=>temporary(async dir=> {
  await acquireManagedReference({config:{data_dir:dir,providers:[],accounts:[]}});
  await assert.rejects(operate(dir,'server.reap',{pid:process.pid}),/live or reused/);
  assert.equal((await state(dir)).references[0].pid,process.pid); assert.equal((await operate(dir,'server.status')).managed.state,'running');
}));
fixture('managed-unsupported-and-symlink-refused','server.start',()=>temporary(async dir=> {
  await assert.rejects(operate(dir,'server.start',{host:'0.0.0.0'}),error=>error.code === 'unsupported');
  const outside = join(dir,'outside'); await mkdir(outside); await symlink(outside,join(dir,'native-managed'));
  await assert.rejects(operate(dir,'server.start'),/symlink/); assert.deepEqual(await readdir(outside),[]);
}));
fixture('managed-registry-engine-and-time-validated','server.status',()=>temporary(async dir=> {
  await mkdir(join(dir,'native-managed')); await writeFile(statePath(dir),JSON.stringify({port:8080,token_secret:'rust-secret',references:[]}));
  await assert.rejects(operate(dir,'server.status'),/another engine/);
  await rm(statePath(dir)); await operate(dir,'server.start'); const original = await state(dir);
  try {await writeFile(statePath(dir),JSON.stringify({...original,created_at:'expired'})); await assert.rejects(operate(dir,'server.status'),/invalid/);}
  finally {await writeFile(statePath(dir),JSON.stringify(original));}
}));
fixture('managed-stale-stopped-registry-restarts','server.start',()=>temporary(async dir=> {
  await operate(dir,'server.start'); const original = await state(dir); await operate(dir,'server.stop');
  await writeFile(statePath(dir),JSON.stringify({...await state(dir),created_at:0,boot_id:'historical-boot'}));
  await operate(dir,'server.start'); const restarted = await state(dir);
  assert.notEqual(restarted.boot_id,'historical-boot'); assert.equal(restarted.token_secret,original.token_secret);
  assert.equal((await operate(dir,'server.status')).managed.state,'running');
}));
fixture('managed-failed-readiness-cleans-registry','server.start',()=>temporary(async dir=> {
  await assert.rejects(operate(dir,'server.start',{}, {config:{data_dir:dir,providers:[{name:'invalid',base_url:'not-a-url',models:[]}],accounts:[]}}),/failed to start/);
  await assert.rejects(lstat(statePath(dir)),error=>error.code === 'ENOENT');
  assert.deepEqual(await readdir(join(dir,'native-managed')),[]);
  // A failed startup has finished shutting down its owned process before a
  // fresh attempt begins; it cannot poison a subsequent readiness result.
  await operate(dir,'server.start');
  assert.equal((await operate(dir,'server.status')).managed.state,'running');
}));

export async function runParityFixtures() {
  const results = new Map();
  for (const {id,operation,run} of fixtures) {await run(); results.set(id,{operation,success:true});}
  return results;
}
export const fixtureIds = fixtures.map(item=>item.id);
