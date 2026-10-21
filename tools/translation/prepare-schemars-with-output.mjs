#!/usr/bin/env node
// Emit a distinct source-derived candidate; no default issuer is installed.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PREFIX='tools/translation/';
const INPUTS=Object.freeze({
 'schemars-bang-footprints.mjs':'ead30bf9110ece4f8ca9dc4b835579f214c475bcb7d473eac103ab234d2de316',
 'schemars-schema-route.mjs':'75fe8ef78ca451b4afb4fe7a7ec779daaa6b9a61d53f4969cb753852db4b4b17',
 'derive-enclosing-namespace-context.mjs':'65109370660c0c64885831baadfa71f6be5d03698a5a9591229be5d2910b5d9a',
});
const OUTPUTS=['schemars-with-bang-candidate.mjs','schemars-with-route-candidate.mjs','schemars-with-context-candidate.mjs'];
const SUPPORT='schemars-with-enclosing-route.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Schemars with source proposal: '+message);};
function native(ts,root,name,source){
 const path=resolve(root,PREFIX+name),options={allowJs:true,checkJs:true,noResolve:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]},host=ts.createCompilerHost(options),original=host.getSourceFile;
 host.getSourceFile=(file,version,onError,again)=>resolve(file)===path?ts.createSourceFile(file,source,version,true,ts.ScriptKind.JS):original(file,version,onError,again);
 const program=ts.createProgram([path],options,host),file=program.getSourceFile(path);if(!file||file.parseDiagnostics.length)fail('complete native source grammar differs');return {file,checker:program.getTypeChecker()};
}
function one(rows,label){if(rows.length!==1)fail('one actual native '+label+' required');return rows[0];}
function descendants(ts,node,predicate){const rows=[];const visit=part=>{if(predicate(part))rows.push(part);ts.forEachChild(part,visit);};visit(node);return rows;}
function edit(file,source,node,replacement,id){return {id,span:[node.getStart(file),node.end],expected:source.slice(node.getStart(file),node.end),replacement};}
function apply(source,edits){
 let result=source,end=source.length;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){const [start,stop]=row.span;if(start<0||stop>end||result.slice(start,stop)!==row.expected)fail('native selected span or ownership changed');result=result.slice(0,start)+row.replacement+result.slice(stop);end=start;}
 let inverse=result;for(const row of [...edits].sort((a,b)=>a.span[0]-b.span[0])){const start=row.span[0];if(inverse.slice(start,start+row.replacement.length)!==row.replacement)fail('independent native inverse changed');inverse=inverse.slice(0,start)+row.expected+inverse.slice(start+row.replacement.length);}
 if(inverse!==source)fail('whole native inverse differs');return result;
}
function undo(source,edits){let result=source;for(const row of [...edits].sort((a,b)=>a.span[0]-b.span[0])){const start=row.span[0];if(result.slice(start,start+row.replacement.length)!==row.replacement)fail('complete native inverse span changed');result=result.slice(0,start)+row.expected+result.slice(start+row.replacement.length);}return result;}
function importBinding(ts,file,checker,path,name){
 const declaration=one(file.statements.filter(row=>ts.isImportDeclaration(row)&&row.moduleSpecifier.text===path),'import '+path),elements=declaration.importClause?.namedBindings?.elements??[],binding=one(elements.filter(row=>row.name.text===name&&!row.propertyName),'import binding '+name);
 const symbol=checker.getSymbolAtLocation(binding.name);if(!symbol)fail('actual native import binding missing');return {declaration,binding,symbol};
}
function whole(ts,root,path,before,language,after,changes){
 if(after.split('\n').length>=1000)fail('candidate must remain below1000lines');
 const canonical=source=>{const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document),row=transportConcreteSyntaxMeta(wire);if(row.source!==source)fail('complete serialized source differs');return {wire,...row};};
 const first=canonical(before),rule=(old,next,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:next}]}),phases=[['language',before,language],['repository',language,after]],stages=[];let current=first;
 for(const [phase,old,next]of phases){
  const sequence={languageRules:phase==='language'?[rule(old,next,'javascript:actual-with-source-copy')]:[],repositoryRules:phase==='repository'?[rule(old,next,'router:separate-explicit-with-candidate')]:[]},run=applyConcreteSyntaxSubstitutions(current.document,sequence),wire=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(wire);if(parsed.source!==next)fail('complete phase source differs');
  const inverseSequence={languageRules:phase==='language'?[rule(next,old,'javascript:restore-original-with-source')]:[],repositoryRules:phase==='repository'?[rule(next,old,'router:restore-original-with-module')]:[]},inverseRun=applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence),inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverseRun.value));if(inverse.source!==old)fail('complete phase inverse differs');
  stages.push({phase,before:old,after:next,beforeMeta:current.wire,afterMeta:wire,sequence,inverseSequence,trace:run.trace,inverse:inverse.source});current={...parsed,wire};
 }
 let restored=after;for(const stage of [...stages].reverse()){if(restored!==stage.after)fail('whole phase association changed');restored=stage.inverse;}if(restored!==before)fail('whole two-phase inverse differs');
 const prefix=changes.repositoryPrefix??'',suffix=changes.repositorySuffix??'';if(!after.startsWith(prefix)||!after.endsWith(suffix))fail('complete new module boundary differs');
 const retained=after.slice(prefix.length,after.length-suffix.length),nativeLanguage=undo(retained,changes.repository??[]),nativeBefore=undo(nativeLanguage,changes.language??[]);if(nativeLanguage!==language||nativeBefore!==before)fail('complete independent native edit inverse differs');
 native(ts,root,path,after);return {path:PREFIX+path,before,language,after,current:existsSync(resolve(root,PREFIX+path))?readFileSync(resolve(root,PREFIX+path),'utf8'):null,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.wire,afterMeta:current.wire,stages,changes,inverse:restored,nativeInverse:{repositoryCore:retained,language:nativeLanguage,before:nativeBefore,prefix,suffix},nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,PREFIX+path),after)};
}
export function prepareSchemarsWithOutputProposal({root=ROOT,inputSources=null}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');root=resolve(root);
 const inputs=Object.entries(INPUTS).map(([name,pin])=>{const source=inputSources&&Object.hasOwn(inputSources,name)?inputSources[name]:readFileSync(resolve(root,PREFIX+name),'utf8');if(typeof source!=='string'||Buffer.byteLength(source)>1048576||hash(source)!==pin)fail('whole pinned source differs: '+name);return {path:PREFIX+name,source,sha256:pin};});
 const support=readFileSync(resolve(root,PREFIX+SUPPORT),'utf8');if(Buffer.byteLength(support)>1048576)fail('bounded complete support required');inputs.push({path:PREFIX+SUPPORT,source:support,sha256:hash(support)});const files=[];
 const producerPath=PREFIX+'prepare-schemars-with-output.mjs',producerSource=readFileSync(resolve(root,producerPath),'utf8');if(Buffer.byteLength(producerSource)>1048576)fail('bounded complete actual producer required');inputs.push({path:producerPath,source:producerSource,sha256:hash(producerSource)});
 {
  const source=inputs[0].source,{file,checker}=native(ts,root,Object.keys(INPUTS)[0],source),selected=one(file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='selectedInput'),'original selectedInput'),parameter=one(selected.parameters.filter(row=>row.name.getText(file)==='certificate'),'original certificate parameter'),certificateSymbol=checker.getSymbolAtLocation(parameter.name),inputImport=importBinding(ts,file,checker,'./schemars-data-inputs.mjs','schemarsDeriveDataInputs');
  const call=one(descendants(ts,selected,row=>ts.isCallExpression(row)&&ts.isIdentifier(row.expression)&&checker.getSymbolAtLocation(row.expression)===inputImport.symbol),'original actual syntax input call');
  const loop=one(selected.body.statements.filter(row=>ts.isForOfStatement(row)&&ts.isPropertyAccessExpression(row.expression)&&row.expression.name.text==='attributes'&&checker.getSymbolAtLocation(row.expression.expression)===certificateSymbol),'original actual certificate attribute loop');
  const prover=one(file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='proveSchemarsBangFootprint'),'original complete prover'),routeImport=importBinding(ts,file,checker,'./schemars-schema-route.mjs','liftSchemarsSchemaRoute'),routeCall=one(descendants(ts,prover,row=>ts.isCallExpression(row)&&ts.isIdentifier(row.expression)&&checker.getSymbolAtLocation(row.expression)===routeImport.symbol),'actual original schema route call');
  if(routeCall.arguments.length!==1||!ts.isObjectLiteralExpression(routeCall.arguments[0]))fail('actual route argument shape changed');
  const evidence=one(descendants(ts,prover,row=>ts.isVariableDeclaration(row)&&row.name.getText(file)==='evidence'&&row.initializer&&ts.isObjectLiteralExpression(row.initializer)),'original evidence'),inputSource=one(evidence.initializer.properties.filter(row=>ts.isPropertyAssignment(row)&&row.name.getText(file)==='inputSource'),'original inputSource evidence');
  if(!ts.isObjectLiteralExpression(inputSource.initializer))fail('original source evidence shape changed');
  const changes=[edit(file,source,call,'schemarsWithDeriveDataInputs({context,certificate,module,dependencies})','private-original-with-input'),edit(file,source,loop,'validateSchemarsWithAttributes({context,certificate,module,dependencies,input});','source-proved-registered-helper-processing'),edit(file,source,routeCall.arguments[0],routeCall.arguments[0].getText(file).slice(0,-1)+',dependencies}','actual-original-dependency-closure'),edit(file,source,inputSource.initializer,inputSource.initializer.getText(file).slice(0,-1)+',withOutput:input.withOutput}','retain-complete-actual-with-proof')];
  const schema=one(evidence.initializer.properties.filter(row=>ts.isPropertyAssignment(row)&&row.name.getText(file)==='schema'),'original schema field');changes.push(edit(file,source,schema.initializer,"'original-schemars-with-enclosing-output-v1'",'distinct-explicit-source-format'));
  const template=one(descendants(ts,prover,row=>ts.isVariableDeclaration(row)&&row.name.getText(file)==='template'),'actual complete output template'),predicate=template.initializer?.arguments?.at(-1);
  if(!predicate||!ts.isArrowFunction(predicate)||predicate.parameters.length!==1||predicate.parameters[0].name.getText(file)!=='text')fail('actual original template predicate changed');
  changes.push(edit(file,source,predicate.body,"input.withOutput.transparent?text.includes('fn _schemars_private_non_optional_json_schema'):("+predicate.body.getText(file)+')','select-both-complete-original-impl-templates'));
  const output=one(descendants(ts,prover,row=>ts.isVariableDeclaration(row)&&row.name.getText(file)==='output'),'actual complete roundtrip output'),splice=one(descendants(ts,output,row=>ts.isCallExpression(row)&&ts.isIdentifier(row.expression)&&row.expression.text==='inst'&&row.arguments[0]&&checker.getSymbolAtLocation(row.arguments[0])===checker.getSymbolAtLocation(template.name)),'actual selected template instantiation'),bindings=splice.arguments[1];
  if(!ts.isObjectLiteralExpression(bindings))fail('actual checked fragment bindings changed');changes.push(edit(file,source,bindings,bindings.getText(file).slice(0,-1)+',ty:lifted.ty}','actual-cloned-TypePath-template-splice'));
  const core=one(descendants(ts,prover,row=>ts.isVariableDeclaration(row)&&row.name.getText(file)==='coreSource'),'actual core source selection'),coreSymbol=checker.getSymbolAtLocation(core.name),coreGuard=one(descendants(ts,prover,row=>ts.isIfStatement(row)&&descendants(ts,row.expression,part=>ts.isIdentifier(part)&&checker.getSymbolAtLocation(part)===coreSymbol).length>0),'actual original generated-macro owner guard');
  changes.push(edit(file,source,coreGuard.expression,'input.withOutput.transparent?(!certificate.coreOwner||certificate.coreOwner.source.sha256!==dependencies.standardCore.sha256||macros.length!==0||observation.bangCalls.length!==0):('+coreGuard.expression.getText(file)+')','complete-macro-free-transparent-output-and-original-error-owner'));
  const macroOwners=one(descendants(ts,prover,row=>ts.isVariableDeclaration(row)&&row.name.getText(file)==='callerMacroOwners'),'actual caller macro owner record');if(!ts.isObjectLiteralExpression(macroOwners.initializer))fail('actual macro owner evidence changed');
  for(const [name,replace]of [['targets',text=>'input.withOutput.transparent?[]:('+text+')'],['sourceProfileSha256',text=>'input.withOutput.transparent?null:('+text+')'],['qualifiedRootSourceCalls',()=> '!input.withOutput.transparent']]){const property=one(macroOwners.initializer.properties.filter(row=>ts.isPropertyAssignment(row)&&row.name.getText(file)===name),'actual macro owner field '+name);changes.push(edit(file,source,property.initializer,replace(property.initializer.getText(file)),'exact-transparent-output-macro-field-'+name));}
  // Original private proof membership remains available. Every source program,
  // function census and resolver result is reconstructed for each new operation.
  for(const name of ['inventories','functionSources','namespaceBindings']){
   const declaration=one(file.statements.filter(ts.isVariableStatement).flatMap(row=>[...row.declarationList.declarations]).filter(row=>row.name.getText(file)===name),'actual private DATA cache '+name),symbol=checker.getSymbolAtLocation(declaration.name),calls=descendants(ts,file,row=>ts.isCallExpression(row)&&ts.isPropertyAccessExpression(row.expression)&&checker.getSymbolAtLocation(row.expression.expression)===symbol);
   if(!symbol)fail('actual DATA cache symbol missing');const get=one(calls.filter(row=>row.expression.name.text==='get'),'actual DATA cache read '+name),set=one(calls.filter(row=>row.expression.name.text==='set'),'actual DATA cache write '+name);if(calls.length!==2||!ts.isExpressionStatement(set.parent))fail('actual complete DATA cache operations changed');
   changes.push(edit(file,source,get,'undefined','fresh-original-DATA-census-'+name),edit(file,source,set.parent,'','retain-no-source-program-or-resolver-cache-'+name));
  }
  const language=apply(source,changes),parsed=native(ts,root,OUTPUTS[0],language),declaration=importBinding(ts,parsed.file,parsed.checker,'./schemars-schema-route.mjs','liftSchemarsSchemaRoute').declaration;
  const repository=[edit(parsed.file,language,declaration.moduleSpecifier,"'./schemars-with-route-candidate.mjs'",'actual-original-route-import')],moved=apply(language,repository),header="// Generated by prepare-schemars-with-output.mjs; default APIs stay unchanged.\nimport {schemarsWithDeriveDataInputs,validateSchemarsWithAttributes} from './schemars-with-enclosing-route.mjs';\n",aliases='\nexport {proveSchemarsBangFootprint as proveSchemarsWithOutput,assertSchemarsBangFootprint as assertSchemarsWithOutput,originalSchemarsOutput as originalSchemarsWithOutput,isSchemarsBangFootprint as isSchemarsWithOutput};\n';
  files.push(whole(ts,root,OUTPUTS[0],source,language,header+moved+aliases,{language:changes,repository,repositoryPrefix:header,repositorySuffix:aliases,originalExportsPreserved:true}));
 }
 {
  const source=inputs[1].source,{file,checker}=native(ts,root,Object.keys(INPUTS)[1],source),selected=one(file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='liftSchemarsSchemaRoute'),'original complete schema route'),parameter=selected.parameters[0];if(!ts.isObjectBindingPattern(parameter.name))fail('actual route parameter bindings changed');
  const insertion=one(selected.body.statements.filter(row=>ts.isVariableStatement(row)&&row.declarationList.declarations.some(part=>part.name.getText(file)==='nameTokens')),'actual subsequent original name printer selection');
  const changes=[edit(file,source,parameter.name,parameter.name.getText(file).slice(0,-1)+',dependencies}','actual-source-dependency-binding'),{id:'original-with-branch-before-data-dispatch',span:[insertion.getStart(file),insertion.getStart(file)],expected:'',replacement:'if(input.withOutput)return liftSchemarsWithRoute({compiler,input,definition,template,inst,generator,render,addCommon,sourceBindings,branchProofs,dependencies});\n '}],language=apply(source,changes),header="// Generated from the complete original schema route; old route remains unchanged.\nimport {liftSchemarsWithRoute} from './schemars-with-enclosing-route.mjs';\n",after=header+language;
  if(!checker.getSymbolAtLocation(selected.name))fail('native original route binding absent');files.push(whole(ts,root,OUTPUTS[1],source,language,after,{language:changes,repositoryPrefix:header,originalCompleteRouteRetained:true}));
 }
 {
  const source=inputs[2].source,{file,checker}=native(ts,root,Object.keys(INPUTS)[2],source),owner=importBinding(ts,file,checker,'./schemars-bang-footprints.mjs','proveSchemarsBangFootprint'),changes=[edit(file,source,owner.declaration.moduleSpecifier,"'./schemars-with-bang-candidate.mjs'",'complete-private-Schemars-issuer-import')],language=source,header='// Generated explicit with-Type enclosing issuer; original issuer remains unchanged.\n',after=header+apply(source,changes);
  files.push(whole(ts,root,OUTPUTS[2],source,language,after,{repository:changes,repositoryPrefix:header,completeOriginalPrivateIssuerRetained:true}));
 }
 const supportBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,PREFIX+SUPPORT),support);
 for(const input of inputs)if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('fresh complete source changed before return: '+input.path);
 return {schema:'complete-schemars-with-source-candidate-v1',typescriptVersion:ts.version,inputs,files,supportBindings,originalPublicAPIsUnchanged:true,productionSelected:false,sourceAuthority:false,typeOwnerResolved:false,generatedImplBehavior:false,runtimeAuthority:false,performanceQualified:false,newAcrossInvocationCache:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('usage: prepare-schemars-with-output.mjs --emit|--check');const proposal=prepareSchemarsWithOutputProposal();
 if(args[0]==='--emit')console.log(JSON.stringify(proposal));else{for(const file of proposal.files)if(file.current!==file.after)fail('candidate source stale: '+file.path);console.log(JSON.stringify({checked:true,files:proposal.files.map(row=>({path:row.path,sha256:row.afterSha256})),productionSelected:false,runtimeAuthority:false}));}
}
