// Actual whole producer output and independent DATA review; no semantic permit.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareStaticSourceLifecycleProposalReleased} from '../../tools/translation/prepare-real-source-fixtures.mjs';
import {decodeStaticSourceTextData} from '../../tools/translation/static-source-layout-storage.mjs';

const root=resolve('.'),folder='tools/translation/source-profiles/static-source-lifecycle';
const target='ci-logs/issue-784-restart-2/current-static-fixture-refresh-v3.json.gz';
assert.ok(!existsSync(target));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
const head=git('rev-parse','HEAD').trim();
assert.equal(typeof global.gc,'function','independent review phases require explicit disposal of completed producer temporaries');
const names=['originals.json.gz','manifest.json','NOTICE.md'];
const originals=new Map(names.map(name=>[folder+'/'+name,readFileSync(folder+'/'+name)]));
function decode(files){
 const index=JSON.parse(files.get(folder+'/manifest.json'));
 const packed=files.get(folder+'/'+index.archive);
 assert.equal(packed.length,index.bytes);assert.equal(sha(packed),index.sha256);
 const raw=gunzipSync(packed,{maxOutputLength:64*1024*1024});
 assert.equal(raw.length,index.rawBytes);assert.equal(sha(raw),index.rawSha256);
 return decodeStaticSourceTextData(raw,index).bundle;
}
console.log(JSON.stringify({stage:'before-actual-producer',memory:process.memoryUsage()}));
const proposal=prepareStaticSourceLifecycleProposalReleased({root,currentRevision:head,historyArchive:resolve(folder)});
console.log(JSON.stringify({stage:'after-actual-producer',memory:process.memoryUsage()}));
// This experiment separates completed producer allocation from independent DATA
// review. It changes no production check, limit, deadline or source decision.
global.gc();
console.log(JSON.stringify({stage:'released-completed-producer-temporaries',memory:process.memoryUsage()}));
const old=decode(originals);
console.log(JSON.stringify({stage:'after-independent-original-data',memory:process.memoryUsage()}));
assert.equal(proposal.schema,'router-static-source-lifecycle-proposal-v1');
assert.equal(proposal.subjectRevision,head);assert.equal(proposal.completeInverse,true);
assert.deepEqual(proposal.before,proposal.after);
assert.deepEqual(proposal.files.map(row=>row.path),names.map(name=>folder+'/'+name));
const proposed=new Map(proposal.files.map(row=>{
 const bytes=Buffer.from(row.content,row.encoding);
 assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);
 return [row.path,bytes];
}));
global.gc();
console.log(JSON.stringify({stage:'before-independent-generated-data',memory:process.memoryUsage()}));
const next=decode(proposed);
console.log(JSON.stringify({stage:'after-independent-generated-data',memory:process.memoryUsage()}));
assert.deepEqual(next.profiles,old.profiles);
assert.deepEqual(next.cases,old.cases);
assert.deepEqual(next.authority,old.authority);
let historicalOccurrences=0;
for(const profile of old.profiles)for(const row of profile.files){
 assert.equal(next.sources[row.sourceId].source,old.sources[row.sourceId].source);
 assert.equal(next.sources[row.sourceId].bytes,old.sources[row.sourceId].bytes);
 assert.equal(next.sources[row.sourceId].gitBlob,old.sources[row.sourceId].gitBlob);
 historicalOccurrences++;
}
const paths=git('ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','rust/Cargo.toml').split('\0').filter(Boolean).sort();
assert.deepEqual(next.current.files.map(row=>row.path),paths);
for(const row of next.current.files){
 const bytes=readFileSync(row.path),source=next.sources[row.sourceId];
 assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sourceId);
 assert.equal(source.source,bytes.toString('utf8'));
 assert.equal(source.bytes,row.bytes);assert.equal(source.gitBlob,row.gitBlob);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob);
}
assert.deepEqual(proposed.get(folder+'/NOTICE.md'),originals.get(folder+'/NOTICE.md'));
assert.equal(git('rev-parse','HEAD').trim(),head);
for(const [path,bytes]of originals)assert.deepEqual(readFileSync(path),bytes);

// Preserve the complete original proposal without duplicating its generated
// archive. Reconstruct every content field from the complete external bytes
// and check the entire original JSON byte image before any installation.
const originalProposal=Buffer.from(JSON.stringify(proposal)+'\n');
const envelope={...proposal,files:proposal.files.map(({content,...row})=>({...row,
 contentExternal:{path:row.path,bytes:row.bytes,sha256:row.sha256}}))};
const recovered={...envelope,files:envelope.files.map(({contentExternal,...row})=>{
 const bytes=proposed.get(contentExternal.path);
 assert.equal(bytes.length,contentExternal.bytes);assert.equal(sha(bytes),contentExternal.sha256);
 // Content occupies its original property position in the producer's record.
 return {path:row.path,encoding:row.encoding,content:bytes.toString(row.encoding),bytes:row.bytes,sha256:row.sha256};
})};
assert.equal(JSON.stringify(recovered)+'\n',originalProposal.toString());
const record={schema:'complete-current-static-source-refresh-reference-envelope-v1',
 head,node:process.version,producer:'prepareStaticSourceLifecycleProposalReleased',
 proposalJsonBytes:originalProposal.length,proposalJsonSha256:sha(originalProposal),proposal:envelope,
 originalFiles:[...originals].map(([path,bytes])=>({path,bytes:bytes.length,sha256:sha(bytes),
  completeBytesGitReference:head+':'+path,gitBlob:git('rev-parse',head+':'+path).trim()})),
 review:{historicalProfiles:next.profiles.map(row=>({revision:row.revision,files:row.files.length})),
  historicalOccurrences,historicalSourceBytesUnchanged:true,currentPhysicalAndGitBytesMatch:true,
  currentFiles:paths.length,currentSourceSetSha256:next.current.sourceSetSha256,noticeUnchanged:true,
  sourceAuthority:false,semanticAuthority:false,newExecutableApplicationFunctions:0,
  fullGatePassed:false,rustExecuted:false}};
const packed=gzipSync(Buffer.from(JSON.stringify(record)+'\n'),{level:9,mtime:0});
assert.deepEqual(JSON.parse(gunzipSync(packed)),record);
try{
 for(const [path,bytes]of proposed)if(!bytes.equals(originals.get(path)))writeFileSync(path,bytes);
 for(const [path,bytes]of proposed)assert.deepEqual(readFileSync(path),bytes);
 writeFileSync(target,packed,{flag:'wx'});
 assert.deepEqual(readFileSync(target),packed);
}catch(error){for(const [path,bytes]of originals)writeFileSync(path,bytes);throw error;}
console.log(JSON.stringify({target,bytes:packed.length,sha256:sha(packed),head,...record.review}));
