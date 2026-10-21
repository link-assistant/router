// New historical DATA associations, not additional original16 cases or proof.
import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {STATIC_SOURCE_LIFECYCLE_CASES,STATIC_SOURCE_LIFECYCLE_PROFILES} from '../prepare-real-source-fixtures.mjs';
import {staticSourceAssociatedContext,staticSourceLifecycleContext} from './real-source-fixtures.mjs';
import {associatedOriginalSourceReader,associatedOriginalFileReader} from './associated-original-context.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),read=path=>readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('./fixtures/outside-static-source-associations.json',import.meta.url),'utf8'));
const ids=['bool-then-some.test.mjs','bridge-stop-edges.test.mjs','copy-translation.test.mjs','csv-original-source.test.mjs','derive-helper-originals.test.mjs','option-borrowed-str-equality.test.mjs::telegram-case4'];
let vectors;
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const output=process.env.ROUTER_OUTSIDE_SOURCE_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeJsonGzip(join(output,Buffer.from(name).toString('hex')+'.json.gz'),{name,vectors},(_key,value)=>typeof value==='bigint'?{$bigint:value.toString()}:value instanceof Map?{$map:[...value]}:value);}}});
function parents(context){return context.association.parents.map(pin=>{const original=context.source(pin.path),current=context.sourceCurrent(pin.path);assert.equal(Buffer.byteLength(original),pin.bytes);assert.equal(hash(original),pin.sha256);assert.equal(context.inputs.sources.find(row=>row.source===pin.path).gitBlob,pin.gitBlob);return {pin,original,current};});}
function completeInputs(context){
 const rows=context.inputs.sources,expected=STATIC_SOURCE_LIFECYCLE_PROFILES[context.inputs.sourceHead];assert.ok(expected);assert.equal(rows.length,expected.files);assert.equal(context.inputs.originalBytes,expected.bytes);assert.equal(context.inputs.digest,expected.sourceSetSha256);
 let total=0;for(const row of rows){const source=context.source(row.source),bytes=Buffer.from(source);assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.equal(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'),row.gitBlob);total+=bytes.length;}assert.equal(total,expected.bytes);
 assert.ok(rows.some(row=>row.source==='Cargo.toml'));assert.ok(rows.some(row=>row.source==='Cargo.lock'));return {inputs:context.inputs,current:context.current,lineage:context.lineage,scope:context.scope};
}
function currentCore(context,path){
 // Authored scoped crate root, with both full actual parents retained. This
 // deliberately does not claim whole-lib namespace equivalence or admission.
 const originalRoot=context.sourceCurrent('src/lib.rs'),module=path.slice(4,-3),items=sourceItems(originalRoot),selected=[];
 for(const name of ['translation_core',module]){const rows=items.filter(row=>row.term==='mod'&&row.name===name);assert.equal(rows.length,1);const row=rows[0],source=originalRoot.slice(row.start,row.end);assert.ok(source==='mod '+name+';'||source==='pub mod '+name+';','actual unconditional native module declaration');selected.push({name,span:[row.start,row.end],source});}
 selected.sort((a,b)=>a.span[0]-b.span[0]);const authored=selected.map(row=>row.source+'\n').join(''),before=transportConcreteSyntaxSource(originalRoot,{language:'Rust'}),beforeWire=serializeConcreteSyntaxMeta(before.document),parsed=transportConcreteSyntaxMeta(beforeWire);
 const rules={languageRules:[{id:'outside-source:retain-complete-current-root',edits:[]}],repositoryRules:[{id:'outside-source:author-explicit-Core-parent-scope',edits:[{span:[0,originalRoot.length],expected:originalRoot,replacement:authored}]}]},applied=applyConcreteSyntaxSubstitutions(parsed.document,rules),afterWire=serializeConcreteSyntaxMeta(applied.value),after=transportConcreteSyntaxMeta(afterWire);
 assert.equal(parsed.source,originalRoot);assert.equal(after.source,authored);
 const inverseRules={languageRules:[{id:'outside-source:retain-complete-authored-root',edits:[]}],repositoryRules:[{id:'outside-source:restore-complete-original-root',edits:[{span:[0,after.source.length],expected:after.source,replacement:originalRoot}]}]},inverseApplied=applyConcreteSyntaxSubstitutions(after.document,inverseRules),inverseWire=serializeConcreteSyntaxMeta(inverseApplied.value),inverse=transportConcreteSyntaxMeta(inverseWire);
 assert.equal(inverse.source,originalRoot);assert.equal(inverseWire,beforeWire);assert.deepEqual(inverse.document,parsed.document);
 const files={'src/lib.rs':authored};for(const file of [path,'src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs'])files[file]=context.sourceCurrent(file);
 const sourceCst=Object.entries(files).map(([path,source])=>{const document=transportConcreteSyntaxSource(source,{language:'Rust'}),wire=serializeConcreteSyntaxMeta(document.document),reparsed=transportConcreteSyntaxMeta(wire);assert.equal(reparsed.source,source);return {path,source,wire};});
 const cargo={manifest:context.sourceCurrent('rust/Cargo.toml'),lock:context.sourceCurrent('Cargo.lock')},result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:file=>{assert.ok(Object.hasOwn(files,file));return files[file];},cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo),jsonMacroDependencies:loadJsonMacroSourceProof(cargo),compilationProfile:context.inputs.compilationProfile});
 for(const [path,source]of Object.entries(files)){const rows=result.meta.sources.filter(row=>row.source===path);assert.equal(rows.length,1,'actual complete module '+path);assert.equal(rows[0].sha256,hash(source));}assert.equal(result.meta.runtimeParity,false);
 return {originalRoot,selected,beforeWire,afterWire,rules,inverseRules,inverseApplied,inverseWire,inverse,files,sourceCst,cargo,result,scope:'Complete current parent in an explicitly authored Core crate; all later refusals retained, no full parent/crate execution claim.'};
}

test('six new associations are disjoint from the unchanged original sixteen and carry no compiler authority',()=>{
 assert.deepEqual(manifest.entries.map(row=>row.id),ids);assert.equal(Object.keys(STATIC_SOURCE_LIFECYCLE_CASES).length,16);assert.equal(new Set(ids).size,6);
 for(const row of manifest.entries){assert.equal(Object.hasOwn(STATIC_SOURCE_LIFECYCLE_CASES,row.id),false);assert.ok(Object.hasOwn(STATIC_SOURCE_LIFECYCLE_PROFILES,row.revision));assert.ok(row.parents.length);assert.equal(new Set(row.parents.map(pin=>pin.path)).size,row.parents.length);}
 assert.deepEqual(manifest.authority,{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false});retain('manifest',manifest);
});

test('complete original universes retain every source Git blob Cargo input and original16 association',()=>{
 const context=staticSourceAssociatedContext(ids[0]),other=staticSourceLifecycleContext('option-ok-or-else.test.mjs');retain('new-association-complete-universe',completeInputs(context));retain('old16-second-complete-universe',completeInputs(other));
 assert.equal(context.inputs.sources.length,806);assert.equal(other.inputs.sources.length,808);assert.notEqual(context.inputs.sourceHead,other.inputs.sourceHead);assert.equal(context.source('Cargo.toml'),other.source('Cargo.toml'));assert.equal(context.source('Cargo.lock'),other.source('Cargo.lock'));retain('complete-bool-parents',parents(context));
 const packageSource=read('Cargo.toml');
 for(const selected of [context,other]){
  assert.equal(selected.sourceCurrent('Cargo.toml'),packageSource);
  assert.equal(selected.sourceCurrent('rust/Cargo.toml'),packageSource);
  assert.equal(selected.sourceCurrent('Cargo.lock'),read('Cargo.lock'));
  assert.equal(selected.sourceCurrent('src/lib.rs'),read('src/lib.rs'));
  assert.throws(()=>selected.sourceCurrent('src/__absent_original__.rs'),/unknown/);
 }
 retain('complete-current-package-path-joins',{associated:context.current,original:other.current,packageSource});
});

test('all original CSV scalar method and Default parents keep exact historical spans without prewarming compilation',()=>{
 const context=staticSourceAssociatedContext(ids[3]);retain('complete-CSV-context',completeInputs(context));const rows=parents(context);retain('complete-CSV-parents',rows);
 for(const [path,name,start,end,pin]of [['src/config.rs','parse_csv',38315,38488,'aa546ece7c5cb7ebf5daf009677a5e6c635c0396b53e313bb5f022710290a600'],['src/storage/associative.rs','split_repository_list',10643,10846,'b9699846f61b897d40553b7dcc150811f9d53becb2a5913aa2d086a0ce5213ac'],['src/stream_termination.rs','from_path',2166,2657,'662c23868e203a81321c0d92120e8f42c113597b92065ac907e443d511a6ae69'],['src/log_decode.rs','parse',1731,2394,'62e91fc42c646029c143edd67d95d37eb443e1ca2b2b71978a403da839544d4f'],['src/config.rs','parse_usize_csv',38684,39014,'c8f52fdbdd200cf6dd2ed73a3ebcda3738c2149840c4197c222e00f850e2353a']]){const source=context.source(path);assert.equal(hash(source.slice(start,end)),pin);assert.ok(source.slice(start,end).startsWith('fn '+name+'('));}
 const methodPins=JSON.parse(readFileSync(new URL('./fixtures/option-deref-frontier.json',import.meta.url),'utf8'));assert.equal(methodPins.pins.length,4);for(const pin of methodPins.pins){const source=context.source(pin.file);assert.equal(hash(source),pin.fileSha256);assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.fnTokenSha256);}
 for(const [path,name,start,end]of [['src/admin.rs','ClaimFile',7430,7931],['src/model_contract.rs','ModelSelectorKind',1156,1396],['src/gemini/stream.rs','NativeStreamTranslator',2168,2260]]){const item=sourceItems(context.source(path)).find(row=>row.name===name&&['struct','enum'].includes(row.term));assert.ok(item);assert.deepEqual([item.start,item.end],[start,end]);}
 // These unchanged current parents are semantic frontiers, not stale fixtures.
 for(const path of ['src/config.rs','src/storage/associative.rs'])assert.equal(context.source(path),context.sourceCurrent(path));
});

test('all four derive-helper parents retain their complete original source and owner method pins',()=>{
 const context=staticSourceAssociatedContext(ids[4]),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8'));retain('derive-context',completeInputs(context));retain('complete-derive-parents',parents(context));assert.equal(fixture.entries.length,4);
 for(const pin of fixture.entries){const source=context.source(pin.path);assert.equal(hash(source),pin.sourceSha256);const implementations=extractImplDeclarations(source).implementations;for(const method of pin.methods){const actual=implementations.find(row=>row.typePath.join('::')===method.owner)?.methods.find(row=>row.name===method.name);assert.ok(actual);assert.deepEqual(actual.span,method.span);assert.equal(hash(actual.source),method.sha256);}}
 assert.notEqual(context.source('src/bridge_selection.rs'),context.sourceCurrent('src/bridge_selection.rs'));
});

test('the full current bridge parent is independently checked with genuine Core and dependency inputs',()=>{
 const context=staticSourceAssociatedContext(ids[1]);retain('historical-bridge-inputs',completeInputs(context));retain('complete-bridge-parents',parents(context));assert.notEqual(context.source('src/bridge_response.rs'),context.sourceCurrent('src/bridge_response.rs'));retain('independent-current-Core-bridge',currentCore(context,'src/bridge_response.rs'));
});

test('the full current consuming-copy parent is independently checked without replacing its native declarations',()=>{
 const context=staticSourceAssociatedContext(ids[2]);retain('historical-copy-inputs',completeInputs(context));retain('complete-copy-parents',parents(context));assert.notEqual(context.source('src/stream_termination.rs'),context.sourceCurrent('src/stream_termination.rs'));retain('independent-current-Core-copy',currentCore(context,'src/stream_termination.rs'));
});

test('historical Telegram stays separate from the current qwen root and neither full-root workload is prewarmed',()=>{
 const context=staticSourceAssociatedContext(ids[5]),source=context.source('src/telegram.rs'),item=sourceItems(source).find(row=>row.term==='fn'&&row.name==='is_private');assert.ok(item);assert.equal(Buffer.byteLength(source.slice(item.start,item.end)),135);assert.equal(hash(source.slice(item.start,item.end)),'bc9c24c4e7936bf9c171b23bf09acbfc6fd15c2bae84df4953e4d5c9b9d9018d');retain('complete-Telegram-and-current-universe',completeInputs(context));retain('complete-Telegram-parents',parents(context));
 const currentInputs=['src/lib.rs','src/clients.rs','src/clients/json_config.rs','Cargo.toml','Cargo.lock'].map(path=>({path,source:context.sourceCurrent(path)}));for(const row of currentInputs)assert.equal(row.source,read(row.path));retain('independent-current-qwen-inputs',currentInputs);
 assert.equal(hash(context.sourceCurrent('src/clients/json_config.rs')),'22bc6ab3558f35be65e3f35eed726937cac0661cc09d93807fc2d632c20f1002');
});

test('unknown copied associations paths and a changed current source universe remain refusals',()=>{
 for(const id of ['unknown',ids[0]+':copy',{id:ids[0],authority:{executable:true}},...Object.keys(STATIC_SOURCE_LIFECYCLE_CASES)])assert.throws(()=>staticSourceAssociatedContext(id),/unknown explicit outside association/u);
 const source=associatedOriginalSourceReader(ids[0]);assert.throws(()=>source('src/config.rs'),/outside the explicit old parent association/u);assert.throws(()=>source('../Cargo.toml'),/outside the explicit old parent association/u);
 const file=associatedOriginalFileReader(ids[0]);assert.throws(()=>file('/tmp/not-an-original','utf8'),/one original source URL/u);assert.throws(()=>file(new URL('../../../rust/src/output_limit.rs',import.meta.url),'binary'),/one original source URL/u);
 const directory=mkdtempSync(join(tmpdir(),'router-outside-source-universe-'));try{execFileSync('/usr/bin/git',['init','--quiet',directory],{encoding:'utf8',timeout:20_000});assert.throws(()=>staticSourceAssociatedContext(ids[0],{root:directory}),/actual current source set differs/u);}finally{rmSync(directory,{recursive:true,force:true});}
 retain('no-compiler-authority',{authority:manifest.authority,unknownAndCopiedRefused:true,currentSourceSetMustJoin:true});
});
