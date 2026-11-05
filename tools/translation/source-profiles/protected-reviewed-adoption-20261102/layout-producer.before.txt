// Operational layout substitutions; no parser, type or owner authority is added.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/core-adoption-application-layout/complete-originals.json.gz';
const PIN='9eff11e4e033e1c1f71d59b309a56da34c984a6f7663d5c2834f6ce4d687ee4e';
const PATH='tools/translation/apply-reviewed-core-adoption.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Core application layout source: '+message);};
function parsed(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 need(!file.parseDiagnostics.length&&source.split('\n').length<1000,'complete native grammar and line bounds');return file;
}
function select(ts,file,owner,predicate,replacement,id){
 const matches=[];function visit(node){if(predicate(node))matches.push(node);ts.forEachChild(node,visit);}
 const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===owner);
 need(functions.length===1,'one complete original function '+owner);visit(functions[0]);need(matches.length===1,'one native selection '+id);
 const node=matches[0];return {id,owner,kind:ts.SyntaxKind[node.kind],span:[node.getStart(file),node.end],before:node.getText(file),after:replacement};
}
function apply(source,rows){
 let after=source,last=source.length+1;
 for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){const [a,b]=row.span;need(b<last&&source.slice(a,b)===row.before,'disjoint complete native source intervals');after=after.slice(0,a)+row.after+after.slice(b);last=a;}
 return after;
}
export function prepareCoreAdoptionApplicationLayout({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));need(packed.length===10850&&hash(packed)===PIN,'complete original archive');
 const originals=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));need(originals.schema==='core-adoption-application-layout-originals-v1'&&originals.files.length===2,'complete original census');
 for(const row of originals.files)need(Buffer.byteLength(row.source)===row.bytes&&hash(row.source)===row.sha256,'complete original source bytes');
 const original=originals.files.find(row=>row.path===PATH),layout=originals.files.find(row=>row.path==='tools/translation/repository-layout.mjs');need(original&&layout,'complete implementation and layout reference');
 need(readFileSync(resolve(root,layout.path),'utf8')===layout.source,'operational reference unchanged');
 const ts=ownershipCompiler();need(ts.version==='5.9.3','installed TypeScript 5.9.3');const before=original.source,file=parsed(ts,PATH,before);
 const languageRows=[
  select(ts,file,'joinInputs',node=>ts.isArrayLiteralExpression(node)&&node.elements.some(value=>ts.isStringLiteral(value)&&value.text==='ls-files'),"['ls-files','-z','--','*.rs','Cargo.toml','rust/Cargo.toml','Cargo.lock','**/Cargo.toml','**/Cargo.lock','tools/translation','scripts']",'guard-all-tracked-nested-cargo'),
  select(ts,file,'receiptInputs',node=>ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.BarBarToken&&node.getText(file)==="r.path.endsWith('.rs')||['Cargo.toml','rust/Cargo.toml','Cargo.lock'].includes(r.path)","r.path.endsWith('.rs')||['Cargo.toml','Cargo.lock'].includes(posix.basename(r.path))",'classify-exact-cargo-basenames'),
 ];
 const language=apply(before,languageRows),intermediate=parsed(ts,PATH,language);
 const repositoryRows=[
  select(ts,intermediate,'sourceCensus',node=>ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='visit'&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='src',"visit(repositoryRustLayout(root).productionPrefix.slice(0,-1))",'census-actual-rust-package'),
  select(ts,intermediate,'inspectPacket',node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='startsWith'&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='src/',"changed.path.startsWith(repositoryRustLayout(o.root).productionPrefix)",'install-only-actual-production-prefix'),
 ];
 const imports=intermediate.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./rule-pipeline.mjs');need(imports.length===1,'one actual pipeline import');
 repositoryRows.push({id:'bind-shared-operational-layout',owner:'module',kind:'ImportDeclaration',span:[imports[0].getStart(intermediate),imports[0].end],before:imports[0].getText(intermediate),after:imports[0].getText(intermediate)+"\nimport {repositoryRustLayout} from './repository-layout.mjs';"});
 const after=apply(language,repositoryRows);parsed(ts,PATH,after);
 const sequences=[{phase:'language',rows:languageRows},{phase:'repository',rows:repositoryRows}];
 const result=createRulePipeline(sequences.map(({phase,rows})=>({phase,rules:rows.map(row=>exactSubstitutionRule('core-application-layout:'+row.id,row.before,row.after,'Original native selection changed: '+row.id))}))).run(before);
 need(result.value===after,'ordered rule result');
 const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
 need(stages[0].inverse===before&&stages[1].inverse===language,'whole serialized/reparsed CST inverses');
 const current=readFileSync(resolve(root,PATH),'utf8');need(current===before||current===after,'unknown complete current implementation');
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,PATH),after);
 need(readFileSync(resolve(root,PATH),'utf8')===current&&readFileSync(resolve(root,ARCHIVE)).equals(packed),'physical inputs unchanged');
 return {schema:'core-adoption-application-layout-source-v1',files:[{path:PATH,before,language,after,current,inverse:before,nativeSelections:[...languageRows,...repositoryRows],stages,trace:result.trace,nativeBindings}],originalInputs:originals.files,semanticAuthority:false,changedResourceBounds:false,acrossInvocationCache:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareCoreAdoptionApplicationLayout();
 if(args[0]==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.after),'generated source is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
