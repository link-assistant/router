// Finite healthy-domain timing only; hostile-domain receiving remains separate.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {originalPrivateParserNumericCommonIntrinsicsUnchanged as numeric,
 originalPrivateParserDescriptorCommonIntrinsicsUnchanged as batched} from '../../tools/translation/original-json-intrinsics.mjs';
const functions={numeric,batched},runs=[];
for(const fn of [numeric,batched])assert.equal(fn(),true);
for(const name of ['numeric','batched','batched','numeric','numeric','batched']){
 const start=performance.now();let passes=0;
 for(let index=0;index<2000;index++)if(functions[name]())passes++;
 assert.equal(passes,2000);runs.push({name,calls:2000,passes,elapsedMs:performance.now()-start});
}
const result={schema:'finite-healthy-private-common-guard-timing-v1',node:process.versions.node,runs,
 sourceChanged:false,hostileDomainQualified:false,performanceQualified:false};
writeFileSync('ci-logs/issue-784-restart-2/private-common-guard-timing.json.gz',gzipSync(Buffer.from(JSON.stringify(result)),{mtime:0}),{flag:'wx'});
console.log(JSON.stringify(result));
