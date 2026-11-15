import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptCoreUnicodeStringReturns,migrateCoreLiteralText} from '../migrate-core-literal-text.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const source='fn compact(text: &crate::translation_core::Str) -> String { text.chars().filter(|ch| !ch.is_whitespace()).collect() }';
function checked(input,options){
 const result=adoptCoreUnicodeStringReturns(input,options);
 assert.equal(transportConcreteSyntaxMeta(result.before.meta).source,input);
 assert.equal(transportConcreteSyntaxMeta(result.after.meta).source,result.after.source);
 let restored=result.after.source;
 for(const row of [...result.mapping].reverse())if(row.kind==='substitution'){
  assert.equal(restored.slice(...row.after),row.replacement);
  restored=restored.slice(0,row.after[0])+row.expected+restored.slice(row.after[1]);
 }
 assert.equal(restored,input);assert.equal(result.executableAdmission,false);
 return result;
}
test('explicit Unicode return adoption retains the original literal-only migration',{timeout:60000},()=>{
 const old=migrateCoreLiteralText(source);assert.equal(old.after.source,source);assert.equal(old.edits.length,0);
 const result=checked('\uFEFF// 😀 retained\r\n'+source+'\r\n');assert.equal(result.edits.length,1);
 assert.equal(result.after.source,'\uFEFF// 😀 retained\r\n'+source.replace('-> String','-> crate::translation_core::Text')+'\r\n');
 assert.equal(result.selections[0].bodyAdmission,false);assert.equal(result.selections[0].ownedReturnAlias,true);
 assert.equal(checked(result.after.source).edits.length,0);
});
test('Unicode return adoption refuses competing String bindings and declaration producers',{timeout:60000},()=>{
 for(const prefix of ['struct String;','type String = Other;','use foreign::String;','use foreign::*;','#![no_implicit_prelude]','#[unknown]','type translation_core = Other;']){
  const input=prefix+source;
  const result=checked(input);assert.equal(result.edits.length,0,prefix);assert.equal(result.after.source,input);
 }
 assert.equal(checked(source,{rootSource:'struct String;'}).edits.length,0);
});
test('Unicode return adoption refuses other collection contexts binders and signatures',{timeout:60000},()=>{
 for(const input of [source.replace('-> String','-> Vec<char>'),source.replace('&crate::translation_core::Str','&str'),source.replace('compact(','compact<T>('),source.replace('text.chars()','consume(text.chars()').replace('.collect() }','.collect()) }'),source.replace('text.chars()','let alias = text; alias.chars()'),source.replace('!ch.is_whitespace()','!ch.is_whitespace() && true'),source.replace('.chars()', '.chars()/* retained */'),source.replace('-> String','-> std::string::String')]){
  const result=checked(input);assert.equal(result.edits.length,0,input);assert.equal(result.after.source,input);
 }
});
