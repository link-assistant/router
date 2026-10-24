// Independent runtime packaging and source-span regression SOURCE. Unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createForwardProjectRuntimeMapping} from '../forward-project-runtime-mapping.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
const limits={timeout:60000},canonical='rust/src/lib.mjs',physical='js/src/deep/nested/project.mjs';
const relocate=(mapping,source,extra={})=>mapping.rewrite({source,language:'JavaScript',sourcePath:canonical,targetPath:physical,fromRoot:'runtime',toRoot:'js/runtime',...extra});
test('static repeated export and dynamic runtime edges change only exact native spans and retain inverse bytes',limits,()=>{
 const source='// ../../runtime/effects.mjs is trivia Ω😀\nimport {withEffectCapabilities} from "../../runtime/effects.mjs";\nexport {withEffectCapabilities as again} from \'../../runtime/effects.mjs\';\nexport const later=()=>import("../../runtime/effects.mjs");\nexport const text="../../runtime/effects.mjs";\n',mapping=createForwardProjectRuntimeMapping(),row=relocate(mapping,source);assert.deepEqual(row.keys,['effects.mjs']);assert.equal(row.history.inverse,source);assert.ok(row.source.includes('from "../../../runtime/effects.mjs"'));assert.ok(row.source.includes('export const text="../../runtime/effects.mjs"'));const inverse=mapping.rewrite({source:row.source,language:'JavaScript',sourcePath:physical,targetPath:canonical,fromRoot:'js/runtime',toRoot:'runtime'});assert.equal(inverse.source,source);mapping.verify();
});
test('flat target placement relocates effects and retains both exact registered source implementations',limits,()=>{
 const mapping=createForwardProjectRuntimeMapping(),source='import {withEffectCapabilities} from "../../runtime/effects.mjs";\n',row=relocate(mapping,source,{targetPath:'js/src/project.mjs'});assert.equal(row.source,'import {withEffectCapabilities} from "../runtime/effects.mjs";\n');const closure=mapping.sources('js/runtime',row.keys),effects=effectRuntimeAssets();assert.equal(closure.find(row=>row.path==='js/runtime/effects.mjs').source,effects.javascript);assert.equal(closure.find(row=>row.path==='js/runtime/effects.d.mts').source,effects.declarations);assert.equal(new Set(closure.map(row=>row.path)).size,closure.length);mapping.verify();
});
test('native TypeScript import queries retain strict declaration edges and their full inverse',limits,()=>{
 const source="export type Capability=typeof import('../../runtime/effects.mjs').withEffectCapabilities;\n",mapping=createForwardProjectRuntimeMapping(),row=relocate(mapping,source,{language:'TypeScript',sourcePath:'rust/src/lib.mts',targetPath:'ts/src/project.mts',toRoot:'ts/runtime'});assert.equal(row.source,"export type Capability=typeof import('../runtime/effects.mjs').withEffectCapabilities;\n");assert.equal(row.history.inverse,source);assert.ok(mapping.sources('ts/runtime',row.keys).some(row=>row.path==='ts/runtime/effects.d.mts'));
});
test('scalar-only source needs no runtime source tree and preserves complete bytes',limits,()=>{const source='export const result=true; // Ω😀\n',mapping=createForwardProjectRuntimeMapping(),row=relocate(mapping,source);assert.equal(row.source,source);assert.equal(row.history,null);assert.deepEqual(mapping.sources('js/runtime',row.keys),[]);mapping.verify();});
test('unknown bare escaping malformed computed and unregistered runtime module edges refuse',limits,()=>{
 for(const source of ['import x from "unknown-package";','import "../../other/private.mjs";','import "../../runtime/not-registered.mjs";','export const x=import(name);','import { from "../../runtime/effects.mjs";'])assert.throws(()=>relocate(createForwardProjectRuntimeMapping(),source));for(const extra of [{targetPath:'../escape.mjs'},{fromRoot:'/runtime'},{toRoot:'js/../runtime'},{language:'Unknown'}])assert.throws(()=>relocate(createForwardProjectRuntimeMapping(),'export const x=true;',extra));
});
