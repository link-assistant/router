import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('complete evidence storage preserves original Git containers, decoded streams and fail-closed boundaries',{timeout:60000},()=>{
  const result=spawnSync('python3',['-m','unittest','discover','-s','tools/evidence','-p','storage_test.py','-v'],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',...(process.env.ROUTER_STORAGE_VECTORS?{ROUTER_STORAGE_FIXTURE_VECTORS:process.env.ROUTER_STORAGE_VECTORS+'.fixtures.json'}:{})}});
  process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
  if(process.env.ROUTER_STORAGE_VECTORS)writeFileSync(process.env.ROUTER_STORAGE_VECTORS,JSON.stringify({schema:'bounded-evidence-storage-behavioral-cohort-v1',host:process.versions,command:['python3','-m','unittest','discover','-s','tools/evidence','-p','storage_test.py','-v'],status:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout,stderr:result.stderr,runtimeParity:false,semanticAuthority:false,rustExecuted:false},null,2)+'\n');
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stderr,/Ran 15 tests/);assert.match(result.stderr,/\nOK\n/u);
});
