// Independent all-width scalar source/domain rules SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourcePublicInputDomain,httpResourceOwnedSignatureDomain} from '../http-resource-public-domains.mjs';
import {httpResourceCallerContract,httpResourceCallerRustType} from '../http-resource-caller-contracts.mjs';
import {httpResourceNativeDomain} from '../http-resource-native-domains.mjs';
import {resourceIntegerLiteral,resourceIntegerGuard} from '../http-resource-integer-domains.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareResourceIntegerDomainSources} from '../../prepare-resource-integer-domain-sources.mjs';
const limits={timeout:60000},widths=[['u8',0n,255n],['u16',0n,65535n],['u32',0n,4294967295n],['u64',0n,18446744073709551615n],['u128',0n,340282366920938463463374607431768211455n],['i8',-128n,127n],['i16',-32768n,32767n],['i32',-2147483648n,2147483647n],['i64',-9223372036854775808n,9223372036854775807n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
const message=type=>type==='u64'?'Control u64 input outside native range':type==='i64'?'Resource i64 input outside native range':'Resource '+type+' input outside native range';
const guard=(type,minimum,maximum,name='value')=>'if(typeof '+name+'!=="bigint"||'+name+'<'+minimum+'n||'+name+'>'+maximum+'n){throw new RangeError('+JSON.stringify(message(type))+');}';
const imports=widths.map(([type])=>'import {router_integer_'+type+'_saturating_add as add_'+type+'} from "./runtime/integer-runtime.mjs";').join('
')+'
';
const source=imports+widths.map(([type,minimum,maximum])=>`export function display_${type}(value:ReturnType<typeof add_${type}>){${guard(type,minimum,maximum)}return String(value);}
export function increment_${type}(value:ReturnType<typeof add_${type}>):ReturnType<typeof add_${type}>{${guard(type,minimum,maximum)}return add_${type}(value,1n);}
`).join('
')+`export function local_i8():ReturnType<typeof add_i8>{let value=-1n;return value;}
export function assign_i8(value:ReturnType<typeof add_i8>){${guard('i8',-128n,127n)}let current=add_i8(value,0n);current=-1n;return String(current);}
export function negative_left_i8(value:ReturnType<typeof add_i8>){${guard('i8',-128n,127n)}return -1n<value;}
`;
const input=(value=source,sourcePath='caller.mts')=>({sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])});
test('all ten scalar ABI domains retain independent guards literals operation signatures and narrower container refusals',limits,()=>{
 for(const [type,minimum,maximum]of widths){assert.equal(httpResourcePublicInputDomain(type),false);assert.equal(httpResourcePublicInputDomain(type,{guarded:true}),true);assert.equal(httpResourceOwnedSignatureDomain(type),true);assert.equal(httpResourceCallerRustType(type),type);assert.equal(httpResourceNativeDomain(type),type);assert.equal(httpResourceCallerContract('router_integer_'+type+'_saturating_add').ret,type);assert.equal(resourceIntegerGuard(type).minimum,minimum.toString());assert.equal(resourceIntegerGuard(type).maximum,maximum.toString());assert.equal(resourceIntegerLiteral(maximum+'n',false,type),maximum.toString());assert.equal(resourceIntegerLiteral((maximum+1n)+'n',false,type),null);if(minimum<0n){assert.equal(resourceIntegerLiteral((-minimum)+'n',true,type),minimum.toString());assert.equal(resourceIntegerLiteral((-minimum+1n)+'n',true,type),null);}if(!['u64','i64'].includes(type)){assert.equal(httpResourcePublicInputDomain('optional:'+type),false);assert.equal(httpResourcePublicInputDomain('optional:'+type,{guarded:true}),true);}}
 for(const type of ['usize','isize','f64','String','__proto__'])assert.throws(()=>resourceIntegerGuard(type));
});
test('twenty-three actual width operations and display/local callers receive independent JS strict TS and canonical native inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);const functions=JSON.parse(result.meta).functions;for(const [type]of widths){const row=functions.find(row=>row.name==='display_'+type);assert.equal(row.parameters[0].type,type);assert.equal(row.inputGuards[0].type,type);assert.equal(row.flow.tail.value.value.type,type);}
 await verifyHttpResourceTargets(result,async api=>{for(const [type,minimum,maximum]of widths){assert.equal(api['display_'+type](minimum),minimum.toString());assert.equal(api['display_'+type](maximum),maximum.toString());assert.equal(api['increment_'+type](maximum),maximum);assert.equal(api['increment_'+type](0n),1n);for(const value of [minimum-1n,maximum+1n,0])assert.throws(()=>api['display_'+type](value),RangeError);}assert.equal(api.local_i8(),-1n);assert.equal(api.assign_i8(0n),'-1');assert.equal(api.negative_left_i8(0n),true);assert.equal(api.negative_left_i8(-2n),false);});
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('all-width canonical native scalar parameters literals and formatting preserve original fixed-width identity',limits,()=>{
 for(const [type,minimum,maximum]of widths){for(const native of ['pub fn display(value: '+type+') -> String { crate::translation_core::format!("{}", value) }
','pub fn literal() -> '+type+' { '+minimum+'_'+type+' }
','pub fn literal() -> '+type+' { '+maximum+'_'+type+' }
']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust),native);}}
});
test('missing or differing original entry guards and out-of-range scalar literals cannot be supplied by type metadata',limits,()=>{
 for(const [type,minimum,maximum]of widths){const good=guard(type,minimum,maximum);for(const wrong of ['',guard(type,minimum,maximum+1n),good.replace(message(type),'wrong domain')]){const value=imports+'export function bad(value:ReturnType<typeof add_'+type+'>){'+wrong+'return value;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),type);}for(const literal of [minimum-1n,maximum+1n]){const value=imports+'export function bad(){return add_'+type+'('+literal+'n,0n);}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),type);}}
 const value=imports+'export function bad(value:ReturnType<typeof add_i8>){'+guard('i16',-32768n,32767n)+'return value;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)));
});
test('whole-source scalar metadata cannot be replayed after a width or original source change',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='display_i8').parameters[0].type='i16';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));const changed=source.replace('return String(value);','return String(add_u8(value,1n));');assert.throws(()=>readHttpResourceCallerMeta(result.meta,changed,input(),{language:'TypeScript'}));
});
test('seventeen complete compiler equations retain all original source owners language/repository stages and full source inverses',limits,()=>{
 const plan=prepareResourceIntegerDomainSources();assert.equal(plan.files.length,17);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
