// Preserve a complete fresh Node source-DATA plan received by Bun.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {freshNodeRuntimeImportSourceData} from '../../tools/translation/owned-runtime-node-source-data.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const ts=ownershipCompiler(),before=ownershipCompilerRuntimeNativeCurrent(ts),started=performance.now(),plan=freshNodeRuntimeImportSourceData(process.cwd());
assert.equal(before,false);assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),before);
const raw=Buffer.from(JSON.stringify(plan)),packed=gzipSync(raw),output='ci-logs/issue-784-restart-2/runtime-node-source-data-plan.json.gz';
writeFileSync(output,packed,{flag:'wx'});assert.equal(gunzipSync(readFileSync(output)).equals(raw),true);
console.log(JSON.stringify({logicalBytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),packedBytes:packed.length,elapsedMs:performance.now()-started,files:plan.files.map(row=>({path:row.path,currentMatchesAfter:row.current===row.after,afterSha256:row.afterSha256})),nativeAuthorityBefore:before,nativeAuthorityAfter:ownershipCompilerRuntimeNativeCurrent(ts),semanticAuthority:false}));
