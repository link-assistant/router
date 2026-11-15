// Finite ABI investigation only; no production file or issuer is changed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=process.cwd(),base=resolve(root,'experiments/issue-784/toolchain/drafts');
assert.equal(process.versions.node,'20.20.2');
assert.equal(process.versions.bun,undefined);
const digest=value=>createHash('sha256').update(value).digest('hex');
const pins={
  'crypto.js':'9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c',
  'hash.js':'c5920f63623364cd5dfea5d21d6377f88ea919988ba403f706e7aca6f3dcf050',
  LICENSE:'70c7a59521f41ccfe5bb0193677b77a44ed43ad4fe59203fa408afa538214949',
};
const official={};
for(const [name,sha256]of Object.entries(pins)){
  const bytes=readFileSync(resolve(base,'node-v20.20.2',name));
  assert.ok(bytes.length<524288);
  assert.equal(digest(bytes),sha256);
  official[name]={bytes:bytes.length,sha256,source:bytes.toString('utf8')};
}
const functionSources={createHash:Function.prototype.toString.call(createHash),Hash:Function.prototype.toString.call(Hash)};
for(const key of ['copy','_transform','_flush','update','digest'])functionSources[key]=Function.prototype.toString.call(Hash.prototype[key]);
for(const [name,source]of Object.entries(functionSources)){
  const original=official[name==='createHash'?'crypto.js':'hash.js'].source;
  assert.equal(original.split(source).length,2,'one complete official source for '+name);
}
const target=resolve(root,'tools/translation/attribute-owner-bulk-crypto.mjs'),original=readFileSync(target,'utf8');
const swap=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
let candidate=swap(original,"import * as nodeBulkCryptoFunctionSources from './attribute-owner-bulk-crypto-source.mjs';",'const nodeBulkCryptoFunctionSources='+JSON.stringify(functionSources)+';');
candidate=swap(candidate,"value(nodeVersionField)==='20.19.4'","value(nodeVersionField)==='20.20.2'");
candidate=candidate.replace(/from '(\.\/[^']+)';/gu,(_whole,specifier)=>'from '+JSON.stringify(new URL(specifier,pathToFileURL(target)).href)+';');
const path=resolve(base,'crypto-profile-candidate.mjs');writeFileSync(path,candidate,{flag:'wx'});
const before=await import(pathToFileURL(target).href),after=await import(pathToFileURL(path).href);
const originalReady=before.originalAttributeOwnerBulkCryptoReady(),candidateReady=after.originalAttributeOwnerBulkCryptoReady();
assert.equal(originalReady,false);
assert.equal(candidateReady,true,'separately pinned current runtime must qualify the unchanged remaining checks');
const update=Object.getOwnPropertyDescriptor(Hash.prototype,'update');let changedReady;
try{
  Object.defineProperty(Hash.prototype,'update',{...update,value:function(...args){return Reflect.apply(update.value,this,args);}});
  changedReady=after.originalAttributeOwnerBulkCryptoReady();
  assert.equal(changedReady,false,'an observed wrapper must refuse');
}finally{Object.defineProperty(Hash.prototype,'update',update);}
assert.equal(after.originalAttributeOwnerBulkCryptoReady(),true,'restore exact original wrapper');
const result={schema:'finite-current-node-crypto-profile-probe-v1',runtime:process.versions.node,official,
  original:{path:target,source:original,sha256:digest(original)},
  candidate:{path,source:candidate,sha256:digest(candidate)},functionSources,
  originalReady,candidateReady,changedReady,restoredReady:after.originalAttributeOwnerBulkCryptoReady(),
  productionSourceModified:false,privateIssuerChanged:false,sourceAuthority:false,
  performanceQualified:false,runtimeParity:false,
  scope:'One finite ABI qualification/refusal experiment; production integration, complete CST source equations, full receiving files, actual complete output equivalence and original deadlines remain unrun.'};
const raw=Buffer.from(JSON.stringify(result)),output=resolve(root,'ci-logs/issue-784-restart-2/current-node-crypto-profile-probe.json.gz');
assert.ok(raw.length<1024*1024);writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.ok(gunzipSync(readFileSync(output)).equals(raw));
console.log(JSON.stringify({output,logicalBytes:raw.length,sha256:digest(raw),originalReady,candidateReady,changedReady,restoredReady:result.restoredReady,performanceQualified:false}));
