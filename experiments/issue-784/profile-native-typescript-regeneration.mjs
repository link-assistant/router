// Bounded diagnostic of a complete actual regeneration; not deadline evidence.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {regenerateNativeTypeScript,sourceModules} from '../../tools/translation/js-to-rust/native-typescript.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A fresh finite evidence label is required');
const warm=process.argv[3]==='warm';
if(process.argv[3]!==undefined&&!warm)throw Error('Only the explicit warm diagnostic is supported');
const prefix='ci-logs/issue-784-restart-2/'+label;
const root=resolve('.'),hash=value=>createHash('sha256').update(value).digest('hex');
const paths=[...sourceModules(root),'js/package.json',...readdirSync('js').filter(name=>name.endsWith('.d.ts')).map(name=>'js/'+name),
 'tools/translation/js-to-rust/native-typescript.mjs','tools/translation/js-to-rust/native-inference.mjs','tools/translation/js-to-rust/concrete-source.mjs'];
const inputs=paths.map(path=>({path,source:readFileSync(path,'utf8')}));
assert.ok(inputs.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)<16*1024*1024);
let warmup=null;
if(warm){
 const start=performance.now(),result=regenerateNativeTypeScript(root,{sourceRoot:root,check:true});
 assert.deepEqual(result.changed,[]);assert.deepEqual(result.unexpected,[]);
 warmup={elapsedMs:performance.now()-start,changed:result.changed.length,unexpected:result.unexpected.length};
 console.log(JSON.stringify({warmup}));
}
const session=new Session();session.connect();
const post=(method,parameters={})=>new Promise((done,reject)=>session.post(method,parameters,(error,value)=>error?reject(error):done(value)));
const save=(suffix,value)=>{
 const path=prefix+suffix;assert.equal(existsSync(path),false);
 const raw=Buffer.from(JSON.stringify(value));assert.ok(raw.length<=64*1024*1024);
 writeFileSync(path,gzipSync(raw,{mtime:0}),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}),raw);
 return {path,bytes:raw.length,sha256:hash(raw)};
};
let result,profile;
const started=performance.now();
try{
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:5000});await post('Profiler.start');
 try{result=regenerateNativeTypeScript(root,{sourceRoot:root,check:true});}
 finally{profile=(await post('Profiler.stop')).profile;}
}finally{session.disconnect();}
const elapsedMs=performance.now()-started,cpu=save('-cpu.json.gz',profile);
for(const row of inputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
save('-result.json.gz',{schema:'actual-native-typescript-regeneration-diagnostic-v1',elapsedMs,cpu,result,warmup,samplingIntervalMicroseconds:5000,selectedPhysicalInputs:inputs,
 selectedInputsUnchanged:true,scope:'Complete production regeneration, selected inputs only; not transitive compiler authority.',
 diagnosticOnly:true,deadlineQualified:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false});
console.log(JSON.stringify({elapsedMs,cpuBytes:cpu.bytes,changed:result.changed.length,unexpected:result.unexpected.length,deadlineQualified:false}));
