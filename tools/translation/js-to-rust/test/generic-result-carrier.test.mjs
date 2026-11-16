// Independent generic Result carrier SOURCE. Every new case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {projectHttpResourceUnitJavaScript} from '../../http-resource-unit-signatures.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareGenericResultCarrierSources} from '../../prepare-generic-result-carrier-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_text_result_identity as result} from './runtime/owned-result-runtime.mjs';
import {router_option_identity as option} from './runtime/primitive-option-runtime.mjs';
`;
const source=imports+`type ResultCarrier<Payload> = ReturnType<typeof result<Payload>>;
type Optional<Payload> = ReturnType<typeof option<Payload>>;
type T = boolean;
export function raw<T>(value:T):T{return value;}
export function identity<T>(value:ResultCarrier<T>):ResultCarrier<T>{return value;}
export function forwarded<T>(value:ResultCarrier<T>):ResultCarrier<T>{const alias:ResultCarrier<T>=identity<T>(value);return raw<ResultCarrier<T>>(alias);}
export function inferred<T>(value:ResultCarrier<T>):ResultCarrier<T>{return identity(raw(value));}
export function booleans(value:ResultCarrier<boolean>){return identity<boolean>(value);}
export function text(value:ResultCarrier<string>){return identity<string>(value);}
export function nested(value:ResultCarrier<Optional<boolean>>){return identity<Optional<boolean>>(value);}
`;
function input(value,sourcePath='caller.mts',receiving=httpResourceReceivingData){return {sourcePath,...receiving([{path:sourcePath,source:value}])};}
test('actual Result<T,String> headers and linear forwarding preserve opaque values through JS TS meta and native source',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/fn identity<T>\(value: Result<T,String>\) -> Result<T,String>/u);assert.match(result.rust,/fn nested\(value: Result<Option<bool>, String>\) -> Result<Option<bool>, String>/u);for(const name of ['identity','forwarded','inferred']){const row=JSON.parse(result.meta).functions.find(row=>row.name===name);assert.equal(row.genericIdentity.carrier,'text-result');assert.equal(row.parameters[0].type,'http-result:generic:T');assert.equal(row.returns,'http-result:generic:T');}
 await verifyHttpResourceTargets(result,api=>{const payload=new Proxy({},{get(){throw Error('opaque payload');},ownKeys(){throw Error('opaque payload');}}),success=Object.freeze({$:'Ok',field0:payload});for(const name of ['identity','forwarded','inferred']){assert.strictEqual(api[name](success),success);for(const message of ['','é😀','\0']){const failure=Object.freeze({$:'Err',field0:message});assert.strictEqual(api[name](failure),failure);}}for(const value of [false,true])assert.deepEqual(api.booleans({$:'Ok',field0:value}),{$:'Ok',field0:value});assert.deepEqual(api.text({$:'Ok',field0:'é😀'}),{$:'Ok',field0:'é😀'});for(const value of [{$:'None'},{$:'Some',field0:false},{$:'Some',field0:true}])assert.deepEqual(api.nested({$:'Ok',field0:value}),{$:'Ok',field0:value});assert.deepEqual(api.nested({$:'Err',field0:'expected'}),{$:'Err',field0:'expected'});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical native generic Result helpers reproduce their complete actual signatures and concrete nested calls',limits,async()=>{
 const native='pub fn raw<T>(value: T) -> T { value }\npub fn identity<T>(value: Result<T,String>) -> Result<T,String> { value }\npub fn forwarded<T>(value: Result<T,String>) -> Result<T,String> { let alias = identity(value); raw(alias) }\npub fn nested(value: Result<Option<bool>, String>) -> Result<Option<bool>, String> { identity(value) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);assert.match(result.javascript,/router_text_result_identity/u);await verifyHttpResourceTargets(result,api=>{const value=Object.freeze({$:'Ok',field0:{$:'Some',field0:true}});assert.strictEqual(api.nested(value),value);assert.strictEqual(api.forwarded(value),value);});
});
test('written nested Result locals use the actual generic ABI when no finite operation has that return type',limits,async()=>{
 const native='pub fn success() -> Result<Option<bool>, String> { let value: Result<Option<bool>, String> = Ok(None); value }\npub fn failure(error: String) -> Result<Option<bool>, String> { let value: Result<Option<bool>, String> = Err(error); value }\n',result=translateHttpResourceShadowCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);assert.ok(sameRustSourceSyntax(result.httpResourceRustSourceHistory.normalizedSource,result.rust));await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.success(),{$:'Ok',field0:{$:'None'}});assert.deepEqual(api.failure('é😀'),{$:'Err',field0:'é😀'});});
});
test('explicit generic borrowed payloads retain their actual qualified carrier signature and immutable input root',limits,async()=>{
 const value=imports+`import {router_owned_result_str_ok as borrowed} from './runtime/owned-result-runtime.mjs';
function identity<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return value;}
export function selected(value:string){return identity<string>(borrowed(value));}
`,result=translateHttpResourceCallerTypeScript(value,input(value)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@type \{ReturnType<typeof borrowed>\}/u);assert.deepEqual(JSON.parse(result.meta).functions.find(row=>row.name==='selected').flow.returnRoots,['value']);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.selected('é😀'),{$:'Ok',field0:'é😀'});});
});
test('physical paired signature proposals preserve the actual generic Result header instead of widening to bare T',limits,()=>{
 const javascript='export function identity(value){return value;}\n',typescript=imports+'export function identity<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return value;}\n',unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},options=httpResourceReceivingData([{path:'caller.mjs',source:javascript},{path:'caller.mts',source:typescript}]),proposal=projectHttpResourceUnitJavaScript(javascript,{unit,current:{TypeScript:typescript},options}),result=translateHttpResourceCallerJavaScript(proposal.source,input(proposal.source,'caller.mjs'));assert.equal(proposal.history.original,javascript);assert.match(proposal.source,/@param \{ReturnType<typeof paired_http_input_[0-9]+<T>>\}/u);assert.equal(JSON.parse(result.meta).functions[0].genericIdentity.carrier,'text-result');assert.match(result.rust,/Result<T,String>/u);
});
test('carrier and payload mismatches unconsumed aliases constraints and scalar callbacks cannot bypass complete source checking',limits,()=>{
 const prefix=imports+'function identity<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return value;}\n';for(const body of ['export function bad<T>(value:T):T{return identity(value);}','export function bad<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return identity(value);}','export function bad(value:ReturnType<typeof result<boolean>>){return identity<bigint>(value);}','export function bad<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{const alias=value;return value;}','export function bad<T extends boolean>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return value;}','export function bad<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return value as T;}'])assert.throws(()=>translateHttpResourceCallerTypeScript(prefix+body,input(prefix+body)),body);
 const callback=prefix+'import {router_option_u64_some as some} from "./runtime/primitive-option-runtime.mjs";\nimport {router_option_callback_u64_to_u64_map as map} from "./runtime/primitive-option-callback-runtime.mjs";\nexport function bad(){return map(some(1n),identity);}';assert.throws(()=>translateHttpResourceCallerTypeScript(callback,input(callback,'caller.mts',httpResourceOptionCallbackReceivingData)));
});
test('changed actual Result libraries and copied public meta fail fresh source association',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='identity').genericIdentity.carrier='option';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));for(const path of ['src/translation_owned_results_core.rs','runtime/owned-result-runtime.mjs','runtime/owned-result-runtime.d.mts']){const changed=input(source);changed.files=changed.files.map(row=>row.path===path?{...row,source:row.source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerTypeScript(source,changed));}
});
test('thirteen complete generic carrier source equations retain native owners both phases and full original inverses',limits,()=>{
 const plan=prepareGenericResultCarrierSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
