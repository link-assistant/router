// Independent actual native caller/body case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {OwnershipChecker} from '../extensions/ownership.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './owned-text-vector-readonly-typed-targets.mjs';
import {parseRust} from '../extensions/host-contracts.mjs';
import {originalParsedSyntaxNode,originalParsedDeclarationEvidence} from '../extensions/source-links.mjs';
import {prepareNativeHelperSyntaxOriginSources} from '../prepare-native-helper-syntax-origin-sources.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {checkRouterPrimitiveVectorSharedHelperBorrow,qualifyRouterPrimitiveVectorSharedHelperBorrow} from '../router-core-json-updates.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);

function nodes(root){const found=[];let cells=200000;const visit=(value,depth=0)=>{if(!value||typeof value!=='object')return;assert.ok(--cells>=0&&depth<=160);if(typeof value.k==='string')found.push(value);for(const [key,child]of Object.entries(value))if(!['type','span'].includes(key))Array.isArray(child)?child.forEach(item=>visit(item,depth+1)):visit(child,depth+1);};visit(root);return found;}
test('ordinary original bindings and calls retain exact parser object correspondence',limits,()=>{
 const source='// é 🦀\nfn next(value:u8)->u8{value}pub fn run(value:u8)->u8{let mut kept=next(value);kept=next(kept);kept}';
 const surface=parseRust(source),entry=surface.items.find(row=>row.name==='run');assert.ok(entry);assert.ok(originalParsedDeclarationEvidence(entry));
 const selected=nodes(entry).filter(node=>['let','app'].includes(node.k));assert.ok(selected.some(node=>node.k==='let'));assert.ok(selected.some(node=>node.k==='app'));
 for(const node of selected){const origin=originalParsedSyntaxNode(entry,node);assert.equal(origin.actual,node);assert.deepEqual(origin.relocated,node);assert.equal(originalParsedSyntaxNode(entry,structuredClone(node)),null);}
 const clone=structuredClone(entry);for(const node of nodes(clone))assert.equal(originalParsedSyntaxNode(clone,node),null);
});
test('origin registration alone never admits fabricated helper borrows or restores changed parents',limits,()=>{
 const surface=parseRust('fn next(value:u8)->u8{value}pub fn run(value:u8)->u8{let kept=next(value);kept}'),entry=surface.items.find(row=>row.name==='run'),call=nodes(entry).find(node=>node.k==='app');
 const fake={k:'routerTextReference',value:call,sourceBorrowToken:{value:'&',span:{start:0,end:1}}};
 assert.equal(originalParsedSyntaxNode(entry,fake),null);
 const old=call.fn;call.fn={...call.fn,path:['counterfeit']};assert.throws(()=>originalParsedSyntaxNode(entry,call),/changed/u);call.fn=old;
 assert.equal(originalParsedSyntaxNode(entry,call).actual,call);
 assert.equal(checkRouterPrimitiveVectorSharedHelperBorrow({},fake,new Map(),[],undefined),null);
});
test('genuine mutable helper initialization and direct shared helper borrow retain whole native flow',limits,async t=>{
 const n=op=>namespace+'vec_u8_'+op;
 const source=`fn seed(value: ::core::primitive::u8)->::std::vec::Vec<::core::primitive::u8>{${n('from_slice')}(&[value])}
fn count(input:&::std::vec::Vec<::core::primitive::u8>)->::core::primitive::u64{let checked=${n('len')}(input);${n('len')}(input)}
pub fn caller(value: ::core::primitive::u8)->::std::vec::Vec<::core::primitive::u8>{let mut values=seed(value);let checked=count(&values);values=${n('push')}(values,value);values}`;
 const result=project(files(source));assert.equal(admitted(result,'caller'),true,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{for(const value of [0n,255n])assert.deepEqual(api.caller(value),[value,value]);},{childTimeoutMs:20000,recordCompilerVersion:version=>t.diagnostic(JSON.stringify({tool:'TypeScript',version}))});
 const bad=source.replace('let checked=count(&values);','let moved=values;let checked=count(&values);');assert.equal(admitted(project(files(bad)),'caller'),false);
});
test('complete source equations retain all original linker and independent case source',limits,()=>{
 const plan=prepareNativeHelperSyntaxOriginSources();assert.equal(plan.receivingExecuted,false);
 assert.ok(plan.files.some(row=>row.path==='tools/translation/extensions/source-links.mjs'));
 for(const row of plan.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
