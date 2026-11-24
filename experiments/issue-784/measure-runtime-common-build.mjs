// One complete production build; no case or child deadline is replaced.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildArtifacts} from '../../scripts/regenerate-js-first.mjs';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
assert.equal(process.argv.length,2);
const hash=value=>createHash('sha256').update(value).digest('hex');
const paths=execFileSync('git',['ls-files','-z','--','js/src','js/portable',
 'rust/src/translation_core','rust/src/translation_core.rs','rust/Cargo.toml',
 'rust/Cargo.lock','parity/fixtures/js-first'],{encoding:'utf8',maxBuffer:4194304})
 .split('\0').filter(Boolean);
const inputs=paths.map(path=>({path,source:readFileSync(path,'utf8')}));
const started=performance.now(),artifacts=buildArtifacts(resolve('.'));
const milliseconds=performance.now()-started;
const raw=Buffer.from(JSON.stringify([...artifacts]));
assert.ok(readCompleteEvidenceJson('ci-logs/issue-784-restart-2/reverse-build-complete-output.json').equals(raw));
for(const row of inputs)assert.equal(readFileSync(row.path,'utf8'),row.source,row.path);
const result={schema:'complete-runtime-common-guard-build-measurement-v1',milliseconds,
 outputs:artifacts.size,outputBytes:raw.length,outputSha256:hash(raw),completeOutputEquality:true,
 completeOriginalInputsUnchanged:true,originalDeadlinesQualified:false,
 engine:process.version,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
writeFileSync('ci-logs/issue-784-restart-2/runtime-common-complete-build.json',JSON.stringify(result)+'\n');
console.log(JSON.stringify(result));
