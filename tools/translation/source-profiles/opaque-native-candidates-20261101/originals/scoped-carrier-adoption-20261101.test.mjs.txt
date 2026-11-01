// Independent future cases. SOURCE ONLY: no case has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems} from '../rust-structure.mjs';
import {originalDeclarationHeader} from '../module-bindings.mjs';
import {withScopedAdoptionLocals,inspectScopedAdoptionDomain} from '../scoped-carrier-adoption-20261101-locals.mjs';
import {selectJsonFieldAdoption} from '../scoped-carrier-adoption-20261101-json-selection.mjs';
import {selectPrimitiveOptionMethodAdoption} from '../scoped-carrier-adoption-20261101-option-selection.mjs';
import {selectTextMethodAdoption} from '../scoped-carrier-adoption-20261101-text-selection.mjs';
import {selectQualifiedCallbackBodies} from '../scoped-carrier-adoption-20261101-callback-bodies.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const limits={timeout:60000};
const item=source=>sourceItems(source).find(row=>row.term==='fn');
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
function close(rows,at){const stack=[],pairs={'(':')','[':']','{':'}'};for(;at<rows.length;at++){const word=rows[at].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;}
function split(rows){const result=[];let from=0,angle=0;for(let at=0;at<rows.length;at++){const word=rows[at].text;if(['(','[','{'].includes(word)){const last=close(rows,at);if(last<0)return [];at=last;}else if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;else if(word===','&&!angle){result.push(rows.slice(from,at));from=at+1;}}result.push(rows.slice(from));return result.filter(row=>row.length);}
const helpers={originalDeclarationHeader,close,split,text:rows=>rows.map(row=>row.text).join(''),ident,macroAt:()=>null};
const scoped={jsonNames:new Set(),mapNames:new Set()};
function select(fn,source){return fn(source,item(source),scoped,[],new Set(),helpers);}

test('unknown local shadows never recover a header alias; the initializer still sees the older parameter',limits,()=>{
 const source='pub fn f(x:&Alias){probe(x);let x=unknown(x);probe(x)}';
 withScopedAdoptionLocals(source,item(source),locals=>{
  const reader=locals.text(new Map([['x','str']]),new Set(['x']));
  assert.equal(reader.at(source.indexOf('probe')).get('x'),'str');
  assert.equal(reader.at(source.indexOf('unknown')).get('x'),'str');
  assert.equal(reader.at(source.lastIndexOf('probe')).has('x'),false);return null;
 });
});
test('sibling block fields use their actual key bindings instead of one function-global name census',limits,()=>{
 const source='pub fn f(record:&crate::translation_core::Json){'+
  '{let key:&str=("first");let a=record.get(key).and_then(crate::translation_core::Json::as_u64).unwrap_or(0_u64);probe(a);}'+
  '{let key:&str=("second");let b=record.get(key).and_then(crate::translation_core::Json::as_u64).unwrap_or(0_u64);probe(b);}}';
 const selected=select(selectJsonFieldAdoption,source);assert.equal(selected.edits.length,2);
 for(const row of selected.edits){assert.equal(row.expected,source.slice(...row.span));assert.ok(row.replacement.includes('json_u64_field_or(record, key, 0_u64)'));}
 assert.notDeepEqual(selected.selections[0].localKeySource.span,selected.selections[1].localKeySource.span);
});
test('whole block receiver retains its source and explicit default operation',limits,()=>{
 const source='pub fn f(record:&crate::translation_core::Json)->u64{let result={let key:&str=("used");crate::translation_json_fields_core::json_u64_field(record,key)}.unwrap_or(0_u64);result}';
 const selected=select(selectPrimitiveOptionMethodAdoption,source);assert.equal(selected.edits.length,1);
 assert.ok(selected.edits[0].replacement.startsWith('crate::translation_primitive_option_core::u64_unwrap_or({let key:'));
 assert.ok(selected.edits[0].replacement.includes('json_u64_field(record,key)}'));assert.equal(selected.selections[0].oldTraitDispatchProved,false);
});
test('literal borrowed fallback is an explicit owning migration with no allocation or loan equivalence claim',limits,()=>{
 const source='pub fn f(scope:Option<&str>){consume(scope.filter(|value|!value.is_empty()).unwrap_or("client"))}';
 const selected=select(selectPrimitiveOptionMethodAdoption,source),row=selected.selections.find(row=>row.borrowedFallbackMigration);
 assert.ok(row);assert.equal(row.borrowedFallbackMigration.originalAllocationEquivalent,false);assert.equal(row.borrowedFallbackMigration.originalBorrowEquivalent,false);assert.equal(row.borrowedFallbackMigration.originalDropEquivalent,false);assert.equal(row.borrowedFallbackMigration.originalOwnerEquivalent,false);assert.equal(row.executableAdmission,false);
 assert.ok(selected.edits.some(row=>row.replacement.includes('str_unwrap_or(')&&row.expected.endsWith('unwrap_or("client")')));
 const dynamic=select(selectPrimitiveOptionMethodAdoption,'pub fn f(scope:Option<&str>,fallback:&str){consume(scope.unwrap_or(fallback))}');assert.equal(dynamic.edits.length,0);
});
test('scoped text aliases retain separate sibling bindings',limits,()=>{
 const source='pub fn f(){ {let key:&str=(" first ");consume(key.trim());} {let key:&str=(" second ");consume(key.trim());} }';
 const selected=select(selectTextMethodAdoption,source);assert.equal(selected.edits.filter(row=>row.expected==='key.trim()').length,2);
});
test('JSON selection never queries an outer binding ledger inside an excluded callback body',limits,()=>{
 const source='pub fn f(record:&crate::translation_core::Json,value:Option<u64>){consume(value.map(|key|record.get("inside").and_then(crate::translation_core::Json::as_u64)));consume(record.get("outside").and_then(crate::translation_core::Json::as_u64));}';
 withSourceFailureOperation(()=>{const selected=select(selectJsonFieldAdoption,source);assert.equal(selected.edits.length,1);assert.ok(selected.edits[0].expected.includes('"outside"'));assert.equal(selected.edits[0].expected.includes('"inside"'),false);return null;});
});
test('qualified actual inline callback uses the existing integer-body cascade and full child history',limits,()=>{
 const source='pub fn f(value:Option<u64>)->Option<String>{crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(value,|v|v.to_string())}';
 const selected=selectQualifiedCallbackBodies(source,item(source));assert.equal(selected.edits.length,1);assert.equal(selected.edits[0].expected,'v.to_string()');assert.ok(selected.edits[0].replacement.includes('crate::translation_core::format!'));
 const row=selected.selections[0];assert.equal(row.callbackSourceHistory.before.source,'v.to_string()');assert.ok(row.callbackSourceHistory.bodySourceHistories.length);assert.equal(row.originalCallbackOwnerProved,false);assert.equal(row.typedCaptureAuthority,false);
});
test('unsupported control and patterns remain source residuals before helper entry without poisoning an outer operation',limits,()=>{
 for(const body of ['for x in source {consume(x)}','let mut x=1_u64;consume(x)','if let Some(x)=source{consume(x)}','let pair=|a,b|a+b;consume(pair)']){
  const source='pub fn f(source:Option<u64>){'+body+'}';assert.ok(inspectScopedAdoptionDomain(source,item(source)).reason);
  withSourceFailureOperation(()=>{const selected=select(selectPrimitiveOptionMethodAdoption,source);assert.equal(selected.edits.length,0);assert.ok(selected.skipped.length);return null;});
 }
});
test('closed adapter expires and no result-registration callback can publish a role',limits,()=>{
 const source='pub fn f(x:&Alias){let y=unknown();probe(y)}';let saved;
 withScopedAdoptionLocals(source,item(source),locals=>{saved=locals.carrier(new Map(),new Set(['x']));saved.selectedCall({resultRole:{kind:'payload',domain:'u64'},semanticAuthority:true});assert.equal(saved.at(source.indexOf('probe')).has('y'),false);return null;});
 assert.throws(()=>saved.at(source.indexOf('probe')),/expired/);assert.throws(()=>saved.selectedCall({}),/expired/);
});
