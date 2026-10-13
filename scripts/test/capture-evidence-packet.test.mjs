import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,realpathSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const tool=join(root,'tools/evidence/capture-packet.py');
const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
const digest=value=>createHash('sha256').update(value).digest('hex');
function fixture(run) {
  const directory=mkdtempSync(join(realpathSync(tmpdir()),'router-evidence-packet-'));
  try{return run(directory);}finally{rmSync(directory,{recursive:true,force:true});}
}
function member(directory,name,text='complete failed attempt\n') {
  const originalPath=join(directory,name);writeFileSync(originalPath,text);
  const data=readFileSync(originalPath);
  return {path:'observations/'+name,originalPath,bytes:data.length,sha256:digest(data)};
}
function capture(directory,members,extra=[]) {
  const manifest=join(directory,'manifest.json');writeFileSync(manifest,JSON.stringify({members}));
  const argv=[tool,'--source-root',root,'--head',head,'--manifest',manifest,
    '--archive',join(directory,'complete.tar.xz'),'--receipt',join(directory,'receipt.json'),'--cap-seconds','30',...extra];
  return spawnSync('python3',argv,{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:1048576});
}

test('complete failed/pass originals and duplicate bytes reopen from actual XZ/TAR with exact hashes',()=>fixture(directory=>{
  const rows=[member(directory,'failed.log'),member(directory,'passed.log','all independent expectations passed\n'),member(directory,'duplicate.log')];
  const result=capture(directory,rows);assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8'));
  assert.equal(receipt.completeMembers,3);assert.equal(receipt.completeOriginalBytes,rows.reduce((sum,row)=>sum+row.bytes,0));
  assert.equal(receipt.allDecodedOriginalsVerified,true);assert.equal(receipt.allSelectedOriginalsUnchanged,true);
  assert.equal(receipt.sourceHead,head);assert.equal(receipt.fullGatePass,false);assert.equal(receipt.runtimeParity,false);assert.equal(receipt.rustExecuted,false);
  assert.ok(receipt.members.some(row=>row.storedAsHardlink));
  const decoded=spawnSync('python3',['-c','import tarfile,json,sys; t=tarfile.open(sys.argv[1]); print(json.dumps({m.name:t.extractfile(m).read().hex() for m in t}))',join(directory,'complete.tar.xz')],{encoding:'utf8'});
  assert.equal(decoded.status,0,decoded.stderr);const payloads=JSON.parse(decoded.stdout);
  for(const row of rows)assert.deepEqual(Buffer.from(payloads[row.path],'hex'),readFileSync(row.originalPath));
}));

test('changed or forged original bytes refuse before issuing any successful receipt',()=>fixture(directory=>{
  const row=member(directory,'source.json','{"original":true}\n');writeFileSync(row.originalPath,'{"original":false}\n');
  const result=capture(directory,[row]);assert.equal(result.status,1);assert.match(result.stderr,/complete pinned manifest/u);
  assert.throws(()=>readFileSync(join(directory,'receipt.json')),{code:'ENOENT'});
}));

test('leaf links and linked evidence directories refuse without reading through an alias',()=>{
  for(const kind of ['leaf','parent'])fixture(directory=>{
    const row=member(directory,'original.log');
    const alias=join(directory,'alias');symlinkSync(kind==='leaf'?row.originalPath:directory,alias);
    row.originalPath=kind==='leaf'?alias:join(alias,'original.log');
    const result=capture(directory,[row]);assert.equal(result.status,1);assert.match(result.stderr,/Linked evidence/u);
  });
});

test('escaping/duplicate TAR names, oversized claims and invalid SHA pins refuse',()=>{
  for(const bad of ['../outside','/absolute','a//b','a/./b','a/../b'])fixture(directory=>{
    const row=member(directory,'original.log');row.path=bad;
    const result=capture(directory,[row]);assert.equal(result.status,1);assert.match(result.stderr,/archive member name/u);
  });
  for(const change of [rows=>rows.push({...rows[0]}),rows=>{rows[0].bytes=129*1024*1024;},rows=>{rows[0].sha256='claimed';}])fixture(directory=>{
    const rows=[member(directory,'original.log')];change(rows);const result=capture(directory,rows);assert.equal(result.status,1);
    assert.throws(()=>readFileSync(join(directory,'receipt.json')),{code:'ENOENT'});
  });
});

test('stale source commits and existing output paths cannot replace a reviewed packet',()=>{
  fixture(directory=>{const result=capture(directory,[member(directory,'original.log')],['--head','0'.repeat(40)]);assert.equal(result.status,1);assert.match(result.stderr,/immutable commit/u);});
  fixture(directory=>{
    const previous=Buffer.from('preserved original output');writeFileSync(join(directory,'complete.tar.xz'),previous);
    const result=capture(directory,[member(directory,'original.log')]);assert.equal(result.status,1);assert.match(result.stderr,/distinct and new/u);
    assert.deepEqual(readFileSync(join(directory,'complete.tar.xz')),previous);
  });
});
