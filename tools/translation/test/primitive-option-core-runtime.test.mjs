// Independent runtime regression SOURCE. Unrun during complete bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as option from '../primitive-option-runtime.mjs';
import {PRIMITIVE_OPTION_CONTRACTS,emitPrimitiveOptionDeclarations} from '../primitive-option-contracts.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {preparePrimitiveOptionCore} from '../prepare-primitive-option-core.mjs';
import {preparePrimitiveOptionRootSources} from '../prepare-primitive-option-root-sources.mjs';
import {prepareTextCore} from '../prepare-text-core.mjs';
import {prepareTextRootSources} from '../prepare-text-root-sources.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none=()=>({$:'None'});
test('None and false zero negative and empty Some values retain actual discriminants',limits,()=>{
 const cases=[['bool',false,true],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['str','','fallback😀']];for(const [domain,value,other]of cases){const invoke=(name,...args)=>option['router_option_'+domain+'_'+name](...args);assert.deepEqual(invoke('some',value),some(value));assert.deepEqual(invoke('none'),none());assert.equal(invoke('is_some',some(value)),true);assert.equal(invoke('is_none',some(value)),false);assert.equal(invoke('is_some',none()),false);assert.equal(invoke('is_none',none()),true);assert.equal(invoke('unwrap_or',some(value),other),value);assert.equal(invoke('unwrap_or',none(),other),other);assert.equal(invoke('unwrap',some(value)),value);assert.equal(invoke('expect',some(value),'failure'),value);assert.throws(()=>invoke('unwrap',none()),RangeError);assert.throws(()=>invoke('expect',none(),'specific failure'),error=>error instanceof RangeError&&error.message==='specific failure');}
});
test('native module root and complete preceding source producers retain every full inverse',limits,()=>{
 for(const plan of [preparePrimitiveOptionCore(),preparePrimitiveOptionRootSources(),prepareTextCore(),prepareTextRootSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(preparePrimitiveOptionCore().files[0].nativeRustGrammarChecked,false);assert.equal(preparePrimitiveOptionRootSources().files.length,3);
});
test('eager and and or retain all discriminant combinations for Copy primitive values',limits,()=>{
 for(const [domain,first,second]of [['bool',false,true],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n]])for(const leftSome of [false,true])for(const rightSome of [false,true]){const left=leftSome?some(first):none(),right=rightSome?some(second):none(),and=option['router_option_'+domain+'_and'](left,right),or=option['router_option_'+domain+'_or'](left,right);assert.deepEqual(and,leftSome?right:none());assert.deepEqual(or,leftSome?left:right);assert.equal(Object.isFrozen(and),true);assert.equal(Object.isFrozen(or),true);}
});
test('malformed tags payloads and accessors refuse without invoking input callbacks',limits,()=>{
 let invoked=0;const getter=Object.defineProperty({$:'Some'},'field0',{enumerable:true,get(){invoked++;throw Error('must not run');}}),tag=Object.defineProperty({},'$',{enumerable:true,get(){invoked++;throw Error('must not run');}}),proxy=new Proxy({$:'None'},{ownKeys(){invoked++;throw Error('must not run');}});for(const value of [getter,tag,proxy,{$:'Other'},{$:'Some'},{$:'None',field0:0n},{$:'Some',field0:0n,extra:true},{$:'Some',field0:0},null])assert.throws(()=>option.router_option_u64_is_some(value),TypeError);assert.equal(invoked,0);
 for(const value of [-1n,18446744073709551616n,0,'0',{}])assert.throws(()=>option.router_option_u64_some(value),TypeError);for(const value of [-9223372036854775809n,9223372036854775808n])assert.throws(()=>option.router_option_i64_some(value),TypeError);for(const value of ['\ud800','\udfff'])assert.throws(()=>option.router_option_str_some(value),TypeError);assert.throws(()=>option.router_option_str_some('é'.repeat(524289)),RangeError);assert.throws(()=>option.router_option_bool_unwrap_or(some(true),1),TypeError);
});
test('all thirty-four declarations and the complete native source remain explicit independent inputs',limits,()=>{
 assert.equal(PRIMITIVE_OPTION_CONTRACTS.filter(row=>['bool','u64','i64','str'].includes(row.domain)&&row.method!=='filter_nonempty').length,34);assert.equal(PRIMITIVE_OPTION_CONTRACTS.length,116);assert.equal(readFileSync(new URL('../primitive-option-runtime.d.mts',import.meta.url),'utf8'),emitPrimitiveOptionDeclarations());assert.equal(readFileSync(new URL('../../../rust/src/translation_primitive_option_core.rs',import.meta.url),'utf8'),PRIMITIVE_OPTION_NATIVE_SOURCE);for(const row of PRIMITIVE_OPTION_CONTRACTS){assert.equal(typeof option[row.javascriptName],'function');assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}
 const first=option.router_option_u64_none(),second=option.router_option_u64_none();assert.notEqual(first,second);assert.equal(Object.isFrozen(first),true);
});
