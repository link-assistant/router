// Explicit bounded library artifact. No default Host or call-site admission.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {requireMutableJsonRemovePlan} from './mutable-json-loan-meta-candidate.mjs';
import {prepareMutableJsonLoanLeaf} from './prepare-mutable-json-loan-candidate.mjs';
import {originalJsonRemoveLibrarySources} from './json-edit-source-owner-candidate.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {sourceItems} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const RUNTIME='tools/translation/json-edit-candidate-runtime.mjs';
const FLOW='source-associated-json-remove-library-flow-candidate-v1';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('JSON remove library artifact: '+message);};
const canonical=value=>JSON.stringify(copyMetadata(value));
// Bounds describe only the existing JS projection. Rust accepts larger Values.
export const JSON_REMOVE_LIBRARY_DOMAIN=Object.freeze({maxJsonNodes:4096,maxJsonDepth:32,maxDenseEntries:4096,unicodeScalarStrings:true,canonicalTypedJson:true,keys:'strictly increasing Rust UTF-8 order',rustAcceptsLargerValues:true,fullOriginalFunctionDomainEquivalent:false});

export function serializeCheckedJsonRemoveFlow(handle,plan){
 const checked=requireMutableJsonRemovePlan(handle,plan);
 return canonical({schema:FLOW,libraryAbi:'owned-json-edit-slot-remove-unit-v1',functionName:checked.functionName,parameters:checked.parameters,loanType:checked.loanType,instructions:checked.instructions,source:checked.source,domain:JSON_REMOVE_LIBRARY_DOMAIN,defaultCompilerAdmission:false});
}
export function reparseCheckedJsonRemoveFlow(handle,plan,wire){
 if(typeof wire!=='string'||Buffer.byteLength(wire)>8*1024*1024)fail('bounded complete flow wire required');
 const expected=serializeCheckedJsonRemoveFlow(handle,plan),data=JSON.parse(wire);
 if(canonical(data)!==wire||wire!==expected||serializeCheckedJsonRemoveFlow(handle,plan)!==wire)fail('wire differs from current private source/loan/flow association');
 return data;
}
function one(rows,label){if(rows.length!==1)fail('one exact native '+label+' required');return rows[0];}
function parse(ts,source,path,kind){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
function find(ts,node,predicate){const rows=[];function visit(item){if(predicate(item))rows.push(item);ts.forEachChild(item,visit);}visit(node);return rows;}
function edit(file,node,replacement){return {span:[node.getStart(file),node.end],expected:node.getText(file),replacement};}
function apply(source,edits){let after=source,last=source.length;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('native selections overlap or changed');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];}return after;}
function phase(before,after,name){
 const initial=transportConcreteSyntaxSource(before,{language:'TypeScript'}),rules={languageRules:[],repositoryRules:[]};rules[name+'Rules']=[{id:'json-remove-library:'+name,edits:[{span:[0,before.length],expected:before,replacement:after}]}];
 const run=applyConcreteSyntaxSubstitutions(initial.document,rules),afterMeta=serializeConcreteSyntaxMeta(run.value),read=transportConcreteSyntaxMeta(afterMeta);
 if(read.source!==after)fail('whole declaration CST differs');
 rules[name+'Rules']=[{id:'json-remove-library:'+name+':inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]}];
 const reversed=applyConcreteSyntaxSubstitutions(read.document,rules);
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reversed.value)).source!==before)fail('whole declaration inverse differs');
 return {phase:name,before,after,beforeMeta:initial.meta,afterMeta,inverse:before,trace:run.trace,completeInverse:true};
}
function nativeCopy(ts,source){
 const file=parse(ts,source,'leaf.d.mts',ts.ScriptKind.TS),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const statements=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;});
 const copy=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(ts.factory.updateSourceFile(file,statements));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(file))!==JSON.stringify(shape(parse(ts,copy,'leaf.d.mts',ts.ScriptKind.TS))))fail('complete detached declaration AST differs');
 return {source,copy,completeNativeAstCopy:true};
}
function declaration(ts,flow,root){
 const before='import type {JsonEditLoan} from "__LOAN_RUNTIME__";\nexport declare function selectedLeaf(arg0: JsonEditLoan, arg1: string): void;\n',file=parse(ts,before,'leaf.d.mts',ts.ScriptKind.TS),fn=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)),'ABI declaration');
 const index=flow.loanType.parameter.index,selections=[edit(file,fn.name,flow.functionName),...fn.parameters.map((parameter,at)=>edit(file,parameter.type,at===index?'JsonEditLoan':'string'))],language=apply(before,selections),next=parse(ts,language,'leaf.d.mts',ts.ScriptKind.TS),literal=one(find(ts,next,node=>ts.isStringLiteral(node)&&node.text==='__LOAN_RUNTIME__'),'loan type import'),repositorySelections=[edit(next,literal,JSON.stringify(resolve(root,RUNTIME)))],after=apply(language,repositorySelections);
 const final=parse(ts,after,'leaf.d.mts',ts.ScriptKind.TS);ts.bindSourceFile(final,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext});if(final.bindDiagnostics?.length)fail('native declaration bindings differ');
 const stages=[phase(before,language,'language'),phase(language,after,'repository')];
 return {path:'remove-library-candidate.d.mts',before,language,after,beforeSha256:hash(before),afterSha256:hash(after),nativeSelections:selections,repositorySelections,stages,beforeMeta:stages[0].beforeMeta,afterMeta:stages[1].afterMeta,inverse:before,nativeCopies:[nativeCopy(ts,before),nativeCopy(ts,after)],nativeBindingCensus:true,strictTypecheck:false};
}
function runtimeDomain(ts,source){
 const file=parse(ts,source,'json-macro-runtime.mjs',ts.ScriptKind.JS),value=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='json_macro_value'),'JSON value validator'),dense=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='dense'),'dense-array validator');
 const bound=(node,name)=>one(find(ts,node,item=>ts.isBinaryExpression(item)&&item.operatorToken.kind===ts.SyntaxKind.GreaterThanToken&&ts.isNumericLiteral(item.right)&&(ts.isIdentifier(item.left)&&item.left.text===name||ts.isPrefixUnaryExpression(item.left)&&item.left.operator===ts.SyntaxKind.PlusPlusToken&&ts.isIdentifier(item.left.operand)&&item.left.operand.text===name)),name+' domain bound');
 const nodes=bound(value,'nodes'),depth=bound(value,'depth'),entries=bound(dense,'length');
 if(nodes.right.text!=='4096'||depth.right.text!=='32'||entries.right.text!=='4096')fail('actual bounded runtime domain changed');
 return [nodes,depth,entries].map(node=>({span:{start:node.getStart(file),end:node.end},source:node.getText(file),limit:Number(node.right.text)}));
}
function rustAbiSource(input){
 const member=one(sourceItems(input.source).filter(item=>item.term==='fn'&&item.name==='remove_if_object'),'paired Rust remove leaf'),tokens=member.tokens.filter(token=>token.type!=='comment'),words=tokens.map(token=>token.text).join('');
 if(words!=='pubfnremove_if_object(root:&mutValue,key:&str)->Option<Value>{root.as_object_mut().and_then(|object|object.remove(key))}')fail('actual authored Rust library edge changed');
 return {path:input.path,sourceSha256:input.sha256,span:{start:member.start,end:member.end},source:input.source.slice(member.start,member.end),mutableBorrowErased:false,nativeInternalsTranslated:false};
}
export function emitJsonRemoveLibraryCandidate(handle,plan,{root=ROOT,cargo,flowWire}={}){
 root=resolve(root);const wire=flowWire??serializeCheckedJsonRemoveFlow(handle,plan),flow=reparseCheckedJsonRemoveFlow(handle,plan,wire),suppliedCargo=copyMetadata(cargo),cargoInputs=['Cargo.toml','rust/Cargo.toml','Cargo.lock'].map(path=>{const source=readFileSync(resolve(root,path),'utf8');return {path,source,sha256:hash(source)};});if(suppliedCargo?.manifest!==cargoInputs[1].source||suppliedCargo?.lock!==cargoInputs[2].source)fail('current complete physical package/workspace/lock source join differs');const owners=originalJsonRemoveLibrarySources(suppliedCargo),ts=ownershipCompiler();
 if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const paths=[RUNTIME,'tools/translation/json-edit-candidate-runtime.d.mts','tools/translation/json-macro-runtime.mjs','tools/translation/json-macro-runtime.d.mts','tools/translation/extensions/json-values.mjs','rust/src/translation_core/json_edit_candidate.rs','rust/tests/json_edit_candidate.rs','rust/tests/json_remove_library_candidate.rs'],runtimeInputs=paths.map(path=>{const source=readFileSync(resolve(root,path),'utf8');return {path,source,sha256:hash(source)};}),limits=runtimeDomain(ts,runtimeInputs.find(row=>row.path==='tools/translation/json-macro-runtime.mjs').source);
 const rustAbi=rustAbiSource(runtimeInputs.find(row=>row.path==='rust/src/translation_core/json_edit_candidate.rs')),javascript=prepareMutableJsonLoanLeaf(handle,plan,{root}),typescript=declaration(ts,flow,root);
 reparseCheckedJsonRemoveFlow(handle,plan,wire);
 for(const input of [...runtimeInputs,...cargoInputs])if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('complete paired runtime/oracle source changed');
 return {schema:'bounded-json-remove-library-artifact-candidate-v1',libraryAbi:owners.libraryAbi,flowWire:wire,flow,owners,domain:JSON_REMOVE_LIBRARY_DOMAIN,runtimeDomainSelections:limits,runtimeInputs,cargoInputs,rustAbi,artifacts:[{path:'remove-library-candidate.mjs',source:javascript.after,proposal:javascript},{path:typescript.path,source:typescript.after,proposal:typescript}],rustOracle:'rust/tests/json_remove_library_candidate.rs',sourceInstalled:false,standaloneLibraryAbi:true,defaultCompilerAdmission:false,applicationAdmission:false,fullOriginalFunctionDomainEquivalent:false,executableCoverageGain:0,strictTargetsExecuted:false,rustExecuted:false,remainingJoins:owners.remainingJoins};
}
