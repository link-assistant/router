import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, lstat, readdir, realpath, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, brotliCompressSync, deflateRawSync } from 'node:zlib';
import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { decodeLogLine, executeResourceOperation } from '../native/resources.mjs';

const fixtures = [];
const record = (id,phase,extra = {}) => ({correlation_id:id,phase,...extra});
const marked = value => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value ? value.replace(/[%"\\()\n\r\t]/g,ch=>`%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')}`) : '%z'}"`;
  if (Array.isArray(value)) return `(#a ${value.map(marked).join(' ')})`;
  if (typeof value === 'object') return `(#o ${Object.entries(value).map(([key,item])=>`(${marked(key)} ${marked(item)})`).join(' ')})`;
  return String(value);
};
async function temporary(work) {
  const dir = await realpath(await mkdtemp(join(tmpdir(),'router-native-resources-')));
  try { return await work(dir); } finally { await rm(dir,{recursive:true,force:true}); }
}
async function logFile(dir,name,records,filename = 'requests.lino') {
  const path = join(dir,'requests',name); await mkdir(path,{recursive:true});
  await writeFile(join(path,filename),records.join('\n')+'\n');
}
const run = (dir,name,options = {}) => executeResourceOperation({name,options,config:{data_dir:dir}});
const fixture = (id,operation,verify) => fixtures.push({id,operation,verify});

fixture('resource-logs-summary-formats','logs.summary',()=>temporary(async dir=> {
  const first = record('ordinary','client_response',{status:200,headers:{'content-type':'application/json'}});
  const legacy = '((:"correlation_id" "legacy") (:"phase" "client_response") (:"status" 201))';
  const current = marked(record('stream','upstream_response',{status:200,headers:{'content-type':'text/event-stream'}}));
  await logFile(dir,'a',[JSON.stringify(first),legacy,current,'broken record',marked(record('stream','upstream_response_body',{body:'data: [DONE]\n\n'}))]);
  await logFile(dir,'b',[JSON.stringify(record('second','client_response',{status:204}))],'requests.jsonl');
  const result = await run(dir,'logs.summary');
  assert.equal(result.exchanges,4); assert.equal(result.records,5); assert.equal(result.unparsable_records,1);
  assert.equal(result.streamed,1); assert.equal(result.non_streamed,3); assert.equal(result.unterminated_streams,0);
  assert.deepEqual(result.statuses,{'200':2,'201':1,'204':1}); assert.ok(result.bytes > 100);
}));
fixture('resource-logs-show-percent-and-arrays','logs.show',()=>temporary(async dir=> {
  const original = record('id','client_request',{body:{json:{messages:[{content:'(quote) "text"\n%22 😀',empty:''}],enum:['a','b']}}});
  await logFile(dir,'tokenhash',[marked(original)]);
  const result = await run(dir,'logs.show',{correlation_id:'id',token:'token'});
  assert.deepEqual(JSON.parse(JSON.stringify(result.records)),[original]);
  assert.deepEqual((await run(dir,'logs.show',{correlation_id:'missing'})).records,[]);
  assert.ok(result.output.join('\n').includes('😀'));
}));
fixture('resource-logs-summary-token-filter','logs.summary',()=>temporary(async dir=> {
  await logFile(dir,'abcdef',[JSON.stringify(record('chosen','client_response',{status:200}))]);
  await logFile(dir,'other',[JSON.stringify(record('excluded','client_response',{status:500}))]);
  assert.equal((await run(dir,'logs.summary',{token:'abc'})).exchanges,1);
  assert.equal((await run(dir,'logs.summary',{token:'../'})).exchanges,0);
}));
fixture('resource-logs-summary-compressed-frames','logs.summary',()=>temporary(async dir=> {
  for (const [kind,compress] of [['gzip',gzipSync],['br',brotliCompressSync],['deflate',deflateRawSync]]) {
    const bytes = compress(Buffer.from('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
    const split = Math.floor(bytes.length/2);
    await logFile(dir,kind,[record(kind,'upstream_response',{status:200,headers:{'content-type':'text/event-stream','content-encoding':kind}}),
      record(kind,'upstream_response_body',{body:{base64:bytes.subarray(0,split).toString('base64')}}),record(kind,'upstream_response_body',{body:{base64:bytes.subarray(split).toString('base64')}}),
      record(kind,'stream_end',{complete:false,inspectable:false,outcome:'incomplete'})].map(marked));
  }
  const summary = await run(dir,'logs.summary'); assert.equal(summary.streamed,3);
  assert.equal(summary.incomplete_streams,0); assert.equal(summary.unverifiable_streams,0); assert.equal(summary.undecodable_bodies,0);
  const shown = await run(dir,'logs.show',{correlation_id:'gzip'});
  assert.ok(shown.records[1].body.includes('message_stop')); assert.ok(shown.records[2].body.startsWith('[decoded with'));
}));
fixture('resource-logs-summary-truncated-gzip','logs.summary',()=>temporary(async dir=> {
  const bytes = gzipSync(Buffer.from('event: message_start\ndata: {"type":"message_start"}\n\n'));
  await logFile(dir,'a',[record('cut','upstream_response',{headers:{'content-type':'text/event-stream','content-encoding':'gzip'}}),
    record('cut','upstream_response_body',{body:{base64:bytes.subarray(0,-8).toString('base64')}}),record('cut','stream_end',{complete:false,inspectable:false,outcome:'incomplete'})].map(marked));
  const summary = await run(dir,'logs.summary'); assert.equal(summary.incomplete_streams,1); assert.equal(summary.unverifiable_streams,0);
}));
fixture('resource-logs-anomalies-nonzero','logs.anomalies',()=>temporary(async dir=> {
  const compressed = gzipSync(Buffer.from('event: error\ndata: {"type":"error"}\n\nevent: message_stop\n'));
  await logFile(dir,'a',[
    record('cut','client_response',{status:200,headers:{'content-type':'text/event-stream'}}),record('cut','stream_end',{complete:false,outcome:'incomplete'}),
    record('unknown','client_request',{body:{json:{stream:true}}}),
    record('refused1','client_response',{status:401}),record('refused2','client_response',{status:403}),record('throttled','client_response',{status:429}),
    record('errored','upstream_response',{headers:{'content-type':'text/event-stream','content-encoding':'gzip'}}),record('errored','upstream_response_body',{body:{base64:compressed.toString('base64')}}),
    record('encoded','upstream_response',{headers:{'content-type':'text/event-stream','content-encoding':'future'}}),
    record('binary','client_request',{body:{base64:'AA=='}}),
  ].map(marked));
  let result; try { await run(dir,'logs.anomalies'); assert.fail('must fail for anomalies'); } catch (error) { result = error; }
  assert.equal(result.exitCode,1); assert.deepEqual(result.data.map(x=>x.kind),['stream_ended_without_terminator','no_terminal_record','stream_carried_an_error','stream_not_verifiable','repeated_authentication_failure','rate_limited','undecodable_bodies']);
  assert.deepEqual(result.data[0].correlation_ids,['cut']);
}));
fixture('resource-logs-anomalies-empty','logs.anomalies',()=>temporary(async dir=> {
  assert.deepEqual(await run(dir,'logs.anomalies'),[]); assert.equal((await run(dir,'logs.summary')).bytes,0);
}));
fixture('resource-logs-refuse-symlink','logs.show',()=>temporary(async dir=> {
  await mkdir(join(dir,'requests')); const outside = join(dir,'outside'); await mkdir(outside);
  await writeFile(join(outside,'requests.lino'),'sensitive'); await symlink(outside,join(dir,'requests','link'));
  await assert.rejects(run(dir,'logs.show',{correlation_id:'id'}),/symlink/);
}));
fixture('resource-logs-refuse-unsupported','logs.summary',()=>temporary(async dir=> {
  await assert.rejects(run(dir,'logs.summary',{server:'https://example.test'}),error=>error.code === 'unsupported');
  await logFile(dir,'a',[record('zstd','upstream_response',{headers:{'content-type':'text/event-stream','content-encoding':'zstd'}}),record('zstd','upstream_response_body',{body:{base64:'AA=='}})].map(marked));
  if (Number(process.versions.node.split('.')[0]) < 22) await assert.rejects(run(dir,'logs.summary'),error=>error.code === 'unsupported' && /zstd/.test(error.message));
}));
fixture('resource-logs-read-budget','logs.summary',()=>temporary(async dir=> {
  await logFile(dir,'sparse',[]);
  // Sparse truncation exercises the metadata refusal without allocating or
  // reading hundreds of MiB on disk.
  await truncate(join(dir,'requests','sparse','requests.lino'),256*1024*1024+1);
  await assert.rejects(run(dir,'logs.summary'),error=>error.code === 'unsupported' && /budget/.test(error.message));
}));
fixture('resource-logs-invalid-utf8','logs.show',()=>temporary(async dir=> {
  await logFile(dir,'invalid',[]); await writeFile(join(dir,'requests','invalid','requests.lino'),Buffer.from([0xff]));
  await assert.rejects(run(dir,'logs.show',{correlation_id:'id'}),/valid UTF-8/);
}));
fixture('resource-tls-generate-reuse','tls.generate',()=>temporary(async dir=> {
  const result = await run(dir,'tls.generate',{dns:'router.local,192.0.2.5,::1'});
  assert.deepEqual(result.output,[join(dir,'tls','cert.pem')]);
  const certPem = await readFile(result.output[0],'utf8'), keyPem = await readFile(join(dir,'tls','key.pem'),'utf8');
  const certificate = new X509Certificate(certPem);
  for (const host of ['router.local','localhost']) assert.equal(certificate.checkHost(host),host);
  for (const ip of ['192.0.2.5','127.0.0.1','::1']) assert.equal(certificate.checkIP(ip),ip);
  assert.ok(certificate.verify(certificate.publicKey));
  assert.deepEqual(certificate.publicKey.export({type:'spki',format:'der'}),createPublicKey(createPrivateKey(keyPem)).export({type:'spki',format:'der'}));
  assert.equal((await lstat(join(dir,'tls','key.pem'))).mode & 0o777,0o600);
  await run(dir,'tls.generate',{dns:'new.name'}); assert.equal(await readFile(result.output[0],'utf8'),certPem);
  assert.deepEqual((await readdir(join(dir,'tls'))).sort(),['cert.pem','key.pem']);
}));
fixture('resource-tls-concurrent-generation','tls.generate',()=>temporary(async dir=> {
  await Promise.all([run(dir,'tls.generate',{dns:'first.local'}),run(dir,'tls.generate',{dns:'second.local'})]);
  const certificate = new X509Certificate(await readFile(join(dir,'tls','cert.pem')));
  assert.equal(certificate.checkHost('first.local'),'first.local');
  assert.deepEqual(certificate.publicKey.export({type:'spki',format:'der'}),createPublicKey(createPrivateKey(await readFile(join(dir,'tls','key.pem')))).export({type:'spki',format:'der'}));
}));
fixture('resource-tls-ca','tls.ca',()=>temporary(async dir=> {
  await assert.rejects(run(dir,'tls.ca'),/no generated certificate/);
  await run(dir,'tls.generate'); const ca = await run(dir,'tls.ca');
  assert.equal(ca.output[0],'-----BEGIN CERTIFICATE-----'); assert.ok(new X509Certificate(ca.output.join('\n')).checkHost('localhost'));
}));
fixture('resource-tls-refuse-name-injection','tls.generate',()=>temporary(async dir=> {
  await assert.rejects(run(dir,'tls.generate',{dns:'localhost\n[evil]'}),/DNS names/);
  await assert.rejects(lstat(join(dir,'tls')),error=>error.code === 'ENOENT');
  const destination = join(dir,'other'); await mkdir(destination); await symlink(destination,join(dir,'tls'));
  await assert.rejects(run(dir,'tls.generate'),/symlink/); assert.deepEqual(await readdir(destination),[]);
}));

fixture('resource-log-parser-refuses-malformed','logs.show',()=> {
  assert.equal(decodeLogLine('(#o ("a" 1) ("b"))'),undefined);
  assert.equal(decodeLogLine('(#a 1) garbage'),undefined);
  assert.equal(decodeLogLine('(#a '.repeat(150)+'1'+')'.repeat(150)),undefined);
});

// The manifest runner uses assertion completion as evidence, independently of
// operation exit codes (anomalies intentionally return a failed operation).
export const fixtureIds = fixtures.map(({id})=>id);
export async function runParityFixtures() {
  const evidence = new Map();
  for (const {id,operation,verify} of fixtures) {
    await verify(); evidence.set(id,{operation,success:true});
  }
  return evidence;
}
