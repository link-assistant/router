// Opt-in source selection only. Reuse the complete original typed-position,
// lifetime-syntax, cfg, binding, inverse and producer checks with the genuine
// enclosing creator from the SAME private issuer. No default import changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),INPUT='tools/translation/migrate-core-primitives.mjs',OUTPUT='tools/translation/enclosing-core-primitives-candidate.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Enclosing primitive source preparation: '+message);};
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function nativeCopy(ts,path,source,file=parse(ts,path,source)){if(file.fileName!==path||file.text!==source||file.parseDiagnostics.length)fail('same-invocation native source differs');const copyNode=node=>{const copy=ts.getSynthesizedDeepClone(node),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};detach(copy);return copy;},copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,file.statements.map(copyNode))),shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};if(JSON.stringify(shape(parse(ts,path,copy)))!==JSON.stringify(shape(file)))fail('complete native copy differs');return {source,copy,completeNativeAstCopy:true};}
export function prepareEnclosingCorePrimitivesCandidate({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const source=readFileSync(resolve(root,INPUT),'utf8'),file=parse(ts,INPUT,source),changes=[],factory='createCoreAdoptionProducerContext',replacement='createEnclosingCoreAdoptionProducerContext';
 const imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./core-adoption-producer-context.mjs');if(imports.length!==1||!ts.isNamedImports(imports[0].importClause?.namedBindings))fail('one actual private issuer import required');
 const bindings=imports[0].importClause.namedBindings.elements.filter(node=>node.name.text===factory&&!node.propertyName);if(bindings.length!==1)fail('one genuine original creator binding required');
 const corpus=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='proposeCorePrimitivesCorpus');if(corpus.length!==1)fail('one complete original corpus operation required');
 const calls=[];const find=node=>{if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text===factory)calls.push(node);ts.forEachChild(node,find);};find(file);if(calls.length!==1||calls[0].getStart(file)<corpus[0].getStart(file)||calls[0].end>corpus[0].end)fail('one original corpus creator call required');
 const names=new Map([[factory,replacement],['proposeCorePrimitivesCorpus','proposeEnclosingCorePrimitivesCorpus'],['migrateCorePrimitives','migrateEnclosingCorePrimitives']]);
 const literals=new Map([['router-core-primitives-corpus-proposal-v1','router-owned-enclosing-primitives-corpus-proposal-v1']]);
 const visit=node=>{let after;if(ts.isIdentifier(node)&&names.has(node.text))after=names.get(node.text);else if(ts.isStringLiteral(node)&&literals.has(node.text))after=JSON.stringify(literals.get(node.text));if(after!==undefined)changes.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:after});ts.forEachChild(node,visit);};visit(file);
 let after=source;for(const row of changes.sort((a,b)=>b.span[0]-a.span[0])){if(after.slice(...row.span)!==row.expected)fail('native source selection differs');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);}
 const final=parse(ts,OUTPUT,after),nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),ordinary=new Map(file.statements.filter(node=>ts.isFunctionDeclaration(node)).map(node=>[node.name.text,node.getText(file)]));
 // These complete source-selection guards are copied byte-for-byte. Only the
 // coroutine-free corpus operation's creator binding and public name change.
 for(const name of ['sourceMap','scopeProblems','typeEdits','functionEdits','visitItems','proposal','inspectTypePositions','coreTypeProducerProblemsForModule']){
  const rows=final.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1||rows[0].getText(final)!==ordinary.get(name))fail('complete original selection/refusal callback changed: '+name);
 }
 const before=transportConcreteSyntaxSource(source,{language:'JavaScript'}),rule=(left,right,id)=>({id,edits:[{span:[0,left.length],expected:left,replacement:right}]}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[rule(source,source,'javascript:retain-complete-typed-position-and-owner-guards')],repositoryRules:[rule(source,after,'router:select-genuine-enclosing-creator-with-original-private-consumers')]}),afterMeta=serializeConcreteSyntaxMeta(run.value),result=transportConcreteSyntaxMeta(afterMeta),inverse=applyConcreteSyntaxSubstitutions(result.document,{languageRules:[rule(after,source,'javascript:restore-complete-original-primitive-corpus')],repositoryRules:[]});
 if(result.source!==after||transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('complete CST inverse differs');
 return {schema:'owned-enclosing-primitives-candidate-preparation-v1',typescriptVersion:ts.version,input:{path:INPUT,source,sha256:hash(source)},files:[{path:OUTPUT,before:source,language:source,after,beforeMeta:before.meta,afterMeta,inverse:source,beforeSha256:hash(source),afterSha256:hash(after),trace:run.trace,nativeSelections:changes,nativeCopies:[nativeCopy(ts,INPUT,source,file),nativeCopy(ts,OUTPUT,after,final)],nativeBindings}],semanticAuthority:false,defaultApiUnchanged:true,originalLifetimeAndProducerGuardsUnchanged:true,runtimeExecuted:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode]=process.argv.slice(2);if(process.argv.length!==3||!['--write','--check'].includes(mode))fail('usage: --write|--check');const plan=prepareEnclosingCorePrimitivesCandidate();for(const row of plan.files)if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);else if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.after)fail('complete candidate source is stale');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false}));
}
