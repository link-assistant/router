// Independent physical-layout inverse regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {crateRelativeRustSourcePath} from '../repository-layout.mjs';
import {translateOwnedStateRust as stateInverse} from '../js-to-rust/owned-rust.mjs';
import {translateOwnedStateRust as outcomeInverse} from '../js-to-rust/owned-outcome-rust.mjs';
import {translateOwnedStateRust as moduleInverse} from '../js-to-rust/owned-module-rust-source.mjs';
import {translateOwnedStateRust as scalarModuleInverse} from '../js-to-rust/owned-module-scalar-rust-source.mjs';
import {translateOwnedStateRust as cancellationInverse} from '../js-to-rust/owned-cancellation-rust.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript,ownedStateRuntimeSources} from '../js-to-rust/owned-state.mjs';
import {ownedStateReceivingData} from '../js-to-rust/test/owned-state-receiving-data.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text,json_macro_array as array} from '../json-macro-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareInverseRustLayoutSources} from '../prepare-inverse-rust-layout-sources.mjs';
const limits={timeout:60000},common=['src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','src/translation_collections_core.rs','src/translation_state_core.rs','src/translation_json_fields_core.rs'];
test('only the declared root rust/src prefix changes its guard label and every other physical source label remains intact',limits,()=>{
 for(const path of [...common,'src/sse.rs','src/caller.rs']){assert.equal(crateRelativeRustSourcePath(path),path);assert.equal(crateRelativeRustSourcePath('rust/'+path),path);}for(const path of ['packages/rust/src/caller.rs','arust/src/lib.rs','rust/src-old/lib.rs','rust/rust/src/lib.rs','rust/tests/oracle.rs','js/src/caller.mjs',null,undefined])assert.equal(crateRelativeRustSourcePath(path),path);
});
const variants=[['state',stateInverse,[]],['outcome',outcomeInverse,['src/translation_carriers_core.rs','src/translation_integer_core.rs','src/translation_text_core.rs','src/translation_owned_results_core.rs']],['module',moduleInverse,['src/translation_carriers_core.rs','src/translation_integer_core.rs','src/translation_stream_core.rs','src/sse.rs']],['scalar module',scalarModuleInverse,['src/translation_carriers_core.rs','src/translation_integer_core.rs','src/translation_stream_core.rs','src/sse.rs']],['cancellation',cancellationInverse,['src/translation_carriers_core.rs','src/translation_async_control_core.rs','src/translation_http_protocol_core.rs','src/translation_http_transport_core.rs']]];
for(const [name,inverse,extra]of variants)test(name+' retains every original native-library refusal at both logical and physical Rust source paths',limits,()=>{
 for(const path of [...common,...extra])for(const sourcePath of [path,'rust/'+path])assert.throws(()=>inverse('pub fn placeholder(){}',{context:null,sourcePath,javascriptPath:'js/src/caller.mjs'}),/canonical caller inverse cannot rewrite its native library/u,sourcePath);assert.throws(()=>inverse('pub fn caller(){}',{context:null,sourcePath:'rust/src/caller.rs',javascriptPath:'js/src/caller.mjs'}),error=>!/canonical caller inverse cannot rewrite its native library/u.test(error.message));
});
test('an actual receiving caller keeps physical Rust JS and TS source identities while complete private checking reproduces Rust',limits,async()=>{
 const javascriptPath='js/src/caller.mjs',sourcePath='rust/src/caller.rs',typescriptOutputPath='ts/src/caller.ts',source="import {router_core_json_copy as copy} from '../runtime/json-update-runtime.mjs';\n/** @param {import('../runtime/json-macro-runtime.mjs').JsonValue} value */\nexport function copied(value){return copy(value);}\n",native=ownedStateReceivingData().files.filter(row=>!row.path.startsWith('runtime/')),data={runtimeRoot:'js/runtime',declarationRoot:'ts/runtime',files:[...native,...ownedStateRuntimeSources('js/runtime','ts/runtime'),{path:javascriptPath,source}]},before=new Map(native.map(row=>[row.path,row.source])),first=translateOwnedStateJavaScript(source,{context:createOwnedStateContext(data),sourcePath:javascriptPath,typescriptOutputPath});data.files.push({path:sourcePath,source:first.rust},{path:typescriptOutputPath,source:first.typescript});const result=stateInverse(first.rust,{context:createOwnedStateContext(data),sourcePath,javascriptPath,typescriptOutputPath}),history=result.ownedRustSourceHistory;assert.equal(history.sourcePath,sourcePath);assert.equal(history.javascriptPath,javascriptPath);assert.equal(history.source,first.rust);assert.equal(history.equation.inverse,first.rust);assert.equal(transportConcreteSyntaxMeta(history.concreteSyntax).source,first.rust);assert.ok(sameRustSourceSyntax(first.rust,result.rust));assert.equal(history.sourceAuthority,false);assert.equal(history.semanticAuthority,false);assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);for(const [path,source]of before)assert.equal(data.files.find(row=>row.path===path).source,source);
 await verifyTypedTargets({javascript:result.javascript,typescript:result.typescript,meta:{entry:'src/caller.rs'}},(_api,_result,module)=>{for(const value of [nil(),boolean(false),text('é😀'),array([nil(),boolean(false)])])assert.deepEqual(module.copied(value),value);},{childTimeoutMs:20000});
});
test('seven complete source equations retain every original guard owner both phases and full inverse',limits,()=>{
 const plan=prepareInverseRustLayoutSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
