// Full source/namespace history cases, not current executed evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {compilationProfile} from '../cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ORDERED_TEXT_MAP_NATIVE_SOURCE} from '../ordered-text-map-20261102-source.mjs';
import {selectOriginalOrderedTextMapCore} from '../ordered-text-map-20261102-interface.mjs';
import {proposeOrderedTextMapSourceCopies} from '../ordered-text-map-20261102-source-copies.mjs';
import {emitOrderedTextMapDeclarations} from '../ordered-text-map-20261102-contracts.mjs';
const limits={timeout:60000};
function input(root='pub mod translation_ordered_text_map_core;',native=ORDERED_TEXT_MAP_NATIVE_SOURCE){
 const profile=compilationProfile(null),modules=[{file:'src/lib.rs',path:[],source:root},{file:'src/translation_ordered_text_map_core.rs',path:['translation_ordered_text_map_core'],source:native}].map(module=>({...module,compilationProfile:profile,configurationCondition:'active',sourceView:captureSourceModuleViews({source:module.source,sourcePath:module.file,compilationProfile:profile}).views[0]}));
 return {modules,sourceScopes:resolveModuleBindings({modules,compilationProfile:profile}).scopes,compilationProfile:profile};
}
test('actual full native source and selected original module edge remain DATA',limits,()=>{
 assert.equal(readFileSync(new URL('../ordered-text-map-20261102-runtime.d.mts',import.meta.url),'utf8'),emitOrderedTextMapDeclarations());
 assert.equal(readFileSync(new URL('../../../rust/src/translation_ordered_text_map_core.rs',import.meta.url),'utf8'),ORDERED_TEXT_MAP_NATIVE_SOURCE);
 const actual=input(),selected=selectOriginalOrderedTextMapCore(actual);assert.equal(selected.source,ORDERED_TEXT_MAP_NATIVE_SOURCE);assert.equal(selected.file,'src/translation_ordered_text_map_core.rs');assert.equal(Object.hasOwn(selected,'typeAuthority'),false);
 const concrete=transportConcreteSyntaxSource(selected.source,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(concrete.meta).source,selected.source);
});
test('copied scopes changed source changed path and attributed or aliased root edges cannot select the core',limits,()=>{
 const actual=input();assert.throws(()=>selectOriginalOrderedTextMapCore({...actual,sourceScopes:structuredClone(actual.sourceScopes)}));
 for(const root of ['', '#[cfg(all())]pub mod translation_ordered_text_map_core;', 'pub mod translation_ordered_text_map_core;use crate::translation_ordered_text_map_core as alias;'])assert.throws(()=>selectOriginalOrderedTextMapCore(input(root)));
 assert.throws(()=>selectOriginalOrderedTextMapCore(input(undefined,ORDERED_TEXT_MAP_NATIVE_SOURCE+'\n// changed\n')));
 const changed={...actual,modules:actual.modules.map(module=>({...module}))};changed.modules[1].file='src/other.rs';assert.throws(()=>selectOriginalOrderedTextMapCore(changed));
 const fabricated=structuredClone(actual);assert.throws(()=>selectOriginalOrderedTextMapCore(fabricated));
});
test('complete original root and interface source copies preserve both ordered phases CST and inverses',limits,()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../../../docs/development/ordered-text-map-20261102/complete-source-draft.json.gz',import.meta.url))));
 const request=packet.equations.map(row=>({path:row.originalPath,source:row.before})),result=proposeOrderedTextMapSourceCopies(request);
 assert.equal(result.rows.length,2);assert.equal(result.sourceAuthority,false);assert.equal(result.privateCallerBindingQualified,false);
 for(let index=0;index<result.rows.length;index++){const row=result.rows[index];assert.equal(row.after,packet.equations[index].after);assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);assert.ok(row.ruleTrace.every(step=>['language','repository'].includes(step.phase)));}
 const changed=structuredClone(request);changed[0].source+='\n';assert.throws(()=>proposeOrderedTextMapSourceCopies(changed));assert.throws(()=>proposeOrderedTextMapSourceCopies(request.slice(1)));
});
