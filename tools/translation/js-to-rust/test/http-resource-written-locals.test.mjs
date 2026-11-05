// Independent native written-local SOURCE. Every new case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {indexHttpResourceWrittenLocalHints} from '../http-resource-written-locals.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceWrittenLocalSources} from '../../prepare-http-resource-written-locals-sources.mjs';
const limits={timeout:60000};
function input(source){return {sourcePath:'src/caller.rs',javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:'src/caller.rs',source}])};}
test('actual written Option locals guide None nested constructors and complete native reproduction',limits,async()=>{
 const source='pub fn absent() -> Option<bool> { let value: Option<bool> = None; value }\npub fn nested() -> Option<Option<bool>> { let value: Option<Option<bool>> = Some(None); value }\npub fn selected(flag: bool) -> Option<bool> { let value: Option<bool> = if flag { None } else { Some(true) }; value }\n',result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.annotations.length,3);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(result.javascript,/@type \{ReturnType<typeof /u);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.absent(),{$:'None'});assert.deepEqual(api.nested(),{$:'Some',field0:{$:'None'}});assert.deepEqual(api.selected(true),{$:'None'});assert.deepEqual(api.selected(false),{$:'Some',field0:true});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('actual String-error Result local annotations retain both success and failure payload domains',limits,async()=>{
 const source='pub fn success(value: crate::translation_core::Json) -> Result<crate::translation_core::Json, String> { let result: Result<crate::translation_core::Json, String> = Ok(value); result }\npub fn failure(error: String) -> Result<crate::translation_core::Json, String> { let result: Result<crate::translation_core::Json, String> = Err(error); result }\n',result=translateHttpResourceShadowCallerRust(source,input(source));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.annotations.length,2);assert.ok(sameRustSourceSyntax(result.httpResourceRustSourceHistory.normalizedSource,result.rust));await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.success({nested:[1,'é😀']}),{$:'Ok',field0:{nested:[1,'é😀']}});for(const message of ['','é😀','\0'])assert.deepEqual(api.failure(message),{$:'Err',field0:message});});
});
test('written types cannot manufacture a different actual local value domain or return signature',limits,()=>{
 for(const source of [
  'pub fn bad() -> Option<bool> { let value: Option<bool> = Some(7_u64); value }',
  'pub fn bad() -> bool { let value: bool = None; value }',
  'pub fn bad() -> Option<bool> { let value: Option<bool> = Ok(true); value }',
  'pub fn bad() -> Result<crate::translation_core::Json, String> { let value: Result<crate::translation_core::Json, String> = Err(7_u64); value }',
  'pub fn bad() -> Option<u64> { let value: Option<bool> = None; value }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(source,input(source)),source);
 const source='pub fn good() -> Option<bool> { let value: Option<bool> = None; value }',changed=input(source);changed.files=changed.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,changed));
});
test('written hint indexes remain bounded own source data and reject ambiguity without invoking getters',()=>{
 const functions=[{name:'original'}],row={function:'original',target:'router_shadow_0',type:'Option<bool>'},index=indexHttpResourceWrittenLocalHints(functions,[row]);assert.equal(index.get('original').get('router_shadow_0').sourceAuthority,false);assert.equal(index.get('original').get('router_shadow_0').semanticAuthority,false);assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,[row,row]));assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,[{...row,function:'copied'}]));assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,[{...row,type:''}]));assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,new Array(1)));let calls=0;const getter={...row};Object.defineProperty(getter,'type',{get(){calls++;return row.type;}});assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,[getter]));const rows=[];Object.defineProperty(rows,0,{get(){calls++;return row;},enumerable:true});assert.throws(()=>indexHttpResourceWrittenLocalHints(functions,rows));assert.equal(calls,0);
});
test('four complete written-local source equations retain native owner bounds both phases and whole inverses',limits,()=>{
 const plan=prepareHttpResourceWrittenLocalSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
