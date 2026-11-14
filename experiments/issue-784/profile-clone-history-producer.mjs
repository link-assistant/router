// Profile the complete actual producer; no output installation or case waiver.
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareCurrentReceivingSourceHistory} from '../../tools/translation/prepare-current-receiving-source-history.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A fresh finite observation label is required');
const prefix='ci-logs/issue-784-restart-2/'+label;
const paths=[
 'tools/translation/prepare-current-receiving-source-history.mjs',
 'tools/translation/prepare-default-proof-byte-adoption.mjs',
 'tools/translation/prepare-clone-enclosing-source-history.mjs',
 'tools/translation/prepare-schemars-enclosing-adoption.mjs',
 'tools/translation/source-profiles/clone-enclosing/source-rules.json',
 'tools/translation/test/fixtures/current-receiving-source-history.mjs',
 'tools/translation/test/fixtures/native-proof-json-format.mjs',
];
const before=paths.map(path=>({path,source:readFileSync(path,'utf8')}));
const hash=value=>createHash('sha256').update(value).digest('hex');
const session=new Session();session.connect();
const post=(method,parameters={})=>new Promise((resolve,reject)=>session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
try{
 await post('Profiler.enable');
 await post('Profiler.setSamplingInterval',{interval:1000});
 await post('Profiler.start');
 const start=performance.now();
 const plan=prepareCurrentReceivingSourceHistory();
 const elapsedMs=performance.now()-start;
 const {profile}=await post('Profiler.stop');
 for(const row of before)if(readFileSync(row.path,'utf8')!==row.source)throw Error('Complete observed input changed: '+row.path);
 const raw=Buffer.from(JSON.stringify(profile));
 if(raw.length>64*1024*1024)throw Error('Finite complete CPU evidence bound exceeded');
 const profilePath=prefix+'-cpu.json.gz';
 writeFileSync(profilePath,gzipSync(raw),{flag:'wx'});
 if(!gunzipSync(readFileSync(profilePath),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Complete CPU evidence readback differs');
 const receipt={schema:'complete-current-history-producer-cpu-observation-v1',
  inputs:before.map(row=>({...row,sha256:hash(row.source)})),
  outputs:plan.files.map(row=>({path:row.path,bytes:Buffer.byteLength(row.after),sha256:hash(row.after),current:row.current===row.after})),
  elapsedMs,profilePath,profileBytes:raw.length,profileSha256:hash(raw),
  node:process.versions.node,diagnosticOnly:true,deadlineQualified:false,
  fullGatePassed:false,runtimeParity:false};
 const encoded=Buffer.from(JSON.stringify(receipt));
 writeFileSync(prefix+'-result.json.gz',gzipSync(encoded),{flag:'wx'});
 console.log(JSON.stringify({elapsedMs,profilePath,profileBytes:raw.length,outputs:receipt.outputs,deadlineQualified:false}));
}finally{session.disconnect();}
