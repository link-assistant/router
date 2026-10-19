import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {emitJavaScript,HostChecker,hostData} from '../extensions/host-contracts.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_BASE64_SHA256,ROUTER_CORE_BASE64_CONTRACTS,prepareCoreBase64SourceData,checkRouterCoreBase64Call,captureRouterCoreBase64Calls} from '../router-core-base64.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreBase64Corpus} from '../migrate-core-base64.mjs';
import * as runtime from '../base64-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const nativeJson=JSON.stringify,root=new URL('../../../',import.meta.url),C='crate::translation_core::',S='&'+C+'Str',T=C+'Text',E=C+'Base64Error',R=C+'Outcome<Vec<u8>,'+E+'>';
const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const vectors=JSON.parse(readFileSync(new URL('./fixtures/router-core-base64-vectors.json',import.meta.url),'utf8')),vectorRoot=process.env.ROUTER_CORE_BASE64_VECTOR_DIR;let retained=[];
const retain=(kind,value)=>{retained.push({kind,value});return value;};
const test=(name,run)=>nodeTest(name,{timeout:60000},async()=>{retained=[];try{await run();}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});const encoded=nativeJson({name,vectors:retained},(_,value)=>typeof value==='bigint'?{$integer:String(value)}:value);writeJsonTextGzip(join(vectorRoot,Buffer.from(name).toString('hex')+'.json.gz'),encoded);}}});
const sourceFiles=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE});
function project(source,change={}){const files={...sourceFiles(source),...change};retain('complete-source-input',{entry:'src/lib.rs',files,manifest,lock,compilationProfile:PRODUCTION_PROFILE});return retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}));}
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
function checked(result){const text=JSON.stringify(result.meta.checkedSemanticProgram),value=parseProgram(text);assert.equal(serializeProgram(value),text);retain('complete-serialized-reparsed-checked-program',text);return value;}
const target=(result,verify)=>verifyTypedTargets(result,verify,{childTimeoutMs:20000});
const byteValues=values=>Object.freeze(values.map(BigInt));
function expected(row){if(Object.hasOwn(row.result,'Ok'))return {$:'Ok',field0:byteValues(row.result.Ok)};const {variant,...fields}=row.result.Err;return {$:'Err',field0:{$:variant,...Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,BigInt(value)]))}};}
const decoder=config=>runtime['router_core_base64_'+({STANDARD:'standard',STANDARD_NO_PAD:'standard_no_pad',URL_SAFE_NO_PAD:'url_no_pad'}[config])+'_decode_text'];
const wrappers=[
 ['standard_encode_bytes','&[u8]',T],['standard_encode_text',S,T],['standard_encode_owned_bytes','Vec<u8>',T],['standard_no_pad_encode_text',S,T],
 ['url_no_pad_encode_bytes','&[u8]',T],['url_no_pad_encode_owned_bytes','Vec<u8>',T],['url_no_pad_encode_owned_text',T,T],['url_no_pad_encode_array32','[u8;32]',T],
 ['standard_decode_text',S,R],['standard_decode_owned_text',T,R],['standard_no_pad_decode_text',S,R],['url_no_pad_decode_text',S,R],['url_no_pad_decode_owned_text',T,R],
];

test('owned base64 binds all thirteen real facade functions through full native CST checked meta and strict targets',async()=>{
 const physical=readFileSync(repositorySourceURL('src/translation_core/base64.rs',root),'utf8');assert.equal(physical,ROUTER_CORE_BASE64_SOURCE);assert.equal(createHash('sha256').update(physical).digest('hex'),ROUTER_CORE_BASE64_SHA256);
 const prepared=retain('actual-source-data-replay',prepareCoreBase64SourceData());assert.equal(prepared.leaf.source,physical);assert.equal(prepared.facade.source,ROUTER_FORMATTING_FACADE_SOURCE);assert.equal(prepared.sourceData.source,readFileSync(new URL('../router-core-source-data.mjs',import.meta.url),'utf8'));
 const cst=transportConcreteSyntaxSource(physical,{language:'Rust'});retain('complete-leaf-CST',cst);assert.equal(transportConcreteSyntaxMeta(cst.meta).source,physical);
 assert.equal(ROUTER_CORE_BASE64_CONTRACTS.filter(row=>row.kind==='function').length,13);
 const source=wrappers.map(([name,input,output])=>`pub fn ${name}(value:${input})->${output}{${C}base64_${name}(value)}`).join('\n'),result=project(source);for(const [name]of wrappers)assert.equal(has(result,name),true,name);checked(result);
 await target(result,api=>{
  for(const row of vectors.encode){const bytes=byteValues(row.bytes);assert.equal(api.standard_encode_bytes(bytes),row.standard);assert.equal(api.standard_encode_owned_bytes(bytes),row.standard);assert.equal(api.url_no_pad_encode_bytes(bytes),row.urlNoPad);assert.equal(api.url_no_pad_encode_owned_bytes(bytes),row.urlNoPad);if(bytes.length===32)assert.equal(api.url_no_pad_encode_array32(bytes),row.urlNoPad);if(Object.hasOwn(row,'text')){assert.equal(api.standard_encode_text(row.text),row.standard);assert.equal(api.standard_no_pad_encode_text(row.text),row.standardNoPad);assert.equal(api.url_no_pad_encode_owned_text(row.text),row.urlNoPad);}}
  for(const row of vectors.decode){const family={STANDARD:'standard',STANDARD_NO_PAD:'standard_no_pad',URL_SAFE_NO_PAD:'url_no_pad'}[row.configuration];assert.deepEqual(api[family+'_decode_text'](row.input),expected(row),row.name);if(family!=='standard_no_pad')assert.deepEqual(api[family+'_decode_owned_text'](row.input),expected(row),row.name);}
 });assert.equal(result.meta.runtimeParity,false);
});

test('shared independent vectors preserve alphabets native error variants precedence UTF8 offsets Display and Debug text',()=>{
 retain('complete-independent-shared-vectors',vectors);assert.equal(vectors.encode.length,15);assert.equal(vectors.decode.length,252);
 for(const row of vectors.encode){const bytes=byteValues(row.bytes);assert.equal(runtime.router_core_base64_standard_encode_bytes(bytes),row.standard);assert.equal(runtime.router_core_base64_url_no_pad_encode_bytes(bytes),row.urlNoPad);if(Object.hasOwn(row,'text')){assert.equal(runtime.router_core_base64_standard_encode_text(row.text),row.standard);assert.equal(runtime.router_core_base64_standard_no_pad_encode_text(row.text),row.standardNoPad);}}
 const observations=[];for(const row of vectors.decode){const actual=decoder(row.configuration)(row.input);assert.deepEqual(actual,expected(row),row.name);if(actual.$==='Err'){const text=runtime.base64ErrorText(actual.field0);assert.equal(text,row.display,row.name);assert.equal(text,row.debug,row.name);}assert.equal(Object.isFrozen(actual),true);assert.equal(Object.isFrozen(actual.field0),true);observations.push({name:row.name,actual});}retain('complete-runtime-observations',observations);
});

test('native error formatting validates exact own fields without coercion getters or invented variants',()=>{
 const edge=[
  [{$:'InvalidByte',field0:0n,field1:255n},'Invalid symbol 255, offset 0.'],
  [{$:'InvalidLength',field0:18446744073709551615n},'Invalid input length: 18446744073709551615'],
  [{$:'InvalidLastSymbol',offset:2n,symbol:0n,symbol_value:0n},"Invalid last symbol  0x0 ('\0') at offset 2, decoded as 0b00000000."],
  [{$:'InvalidLastSymbol',offset:2n,symbol:255n,symbol_value:255n},"Invalid last symbol 0xff ('�') at offset 2, decoded as 0b11111111."],
 ];retain('independent-full-native-error-field-cases',edge);for(const [value,wanted]of edge)assert.equal(runtime.base64ErrorText(value),wanted);
 let hooks=0;const getter=Object.defineProperty({$:'InvalidLength'},'field0',{enumerable:true,get(){hooks++;return 1n;}});
 for(const value of [null,{},{$:'Other'},{$:'InvalidPadding',extra:true},{$:'InvalidByte',field0:-1n,field1:0n},{$:'InvalidLength',field0:18446744073709551616n},{$:'InvalidLength',field0:1},getter,new Proxy({$:'InvalidPadding'},{ownKeys(){hooks++;return ['$'];}})])assert.throws(()=>runtime.base64ErrorText(value),TypeError);
 assert.equal(hooks,0);
});

test('runtime snapshots the explicit dense byte ABI and refuses holes accessors proxies coercion and malformed Unicode',()=>{
 const bytes=[102n];assert.equal(Object.isFrozen(bytes),false);assert.equal(runtime.router_core_base64_standard_encode_owned_bytes(bytes),'Zg==');assert.deepEqual(bytes,[102n]);
 let hooks=0;const getter=Object.defineProperty([],'0',{enumerable:true,configurable:true,get(){hooks++;return 0n;}}),hostile={toString(){hooks++;return 'Zg==';}},proxy=new Proxy([0n],{get(){hooks++;return 0n;}});
 const sparse=[];sparse.length=1;for(const value of [null,undefined,{},[0],[-1n],[256n],sparse,getter,proxy,Object.assign([0n],{extra:1}),new Uint8Array([0])])assert.throws(()=>runtime.router_core_base64_standard_encode_bytes(value),TypeError);
 for(const value of [hostile,new String('f'),'\ud800','\udc00','a\ud800b']){assert.throws(()=>runtime.router_core_base64_standard_encode_text(value),TypeError);assert.throws(()=>runtime.router_core_base64_standard_decode_text(value),TypeError);}assert.equal(hooks,0);
 for(const length of [0,31,33])assert.throws(()=>runtime.router_core_base64_url_no_pad_encode_array32(Array(length).fill(0n)),TypeError);
 const large='a'.repeat(1048577);retain('full-overbound-text',large);assert.throws(()=>runtime.router_core_base64_standard_encode_text(large),/bounded primitive scalar text/);assert.throws(()=>runtime.router_core_base64_url_no_pad_decode_text(large),/bounded primitive scalar text/);
});

test('changed facade leaf Cargo and copied source nodes cannot mint owned base64 executable authority',()=>{
 const source=`pub fn good(value:${S})->${T}{${C}base64_standard_encode_text(value)}`,good=project(source);assert.equal(has(good,'good'),true);
 for(const change of [{'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE+'\n'},{'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE.replace('::base64::Engine::encode','unrelated::encode')},{'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE.replace('mod base64;','#[cfg(any())] mod base64;')},{'src/lib.rs':'mod translation_core;\n'+source}])assert.equal(has(project(source,change),'good'),false);
 const forged={k:'routerCoreBase64Call',operation:'base64_standard_encode_text',args:[],span:{start:0,end:1}};retain('complete-forged-call',forged);assert.throws(()=>checkRouterCoreBase64Call({},forged,new Map(),[],null),/private current source association/);
 assert.throws(()=>captureRouterCoreBase64Calls({}, {language:'Rust',items:[{k:'fn',name:'fake',params:[],ret:{kind:'string'},body:forged}]}),/original|checker|identity|prototype/i);
 const program=checked(good),entry=program.declarations.get('good');entry.body.compatibilityCore.sourceTransport='public-forgery';assert.throws(()=>emitJavaScript(program),/transport receipt/);
 const changed=checked(good);changed.declarations.get('good').body.span.end++;assert.throws(()=>emitJavaScript(changed),/function or spans changed/);
 const input=sourceFiles(source);assert.throws(()=>proposeCoreBase64Corpus({files:input,dependencyInputs:{manifest:manifest+'\n',lock}}),/dependency proof/);
});

test('whole-function source flow preserves owned moves and refuses wrong bytes reused owners and unproved calls',()=>{
 const source=`pub fn once(v:Vec<u8>)->${T}{${C}base64_standard_encode_owned_bytes(v)} pub fn branch(v:Vec<u8>,pick:bool)->${T}{if pick{${C}base64_standard_encode_owned_bytes(v)}else{${C}base64_url_no_pad_encode_owned_bytes(v)}}`;
 const result=project(source);assert.equal(has(result,'once'),true);assert.equal(has(result,'branch'),true);checked(result);
 for(const body of [
  `pub fn bad(v:Vec<u8>)->${T}{let first=${C}base64_standard_encode_owned_bytes(v);${C}base64_url_no_pad_encode_owned_bytes(v)}`,
  `pub fn bad(v:Vec<u16>)->${T}{${C}base64_standard_encode_owned_bytes(v)}`,
  `pub fn bad(v:&[u8])->${T}{${C}base64_standard_encode_owned_bytes(v)}`,
  `pub fn bad(v:${S})->${T}{${C}base64_url_no_pad_encode_owned_text(v)}`,
  `pub fn bad(v:&mut [u8])->${T}{${C}base64_standard_encode_bytes(v)}`,
  `fn external(v:Vec<u8>)->Vec<u8>{v} pub fn bad(v:Vec<u8>)->${T}{${C}base64_standard_encode_owned_bytes(external(v))}`,
 ])assert.equal(has(project(body),'bad'),false,body);
});

test('proposal rules retain complete argument source CST inverses and refuse unresolved native method candidates',()=>{
 const source='pub mod translation_core;\npub fn original(value:&str)->String{base64::Engine::encode(&base64::engine::general_purpose::STANDARD, value)}',files={...sourceFiles(''),'src/lib.rs':source},options={entry:'src/lib.rs',files,dependencyInputs:{manifest,lock},compilationProfile:PRODUCTION_PROFILE},proposal=retain('full-native-UFCS-proposal',proposeCoreBase64Corpus(options));
 const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,1);assert.equal(row.selections[0].originalTraitPermission,false);assert.match(row.after.source,/crate::translation_core::base64_standard_encode_text\(value\)/);
 let inverse=row.after.source;for(const map of [...row.mapping].reverse())if(map.kind==='substitution')inverse=inverse.slice(0,map.after[0])+map.expected+inverse.slice(map.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);
 const method='use base64::Engine as _;pub fn original(value:&str)->String{base64::engine::general_purpose::STANDARD.encode(value)}',positive=proposeCoreBase64Corpus({...options,files:{...files,'src/lib.rs':'pub mod translation_core;'+method}});retain('full-closed-native-method-proposal',positive);assert.equal(positive.proposals[0].edits.length,1);
 for(const prefix of ['mod base64{}','use competing::Engine as _;','use competing::*;','trait Other { fn encode(&self,value:&str)->String; }']){const negative=proposeCoreBase64Corpus({...options,files:{...files,'src/lib.rs':'pub mod translation_core;'+prefix+method}});retain('complete-unresolved-method-refusal',negative);assert.equal(negative.proposals.reduce((n,row)=>n+row.edits.length,0),0);}
 for(const prefix of ['type u8=u16;','use other::u8;']){const negative=proposeCoreBase64Corpus({...options,files:{...files,'src/lib.rs':'pub mod translation_core;'+prefix+'pub fn bytes(value:&[u8])->String{base64::Engine::encode(&base64::engine::general_purpose::STANDARD,value)}'}});retain('complete-primitive-u8-shadow-refusal',negative);assert.equal(negative.proposals.reduce((n,row)=>n+row.edits.length,0),0);}
 const child=proposeCoreBase64Corpus({...options,files:{...files,'src/lib.rs':'pub mod translation_core; use base64::Engine as _; pub mod child { pub fn text(value:&str)->String{base64::engine::general_purpose::STANDARD.encode(value)} }'}});retain('complete-noninherited-ancestor-Engine-refusal',child);assert.equal(child.proposals.reduce((n,row)=>n+row.edits.length,0),0);
 const qualified=proposeCoreBase64Corpus({...options,files:{...files,'src/lib.rs':'pub mod translation_core;pub fn other(value:&str)->String{different::base64::Engine::encode(&base64::engine::general_purpose::STANDARD,value)}'}});retain('complete-foreign-qualified-suffix-refusal',qualified);assert.equal(qualified.proposals.reduce((n,row)=>n+row.edits.length,0),0);
 assert.throws(()=>proposeCoreBase64Corpus({...options,files:new Proxy(files,{ownKeys(){throw Error('must not reflect proxy');}})}),/own data/);
});

test('native error Display lowering and complete emitted body layouts remain private across both strict targets',async()=>{
 const source=`pub fn display(error:${E},input:${S})->${T}{let unused=${C}base64_standard_decode_text(input);${C}format!("{error}")}`;
 const result=project(source);assert.equal(has(result,'display'),true);checked(result);
 await target(result,api=>{for(const row of vectors.decode)if(row.result.Err)assert.equal(api.display(expected(row).field0,'Zg=='),row.display,row.name);});
 const program=checked(result),error=program.declarations.get('router_core_base64.Base64Error');assert.ok(error);error.ctors[0].fields[0].type={kind:'bool'};assert.throws(()=>emitJavaScript(program),/error|layout|field/);
 const debug=project(`pub fn bad(error:${E},input:${S})->${T}{let unused=${C}base64_standard_decode_text(input);${C}format!("{error:?}")}`);assert.equal(has(debug,'bad'),false);
});
