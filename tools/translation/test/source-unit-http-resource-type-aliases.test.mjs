// Independent type-only target retention SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {retainHttpResourceUnitTypeAliases} from '../http-resource-unit-type-aliases.mjs';
import {translateHttpResourceCallerTypeScript} from '../js-to-rust/http-resource-callers.mjs';
import {httpResourceReceivingData} from '../js-to-rust/test/http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
import {prepareHttpResourceUnitTypeAliasSources} from '../prepare-http-resource-unit-type-alias-sources.mjs';
const limits={timeout:60000},unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}};
function options(source,previous){return {sourcePath:'caller.mts',...httpResourceReceivingData([{path:'caller.mts',source},{path:'caller.mjs',source:previous}])};}
test('exported original type aliases survive actual TS JS and Rust authority changes without disappearing',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const alias='\n/** Public option domain. */\nexport type Chosen=ReturnType<typeof map>;\n';api.write(api.unit.paths.TypeScript,api.read(api.unit.paths.TypeScript)+alias);const typed=api.plan();assert.equal(typed.units[0].authority,'TypeScript');api.apply(typed);api.commit();
 const edited=api.read(api.unit.paths.JavaScript).replaceAll('0n','1n');api.write(api.unit.paths.JavaScript,edited);const javascript=api.plan();assert.equal(javascript.units[0].authority,'JavaScript');api.apply(javascript);assert.match(api.read(api.unit.paths.TypeScript),/export type Chosen=ReturnType<typeof map>;/u);api.commit();
 api.write(api.unit.paths.Rust,api.read(api.unit.paths.Rust).replaceAll('1_u64','2_u64'));const native=api.plan();assert.equal(native.units[0].authority,'Rust');api.apply(native);const target=api.read(api.unit.paths.TypeScript);assert.match(target,/export type Chosen=ReturnType<typeof /u);assert.match(target,/Public option domain/u);assert.match(target,/2n/u);assert.equal(native.rustExecuted,false);assert.equal(native.runtimeParity,false);
 const forged=structuredClone(native);forged.outputs.find(row=>row.path===api.unit.paths.TypeScript).after+='\nexport type Forged=number;';assert.throws(()=>api.apply(forged));
});
test('retained type query imports use actual owners and avoid new value binding conflicts',limits,()=>{
 const previous="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nexport type Owned=ReturnType<typeof copy>;\nexport function chosen(flag:boolean){return flag;}\n",source="import {router_text_len_utf8 as copy} from './runtime/text-runtime.mjs';\nexport function chosen(flag:boolean){return flag;}\n",input=options(source,previous),expected=translateHttpResourceCallerTypeScript(source,input),proposal=retainHttpResourceUnitTypeAliases(source,{unit,current:{TypeScript:previous},options:input,expectedRust:expected.rust});
 assert.match(proposal.source,/router_core_json_copy as retained_alias_operation_0/u);assert.match(proposal.source,/type Owned=ReturnType<typeof retained_alias_operation_0>/u);assert.ok(proposal.source.endsWith(source));assert.equal(proposal.history.equations[0].inverse,source);assert.equal(proposal.history.equations[1].inverse,previous);assert.equal(proposal.history.sourceAuthority,false);
 const checked=translateHttpResourceCallerTypeScript(proposal.source,{...input,files:input.files.map(row=>row.path==='caller.mts'?{...row,source:proposal.source}:row)});assert.equal(checked.rust,expected.rust);
});
test('unsupported old aliases and a divergent complete target refuse without a saved verdict',limits,()=>{
 const source='export function chosen(flag:boolean){return flag;}\n',input=options(source,source),expected=translateHttpResourceCallerTypeScript(source,input);
 for(const declaration of ['type T=number;','type T=T;','type T<X extends unknown>=X;']){const previous=declaration+source;assert.throws(()=>retainHttpResourceUnitTypeAliases(source,{unit,current:{TypeScript:previous},options:input,expectedRust:expected.rust}),declaration);}
 const previous='export type T=boolean;'+source;assert.throws(()=>retainHttpResourceUnitTypeAliases(source,{unit,current:{TypeScript:previous},options:input,expectedRust:'pub fn changed() -> bool { false }'}),/authoritative native behavior/u);
 const competing="import {router_text_len_utf8 as length} from './runtime/text-runtime.mjs';type length=boolean;"+source;assert.throws(()=>translateHttpResourceCallerTypeScript(competing,options(competing,source)),/compete/u);
});
test('the complete original source-unit alias copy retains all inverse phases',limits,()=>{
 const plan=prepareHttpResourceUnitTypeAliasSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
