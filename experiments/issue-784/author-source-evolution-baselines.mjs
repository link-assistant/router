// One-time source DATA authorship from authenticated complete predecessors.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {deriveProjectMethodOwnerScope} from '../../tools/translation/project-method-owner-scope-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const project=readFileSync('experiments/issue-784/project-retention-profile-after.mjs.txt','utf8');
assert.equal(hash(project),'4ad5fc9d1ead75c083d61026468b1577ecd0815338abaaa9a27cc10f0649d960');
const scoped=deriveProjectMethodOwnerScope(ts,project);
assert.equal(scoped.inverse,project);
writeFileSync('experiments/issue-784/project-namespace-profile-before.mjs.txt',scoped.after);
let native=readFileSync('experiments/issue-784/native-regeneration-profile-after.mjs.txt','utf8');
assert.equal(hash(native),'399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362');
for(const [next,previous]of [
 ['// Separate regeneration-only source-origin contract. Public build/parser APIs','// Separate regeneration-only grouped source contract. Public build/parser APIs'],
 ["import {prepareReverseConcreteParsedSourceChunks,assertReverseConcreteSourceHost} from './concrete-source.mjs';","import {prepareReverseConcreteSources,assertReverseConcreteSourceHost} from './concrete-source.mjs';"],
 ['function* nativeRegenerationParsedConcreteSources(', 'function* nativeRegenerationConcreteSources('],
 ['for (const {path,source} of nativeRegenerationParsedConcreteSources(sourceRoot, paths))', 'for (const {path,source} of nativeRegenerationConcreteSources(sourceRoot, paths))'],
 ["    const result=prepareReverseConcreteParsedSourceChunks([rows.map(row=>({source:row.source,language:'JavaScript'}))]);\n    if(result.chunks.length!==1)throw new Error('native concrete source-origin chunk count differs');\n    const batch=result.chunks[0];","    const batch=prepareReverseConcreteSources(rows.map(row=>({source:row.source,language:'JavaScript'})));"],
]){
 assert.equal(native.split(previous).length,2);
 native=native.replace(previous,()=>next);
}
writeFileSync('experiments/issue-784/native-memory-profile-before.mjs.txt',native);
for(const [path,source]of [['project',scoped.after],['native',native]]){
 const file=ts.createSourceFile(path+'.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.deepEqual(file.parseDiagnostics,[]);
 console.log(JSON.stringify({path,bytes:Buffer.byteLength(source),sha256:hash(source),sourceAuthority:false}));
}
