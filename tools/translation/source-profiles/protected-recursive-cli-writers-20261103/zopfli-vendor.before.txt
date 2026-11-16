// Source preparation only. Compression supplies no compiler/source authority.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PROFILE='tools/translation/source-profiles/zopfli/',DESTINATION='tools/translation/vendor/zopfli/';
const MANIFEST_SHA='f841ab7299a0de0620fcf98b8224a0a538e6228ffc4c80ca88c083ac24e45344',TARBALL_SHA='57f5edd9ae3ad12a3c3b16ff3f7bd029b9348554f015d53b383655f048d3f3f9';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Zopfli vendor preparation: '+message);};
export function prepareZopfliVendor({root=ROOT}={}){
 const manifestBytes=readFileSync(resolve(root,PROFILE+'manifest.json'));if(hash(manifestBytes)!==MANIFEST_SHA||hash(readFileSync(resolve(root,PROFILE+'upstream-package.tgz')))!==TARBALL_SHA)fail('complete original release pin differs');
 const manifest=JSON.parse(manifestBytes),ts=ownershipCompiler();if(ts.version!=='5.9.3'||manifest.files.length!==9||manifest.version!=='1.0.15')fail('original package/type compiler differs');
 const inputs=manifest.files.map(row=>{const bytes=readFileSync(resolve(root,PROFILE+'upstream/'+row.path));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete original member differs');return {...row,bytes};});
 const binary=inputs.find(row=>row.path==='dist/libzopfli-wasm.json'),encoded=JSON.parse(binary.bytes),wasm=Buffer.from(encoded,'base64');if(wasm.toString('base64')!==encoded||wasm.length!==manifest.wasmBytes||hash(wasm)!==manifest.wasmSha256)fail('complete original Wasm bytes differ');
 const files=inputs.map(row=>{
  const before=row.bytes.toString('utf8');if(!Buffer.from(before).equals(row.bytes))fail('complete original UTF8 differs');let after=before,equation=null,trace=[];
  if(row.path==='dist/libzopfli.js'){
   const file=ts.createSourceFile(row.path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),selected=[];if(file.parseDiagnostics.length)fail('original native syntax differs');
   function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='require'&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='base64-js')selected.push(node);ts.forEachChild(node,visit);}visit(file);
   if(selected.length!==1||selected[0].getText(file)!=='require("base64-js")')fail('one actual closed-binary decoder import required');
   const run=createRulePipeline([{phase:'language',rules:[exactLiteralSubstitutionRule('javascript:closed-constant-Wasm-base64-bytes','const base64=require("base64-js");','const base64={toByteArray:value=>new Uint8Array(Buffer.from(value,"base64"))};','one complete original decoder declaration required')]},{phase:'repository',rules:[{id:'router:Node-and-Bun-compression-dependency-scope',apply:value=>'// Generated Node/Bun adapter; complete original C/WebAssembly implementation retained.\n'+value}]}]).run(before);
   after=run.value;trace=run.trace;if(ts.createSourceFile(row.path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete adapted native syntax differs');equation=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(equation.inverse!==before)fail('whole original inverse differs');
  }
  const path=DESTINATION+row.path,current=existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null;
  return {path,before,after,current,beforeSha256:hash(row.bytes),afterSha256:hash(after),equation,trace,originalMember:row.path,originalBytesUnchanged:before===after};
 });
 for(const row of inputs)if(hash(readFileSync(resolve(root,PROFILE+'upstream/'+row.path)))!==row.sha256)fail('complete original inputs changed');
 return {schema:'complete-zopfli-source-vendor-proposal-v1',files,wasmBytes:manifest.wasmBytes,wasmSha256:manifest.wasmSha256,license:'Apache-2.0',precompiledC:true,rustExecuted:false,semanticAuthority:false,scope:'Node/Bun opaque compression only; closed embedded Wasm bytes retain their independent full-byte pin'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const plan=prepareZopfliVendor();
 if(args[0]==='--emit')console.log(JSON.stringify(plan));
 else if(args[0]==='--check'){if(plan.files.some(row=>row.current!==row.after))fail('complete current vendor differs');console.log('Complete pinned C/WebAssembly vendor is current.');}
 else{for(const row of plan.files){if(row.current!==null&&row.current!==row.after)fail('unknown existing vendor source');}for(const row of plan.files){mkdirSync(dirname(resolve(ROOT,row.path)),{recursive:true});writeFileSync(resolve(ROOT,row.path),row.after);}console.log('Wrote complete pinned C/WebAssembly vendor.');}
}
