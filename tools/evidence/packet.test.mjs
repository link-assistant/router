import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('complete packet storage Python fixtures enforce full Git/container/member joins',{timeout:60000},()=>{
 const result=spawnSync('python3',['tools/evidence/packet_test.py'],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024});assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stderr,/Ran \d+ tests/);assert.match(result.stderr,/OK/);
});
test('complete packet CLI exposes bounded recovery and refuses undeclared invocation',{timeout:5000},()=>{
 const help=spawnSync('python3',['tools/evidence/packet.py','--help'],{cwd:root,encoding:'utf8',timeout:3000});assert.equal(help.status,0);assert.match(help.stdout,/--members-receipt/);
 const invalid=spawnSync('python3',['tools/evidence/packet.py'],{cwd:root,encoding:'utf8',timeout:3000});assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/required/);
});
