import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {prepareExecutableCheckedSource,composeExecutableCheckedSource,prepareCurrentExecutableCheckedSource} from '../prepare-executable-checked-source.mjs';
import {prepareSourceLifetimeRefusalBatches} from '../prepare-source-lifetime-refusal-batches.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sameType} from '../checked-types.mjs';
import {createHash} from 'node:crypto';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex'),limits={timeout:60000};
function input(source,extra={}){return {'src/lib.rs':'pub mod translation_core;'+source,'src/translation_core.rs':facade,'src/translation_core/primitives.rs':primitives,'src/translation_core/ranges.rs':ranges,'src/translation_core/base64.rs':base64,'src/translation_core/json_collections.rs':collections,...extra};}
function project(files){return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});}

test('complete checked-source layer joins the unchanged lifetime birth and retains both CST phases and full inverse',limits,()=>{
 const plan=prepareExecutableCheckedSource(),birth=prepareSourceLifetimeRefusalBatches(),row=plan.files[0],current=prepareCurrentExecutableCheckedSource();
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.lowerAPIUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.semanticAuthority,false);
 assert.equal(row.current,current.files.find(final=>final.path===row.path).after);assert.equal(row.before,plan.input.source);assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));assert.equal(row.inverse,row.before);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 const prior=Object.fromEntries(birth.files.map(part=>[part.path,part]));assert.equal(prior[row.path].after,row.before);const composed=composeExecutableCheckedSource(prior);assert.equal(composed.sources[row.path].after,row.after);assert.equal(composed.historicalSources,prior);
 assert.throws(()=>composeExecutableCheckedSource({...prior,[row.path]:{...prior[row.path],after:prior[row.path].after+' '}}),/preceding complete project equation/u);
 assert.equal(current.layers.length,2);assert.equal(current.layers[1].files.find(part=>part.path===row.path).before,row.after);
 for(const final of current.layers[1].files){assert.equal(final.current,final.after);assert.equal(final.inverse,final.before);assert.equal(transportConcreteSyntaxMeta(final.beforeMeta).source,final.before);assert.equal(transportConcreteSyntaxMeta(final.afterMeta).source,final.after);assert.deepEqual(final.trace.map(part=>part.phase),['language','repository']);assert.ok(final.nativeCopies);}
});

test('same-invocation accessor retains source Vec identity and checked body while lower keeps its portable contract',limits,()=>{
 const files=input('pub fn values()->Vec<u8>{crate::translation_core::vec![1u8]}'),result=project(files),carrier=result.executableDeclarations.find(row=>row.qualifiedName==='values');assert.ok(carrier);
 const lowered=carrier.lower(),first=carrier.checkedSource(),second=carrier.checkedSource();
 assert.equal(first.schema,'original-checked-executable-source-v1');assert.equal(first.source,'src/lib.rs');assert.equal(first.sourceSha256,hash(files[first.source]));assert.equal(first.qualifiedName,'values');assert.deepEqual(first.module,[]);assert.deepEqual(first.span,carrier.span);assert.deepEqual(first.checkedSpan,first.declaration.span);
 assert.equal(first.sourceSignature.ret.rustOwnership.source,'Vec');assert.equal(first.declaration.body.compatibilityCore.id,'router-core-vector-list-v1');assert.ok(sameType(first.declaration.ret,lowered.own.ret));assert.deepEqual(carrier.lower(),lowered);
 assert.notEqual(first,second);assert.notEqual(first.declaration,second.declaration);assert.notEqual(first.declaration.body,second.declaration.body);assert.ok(Object.isFrozen(first.declaration.body));assert.throws(()=>{first.declaration.body.items.length=0;},TypeError);
 result.meta.checkedSemanticProgram={forged:true};assert.deepEqual(carrier.checkedSource(),second,'public serialized metadata is not the captured original checker');
 const start=carrier.span.start;carrier.span.start++;assert.throws(()=>carrier.checkedSource(),/association differs/u);carrier.span.start=start;assert.deepEqual(carrier.checkedSource(),second);
});

test('fresh source replacements nested module coordinates and fixed-array signatures cannot borrow an old Vec source identity',limits,()=>{
 const files=input('pub mod lists;',{'src/lists.rs':'pub mod nested {pub fn same()->Vec<bool>{crate::translation_core::vec![true]}}'}),first=project(files),carrier=first.executableDeclarations.find(row=>row.qualifiedName==='lists.nested.same'),captured=carrier.checkedSource();
 assert.equal(captured.source,'src/lists.rs');assert.deepEqual(captured.module,['lists','nested']);assert.equal(files[captured.source].slice(captured.span.start,captured.span.end),'pub fn same()->Vec<bool>{crate::translation_core::vec![true]}');
 files['src/lists.rs']='pub mod nested {pub fn same()->[bool;1]{[true]}}';const second=project(files),changed=second.executableDeclarations.find(row=>row.qualifiedName==='lists.nested.same').checkedSource();
 assert.notEqual(changed.sourceSha256,captured.sourceSha256);assert.equal(changed.sourceSignature.ret.rustFixedArray.length,1);assert.equal(changed.sourceSignature.ret.rustOwnership.source,'array');assert.equal(carrier.checkedSource().sourceSha256,captured.sourceSha256);
 assert.notEqual(changed.declaration.body.compatibilityCore?.id,'router-core-vector-list-v1');assert.equal(first.meta.refused.some(row=>row.name==='lists.nested.same'),false);assert.equal(second.meta.refused.some(row=>row.name==='lists.nested.same'),false);
});
