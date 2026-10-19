import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {get} from 'node:https';
import {createNativeRouter} from '../../../js/src/server.mjs';
test('native self-signed HTTPS binds localhost with a verified generated certificate',async t=>{
  const data_dir=await mkdtemp(join(await realpath(tmpdir()),'router-native-https-'));t.after(()=>rm(data_dir,{recursive:true,force:true}));
  const router=createNativeRouter({core:{config:{data_dir,tls_self_signed:true}}});await router.listen({host:'127.0.0.1',port:0});t.after(()=>router.close());
  const ca=await readFile(join(data_dir,'tls','cert.pem'));
  const result=await new Promise((resolve,reject)=>{get(`https://127.0.0.1:${router.address.port}/api/health`,{ca},response=>{const authorized=response.socket.authorized,chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,body:Buffer.concat(chunks).toString(),authorized}));}).on('error',reject);});
  assert.equal(result.status,200);assert.equal(result.body,'ok');assert.equal(result.authorized,true);
});
