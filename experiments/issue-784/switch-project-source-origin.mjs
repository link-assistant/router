// Retain a complete author proposal, then select only its reviewed project source.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {prepareProjectSourceOriginCst} from '../../tools/translation/prepare-project-source-origin-cst.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
const mode=process.argv[2];assert.ok(['review-before','before','after'].includes(mode));assert.equal(process.argv.length,3);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const proposal=prepareProjectSourceOriginCst(),project=proposal.files.find(row=>row.path==='tools/translation/project.mjs');
assert.ok(project);assert.ok(project.current===project.before||project.current===project.after);
if(mode==='review-before'){
 const bindings=verifyNativeCopiedModuleBindings(ownershipCompiler(),proposal.files.map(row=>({path:resolve(row.path),source:row.after})));
 assert.ok(bindings.every(row=>row.nativeSemanticScopeChecked));
 const raw=Buffer.from(JSON.stringify({proposal,bindings})),packed=gzipSync(raw);
 const target='ci-logs/issue-784-restart-2/project-source-origin-complete-author-review.json.gz';
 writeFileSync(target,packed,{flag:'wx'});assert.ok(gunzipSync(readFileSync(target)).equals(raw));
 console.log(JSON.stringify({target,bytes:packed.length,decodedBytes:raw.length,sha256:hash(raw),typescriptVersion:'5.9.3',receivingQualified:false}));
}
assert.equal(readFileSync(project.path,'utf8'),project.current);
writeFileSync(project.path,mode==='after'?project.after:project.before);
console.log(JSON.stringify({mode,projectSourceSha256:hash(readFileSync(project.path)),semanticAuthority:false}));
