// Fragments consumed only inside original private source/body traversal.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createReconcileSourceCapture} from './paired-sync-reconcile-20261101-support.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {BORROWED_JSON_TOOL_PREDICATE as CONTRACT} from './borrowed-json-tool-20261103-contracts.mjs';
import {withBorrowedJsonToolReverseNativeSources} from './borrowed-json-tool-20261103-reverse-native.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const fail=message=>{throw TypeError('Borrowed JSON tool reverse caller: '+message);};
/** Selection only. Actual native source/owner checks run inside the operation.
 * Existing modules without these new canonical imports keep their old domain. */
export function needsBorrowedJsonToolReverseSourceOperation(analysis,resolveTarget){
 const {ts,file}=analysis;return file.statements.some(statement=>ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings)&&statement.importClause.namedBindings.elements.some(specifier=>['borrowedJsonToolIsTranslatable','borrowedJsonToolInput'].includes((specifier.propertyName??specifier.name).text))&&[analysis.runtimeRoot+'/'+CONTRACT.runtimeModule,analysis.runtimeRoot+'/borrowed-json-tool-20261103-input-runtime.mjs'].includes(resolveTarget(statement.moduleSpecifier.text)));
}
export function borrowedJsonToolReverseRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const capture=createReconcileSourceCapture(ROOT),rows=[];
 return withCompleteSourceClosingFence(()=>{
  for(const name of [CONTRACT.runtimeModule,CONTRACT.declarationModule,'borrowed-json-tool-20261103-input-runtime.mjs','borrowed-json-tool-20261103-input-runtime.d.mts']){
   const source=capture.capture('tools/translation/'+name).source;if(typeof source!=='string')fail('complete original runtime source missing');const language=name.endsWith('.mts')?'TypeScript':'JavaScript',concrete=transportConcreteSyntaxSource(source,{language});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original runtime CST differs');
   for(const base of new Set([runtimeRoot,declarationRoot]))rows.push({path:join(base,name).split('\\').join('/'),source});
  }return rows;
 },[capture.close]);
}
export function requireBorrowedJsonToolReverseSources(state){
 for(const row of borrowedJsonToolReverseRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('complete original receiving runtime/declaration differs');
 // Fresh operation every time: no source frame or owner verdict on state.
 return withBorrowedJsonToolReverseNativeSources(state.files,()=>null);
}
export function borrowedJsonToolReverseWrittenInput(ts,checker,type,analysis,binding){
 if(!binding||binding.typeOnly||binding.name!==CONTRACT.javascriptName||binding.target!==analysis.runtimeRoot+'/'+CONTRACT.runtimeModule)return null;
 if(!ts.isIndexedAccessTypeNode(type)||!ts.isLiteralTypeNode(type.indexType)||type.indexType.literal.text!=='0')return null;
 const module=analysis.syntax.get(analysis.runtimeRoot+'/'+CONTRACT.declarationModule),symbol=module&&checker.getSymbolAtLocation(module),exports=symbol&&checker.getExportsOfModule(symbol),selected=exports?.filter(value=>value.name===CONTRACT.javascriptName);
 if(selected?.length!==1||selected[0].declarations?.length!==1||selected[0].declarations[0].getSourceFile()!==module||!ts.isFunctionDeclaration(selected[0].declarations[0]))fail('actual current canonical declaration owner required');
 return 'borrowed-json-tool-input';
}
export function readBorrowedJsonToolReverseCall({ts,node,binding,analysis,params,expression,current}){
 if(binding.name!==CONTRACT.javascriptName||binding.target!==analysis.runtimeRoot+'/'+CONTRACT.runtimeModule)return null;current();if(binding.typeOnly||node.arguments.length!==1||node.typeArguments?.length||node.questionDotToken||!ts.isIdentifier(node.arguments[0]))fail('actual direct original JSON input required');const value=expression(node.arguments[0]);if(value.type!=='borrowed-json-tool-input'||!value.root||!params.some(param=>param.type==='borrowed-json-tool-input'&&param.name===value.root))fail('actual shared direct JSON parameter root required');current();return {kind:'borrowed-json-tool-predicate',name:CONTRACT.javascriptName,args:[value],type:'bool',root:null};
}
export function borrowedJsonToolReverseInputPrelude(item,rust,imports){
 if(rust)return '';const inputs=item.params.filter(parameter=>parameter.type==='borrowed-json-tool-input');if(!inputs.length)return '';imports.add('borrowedJsonToolInput');return inputs.map(parameter=>'    __ro_borrowedJsonToolInput('+parameter.name+');').join('\n');
}
/** Consume only a complete prefix over actual parameter/import symbols. */
export function consumeBorrowedJsonToolReverseInputPrelude(analysis,declaration,params,resolveImport,statements){
 const {ts,checker}=analysis,inputs=params.filter(parameter=>parameter.type==='borrowed-json-tool-input');if(!inputs.length||!statements.length)return statements;
 const first=statements[0],call=ts.isExpressionStatement(first)&&ts.isCallExpression(first.expression)?first.expression:null;
 if(!call||!ts.isIdentifier(call.expression))return statements;const selected=resolveImport(call.expression);if(selected.name!=='borrowedJsonToolInput'||selected.target!==analysis.runtimeRoot+'/borrowed-json-tool-20261103-input-runtime.mjs')return statements;
 for(let at=0;at<inputs.length;at++){
  const parameter=inputs[at],statement=statements[at],call=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||!ts.isIdentifier(call.expression)||!ts.isIdentifier(call.arguments[0])||call.arguments[0].text!==parameter.name)fail('complete JSON input-shape prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===parameter.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(call.expression);
  if(!symbol||checker.getSymbolAtLocation(call.arguments[0])!==symbol||binding.typeOnly||binding.name!=='borrowedJsonToolInput'||binding.target!==analysis.runtimeRoot+'/borrowed-json-tool-20261103-input-runtime.mjs')fail('actual input-shape import and parameter symbol required');
 }return statements.slice(inputs.length);
}

/** A written unknown remains unknown unless its genuine parameter symbol feeds
 * this exact imported operation; complete body checking still follows. */
export function borrowedJsonToolReverseUnknownInput(ts,type,analysis,resolveImport){
 if(type.kind!==ts.SyntaxKind.UnknownKeyword)return null;let parameter=type.parent;while(parameter&&ts.isParenthesizedTypeNode(parameter))parameter=parameter.parent;if(!parameter||!ts.isParameter(parameter)||!ts.isIdentifier(parameter.name))return null;const declaration=parameter.parent;if(!ts.isFunctionDeclaration(declaration)||!declaration.body)return null;const symbol=analysis.checker.getSymbolAtLocation(parameter.name);if(!symbol)return null;let selected=false,cells=100000;
 const visit=(node,depth=0)=>{if(--cells<0||depth>160)fail('original unknown-input source traversal bound');if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.arguments.length===1&&ts.isIdentifier(node.arguments[0])&&analysis.checker.getSymbolAtLocation(node.arguments[0])===symbol){const callee=analysis.checker.getSymbolAtLocation(node.expression),original=callee?.declarations;if(original?.length===1&&ts.isImportSpecifier(original[0])){const binding=resolveImport(node.expression);if(!binding.typeOnly&&binding.name===CONTRACT.javascriptName&&binding.target===analysis.runtimeRoot+'/'+CONTRACT.runtimeModule)selected=true;}}ts.forEachChild(node,child=>visit(child,depth+1));};visit(declaration.body);return selected?'borrowed-json-tool-input':null;
}
