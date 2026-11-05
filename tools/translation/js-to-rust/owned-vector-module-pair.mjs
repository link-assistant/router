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
export function prepareOwnedVectorModulePair(javascriptPath,typescriptPath,typescript){
 if(typeof javascriptPath!=='string'||typeof typescriptPath!=='string'||typeof typescript!=='string')fail('primitive complete source required');
 const batch=prepareReverseConcreteSources([{source:typescript,language:'TypeScript'}]);
 if(batch.stages.length!==1||batch.stages[0].source!==typescript)fail('complete CST source differs');
 assertReverseConcreteSourceHost();const ts=ownershipCompiler();
 const typed=ts.createSourceFile(typescriptPath,typescript,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(typed.parseDiagnostics.length)fail('native paired source syntax');
 const originalTokens=tokens(ts,typescript),edits=[];
 function erase(start,end){if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||end>typescript.length)fail('type erasure span');edits.push({span:[start,end],expected:typescript.slice(start,end)});}
 function annotation(type){
  if(!type)return;const start=type.getStart(typed);let low=0,high=originalTokens.length;
  while(low<high){const middle=low+((high-low)>>>1);if(originalTokens[middle].end<=start)low=middle+1;else high=middle;}
  const prior=originalTokens[low-1];
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
 return prepareOwnedCorePairedTypes(javascriptPath,erased,typescriptPath,typescript);
}

import {prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';
