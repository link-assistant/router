// Default source proposal: retain an already private, detached analysis once.
import {readFileSync,writeFileSync} from 'node:fs';
import {restoreOwnedStringOperations,extendOwnedStringOperations} from './owned-string-operation-rules.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PATH='tools/translation/js-to-rust/owned-core-operations.mjs';
const ARCHIVE=new URL('./source-profiles/owned-core-private-analysis-retention/original.json.gz',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned private analysis retention source: '+message);};
function original(){
 const packed=readFileSync(ARCHIVE);
 if(packed.length!==8049||hash(packed)!=='32f4047a09d1dfc30501b6ac2136a360c8d569435329413b2986d1f7346b65d0')fail('complete original archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:65536});
 if(raw.length!==28845||hash(raw)!=='2dd01d35cf17c873a5d2fb7718373d97434e7270547296b708ca1fb2d0e4fe4b')fail('complete original bytes changed');
 const packet=JSON.parse(raw.toString('utf8')),row=packet.files?.[0];
 if(packet.schema!=='owned-core-private-analysis-retention-original-v1'||packet.files.length!==1||row.path!==PATH||hash(row.source)!==row.sha256||row.sha256!=='8056d296408b41bfc12bac247d6b8df33e70b94e6dde473b1e3bf5679c13e703')fail('complete original module changed');
 return {...row,archiveBytes:packed};
}
function parse(ts,source){const file=ts.createSourceFile(resolve(ROOT,PATH),source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function nativeCopy(ts,source){
 const file=parse(ts,source),clear=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,clear);};
 const nodes=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);clear(copy);return copy;});
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,nodes));
 if(JSON.stringify(shape(ts,file))!==JSON.stringify(shape(ts,parse(ts,copy))))fail('complete detached native copy differs');
 return {source,copy,completeNativeAstCopy:true};
}
function derive(ts,before){
 const file=parse(ts,before),functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='withOwnedCoreItemChecks');
 if(functions.length!==1)fail('one complete invocation function required');const fn=functions[0];
 const options={allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host=ts.createCompilerHost(options),getSource=host.getSourceFile;
 host.getSourceFile=(path,...args)=>resolve(path)===resolve(ROOT,PATH)?file:getSource(path,...args);
 const program=ts.createProgram([resolve(ROOT,PATH)],options,host),checker=program.getTypeChecker();
 const all=[];function visit(node){all.push(node);ts.forEachChild(node,visit);}visit(fn);
 const checks=all.filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='check'&&node.initializer&&ts.isArrowFunction(node.initializer));
 if(checks.length!==1)fail('one original check closure required');const check=checks[0].initializer;
 const selected=all.filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='privateAnalysis');
 if(selected.length!==1)fail('one private retained declaration required');const declaration=selected[0],call=declaration.initializer;
 if(!ts.isCallExpression(call)||!ts.isIdentifier(call.expression)||call.expression.text!=='canonicalCopy'||call.arguments.length!==1||!ts.isIdentifier(call.arguments[0])||call.arguments[0].text!=='analysis')fail('actual second whole-analysis copy required');
 const variable=declaration.parent.parent,block=variable.parent,index=block.statements?.indexOf(variable),guard=block.statements?.[index+1];
 if(!ts.isVariableStatement(variable)||!ts.isBlock(block)||index!==0||!ts.isIfStatement(guard)||guard.getText(file)!=='if(!privateAnalysis){disable();return checkOwnedCoreItem(item,context);}')fail('complete original duplicate-copy refusal branch differs');
 if(!ts.isIfStatement(block.parent)||block.parent.thenStatement!==block||block.parent.expression.getText(file)!=='admit&&!retained')fail('original private admission branch differs');
 const analysisSymbol=checker.getSymbolAtLocation(call.arguments[0]),copySymbol=checker.getSymbolAtLocation(call.expression),privateSymbol=checker.getSymbolAtLocation(declaration.name);
 if(!analysisSymbol||!copySymbol||!privateSymbol)fail('actual native lexical symbols required');
 const refs=all.filter(node=>ts.isIdentifier(node)&&checker.getSymbolAtLocation(node)===privateSymbol);
 if(refs.length!==4||refs.some(node=>node!==declaration.name&&!ts.isCallExpression(node.parent)&&!ts.isPrefixUnaryExpression(node.parent)))fail('private analysis has an unexpected original use');
 const analyses=all.filter(node=>ts.isIdentifier(node)&&checker.getSymbolAtLocation(node)===analysisSymbol),first=analyses.filter(node=>ts.isBinaryExpression(node.parent)&&node.parent.left===node&&ts.isCallExpression(node.parent.right)&&checker.getSymbolAtLocation(node.parent.right.expression)===copySymbol);
 if(first.length!==1||first[0].parent.getText(file)!=='analysis=canonicalCopy(analysis)')fail('first fresh private detachment required');
 if(first[0].getStart(file)>=declaration.getStart(file)||!check.body.statements.some(node=>node.getText(file).startsWith('if(!retained){analysis=canonicalCopy(analysis);')))fail('detachment must precede retention in the original check scope');
 const rule={span:[variable.getFullStart(),guard.end],expected:before.slice(variable.getFullStart(),guard.end),replacement:'\n   // Retain the qualified private copy made before equality. Returned and\n   // original issued rows remain separate; the census and all fences still run.\n   const privateAnalysis=analysis;'};
 const language=before.slice(0,rule.span[0])+rule.replacement+before.slice(rule.span[1]);parse(ts,language);
 let inverse=language.slice(0,rule.span[0])+rule.expected+language.slice(rule.span[0]+rule.replacement.length);if(inverse!==before)fail('complete native selected inverse differs');
 // The surrounding pinned function is complete. No return, issuer, equality,
 // source fence, intrinsic guard, admission census or saturation path changes.
 const afterFile=parse(ts,language),afterFn=afterFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='withOwnedCoreItemChecks');
 if(!afterFn)fail('complete native final invocation function absent');
 return {language,after:language,selection:{rule,completeOriginalFunction:fn.getText(file),completeAfterFunction:afterFn.getText(afterFile),analysisReferences:analyses.map(node=>({span:[node.getStart(file),node.end],parent:node.parent.getText(file)})),privateReferences:refs.map(node=>({span:[node.getStart(file),node.end],parent:node.parent.getText(file)})),nativeLexicalBindings:true,nativeInverse:inverse}};
}
function stage(before,after,id){return {id,edits:[{span:[0,before.length],expected:before,replacement:after}]};}
export function prepareOwnedCorePrivateAnalysisRetention({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const birth=original(),before=birth.source,derived=derive(ts,before),{language,after}=derived;
 const current=readFileSync(resolve(root,PATH),'utf8'),historical=restoreOwnedStringOperations(PATH,current);if(historical!==before&&historical!==after)fail('complete current source equation differs');
 const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),stages=[];let document=first.document;
 for(const [phase,left,right]of [['language',before,language],['repository',language,after]]){
  const wire=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(wire);if(fresh.source!==left)fail('complete phase input differs');
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?[stage(left,right,'javascript:retain-existing-private-analysis')]:[],repositoryRules:phase==='repository'?[stage(left,right,'router:preserve-complete-operations-source')]:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);
  if(last.source!==right)fail('complete phase output differs');
  const undo=applyConcreteSyntaxSubstitutions(last.document,{languageRules:phase==='language'?[stage(right,left,'javascript:restore-second-private-copy')]:[],repositoryRules:phase==='repository'?[stage(right,left,'router:restore-complete-operations-source')]:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==left)fail('complete phase inverse differs');
  stages.push({phase,before:left,after:right,beforeMeta:wire,afterMeta,trace:run.trace,completeInverse:true});document=last.document;
 }
 const nativeCopies=[nativeCopy(ts,before),nativeCopy(ts,after)];
 if(readFileSync(resolve(root,PATH),'utf8')!==current)fail('complete physical source changed during proposal');
 const row={path:PATH,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(row=>row.trace),nativeCopies,completeNativeAstCopy:true,sourceLanguage:'JavaScript',selection:derived.selection};
 if(!readFileSync(ARCHIVE).equals(birth.archiveBytes))fail('complete original archive changed during proposal');
 if(readFileSync(resolve(root,PATH),'utf8')!==current)fail('complete physical source changed at final source/hash join');
 return {schema:'owned-core-private-analysis-retention-source-v1',typescriptVersion:ts.version,files:[row],defaultAdoption:true,freshAnalysisCopiesBefore:2,freshAnalysisCopiesAfter:1,sourceChecksUnchanged:true,hashCallbacksUnchanged:true,sourceAuthority:false,runtimeAuthority:false,runtimeExecuted:false,rustExecuted:false};
}
export function composeOwnedCorePrivateAnalysisRetention(prior,options={}){
 const before=original().source;if(Object.hasOwn(prior,PATH)&&prior[PATH].after!==before)fail('preceding complete operations equation differs');
 const plan=prepareOwnedCorePrivateAnalysisRetention(options),sources={...prior};for(const row of plan.files)sources[row.path]=row;return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('usage: --emit|--write|--check');
 const plan=prepareOwnedCorePrivateAnalysisRetention();
 if(args[0]==='--emit')console.log(JSON.stringify(plan));
 else if(args[0]==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('physical source changed before write');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),extendOwnedStringOperations(row.path,row.after));}
 else if(plan.files.some(row=>restoreOwnedStringOperations(row.path,row.current)!==row.after))fail('complete default operations source is stale');
}
