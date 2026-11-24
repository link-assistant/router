import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseRust,checkProgram,HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {copyMetadata,ownData,snapshotMap,bindCheckedSourceLinks,linkedSourceContext,linkParsedFile,linkProjectDeclaration,relocateSourceLink} from '../extensions/source-links.mjs';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
import {currentPollingConstantPin} from './polling-constant-source-evolution.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const relocated=(node,offset)=>Array.isArray(node)?node.map(item=>relocated(item,offset)):node&&typeof node==='object'?Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='span'&&value?{start:value.start+offset,end:value.end+offset}:relocated(value,offset)])):node;
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  const folder=mkdtempSync(join(tmpdir(),'router-constant-source-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/module.mjs'),ts=join(folder,'src/module.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30000});
    let command=process.env.ROUTER_TRANSLATION_TSC,prefix=[];
    if(!command){try{prefix=[createRequire(new URL('../../../js/package.json',import.meta.url)).resolve('typescript/bin/tsc')];command=process.execPath;}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;command='tsc';}}
    execFileSync(command,[...prefix,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',ts],{encoding:'utf8',timeout:30000});
    for(const path of [js,join(folder,'src/module.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(folder,{recursive:true,force:true});}
}
test('direct parse/check captures original source without fabricated full checked spans',()=>{
  const source='// é 😀\npub const VALUE:u8=7u8; pub const fn add(v:u8)->u8{v+1} fn main(){}';
  const checked=checkProgram(parseRust(source)),entry=checked.declarations.get('VALUE'),proof=entry.constantEvaluationProof;
  assert.equal(proof.sourceLinksVerified,true);assert.ok(Object.isFrozen(proof));
  const link=proof.resolution[0].source;assert.equal(link.sourceSha256,hash(source));
  assert.equal(source.slice(link.declarationSpan.start,link.declarationSpan.end),'pub const VALUE:u8=7u8;');
  assert.equal(source.slice(link.bodySpan.start,link.bodySpan.end),'7u8');
  assert.equal(link.bodySha256,hash('7u8'));assert.equal(checked.declarations.get('add').constantEvaluationProof,undefined);
  assert.equal(serializeProgram(parseProgram(serializeProgram(checked))),serializeProgram(checked));
  assert.ok(Object.isFrozen(parseProgram(serializeProgram(checked)).declarations.get('VALUE').constantEvaluationProof));
  const unlinked=JSON.parse(JSON.stringify(parseRust('const VALUE:u8=7;fn main(){}')));
  assert.throws(()=>checkProgram(unlinked),/original declaration|source association/);
  const changed=parseRust('const VALUE:u8=7;fn main(){}');changed.items[0].body.value='8';assert.throws(()=>checkProgram(changed),/changed after source capture/);
  assert.throws(()=>bindCheckedSourceLinks(checked,new Map(),{}),/private parser source context/);
  let reads=0;const options=Object.defineProperty({},'targetProfile',{enumerable:true,get(){reads++;return {};}});assert.throws(()=>bindCheckedSourceLinks(checked,new Map(),options),/private parser source context/);assert.equal(reads,0);
  const context=linkedSourceContext(parseRust('const VALUE:u8=7;fn main(){}'));assert.ok(Object.isFrozen(context));assert.equal(context instanceof Map,false);
  assert.throws(()=>bindCheckedSourceLinks(checked,{...context},{}),/private parser source context/);
  assert.throws(()=>bindCheckedSourceLinks({...checked},context,{}),/genuine checked parser invocation/);
});
test('constants reject overflow and selected panic; concrete const calls preserve unselected branches',{timeout:30000},async()=>{
  const source='const fn pick(b:bool,v:u8)->u8{if b{v}else{v+1}} pub const GOOD:u8=pick(true,255u8); pub const MIN:i8=-128i8; pub fn read()->u8{GOOD}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await both(result,api=>{assert.equal(api.GOOD,255n);assert.equal(api.MIN,-128n);assert.equal(api.read(),255n);});
  for(const initializer of ['255u8+1u8','1u8/0u8','pick(false,255u8)','-(-128i8)']){
    const type=initializer.startsWith('-')?'i8':'u8',result=project(`const fn pick(b:bool,v:u8)->u8{if b{v}else{v+1}} const BAD:${type}=${initializer};pub fn read()->${type}{BAD}`);
    assert.ok(result.meta.refused.some(entry=>entry.name==='BAD'&&/constant evaluation/.test(entry.message)));
    assert.ok(result.meta.refused.some(entry=>entry.name==='read'));assert.equal(result.meta.executable.some(entry=>entry.name==='BAD'||entry.name==='read'),false);
  }
  assert.throws(()=>checkProgram(parseRust('const BAD:i8=128i8;fn main(){}')));
});
test('standalone bulk links refer to full original file rather than synthetic main',{timeout:30000},async()=>{
  const source='// λ\npub const VALUE:usize=16*1024*1024;pub fn read()->usize{VALUE}';
  const result=translateSource(source,'src/original.rs');assert.equal(result.ir.counts.carried,0);
  const item=result.ir.items.find(item=>item.name==='VALUE'),proof=item.semantic.checkedIR.constantEvaluationProof;
  assert.equal(proof.resolution[0].source.sourcePath,'src/original.rs');assert.equal(proof.resolution[0].source.sourceSha256,hash(source));
  await both(result,api=>{assert.equal(api.VALUE,16777216n);assert.equal(api.read(),16777216n);});
});
test('project global offsets retain local UTF-16 ranges and original resolved callees',{timeout:30000},async()=>{
  const files=new Map([['src/lib.rs','// 😀\nmod helper;pub const ROOT:u8=helper::add(6u8);'],['src/helper.rs','// é\npub const fn add(value:u8)->u8{value+1}']]);
  const result=translateProject({entry:'src/lib.rs',paths:[...files.keys()],readSource:path=>files.get(path)});assert.deepEqual(result.meta.refused,[]);
  const proof=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('ROOT').constantEvaluationProof,callee=proof.resolution.find(entry=>entry.name==='helper.add').source;
  assert.equal(callee.sourcePath,'src/helper.rs');assert.equal(callee.sourceSha256,hash(files.get('src/helper.rs')));assert.equal(callee.sourceOffset,files.get('src/lib.rs').length+1);
  assert.equal(files.get('src/helper.rs').slice(callee.bodySpan.start,callee.bodySpan.end),'{value+1}');
  await both(result,api=>assert.equal(api.ROOT,7n));
});
test('original STACK_BYTES and MAX_RETRY_AFTER receive independently pinned source proofs',{timeout:30000},async()=>{
  for(const pin of [
    {path:'src/entrypoint.rs',name:'STACK_BYTES',sourceSha:'39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e',span:[677,721],body:[704,720],declarationSha:'0be2725212bd633b4ba92f7ec53651d19475018d26014bf2960896808d6fe8d1',assert:api=>assert.equal(api.STACK_BYTES,16777216n)},
    {path:'src/request_routing.rs',name:'MAX_RETRY_AFTER',sourceSha:'983ec98db6d62721c2675f8c94256507c48985c504c063c9e9b80933ff6a7c42',span:[169,241],body:[207,240],declarationSha:'b783afd2f14624b09072b47aae14903b6c4b416daf3234657cb7af9fedc14f12',assert:api=>assert.deepEqual(api.MAX_RETRY_AFTER,{$:'Duration',secs:86400n,nanos:0n})},
  ]){
    const source=readFileSync(repositorySourceURL(pin.path,new URL('../../../',import.meta.url)),'utf8');assert.equal(hash(source),pin.sourceSha);
    const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source}),entry=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get(pin.name);
    assert.ok(entry,JSON.stringify(result.meta.refused));const link=entry.constantEvaluationProof.resolution.find(entry=>entry.name===pin.name).source;
    assert.deepEqual(link.declarationSpan,{start:pin.span[0],end:pin.span[1]});assert.deepEqual(link.bodySpan,{start:pin.body[0],end:pin.body[1]});assert.equal(link.sourceSha256,pin.sourceSha);assert.equal(link.declarationSha256,pin.declarationSha);
    await both(result,pin.assert);
  }
});
test('three unchanged polling constants use pinned const Duration::from_millis',{timeout:60000},async()=>{
  for(const previousPin of [
    {path:'src/codex_loopback_bridge.rs',name:'POLL_INTERVAL',sourceSha:'6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e',span:[1558,1616],declarationSha:'ff3f1926098891ff576a03be741995ad34e963da1900667d81db063b0035acca',bodySha:'8721112d525e1e6c8f10115701f2caa5993537cd1095213a918ab485978c568d',nanos:25000000n},
    {path:'src/login_pty.rs',name:'POLL_INTERVAL',sourceSha:'ce27eba647479e2a4f909b90f05de08cd212284797706fe7220e8c56d19ebe22',span:[1991,2049],declarationSha:'029a611a5d2eed5caf9a66114e45d465bba6bc8d61c0034f3370ad750c96044f',bodySha:'1d54ee699ce08f5572f1e35f770f92de0ca974308cff0babbb48c111c47ca5f5',nanos:50000000n},
    {path:'src/durable_file.rs',name:'LOCK_POLL_INTERVAL',sourceSha:'970eae37d4f282547bdcc178ce08eb119ce87ed0e593a6bad6aa5444433de6f0',span:[13448,13533],declarationSha:'2a432a643307b6540395ad3ffe7b52bf091fe32b359f3d62735d5d725060ac0d',bodySha:'9a4f0e5f1fda452e1e25755fc85437ae882627728e16b632159c370dd49c1198',nanos:20000000n},
  ]) {
    const pin=currentPollingConstantPin(previousPin,process.env.ROUTER_POLLING_CONSTANT_VECTOR_DIR);
    const source=readFileSync(repositorySourceURL(pin.path,new URL('../../../',import.meta.url)),'utf8');assert.equal(hash(source),pin.sourceSha);
    const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source});
    const entry=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get(pin.name);assert.ok(entry,JSON.stringify(result.meta.refused));
    const proof=entry.constantEvaluationProof,link=proof.resolution.find(entry=>entry.name===pin.name).source;
    assert.equal(proof.sourceLinksVerified,true);assert.equal(link.sourceSha256,pin.sourceSha);assert.deepEqual(link.declarationSpan,{start:pin.span[0],end:pin.span[1]});assert.equal(link.declarationSha256,pin.declarationSha);assert.equal(link.bodySha256,pin.bodySha);
    assert.ok(proof.trace.some(entry=>entry.kind==='host'&&entry.id==='std_time_duration_from_millis'));
    await both(result,api=>assert.deepEqual(api[pin.name],{$:'Duration',secs:0n,nanos:pin.nanos}));
  }
});
test('immutable source context reuse still observes changed bytes and mutable scope evidence',()=>{
  const scope={tag:'first'},source='const VALUE:u8=1u8;fn main(){}';
  const capture=text=>{const parser=new HostRustParser(tokenizeRust(text)),surface=parser.file();linkParsedFile(parser,surface,text,{scope});return checkProgram(surface).declarations.get('VALUE').constantEvaluationProof.resolution[0].source;};
  const first=capture(source);scope.tag='second';const second=capture(source),changed=capture(source.replace('1u8','2u8'));
  assert.equal(first.sourceSha256,second.sourceSha256);assert.notEqual(first.sourceScopeSha256,second.sourceScopeSha256);assert.equal(second.sourceSha256,hash(source));assert.equal(changed.sourceSha256,hash(source.replace('1u8','2u8')));assert.notEqual(second.bodySha256,changed.bodySha256);
  let reads=0;const parser=new HostRustParser(tokenizeRust(source));Object.defineProperty(parser.cursor.tokens[0],'hidden',{get(){reads++;return 'secret';}});
  assert.throws(()=>parser.file(),/accessor|hidden metadata/);assert.equal(reads,0);
});
test('metadata normalization invokes no getters, proxy traps or overridden Map methods',()=>{
  let reads=0;const hidden={};Object.defineProperty(hidden,'secret',{get(){reads++;return 'secret';}});assert.throws(()=>copyMetadata(hidden),/hidden metadata|accessor/);
  const proxy=new Proxy({}, {ownKeys(){reads++;return [];},getPrototypeOf(){reads++;return Object.prototype;}});assert.throws(()=>copyMetadata(proxy),/acyclic data/);
  const map=new Map();Object.defineProperty(map,'get',{value:()=>{reads++;return 'override';}});assert.throws(()=>snapshotMap(map),/unmodified native Map/);
  assert.throws(()=>copyMetadata([,]),/holes|hole/);assert.throws(()=>copyMetadata({[Symbol('evidence')]:1}),/symbol/);assert.equal(reads,0);
});
test('inherited descriptor values cannot disguise accessors or missing own metadata',()=>{
  let ownReads=0,inheritedReads=0;
  const record=Object.defineProperty({},'field',{enumerable:true,get(){ownReads++;return 'original';}}),array=Object.defineProperty([],0,{enumerable:true,get(){ownReads++;return 'original';}}),absent={};
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,'value'),poison=Object.create(null);
  poison.configurable=true;poison.get=()=>{inheritedReads++;return 'original';};
  try{
    Object.defineProperty(Object.prototype,'value',poison);
    assert.throws(()=>ownData(record,'field'),/missing data property/);
    assert.throws(()=>ownData(absent,'field'),/missing data property/);
    assert.throws(()=>copyMetadata(record),/accessor/);
    assert.throws(()=>copyMetadata(array),/accessor/);
    assert.equal(ownData({field:'own'},'field'),'own');
    assert.equal(copyMetadata({field:'own'}).field,'own');
  }finally{if(previous)Object.defineProperty(Object.prototype,'value',previous);else delete Object.prototype.value;}
  assert.equal(ownReads,0);assert.equal(inheritedReads,0);
});
test('source links bind the actual tokenizer bytes and reject token replacement before or after parsing',()=>{
  const original='const VALUE:u8=1u8;fn main(){}',changed=original.replace('1u8','2u8');
  const parser=new HostRustParser(tokenizeRust(original)),surface=parser.file();
  assert.throws(()=>linkParsedFile(parser,surface,changed),/bytes differ from tokenizer input/);
  linkParsedFile(parser,surface,original);assert.equal(checkProgram(surface).declarations.get('VALUE').constantEvaluationProof.sourceLinksVerified,true);
  for(const [before,after] of [
    ['// first\n'+original,'// other\n'+original],
    ['pub fn word()->&\'static str{r#"same"#}fn main(){}','pub fn word()->&\'static str{r##"same"##}fn main(){}'],
  ]) {
    const parser=new HostRustParser(tokenizeRust(before)),surface=parser.file();
    assert.throws(()=>linkParsedFile(parser,surface,after),/bytes differ from tokenizer input/);
  }
  const copiedParser=new HostRustParser([...tokenizeRust(original)]),copiedSurface=copiedParser.file();
  assert.throws(()=>linkParsedFile(copiedParser,copiedSurface,original),/original tokenizer source capture/);
  const tokens=tokenizeRust(original);tokens.find(token=>token.kind==='number').value='2';
  assert.throws(()=>new HostRustParser(tokens),/changed before parsing/);
  const later=tokenizeRust(original),laterParser=new HostRustParser(later);later.find(token=>token.kind==='number').value='2';
  assert.throws(()=>laterParser.file(),/token stream differs/);
  const afterParser=new HostRustParser(tokenizeRust(original)),afterSurface=afterParser.file();
  afterParser.cursor.tokens.find(token=>token.kind==='number').value='2';
  assert.throws(()=>linkParsedFile(afterParser,afterSurface,original),/token stream differs/);
  const references='pub fn takes(v:&&u8)->bool{true}fn main(){}';
  const referenceParser=new HostRustParser(tokenizeRust(references)),referenceSurface=referenceParser.file();
  linkParsedFile(referenceParser,referenceSurface,references);assert.ok(linkedSourceContext(referenceSurface));
});
test('project source associations require the exact original declaration slice and offset',()=>{
  const declaration='pub const VALUE:u8=1u8;',prefix='// é 😀\n',source=prefix+declaration;
  const parser=new HostRustParser(tokenizeRust(declaration));parser.visibility();const entry=parser.constItem([]);
  const options={source,sourcePath:'src/original.rs',itemSpan:{start:prefix.length,end:source.length},itemOffset:prefix.length,globalOffset:0,path:[],scope:null};
  assert.throws(()=>linkProjectDeclaration(parser,entry,entry,{...options,source:source.replace('1u8','2u8')}),/slice differs from tokenizer input/);
  assert.throws(()=>linkProjectDeclaration(parser,entry,entry,{...options,itemOffset:0}),/slice differs from tokenizer input/);
  assert.equal(linkProjectDeclaration(parser,entry,relocated(entry,prefix.length),options),true);
  const data='struct Payload{value:u8}',dataParser=new HostRustParser(tokenizeRust(data)),items=[];
  dataParser.items({main:null},items,[],()=>dataParser.cursor.atEnd());
  assert.throws(()=>linkProjectDeclaration(dataParser,items[0],items[0],{source:data.replace('u8','i8'),sourcePath:'src/data.rs',itemSpan:{start:0,end:data.length},itemOffset:0,globalOffset:0,path:[],scope:null}),/slice differs from tokenizer input/);
});
test('genuine parsed declarations cannot certify arbitrary semantic replacements',()=>{
  for(const declaration of ['pub const VALUE:u8=1u8;','struct Payload{value:u8}']) {
    const parser=new HostRustParser(tokenizeRust(declaration)),items=[];parser.items({main:null},items,[],()=>parser.cursor.atEnd());const entry=items[0];
    const changed=structuredClone(entry);if(changed.k==='fn')changed.body.value='2';else changed.ctors[0].fields[0].type.signed=true;
    const options={source:declaration,sourcePath:'src/original.rs',itemSpan:{start:0,end:declaration.length},itemOffset:0,globalOffset:0,path:[],scope:null};
    assert.throws(()=>linkProjectDeclaration(parser,entry,changed,options),/semantic declaration differs/);
  }
  const source='pub const VALUE:u8=1u8;fn main(){}',parser=new HostRustParser(tokenizeRust(source)),surface=parser.file();linkParsedFile(parser,surface,source);
  const entry=surface.items[0],itemSpan={start:0,end:'pub const VALUE:u8=1u8;'.length},changed=structuredClone(entry);changed.body.value='2';
  assert.throws(()=>relocateSourceLink(entry,changed,{source,sourcePath:'src/original.rs',itemSpan}),/semantic declaration differs/);
  const prefix='// é 😀\n',full=prefix+source,offsetSpan={start:prefix.length,end:prefix.length+itemSpan.end};
  assert.equal(relocateSourceLink(entry,relocated(entry,prefix.length),{source:full,sourcePath:'src/original.rs',itemSpan:offsetSpan}),true);
});
test('source capture preserves actual declaration identity and written const qualification',()=>{
  for(const [source,key,value] of [
    ['pub fn value()->u8{1u8}fn main(){}','constFunction',true],
    ['const VALUE:u8=1u8;fn main(){}','constant',false],
    ['pub fn value()->u8{1u8}fn main(){}','async',true],
    ['pub fn value()->u8{1u8}fn main(){}','name','renamed'],
  ]) {
    const parser=new HostRustParser(tokenizeRust(source)),surface=parser.file();surface.items[0][key]=value;
    assert.throws(()=>linkParsedFile(parser,surface,source),/parser syntax changed/);
  }
  const source='pub const fn value()->u8{1u8}const VALUE:u8=value();fn main(){}';
  const parser=new HostRustParser(tokenizeRust(source)),surface=parser.file();
  linkParsedFile(parser,surface,source);assert.equal(checkProgram(surface).declarations.get('VALUE').constantEvaluationProof.sourceLinksVerified,true);
});
test('data source associations reject layout or attribute changes after the actual parse',()=>{
  for(const source of ['#[derive(Clone)] struct Payload{value:u8}','enum Payload{Value(u8)}']) {
    const parser=new HostRustParser(tokenizeRust(source)),items=[];parser.items({main:null},items,[],()=>parser.cursor.atEnd());
    items[0].ctors[0].fields[0].type={...items[0].ctors[0].fields[0].type,signed:true};
    assert.throws(()=>linkProjectDeclaration(parser,items[0],items[0],{source,sourcePath:'src/data.rs',itemSpan:{start:0,end:source.length},itemOffset:0,globalOffset:0,path:[],scope:null}),/parser syntax changed/);
  }
  const source='#[derive(Clone)] struct Payload{value:u8}fn main(){}',parser=new HostRustParser(tokenizeRust(source)),surface=parser.file();
  surface.items[0].deriveTraits=[...surface.items[0].deriveTraits,'Copy'];assert.throws(()=>linkParsedFile(parser,surface,source),/parser syntax changed/);
});
