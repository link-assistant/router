// Finite source DATA comparison only. This does not install a source producer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {readCompleteEvidenceJson,writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const prefix='ci-logs/issue-784-restart-2/core-source-current-';
const raw=readCompleteEvidenceJson(prefix+'full-proposal.json');
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(raw),'6a8a17b08e19faa62c58bea28acaf721989f7246bb588b4d01eaaff91517b838');
const original=JSON.parse(raw),groups=[original,original.resolverProducer,
 original.resolverProducer.wholeOwnerProducer],rows=groups.flatMap(group=>group.files);
assert.equal(rows.length,14);
const started=performance.now();
const equations=transportConcreteSourcePhases(rows.map(row=>({before:row.before,
 middle:row.language,after:row.after,language:'JavaScript'})));
const elapsedMs=performance.now()-started;
assert.equal(equations.length,rows.length);
for(let at=0;at<rows.length;at++){
 const row=rows[at],equation=equations[at];
 assert.equal(row.before,equation.before);assert.equal(row.language,equation.middle);
 assert.equal(row.after,equation.after);assert.equal(row.inverse,equation.inverse);
 assert.equal(row.beforeMeta,equation.beforeMeta);assert.equal(row.afterMeta,equation.afterMeta);
 assert.deepEqual(equation.stages.map(stage=>stage.phase),['language','repository']);
}
const record={schema:'complete-Core-source-phase-diagnostic-v1',
 completeDiagnosticSource:readFileSync(new URL(import.meta.url),'utf8'),
 completeOriginalPlanSha256:hash(raw),rows:rows.map(row=>({path:row.path,
 before:row.before,middle:row.language,after:row.after})),equations,elapsedMs,
 originalLimitsChanged:false,installed:false,receivingQualified:false,
 performanceGainProved:false,productionExecutableGain:0};
const result=Buffer.from(JSON.stringify(record));
const output=writeCompleteEvidenceJson(prefix+'phased-probe.json',result);
console.log(JSON.stringify({output,completeResultBytes:result.length,
 completeResultSha256:hash(result),rows:rows.length,elapsedMs,installed:false,
 receivingQualified:false,performanceGainProved:false,productionExecutableGain:0}));
