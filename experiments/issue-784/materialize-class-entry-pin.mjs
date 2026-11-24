// Install only the complete output retained from the actual class producer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {renderClassProgramStorage} from '../../tools/translation/class-program-storage.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const packed=readFileSync('ci-logs/issue-784-restart-2/source-producer-mismatches.json.gz');
assert.equal(hash(packed),'9758b50750dd24f1aecc9590b0db83a7cf10c52eafd95edc3994349689c81a5d');
const saved=JSON.parse(gunzipSync(packed,{maxOutputLength:4194304}));
assert.equal(saved.schema,'source-producer-mismatch-diagnostic-v1');
const {plan}=saved,{leaf}=plan,storage=leaf.storage;
assert.equal(plan.files.length,13);assert.equal(plan.selections.length,24);
for(const row of plan.files)assert.equal(readFileSync('tools/translation/'+row.path,'utf8'),row.afterSource);
assert.equal(leaf.path,'tools/translation/extensions/original-class-definition-birth.mjs');
assert.equal(readFileSync(leaf.path,'utf8'),leaf.beforeSource);
assert.equal(storage.source,leaf.beforeSource);assert.equal(storage.text,leaf.afterSource);
assert.equal(storage.inverse,leaf.beforeSource);
assert.equal(transportConcreteSyntaxMeta(storage.beforeMeta).source,leaf.beforeSource);
assert.equal(transportConcreteSyntaxMeta(storage.afterMeta).source,leaf.afterSource);
const before=JSON.parse(storage.beforeProgramJson),after=JSON.parse(storage.programJson);
const host=readFileSync('tools/translation/extensions/host-contracts.mjs');
assert.deepEqual(before.entry.sourcePin,{bytes:120652,sha256:'dcc451eae9dd895e6580c44be5c31cd3f36a439ba0140b418be508d167ec4d37'});
assert.deepEqual(after.entry.sourcePin,{bytes:host.length,sha256:hash(host)});
const restored=JSON.parse(storage.programJson);restored.entry.sourcePin=before.entry.sourcePin;
assert.equal(JSON.stringify(restored),storage.beforeProgramJson,'every other complete PROGRAM value is unchanged');
const fresh=renderClassProgramStorage({source:leaf.beforeSource,programText:storage.programJson});
assert.equal(fresh.text,leaf.afterSource);assert.equal(fresh.programJson,storage.programJson);
writeFileSync(leaf.path,fresh.text);
const receipt={path:leaf.path,beforeSha256:hash(leaf.beforeSource),afterSha256:hash(fresh.text),
 beforeEntry:before.entry.sourcePin,afterEntry:after.entry.sourcePin,
 all13ClassOutputsUnchanged:true,onlyCompleteCurrentEntryPinChanged:true,
 completeProducerProposal:'ci-logs/issue-784-restart-2/source-producer-mismatches.json.gz',
 sourceAuthority:false,runtimeAuthority:false};
writeFileSync('ci-logs/issue-784-restart-2/class-entry-install.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
