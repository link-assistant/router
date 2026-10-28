// Independent owned process cases. SOURCE ONLY; ALL UNRUN until the complete draft.
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {runOwnedClientProcess} from '../src/client-process.mjs';
const limits={timeout:20000};
async function fixture(t){const cwd=await mkdtemp(join(tmpdir(),'router-owned-client-'));t.after(()=>rm(cwd,{recursive:true,force:true}));return {cwd,command:process.execPath,env:{},timeoutMs:5000};}
test('owned child receives exact argv environment and working directory without shell interpretation',limits,async t=>{
 const input=await fixture(t),literal='$(must-stay-literal) 🦀',answer=await runOwnedClientProcess({...input,args:['-e','process.stdout.write(JSON.stringify({cwd:process.cwd(),arg:process.argv[1],selected:process.env.SELECTED,absent:process.env.ROUTER_PRIVATE_MARKER??null}));process.stderr.write("diagnostic");process.exitCode=17',literal],env:{SELECTED:'exact'}}),data=JSON.parse(answer.stdout);assert.deepEqual(data,{cwd:input.cwd,arg:literal,selected:'exact',absent:null});assert.equal(answer.stderr,'diagnostic');assert.equal(answer.client_exit_code,17);assert.equal(answer.signal,null);
});
test('multibyte output is reconstructed across stream chunks while stderr remains independent',limits,async t=>{
 const input=await fixture(t),answer=await runOwnedClientProcess({...input,args:['-e','const b=Buffer.from("🦀");process.stdout.write(b.subarray(0,1));setTimeout(()=>{process.stdout.write(b.subarray(1));process.stderr.write("separate");},20)']});assert.equal(answer.stdout,'🦀');assert.equal(answer.stderr,'separate');assert.equal(answer.client_exit_code,0);
});
test('each output pipe is bounded and oversized output terminates only the owned child',limits,async t=>{
 const input=await fixture(t);for(const channel of ['stdout','stderr'])await assert.rejects(runOwnedClientProcess({...input,maxOutputBytes:4096,args:['-e','setInterval(()=>process.'+channel+'.write("x".repeat(8192)),5)']}),error=>/output cap/.test(error.message)&&Buffer.byteLength(error.data[channel])<=4096);
});
test('deadline and cancellation retain captured diagnostics and release parent signal handlers',limits,async t=>{
 const input=await fixture(t),before=[process.listenerCount('SIGINT'),process.listenerCount('SIGTERM')];await assert.rejects(runOwnedClientProcess({...input,timeoutMs:150,forwardSignals:true,args:['-e','process.stderr.write("started");setInterval(()=>{},1000)']}),error=>/deadline/.test(error.message)&&typeof error.data.stderr==='string');assert.deepEqual([process.listenerCount('SIGINT'),process.listenerCount('SIGTERM')],before);
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),100);try{await assert.rejects(runOwnedClientProcess({...input,signal:abort.signal,args:['-e','setInterval(()=>{},1000)']}),/cancelled/);}finally{clearTimeout(timer);}assert.deepEqual([process.listenerCount('SIGINT'),process.listenerCount('SIGTERM')],before);
});
test('cancellation before spawn never executes the configured program',limits,async t=>{
 const input=await fixture(t),path=join(input.cwd,'must-not-exist'),abort=new AbortController();abort.abort();await assert.rejects(runOwnedClientProcess({...input,signal:abort.signal,args:['-e','require("node:fs").writeFileSync(process.argv[1],"executed")',path]}),/before spawn/);await assert.rejects(readFile(path),{code:'ENOENT'});
});
test('nonexistent executable and invalid launch limits are structured failures without hanging or leaking handlers',limits,async t=>{
 const input=await fixture(t);await assert.rejects(runOwnedClientProcess({...input,command:join(input.cwd,'missing-executable')}),/not installed|not on PATH/);for(const patch of [{cwd:'relative'},{args:['bad\0argument']},{timeoutMs:0},{maxOutputBytes:8388609},{env:{BAD:42}},{env:{'BAD=NAME':'value'}}])await assert.rejects(runOwnedClientProcess({...input,...patch}),/bounded|absolute|bound|NUL-free/);
});
test('parallel invocations keep child exit codes streams cancellation and deadlines separate',limits,async t=>{
 const input=await fixture(t),abort=new AbortController(),timer=setTimeout(()=>abort.abort(),100);try{const results=await Promise.allSettled([runOwnedClientProcess({...input,signal:abort.signal,args:['-e','setInterval(()=>{},1000)']}),runOwnedClientProcess({...input,args:['-e','process.stdout.write("independent");process.exitCode=23']})]);assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal(results[1].value.stdout,'independent');assert.equal(results[1].value.client_exit_code,23);}finally{clearTimeout(timer);}
});
