// Original-source assertions share ONE immutable
// library/Cargo/profile compilation attempt within this process. A failed
// attempt is retained too, so later assertions do not repeat expensive work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {checkedDeclarationTargets} from './original-csv-context.mjs';
import {associatedOriginalCsvContext as originalCsvContext} from './associated-original-context.mjs';
let recordedOriginalInputs=false;
function original(){const context=originalCsvContext();if(!recordedOriginalInputs){recordedOriginalInputs=true;console.log('ORIGINAL_CSV_INPUTS '+JSON.stringify(context.inputs));}return context;}
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
  const source=original().source(file);assert.equal(hash(source),fileHash);assert.equal(hash(source.slice(start,end)),sliceHash);assert.ok(source.slice(start,end).startsWith('fn '+name+'('));
  const result=original().result;assert.equal(result.meta.runtimeParity,false);
  if(name==='parse'){
    const method=result.checkedMethodDeclarations.find(entry=>entry.source===file&&entry.displayName.endsWith('Encoding.parse'));assert.ok(method,JSON.stringify(result.meta.refused.filter(entry=>entry.file===file)));assert.equal(method.sourceSha256,fileHash);assert.equal(method.term,'method');
    await verifyTypedTargets(checkedDeclarationTargets(method),api=>{for(const [value,expected]of [['','Identity'],[', ,','Identity'],['identity','Identity'],['gzip','Gzip'],['x-gzip','Gzip'],['gzip, deflate','Deflate'],['gzip, , br, ','Brotli'],['zstd','Zstd'],['GZIP','Gzip'],['other',null],['gzip, unknown',null],['gzip,\u0085', 'Gzip'],['gzip,\uFEFF',null]])assert.deepEqual(api.parse(value),expected===null?none:some({$:expected}));},{childTimeoutMs:30_000});return;
  }
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
  const source=original().source(pin.file);assert.equal(hash(source),pin.fileSha256);assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.fnTokenSha256);
  const result=original().result,method=result.checkedMethodDeclarations.find(entry=>entry.source===pin.file&&entry.displayName.endsWith(pin.owner+'.'+pin.name));assert.ok(method,JSON.stringify(result.meta.refused.filter(entry=>entry.file===pin.file)));assert.equal(method.sourceSha256,pin.fileSha256);assert.equal(method.receiver,'shared');assert.equal(method.signature.params[0].type.rustReference.kind,'shared');
  const artifact=checkedDeclarationTargets(method),type=artifact.lowered.own.params[0].type.rustReference.pointee,base=fixture(type,artifact.lowered.program.declarations),field={AcceptanceFailure:'transaction_id',ResponsesStreamRewriter:'upstream_model',GitHubProxyConfig:'token',AnthropicUsage:'service_tier'}[pin.owner];assert.ok(Object.hasOwn(base,field));
  await verifyTypedTargets(artifact,api=>{const values=pin.owner==='AnthropicUsage'?[[none,none],[some('standard'),some('default')],[some('priority'),some('priority')],[some('other'),none]]:[[none,none],[some(''),some('')],[some('opaque-😀'),some('opaque-😀')]];for(const [value,expected]of values)assert.deepEqual(api[pin.name](Object.freeze({...base,[field]:value})),expected);},{childTimeoutMs:30_000});
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.executableDeclarations.some(entry=>entry.qualifiedName===method.qualifiedName),false);
});

// These assertions reuse original() and its one actual compilation. They do
// not construct Rust source or invoke another translateProject.
for (const [file, owner, start, end, golden] of [
  ['src/admin.rs','ClaimFile',7430,7931,{$:'ClaimFile',token_sha256:'',token_id:'',ttl_hours:0n,claimed_at:0n}],
  ['src/model_contract.rs','ModelSelectorKind',1156,1396,{$:'Unknown'}],
  ['src/gemini/stream.rs','NativeStreamTranslator',2168,2260,{$:'NativeStreamTranslator',decoder:{$:'SseJsonDecoder',buffered:[]}}],
]) test(`unchanged complete graph ${owner}.default executes original generated source body`,{timeout:900_000},async()=>{
  const context=original(),source=context.source(file),item=sourceItems(source).find(row=>row.name===owner&&['struct','enum'].includes(row.term));
  assert.ok(item);assert.deepEqual([item.start,item.end],[start,end]);
  const result=context.result,qualified=owner+'.default',declaration=result.checkedGeneratedMethodDeclarations.find(row=>row.source===file&&row.displayName.endsWith(qualified));
  assert.ok(declaration,JSON.stringify(result.meta.refused.filter(row=>row.file===file&&row.name?.endsWith(qualified))));
  assert.equal(declaration.sourceSha256,hash(source));assert.deepEqual(declaration.span,{start,end});
  assert.equal(declaration.term,'generated-method');assert.equal(declaration.origin,'derive-invocation');
  assert.equal(declaration.generator,'core::default::Default');assert.equal(declaration.receiver,null);
  assert.equal(result.checkedMethodDeclarations.some(row=>row.source===file&&row.displayName.endsWith(qualified)),false);
  const metadata=result.meta.checkedGeneratedMethods.find(row=>row.source===file&&row.name===declaration.displayName);
  assert.ok(metadata);assert.equal(metadata.semanticBodyChecked,true);assert.deepEqual(metadata.span,declaration.span);
  const targets=checkedDeclarationTargets(declaration);
  await verifyTypedTargets(targets,api=>{const first=api.default(),second=api.default();assert.deepEqual(first,golden);assert.deepEqual(second,golden);assert.notStrictEqual(first,second);assert.equal(Object.isFrozen(first),true);if(owner==='NativeStreamTranslator'){assert.notStrictEqual(first.decoder,second.decoder);assert.notStrictEqual(first.decoder.buffered,second.decoder.buffered);assert.equal(Object.isFrozen(first.decoder),true);assert.equal(Object.isFrozen(first.decoder.buffered),true);assert.throws(()=>first.decoder.buffered.push(1n),TypeError);assert.deepEqual(api.default().decoder.buffered,[]);}},{childTimeoutMs:30_000});
  assert.equal(result.meta.runtimeParity,false);
});
