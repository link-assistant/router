// Independent exact owned-alias constant source. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {parseRouterCoreFixedConstant} from '../fixed-type-core-parser.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedTypeConstantSources} from '../prepare-fixed-type-constants-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',widths=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
const alias=type=>type[0].toUpperCase()+type.slice(1);
const body=widths.flatMap(type=>['MIN','MAX'].map(name=>'pub fn '+name.toLowerCase()+'_'+type+'()->'+C+alias(type)+'{'+C+alias(type)+' /* retained owner */ :: '+name+'}')).join('\n');
function fixture(source=body,{native=FIXED_TYPE_CORE_NATIVE_SOURCE,declaration='pub mod translation_fixed_types_core;\n'}={}){const files={'src/lib.rs':declaration+source,'src/translation_fixed_types_core.rs':native};return {entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]};}
test('twenty actual owned alias MIN/MAX functions retain checked semantic transport and independent JS/strict TS integer boundaries',limits,async()=>{
 const result=translateProject(fixture()),wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);assert.equal(result.meta.executable.filter(row=>/^(?:min|max)_[ui](?:8|16|32|64|128)$/u.test(row.name)).length,20);await verifyTypedTargets(result,api=>{for(const type of widths){const bits=BigInt(type.slice(1)),signed=type[0]==='i',min=signed?-(1n<<(bits-1n)):0n,max=(1n<<(signed?bits-1n:bits))-1n;assert.equal(api['min_'+type](),min);assert.equal(api['max_'+type](),max);}},{childTimeoutMs:20000});
});
test('owned constants work in independently checked actual branches without unqualified standard names or library-body translation',limits,async()=>{
 const source='pub fn choose(value:'+C+'U64,flag:'+C+'Bool)->'+C+'U64{if flag{'+C+'U64::MIN}else{value}}pub fn extreme()->'+C+'I128{'+C+'I128::MIN}',result=translateProject(fixture(source));await verifyTypedTargets(result,api=>{assert.equal(api.choose(18446744073709551615n,true),0n);assert.equal(api.choose(18446744073709551615n,false),18446744073709551615n);assert.equal(api.extreme(),-170141183460469231731687303715884105728n);},{childTimeoutMs:20000});
});
test('missing changed cfg-adorned or aliased native interfaces and unsupported constant forms cannot issue executable constants',limits,()=>{
 for(const overrides of [{declaration:''},{declaration:'#[cfg(all())]pub mod translation_fixed_types_core;\n'},{declaration:'pub mod translation_fixed_types_core;use crate::translation_fixed_types_core as alternate;\n'},{native:FIXED_TYPE_CORE_NATIVE_SOURCE+'\n'},{native:FIXED_TYPE_CORE_NATIVE_SOURCE.replace('pub type U64 = ::std::primitive::u64;','pub type U64 = ::std::primitive::i64;')}]){const result=translateProject(fixture(body,overrides));assert.equal(result.meta.executable.filter(row=>/^(?:min|max)_/u.test(row.name)).length,0);}for(const expression of [C+'Bool::MIN',C+'F64::MAX',C+'U64::MAX()',C+'U64::MAX::Other',C+'U64::MAX<u8>',C+'U64::UNKNOWN']){const result=translateProject(fixture('pub fn rejected()->'+C+'U64{'+expression+'}'));assert.equal(result.meta.executable.some(row=>row.name==='rejected'),false);}const words=['crate','::','translation_fixed_types_core','::','U64','::','MAX'],fake={cursor:{is:(word,at=0)=>words[at]===word,peek:(at=0)=>({kind:'identifier',value:words[at],start:at,end:at+1})}};assert.throws(()=>parseRouterCoreFixedConstant(fake));
});
test('four complete compiler source equations preserve native owners both phases CST and complete original inverses',limits,()=>{const plan=prepareFixedTypeConstantSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
