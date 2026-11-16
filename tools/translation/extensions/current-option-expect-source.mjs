// Fresh actual standard Option::expect source; no module-global source,
// digest, owner, selection or admission cache. The callback owns one operation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../source-profiles/standard-method-bodies/',import.meta.url);
const manifestPin='ec9578c7548c68f775837584b7f7663a8e35f534a8a45db97c2f2f62bcf3cf52';
const hash=value=>createHash('sha256').update(value).digest('hex');
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
function fail(message){throw new TypeError('Current original Option expect source: '+message);}
function original(){
 const bytes=readFileSync(new URL('manifest.json',root));if(bytes.length>262144||hash(bytes)!==manifestPin)fail('complete original manifest differs');
 const manifest=JSON.parse(bytes),rows=manifest.sources.filter(row=>row.rustPath==='library/core/src/option.rs');if(rows.length!==1)fail('one actual standard Option source required');
 const row=rows[0],encoded=readFileSync(new URL(row.file,root));if(encoded.length!==row.compressedBytes||encoded.length>131072||hash(encoded)!==row.compressedSha256)fail('complete original archive differs');
 const raw=gunzipSync(encoded,{maxOutputLength:128000});if(raw.length!==row.bytes||hash(raw)!==row.sha256||createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex')!==row.gitBlobSha)fail('complete original Rust source differs');
 return {manifest:bytes.toString('utf8'),source:raw.toString('utf8'),row};
}
function header(item){
 const tokens=significant(item.tokens),at=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>at&&token.text==='{');
 return at>=0&&open>=0?tokens.slice(at,open).map(token=>token.text).join(''):null;
}
function definition(source,item,offset,expectedSignature,expectedBody){
 const tokens=significant(item.tokens),fn=tokens.findIndex(token=>token.text==='fn'),open=tokens.findIndex((token,index)=>index>fn&&token.text==='{'),end=tokens.at(-1);
 if(fn<0||open<0||end?.text!=='}'||tokens.slice(fn,open).map(token=>token.text).join('')!==expectedSignature||tokens.slice(open).map(token=>token.text).join('')!==expectedBody)fail('actual original signature, match, Some/None branch or failure body differs');
 const span={start:offset+tokens[fn].start,end:offset+end.end},original=source.slice(span.start,span.end),concrete=transportConcreteSyntaxSource(original,{language:'Rust'});
 if(transportConcreteSyntaxMeta(concrete.meta).source!==original)fail('selected complete original CST inverse differs');
 return {span,original,concreteSyntax:concrete.meta,inverse:original,signature:expectedSignature,body:expectedBody};
}
export function withCurrentOptionExpectSource(callback){
 if(typeof callback!=='function')fail('one synchronous operation required');
 const before=original(),items=sourceItems(before.source),owners=items.filter(item=>item.term==='impl'&&header(item)==='impl<T>Option<T>');if(owners.length!==1)fail('one actual original inherent Option owner required');
 const owner=owners[0],tokens=significant(owner.tokens),open=tokens.findIndex(token=>token.text==='{'),offset=tokens[open].end,members=sourceItems(before.source.slice(offset,tokens.at(-1).start)).filter(item=>item.term==='fn'&&item.name==='expect'),failed=items.filter(item=>item.term==='fn'&&item.name==='expect_failed');
 if(members.length!==1||failed.length!==1)fail('actual expect and panic helper must be unique');
 const method=definition(before.source,members[0],offset,'fnexpect(self,msg:&str)->T','{matchself{Some(val)=>val,None=>expect_failed(msg),}}'),failure=definition(before.source,failed[0],0,'fnexpect_failed(msg:&str)->!','{panic_display(&msg)}');
 const proof={schema:'current-original-standard-option-expect-source-v1',sourcePath:before.row.rustPath,sourceSha256:before.row.sha256,manifestSha256:manifestPin,ownerSpan:{start:owner.start,end:owner.end},method,failure,namespaceAuthority:false,runtimeParity:false};
 const result=callback(proof);if(result&&typeof result==='object'&&('then' in result))fail('asynchronous or thenable operations are unsupported');
 const after=original();if(after.manifest!==before.manifest||after.source!==before.source)fail('original source changed before the closing source fence');
 return result;
}
