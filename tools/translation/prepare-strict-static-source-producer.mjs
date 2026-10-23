// Copy the complete current DATA producer through native spans and both CST phases.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const INPUT='tools/translation/prepare-real-source-fixtures.mjs',OUTPUT='tools/translation/strict-static-source-producer.mjs';
const fail=message=>{throw new TypeError('Strict static producer source: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const one=(rows,label)=>{if(rows.length!==1)fail('one exact native '+label+' required');return rows[0];};
function grammar(ts,source){const file=ts.createSourceFile(INPUT,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native source grammar differs');return file;}
function nodes(ts,root,predicate){const rows=[];function visit(node){if(predicate(node))rows.push(node);ts.forEachChild(node,visit);}visit(root);return rows;}
function substitute(source,file,node,replacement){const span=[node.getStart(file),node.end],expected=node.getText(file);if(source.slice(...span)!==expected)fail('native source selection changed');return {source:source.slice(0,span[0])+replacement+source.slice(span[1]),edit:{span,expected,replacement}};}
function phase(before,after,name){
 const input=transportConcreteSyntaxSource(before,{language:'JavaScript'}),rules={languageRules:[],repositoryRules:[]};rules[name+'Rules']=[{id:'static-source-refresh:'+name,edits:[{span:[0,before.length],expected:before,replacement:after}]}];const run=applyConcreteSyntaxSubstitutions(input.document,rules),afterMeta=serializeConcreteSyntaxMeta(run.value),read=transportConcreteSyntaxMeta(afterMeta);
 if(read.source!==after)fail('whole source CST differs');rules[name+'Rules']=[{id:'static-source-refresh:'+name+':inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]}];const inverse=applyConcreteSyntaxSubstitutions(read.document,rules);if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('whole source inverse differs');
 return {phase:name,before,after,beforeMeta:input.meta,afterMeta,inverse:before,trace:run.trace,completeInverse:true};
}
function nativeCopy(ts,source){
 const file=grammar(ts,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);},statements=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;});
 const copy=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(ts.factory.updateSourceFile(file,statements)),shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(file))!==JSON.stringify(shape(grammar(ts,copy))))fail('complete detached native source copy differs');return {source,copy,completeNativeAstCopy:true};
}
export function prepareStrictStaticSourceProducer({root=ROOT}={}){
 root=resolve(root);const before=readFileSync(resolve(root,INPUT),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual installed TypeScript5.9.3 required');const file=grammar(ts,before),producer=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareStaticSourceLifecycleProposalReleased'),'complete original allocation-release producer');
 const actual=one(nodes(ts,producer,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='actual'),'physical source capture'),caught=one(nodes(ts,actual,node=>ts.isCatchClause(node)),'original physical-to-Git fallback');
 if(caught.variableDeclaration?.name.getText(file)!=='error'||caught.block.statements.length!==2)fail('actual original fallback structure differs');
 const statements=caught.block.statements,first=statements[0],second=statements[1];if(!ts.isIfStatement(first)||first.getText(file)!=="if(error.code!=='ENOENT')throw error;"||!ts.isExpressionStatement(second)||!ts.isBinaryExpression(second.expression)||second.expression.left.getText(file)!=='bytes'||!ts.isCallExpression(second.expression.right)||second.expression.right.expression.getText(file)!=='staticGit'||second.expression.right.arguments.map(node=>node.getText(file)).join(',')!=="root,['show',subjectRevision+':'+row.path]")fail('exact original fallback call/binding required');
 const selected=substitute(before,file,caught.block,'{throw error;}'),language=selected.source,next=grammar(ts,language),nextProducer=one(next.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareStaticSourceLifecycleProposalReleased'),'repository export'),renamed=substitute(language,next,nextProducer.name,'prepareStrictStaticSourceLifecycleProposal');
 const repositoryFile=grammar(ts,renamed.source),repositoryProducer=one(repositoryFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareStrictStaticSourceLifecycleProposal'),'strict export storage producer');
 const packing=one(nodes(ts,repositoryProducer,node=>ts.isCallExpression(node)&&node.expression.getText(repositoryFile)==='gzipSync'),'complete output gzip call');
 if(packing.arguments.length!==2||packing.arguments[0].getText(repositoryFile)!=='stored.raw'||packing.arguments[1].getText(repositoryFile)!=='{level:1,mtime:0}')fail('exact original output storage call required');
 const storageLevel=one(nodes(ts,packing.arguments[1],node=>ts.isPropertyAssignment(node)&&node.name.getText(repositoryFile)==='level'),'output storage level');
 if(!ts.isNumericLiteral(storageLevel.initializer)||storageLevel.initializer.text!=='1')fail('original gzip level must remain one');
 const previousStorage=substitute(renamed.source,repositoryFile,storageLevel.initializer,'9').source;
 const storage=substitute(renamed.source,repositoryFile,packing,'gzipStaticSourceStorage(stored.raw)'),importAt=repositoryFile.statements.find(ts.isImportDeclaration).getStart(repositoryFile),importEdit={span:[importAt,importAt],expected:'',replacement:"import {gzipStaticSourceStorage} from './static-source-gzip.mjs';\n"},after=storage.source.slice(0,importAt)+importEdit.replacement+storage.source.slice(importAt);grammar(ts,after);
 let current='';try{current=readFileSync(resolve(root,OUTPUT),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==''&&current!==renamed.source&&current!==previousStorage&&current!==after)fail('unknown existing strict producer output');
 const stages=[phase(before,language,'language'),phase(language,after,'repository')],row={path:OUTPUT,copiedFrom:INPUT,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),nativeSelections:[selected.edit],repositorySelections:[renamed.edit,storage.edit,importEdit],stages,beforeMeta:stages[0].beforeMeta,afterMeta:stages[1].afterMeta,inverse:before,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),nativeCopies:[nativeCopy(ts,before),nativeCopy(ts,after)]};
 if(readFileSync(resolve(root,INPUT),'utf8')!==before)fail('complete original producer changed before return');
 return {schema:'strict-static-source-producer-copy-v1',files:[row],typescriptVersion:ts.version,originalProducerApisUnchanged:true,physicalGitFallbackRemovedOnlyInExplicitSibling:true,historicalUniversesUnchanged:true,limitsUnchanged:true,exportStorageGzipLevel:9,previousStorageGzipLevel:1,gzipStorageObservationsEquivalent:false,optionalStorageCompression:{implementation:'pinned Google Zopfli C/WebAssembly',iterations:1,ordinaryGzipLevel:9,eligibleInputBytes:32*1024*1024,triggerOutputBytes:4*1024*1024,completeByteInverseRequired:true},semanticAuthority:false,runtimeExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('usage: --emit|--write|--check');const plan=prepareStrictStaticSourceProducer(),row=plan.files[0];
 if(args[0]==='--emit')process.stdout.write(JSON.stringify(plan)+'\n');
 else if(args[0]==='--check'){if(row.current!==row.after)fail('strict source output is stale');process.stdout.write('Strict static source DATA producer is current.\n');}
 else {if(readFileSync(resolve(ROOT,INPUT),'utf8')!==row.before)fail('original source changed before write');writeFileSync(resolve(ROOT,OUTPUT),row.after);process.stdout.write('Wrote one explicit strict source DATA producer.\n');}
}
