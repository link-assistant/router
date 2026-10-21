#!/usr/bin/env node
// Gate only the new internal lexing snapshot before its reflective initializer.
import {readFileSync,lstatSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
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
function sourceFactoryV1(source){
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

const previousProfile='tools/translation/source-profiles/guarded-proof-lexing-v1/prepare-guarded-proof-lexing.mjs.gz';
const previousPacked='6894def0cc5760d186ca41a5fb3c5390700b03944dbb4f9a07739e6ffed7d53b',previousSource='d5545a746841008f5a2bf70bb7a9e51b42a8335734854f08d19384d8c01b4b58';
function nativeProgram(ts,file){
 const path=resolve(file.fileName),host={getSourceFile:name=>name===path?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===path,readFile:name=>name===path?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 return ts.createProgram([path],{allowJs:true,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host).getTypeChecker();
}
function rootDeclarations(ts,file){const rows=[];for(const statement of file.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){if(!ts.isIdentifier(declaration.name))fail('ordinary original initializer binding required');rows.push(declaration);}return rows;}
function capturedGuardBindings(ts,file,functions){
 const checker=nativeProgram(ts,file),roots=rootDeclarations(ts,file),symbols=new Map(roots.map(node=>[checker.getSymbolAtLocation(node.name),node])),selected=new Map(),references=[];
 for(const owner of functions){
  const first=owner.body.statements[0];if(!ts.isIfStatement(first))fail('original qualified short circuit required');let condition=first.expression;while(ts.isBinaryExpression(condition)&&condition.operatorToken.kind===ts.SyntaxKind.BarBarToken)condition=condition.left;
  if(!ts.isPrefixUnaryExpression(condition)||condition.operator!==ts.SyntaxKind.ExclamationToken||!ts.isIdentifier(condition.operand)||condition.operand.text!=='qualified'||!symbols.has(checker.getSymbolAtLocation(condition.operand)))fail('qualified must be the first original guard operand');
  function visit(node){if(ts.isIdentifier(node)){const symbol=checker.getSymbolAtLocation(node),declaration=symbols.get(symbol);if(declaration){const parent=node.parent;if(ts.isBinaryExpression(parent)&&parent.left===node&&parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment||(ts.isPrefixUnaryExpression(parent)||ts.isPostfixUnaryExpression(parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(parent.operator)||(ts.isForOfStatement(parent)||ts.isForInStatement(parent))&&parent.initializer===node)fail('original captured guard bindings must remain read-only');selected.set(declaration.name.text,declaration);references.push({guard:owner.name.text,name:declaration.name.text,span:[node.getStart(file),node.end],declarationSpan:[declaration.name.getStart(file),declaration.name.end]});}}ts.forEachChild(node,visit);}visit(owner.body);
 }
 const declarations=roots.filter(node=>selected.has(node.name.text));if(roots.some(node=>!checker.getSymbolAtLocation(node.name))||!selected.has('qualified')||declarations.length!==selected.size)fail('complete genuine captured binding census differs');
 return {declarations,names:declarations.map(node=>node.name.text),references};
}
function previousFactoryProof(source,self,previous){
 const current=native(self,'prepare-guarded-proof-lexing.mjs'),old=native(previous,'prepare-guarded-proof-lexing-v1.mjs'),pick=(file,ts,name)=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'exact previous '+name);
 const selected=pick(current.file,current.ts,'sourceFactoryV1'),original=pick(old.file,old.ts,'sourceFactory'),start=selected.getStart(current.file),nameStart=selected.name.getStart(current.file),renamed=self.slice(start,nameStart)+'sourceFactory'+self.slice(selected.name.end,selected.end);
 if(renamed!==original.getText(old.file))fail('complete known V1 constructor changed');
 const currentImports=current.file.statements.filter(current.ts.isImportDeclaration).map(node=>node.getText(current.file)),oldImports=old.file.statements.filter(old.ts.isImportDeclaration).map(node=>node.getText(old.file));if(JSON.stringify(currentImports)!==JSON.stringify(oldImports))fail('complete actual V1 imported closure changed');
 for(const name of ['one','native','edits','stage'])if(pick(current.file,current.ts,name).getText(current.file)!==pick(old.file,old.ts,name).getText(old.file))fail('known V1 source operation changed: '+name);
 for(const name of ['hash','originalPath','names','factoryName','opening','closing']){
  const declaration=(parsed,key)=>one(parsed.file.statements.filter(node=>parsed.ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>parsed.ts.isIdentifier(row.name)&&row.name.text===key)),'exact V1 '+key);
  if(declaration(current,name).getText(current.file)!==declaration(old,name).getText(old.file))fail('known V1 captured input changed: '+name);
 }
 return {...sourceFactoryV1(source),constructorCopy:{before:original.getText(old.file),after:selected.getText(current.file),nativeSelection:{span:[nameStart-start,selected.name.end-start],expected:'sourceFactoryV1',replacement:'sourceFactory'},nativeInverse:renamed,helperSourcesIdentical:true}};
}
function sourceFactory(source,self,previous,root=ROOT){
 const {ts,file}=native(source,resolve(root,originalPath)),imports=file.statements.filter(ts.isImportDeclaration),functions=file.statements.filter(ts.isFunctionDeclaration);
 if(imports.length!==2||imports[0].moduleSpecifier.text!=='node:util'||imports[1].moduleSpecifier.text!=='./original-json-intrinsics.mjs'||functions.length!==2||JSON.stringify(functions.map(node=>node.name?.text))!==JSON.stringify(names)||file.statements.some(node=>!ts.isImportDeclaration(node)&&ts.isExportDeclaration(node)))fail('complete original lexing declarations/imports differ');
 for(const [index,expected]of [['types'],['originalJsonIntrinsicsUnchanged','originalBatchedJsonIntrinsicsUnchanged']].entries()){const bindings=imports[index].importClause?.namedBindings;if(!bindings||!ts.isNamedImports(bindings)||JSON.stringify(bindings.elements.map(node=>node.name.text))!==JSON.stringify(expected)||bindings.elements.some(node=>node.propertyName))fail('complete original imported bindings differ');}
 if(file.statements.slice(0,2).some(node=>!ts.isImportDeclaration(node)))fail('imports must precede original initializers');
 const firstFunction=file.statements.indexOf(functions[0]);if(file.statements.slice(firstFunction).some(node=>!ts.isFunctionDeclaration(node)))fail('complete original functions must remain terminal top-level declarations');
 const captured=capturedGuardBindings(ts,file,functions),at=imports[1].end,end=functions[0].getFullStart(),initializers=file.statements.slice(2,firstFunction),initializerSource=source.slice(at,end);if(captured.names.includes(factoryName)||captured.names.includes('originalBatchedDataFreezeIntrinsicsUnchanged'))fail('private guard factory/import collides with an original binding');
 const openingV2="\nimport {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\nfunction "+factoryName+"(){\n if(!originalBatchedDataFreezeIntrinsicsUnchanged())return {"+captured.names.map(name=>name+':'+(name==='qualified'?'false':'void 0')).join(',')+"};\n";
 const closingV2='\n return {'+captured.names.join(',')+'};\n}\nconst {'+captured.names.join(',')+'}='+factoryName+'();\n';
 const language=stage(source,targetPath,'language',[]),repository=stage(language.text,targetPath,'repository',[{id:'repository:guard-original-initializers-only',start:at,end:at,before:'',after:openingV2},{id:'repository:retain-original-guard-functions-at-top-level',start:end,end:end,before:'',after:closingV2}]);
 const after=native(repository.text,resolve(root,targetPath)),factory=one(after.file.statements.filter(node=>after.ts.isFunctionDeclaration(node)&&node.name?.text===factoryName),'private original-initializer factory'),body=factory.body.statements,checker=nativeProgram(after.ts,after.file);
 if(!after.ts.isIfStatement(body[0])||body[0].expression.getText(after.file)!=='!originalBatchedDataFreezeIntrinsicsUnchanged()'||!after.ts.isReturnStatement(body[0].thenStatement))fail('preloaded guard must precede every original initializer');
 if(body.length!==initializers.length+2)fail('complete original initializer census differs');for(let index=0;index<initializers.length;index++)if(body[index+1].getText(after.file)!==initializers[index].getText(file))fail('original initializer statement changed');
 const returned=body.at(-1);if(!after.ts.isReturnStatement(returned)||!after.ts.isObjectLiteralExpression(returned.expression)||returned.expression.properties.map(node=>node.getText(after.file)).join(',')!==captured.names.join(','))fail('complete genuine original capture return required');
 const localDeclarations=new Map();for(const statement of body)if(after.ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(after.ts.isIdentifier(declaration.name))localDeclarations.set(declaration.name.text,declaration);
 const bindingDeclaration=one(after.file.statements.filter(node=>after.ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>after.ts.isObjectBindingPattern(row.name))),'actual complete root capture'),binding=one([...bindingDeclaration.declarationList.declarations],'root capture declaration');
 if(!after.ts.isObjectBindingPattern(binding.name)||binding.name.elements.map(node=>node.name.getText(after.file)).join(',')!==captured.names.join(',')||!after.ts.isCallExpression(binding.initializer)||!after.ts.isIdentifier(binding.initializer.expression)||checker.getSymbolAtLocation(binding.initializer.expression)!==checker.getSymbolAtLocation(factory.name))fail('same actual private factory/root binding required');
 const rootBindings=new Map(binding.name.elements.map(node=>[node.name.text,node.name])),joins=[];
 for(const property of returned.expression.properties){const local=localDeclarations.get(property.name.text);if(!after.ts.isShorthandPropertyAssignment(property)||!local||checker.getShorthandAssignmentValueSymbol(property)!==checker.getSymbolAtLocation(local.name))fail('returned capture is not the genuine original local');}
 for(const original of functions){const current=one(after.file.statements.filter(node=>after.ts.isFunctionDeclaration(node)&&node.name?.text===original.name.text),'original top-level public guard');if(current.getText(after.file)!==original.getText(file))fail('complete top-level original guard source changed');function visit(node){if(after.ts.isIdentifier(node)&&rootBindings.has(node.text)&&checker.getSymbolAtLocation(node)===checker.getSymbolAtLocation(rootBindings.get(node.text)))joins.push({guard:current.name.text,name:node.text,span:[node.getStart(after.file),node.end],bindingSpan:[rootBindings.get(node.text).getStart(after.file),rootBindings.get(node.text).end]});after.ts.forEachChild(node,visit);}visit(current.body);}
 if(joins.length!==captured.references.length)fail('complete captured guard reference census changed');
 if(repository.text.slice(at+openingV2.length,at+openingV2.length+initializerSource.length)!==initializerSource||repository.inverse!==language.text||language.inverse!==source)fail('complete original initializer bytes or inverse differ');
 const v1=previousFactoryProof(source,self,previous),historyLanguage=stage(v1.text,targetPath,'language',[{id:'javascript:restore-complete-known-V1-guarded-copy',start:0,end:v1.text.length,before:v1.text,after:source}]),historyRepository=stage(source,targetPath,'repository',[{id:'repository:derive-complete-top-level-original-guards',start:0,end:source.length,before:source,after:repository.text}]);
 return {path:targetPath,origin:originalPath,source,text:repository.text,sourceSha256:hash(source),sha256:hash(repository.text),stages:[language,repository],inverse:source,nativeFactory:{name:factoryName,start:factory.getStart(after.file),end:factory.end,originalStatements:initializers.length,returned:captured.names,firstStatement:body[0].getText(after.file)},nativeCaptureBindings:{names:captured.names,originalReferences:captured.references,currentReferences:joins,originalInitializerSource:initializerSource,topLevelOriginalFunctionSources:functions.map(node=>node.getText(file))},previous:v1,previousHistory:{before:v1.text,after:repository.text,stages:[historyLanguage,historyRepository],inverse:v1.text,exactKnownV1Only:true},originalModuleUnchanged:true,originalGuardFunctionsRemainTopLevel:true};
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
 const original=read(originalPath),shape=native(original,originalPath),functions=shape.file.statements.filter(shape.ts.isFunctionDeclaration),imports=shape.file.statements.filter(shape.ts.isImportDeclaration);if(imports.length!==2||imports[0].moduleSpecifier.text!=='node:util'||imports[1].moduleSpecifier.text!=='./original-json-intrinsics.mjs'||functions.length!==2||JSON.stringify(functions.map(node=>node.name?.text))!==JSON.stringify(names)||shape.file.statements.some(node=>!shape.ts.isImportDeclaration(node)&&shape.ts.isExportDeclaration(node)))fail('complete original lexing declarations/imports differ');
 const consumers=['private-native-proof-json.mjs','private-frozen-json.mjs'].map(name=>consumer(read('tools/translation/'+name),'tools/translation/'+name));
 const packed=readFileSync(resolve(root,previousProfile));if(packed.length!==4071||hash(packed)!==previousPacked)fail('complete known V1 producer archive differs');const previous=gunzipSync(packed,{maxOutputLength:32768});if(previous.length!==13278||hash(previous)!==previousSource)fail('complete known V1 producer source differs');
 const self=read('tools/translation/prepare-guarded-proof-lexing.mjs'),guarded=sourceFactory(original,self,previous.toString('utf8'),root),files=[guarded,...consumers];
 for(const path of ['tools/translation/original-json-intrinsics.mjs','tools/translation/private-data-freeze.mjs','tools/translation/concrete-syntax-meta.mjs','tools/translation/js-to-rust/vendor/module-syntax.mjs'])read(path);
 if(existsSync(resolve(root,targetPath))){guarded.current=read(targetPath);if(guarded.current!==guarded.text&&guarded.current!==guarded.previous.text)fail('guarded complete module differs from exact V1/V2 equations');}else guarded.current=null;
 const binaryInputs=[{path:previousProfile,bytes:packed.length,source:packed.toString('base64'),encoding:'base64',sha256:previousPacked}];assertGuardedProofLexingInputsFresh({root,inputs,binaryInputs});if(!readFileSync(resolve(root,previousProfile)).equals(packed))fail('complete known V1 archive changed');return {previousProducer:{path:previousProfile,bytes:packed.length,sha256:previousPacked,source:previous.toString('utf8'),sourceSha256:previousSource},schema:'guarded-proof-lexing-source-proposal-v1',root,files,inputs,binaryInputs,originalLexingModuleUnchanged:true,privateConsumerBodiesUnchanged:true,newCaches:false,sourceAuthority:false,runtimeQualified:false,bootstrapDomain:'preloaded original common intrinsic issuer; not hostile cold common initialization'};
}
export function assertGuardedProofLexingInputsFresh({root,inputs,binaryInputs=[]}){for(const row of inputs){const full=resolve(root,row.path),stat=lstatSync(full),bytes=readFileSync(full);if(!stat.isFile()||stat.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||bytes.toString('utf8')!==row.source)fail('physical input changed: '+row.path);}for(const row of binaryInputs){const full=resolve(root,row.path),stat=lstatSync(full),bytes=readFileSync(full);if(row.encoding!=='base64'||!stat.isFile()||stat.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||bytes.toString('base64')!==row.source)fail('physical binary input changed: '+row.path);}return true;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('Use --check | --emit FRESH_OUTSIDE_DIRECTORY');const proposal=prepareGuardedProofLexing();
 if(args[0]==='--check'){for(const row of proposal.files)if(readFileSync(resolve(proposal.root,row.path),'utf8')!==row.text)fail('exact guarded source is not installed');assertGuardedProofLexingInputsFresh(proposal);console.log(JSON.stringify({fresh:true,runtimeQualified:false,originalLexingModuleUnchanged:true}));}
 else{const output=resolve(args[1]);if(!relative(proposal.root,output).startsWith('..'+sep)||!relative(output,proposal.root).startsWith('..'+sep))fail('fresh outside directory required');mkdirSync(output);const bytes=Buffer.from(JSON.stringify(proposal)+'\n');if(bytes.length>64*1024*1024)fail('complete proposal bound');assertGuardedProofLexingInputsFresh(proposal);const path=resolve(output,'complete-guarded-proof-lexing-and-inverses.json.gz');writeFileSync(path,gzipSync(bytes),{flag:'wx'});if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(bytes))fail('full source proposal readback differs');assertGuardedProofLexingInputsFresh(proposal);console.log(JSON.stringify({proposal:path,installed:false,runtimeQualified:false,files:proposal.files.map(({path,sha256})=>({path,sha256}))}));}
}
