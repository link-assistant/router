// Run the original complete reviewer; compress its complete report for retention.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gzipSync, gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {reviewTranslationDraft} from '../../scripts/review-translation-draft.mjs';

const output = 'ci-logs/issue-784-restart-2/current-ec600-independent-current-review.json.gz';
const report = reviewTranslationDraft({root: process.cwd()});
assert.equal(report.headSha, 'ec6005a8358428a560bb7c685d52a32b174a74f6');
assert.equal(report.baselineSha, null);
const raw = Buffer.from(JSON.stringify(report));
const packed = gzipSync(raw);
assert.ok(packed.length < 1500000, 'Retained review exceeds reserved evidence budget');
writeFileSync(output, packed, {flag: 'wx'});
assert.ok(gunzipSync(readFileSync(output)).equals(raw));
console.log(JSON.stringify({output, bytes: packed.length,
  sha256: createHash('sha256').update(packed).digest('hex'),
  totals: report.totals, outputFiles: report.outputs.length,
  runtimeParity: report.runtimeParity, fullGatePass: report.fullGatePass}));
