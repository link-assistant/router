import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeJsonTextGzip} from '../../../evidence/write-json-gzip.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript,parseOwnedCoreDocumentMeta,emitRust} from '../translator.mjs';
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {buildOwnedCoreDocumentArtifacts,captureOwnedCoreCorpus} from '../owned-core-corpus.mjs';
import {ownedBase64Operation} from '../owned-base64-source.mjs';
import {parseLinks,textOf,writeLink,encodeWord} from '../vendor/lino.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../../router-core-source-data.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),nativeJson=JSON.stringify,vectorRoot=process.env.ROUTER_OWNED_BASE64_VECTOR_DIR;let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>nodeTest(name,{timeout:60000},async t=>{vectors=[];try{await run(t);}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});const text=nativeJson({name,vectors},(_,value)=>typeof value==='bigint'?{$integer:String(value)}:value);writeJsonTextGzip(join(vectorRoot,Buffer.from(name).toString('hex')+'.json.gz'),text);}}});
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:5000,maxBuffer:16777216});}
const oracle=original('tests/translation_core_base64_reverse_oracle.rs'),source=/const REVERSE_BASE64_JS_WITNESS: &str = r###"([\s\S]*?)"###;/u.exec(oracle)[1];
const names=['standard_encode_bytes','standard_encode_text','standard_encode_owned_bytes','standard_no_pad_encode_text','url_no_pad_encode_bytes','url_no_pad_encode_owned_bytes','url_no_pad_encode_owned_text','url_no_pad_encode_array32','standard_decode_text','standard_decode_owned_text','standard_no_pad_decode_text','url_no_pad_decode_text','url_no_pad_decode_owned_text'];
const fixture=JSON.parse(original('tools/translation/test/fixtures/router-core-base64-vectors.json'));
function data(js=source,typed){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:'caller.mjs',source:js},...(typed===undefined?[]:[{path:'caller.mts',source:typed}])]};}
function receive(js=source,typed){const input=retain('complete-receiving-source',data(js,typed)),context=createOwnedCoreSourceContext(input),result=retain('complete-source-document-result',translateOwnedCoreDocumentJavaScript(js,{context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'}));return {input,context,result};}
function write(directory,path,text){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);}
function temporary(t){const directory=mkdtempSync(join(tmpdir(),'owned-base64-reverse-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));return directory;}
async function targets(t,row){const directory=temporary(t);for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(directory,file.path,file.source);write(directory,'reverse.mts',row.result.typescript);
 const paths=['reverse.mts',...(row.input.files.some(file=>file.path==='caller.mts')?['caller.mts']:[])];
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),...paths.map(path=>join(directory,path))],{cwd:root,timeout:20000,encoding:'utf8',stdio:'pipe'});
 for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write(directory,'out/'+file.path,file.source);
 return {javascript:await import(pathToFileURL(join(directory,'caller.mjs')).href),reverse:await import(pathToFileURL(join(directory,'out/reverse.mjs')).href),...(paths.length>1?{typed:await import(pathToFileURL(join(directory,'out/caller.mjs')).href)}:{})};}
const octets=bytes=>Object.freeze(bytes.map(BigInt));
function expected(row){if(Object.hasOwn(row.result,'Ok'))return {$:'Ok',field0:octets(row.result.Ok)};const {variant,...fields}=row.result.Err;return {$:'Err',field0:{$:variant,...Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,BigInt(value)]))}};}
function typedSource(){let value=source;for(let at=0;at<names.length;at++)value=value.replace('function '+names[at]+'(value)','function '+names[at]+'(value:Parameters<typeof op'+at+'>[0]):ReturnType<typeof op'+at+'>');return value.replace('function error_text(error)','function error_text(error:Parameters<typeof displayRuntime>[0]):string');}
function changed(meta,run){const rows=parseLinks(meta).map(row=>({head:row[0],value:JSON.parse(textOf(row[1]))}));run(rows);return rows.map(row=>writeLink([row.head,encodeWord(nativeJson(row.value))])+'\n').join('');}
const item=rows=>rows.find(row=>row.head==='owned-source-item').value;

test('reverse base64 binds all thirteen actual imports with explicit borrowed ABI and owned conversions',async t=>{
 const row=receive(source,typedSource());assert.equal(row.result.program.length,14);const again=parseOwnedCoreDocumentMeta(row.result.meta,{context:row.context});assert.equal(emitRust(again),row.result.rust);assert.match(row.result.rust,/to_vec\(\)/);assert.match(row.result.rust,/to_owned\(\)/);assert.match(row.result.rust,/TryInto::<\[u8; 32\]>/);assert.match(row.result.rust,/value: &\[u8\]/);assert.match(row.result.rust,/value: &str/);
 const api=await targets(t,row),bytes=octets(Array(32).fill(0));for(const name of names){const op=ownedBase64Operation('router_core_base64_'+name),input=op.input==='bytes-ref'?bytes:name.includes('decode')?'Zg==':'f';assert.deepEqual(api.reverse[name](input),api.javascript[name](input));assert.deepEqual(api.typed[name](input),api.javascript[name](input));}
});

test('reverse original JS evaluator and strict targets consume complete shared encode and decode vectors',async t=>{
 const row=receive(),api=await targets(t,row);retain('complete-shared-independent-fixture',fixture);assert.equal(fixture.encode.length,15);assert.equal(fixture.decode.length,252);
 for(const sample of fixture.encode){const bytes=octets(sample.bytes);for(const module of [api.javascript,api.reverse]){assert.equal(module.standard_encode_bytes(bytes),sample.standard);assert.equal(module.standard_encode_owned_bytes(bytes),sample.standard);assert.equal(module.url_no_pad_encode_bytes(bytes),sample.urlNoPad);assert.equal(module.url_no_pad_encode_owned_bytes(bytes),sample.urlNoPad);if(bytes.length===32)assert.equal(module.url_no_pad_encode_array32(bytes),sample.urlNoPad);if(Object.hasOwn(sample,'text')){assert.equal(module.standard_encode_text(sample.text),sample.standard);assert.equal(module.standard_no_pad_encode_text(sample.text),sample.standardNoPad);assert.equal(module.url_no_pad_encode_owned_text(sample.text),sample.urlNoPad);}}}
 const encoders={};for(const family of ['standard','url_no_pad']){const js=`import {router_core_base64_${family}_encode_bytes as encode} from './runtime/base64-runtime.mjs';\n/** @param {Parameters<typeof encode>[0]} value */\nexport function encode_value(value){return encode(value);}`,single=receive(js);encoders[family]={program:single.result.program,token:await prepareOwnedCoreRuntime(single.result.program)};}
 for(const sample of fixture.encode)for(const family of ['standard','url_no_pad']){const check=encoders[family],actual=evaluate(check.program,'encode_value',[octets(sample.bytes)],check.token);assert.equal(actual,sample[family==='standard'?'standard':'urlNoPad']);retain('complete-encode-evaluator-observation',{name:sample.name,family,actual});}
 const checks={};for(const [configuration,family]of [['STANDARD','standard'],['STANDARD_NO_PAD','standard_no_pad'],['URL_SAFE_NO_PAD','url_no_pad']]){const js=`import {router_core_base64_${family}_decode_text as decode} from './runtime/base64-runtime.mjs';\n/** @param {string} value */\nexport function decode_value(value){return decode(value);}`,single=receive(js);checks[configuration]={program:single.result.program,token:await prepareOwnedCoreRuntime(single.result.program)};}
 for(const sample of fixture.decode){const name=({STANDARD:'standard',STANDARD_NO_PAD:'standard_no_pad',URL_SAFE_NO_PAD:'url_no_pad'}[sample.configuration])+'_decode_text',wanted=expected(sample),check=checks[sample.configuration];for(const module of [api.javascript,api.reverse])for(const selected of [name,...(sample.configuration==='STANDARD_NO_PAD'?[]:[name.replace('_decode_text','_decode_owned_text')])]){const actual=module[selected](sample.input);assert.deepEqual(actual,wanted,sample.name);if(actual.$==='Err')assert.equal(module.error_text(actual.field0),sample.display);}const actual=evaluate(check.program,'decode_value',[sample.input],check.token);assert.deepEqual(actual,wanted,sample.name);retain('complete-evaluator-observation',{name:sample.name,actual});}
});

test('reverse base64 preserves reusable inputs local aliases array32 bounds and once-only calls',async()=>{
 const js="import {router_core_base64_standard_encode_owned_bytes as encode,router_core_base64_url_no_pad_encode_array32 as fixed} from './runtime/base64-runtime.mjs';\n/** @param {Parameters<typeof encode>[0]} value */\nexport function twice(value){const first=encode(value);return encode(value);}\n/** @param {Parameters<typeof fixed>[0]} value */\nexport function array(value){const alias=value;return fixed(alias);}";
 const row=receive(js),token=await prepareOwnedCoreRuntime(row.result.program),bytes=octets([102]);assert.equal(evaluate(row.result.program,'twice',[bytes],token),'Zg==');assert.deepEqual(bytes,[102n]);assert.equal(evaluate(row.result.program,'array',[octets(Array(32).fill(0))],token),'A'.repeat(43));for(const length of [31,33])assert.throws(()=>evaluate(row.result.program,'array',[octets(Array(length).fill(0))],token),{name:'TypeError',message:'Owned base64 value domain: byte array length'});
 const twice=row.result.program.find(item=>item.name==='twice');assert.equal(twice.body[0].value.kind,'base64-call');assert.equal(twice.body[1].value.kind,'base64-call');assert.equal(twice.body[0].value.copy,'to_vec');
});

test('reverse base64 aliases and transparent exports preserve real native symbols while impostors refuse',()=>{
 const js="import {forwarded as selected} from './bridge.mjs';\n/** @param {string} value */\nexport function encoded(value){return selected(value);}",input=data(js);input.files.push({path:'bridge.mjs',source:"export {router_core_base64_standard_encode_text as forwarded} from './runtime/base64-runtime.mjs';"});const context=createOwnedCoreSourceContext(input),result=translateOwnedCoreDocumentJavaScript(js,{context,sourcePath:'caller.mjs'});assert.equal(result.program.length,1);assert.deepEqual(result.program[0].hostCalls[0].links.map(row=>row.path),['bridge.mjs','runtime/base64-runtime.mjs']);
 for(const code of ["import * as selected from './runtime/base64-runtime.mjs';\n/** @param {string} value */\nexport function bad(value){return selected.router_core_base64_standard_encode_text(value);}","import {router_core_base64_standard_encode_text as encode} from './runtime/base64-runtime.mjs';\n/** @param {string} value */\nexport function bad(value){const encode=value;return encode(value);}","import {router_core_base64_standard_encode_bytes as encode} from './runtime/base64-runtime.mjs';\n/** @param {Array<bigint>} value */\nexport function bad(value){return encode(value);}"]){assert.throws(()=>receive(code),/named|import|type|domain|symbol/);}
 const cycle=data(js);cycle.files.push({path:'bridge.mjs',source:"export {forwarded} from './bridge.mjs';"});assert.throws(()=>translateOwnedCoreDocumentJavaScript(js,{context:createOwnedCoreSourceContext(cycle),sourcePath:'caller.mjs'}),/depth/);
});

test('reverse base64 copied edited source documents runtime leaf Cargo and type claims refuse',()=>{
 const row=receive();for(const change of [rows=>{item(rows).body[0].value.copy='to_vec';},rows=>{item(rows).source.span[0]++;},rows=>{item(rows).params[0].type='json-ref';},rows=>{item(rows).hostCalls[0].links[0].sourceRef.span[1]--;},rows=>{rows[1].value.document.nodes[0][3]--;},rows=>{item(rows).sourceAuthority=true;}])assert.throws(()=>parseOwnedCoreDocumentMeta(changed(row.result.meta,change),{context:row.context}));
 assert.throws(()=>emitRust(JSON.parse(nativeJson(row.result.program))),/unissued/);
 for(const path of ['runtime/base64-runtime.mjs','src/translation_core/base64.rs','Cargo.toml']){const input=data();input.files.find(row=>row.path===path).source+='\n';assert.throws(()=>translateOwnedCoreDocumentJavaScript(source,{context:createOwnedCoreSourceContext(input),sourcePath:'caller.mjs'}),/runtime|leaf|dependency|base64|profile|source/);}
});

test('reverse native result locals remain affine and error inputs permit only fixed borrowing Display',async()=>{
 const js="import {router_core_base64_standard_decode_text as decode,base64ErrorText as display} from './runtime/base64-runtime.mjs';\n/**\n * @param {string} value\n * @param {boolean} yes\n */\nexport function choose(value,yes){const local=decode(value);if(yes){return local;}else{return local;}}\n/** @param {Parameters<typeof display>[0]} error */\nexport function text(error){return display(error);}";
 const row=receive(js),token=await prepareOwnedCoreRuntime(row.result.program);for(const yes of [true,false])assert.deepEqual(evaluate(row.result.program,'choose',['Zg==',yes],token),{$:'Ok',field0:octets([102])});assert.equal(evaluate(row.result.program,'text',[{$:'InvalidPadding'}],token),'Invalid padding');
 for(const body of ['const local=decode(value);const first=local;return local;','return decode(value).field0;','return {$:"Ok",field0:[]};','while(true){return decode(value);}','return (()=>decode(value))();']){const bad="import {router_core_base64_standard_decode_text as decode} from './runtime/base64-runtime.mjs';\n/** @param {string} value */\nexport function bad(value){"+body+'}';assert.throws(()=>receive(bad),/move|expression|statement|owned|domain|import/i);}
});

test('actual reverse corpus captures the full base64 leaf and keeps independent witness outside application counts',t=>{
 const directory=temporary(t),js='js/generated/rust-project',ts='ts/generated/rust-project';for(const file of data().files){const path=file.path==='caller.mjs'?js+'/caller.mjs':file.path.startsWith('runtime/')?(file.path.endsWith('.mts')?ts:js)+'/'+file.path:file.path;write(directory,path,file.source);}write(directory,'tests/translation_core_base64_reverse_oracle.rs',oracle);
 const capture=captureOwnedCoreCorpus(directory);assert.ok(capture.files.some(row=>row.path==='src/translation_core/base64.rs'));const result=retain('complete-actual-corpus',Object.fromEntries(buildOwnedCoreDocumentArtifacts(directory).artifacts));assert.ok(result['tools/translation/js-to-rust/generated/owned-base64-witness.rs']);const report=JSON.parse(result['parity/js-owned-core-reverse-draft.json']);assert.equal(report.base64Witness.applicationItems,0);assert.equal(report.base64Witness.functions,14);assert.equal(report.rustExecuted,false);
 write(directory,'src/translation_core/base64.rs',ROUTER_CORE_BASE64_SOURCE+'\n');assert.throws(()=>capture.requireCurrent(),/changed/);
});

test('reverse base64 private source route keeps complete CST and late observer input refusal boundaries',async t=>{
 const row=receive(source,typedSource()),api=await targets(t,row),checked=parseOwnedCoreDocumentMeta(row.result.meta,{context:row.context});assert.equal(checked.length,14);assert.equal(emitRust(checked),row.result.rust);retain('complete-native-CST',row.result.concreteSyntax);assert.equal(api.reverse.standard_encode_text('é🦀'),api.javascript.standard_encode_text('é🦀'));
 let calls=0;const proxy=new Proxy([0n],{get(){calls++;return 0n;}});for(const module of [api.javascript,api.reverse])assert.throws(()=>module.standard_encode_bytes(proxy),TypeError);assert.equal(calls,0);
 const hostile={toString(){calls++;return 'f';}};for(const module of [api.javascript,api.reverse])assert.throws(()=>module.standard_encode_text(hostile),TypeError);assert.equal(calls,0);
 const input=data();input.files=new Proxy(input.files,{get(){throw Error('must not enter caller proxy');}});assert.throws(()=>createOwnedCoreSourceContext(input),/non-data/);
});
