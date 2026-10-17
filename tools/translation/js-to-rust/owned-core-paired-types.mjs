// Written TypeScript input domains only. No caller can supply this selection
// to the checker: owned-core-source reconstructs it from its private originals.
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSources,assertReverseConcreteSourceHost} from './concrete-source.mjs';

const fail=message=>{throw TypeError('Owned reverse paired types: '+message);};
function tokens(ts,source){
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,source),result=[];
 for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan()){
  // Comments remain tokens in this comparison. Only whitespace can differ
  // around removed written types; both full trivia streams remain in CST.
  if(kind===ts.SyntaxKind.WhitespaceTrivia||kind===ts.SyntaxKind.NewLineTrivia)continue;
  result.push({kind,text:scanner.getTokenText(),start:scanner.getTokenPos(),end:scanner.getTextPos()});
 }
 return result;
}
/** Deterministic source-path pairing; neither names nor flags grant a domain. */
export function ownedCorePairedTypePath(path,paths,runtimeRoot,declarationRoot){
 if(!path.endsWith('.mjs'))return null;
 const sourceRoot=posix.dirname(runtimeRoot),typedRoot=posix.dirname(declarationRoot);
 if(sourceRoot!=='.'&&!path.startsWith(sourceRoot+'/'))return null;
 const suffix=sourceRoot==='.'?path:path.slice(sourceRoot.length+1),stem=suffix.slice(0,-4);
 const candidates=['.ts','.mts'].map(ext=>(typedRoot==='.'?'':typedRoot+'/')+stem+ext).filter(name=>paths.has(name));
 if(candidates.length>1)fail('ambiguous complete TypeScript pair');return candidates[0]??null;
}
/**
 * Both complete modules undergo real CST serialization/reparsing. The native
 * AST supplies each erased type span, never an arbitrary substring or regex.
 * Unknown TypeScript forms refuse instead of broadening executable JS syntax.
 * The result is detached source data, with no native Program/Checker/frame.
 */
export function prepareOwnedCorePairedTypes(javascriptPath,javascript,typescriptPath,typescript){
 if(typeof javascriptPath!=='string'||typeof typescriptPath!=='string'||typeof javascript!=='string'||typeof typescript!=='string')fail('primitive complete source required');
 const batch=prepareReverseConcreteSources([{source:javascript,language:'JavaScript'},{source:typescript,language:'TypeScript'}]);
 if(batch.stages.length!==2||batch.stages[0].source!==javascript||batch.stages[1].source!==typescript)fail('complete CST source differs');
 assertReverseConcreteSourceHost();const ts=ownershipCompiler();
 const js=ts.createSourceFile(javascriptPath,javascript,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),typed=ts.createSourceFile(typescriptPath,typescript,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(js.parseDiagnostics.length||typed.parseDiagnostics.length)fail('native paired source syntax');
 const originalTokens=tokens(ts,typescript),edits=[];
 function erase(start,end){if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||end>typescript.length)fail('type erasure span');edits.push({span:[start,end],expected:typescript.slice(start,end)});}
 function annotation(type){
  if(!type)return;const start=type.getStart(typed),prior=originalTokens.filter(token=>token.end<=start).at(-1);
  if(prior?.kind!==ts.SyntaxKind.ColonToken)fail('actual type annotation colon required');erase(prior.start,type.end);
 }
 for(const statement of typed.statements){
  if(ts.isImportDeclaration(statement)){
   if(statement.importClause?.isTypeOnly){erase(statement.getStart(typed),statement.end);continue;}
   if(statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings)&&statement.importClause.namedBindings.elements.some(item=>item.isTypeOnly))fail('mixed type-only import requires separate erasure');
  }else if(!ts.isFunctionDeclaration(statement)&&!ts.isEmptyStatement(statement))fail('unsupported paired top-level declaration');
 }
 function visit(node){
  if(ts.isTypeNode(node))return;
  if(ts.isImportDeclaration(node))return;
  if(ts.isFunctionDeclaration(node)){
   if(!node.name||!node.body||node.typeParameters?.length)fail('ordinary paired function required');annotation(node.type);
  }else if(ts.isParameter(node)||ts.isVariableDeclaration(node))annotation(node.type);
  if(node.typeParameters?.length||node.typeArguments?.length||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node))fail('unsupported executable TypeScript erasure');
  ts.forEachChild(node,visit);
 }
 for(const statement of typed.statements)visit(statement);
 edits.sort((a,b)=>a.span[0]-b.span[0]);
 for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping type erasure');
 let removed=0;for(const edit of edits){edit.afterSpan=[edit.span[0]-removed,edit.span[0]-removed];removed+=edit.span[1]-edit.span[0];}
 let erased=typescript;for(let at=edits.length-1;at>=0;at--)erased=erased.slice(0,edits[at].span[0])+erased.slice(edits[at].span[1]);
 const left=tokens(ts,javascript),right=tokens(ts,erased);
 if(left.length!==right.length||left.some((token,at)=>token.kind!==right[at].kind||token.text!==right[at].text))fail('complete executable tokens differ');
 const erasedFile=ts.createSourceFile(javascriptPath,erased,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(erasedFile.parseDiagnostics.length)fail('erased JavaScript syntax');
 // Token equality alone would miss ASI-sensitive newlines. Compare the whole
 // independent JS AST topology too, without retaining either native tree.
 const pending=[[js,erasedFile,0]];let nodes=0;
 while(pending.length){
  const [a,b,depth]=pending.pop();if(++nodes>200000||depth>256)fail('paired native syntax budget');if(a.kind!==b.kind)fail('erased native syntax differs');
  const before=[],after=[];ts.forEachChild(a,node=>{before.push(node);});ts.forEachChild(b,node=>{after.push(node);});
  if(before.length!==after.length)fail('erased native syntax differs');for(let at=0;at<before.length;at++)pending.push([before[at],after[at],depth+1]);
 }
 const jsFunctions=js.statements.filter(ts.isFunctionDeclaration),tsFunctions=typed.statements.filter(ts.isFunctionDeclaration);
 if(jsFunctions.length!==tsFunctions.length)fail('complete function census differs');
 const functions=jsFunctions.map((node,at)=>{
  const actual=tsFunctions[at];
  if(node.name?.text!==actual.name?.text||node.parameters.length!==actual.parameters.length)fail('ordered original function differs');
  const parameters=node.parameters.map((param,index)=>{
   const target=actual.parameters[index];
   if(!ts.isIdentifier(param.name)||!ts.isIdentifier(target.name)||param.name.text!==target.name.text)fail('original parameter binding differs');
   return {name:param.name.text,javascriptSpan:[param.getStart(js),param.end],typescriptSpan:[target.getStart(typed),target.end],typeSpan:target.type?[target.type.getStart(typed),target.type.end]:null};
  });
  const variables=body=>{const rows=[];function visit(value){if(ts.isFunctionLike(value))return;if(ts.isVariableDeclaration(value))rows.push(value);ts.forEachChild(value,visit);}visit(body);return rows;};
  const before=variables(node.body),after=variables(actual.body);if(before.length!==after.length)fail('ordered local declaration census differs');
  const locals=before.map((item,index)=>{
   const target=after[index];if(!ts.isIdentifier(item.name)||!ts.isIdentifier(target.name)||item.name.text!==target.name.text)fail('original local binding differs');
   return {name:item.name.text,javascriptSpan:[item.getStart(js),item.end],typescriptSpan:[target.getStart(typed),target.end],typeSpan:target.type?[target.type.getStart(typed),target.type.end]:null};
  });
  return {name:node.name.text,javascriptSpan:[node.getStart(js),node.end],typescriptSpan:[actual.getStart(typed),actual.end],parameters,locals,returnSpan:actual.type?[actual.type.getStart(typed),actual.type.end]:null};
 });
 assertReverseConcreteSourceHost();return {schema:'owned-core-written-paired-types-v1',javascript:{path:javascriptPath,source:javascript,concreteSyntax:batch.stages[0].concreteSyntax},typescript:{path:typescriptPath,source:typescript,concreteSyntax:batch.stages[1].concreteSyntax},erasure:{source:erased,edits},functions};
}
