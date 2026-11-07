// Historical comparison DATA. Original source pins remain fixed.
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {deriveGuardedProofLexingConsumerSource} from './prepare-guarded-proof-lexing.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

export const COMPILER_ALIAS_ORIGINAL_CURRENT_PINS=Object.freeze({
 'private-frozen-json.mjs':'6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f',
 'derive-bang-context.mjs':'b54098da88256590088b66bb0bf66bf3a08ec8f729cac3a88c87e2ff84277ec8',
 'derive-enclosing-namespace-context.mjs':'65109370660c0c64885831baadfa71f6be5d03698a5a9591229be5d2910b5d9a',
 'builtin-derive-bang-footprints.mjs':'a64b2c1d038ff3170af071797dcd75c095edba0c05bad330dd55071707bbb135',
 'original-json-intrinsics.mjs':'8b505ecb5e5211496dc5586439e8c8c8c936df1beb29292ede36eef419621f45',
 'private-data-freeze.mjs':'2e7194268a1a136db9217834e8ce6b62d18dadf367ce2c27d4e9fe7d6ee8cbf6',
});
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Compiler alias source evolution: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual '+label+' required');return rows[0];};
function apply(source,edits){let result=source,end=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>end||result.slice(...row.span)!==row.expected)fail('exact native source spans required');end=row.span[0];result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);}return result;}
function nativeInverse(source,name){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const path='tools/translation/'+name,file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');
 const imports=file.statements.filter(ts.isImportDeclaration),edits=[];
 const imported=(target,bindings)=>{const node=one(imports.filter(node=>node.moduleSpecifier.text===target),'selected import '+target),names=node.importClause?.namedBindings;if(!names||!ts.isNamedImports(names)||JSON.stringify(names.elements.map(row=>[(row.propertyName??row.name).text,row.name.text]))!==JSON.stringify(bindings))fail('complete original imported bindings differ');return node;};
 const replace=(node,replacement)=>edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
 if(name==='builtin-derive-bang-footprints.mjs'){
  const node=imported('./operation-proof-byte-bridge.mjs',[['createScopedPrivateNativeProofJsonSerializer','createPrivateFrozenJsonComposer']]);
  replace(node.moduleSpecifier,"'./private-native-proof-json.mjs'");
 }else if(name==='derive-enclosing-namespace-context.mjs'){
  const schemars=imported('./schemars-enclosing-output-dispatch.mjs',[['proveSchemarsBangFootprint','proveSchemarsBangFootprint'],['assertSchemarsBangFootprint','assertSchemarsBangFootprint'],['originalSchemarsOutput','originalSchemarsOutput']]);
  replace(schemars.moduleSpecifier,"'./schemars-bang-footprints.mjs'");
  const wrapper=imported('./default-proof-byte-operation.mjs',[['withDefaultProofByteConsumers','withDefaultProofByteConsumers']]),binding=wrapper.importClause.namedBindings.elements[0].name;
  const entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createDeriveEnclosingNamespaceContext'),'existing enclosing entry');
  const callee=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createUnscopedDeriveEnclosingNamespaceContext'),'original private enclosing callee');
  const absolute=resolve(path),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'},checker=ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
  const wrapperSymbol=checker.getSymbolAtLocation(binding),calleeSymbol=checker.getSymbolAtLocation(callee.name);if(!wrapperSymbol||!calleeSymbol)fail('genuine imported and private function symbols required');
  const calls=[];function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&checker.getSymbolAtLocation(node.expression)===wrapperSymbol)calls.push(node);ts.forEachChild(node,visit);}visit(entry);
  const call=one(calls,'same imported byte scope call'),arrow=call.arguments[0];
  if(call.arguments.length!==1||!ts.isArrowFunction(arrow)||arrow.parameters.length||arrow.modifiers?.length||!ts.isCallExpression(arrow.body)||!ts.isIdentifier(arrow.body.expression)||checker.getSymbolAtLocation(arrow.body.expression)!==checker.getSymbolAtLocation(callee.name)||arrow.body.getText(file)!=='createUnscopedDeriveEnclosingNamespaceContext({deriveContext})')fail('original private creator and exact wrapper required');
  replace(call,arrow.body.getText(file));
  const start=wrapper.getStart(file)-1,end=wrapper.end+1,expected='\n'+wrapper.getText(file)+'\n';if(source.slice(start,end)!==expected)fail('exact standalone wrapper import boundaries required');edits.push({span:[start,end],expected,replacement:''});
 }else fail('no declared source evolution for '+name);
 const inverse=apply(source,edits);let delta=0;const inverseEdits=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const at=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {span:[at,at+row.replacement.length],expected:row.replacement,replacement:row.expected};});
 if(apply(inverse,inverseEdits)!==source)fail('complete independent native inverse differs');return {source:inverse,current:source,text:source,inverse,edits,inverseEdits,nativeLexicalSelection:true};
}
function concreteEquation(row){
 const rule=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]}),stages=[];let document=transportConcreteSyntaxSource(row.source,{language:'JavaScript'}).document;
 for(const phase of ['language','repository']){
  const beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta),target=phase==='language'?row.source:row.current;
  const sequence={languageRules:phase==='language'?[rule(row.source,row.source,'javascript:retain-complete-pinned-comparison-source')]:[],repositoryRules:phase==='repository'?[rule(row.source,row.current,'receiving:declared-complete-compiler-import-and-wrapper-history')]:[]};
  const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
  const inverseSequence={languageRules:[],repositoryRules:[rule(target,row.source,'receiving:restore-complete-original-pinned-comparison-source')]},restored=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence).value));
  if(fresh.source!==row.source||parsed.source!==target||restored.source!==row.source)fail('complete serialized/reparsed source equation differs');stages.push({phase,source:row.source,text:target,beforeMeta,afterMeta,sequence,inverseSequence,inverse:row.source,trace:run.trace});document=parsed.document;
 }
 return {...row,stages};
}
export function deriveCompilerAliasSourceEvolution(source,name){
 const pin=Object.hasOwn(COMPILER_ALIAS_ORIGINAL_CURRENT_PINS,name)?COMPILER_ALIAS_ORIGINAL_CURRENT_PINS[name]:null;
 if(!pin||typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('bounded complete registered source required');if(hash(source)===pin)return null;
 let row=name==='private-frozen-json.mjs'?deriveGuardedProofLexingConsumerSource(source,'tools/translation/'+name):nativeInverse(source,name);
 if(row.current!==source||row.text!==source||row.inverse!==row.source||hash(row.inverse)!==pin)fail('complete original source pin differs');
 if(name!=='private-frozen-json.mjs')row=concreteEquation(row);
 return {...row,originalSha256:pin,currentSha256:hash(source),sourceAuthority:false,runtimeAuthority:false};
}
