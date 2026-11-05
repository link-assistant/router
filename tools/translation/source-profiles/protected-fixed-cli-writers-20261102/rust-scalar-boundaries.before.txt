// Source construction only. Rust grammar/behavior must be checked in gated CI.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/rust-scalar-boundaries/';
const PIN='bec04c63d7401a83a7a184013f5495730d906028f55314bf2fee583e20f90747';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Rust scalar boundary draft: '+message);};
const HELPERS=['safe_number','safe_percentage','safe_numeric_string','safe_string'];
function originalHelpers(source){
 const items=sourceItems(source);return HELPERS.map(name=>{const rows=items.filter(item=>item.term==='fn'&&item.name===name);need(rows.length===1,'one original production helper');const item=rows[0];return {name,span:[item.start,item.end],source:source.slice(item.start,item.end)};});
}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'complete native JS regression source');return file;}
function stages(before,language,after,sourceLanguage,id){
 const run=createRulePipeline([
  {phase:'language',rules:[{id:id+':source-structure-and-behavioral-regression',apply:value=>{need(value===before,'whole original source join');return language;}}]},
  {phase:'repository',rules:[{id:id+':test-scope-and-current-original-evidence',apply:value=>{need(value===language,'whole language source join');return after;}}]},
 ]).run(before);
 const equations=transportConcreteSourceEquations([{before,after:language,language:sourceLanguage},{before:language,after,language:sourceLanguage}]).map((equation,index)=>({...equation,phase:index?'repository':'language'}));
 need(run.value===after&&equations[0].inverse===before&&equations[1].inverse===language,'complete CST source equations and inverses');
 return {stages:equations,trace:run.trace,inverse:before};
}
export function prepareRustScalarBoundaries({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,BASE+'complete-originals-and-rules.json.gz'));need(packed.length===7761&&hash(packed)===PIN,'complete original archive');
 const data=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));need(data.schema==='rust-scalar-boundary-source-originals-v1'&&data.files.length===2,'complete original source census');
 const files=[];const ts=ownershipCompiler();need(ts.version==='5.9.3','lockfile TypeScript5.9.3');
 for(const original of data.files){
  const {path,source:before}=original;need(Buffer.byteLength(before)===original.bytes&&hash(before)===original.sha256,'complete original source bytes');let language,after,nativeSelection,helpers;
  if(path==='rust/src/subscription_usage_normalize.rs'){
   helpers=originalHelpers(before);need(hash(helpers.find(row=>row.name==='safe_number').source)==='0f6e667a69815ab806ed7e03e1c225d5f0a720d5d8d6ad423ff1f2263d93b301','unchanged original safe_number function');
   language=before+original.languageAddition;const modules=sourceItems(language).filter(item=>item.term==='mod'&&item.name==='translation_scalar_boundary_tests');need(modules.length===1,'one complete appended boundary module');
   const module=modules[0],keywords=module.tokens.filter(token=>token.text==='mod');need(keywords.length===1,'one original root module keyword');const at=keywords[0].start;
   after=language.slice(0,at)+'#[cfg(test)]\n'+language.slice(at);need(after.split('\n').length-(after.endsWith('\n')?1:0)<1000,'original Rust file bound');
   const finalHelpers=originalHelpers(after);need(JSON.stringify(finalHelpers)===JSON.stringify(helpers),'every complete original production helper remains unchanged');
   nativeSelection={kind:'Rust-CST-root-module',name:module.name,span:[at,at],expected:'',replacement:'#[cfg(test)]\n',nativeRustGrammarChecked:false};
  }else{
   need(path==='tools/translation/test/json-source-f64-original-root.test.mjs','closed JS regression target');const file=native(ts,path,before),calls=[];
   function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='test'&&node.arguments.length&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='combined 208 and private-dispatch prerequisite execute unchanged safe_number in the complete actual root')calls.push(node);ts.forEachChild(node,visit);}visit(file);need(calls.length===1,'unique original native regression owner');
   const replacement=original.replacement,at=before.indexOf(replacement.before);need(at>=calls[0].getStart(file)&&at+replacement.before.length<=calls[0].end&&before.indexOf(replacement.before,at+1)<0,'exact complete original assertion span');
   const marker="retain('07-current-root-and-historical-module-pin'",split=replacement.after.indexOf(marker);need(split>0,'complete independent historical pin record');
   language=before.slice(0,at)+replacement.after.slice(0,split)+before.slice(at+replacement.before.length);after=before.slice(0,at)+replacement.after+before.slice(at+replacement.before.length);native(ts,path,language);native(ts,path,after);
   nativeSelection={kind:'JavaScript-native-test-call',span:[calls[0].getStart(file),calls[0].end],editSpan:[at,at+replacement.before.length],expected:replacement.before,replacement:replacement.after};
  }
  const current=readFileSync(resolve(root,path),'utf8');need(current===before||current===after,'unknown current complete source');
  files.push({path,before,language,after,current,nativeSelection,...(helpers?{originalProductionHelpers:helpers}:{}),...stages(before,language,after,path.endsWith('.rs')?'Rust':'JavaScript','scalar-boundary-source')});
 }
 const javascript=files.filter(row=>row.path.endsWith('.mjs')),bindings=verifyNativeCopiedSourceBindingBatch(ts,javascript.map(row=>({path:resolve(root,row.path),source:row.after})));javascript.forEach((row,index)=>{row.nativeBindings=bindings[index];});
 for(const row of files)need(readFileSync(resolve(root,row.path),'utf8')===row.current,'physical original changed during construction');need(readFileSync(resolve(root,BASE+'complete-originals-and-rules.json.gz')).equals(packed),'complete source/rule archive changed');
 return {schema:'rust-scalar-boundary-source-plan-v1',files,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareRustScalarBoundaries();
 if(args[0]==='--write'){for(const row of plan.files)need(readFileSync(resolve(ROOT,row.path),'utf8')===row.current,'stale complete source proposal');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.after),'boundary source draft is stale');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false,receivingExecuted:false}));
}
