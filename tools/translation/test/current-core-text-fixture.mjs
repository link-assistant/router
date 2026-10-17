// Expected native-library refusals are a test oracle, never a source permit.
// Keep complete real source/Cargo inputs and the old full parent evolution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const archive=readFileSync(new URL('fixtures/current-core-text-sources.json.gz',import.meta.url));
assert.equal(hash(archive),"7b9031cb5861d93177469b27b91bd844a3150767d14d004e081a02f382e19bbe");const raw=gunzipSync(archive,{maxOutputLength:4194304});assert.equal(hash(raw),"661d6bfeda36b9b18bdd5fa142eb36ccb36b38a7a82bb611b7124de3542d9cd1");const oracle=JSON.parse(raw);
assert.equal(oracle.schema,'current-core-text-source-fixtures-v1');
for(const row of oracle.inputs){const source=read(row.path);assert.equal(source,row.source,row.path);assert.equal(Buffer.byteLength(source),row.bytes);assert.equal(hash(source),row.sha256);}
const dependencyInputs={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
export function currentCoreOptions(files){return {entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies,deriveDependencies};}
function context(path,name,source){const rows=oracle.contexts.filter(row=>row.path===path&&row.name===name);assert.equal(rows.length,1);const row=rows[0];assert.equal(read(path),row.parent);assert.equal(hash(row.parent),row.parentSha256);assert.equal(row.parent.slice(row.span.start,row.span.end),source);assert.equal(row.source,source);assert.equal(hash(source),row.sourceSha256);return row;}
export function currentCoreFiles(path,name,source){const row=context(path,name,source);return {...row.files};}
export function assertCurrentCoreRefusals(result,path,name,source){const row=context(path,name,source);assert.deepEqual(result.meta.refused,row.expectedRefusals);assert.equal(row.expectedRefusals.length,11);}
export function currentTextParent(fixture,current){
 const row=oracle.textParents.find(row=>row.path===fixture.path);assert.ok(row);const before=row.before.source;assert.equal(hash(before),fixture.fileSha256);assert.equal(row.before.sha256,fixture.fileSha256);assert.equal(hash(before.slice(fixture.start,fixture.end)),fixture.bodySha256);
 const parsed=transportConcreteSyntaxSource(before,{language:'Rust'}),applied=applyConcreteSyntaxSubstitutions(parsed.document,{languageRules:[{id:'text-fixture:retain-complete-Rust-source',edits:[]}],repositoryRules:[{id:'text-fixture:replay-owned-primitive-adoption',edits:row.edits.map(({span,expected,replacement})=>({span,expected,replacement}))}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));assert.equal(after.source,current);assert.equal(hash(current),row.afterSha256);
 let inverse=current;for(const edit of [...row.edits].reverse()){assert.equal(inverse.slice(...edit.afterSpan),edit.replacement);inverse=inverse.slice(0,edit.afterSpan[0])+edit.expected+inverse.slice(edit.afterSpan[1]);}assert.equal(inverse,before);assert.equal(hash(current.slice(...row.span)),row.bodySha256);
 return row;
}
