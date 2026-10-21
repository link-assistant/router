import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {currentCoreFacadeLaterHistory,restoreCorePrimitiveReceivingHistory} from './fixtures/facade-ast-receiving-history.mjs';
import {completeOwnedCoreSourceFixture} from './complete-core-source-fixture.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {cargoLayoutManifestMatches} from '../cargo-layout-input-compatibility.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
// Expected native-library refusals are a test oracle, never a source permit.
// Keep complete real source/Cargo inputs and the old full parent evolution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),read=path=>readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
const archive=readFileSync(new URL('fixtures/current-core-text-sources.json.gz',import.meta.url));
assert.equal(hash(archive),"358aa7749c5d305caed2b75eec91ac2cfce2a79cc684e55fd425a49eb5f67ad4");const raw=gunzipSync(archive,{maxOutputLength:4194304});assert.equal(hash(raw),"d484c8599546faebc8f1cde10fe85a4559ba617b50efb98f3ead806d0afd7f8d");const oracle=JSON.parse(raw);
assert.equal(oracle.schema,'current-core-text-source-fixtures-v1');
const CORE_BASE64_ADOPTION="\nmod base64;\npub use self::base64::{\n    Base64Error, base64_standard_decode_owned_text, base64_standard_decode_text,\n    base64_standard_encode_bytes, base64_standard_encode_owned_bytes, base64_standard_encode_text,\n    base64_standard_no_pad_decode_text, base64_standard_no_pad_encode_text,\n    base64_url_no_pad_decode_owned_text, base64_url_no_pad_decode_text,\n    base64_url_no_pad_encode_array32, base64_url_no_pad_encode_bytes,\n    base64_url_no_pad_encode_owned_bytes, base64_url_no_pad_encode_owned_text,\n};\n";
function currentCoreFacadeHistory(){
 const row=oracle.inputs.find(row=>row.path==='src/translation_core.rs');assert.ok(row);assert.equal(hash(row.source),row.sha256);assert.equal(Buffer.byteLength(row.source),row.bytes);
 const actual=read(row.path);assert.equal(actual,ROUTER_FORMATTING_FACADE_SOURCE);const later=currentCoreFacadeLaterHistory(actual);const anchor='pub use self::ranges::f64_inclusive_contains;\n';assert.equal(row.source.split(anchor).length,2);const target=row.source.replace(anchor,()=>anchor+CORE_BASE64_ADOPTION);assert.equal(target,later.before);
 const equation=transportConcreteSourceEquations([{before:row.source,after:target,language:'Rust'}])[0],before={meta:equation.beforeMeta},applied={trace:equation.trace},after={source:equation.after,meta:equation.afterMeta};assert.equal(after.source,target);
 const restored={source:equation.inverse,meta:equation.beforeMeta};assert.equal(restored.source,row.source);
 return {before:row.source,actual,beforeMeta:before.meta,afterMeta:later.afterMeta,inverseMeta:restored.meta,trace:[...applied.trace,...later.trace],compilerAuthority:false,base64History:{before:row.source,actual:target,beforeMeta:before.meta,afterMeta:after.meta,inverseMeta:restored.meta,trace:applied.trace},laterHistory:later};
}
export function currentCoreReceivingFiles(path,name,source){
 const files=currentCoreFiles(path,name,source),history=currentCoreFacadeHistory();assert.equal(files['src/translation_core.rs'],history.before);const current={...files,'src/translation_core.rs':history.actual};const primitivePath='src/translation_core/primitives.rs',actualPrimitive=read(primitivePath);assert.equal(files[primitivePath],restoreCorePrimitiveReceivingHistory(actualPrimitive));current[primitivePath]=actualPrimitive;return completeOwnedCoreSourceFixture(current);
}

// The added complete library stays explicitly untranslated in this fixture.
// Retain every original refusal and independently specify every new one.
function receivingBase64LibraryRefusals(){
 const file='src/translation_core/base64.rs',source=read(file);assert.equal(source,ROUTER_CORE_BASE64_SOURCE);
 const names=['base64_standard_encode_bytes','base64_standard_encode_text','base64_standard_encode_owned_bytes','base64_standard_no_pad_encode_text','base64_url_no_pad_encode_bytes','base64_url_no_pad_encode_owned_bytes','base64_url_no_pad_encode_owned_text','base64_url_no_pad_encode_array32','base64_standard_decode_text','base64_standard_decode_owned_text','base64_standard_no_pad_decode_text','base64_url_no_pad_decode_text','base64_url_no_pad_decode_owned_text'];
 const functions=sourceItems(source).filter(row=>row.term==='fn');assert.deepEqual(functions.map(row=>row.name),names);
 return functions.map(item=>{const decode=item.name.includes('_decode_'),ownedBytes=['base64_standard_encode_owned_bytes','base64_url_no_pad_encode_owned_bytes'].includes(item.name),marker=decode?'Outcome<':ownedBytes?'::std::vec::Vec<u8>':'::base64::Engine::encode(',start=source.indexOf(marker,item.start);assert.ok(start>=item.start&&start<item.end);return {file,module:['translation_core','base64'],name:item.name,term:'fn',kind:decode?'unsupported':'syntax',message:decode?'type Outcome<…>: generic types are outside the portable core':ownedBytes?'expected identifier in type but found "::"':'expected an expression but found "::"',span:{start,end:start+(decode?'Outcome'.length:2)}};});
}
function receivingAsciiLibraryRefusal(mappedOriginalRefusals){
 const file='src/translation_core/primitives.rs',source=read(file),before=restoreCorePrimitiveReceivingHistory(source);
 const original=sourceItems(before).find(item=>item.term==='fn'&&item.name==='unicode_scalar_count'),added=sourceItems(source).filter(item=>item.term==='fn'&&item.start>=before.length);
 assert.ok(original);assert.deepEqual(added.map(item=>item.name),['ascii_chars_in']);
 const first=source.indexOf('Str',original.start),item=added[0],start=source.indexOf('Str',item.start);
 assert.equal(source.slice(first-8,first+3),'value: &Str');assert.equal(source.slice(start-8,start+3),'value: &Str');assert.ok(start<item.end);
 const mapped=mappedOriginalRefusals.find(row=>row.name==='translation_core.primitives.unicode_scalar_count');assert.ok(mapped);assert.equal(mapped.message,'unknown type crate.translation_core.primitives.Str');
 const globalStart=mapped.span.start-first+start;
 return {file,name:'translation_core.primitives.ascii_chars_in',term:'fn',kind:'type',message:'unknown type crate.translation_core.primitives.Str',span:{start:globalStart,end:globalStart+3}};
}
export function assertCurrentCoreReceivingRefusals(result,path,name,source){
 const row=context(path,name,source),old=row.expectedRefusals;assert.equal(old.length,11);const split=old.findIndex(entry=>!Object.hasOwn(entry,'module'));assert.ok(split>0);assert.ok(old.slice(0,split).every(entry=>Object.hasOwn(entry,'module')));assert.ok(old.slice(split).every(entry=>!Object.hasOwn(entry,'module')));const history=currentCoreFacadeHistory(),delta=history.base64History.actual.length-history.before.length;assert.equal(delta,CORE_BASE64_ADOPTION.length);const late=old.slice(split).map(entry=>{assert.equal(entry.file,'src/translation_core/primitives.rs');assert.equal(entry.kind,'type');assert.ok(['translation_core.primitives.unicode_scalar_count','translation_core.primitives.json_index_str','translation_core.primitives.json_index_usize'].includes(entry.name));assert.deepEqual(Object.keys(entry.span),['start','end']);return {...entry,span:{start:entry.span.start+delta+history.laterHistory.delta,end:entry.span.end+delta+history.laterHistory.delta}};});const expected=[...old.slice(0,split),...receivingBase64LibraryRefusals(),...late,receivingAsciiLibraryRefusal(late)];assert.equal(expected.length,25);assert.deepEqual(result.meta.refused,expected);
}

for(const row of oracle.inputs){let source=row.path==='src/translation_core/primitives.rs'?restoreCorePrimitiveReceivingHistory(read(row.path)):read(row.path);if(row.path==='src/translation_core.rs')source=currentCoreFacadeHistory().before;if(row.path==='Cargo.toml'){assert.equal(cargoLayoutManifestMatches(source,row.sha256),true);source=row.source;}assert.equal(source,row.source,row.path);assert.equal(Buffer.byteLength(source),row.bytes);assert.equal(hash(source),row.sha256);}
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
