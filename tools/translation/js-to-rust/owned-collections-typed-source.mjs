// Native annotation projection is DATA. The complete resulting body and every
// written domain still pass the separate copied original source checker.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSource} from './concrete-source.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
export function projectOwnedCollectionsTypeScript(source){
 const fail=message=>{throw new TypeError('Owned collection TypeScript source: '+message);};
 const stage=prepareReverseConcreteSource(source,'TypeScript'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile('collections.mts',stage.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),edits=[];if(file.parseDiagnostics.length)fail('complete native grammar differs');
 for(const node of file.statements){
  if(ts.isImportDeclaration(node)){
   if(node.importClause?.isTypeOnly){edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'',kind:'native-type-only-import'});continue;}
   if(node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.isTypeOnly))fail('separate complete type-only import required');
  }else if(!ts.isFunctionDeclaration(node)&&!ts.isEmptyStatement(node))fail('ordinary original functions/imports required');
 }
 function visit(node){
  if(ts.isImportDeclaration(node)||ts.isTypeNode(node))return;
  if(node.typeParameters?.length||node.typeArguments?.length||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node))fail('unproved generic/assertion source construct');
  if((ts.isFunctionDeclaration(node)||ts.isArrowFunction(node)||ts.isParameter(node)||ts.isVariableDeclaration(node))&&node.type){
   const colons=node.getChildren(file).filter(child=>child.kind===ts.SyntaxKind.ColonToken&&child.end<=node.type.getStart(file));if(colons.length!==1)fail('one actual native annotation colon required');
   const start=colons[0].getStart(file);edits.push({span:[start,node.type.end],expected:source.slice(start,node.type.end),replacement:'',kind:'native-written-annotation'});
  }
  ts.forEachChild(node,visit);
 }visit(file);
 edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('native annotation selections overlap');
 let after=source;for(const edit of [...edits].reverse())after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
 const run=createRulePipeline([{phase:'language',rules:[{id:'typescript:substitute-only-complete-native-annotation-spans',apply:()=>after}]},{phase:'repository',rules:[{id:'router:require-complete-collection-JavaScript-projection',apply:value=>{const parsed=ts.createSourceFile('collections.mjs',value,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)fail('complete projected JavaScript grammar differs');return value;}}]}]).run(source);
 const equation=transportConcreteSourceEquations([{before:source,after:run.value,language:'TypeScript'}])[0];if(equation.inverse!==source)fail('complete original typed source inverse differs');
 return {source:run.value,history:{before:source,after:run.value,originalConcreteSyntax:stage.concreteSyntax,edits,equation,trace:run.trace,sourceAuthority:false,semanticAuthority:false}};
}
