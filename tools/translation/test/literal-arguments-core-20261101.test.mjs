// Independent owned-domain cases. SOURCE ONLY: every case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {receiveLiteralArgumentsCoreProfile} from './literal-arguments-core-20261101-receiving.mjs';
import {proposeLiteralArgumentsCoreProfile,visitLiteralArgumentsCoreSourceEquations} from '../literal-arguments-core-20261101-profile.mjs';
import {compileLiteralArgumentsCoreProject} from '../literal-arguments-core-20261101-project.mjs';
import {withLiteralArgumentsCore,checkLiteralArgumentsCore} from '../literal-arguments-core-20261101.mjs';
import * as runtime from '../literal-arguments-core-20261101-runtime.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE,LITERAL_ARGUMENTS_FACADE_SOURCE} from '../literal-arguments-core-20261101-source.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),limits={timeout:60000};
const prefix='pub mod translation_core;\n',make=(text='')=>'crate::translation_core::literal_arguments!('+text+')',inspect=(kind,value)=>'crate::translation_core::literal_arguments_'+kind+'('+value+')';
const whole=`${prefix}
#[derive(Clone,Copy)] pub enum Choice { A, B }
pub fn duplicate(input:&[Choice])->Vec<Choice>{input.iter().copied().collect()}
pub fn zero_count()->u64{${inspect('piece_count',make())}}
pub fn empty_count()->u64{${inspect('piece_count',make('""'))}}
pub fn zero_empty()->bool{${inspect('is_empty',make())}}
pub fn empty_empty()->bool{${inspect('is_empty',make('""'))}}
pub fn unicode_bytes()->u64{let value=${make('"é東京😀"')};${inspect('byte_len','value')}}
pub fn braces_bytes()->u64{${inspect('byte_len',make('"{} {{}}"'))}}
pub fn edited_bytes()->u64{${inspect('byte_len',make('"ORIGINAL_LITERAL"'))}}
`;
function request(source=whole){return {entry:'src/lib.rs',manifest,lock,files:[
 {path:'src/lib.rs',source},{path:'src/translation_core.rs',source:LITERAL_ARGUMENTS_FACADE_SOURCE},
 {path:'src/translation_core/literal_arguments_core_20261101.rs',source:LITERAL_ARGUMENTS_LEAF_SOURCE},
 {path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},
 {path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE},
]};}
const verification=[{name:'zero_count',kind:'u64',value:'0'},{name:'empty_count',kind:'u64',value:'1'},{name:'zero_empty',kind:'bool',value:true},{name:'empty_empty',kind:'bool',value:true},{name:'unicode_bytes',kind:'u64',value:'12'},{name:'braces_bytes',kind:'u64',value:'7'},{name:'duplicate',kind:'nominal',tags:['A','B','A']}];
function receive(t,payload){return receiveLiteralArgumentsCoreProfile(t,payload,{startedAt:performance.now()});}
function success(received){assert.equal(received.result.ok,true,JSON.stringify(received.result.error));return received.result.result;}
function refused(received,name){if(received.result.ok){const result=received.result.result;assert.equal(result.meta.executable.some(row=>row.name===name||row.name.endsWith('.'+name)),false,JSON.stringify(result.meta.refused));assert.ok(result.meta.refused.length||result.meta.unloweredItems.length);}else assert.equal(typeof received.result.error.message,'string');}
test('complete0713 successor preserves original sources, ordered CST equations and uninstalled status',limits,()=>{
 const proposal=proposeLiteralArgumentsCoreProfile();assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.predecessor,'nominal-copy-collection-20261101');assert.ok(proposal.substitutions.some(row=>row.path==='tools/translation/type-layout.mjs'));assert.ok(proposal.substitutions.some(row=>row.path==='tools/translation/extensions/source-links.mjs'));
 const phases=proposal.ruleTrace.map(row=>row.phase);assert.deepEqual([...new Set(phases)],['language','repository']);let count=0;visitLiteralArgumentsCoreSourceEquations(({history})=>{assert.equal(typeof history.inverse,'string');assert.ok(history.beforeMeta);assert.ok(history.afterMeta);count++;});assert.equal(count,proposal.substitutions.length*2);
 assert.throws(()=>compileLiteralArgumentsCoreProject(request()),/physical source differs|not installed/);
});
test('owned static carrier preserves raw braces, Unicode bytes, empty-piece distinctions, and mixed genuine nominal caller in JS and strictTS5.9.3',limits,t=>{
 const received=receive(t,{request:request(),operation:'compile',verify:verification}),result=success(received);
 for(const name of verification.map(row=>row.name))assert.ok(result.meta.executable.some(row=>row.name===name||row.name.endsWith('.'+name)),JSON.stringify(result.meta.refused));
 assert.equal(result.counts,'fixed-u64');assert.equal(result.stdArgumentsAbi,false);assert.equal(result.builtinOwnerResolved,false);assert.equal(result.actualInvocationObserved,false);assert.equal(result.productionOutputExecutable,false);assert.equal(result.asStrSupported,false);assert.ok(result.nominalCopyCollections.owners.length);
 assert.equal(received.result.reports.some(row=>row.stage==='compiler-version'&&row.version==='5.9.3'),true);assert.equal(received.result.reports.some(row=>row.stage==='strict-typescript'&&row.passed),true);assert.equal(received.report.cleanupSucceeded,true);
});
for(const language of ['JavaScript','TypeScript'])test(language+' actual emitted literal edit becomes changed native literal and freshly reproduced paired targets',limits,t=>{
 const received=receive(t,{request:request(),operation:'inverse',language,before:'ORIGINAL_LITERAL',after:'é東京',verify:[...verification,{name:'edited_bytes',kind:'u64',value:'8'}]}),result=success(received);
 assert.equal(result.editedOwnedLiteralInverse,true);assert.ok(result.proposal.rustEdits.some(row=>row.path==='src/lib.rs'&&row.after.includes('"é東京"')));assert.equal(result.checkedChangedProject.sources.find(row=>row.path==='src/lib.rs').source,result.changedRequest.files.find(row=>row.path==='src/lib.rs').source);assert.equal(result.stdArgumentsAbi,false);
 for(const row of result.proposal.rustEdits)assert.equal(row.history.inverse,row.before);
});
test('fresh whole meta reissue rejects changed public DATA',limits,t=>{success(receive(t,{request:request(),operation:'meta'}));const bad=receive(t,{request:request(),operation:'meta',mutate:true});assert.equal(bad.result.ok,false);assert.match(bad.result.error.message,/meta differs/);});
for(const [name,body] of [
 ['unit native construction','let value=crate::translation_core::LiteralArguments;'+inspect('byte_len','value')],
 ['record native construction','let value=crate::translation_core::LiteralArguments {};'+inspect('byte_len','value')],
 ['direct native data constructor',inspect('byte_len','crate::translation_core::LiteralArguments()')],
 ['reserved generated carrier unit','let value=ml_LiteralArgumentsCoreStatic;'+inspect('byte_len','value')],
 ['reserved generated carrier record','let value=ml_LiteralArgumentsCoreStatic {};'+inspect('byte_len','value')],
 ['reserved generated carrier call',inspect('byte_len','ml_LiteralArgumentsCoreStatic()')],
 ['direct hidden static constructor',inspect('byte_len','crate::translation_core::__literal_arguments_from_static(&["text"])')],
 ['runtime expression',inspect('byte_len',make('String::from("text")'))],
 ['parenthesized literal',inspect('byte_len',make('("text")'))],
 ['multiple runtime pieces',inspect('byte_len',make('"a","b"'))],
 ['named captured arguments',inspect('byte_len',make('"{value}",value=1_u64'))],
 ['mutable local','let mut value='+make('"a"')+';'+inspect('byte_len','value')],
 ['duplicate consumption','let value='+make('"a"')+';let first='+inspect('byte_len','value')+';'+inspect('byte_len','value')],
 ['borrowed carrier',inspect('byte_len','&'+make('"a"'))],
])test(name+' cannot bypass original type/source/linear closure',limits,t=>refused(receive(t,{request:request(prefix+'pub fn attempted()->u64{'+body+'}'),operation:'compile'}),'attempted'));
for(const [name,mutate]of [
 ['altered actual leaf',input=>input.files.find(row=>row.path.endsWith('literal_arguments_core_20261101.rs')).source+='\n// source mismatch'],
 ['altered actual facade',input=>input.files.find(row=>row.path==='src/translation_core.rs').source+='\n// source mismatch'],
 ['unknown root attribute',input=>input.files[0].source='#![unknown]\n'+input.files[0].source],
 ['standard root shadow',input=>input.files[0].source+='\nmod std {}\n'],
 ['wrong explicit edition',input=>input.manifest=input.manifest.replace('edition = "2024"','edition = "2021"')],
])test(name+' retains complete original refusal',limits,t=>{const input=request(prefix+'pub fn attempted()->u64{'+inspect('byte_len',make('"a"'))+'}');mutate(input);refused(receive(t,{request:input,operation:'compile'}),'attempted');});
for(const implementation of [
 'impl ::std::ops::Drop for crate::translation_core::LiteralArguments{fn drop(&mut self){panic!("custom drop")}}',
 'impl ::std::ops::Drop for crate::translation_core::LiteralArguments{fn drop(&mut self){}}',
 'impl ::std::marker::Copy for crate::translation_core::LiteralArguments{}',
 'impl UnknownTrait for UnknownTarget{}',
])test('external custom/duplicate carrier or unresolved impl cannot change the owned boundary: '+implementation,limits,t=>{
 const source=prefix+implementation+'pub fn attempted()->u64{'+inspect('byte_len',make('"a"'))+'}';refused(receive(t,{request:request(source),operation:'compile'}),'attempted');
});
test('public flags and fabricated syntax never issue a carrier receipt; falsy/frozen primaries remain exact',limits,()=>{
 assert.throws(()=>checkLiteralArgumentsCore({}, {k:'literalArgumentsCoreCall',verified:true,span:{start:0,end:1}},null,[],null));
 for(const primary of [undefined,null,false,0,'',Object.freeze(Error('frozen'))]){let caught=false;try{withLiteralArgumentsCore(()=>{throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);}
 assert.throws(()=>compileLiteralArgumentsCoreProject({...request(),ownerVerified:true}),/exact complete bounded project request/);
});
test('caught source mismatch restored before closing still poisons original operation',limits,t=>{const received=receive(t,{request:request(),operation:'source-poison'});assert.equal(received.result.ok,false);assert.doesNotMatch(received.result.error.message,/did not poison/);});
test('independent runtime guards enforce custody, one consumption, scalar-valid UTF8 and unchanged2MiB cap',limits,()=>{
 const e=runtime.literal_arguments_empty,s=runtime.literal_arguments_literal;
 assert.equal(runtime.literal_arguments_piece_count(e()),0n);assert.equal(runtime.literal_arguments_piece_count(s('')),1n);assert.equal(runtime.literal_arguments_is_empty(e()),true);assert.equal(runtime.literal_arguments_is_empty(s('')),true);assert.equal(runtime.literal_arguments_byte_len(s('é東京😀')),12n);assert.equal(runtime.literal_arguments_byte_len(s('{} {{}}')),7n);
 const value=s('x');assert.equal(runtime.literal_arguments_is_empty(value),false);assert.throws(()=>runtime.literal_arguments_byte_len(value));
 for(const bad of [{$:'ml_LiteralArgumentsCoreStatic'},Object.freeze({$:'ml_LiteralArgumentsCoreStatic'}),structuredClone(s('x')),null])assert.throws(()=>runtime.literal_arguments_piece_count(bad));
 for(const bad of ['\ud800','\udc00','a'.repeat(2097153),'😀'.repeat(524289)])assert.throws(()=>s(bad));assert.equal(runtime.literal_arguments_byte_len(s('😀'.repeat(524288))),2097152n);assert.throws(()=>e('extra'));assert.throws(()=>s('x','extra'));
});

test('closing source failures retain falsy and frozen exact primary identity with cleanup',limits,t=>{const received=receive(t,{request:request(),operation:'primary-source-close'});assert.equal(success(received).allExactPrimariesPreserved,true);assert.equal(received.report.cleanupSucceeded,true);});
