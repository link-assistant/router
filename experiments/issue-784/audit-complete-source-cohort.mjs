// Diagnostic only: parse every original forward test source without executing
// its cases. This qualifies launcher source preparation, never runtime parity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCaseDeadlineAudit} from '../../scripts/node-case-deadlines.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const directories=['tools/translation/test','tools/translation/serialization-schema'];
const files=directories.flatMap(directory=>fs.readdirSync(path.join(root,directory))
 .filter(name=>name.endsWith('.test.mjs')).sort().map(name=>path.join(root,directory,name)));
const started=performance.now();
const result=createCaseDeadlineAudit({root,files}).finish();
assert.equal(result.passed,true,result.errors.join('\n'));
assert.equal(result.sourceRecords.length,files.length);
assert.equal(result.observedCompletedCases,0);
assert.equal(result.originalCaseLimitsChanged,false);
console.log(JSON.stringify({schema:'complete-forward-source-audit-diagnostic-v1',
 files:files.length,sourceBytes:result.sourceRecords.reduce((sum,row)=>sum+row.bytes,0),
 sources:result.sourceRecords.map(({source,...row})=>row),
 unobservedFiniteSourceDeadlines:result.unobservedFiniteSourceDeadlines.length,
 elapsedMs:performance.now()-started,memory:process.memoryUsage(),
 node:process.versions,typescript:result.typescript,sourcePreparationPassed:true,
 casesExecuted:0,completeGatePassed:false,runtimeParity:false,rustExecuted:false}));
