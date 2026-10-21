#!/usr/bin/env node
// Gate only the new internal lexing snapshot before its reflective initializer.
import {readFileSync,lstatSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Guarded proof lexing source: '+message);};
const originalPath='tools/translation/original-lexing-intrinsics.mjs',targetPath='tools/translation/guarded-proof-lexing-intrinsics.mjs';
const names=['originalLexingIntrinsicsUnchanged','originalBatchedLexingIntrinsicsUnchanged'];
const factoryName='createGuardedProofLexingIntrinsics';
const opening=`\nimport {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
function ${factoryName}(){
 if(!originalBatchedDataFreezeIntrinsicsUnchanged())return {
  originalLexingIntrinsicsUnchanged(){return false;},
  originalBatchedLexingIntrinsicsUnchanged(){return false;},
 };
`;
const closing=`\n return {${names.join(',')}};
}
const {${names.join(',')}}=${factoryName}();
export {${names.join(',')}};
`;
function one(rows,label){if(rows.length!==1)fail('one native '+label+' required');return rows[0];}
function native(source,path){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('bounded complete source required');const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('TypeScript 5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('whole native grammar: '+path);return {ts,file};
}
function edits(source,rows){
 rows.sort((a,b)=>a.start-b.start);let end=0,delta=0;for(const row of rows){if(row.start<end||source.slice(row.start,row.end)!==row.before)fail('native edit overlap/source changed');row.afterStart=row.start+delta;row.afterEnd=row.afterStart+row.after.length;delta+=row.after.length-row.before.length;end=row.end;}
 let text=source;for(const row of [...rows].reverse())text=text.slice(0,row.start)+row.after+text.slice(row.end);let inverse=text;
 for(const row of [...rows].reverse()){if(inverse.slice(row.afterStart,row.afterEnd)!==row.after)fail('complete native inverse span changed');inverse=inverse.slice(0,row.afterStart)+row.before+inverse.slice(row.afterEnd);}if(inverse!==source)fail('complete native inverse differs');return {source,text,edits:rows,inverse};
}
function stage(source,path,phase,rows){
 const nativePlan=edits(source,rows);native(nativePlan.text,path);
 const before=transportConcreteSyntaxSource(source,{language:'JavaScript'}),sequence={languageRules:[],repositoryRules:[]};
 sequence[phase==='language'?'languageRules':'repositoryRules']=[{id:'guarded-proof-lexing:'+phase,edits:nativePlan.text===source?[]:[{span:[0,source.length],expected:source,replacement:nativePlan.text}]}];
 const run=applyConcreteSyntaxSubstitutions(before.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==nativePlan.text)fail('phase complete CST result differs');
 const undo=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[{id:'guarded-proof-lexing:whole-native-inverse',edits:nativePlan.text===source?[]:[{span:[0,nativePlan.text.length],expected:nativePlan.text,replacement:source}]}],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==source)fail('phase complete CST inverse differs');
 return {...nativePlan,phase,beforeMeta:serializeConcreteSyntaxMeta(before.document),afterMeta,sequence,trace:run.trace};
}
function sourceFactory(source){
 const {ts,file}=native(source,originalPath),imports=file.statements.filter(ts.isImportDeclaration),functions=file.statements.filter(ts.isFunctionDeclaration);
 if(imports.length!==2||imports[0].moduleSpecifier.text!=='node:util'||imports[1].moduleSpecifier.text!=='./original-json-intrinsics.mjs'||functions.length!==2||JSON.stringify(functions.map(node=>node.name?.text))!==JSON.stringify(names)||file.statements.some(node=>!ts.isImportDeclaration(node)&&ts.isExportDeclaration(node)))fail('complete original lexing declarations/imports differ');
 for(const [index,expected]of [['types'],['originalJsonIntrinsicsUnchanged','originalBatchedJsonIntrinsicsUnchanged']].entries()){const bindings=imports[index].importClause?.namedBindings;if(!bindings||!ts.isNamedImports(bindings)||JSON.stringify(bindings.elements.map(node=>node.name.text))!==JSON.stringify(expected)||bindings.elements.some(node=>node.propertyName))fail('complete original imported bindings differ');}
 if(file.statements.slice(0,2).some(node=>!ts.isImportDeclaration(node)))fail('imports must precede original initializers');
 const rows=functions.map(node=>{const exported=one((ts.getModifiers(node)??[]).filter(node=>node.kind===ts.SyntaxKind.ExportKeyword),'original guard export modifier');return {id:'language:private-original-'+node.name.text,start:exported.getStart(file),end:exported.end,before:exported.getText(file),after:'',owner:node.name.text,body:node.body.getText(file)};});
 const language=stage(source,targetPath,'language',rows),plain=native(language.text,targetPath);
 for(const row of rows){const node=one(plain.file.statements.filter(node=>plain.ts.isFunctionDeclaration(node)&&node.name?.text===row.owner),'unexported original guard');if(node.body.getText(plain.file)!==row.body||plain.ts.getModifiers(node)?.length)fail('original guard body/modifiers differ');}
 const at=plain.file.statements[1].end,repository=stage(language.text,targetPath,'repository',[{id:'repository:guard-before-reflective-factory',start:at,end:at,before:'',after:opening},{id:'repository:expose-only-original-guard-references',start:language.text.length,end:language.text.length,before:'',after:closing}]);
 const after=native(repository.text,targetPath),factory=one(after.file.statements.filter(node=>after.ts.isFunctionDeclaration(node)&&node.name?.text===factoryName),'private original-initializer factory'),body=factory.body.statements;
 if(!after.ts.isIfStatement(body[0])||body[0].expression.getText(after.file)!=='!originalBatchedDataFreezeIntrinsicsUnchanged()'||!after.ts.isReturnStatement(body[0].thenStatement))fail('preloaded guard must precede every original initializer');
 const originals=plain.file.statements.slice(2);if(body.length!==originals.length+2)fail('complete original initializer census differs');for(let index=0;index<originals.length;index++)if(body[index+1].getText(after.file)!==originals[index].getText(plain.file))fail('original initializer/function bytes differ');
 const returned=body.at(-1);if(!after.ts.isReturnStatement(returned)||returned.expression.getText(after.file)!=='{'+names.join(',')+'}')fail('actual original function references required');
 const originalBody=language.text.slice(at),actualBody=repository.text.slice(at+opening.length,repository.text.length-closing.length);if(actualBody!==originalBody)fail('complete original body slice differs');
 if(repository.inverse!==language.text||language.inverse!==source)fail('whole guarded source inverse chain differs');
 return {path:targetPath,origin:originalPath,source,text:repository.text,sourceSha256:hash(source),sha256:hash(repository.text),stages:[language,repository],inverse:language.inverse,nativeFactory:{name:factoryName,start:factory.getStart(after.file),end:factory.end,originalStatements:originals.length,returned:names,firstStatement:body[0].getText(after.file)},originalModuleUnchanged:true};
}
function consumer(current,path){
 const parsed=native(current,path),node=one(parsed.file.statements.filter(node=>parsed.ts.isImportDeclaration(node)&&['./original-lexing-intrinsics.mjs','./guarded-proof-lexing-intrinsics.mjs'].includes(node.moduleSpecifier.text)),'private lexing import');
 if(node.importClause?.namedBindings?.elements.length!==1||node.importClause.namedBindings.elements[0].name.text!=='originalBatchedLexingIntrinsicsUnchanged')fail('actual original private lexing binding required');
 const literal=node.moduleSpecifier,old="'./original-lexing-intrinsics.mjs'",replacement="'./guarded-proof-lexing-intrinsics.mjs'";if(![old,replacement].includes(literal.getText(parsed.file)))fail('exact original private import spelling differs');
 const source=current.slice(0,literal.getStart(parsed.file))+old+current.slice(literal.end),language=stage(source,path,'language',[]),fresh=native(language.text,path),selected=one(fresh.file.statements.filter(node=>fresh.ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./original-lexing-intrinsics.mjs'),'original private lexing module');
 const repository=stage(language.text,path,'repository',[{id:'repository:guard-only-private-proof-lexing-import',start:selected.moduleSpecifier.getStart(fresh.file),end:selected.moduleSpecifier.end,before:old,after:replacement}]),after=native(repository.text,path),received=one(after.file.statements.filter(node=>after.ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./guarded-proof-lexing-intrinsics.mjs'),'guarded private lexing module');
 if(received.importClause.getText(after.file)!==selected.importClause.getText(fresh.file)||current!==source&&current!==repository.text)fail('private binding/body or current equation differs');return {path,current,source,text:repository.text,sourceSha256:hash(source),sha256:hash(repository.text),stages:[language,repository],inverse:source,nativeImport:{start:received.moduleSpecifier.getStart(after.file),end:received.moduleSpecifier.end,binding:received.importClause.getText(after.file)},consumerBodyUnchanged:true};
}
export function prepareGuardedProofLexing({root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')}={}){
 root=resolve(root);const inputs=[],read=path=>{const full=resolve(root,path),stat=lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('ordinary bounded physical input required');const bytes=readFileSync(full),source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('source UTF8 differs');inputs.push({path,source,bytes:bytes.length,sha256:hash(bytes)});return source;};
 const guarded=sourceFactory(read(originalPath)),files=[guarded,...['private-native-proof-json.mjs','private-frozen-json.mjs'].map(name=>consumer(read('tools/translation/'+name),'tools/translation/'+name))];
 for(const path of ['tools/translation/original-json-intrinsics.mjs','tools/translation/private-data-freeze.mjs','tools/translation/prepare-guarded-proof-lexing.mjs','tools/translation/concrete-syntax-meta.mjs','tools/translation/js-to-rust/vendor/module-syntax.mjs'])read(path);
 if(existsSync(resolve(root,targetPath))){guarded.current=read(targetPath);if(guarded.current!==guarded.text)fail('guarded complete module differs');}else guarded.current=null;
 assertGuardedProofLexingInputsFresh({root,inputs});return {schema:'guarded-proof-lexing-source-proposal-v1',root,files,inputs,originalLexingModuleUnchanged:true,privateConsumerBodiesUnchanged:true,newCaches:false,sourceAuthority:false,runtimeQualified:false,bootstrapDomain:'preloaded original common intrinsic issuer; not hostile cold common initialization'};
}
export function assertGuardedProofLexingInputsFresh({root,inputs}){for(const row of inputs){const full=resolve(root,row.path),stat=lstatSync(full),bytes=readFileSync(full);if(!stat.isFile()||stat.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||bytes.toString('utf8')!==row.source)fail('physical input changed: '+row.path);}return true;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('Use --check | --emit FRESH_OUTSIDE_DIRECTORY');const proposal=prepareGuardedProofLexing();
 if(args[0]==='--check'){for(const row of proposal.files)if(readFileSync(resolve(proposal.root,row.path),'utf8')!==row.text)fail('exact guarded source is not installed');assertGuardedProofLexingInputsFresh(proposal);console.log(JSON.stringify({fresh:true,runtimeQualified:false,originalLexingModuleUnchanged:true}));}
 else{const output=resolve(args[1]);if(!relative(proposal.root,output).startsWith('..'+sep)||!relative(output,proposal.root).startsWith('..'+sep))fail('fresh outside directory required');mkdirSync(output);const bytes=Buffer.from(JSON.stringify(proposal)+'\n');if(bytes.length>64*1024*1024)fail('complete proposal bound');assertGuardedProofLexingInputsFresh(proposal);const path=resolve(output,'complete-guarded-proof-lexing-and-inverses.json.gz');writeFileSync(path,gzipSync(bytes),{flag:'wx'});if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(bytes))fail('full source proposal readback differs');assertGuardedProofLexingInputsFresh(proposal);console.log(JSON.stringify({proposal:path,installed:false,runtimeQualified:false,files:proposal.files.map(({path,sha256})=>({path,sha256}))}));}
}
