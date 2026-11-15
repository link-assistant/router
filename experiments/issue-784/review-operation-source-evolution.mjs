// Independent complete before/after review of the operation-source repair.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareOperationProofByteSources} from '../../tools/translation/prepare-operation-proof-byte-sources.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const plan=prepareOperationProofByteSources(),row=plan.files[0],history=plan.sourceEvolution;
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalOutput=execFileSync('git',['show','7dceb9b0a545aa5c61f078920d966d6220e355b1:'+row.path],{encoding:'utf8'});
const oldImport="from './original-lexing-intrinsics.mjs';",newImport="from './guarded-proof-lexing-intrinsics.mjs';";
assert.equal(originalOutput.split(oldImport).length,2);
assert.equal(originalOutput.replace(oldImport,newImport),row.after);
assert.equal(readFileSync(row.path,'utf8'),row.after);
assert.equal(hash(history.equation.source),history.originalSha256);
assert.equal(hash(history.equation.text),plan.input.sha256);
assert.equal(history.equation.source,history.equation.inverse);
for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.completeInverse,true);
}
assert.equal(readFileSync(plan.input.path,'utf8'),plan.input.source);
const raw=Buffer.from(JSON.stringify(plan)+'\n'),packed=gzipSync(raw,{level:9});
assert.deepEqual(gunzipSync(packed),raw);
writeFileSync('ci-logs/issue-784-restart-2/operation-source-plan.json.gz',packed);
const receipt={typescriptVersion:plan.typescriptVersion,originalPin:history.originalSha256,currentSourceSha256:plan.input.sha256,originalOutputSha256:hash(originalOutput),generatedOutputSha256:hash(row.after),onlyGeneratedChange:'complete native lexing import module literal',phases:row.stages.map(stage=>stage.phase),fullCstInverses:true,originalBodyAndBudgetsPreserved:true,proposalRawBytes:raw.length,proposalPackedBytes:packed.length,proposalSha256:hash(packed),runtimeQualified:false,fullGatePass:false};
writeFileSync('ci-logs/issue-784-restart-2/operation-source-review.json',JSON.stringify(receipt)+'\n');
console.log(JSON.stringify(receipt));
