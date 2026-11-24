import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));

test('fixed gzip original recovery keeps every complete Python storage control',{timeout:60000},()=>{
  const result=spawnSync('python3',['tools/evidence/test_decoded_original.py'],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stderr,/Ran 20 tests/u);assert.match(result.stderr,/OK/u);
});

test('decoded-original CLI exposes only fixed bounded recovery',{timeout:5000},()=>{
  const help=spawnSync('python3',['tools/evidence/decoded_original.py','--help'],{cwd:root,encoding:'utf8',timeout:3000});
  assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/--decoded-index/u);assert.match(help.stdout,/--logical-original/u);
  const absent=spawnSync('python3',['tools/evidence/decoded_original.py'],{cwd:root,encoding:'utf8',timeout:3000});
  assert.notEqual(absent.status,0);assert.match(absent.stderr,/required/u);
});
