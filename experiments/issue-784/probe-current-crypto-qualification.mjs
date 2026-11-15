// Complete runtime function-source comparison; no ABI guard or compiler edit.
import * as crypto from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import * as pinned from '../../tools/translation/attribute-owner-bulk-crypto-source.mjs';
import {originalAttributeOwnerBulkCryptoReady} from '../../tools/translation/attribute-owner-bulk-crypto.mjs';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const version=process.versions.node;
if(process.versions.bun||version!=='20.20.2')throw Error('This finite observation requires actual Node 20.20.2');
const sources={createHash:crypto.createHash,Hash:crypto.Hash,
 ...Object.fromEntries(Object.getOwnPropertyNames(crypto.Hash.prototype).map(name=>
  [name==='constructor'?'Hash':name,Object.getOwnPropertyDescriptor(crypto.Hash.prototype,name).value]))};
if(Object.keys(sources).sort().join(',')!==Object.keys(pinned).sort().join(','))throw Error('Complete original native source domain differs');
const rows=Object.entries(sources).map(([name,fn])=>{
 const actual=Function.prototype.toString.call(fn),original=pinned[name];
 return {name,actual,original,actualSha256:hash(actual),originalSha256:hash(original),equal:actual===original};
});
const guardPath='tools/translation/attribute-owner-bulk-crypto.mjs',guard=readFileSync(guardPath,'utf8');
const ready=originalAttributeOwnerBulkCryptoReady();
if(ready||rows.filter(row=>!row.equal).map(row=>row.name).join(',')!=='Hash')throw Error('Expected the complete constructor refusal, never a version-only qualification');
const record={schema:'actual-node-crypto-source-refusal-v1',node:version,rows,guardPath,guard,
 guardSha256:hash(guard),ready,diagnosticOnly:true,guardChanged:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record));if(raw.length>1048576)throw Error('Finite complete crypto observation bound');
const output='ci-logs/issue-784-restart-2/current-crypto-qualification.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:1048576}).equals(raw))throw Error('Complete runtime source readback differs');
console.log(JSON.stringify({output,bytes:raw.length,sha256:hash(raw),node:version,ready,
 rows:rows.map(({name,equal,actualSha256,originalSha256})=>({name,equal,actualSha256,originalSha256})),
 guardChanged:false,productionExecutableGain:0}));
