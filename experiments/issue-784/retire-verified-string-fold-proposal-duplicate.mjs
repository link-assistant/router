// One exact inactive packed duplicate; complete original remains in install.records[0].
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,lstatSync,readdirSync,readlinkSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const base='ci-logs/issue-784-restart-2/',original=resolve(base+'current-string-fold-receiving-equation-proposal.json.gz'),retained=resolve(base+'current-string-fold-receiving-equation-install.json.gz'),receipt=base+'current-string-fold-proposal-duplicate-retirement.json';
const hash=value=>createHash('sha256').update(value).digest('hex'),state=lstatSync(original);
assert.ok(state.isFile()&&!state.isSymbolicLink());assert.equal(state.nlink,1);assert.equal(state.uid,process.getuid());
const identity=value=>[value.dev,value.ino,value.mode,value.size,value.mtimeMs,value.ctimeMs];
function inactive(){for(const pid of readdirSync('/proc').filter(name=>/^\d+$/u.test(name))){let fds;try{fds=readdirSync('/proc/'+pid+'/fd');}catch(error){if(['ENOENT','EACCES'].includes(error.code))continue;throw error;}for(const fd of fds){try{assert.notEqual(readlinkSync('/proc/'+pid+'/fd/'+fd),original);}catch(error){if(!['ENOENT','ESRCH'].includes(error.code))throw error;}}}}
inactive();
const packed=readFileSync(original),raw=gunzipSync(packed,{maxOutputLength:32*1024*1024}),kept=readFileSync(retained),install=JSON.parse(gunzipSync(kept,{maxOutputLength:64*1024*1024})),reconstructed=Buffer.from(JSON.stringify(install.records[0]));
assert.ok(reconstructed.equals(raw));assert.ok(gzipSync(reconstructed).equals(packed));assert.deepEqual(identity(lstatSync(original)),identity(state));inactive();
const record={schema:'exact-packed-proposal-duplicate-retirement-v1',original,originalBytes:packed.length,originalSha256:hash(packed),decodedBytes:raw.length,decodedSha256:hash(raw),retained,retainedBytes:kept.length,retainedSha256:hash(kept),reconstruction:'gzipSync(Buffer.from(JSON.stringify(JSON.parse(gunzipSync(retained)).records[0])))',completePackedReadbackVerified:true,logicalBytesReclaimed:state.size,allocatedBytesReclaimed:state.blocks*512};
writeFileSync(receipt,JSON.stringify(record),{flag:'wx'});assert.deepEqual(identity(lstatSync(original)),identity(state));unlinkSync(original);console.log(JSON.stringify(record));
