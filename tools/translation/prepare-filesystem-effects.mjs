// Complete implementation copy plus native-selected, two-sequence source rules.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {FILESYSTEM_EFFECT_RUNTIME_ADDITIONS} from './filesystem-effect-runtime-source.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/filesystem-effects-bulk/';
const RUNTIME='tools/translation/extensions/effects-runtime.mjs';
const COPY='tools/translation/extensions/filesystem-effects-runtime.mjs';
const ARCHIVE_PIN='8358f89978cf29f4d9a88b1c11c425646fa3b4838e09750fa2a0584b18698454';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Filesystem effect source draft: '+message);};
function originalInputs(root){
 const index=JSON.parse(readFileSync(resolve(root,BASE+'manifest.json'),'utf8'));
 need(index.schema==='filesystem-effects-complete-originals-index-v1'&&index.archive==='complete-originals.json.gz','closed original archive name');
 const packed=readFileSync(resolve(root,BASE+index.archive));need(packed.length===43141&&packed.length===index.bytes&&hash(packed)===ARCHIVE_PIN&&index.sha256===ARCHIVE_PIN,'complete compressed originals');
 const raw=gunzipSync(packed,{maxOutputLength:1048576});need(raw.length===index.rawBytes&&hash(raw)===index.rawSha256,'complete decoded originals');
 const data=JSON.parse(raw);need(data.schema==='filesystem-effects-complete-originals-v1'&&data.files.length===5,'complete original census');
 for(const row of data.files)need(Buffer.byteLength(row.source)===row.bytes&&hash(row.source)===row.sha256,'complete original source bytes');
 return {index,packed,files:data.files};
}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length&&source.split('\n').length<1000,'complete native grammar and file bound');return file;}
function selectedImport(ts,file,from,replacement){
 const nodes=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text===from);
 need(nodes.length===1,'one complete original native import');const node=nodes[0];
 return {span:[node.getStart(file),node.end],expected:node.getText(file),replacement,kind:'native-import-declaration'};
}
function edits(source,selections){let value=source,last=source.length+1;for(const row of [...selections].sort((a,b)=>b.span[0]-a.span[0])){need(row.span[1]<last&&source.slice(...row.span)===row.expected,'disjoint complete native selections');value=value.slice(0,row.span[0])+row.replacement+value.slice(row.span[1]);last=row.span[0];}return value;}
export function prepareFilesystemEffects({root=ROOT}={}){
 root=resolve(root);const originals=originalInputs(root),ts=ownershipCompiler();need(ts.version==='5.9.3','lockfile TypeScript5.9.3');const files=[];
 const effectOriginal=originals.files.find(row=>row.path==='tools/translation/extensions/effects.mjs'),effectFile=parse(ts,effectOriginal.path,effectOriginal.source),future=[];
 for(const statement of effectFile.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.name.text==='FUTURE')future.push(declaration);
 need(future.length===1&&ts.isNoSubstitutionTemplateLiteral(future[0].initializer),'whole original lazy-future source literal');const futureSource=future[0].initializer.text;
 for(const original of originals.files){
  const before=original.source,path=original.path===RUNTIME?COPY:original.path,file=parse(ts,path,before),selections=[];let language=before;
  if(original.path===RUNTIME)language=before+'\n'+futureSource+'\n'+FILESYSTEM_EFFECT_RUNTIME_ADDITIONS;
  else if(path.endsWith('/extensions/effects.mjs'))selections.push(selectedImport(ts,file,'./effects-contracts.mjs',"import { FILESYSTEM_EFFECT_DATA as EFFECT_DATA, FILESYSTEM_EFFECT_CONTRACTS as EFFECT_CONTRACTS, filesystemEffectContract as effectContract } from './filesystem-effects-contracts.mjs';"));
  else if(path.endsWith('/extensions/host-contracts.mjs'))selections.push(selectedImport(ts,file,'./effects-contracts.mjs',"import {FILESYSTEM_EFFECT_CONTRACTS as EFFECT_CONTRACTS} from './filesystem-effects-contracts.mjs';"));
  else if(path==='tools/translation/js-to-rust/translator.mjs'){
   language=before+"\nexport {translateFilesystemEffectJavaScript,translateFilesystemEffectTypeScript,translateFilesystemEffectConcreteSyntaxMeta,readFilesystemEffectMeta} from './filesystem-effects.mjs';\nexport {translateTypeScript,translateTypeScriptConcreteSyntaxMeta,readTypeScriptSourceMeta} from './typed-portable.mjs';\n";
  }else{
   need(path==='tools/translation/effect-assets.mjs','closed original source targets');
   selections.push(selectedImport(ts,file,'./extensions/effects-contracts.mjs',"import { FILESYSTEM_EFFECT_CONTRACTS as EFFECT_CONTRACTS } from './extensions/filesystem-effects-contracts.mjs';"));
   const literals=[];function visit(node){if(ts.isStringLiteral(node)&&node.text==='./extensions/effects-runtime.mjs')literals.push(node);ts.forEachChild(node,visit);}visit(file);need(literals.length===1,'one complete native runtime source literal');const node=literals[0];selections.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:"'./extensions/filesystem-effects-runtime.mjs'",kind:'native-source-literal'});
   const owners=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='effectRuntimeAssets');need(owners.length===1,'whole original runtime asset producer');const returns=owners[0].body.statements.filter(ts.isReturnStatement);need(returns.length===1,'whole original asset return');const fields=returns[0].expression.properties.filter(node=>ts.isPropertyAssignment(node)&&node.name.getText(file)==='declarations');need(fields.length===1,'whole original declarations field');const field=fields[0].initializer;
   const deferred="EFFECT_CONTRACTS.filter(row=>row.async).map(row=>`export declare function deferFilesystemEffect(operation: ${JSON.stringify(row.id)}, args: readonly [${row.params.map(type=>tsType(type,dataTypes)).join(', ')}], capability?: unknown): PromiseLike<${tsType(resolved(row.ret),dataTypes)}>;`).join('\\n')";
   selections.push({span:[field.getStart(file),field.end],expected:field.getText(file),replacement:'('+field.getText(file)+")+'\\n'+"+deferred,kind:'native-declaration-field'});
  }
  const after=edits(language,selections);parse(ts,path,after);
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'javascript:copy-complete-original-effect-adapter-and-extend-operations',apply:value=>{need(value===before,'whole original source join');return language;}}]},
   {phase:'repository',rules:[{id:'router:bind-additive-contract-and-runtime-source-closure',apply:value=>{need(value===language,'whole language source join');return after;}}]},
  ]).run(before);need(run.value===after,'ordered source result');
  const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((row,index)=>({...row,phase:index?'repository':'language'}));
  need(stages[0].inverse===before&&stages[1].inverse===language,'whole serialized and reparsed CST inverses');
  const current=existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null;need(current===null||current===before||current===after,'unknown complete current source');
  files.push({path,originalPath:original.path,before,language,after,current,nativeSelections:selections,stages,trace:run.trace,inverse:before,...(original.path===RUNTIME?{originalFutureSourceSelection:{path:effectOriginal.path,span:[future[0].initializer.getStart(effectFile),future[0].initializer.end],expected:future[0].initializer.getText(effectFile),source:futureSource}}:{})});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));files.forEach((row,index)=>{row.nativeBindings=bindings[index];need((existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null)===row.current,'physical target changed');});
 for(const row of originals.files)if(row.path===RUNTIME)need(readFileSync(resolve(root,row.path),'utf8')===row.source,'original runtime prefix module changed');
 need(readFileSync(resolve(root,BASE+'complete-originals.json.gz')).equals(originals.packed),'complete original archive changed');
 return {schema:'filesystem-effect-complete-source-extension-v1',files,originalInputs:originals.files,originalRuntimeModuleChanged:false,sourceAuthority:false,runtimeAuthority:false,receivingExecuted:false,originalDeadlinesChanged:false,newAcrossInvocationCache:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareFilesystemEffects();
 if(args[0]==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.after),'draft source is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
