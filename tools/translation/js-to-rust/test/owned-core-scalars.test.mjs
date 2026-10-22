import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {repositorySourceURL} from '../../test/fixtures/repository-paths.mjs';
import {writeJsonTextGzip} from '../../../evidence/write-json-gzip.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript,translateOwnedCoreDocumentConcreteSyntaxMeta,parseOwnedCoreDocumentMeta,emitRust} from '../translator.mjs';
import {prepareReverseConcreteSource} from '../concrete-source.mjs';
import {ownedCoreRuntimeSources,ownedCoreAsciiRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {ownedAsciiOperation,ownedAsciiRustCall} from '../owned-ascii-source.mjs';
import {translateProject} from '../../project.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
import {ROUTER_CORE_RANGES_SOURCE} from '../../router-core-source-data.mjs';
import {parseLinks,textOf,writeLink,encodeWord} from '../vendor/lino.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const root=new URL('../../../../',import.meta.url),rootPath=fileURLToPath(root),nativeJson=JSON.stringify,vectorRoot=process.env.ROUTER_OWNED_ASCII_VECTOR_DIR;
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>nodeTest(name,{timeout:60000},async t=>{vectors=[];try{await run(t);}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});writeJsonTextGzip(join(vectorRoot,Buffer.from(name).toString('hex')+'.json.gz'),nativeJson({name,vectors}));}}});
const oracle=readFileSync(repositorySourceURL('tests/translation_core_ascii_reverse_oracle.rs',root),'utf8'),matches=[...oracle.matchAll(/const REVERSE_SCALAR_JS_WITNESS: &str = r###"([\s\S]*?)"###;/gu)];assert.equal(matches.length,1);const source=matches[0][1];
function typedSource(){return source.replace('function scalar_length(value)','function scalar_length(value:Parameters<typeof count>[0]):ReturnType<typeof count>').replace('function scalar_limit(value)','function scalar_limit(value:string):boolean').replace('function selected_count(value,yes)','function selected_count(value:string,yes:boolean):ReturnType<typeof count>');}
function data(js=source,typed,{split=false,ascii=true}={}){const runtimeRoot=split?'js/runtime':'runtime',declarationRoot=split?'ts/runtime':'runtime',sourcePath=split?'js/caller.mjs':'caller.mjs',typedPath=split?'ts/caller.mts':'caller.mts';return {sourcePath,typescriptOutputPath:split?'ts/reverse.mts':'reverse.mts',input:{runtimeRoot,declarationRoot,files:[...ownedCoreRuntimeSources(runtimeRoot,declarationRoot),...(ascii?ownedCoreAsciiRuntimeSources(runtimeRoot,declarationRoot):[]),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8')},{path:'Cargo.lock',source:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},{path:sourcePath,source:js},...(typed===undefined?[]:[{path:typedPath,source:typed}])]}};}
function receive(js=source,typed,options){const row=data(js,typed,options),context=createOwnedCoreSourceContext(retain('complete-receiving-source',row.input)),result=retain('complete-native-source-document-result',translateOwnedCoreDocumentJavaScript(js,{context,sourcePath:row.sourcePath,typescriptOutputPath:row.typescriptOutputPath}));return {...row,context,result};}
function write(directory,path,source){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
async function targets(t,row){const directory=mkdtempSync(join(tmpdir(),'owned-ascii-reverse-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(directory,file.path,file.source);write(directory,row.typescriptOutputPath,row.result.typescript);const pair=row.input.files.find(file=>file.path.endsWith('/caller.mts')||file.path==='caller.mts'),paths=[row.typescriptOutputPath,...(pair?[pair.path]:[])];
 execFileSync(process.execPath,[join(rootPath,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),...paths.map(path=>join(directory,path))],{cwd:rootPath,timeout:20000,encoding:'utf8',stdio:'pipe'});
 for(const file of row.input.files.filter(file=>file.path.startsWith(row.input.runtimeRoot+'/')||file.path.startsWith(row.input.declarationRoot+'/')))write(directory,'out/'+file.path,file.source);
 return {original:await import(pathToFileURL(join(directory,row.sourcePath)).href),reverse:await import(pathToFileURL(join(directory,'out',row.typescriptOutputPath.replace(/\.mts$/u,'.mjs'))).href),...(pair?{typed:await import(pathToFileURL(join(directory,'out',pair.path.replace(/\.mts$/u,'.mjs'))).href)}:{})};
}
function changed(meta,run){const rows=parseLinks(meta).map(row=>({head:row[0],value:JSON.parse(textOf(row[1]))}));run(rows);return rows.map(row=>writeLink([row.head,encodeWord(nativeJson(row.value))])+'\n').join('');}

test('reverse scalar count preserves Unicode boundaries exact integers and lazy source calls',async t=>{
 const row=receive(source,typedSource()),api=await targets(t,row),token=await prepareOwnedCoreRuntime(row.result.program);
 const scalarCases=[['',0n],['ASCII',5n],['é',1n],['猫😀',2n],['e\u0301',2n],['👩\u200d💻',3n],['\0\r\n',3n],['\u{10ffff}',1n],['😀'.repeat(64),64n],['😀'.repeat(65),65n]];
 retain('complete-independent-scalar-cases',scalarCases);
 for(const [value,expected]of scalarCases){
  for(const module of Object.values(api)){assert.equal(module.scalar_length(value),expected);assert.equal(module.scalar_limit(value),expected<=64n);assert.equal(module.selected_count(value,true),expected);assert.equal(module.selected_count(value,false),0n);}
  assert.equal(evaluate(row.result.program,'scalar_length',[value],token),expected);assert.equal(evaluate(row.result.program,'scalar_limit',[value],token),expected<=64n);assert.equal(evaluate(row.result.program,'selected_count',[value,true],token),expected);assert.equal(evaluate(row.result.program,'selected_count',[value,false],token),0n);
 }
 const typed=translateOwnedCoreDocumentConcreteSyntaxMeta(prepareReverseConcreteSource(typedSource(),'TypeScript').concreteSyntax.meta,{context:row.context,sourcePath:'caller.mts',typescriptOutputPath:row.typescriptOutputPath});
 assert.equal(emitRust(parseOwnedCoreDocumentMeta(typed.meta,{context:row.context})),row.result.rust);
 const forwardFiles={'src/lib.rs':'pub mod translation_core;\n'+row.result.rust,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE};
 const forward=retain('complete-reverse-Rust-forward-roundtrip',translateProject({entry:'src/lib.rs',paths:Object.keys(forwardFiles),readSource:path=>forwardFiles[path]}));
 for(const name of ['scalar_length','scalar_limit','selected_count'])assert.ok(forward.meta.executable.some(item=>item.name===name),name+': whole emitted Rust function translates forward');
 await verifyTypedTargets(forward,module=>{for(const [value,expected]of scalarCases){assert.equal(module.scalar_length(value),expected);assert.equal(module.scalar_limit(value),expected<=64n);assert.equal(module.selected_count(value,true),expected);assert.equal(module.selected_count(value,false),0n);}},{childTimeoutMs:20000});

});

test('reverse scalar ABI refuses invalid values without coercion and preserves lazy calls',async t=>{
 const row=receive(source,typedSource()),api=await targets(t,row),token=await prepareOwnedCoreRuntime(row.result.program);
 let callbacks=0;const hostile={toString(){callbacks++;throw Error('coercion');}},proxy=new Proxy({},{get(){callbacks++;throw Error('proxy');}});
 for(const value of [null,undefined,0,0n,true,{},new String('a'),hostile,proxy,'\ud800','\udfff','a\ud800']){
  for(const module of Object.values(api)){assert.throws(()=>module.scalar_length(value),TypeError);assert.equal(module.selected_count(value,false),0n);}
  assert.throws(()=>evaluate(row.result.program,'scalar_length',[value],token),TypeError);assert.equal(evaluate(row.result.program,'selected_count',[value,false],token),0n);
 }
 assert.equal(callbacks,0);
 assert.deepEqual(ownedAsciiOperation('router_core_unicode_scalar_count').args,['str']);assert.equal(ownedAsciiOperation('stringLines'),null);
 assert.equal(ownedAsciiRustCall('router_core_unicode_scalar_count',['__ro_arg_0']),'(crate::translation_core::unicode_scalar_count(__ro_arg_0) as u64)');
 for(const args of [[],['__ro_arg_0','__ro_arg_1'],['value'],['__ro_arg_0; panic!()']])assert.throws(()=>ownedAsciiRustCall('router_core_unicode_scalar_count',args),/fixed operation/);
 const prefix="import {router_core_unicode_scalar_count as count} from './runtime/string-iterator-runtime.mjs';\n/** @param {string} value */\nexport function invalid(value){";
 for(const body of ["return count();","return count(value,value);","return count(1n);","return count(...[value]);","const count=value;return count(value);","return count('\\ud800');"]){assert.throws(()=>receive(prefix+body+'}'),/ASCII|owned|source|symbol|import|spread|type|UTF16/i);}
});

test('reverse checked integer ordering preserves all boundaries and refuses coercion',async t=>{
 const prefix="import {router_core_unicode_scalar_count as count} from './runtime/string-iterator-runtime.mjs';\n";
 const functions=[['less','<'],['at_most','<='],['greater','>'],['at_least','>=']];
 const js=prefix+functions.map(([name,op])=>'/** @param {string} value */\nexport function '+name+'(value){return count(value)'+op+'2n;}').join('\n');
 const row=receive(js),api=await targets(t,row),token=await prepareOwnedCoreRuntime(row.result.program);
 const expected=[[true,true,false,false],[true,true,false,false],[false,true,false,true],[false,false,true,true]];
 for(const [index,value]of ['', '😀', '猫😀', 'e\u0301Ω'].entries())for(const [operation,[name]]of functions.entries()){
  for(const module of Object.values(api))assert.equal(module[name](value),expected[index][operation]);assert.equal(evaluate(row.result.program,name,[value],token),expected[index][operation]);
 }
 for(const body of ["return value<'z';","return true<false;","return count(value)<2;","return count(value)<'2';","return count(value)<true;"]){assert.throws(()=>receive(prefix+'/** @param {string} value */\nexport function invalid(value){'+body+'}'),/integer|expression|domain|comparison/i);}
 assert.throws(()=>parseOwnedCoreDocumentMeta(changed(row.result.meta,rows=>{rows.find(item=>item.head==='owned-source-item').value.body[0].value.op='+';}),{context:row.context}));
});
