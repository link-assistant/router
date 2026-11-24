// Independent generic carrier SOURCE. All new implementation and cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareGenericOptionCarrierSources} from '../../prepare-generic-option-carrier-sources.mjs';
import {projectHttpResourceUnitJavaScript} from '../../http-resource-unit-signatures.mjs';
const limits={timeout:60000};
const imports=`import {router_option_identity as option} from './runtime/primitive-option-runtime.mjs';
`;
const source=imports+`type Carrier<Payload> = ReturnType<typeof option<Payload>>;
type T = boolean;
export function plain<T>(value:T):T{return value;}
export function identity<T>(value:Carrier<T>):Carrier<T>{return value;}
export function forwarded<T>(value:Carrier<T>):Carrier<T>{const alias:Carrier<T>=identity<T>(value);return plain<Carrier<T>>(alias);}
export function inferred<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return identity(plain(value));}
export function booleans(value:Carrier<boolean>){return identity<boolean>(value);}
export function strings(value:Carrier<string>){return identity<string>(value);}
`;
function input(value,sourcePath='caller.mts',receiving=httpResourceReceivingData){return {sourcePath,...receiving([{path:sourcePath,source:value}])};}
test('actual qualified carrier signatures retain payload generics through aliases and whole-value forwarding',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/fn identity<T>\(value: Option<T>\) -> Option<T>/u);assert.match(result.rust,/fn strings\(value: Option<String>\) -> Option<String>/u);assert.match(result.javascript,/@type \{ReturnType<typeof option<boolean>>\}/u);assert.doesNotMatch(result.javascript,/@type \{boolean\}.*value/u);
 const rows=JSON.parse(result.meta).functions;for(const name of ['identity','forwarded','inferred']){const row=rows.find(row=>row.name===name);assert.equal(row.genericIdentity.carrier,'option');assert.equal(row.parameters[0].type,'optional:generic:T');assert.equal(row.returns,'optional:generic:T');}
 await verifyHttpResourceTargets(result,api=>{const payload=new Proxy({},{get(){throw Error('opaque payload');},ownKeys(){throw Error('opaque payload');}}),some=Object.freeze({$:'Some',field0:payload}),none=Object.freeze({$:'None'});for(const name of ['identity','forwarded','inferred']){assert.strictEqual(api[name](some),some);assert.strictEqual(api[name](some).field0,payload);assert.strictEqual(api[name](none),none);}for(const value of [false,true])assert.deepEqual(api.booleans({$:'Some',field0:value}),{$:'Some',field0:value});for(const value of ['','é😀','\0'])assert.deepEqual(api.strings({$:'Some',field0:value}),{$:'Some',field0:value});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical native signatures aliases and raw-generic forwarding reproduce every source token',limits,async()=>{
 const native='pub fn raw<T>(value: T) -> T { value }\npub fn identity<T>(value: Option<T>) -> Option<T> { value }\npub fn forwarded<T>(value: Option<T>) -> Option<T> { let alias = identity(value); raw(alias) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/ReturnType<typeof http_operation_[0-9]+<T>>/u);assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);await verifyHttpResourceTargets(result,api=>{const input=Object.freeze({$:'Some',field0:Object.freeze({owned:true})});assert.strictEqual(api.forwarded(input),input);});
});
test('pure original Some/None and propagation bodies retain complete source inverses and precise Option headers',limits,async()=>{
 const native=`pub fn branches<T>(value: Option<T>) -> Option<T> { if let Some(value) = value { return Some(value); } else { return None; } }
pub fn tails<T>(value: Option<T>) -> Option<T> { if let Some(payload) = value { Some(payload) } else { return None; } }
pub fn alternative<T>(value: Option<T>) -> Option<T> { let Some(payload) = value else { return None; }; Some(payload) }
pub fn propagation<T>(value: Option<T>) -> Option<T> { let payload: T = value?; return Some(payload); }
pub fn typed<T>(value: Option<T>) -> Option<T> { let alias: Option<T> = value; alias }
`,result=translateHttpResourceShadowCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}),history=result.httpResourceRustSourceHistory;assert.equal(history.equation.inverse,native);assert.equal(history.lexicalBindings.equation.inverse,native);assert.equal(history.lexicalBindings.selections.filter(row=>row.kind==='generic-option-unchanged-payload-body').length,4);assert.match(result.rust,/fn branches<T>\(value: Option<T>\) -> Option<T>/u);assert.doesNotMatch(history.normalizedSource,/if let|value\?/u);await verifyHttpResourceTargets(result,api=>{const payload=Object.freeze({owned:true});for(const name of ['branches','tails','alternative','propagation','typed']){assert.equal(api[name]({$:'Some',field0:payload}).field0,payload);assert.deepEqual(api[name]({$:'None'}),{$:'None'});}});
});
test('explicit inner payload arguments retain complete carrier docs including signed and unsigned ingress guards',limits,async()=>{
 const native='pub fn identity<T>(value: Option<T>) -> Option<T> { value }\npub fn signed(value: Option<i64>) -> Option<i64> { identity(value) }\npub fn unsigned(value: Option<u64>) -> Option<u64> { identity(value) }\n',projected=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}),typed=projected.typescript.replace('return identity(value);','return identity<ReturnType<typeof signed_type>>(value);');
 // The signed type alias below is a real imported ABI, never a domain flag.
 const explicit='import {router_integer_i64_saturating_add as signed_type} from "./runtime/integer-runtime.mjs";\n'+typed,result=translateHttpResourceCallerTypeScript(explicit,input(explicit));assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/@type \{ReturnType<typeof .*<ReturnType<typeof signed_type>>/u);await verifyHttpResourceTargets(result,api=>{for(const value of [-9223372036854775808n,0n,9223372036854775807n])assert.deepEqual(api.signed({$:'Some',field0:value}),{$:'Some',field0:value});for(const value of [0n,18446744073709551615n])assert.deepEqual(api.unsigned({$:'Some',field0:value}),{$:'Some',field0:value});assert.throws(()=>api.signed({$:'Some',field0:9223372036854775808n}),RangeError);assert.throws(()=>api.unsigned({$:'Some',field0:-1n}),RangeError);});
});
test('physical paired JS input proposals preserve the precise generic Option signature and reject changed behavior',limits,()=>{
 const javascript='export function identity(value){return value;}\n',typescript=imports+'export function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value;}\n',unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},options=httpResourceReceivingData([{path:'caller.mjs',source:javascript},{path:'caller.mts',source:typescript}]),proposal=projectHttpResourceUnitJavaScript(javascript,{unit,current:{TypeScript:typescript},options});assert.equal(proposal.history.original,javascript);assert.match(proposal.source,/@param \{ReturnType<typeof paired_http_input_[0-9]+<T>>\}/u);const result=translateHttpResourceCallerJavaScript(proposal.source,input(proposal.source,'caller.mjs'));assert.equal(JSON.parse(result.meta).functions[0].genericIdentity.carrier,'option');const changed=proposal.source.replace('return value','return true');assert.throws(()=>translateHttpResourceCallerJavaScript(changed,input(changed,'caller.mjs')));
});
test('carrier scalar callback body and explicit payload mismatches remain refused',limits,()=>{
 for(const declaration of [
  'function identity<T>(value:ReturnType<typeof option<T>>):T{return value;}',
  'function identity<T>(value:T):ReturnType<typeof option<T>>{return value;}',
  'function identity<T>(value:ReturnType<typeof option<boolean>>):ReturnType<typeof option<boolean>>{return value;}',
  'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{const alias=value;return value;}',
  'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value.field0;}',
  'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value as T;}',
  'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value!;}',
  'function identity<ReturnType>(value:ReturnType<typeof option<ReturnType>>):ReturnType<typeof option<ReturnType>>{return value;}',
  'function identity<T extends boolean>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value;}',
  'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return option(value);}',
 ]){const value=imports+declaration;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declaration);}
 const identity=imports+'function identity<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return value;}\n';for(const body of ['export function bad(){return identity(true);}','export function bad(value:ReturnType<typeof option<boolean>>){return identity<bigint>(value);}','export function bad<T>(value:T):T{return identity(value);}','export function bad<T>(value:ReturnType<typeof option<T>>):ReturnType<typeof option<T>>{return identity<ReturnType<typeof option<T>>>(value);}'])assert.throws(()=>translateHttpResourceCallerTypeScript(identity+body,input(identity+body)),body);
 const callback=identity+'import {router_option_u64_some as some} from "./runtime/primitive-option-runtime.mjs";\nimport {router_option_callback_u64_to_u64_map as map} from "./runtime/primitive-option-callback-runtime.mjs";\nexport function bad(){return map(some(1n),identity);}';assert.throws(()=>translateHttpResourceCallerTypeScript(callback,input(callback,'caller.mts',httpResourceOptionCallbackReceivingData)));
});
test('public meta copied source joins and changed generic libraries cannot replace fresh whole source checking',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='identity').genericIdentity.carrier=null;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));for(const path of ['src/translation_primitive_option_core.rs','runtime/primitive-option-runtime.mjs','runtime/primitive-option-runtime.d.mts']){const changed=input(source);changed.files=changed.files.map(row=>row.path===path?{...row,source:row.source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerTypeScript(source,changed));}
});
test('pure branch selection never hides fallback effects or changed payloads',limits,()=>{
 for(const body of ['if let Some(payload) = value { Some(payload) } else { return Some(true); }','if let Some(payload) = value { Some(false) } else { return None; }','if let Some(mut payload) = value { Some(payload) } else { return None; }','let Some(payload) = value else { identity::<T>(None); return None; }; Some(payload)','let payload = value?; Some(true)']){const native='pub fn bad<T>(value: Option<T>) -> Option<T> { '+body+' }';try{const plan=normalizeHttpResourceRustBindings(native);assert.equal(plan.selections.some(row=>row.kind==='generic-option-unchanged-payload-body'),false);}catch(error){assert.ok(error instanceof TypeError);}assert.throws(()=>translateHttpResourceShadowCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}),body);}
});
test('fourteen complete carrier compiler equations retain both ordered phases original owners and source inverses',limits,()=>{
 const plan=prepareGenericOptionCarrierSources();assert.equal(plan.files.length,14);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
