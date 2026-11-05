// Independent original signed-payload ingress SOURCE; all cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceContainerGuardSources} from '../../prepare-http-resource-container-guard-sources.mjs';
const limits={timeout:60000},minimum=-9223372036854775808n,maximum=9223372036854775807n;
const imports=`import {router_option_i64_some as some,router_option_u64_some as unsignedSome} from './runtime/primitive-option-runtime.mjs';
import {router_owned_result_i64_ok as okay} from './runtime/owned-result-runtime.mjs';
`;
const optionalGuard=name=>'if('+name+'.$==="Some"&&(typeof '+name+'.field0!=="bigint"||'+name+'.field0< -9223372036854775808n||'+name+'.field0>9223372036854775807n)){throw new RangeError("Resource optional i64 input outside native range");}';
const resultGuard=name=>'if('+name+'.$==="Ok"&&(typeof '+name+'.field0!=="bigint"||'+name+'.field0< -9223372036854775808n||'+name+'.field0>9223372036854775807n)){throw new RangeError("Resource result i64 input outside native range");}';
const unsignedGuard=name=>'if('+name+'.$==="Some"&&(typeof '+name+'.field0!=="bigint"||'+name+'.field0<0n||'+name+'.field0>18446744073709551615n)){throw new RangeError("Resource optional u64 input outside native range");}';
const source=imports+`type Packet=ReturnType<typeof some>;
export function optional(value:Packet){${optionalGuard('value')}return value;}
export function outcome(value:ReturnType<typeof okay>){${resultGuard('value')}return value;}
export function unsigned(value:ReturnType<typeof unsignedSome>){${unsignedGuard('value')}return value;}
export function nested(value:Packet){${optionalGuard('value')}return identity(value);}
function identity<T>(value:T):T{return value;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual original Option and Result guards retain successful signed payload bounds and inactive constructors',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const value of [minimum,-1n,0n,maximum]){const some=Object.freeze({$:'Some',field0:value}),okay=Object.freeze({$:'Ok',field0:value});assert.equal(api.optional(some),some);assert.equal(api.nested(some),some);assert.equal(api.outcome(okay),okay);}const none=Object.freeze({$:'None'}),error=Object.freeze({$:'Err',field0:'missing'});assert.equal(api.optional(none),none);assert.equal(api.outcome(error),error);for(const value of [minimum-1n,maximum+1n,0,'1']){assert.throws(()=>api.optional(Object.freeze({$:'Some',field0:value})),/Resource optional i64 input outside native range/u);assert.throws(()=>api.outcome(Object.freeze({$:'Ok',field0:value})),/Resource result i64 input outside native range/u);}assert.deepEqual(api.unsigned(Object.freeze({$:'Some',field0:18446744073709551615n})),{$:'Some',field0:18446744073709551615n});assert.throws(()=>api.unsigned(Object.freeze({$:'Some',field0:-1n})),/Resource optional u64 input outside native range/u);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='optional').parameters[0].type,'optional:i64');assert.equal(rows.find(row=>row.name==='outcome').inputGuards[0].type,'http-result:i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete original numeric-container native parameters receive canonical guards and exact whole source inverses',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.match(result.javascript,/Resource optional i64 input outside native range/u);assert.match(result.javascript,/Resource result i64 input outside native range/u);assert.equal(result.rustExecuted,false);
});
test('payload guards cannot be omitted redirected weakened inverted or moved after a native-domain use',limits,()=>{
 for(const body of [
  'export function bad(value:ReturnType<typeof some>){return value;}',
  'export function bad(value:ReturnType<typeof some>){'+optionalGuard('value').replace('9223372036854775807n','9223372036854775808n')+'return value;}',
  'export function bad(value:ReturnType<typeof some>){'+optionalGuard('value').replace('-9223372036854775808n','-9223372036854775807n')+'return value;}',
  'export function bad(value:ReturnType<typeof some>){'+optionalGuard('value').replace('==="Some"','==="None"')+'return value;}',
  'export function bad(value:ReturnType<typeof some>){'+optionalGuard('value').replace('value.field0>','other.field0>')+'return value;}',
  'export function bad(value:ReturnType<typeof some>){const moved=value;'+optionalGuard('value')+'return moved;}',
  'export function bad(value:ReturnType<typeof some>){'+unsignedGuard('value')+'return value;}',
  'export function bad(value:ReturnType<typeof okay>){'+optionalGuard('value')+'return value;}',
  'export function bad(value:ReturnType<typeof some>){'+optionalGuard('value')+optionalGuard('value')+'return value;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='optional').inputGuards[0].maximum='9223372036854775808';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete numeric-container guard original sources retain both ordered inverse sequences',limits,()=>{
 const plan=prepareHttpResourceContainerGuardSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
