// Undo only the rejected template edit through its complete checked inverse.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareCandidateBindingBatches} from '../../tools/translation/prepare-candidate-binding-batches.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
const target='ci-logs/issue-784-restart-2/candidate-binding-batches-rejected-stage-inverse.json.gz';
const plan=prepareCandidateBindingBatches();
const row=plan.files.find(row=>row.path==='tools/translation/prepare-core-sequence-stream-sources.mjs');
if(!row||row.current!==row.after||row.equation.inverse!==row.before)
 throw new TypeError('Only the complete installed rejected source may be inverted');
const native=verifyNativeCopiedSourceBindings(ownershipCompiler(),row.path,row.before);
const raw=Buffer.from(JSON.stringify({schema:'rejected-stage-binding-inverse-v1',row,native,
 receivingPassed:false,semanticAuthority:false,performanceQualified:false}));
const packed=gzipSync(raw);writeFileSync(target,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(raw))throw new TypeError('Complete inverse readback differs');
if(readFileSync(row.path,'utf8')!==row.current)throw new TypeError('Rejected source changed');
writeFileSync(row.path,row.equation.inverse);
console.log(JSON.stringify({path:row.path,completeInverse:true,evidenceBytes:raw.length,
 packedBytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex')}));
