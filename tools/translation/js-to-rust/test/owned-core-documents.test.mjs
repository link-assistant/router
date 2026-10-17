import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOwnedCoreSourceContext,translateOwnedCoreJavaScript,translateOwnedCoreDocumentJavaScript,translateOwnedCoreDocumentConcreteSyntaxMeta,parseOwnedCoreMeta,parseOwnedCoreDocumentMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {serializeOwnedCoreDocument} from '../owned-core-document.mjs';
import {ownedCoreRuntimeSources,ownedCoreSourceData} from '../owned-core-source.mjs';
import {buildOwnedCoreArtifacts,buildOwnedCoreDocumentArtifacts,captureOwnedCoreCorpus} from '../owned-core-corpus.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {parseLinks,textOf,encodeWord,writeLink} from '../vendor/lino.mjs';
import {json_macro_null,json_macro_string,json_macro_object} from '../../json-macro-runtime.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000};
const imports="import {router_core_json_copy as copy,router_core_json_with_field as update,router_core_json_index_str as index} from './runtime/json-update-runtime.mjs';\n",types="import type {JsonValue} from './runtime/json-macro-runtime.mjs';\n";
const source=imports+'export function copied(value){return copy(value);}',typed=imports+types+'export function copied(value:JsonValue):JsonValue{return copy(value);}';
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16777216});}
function input(js=source,ts=typed){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}]};}
function receive(js=source,ts=typed){const data=input(js,ts),context=createOwnedCoreSourceContext(data),options={sourcePath:'caller.mjs',context,typescriptOutputPath:'reverse.mts'},old=translateOwnedCoreJavaScript(js,options),result=translateOwnedCoreDocumentJavaScript(js,options);return {data,context,old,result,options};}
function rows(meta){return parseLinks(meta).map(row=>({head:row[0],value:JSON.parse(textOf(row[1]))}));}
function wire(rows){return rows.map(row=>writeLink([row.head,encodeWord(JSON.stringify(row.value))])+'\n').join('');}
function changed(meta,change){const selected=rows(meta);change(selected);return wire(selected);}
const item=rows=>rows.find(row=>row.head==='owned-source-item').value;
function write(directory,path,text){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);}
function temporary(t,prefix){const directory=mkdtempSync(join(tmpdir(),prefix));t.after(()=>rmSync(directory,{recursive:true,force:true}));return directory;}
function strict(directory,paths){try{execFileSync(process.execPath,[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),...paths.map(path=>join(directory,path))],{cwd:root,encoding:'utf8',timeout:20000,stdio:'pipe'});}catch(error){assert.fail('strict document TypeScript failed\n'+String(error.stdout??'')+'\n'+String(error.stderr??''));}}
async function targets(t,js=source,ts=typed){
 const row=receive(js,ts),directory=temporary(t,'owned-source-doc-');for(const file of row.data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(directory,file.path,file.source);
 write(directory,'reverse.mts',row.result.typescript);strict(directory,['caller.mts','reverse.mts']);for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write(directory,'out/'+file.path,file.source);
 const javascript=await import(pathToFileURL(join(directory,'caller.mjs')).href),typedOriginal=await import(pathToFileURL(join(directory,'out/caller.mjs')).href),typedReverse=await import(pathToFileURL(join(directory,'out/reverse.mjs')).href),runtime=await prepareOwnedCoreRuntime(row.result.program);
 return {...row,javascript,typedOriginal,typedReverse,run:(name,args)=>evaluate(row.result.program,name,args,runtime)};
}
function physical(t,{witness=false}={}){
 const directory=temporary(t,'owned-document-corpus-'),js='packages/javascript/generated/rust-project',ts='packages/typescript/generated/rust-project';
 for(const row of input().files){const path=row.path==='caller.mjs'?js+'/caller.mjs':row.path==='caller.mts'?ts+'/caller.mts':row.path.startsWith('runtime/')?(row.path.endsWith('.mts')?ts:js)+'/'+row.path:row.path;write(directory,path,row.source);}
 if(witness)write(directory,'tests/translation_core_reverse_owned_oracle.rs',original('tests/translation_core_reverse_owned_oracle.rs'));return {directory,js,ts};
}
test('source documents preserve independently executed copy update index and both strict targets',limits,async t=>{
 const js=source+'\nexport function changed(value){return update(value,"é",copy(value));}\nexport function read_field(value){return index(value,"name");}',ts=typed+'\nexport function changed(value:JsonValue):JsonValue{return update(value,"é",copy(value));}\nexport function read_field(value:JsonValue):JsonValue{return index(value,"name");}',api=await targets(t,js,ts),value=json_macro_object([['name',json_macro_string('🦀')]]),golden=json_macro_object([['name',json_macro_string('🦀')]]),updated=json_macro_object([['name',json_macro_string('🦀')],['é',golden]]),stored=value.field0.entries.find(row=>row.key==='name').value;
 for(const call of [api.javascript,api.typedOriginal,api.typedReverse,{copied:value=>api.run('copied',[value]),changed:value=>api.run('changed',[value]),read_field:value=>api.run('read_field',[value])}]){assert.deepEqual(call.copied(value),golden);assert.notEqual(call.copied(value),value);assert.ok(Object.isFrozen(call.copied(value)));assert.deepEqual(call.changed(value),updated);assert.equal(call.read_field(value),stored);assert.equal(call.read_field(json_macro_null()).$,'Null');}
 assert.equal(api.result.rust,api.old.rust);assert.equal(api.result.typescript,api.old.typescript);assert.deepEqual(api.result.trace.map(row=>row.phase),['language','repository']);assert.equal(api.result.profile,'router-owned-core-source-document-v1');
 const repeated=translateOwnedCoreDocumentConcreteSyntaxMeta(api.result.concreteSyntax.meta,api.options);assert.equal(repeated.meta,api.result.meta);assert.equal(repeated.rust,api.result.rust);
});
test('complete ordered originals CST and paired import references expand to exact old checked data',limits,()=>{
 const received=receive(),stored=rows(received.result.meta),header=stored[0].value,compact=item(stored),csts=stored.filter(row=>row.head==='owned-source-cst');
 assert.deepEqual(header.context,ownedCoreSourceData(received.context));assert.deepEqual(csts.map(row=>row.value.path),['caller.mjs','caller.mts']);
 for(const row of csts){assert.equal(Object.hasOwn(row.value.document,'source'),false);assert.deepEqual(row.value.document.sourceRef.span,[0,header.context.files.find(file=>file.path===row.value.path).source.length]);}
 assert.equal(Object.hasOwn(compact.source,'source'),false);assert.equal(Object.hasOwn(compact.pairedSource,'source'),false);assert.equal(Object.hasOwn(compact.pairedSource,'erasure'),false);for(const call of compact.hostCalls)for(const link of call.links){assert.equal(Object.hasOwn(link,'source'),false);assert.ok(link.sourceRef);}
 const expanded=parseOwnedCoreDocumentMeta(received.result.meta,{context:received.context});assert.deepEqual(JSON.parse(JSON.stringify(expanded)),JSON.parse(JSON.stringify(received.old.program)));assert.equal(emitRust(expanded),received.old.rust);assert.equal(serializeOwnedCoreDocument(expanded,{context:received.context}),received.result.meta);
 assert.throws(()=>parseOwnedCoreMeta(received.result.meta,{context:received.context}));assert.throws(()=>parseOwnedCoreDocumentMeta(received.old.meta,{context:received.context}));assert.equal(translateOwnedCoreJavaScript(source,received.options).meta,received.old.meta);
 const keyJS=source.replace('return copy(value);','return update(value,"source",copy(value));'),keyTS=typed.replace('return copy(value);','return update(value,"source",copy(value));'),key=receive(keyJS,keyTS);assert.ok(JSON.stringify(item(rows(key.result.meta)).body).includes('"value":"source"'));
 const bridge="export {router_core_json_copy as forwarded} from './runtime/json-update-runtime.mjs';",bridgeImport="import {forwarded as copy} from './bridge.mjs';\n",bridgeJS=bridgeImport+source.slice(imports.length),bridgeTS=bridgeImport+types+typed.slice((imports+types).length),data=input(bridgeJS,bridgeTS);data.files.push({path:'bridge.mjs',source:bridge});const context=createOwnedCoreSourceContext(data),result=translateOwnedCoreDocumentJavaScript(bridgeJS,{context,sourcePath:'caller.mjs'}),links=item(rows(result.meta)).hostCalls[0].links;assert.deepEqual(links.map(row=>row.path),['bridge.mjs','runtime/json-update-runtime.mjs']);assert.equal(parseOwnedCoreDocumentMeta(result.meta,{context})[0].hostCalls[0].links[0].source,bridge);

});
test('missing foreign duplicate reordered and forged whole source references refuse',limits,()=>{
 const {result,context}=receive(),reject=change=>assert.throws(()=>parseOwnedCoreDocumentMeta(changed(result.meta,change),{context}));
 reject(rows=>{delete item(rows).source.sourceRef;});reject(rows=>{item(rows).source.sourceRef.path='foreign.mjs';});reject(rows=>{item(rows).source.sourceRef.span[1]--;});reject(rows=>{item(rows).source.sourceRef.owner=true;});reject(rows=>{const value=item(rows);const first=value.kind;delete value.kind;value.kind=first;});reject(rows=>{item(rows).source.span[0]++;});
 reject(rows=>{item(rows).pairedSource.path='other.mts';});reject(rows=>{item(rows).pairedSource.span[1]--;});reject(rows=>{item(rows).hostCalls[0].links[0].sourceRef.span[1]--;});reject(rows=>{item(rows).hostCalls[0].links[0].from.span[0]++;});
 reject(rows=>{rows.splice(1,1);});reject(rows=>{rows.splice(1,0,rows[1]);});reject(rows=>{[rows[1],rows[2]]=[rows[2],rows[1]];});reject(rows=>{rows[1].value.document.nodes[0][3]--;});reject(rows=>{rows[0].value.context.files[0].source+='\n';});
 const data=input();data.files.find(row=>row.path==='runtime/json-update-runtime.mjs').source+='\n';assert.throws(()=>createOwnedCoreSourceContext(data),/runtime differs/u);
});
test('reconstructed metadata still requires the exact current original body ABI loan and callee',limits,()=>{
 const {result,context}=receive(),reject=change=>assert.throws(()=>parseOwnedCoreDocumentMeta(changed(result.meta,rows=>change(item(rows))),{context}));
 reject(value=>{value.returns='bool';});reject(value=>{value.resultRoot='value';});reject(value=>{value.params[0].type='bool';});reject(value=>{value.body[0].value.name='router_core_json_index_str';});reject(value=>{value.hostCalls[0].target='runtime/forged.mjs';});reject(value=>{value.sourceResolved=true;});
 const fake=JSON.parse(JSON.stringify(result.program));assert.throws(()=>emitRust(fake),/unissued/u);
 const data=input();data.files.find(row=>row.path==='src/translation_core/primitives.rs').source+='\n';assert.throws(()=>createOwnedCoreSourceContext(data),/owned Rust sources differ/u);
});
test('many complete functions share stored originals without skipping any checked declaration',limits,()=>{
 const bodies=Array.from({length:12},(_,at)=>({js:'export function copied_'+at+'(value){return copy(value);}',ts:'export function copied_'+at+'(value:JsonValue):JsonValue{return copy(value);}'})),js=imports+bodies.map(row=>row.js).join('\n'),ts=imports+types+bodies.map(row=>row.ts).join('\n'),received=receive(js,ts),stored=rows(received.result.meta);
 assert.equal(received.result.program.length,12);assert.equal(stored.filter(row=>row.head==='owned-source-cst').length,2);assert.equal(stored.filter(row=>row.head==='owned-source-item').length,12);assert.equal(stored[0].value.context.files.filter(row=>row.path==='caller.mjs').length,1);
 const parsed=parseOwnedCoreDocumentMeta(received.result.meta,{context:received.context});for(let at=0;at<12;at++){assert.equal(parsed[at].javascript,'copied_'+at);assert.equal(js.slice(...parsed[at].source.span),bodies[at].js);assert.equal(ts.slice(...parsed[at].pairedSource.span),bodies[at].ts);}assert.equal(emitRust(parsed),received.old.rust);
 assert.throws(()=>parseOwnedCoreDocumentMeta(changed(received.result.meta,rows=>{const all=rows.filter(row=>row.head==='owned-source-item');all.at(-1).value.source.span=all[0].value.source.span;}),{context:received.context}));
});
test('exact escaping early output bounds and flat framing retain existing limits',limits,()=>{
 const comment='// quotes " backslash \\ controls \t BMPé astral🦀 lone'+String.fromCharCode(0xd800)+'\n',received=receive(imports+comment+source.slice(imports.length),imports+types+comment+typed.slice((imports+types).length));assert.equal(parseOwnedCoreDocumentMeta(received.result.meta,{context:received.context})[0].source.source,imports+comment+source.slice(imports.length));
 assert.throws(()=>parseOwnedCoreDocumentMeta('(owned-source-document ('+'x'.repeat(16)+'))\n'));assert.throws(()=>parseOwnedCoreDocumentMeta(received.result.meta.replace('%7B','%7b')));assert.throws(()=>parseOwnedCoreDocumentMeta(received.result.meta+'\n'));assert.throws(()=>parseOwnedCoreDocumentMeta('x'.repeat(33554433)),/byte bound/u);
 const excessive=input();excessive.files.push({path:'retained.txt',source:'\0'.repeat(4500000)});const context=createOwnedCoreSourceContext(excessive);assert.throws(()=>serializeOwnedCoreDocument([],{context}),/encoded document byte bound/u);
 let touched=0;const hostile=[];Object.defineProperty(hostile,'0',{get(){touched++;return received.result.program[0];},enumerable:true});assert.throws(()=>serializeOwnedCoreDocument(hostile,{context:received.context}),/accessor/u);assert.equal(touched,0);
 const proxy=new Proxy([],{get(){assert.fail('proxy observed');}});assert.throws(()=>serializeOwnedCoreDocument(proxy,{context:received.context}),/ordinary program/u);
 const stack=[];Object.defineProperty(stack,'stack',{get(){touched++;throw Error('formatter invoked');}});assert.throws(()=>serializeOwnedCoreDocument(stack,{context:received.context}),/unknown program key/u);assert.equal(touched,0);assert.throws(()=>parseOwnedCoreDocumentMeta(received.result.meta,{context:{schema:'owned-core-source-context-v1'}}),/unissued/u);
});
test('explicit corpus discovery keeps every original refusal target and current input join',limits,t=>{
 const {directory,js}=physical(t);write(directory,js+'/refused.mjs','export function unsupported(value){return value.clone();}');const capture=captureOwnedCoreCorpus(directory),legacy=buildOwnedCoreArtifacts(directory),document=buildOwnedCoreDocumentArtifacts(directory);
 assert.equal(document.manifest.profile,'router-owned-core-source-document-v1');assert.deepEqual(document.manifest.totals,legacy.manifest.totals);assert.equal(document.manifest.totals.translatedItems,1);assert.equal(document.manifest.totals.unsupportedItems,1);assert.deepEqual(document.manifest.modules,legacy.manifest.modules);assert.deepEqual(document.manifest.inputs,legacy.manifest.inputs);
 for(const [path,content]of legacy.artifacts)if(path.endsWith('.rs.txt')||path.endsWith('.ts')||path.endsWith('/inputs.json'))assert.equal(document.artifacts.get(path),content);
 const path='tools/translation/js-to-rust/generated/owned-core/caller.lino',meta=document.artifacts.get(path).split('\n').slice(1).join('\n');assert.equal(parseOwnedCoreDocumentMeta(meta).length,1);assert.deepEqual(document.manifest.trace.map(row=>row.phase),['language','repository']);
 write(directory,js+'/caller.mjs',source+'\n// changed');assert.throws(()=>capture.requireCurrent(),/complete input changed/u);assert.equal(buildOwnedCoreDocumentArtifacts(directory).manifest.totals.translatedItems,0);
 // Complete actual parents are retained separately; no fixture gain is counted
 // as application admission or used to erase their existing refusals.
 const actual=buildOwnedCoreDocumentArtifacts(root),inputs=JSON.parse(actual.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));for(const row of actual.manifest.modules){assert.equal(inputs.files.find(file=>file.path===row.path).source,original(row.path));assert.equal(row.sourceItems,row.translatedItems+row.unsupportedItems);}assert.equal(actual.manifest.runtimeParity,false);assert.equal(actual.manifest.wholeSourceSynchronization,false);
});
test('actual CI Rust witness replays through source documents with identical targets and strict goldens',limits,async t=>{
 const {directory}=physical(t,{witness:true}),legacy=buildOwnedCoreArtifacts(directory),document=buildOwnedCoreDocumentArtifacts(directory),prefix='tools/translation/js-to-rust/generated/owned-core-witness';for(const [path,content]of legacy.artifacts)if(path.startsWith(prefix))assert.equal(document.artifacts.get(path),content);
 const old=legacy.artifacts.get(prefix+'.lino'),program=parseOwnedCoreMeta(old),evidence=JSON.parse(legacy.artifacts.get(prefix+'-inputs.json')),context=createOwnedCoreSourceContext(evidence.stagedReceivingInputs),meta=serializeOwnedCoreDocument(program,{context}),reparsed=parseOwnedCoreDocumentMeta(meta,{context});assert.equal(emitRust(reparsed),emitRust(program));assert.equal(emitTypeScript(reparsed,{outputPath:prefix+'/witness.mts'}),legacy.artifacts.get(prefix+'/witness.mts'));
 for(const [path,content]of document.artifacts)write(directory,path,content);strict(directory,[prefix+'/witness.mts']);for(const [path,content]of document.artifacts)if(path.startsWith(prefix+'/runtime/'))write(directory,'out/'+path,content);
 const api=await import(pathToFileURL(join(directory,'out',prefix,'witness.mjs')).href),runtime=await prepareOwnedCoreRuntime(reparsed),value=json_macro_object([['name',json_macro_string('é🦀')]]);assert.deepEqual(api.copied(value),value);assert.notEqual(api.copied(value),value);assert.deepEqual(evaluate(reparsed,'copied',[value],runtime),value);assert.equal(api.nested(json_macro_null()).$,'Object');assert.equal(evidence.applicationItems,0);assert.equal(document.manifest.witness.applicationItems,0);assert.equal(document.manifest.rustExecuted,false);
});
