import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
import {prepareRuntimeImportCurrentSources} from '../../tools/translation/prepare-runtime-import-current-sources.mjs';
const plan=prepareRuntimeImportCurrentSources();
const raw=Buffer.from(JSON.stringify(plan));assert.ok(raw.length<32*1024*1024);
const path=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-runtime-import-composition-proposal.json',raw);
console.log(JSON.stringify({path,files:plan.files.map(row=>({path:row.path,beforeBytes:Buffer.byteLength(row.before),afterBytes:Buffer.byteLength(row.after),inverse:row.equation.inverse===row.before})),bytes:statSync(path).size,installed:false}));
