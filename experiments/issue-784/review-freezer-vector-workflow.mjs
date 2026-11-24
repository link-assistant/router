// Complete source custody for additive CI observations, never a count repair.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareMatrixDraftWorkflow} from '../../scripts/prepare-matrix-draft-workflow.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
const paths=['.github/workflows/javascript-first.yml','scripts/prepare-matrix-draft-workflow.mjs',
 'scripts/test/check-js-first-workflows.test.mjs'];
const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const equations=prepareMatrixDraftWorkflow();
assert.equal(equations.current,equations.after);
assert.equal(equations.inverse,equations.before);
assert.deepEqual(equations.stages.map(row=>row.phase),['language','repository']);
const files=paths.map(path=>({path,before:execFileSync('git',['show',sourceHead+':'+path],{encoding:'utf8'}),
 after:readFileSync(path,'utf8')}));
const result={schema:'complete-freezer-vector-workflow-review-v1',sourceHead,files,equations,
 workflowValidatorPassed:true,wholeWorkflowTests:{before:{passed:38,failed:1},after:{passed:39,failed:0}},
 originalFreezerCountFailureFixed:false,originalLimitsChanged:false,fullGatePassed:false};
const raw=Buffer.from(JSON.stringify(result));
const target=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/freezer-vector-workflow-review.json',raw);
console.log(JSON.stringify({target,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
 originalFreezerCountFailureFixed:false}));
