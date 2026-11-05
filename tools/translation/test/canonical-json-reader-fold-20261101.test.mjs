// Independent source-only cases; every execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {sourceItems} from '../rust-structure.mjs';
import {selectCanonicalJsonReaderFold,proposeCanonicalJsonReaderFold} from '../canonical-json-reader-fold-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
const fn=source=>sourceItems(source).find(item=>item.term==='fn');
const block=(member,key='"field"')=>'{ let selected = record.get('+key+'); if let crate::translation_core::Maybe::Some(payload) = selected { crate::translation_core::Json::'+member+'(payload) } else { crate::translation_core::Maybe::None } }';
test('exact canonical borrowed text/bool/u64 equations use existing field operations with whole-source inverses',limits,()=>{
 for(const [member,operation]of [['as_str','json_str_field'],['as_bool','json_bool_field'],['as_u64','json_u64_field']]){const source='pub fn read(record:&crate::translation_core::Json){let result='+block(member)+';keep(result)}',result=proposeCanonicalJsonReaderFold(source,fn(source));assert.equal(result.selections.length,1);assert.ok(result.after.source.includes('crate::translation_json_fields_core::'+operation+'(record, "field")'));assert.equal(result.mapping.filter(row=>row.kind==='substitution').length,1);assert.equal(result.before.source,source);assert.equal(result.history,undefined);assert.equal(transportConcreteSyntaxMeta(result.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(result.after.meta).source,result.after.source);assert.equal(result.oldTraitDispatchProved,false);assert.equal(result.oldOptionOwnerProved,false);assert.equal(result.executableAdmission,false);assert.deepEqual([...new Set(result.trace.map(row=>row.phase))],['language','repository']);}
});
test('actual original literal/root/key intervals and comments survive as source DATA, with no dynamic key permission',limits,()=>{
 const source='pub fn read(record:&crate::translation_core::Json,key:&str){let result='+block('as_u64','key').replace('let selected','/* original reader */ let selected')+';keep(result)}',result=proposeCanonicalJsonReaderFold(source,fn(source)),row=result.selections[0];assert.equal(source.slice(...row.rootSpan),'record');assert.equal(source.slice(...row.keySpan),'key');assert.ok(result.after.source.includes('/* original reader */'));assert.equal(result.after.source.split('json_u64_field(record, key)').length-1,1);
 const changed='pub fn read(record:&crate::translation_core::Json){let result='+block('as_str','next_key()')+';keep(result)}';assert.equal(selectCanonicalJsonReaderFold(changed,fn(changed)).edits.length,0);
});
for(const [name,source]of [
 ['custom written receiver','pub fn read(record:&Custom){let result='+block('as_str')+';keep(result)}'],
 ['wrong callee argument','pub fn read(record:&crate::translation_core::Json){let result='+block('as_str').replace('as_str(payload)','as_str(selected)')+';keep(result)}'],
 ['extra branch effect','pub fn read(record:&crate::translation_core::Json){let result='+block('as_str').replace('Json::as_str(payload)','Json::as_str(payload);effect()')+';keep(result)}'],
 ['different None owner','pub fn read(record:&crate::translation_core::Json){let result='+block('as_str').replace('Maybe::None','Other::None')+';keep(result)}'],
 ['second callback binder shadows root','pub fn read(record:&crate::translation_core::Json){invoke(|x,record|'+block('as_str')+')}'],
 ['pattern shadows root','pub fn read(record:&crate::translation_core::Json,other:Option<u64>){if let Some(record)=other{'+block('as_str')+'}}'],
])test(name+' retains original source with an explicit exact-equation refusal',limits,()=>{const result=proposeCanonicalJsonReaderFold(source,fn(source));assert.equal(result.selections.length,0);assert.equal(result.after.source,source);assert.ok(result.residuals.length);assert.equal(result.executableAdmission,false);});
function actualOwner(){const fd=openSync(new URL('../../../rust/src/token_report.rs',import.meta.url),'r');let failed=false;try{const stat=fstatSync(fd);assert.ok(stat.isFile()&&stat.size<=2097152);const bytes=Buffer.alloc(stat.size+1);let size=0,count;while((count=readSync(fd,bytes,size,bytes.length-size,size))>0){size+=count;assert.ok(size<=stat.size);}assert.equal(size,stat.size);return new TextDecoder('utf8',{fatal:true}).decode(bytes.subarray(0,size));}catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}}
test('whole actual token-report scope and revoked canonical blocks fold while all other owners and residuals remain',limits,()=>{
 const source=actualOwner(),item=sourceItems(source).find(item=>item.term==='fn'&&item.name==='row'),result=proposeCanonicalJsonReaderFold(source,item);assert.equal(result.selections.length,2);assert.ok(result.after.source.includes('json_str_field(record, "scope")'));assert.ok(result.after.source.includes('json_bool_field(record, "revoked")'));for(const text of ['const HEADERS:','pub fn print_table','let text = |key: &str|','let number = |key: &str|','.map_or_else(','.filter(|scope| !scope.is_empty())','v.to_string()','mod tests;'])assert.ok(result.after.source.includes(text));assert.equal(result.wholeOriginalSourceRetained,true);assert.equal(result.originalPatternAuthority,false);assert.equal(result.executableAdmission,false);
});
