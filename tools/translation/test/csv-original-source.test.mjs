// SOURCE-ONLY DRAFT. Nine original-source assertions share ONE immutable
// library/Cargo/profile compilation attempt within this process. A failed
// attempt is retained too, so later assertions do not repeat expensive work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {originalCsvContext,checkedDeclarationTargets} from './original-csv-context.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const methodPins=JSON.parse(readFileSync(new URL('./fixtures/option-deref-frontier.json',import.meta.url),'utf8'));
const pins=[
  ['src/config.rs','9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a','parse_csv',38315,38488,'aa546ece7c5cb7ebf5daf009677a5e6c635c0396b53e313bb5f022710290a600'],
  ['src/storage/associative.rs','ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1','split_repository_list',10643,10846,'b9699846f61b897d40553b7dcc150811f9d53becb2a5913aa2d086a0ce5213ac'],
  ['src/stream_termination.rs','96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a','from_path',2166,2657,'662c23868e203a81321c0d92120e8f42c113597b92065ac907e443d511a6ae69'],
  ['src/log_decode.rs','7dc190395c8ec6d786647c81b143c591337e18ddbdeeeae86038c38d3b945b8e','parse',1731,2394,'62e91fc42c646029c143edd67d95d37eb443e1ca2b2b71978a403da839544d4f'],
  ['src/config.rs','9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a','parse_usize_csv',38684,39014,'c8f52fdbdd200cf6dd2ed73a3ebcda3738c2149840c4197c222e00f850e2353a'],
];
for(const [file,fileHash,name,start,end,sliceHash]of pins)test(`pending complete original ${file} ${name} retains source and checked frontier`,{timeout:900_000},async()=>{
  const source=originalCsvContext().source(file);assert.equal(hash(source),fileHash);assert.equal(hash(source.slice(start,end)),sliceHash);assert.ok(source.slice(start,end).startsWith('fn '+name+'('));
  const result=originalCsvContext().result;assert.equal(result.meta.runtimeParity,false);
  if(name==='parse'){const encoded='ml_impl_'+Buffer.from('crate.log_decode.Encoding').toString('hex')+'_'+Buffer.from(name).toString('hex');assert.ok(result.meta.refused.some(item=>item.file===file&&(item.name?.endsWith('Encoding.parse')||item.name?.endsWith(encoded))));assert.equal(result.meta.checkedMethods.some(item=>item.name?.endsWith('Encoding.parse')),false);return;}
  if(name==='parse_usize_csv'){assert.ok(result.meta.refused.some(item=>item.name==='config.parse_usize_csv'&&/destruction|no-Drop/.test(item.message)));assert.equal(result.meta.executable.some(item=>item.name==='config.parse_usize_csv'),false);return;}
  if(name==='from_path'){
    const method=extractImplDeclarations(source).implementations.flatMap(item=>item.methods).find(item=>item.name===name),checked=result.meta.checkedMethods.find(item=>item.source===file&&item.name.endsWith('StreamDialect.from_path'));
    // Classification only for this CSV frontier. The separate Deref method
    // fixtures exercise real method closures; this case claims no execution.
    if(checked)assert.deepEqual(checked.span,method.span);else {const encoded='ml_impl_'+Buffer.from('crate.stream_termination.StreamDialect').toString('hex')+'_'+Buffer.from(name).toString('hex');assert.ok(result.meta.refused.some(item=>item.file===file&&(item.name?.endsWith('StreamDialect.from_path')||item.name?.endsWith(encoded))));}
    return;
  }
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);
  const declaration=result.executableDeclarations.find(item=>item.source===file&&item.name===name);assert.ok(declaration);assert.equal(declaration.sourceSha256,fileHash);assert.deepEqual(declaration.span,{start,end});
  await verifyTypedTargets(checkedDeclarationTargets(declaration),api=>{for(const [value,expected]of [['',[]],[', ,',[]],['one, two,one',['one','two','one']],['\u0085a,\uFEFFb',['a','\uFEFFb']],['😀,Ω',['😀','Ω']]])assert.deepEqual(api[name](value),expected);},{childTimeoutMs:30_000});
});

// Build only ordinary immutable ABI fixtures from actual checked field types.
// This constructs no Rust source and never supplies an invented function body.
function fixture(type,declarations,depth=0){
  assert.ok(depth<=128,'bounded original ABI fixture');if(type.rustReference)return fixture(type.rustReference.pointee,declarations,depth+1);
  if(type.kind==='fixed')return 0n;if(type.kind==='bool')return false;if(type.kind==='string')return '';if(type.kind==='unit')return null;if(type.kind==='float')return 0;
  if(type.kind==='array')return Object.freeze(Array.from({length:type.rustFixedArray?.length??0},()=>fixture(type.element,declarations,depth+1)));
  assert.equal(type.kind,'data');const entry=declarations.get(type.name);assert.ok(entry);const ctor=[...entry.ctors].sort((a,b)=>a.fields.length-b.fields.length)[0];return Object.freeze(Object.fromEntries([['$',ctor.name],...ctor.fields.map(field=>[field.name,fixture(field.type,declarations,depth+1)])]));
}
for(const pin of methodPins.pins)test(`pending unchanged ${pin.owner}.${pin.name} method closure from complete original graph`,{timeout:900_000},async()=>{
  const source=originalCsvContext().source(pin.file);assert.equal(hash(source),pin.fileSha256);assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.fnTokenSha256);
  const result=originalCsvContext().result,method=result.checkedMethodDeclarations.find(entry=>entry.source===pin.file&&entry.displayName.endsWith(pin.owner+'.'+pin.name));assert.ok(method,JSON.stringify(result.meta.refused.filter(entry=>entry.file===pin.file)));assert.equal(method.sourceSha256,pin.fileSha256);assert.equal(method.receiver,'shared');assert.equal(method.signature.params[0].type.rustReference.kind,'shared');
  const artifact=checkedDeclarationTargets(method),type=artifact.lowered.own.params[0].type.rustReference.pointee,base=fixture(type,artifact.lowered.program.declarations),field={AcceptanceFailure:'transaction_id',ResponsesStreamRewriter:'upstream_model',GitHubProxyConfig:'token',AnthropicUsage:'service_tier'}[pin.owner];assert.ok(Object.hasOwn(base,field));
  await verifyTypedTargets(artifact,api=>{const values=pin.owner==='AnthropicUsage'?[[none,none],[some('standard'),some('default')],[some('priority'),some('priority')],[some('other'),none]]:[[none,none],[some(''),some('')],[some('opaque-😀'),some('opaque-😀')]];for(const [value,expected]of values)assert.deepEqual(api[pin.name](Object.freeze({...base,[field]:value})),expected);},{childTimeoutMs:30_000});
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.executableDeclarations.some(entry=>entry.qualifiedName===method.qualifiedName),false);
});
