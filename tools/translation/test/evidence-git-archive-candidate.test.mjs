import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));

test('real ancestor archive candidates preserve the whole Python isolation and recovery group',{timeout:60000},()=>{
  const result=spawnSync('python3',['tools/evidence/test_git_archive_candidate.py'],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stderr,/Ran 16 tests/u);assert.match(result.stderr,/OK/u);
});

test('archive candidate CLI requires explicit source plan and fresh outside output',{timeout:5000},()=>{
  const help=spawnSync('python3',['tools/evidence/git_archive_candidate.py','--help'],{cwd:root,encoding:'utf8',timeout:3000});
  assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/--manifest/u);assert.match(help.stdout,/--output-directory/u);
  const missing=spawnSync('python3',['tools/evidence/git_archive_candidate.py'],{cwd:root,encoding:'utf8',timeout:3000});
  assert.notEqual(missing.status,0);assert.match(missing.stderr,/required/u);
});
