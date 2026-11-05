// Independent catalogue/admission boundary regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedJsonReaderOperation,ownedJsonOptionalReaderOperation,ownedJsonOptionalReaderRustCall} from '../owned-json-source.mjs';
import {prepareOptionalJsonCatalogueSources} from '../../prepare-optional-json-catalogue-sources.mjs';
const limits={timeout:60000};
test('all nine concrete opaque readers keep exact independently declared method type and root contracts',limits,()=>{
 const expected=[['as_str','str-option-ref',0],['as_bool','bool-option',null],['as_u64','u64-option',null],['as_i64','i64-option',null],['as_f64','f64-option',null],['as_null','unit-option',null],['as_number','number-option-ref',0],['as_array','array-option-ref',0],['as_object','map-option-ref',0]];
 for(const [member,ret,root]of expected){const name='router_core_json_option_'+member,row=ownedJsonOptionalReaderOperation(name);assert.deepEqual(row,{name,member,input:'json-option-input',ret,root});assert.equal(Object.isFrozen(row),true);assert.equal(ownedJsonReaderOperation('serde_json_value_'+member).ret,ret);assert.equal(ownedJsonOptionalReaderRustCall(name,'__ro_arg_7'),'match __ro_arg_7 { Some(value) => ::serde_json::Value::'+member+'(value), None => None }');}
});
test('get pointer predicates wrong arity families and unregistered names do not become opaque operations',limits,()=>{
 let touched=0;const hook={toString(){touched++;return 'router_core_json_option_as_str';}};
 for(const name of ['router_core_json_option_get','router_core_json_option_pointer','router_core_json_option_is_null','router_core_json_option_as_custom','serde_json_value_as_str','',null,hook])assert.equal(ownedJsonOptionalReaderOperation(name),null);assert.equal(touched,0);
 for(const argument of ['value','__ro_arg_0();','__ro_arg_-1',hook])assert.throws(()=>ownedJsonOptionalReaderRustCall('router_core_json_option_as_str',argument));assert.equal(touched,0);
});
test('two complete source equations retain original catalogue module phases and physical inverses',limits,()=>{
 const plan=prepareOptionalJsonCatalogueSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
