// Independent byte-framing SOURCE. Run only after the complete bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_sse_push_base64 as push} from '../sse-runtime.mjs';
import {serde_json_value_get_string as field} from '../extensions/json-runtime.mjs';
import {emitSseDeclarations} from '../sse-contracts.mjs';
import {SSE_NATIVE_SOURCE,SSE_ORIGINAL_FRAMER_SOURCE,SSE_RUNTIME_SOURCE,SSE_DECLARATIONS_SOURCE} from '../sse-native-source.mjs';
const limits={timeout:60000},encoded=value=>Buffer.from(value).toString('base64');
function unwrapped(result){assert.equal(result.$,'Ok');const pending=field(result.field0,'pending').field0,blocks=field(result.field0,'blocks').field0;assert.equal(pending.$,'String');assert.equal(blocks.$,'Array');return {pending:pending.field0,blocks:blocks.field0.map(value=>{assert.equal(value.$,'String');return value.field0;})};}
test('every byte split retains multibyte scalars original separators and pending tail exactly',limits,()=>{
 const input=Buffer.from('data: λ😀\r\n\r\ndata: 世\n\npartial'),expected=['data: λ😀','data: 世'];for(let split=0;split<=input.length;split++){const first=unwrapped(push('',encoded(input.subarray(0,split)))),second=unwrapped(push(first.pending,encoded(input.subarray(split))));assert.deepEqual([...first.blocks,...second.blocks],expected);assert.equal(second.pending,encoded('partial'));}
 const bytewise=[];let pending='';for(const byte of input){const next=unwrapped(push(pending,encoded([byte])));pending=next.pending;bytewise.push(...next.blocks);}assert.deepEqual(bytewise,expected);assert.equal(pending,encoded('partial'));assert.deepEqual(unwrapped(push(pending,'')),{pending,blocks:[]});
});
test('native lossy decoding BOM NUL empty blocks and earliest mixed boundaries are preserved',limits,()=>{
 assert.deepEqual(unwrapped(push('',encoded([0xef,0xbb,0xbf,0x64,0x0a,0x0a]))).blocks,['\ufeffd']);assert.deepEqual(unwrapped(push('',encoded([0xe4,0xb8,0x0a,0x0a]))).blocks,['\ufffd']);assert.deepEqual(unwrapped(push('',encoded([0xc0,0xaf,0x0a,0x0a]))).blocks,['\ufffd\ufffd']);assert.deepEqual(unwrapped(push('',encoded([0xe4,0,0x0a,0x0a]))).blocks,['\ufffd\0']);assert.deepEqual(unwrapped(push('',encoded('\n\n\r\n\r\n'))).blocks,['','']);assert.deepEqual(unwrapped(push('',encoded('a\r\n\nb\r\n\r\nc\n\n'))).blocks,['a\r','b','c']);
});
test('canonical base64 validation exact limits and atomic failed results have independent cases',limits,()=>{
 for(const value of ['Zg','Zh==','Zg===',' Zg==','Zg==\n','-_==','AA=A']){assert.deepEqual(push(value,''),{$:'Err',field0:'invalid SSE pending base64'});assert.deepEqual(push('',value),{$:'Err',field0:'invalid SSE chunk base64'});}
 assert.deepEqual(push('',encoded(Buffer.alloc(1048577))),{$:'Err',field0:'SSE buffer exceeds limit'});assert.deepEqual(push('',encoded('\n\n'.repeat(1025))),{$:'Err',field0:'SSE block count exceeds limit'});assert.equal(unwrapped(push('',encoded('\n\n'.repeat(1024)))).blocks.length,1024);const original=encoded('partial'),bad=push(original,'bad');assert.equal(bad.$,'Err');assert.equal(unwrapped(push(original,encoded('\n\n'))).blocks[0],'partial');let touched=0;assert.throws(()=>push({toString(){touched++;return '';}},''),TypeError);assert.equal(touched,0);assert.throws(()=>push('\ud800',''),TypeError);
});
test('complete wrapper original framer runtime and declarations remain current source DATA',limits,()=>{
 for(const [path,source]of [['../../../rust/src/translation_stream_core.rs',SSE_NATIVE_SOURCE],['../../../rust/src/sse.rs',SSE_ORIGINAL_FRAMER_SOURCE],['../sse-runtime.mjs',SSE_RUNTIME_SOURCE],['../sse-runtime.d.mts',SSE_DECLARATIONS_SOURCE]])assert.equal(readFileSync(new URL(path,import.meta.url),'utf8'),source);assert.equal(emitSseDeclarations(),SSE_DECLARATIONS_SOURCE);
});
