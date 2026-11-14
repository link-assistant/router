// Current physical input census only; serialized DATA cannot issue a compiler plan.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {captureBulkDraftInputs} from '../../tools/translation/bulk-draft-inputs.mjs';
const output=process.argv[2];
const head=process.argv[3]??'ec6005a8358428a560bb7c685d52a32b174a74f6';
assert.match(head,/^[a-f0-9]{40}$/u);
assert.match(output??'',/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+-canonical-physical-inputs-[a-z0-9-]+\.json\.gz$/u);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head);
const inputs=captureBulkDraftInputs({root:process.cwd()});
const result={schema:'canonical-physical-installation-inputs-v1',inputs,node:process.versions,
 compilerVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
 gitTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),
 semanticAuthority:false,sourceAuthority:false,privatePlanAuthority:false,runtimeParity:false};
assert.equal(result.compilerVersion,'5.9.3');
const raw=Buffer.from(JSON.stringify(result)),packed=gzipSync(raw);
writeFileSync(output,packed,{flag:'wx'});assert.ok(gunzipSync(readFileSync(output)).equals(raw));
console.log(JSON.stringify({output,bytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex'),
 rust:inputs.corpus.sources.length,cargo:inputs.corpus.cargo.length,compiler:inputs.compiler.length,
 profiles:inputs.profiles.length,typescript:inputs.typescript.length,compilerVersion:result.compilerVersion}));
