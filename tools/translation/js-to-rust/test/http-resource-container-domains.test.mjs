// Independent all-width original numeric ingress SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceNumericContainerGuardDomain} from '../http-resource-container-guards.mjs';
import {httpResourceNestedNumericGuardPath} from '../http-resource-nested-numeric-guards.mjs';
import {httpResourcePublicInputDomain} from '../http-resource-public-domains.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareResourceContainerDomainSources} from '../../prepare-resource-container-domain-sources.mjs';
const limits={timeout:60000},widths=[['u8',0n,255n],['u16',0n,65535n],['u32',0n,4294967295n],['u64',0n,18446744073709551615n],['u128',0n,340282366920938463463374607431768211455n],['i8',-128n,127n],['i16',-32768n,32767n],['i32',-2147483648n,2147483647n],['i64',-9223372036854775808n,9223372036854775807n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
const imports=`import {router_text_result_identity as result} from './runtime/owned-result-runtime.mjs';
import {router_option_identity as option} from './runtime/primitive-option-runtime.mjs';
`+widths.map(([type])=>'import {router_integer_'+type+'_saturating_add as add_'+type+'} from "./runtime/integer-runtime.mjs";').join('
')+'
';
const simple=(tag,label,type,minimum,maximum)=>'if(value.$==='+JSON.stringify(tag)+'&&(typeof value.field0!=="bigint"||value.field0<'+minimum+'n||value.field0>'+maximum+'n)){throw new RangeError('+JSON.stringify('Resource '+label+' '+type+' input outside native range')+');}';
const nested=(type,minimum,maximum)=>'if(value.$==="Some"&&value.field0.$==="Ok"&&(typeof value.field0.field0!=="bigint"||value.field0.field0<'+minimum+'n||value.field0.field0>'+maximum+'n)){throw new RangeError('+JSON.stringify('Resource '+type+' payload outside native range')+');}';
const source=imports+widths.map(([type,minimum,maximum])=>`export function optional_${type}(value:ReturnType<typeof option<ReturnType<typeof add_${type}>>>){${simple('Some','optional',type,minimum,maximum)}return value;}
export function result_${type}(value:ReturnType<typeof result<ReturnType<typeof add_${type}>>>){${simple('Ok','result',type,minimum,maximum)}return value;}
export function nested_${type}(value:ReturnType<typeof option<ReturnType<typeof result<ReturnType<typeof add_${type}>>>>>){${nested(type,minimum,maximum)}return value;}
`).join('
');
const input=(value=source,sourcePath='caller.mts')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('all ten widths retain the exact numeric payload and every actual constructor path in bounded domain DATA',limits,()=>{
 for(const [type,minimum,maximum]of widths)for(const prefix of ['optional','http-result','optional:http-result']){const actual=prefix+':'+type,shape=httpResourceNestedNumericGuardPath(actual);assert.equal(shape.type,actual);assert.equal(shape.integer,type);assert.equal(shape.minimum,minimum.toString());assert.equal(shape.maximum,maximum.toString());assert.equal(httpResourceNumericContainerGuardDomain(actual),true);assert.equal(httpResourcePublicInputDomain(actual,{guarded:true}),true);if(type!=='u64')assert.equal(httpResourcePublicInputDomain(actual),false);}
 for(const type of ['optional:usize','unknown:i8','optional:unknown:i8','optional:bool','optional:'.repeat(9)+'i8'])assert.equal(httpResourceNumericContainerGuardDomain(type),false,type);
});
test('thirty actual all-width optional result and nested ingress callers receive JS strict TS and full native inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);const rows=JSON.parse(result.meta).functions;for(const [type]of widths){assert.equal(rows.find(row=>row.name==='optional_'+type).inputGuards[0].type,'optional:'+type);assert.equal(rows.find(row=>row.name==='result_'+type).inputGuards[0].type,'http-result:'+type);assert.equal(rows.find(row=>row.name==='nested_'+type).inputGuards[0].type,'optional:http-result:'+type);}
 await verifyHttpResourceTargets(result,api=>{for(const [type,minimum,maximum]of widths){for(const number of [minimum,0n,maximum]){const some=Object.freeze({$:'Some',field0:number}),okay=Object.freeze({$:'Ok',field0:number}),nested=Object.freeze({$:'Some',field0:okay});assert.strictEqual(api['optional_'+type](some),some);assert.strictEqual(api['result_'+type](okay),okay);assert.strictEqual(api['nested_'+type](nested),nested);}const none=Object.freeze({$:'None'}),error=Object.freeze({$:'Err',field0:'Ω😀'}),nestedError=Object.freeze({$:'Some',field0:error});assert.strictEqual(api['optional_'+type](none),none);assert.strictEqual(api['result_'+type](error),error);assert.strictEqual(api['nested_'+type](none),none);assert.strictEqual(api['nested_'+type](nestedError),nestedError);for(const number of [minimum-1n,maximum+1n,0,'1']){assert.throws(()=>api['optional_'+type]({$:'Some',field0:number}),RangeError);assert.throws(()=>api['result_'+type]({$:'Ok',field0:number}),RangeError);assert.throws(()=>api['nested_'+type]({$:'Some',field0:{$:'Ok',field0:number}}),RangeError);}}});
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('original constructor dominance bounds payload paths and independently checked widths cannot be replaced by annotations or messages',limits,()=>{
 for(const [type,minimum,maximum]of widths.filter(([type])=>type!=='u64')){const good=nested(type,minimum,maximum);for(const wrong of ['',good.replace('value.field0.$==="Ok"&&',''),good.replace('Some','None'),good.replace('value.field0.field0>','value.field0>'),nested(type,minimum,maximum+1n),good.replace('Resource '+type+' payload','Resource u64 payload')]){const value=imports+'export function bad(value:ReturnType<typeof option<ReturnType<typeof result<ReturnType<typeof add_'+type+'>>>>>) {'+wrong+'return value;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),type);}}
 const value=imports+'export function bad(value:ReturnType<typeof option<ReturnType<typeof add_i16>>>){'+simple('Some','optional','i8',-128n,127n)+'return value;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)));
});
test('source-bound constructor guard metadata cannot be replayed with a shorter path or wider scalar type',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='nested_i8').inputGuards[0].type='optional:i16';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));
});
test('five complete source equations retain whole originals native source owners two ordered phases and full source inverses',limits,()=>{
 const plan=prepareResourceContainerDomainSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
