// Actual receiving forward application outputs, not a fixture-only directory.
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,posix} from 'node:path';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {createOwnedCoreSourceContext,ownedCoreRuntimeSources} from './owned-core-source.mjs';
import {analyzeOwnedCoreJavaScript,parseOwnedCoreMeta,translateOwnedCoreJavaScript} from './translator.mjs';
import {ownedCoreSourceData} from './owned-core-source.mjs';
import {emitRust,emitTypeScript} from './targets.mjs';
import {toLino} from './vendor/ir.mjs';
import {encodeWord,writeLink} from './vendor/lino.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const WITNESS='tests/translation_core_reverse_owned_oracle.rs';
const ROOT='packages/javascript/generated/rust-project',TYPED='packages/typescript/generated/rust-project';
function strictSource(path){const bytes=readFileSync(path),source=bytes.toString('utf8');if(!Buffer.from(source,'utf8').equals(bytes))throw TypeError('Owned receiving source is not strict UTF8');return source;}
const MAX_BYTES=256*1024*1024,MAX_FILE=32*1024*1024,MAX_PATHS=32768;
function physical(root,path){
 let current=root;for(const part of path.split('/')){current=join(current,part);const stat=lstatSync(current);if(stat.isSymbolicLink())throw TypeError('Owned receiving linked input: '+path);}
 return current;
}
/** All generated application modules and materialized runtime originals. */
export function captureOwnedCoreCorpus(root){
 const files=[],seen=new Set();let bytes=0;
 const add=path=>{
  if(seen.has(path))return;seen.add(path);if(seen.size>MAX_PATHS)throw TypeError('Owned receiving path budget');
  const absolute=physical(root,path),stat=lstatSync(absolute);if(!stat.isFile()||stat.size>MAX_FILE||bytes+stat.size>MAX_BYTES)throw TypeError('Owned receiving input budget');
  const source=strictSource(absolute);bytes+=Buffer.byteLength(source);if(bytes>MAX_BYTES||Buffer.byteLength(source)>MAX_FILE)throw TypeError('Owned receiving read budget');files.push({path,source});
 };
 function visit(directory){
  if(!existsSync(join(root,directory)))return;
  const absolute=physical(root,directory);
  for(const entry of readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=directory+'/'+entry.name;if(entry.isSymbolicLink())throw TypeError('Owned receiving linked input: '+path);
   if(entry.isDirectory())visit(path);else if(entry.isFile()&&(/\.(?:mjs|mts|ts)$/u.test(entry.name)||/LICENSE|NOTICE/iu.test(entry.name)))add(path);
  }
 }
 visit(ROOT);visit(TYPED);
 if(files.length)for(const path of ['src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','Cargo.toml','Cargo.lock'])add(path);
 const rows=files.sort((a,b)=>a.path.localeCompare(b.path));
 return {files:rows,bytes,requireCurrent(){for(const row of rows)if(strictSource(physical(root,row.path))!==row.source)throw TypeError('Owned receiving complete input changed: '+row.path);}};
}
/** Language/source checks run independently for every original application item. */
export function buildOwnedCoreArtifacts(root){
 const capture=captureOwnedCoreCorpus(root),artifacts=new Map(),rows=[],diagnostics=[];
 const modules=capture.files.filter(row=>row.path.startsWith(ROOT+'/')&&!row.path.startsWith(ROOT+'/runtime/')&&row.path.endsWith('.mjs'));
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'owned-corpus:all-original-application-bodies',apply:()=>{
   let context=null,contextError=null;
   if(modules.length){try{context=createOwnedCoreSourceContext({files:capture.files,runtimeRoot:ROOT+'/runtime',declarationRoot:TYPED+'/runtime'});}catch(error){if(!(error instanceof TypeError))throw error;contextError=error.message;}}
   const ts=ownershipCompiler();
   for(const row of modules){
    capture.requireCurrent();const file=ts.createSourceFile(row.path,row.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=file.statements.filter(ts.isFunctionDeclaration);
    let analysis;
    try{if(contextError)throw TypeError(contextError);analysis=analyzeOwnedCoreJavaScript(row.source,{sourcePath:row.path,context});}
    catch(error){if(!(error instanceof TypeError))throw error;analysis={program:[],items:functions.map(node=>({name:node.name?.text??null,span:[node.getStart(file),node.end],status:'unsupported'})),diagnostics:[{kind:'owned-core',message:error.message}]};}
    const stem=row.path.slice(ROOT.length+1,-4),prefix='tools/translation/js-to-rust/generated/owned-core/'+stem;
    const output='packages/typescript/generated/reverse-owned-core/'+stem+'.ts';
    if(analysis.program.length){
     const meta=writeLink(['owned-core-context',encodeWord(JSON.stringify(ownedCoreSourceData(context)))])+'\n'+analysis.program.map(toLino).join('\n')+'\n',program=parseOwnedCoreMeta(meta,{context});
     artifacts.set(prefix+'.lino','# GENERATED: owned-core source/checked Links.\n'+meta);
     artifacts.set(prefix+'.rs.txt','// GENERATED: owned-core reverse draft; CI Rust qualification pending.\n'+emitRust(program));
     artifacts.set(output,'// GENERATED: owned-core reverse checked TypeScript.\n'+emitTypeScript(program,{outputPath:output}));
    }
    rows.push({path:row.path,bytes:Buffer.byteLength(row.source),sha256:hash(row.source),sourceItems:functions.length,translatedItems:analysis.program.length,unsupportedItems:analysis.items.filter(item=>item.status!=='translated').length,items:analysis.items,diagnostics:analysis.diagnostics});
    diagnostics.push(...analysis.diagnostics.map(diagnostic=>({source:row.path,...diagnostic})));capture.requireCurrent();
   }
   return rows;
  }}]},
  {phase:'repository',rules:[{id:'owned-corpus:package-full-inputs-and-refusals',apply:rows=>{
   const inputs={schema:'owned-core-reverse-original-inputs-v1',files:capture.files};
   artifacts.set('tools/translation/js-to-rust/generated/owned-core/inputs.json',JSON.stringify(inputs)+'\n');
   return {schema:'owned-core-reverse-corpus-v1',profile:'router-owned-core-reverse-v1',discoveryRoot:ROOT,modules:rows,inputs:capture.files.map(row=>({path:row.path,bytes:Buffer.byteLength(row.source),sha256:hash(row.source)})),diagnostics,totals:{modules:rows.length,sourceItems:rows.reduce((n,row)=>n+row.sourceItems,0),translatedItems:rows.reduce((n,row)=>n+row.translatedItems,0),unsupportedItems:rows.reduce((n,row)=>n+row.unsupportedItems,0)},sourceAvailable:modules.length!==0,runtimeParity:false,rustExecuted:false,wholeSourceSynchronization:false};
  }}]},
 ]);
 const result=pipeline.run(undefined);capture.requireCurrent();const witness=ownedCoreWitnessArtifacts(root);for(const [path,content]of witness.artifacts)artifacts.set(path,content);const manifest={...result.value,trace:result.trace,witness:witness.manifest};
 artifacts.set('parity/js-owned-core-reverse-draft.json',JSON.stringify(manifest)+'\n');
 let outputBytes=0;for(const content of artifacts.values()){outputBytes+=Buffer.byteLength(content);if(outputBytes>MAX_BYTES)throw TypeError('Owned receiving artifact budget');}
 return {artifacts,manifest};
}

// Independent receiving witness, never included in application coverage counts.
// Its explicit staged module interface is retained in full. The actual CI test
// aliases the real library core; native compilation validates that linkage.
function ownedCoreWitnessArtifacts(root){
 const artifacts=new Map();if(!existsSync(join(root,WITNESS)))return {artifacts,manifest:{available:false,applicationItems:0}};
 const original=strictSource(physical(root,WITNESS)),matches=[...original.matchAll(/const REVERSE_OWNED_JS_WITNESS: &str = r###"([\s\S]*?)"###;/gu)];
 if(matches.length!==1||!original.includes('use link_assistant_router::translation_core;'))throw TypeError('Actual authored reverse witness and library alias required');
 const prefix='tools/translation/js-to-rust/generated/owned-core-witness',header='// GENERATED: actual checked reverse owned-core receiving witness.\n',authored=matches[0][1],source=header+authored,files=ownedCoreRuntimeSources(prefix+'/runtime',prefix+'/runtime');
 const originals=[];
 for(const path of ['src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','Cargo.toml','Cargo.lock'])originals.push({path,source:strictSource(physical(root,path))});
 const data={runtimeRoot:prefix+'/runtime',declarationRoot:prefix+'/runtime',files:[...files,...originals.map(row=>row.path==='src/lib.rs'?{path:row.path,source:'pub mod translation_core;\n'}:row),{path:prefix+'/witness.mjs',source}]};
 const context=createOwnedCoreSourceContext(data),result=translateOwnedCoreJavaScript(source,{sourcePath:prefix+'/witness.mjs',context,typescriptOutputPath:prefix+'/witness.mts'});
 artifacts.set('tools/translation/js-to-rust/generated/owned-core-witness.rs',header+result.rust);
 artifacts.set('tools/translation/js-to-rust/generated/owned-core-witness.lino',result.meta);
 artifacts.set(prefix+'/witness.mts',result.typescript);artifacts.set(prefix+'/witness.mjs',source);for(const row of files)artifacts.set(row.path,row.source);
 artifacts.set('tools/translation/js-to-rust/generated/owned-core-witness-inputs.json',JSON.stringify({schema:'owned-core-reverse-ci-witness-v1',oracle:{path:WITNESS,source:original,sha256:hash(original)},originalLibraryInputs:originals,stagedReceivingInputs:data,sourceRecipe:{kind:'prepend-one-generated-comment',before:authored,after:source,prefix:header,wholeUndo:source.slice(header.length)===authored},concreteSyntax:result.concreteSyntax,trace:result.trace,applicationItems:0,rustExecuted:false})+'\n');
 if(strictSource(physical(root,WITNESS))!==original)throw TypeError('Original reverse witness changed');
 for(const row of originals)if(strictSource(physical(root,row.path))!==row.source)throw TypeError('Original witness library source changed');
 return {artifacts,manifest:{available:true,applicationItems:0,functions:result.program.length,rust:'tools/translation/js-to-rust/generated/owned-core-witness.rs',oracle:WITNESS,sourceSha256:hash(source),rustExecuted:false}};
}
