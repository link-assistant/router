// Receive the complete one-parent diagnostic; this is not the whole CSV suite.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {verifyTypedTargets} from '../../tools/translation/test/typed-targets.mjs';

const input='ci-logs/issue-784-restart-2/csv-current-ordinary-config-parser.json.gz';
const output='ci-logs/issue-784-restart-2/csv-current-ordinary-config-parser-receiving.json.gz';
const packed=readFileSync(input),record=JSON.parse(gunzipSync(packed,{maxOutputLength:32*1024*1024}));
assert.equal(record.mode,'ordinary');
assert.equal(record.sourceSha256,'9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a');
const cases=[['',[]],[', ,',[]],['alpha, beta,alpha',['alpha','beta','alpha']],
 ['\u0085猫\u0085,\u2003😀\u2028,\ufeffkeep\ufeff',['猫','😀','\ufeffkeep\ufeff']],
 ['a\0b,e\u0301\u200d',['a\0b','e\u0301\u200d']]];
let receivers=0;
await verifyTypedTargets(record,api=>{
 receivers++;for(const [source,expected]of cases)assert.deepEqual(api.parse_csv(source),expected);
 for(const value of [null,1,{},'\ud800','\udc00'])assert.throws(()=>api.parse_csv(value),TypeError);
},{childTimeoutMs:20000});
assert.equal(receivers,2);
const raw=Buffer.from(JSON.stringify({schema:'ordinary-original-config-csv-receiving-v1',
 input,inputBytes:packed.length,inputSha256:createHash('sha256').update(packed).digest('hex'),
 completeParentSourceSha256:record.sourceSha256,cases,receivers,
 wholeLibraryQualified:false,productionExecutableGain:0,fullGatePassed:false})+'\n');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(raw.toString());
