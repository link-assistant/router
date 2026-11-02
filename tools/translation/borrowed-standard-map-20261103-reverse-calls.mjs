// Fragments consumed only inside original private source/body traversal.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createReconcileSourceCapture} from './paired-sync-reconcile-20261101-support.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {BORROWED_STANDARD_MAP_LITERAL_PREDICATE as CONTRACT} from './borrowed-standard-map-20261103-contracts.mjs';
import {withBorrowedStandardMapReverseNativeSources} from './borrowed-standard-map-20261103-reverse-native.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const fail=message=>{throw TypeError('Borrowed standard-map reverse caller: '+message);};
export function borrowedStandardMapReverseRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const capture=createReconcileSourceCapture(ROOT),rows=[];
 return withCompleteSourceClosingFence(()=>{
  for(const name of [CONTRACT.runtimeModule,CONTRACT.declarationModule,'borrowed-standard-map-20261103-input-runtime.mjs','borrowed-standard-map-20261103-input-runtime.d.mts']){
   const source=capture.capture('tools/translation/'+name).source;if(typeof source!=='string')fail('complete original runtime source missing');const language=name.endsWith('.mts')?'TypeScript':'JavaScript',concrete=transportConcreteSyntaxSource(source,{language});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original runtime CST differs');
   for(const base of new Set([runtimeRoot,declarationRoot]))rows.push({path:join(base,name).split('\\').join('/'),source});
  }return rows;
 },[capture.close]);
}
export function requireBorrowedStandardMapReverseSources(state){
 for(const row of borrowedStandardMapReverseRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('complete original receiving runtime/declaration differs');
 // Fresh operation every time: no source frame or owner verdict on state.
 return withBorrowedStandardMapReverseNativeSources(state.files,()=>null);
}
export function borrowedStandardMapReverseWrittenInput(ts,checker,type,analysis,binding){
 if(!binding||binding.typeOnly||binding.name!==CONTRACT.javascriptName||binding.target!==analysis.runtimeRoot+'/'+CONTRACT.runtimeModule)return null;
 if(!ts.isIndexedAccessTypeNode(type)||!ts.isLiteralTypeNode(type.indexType)||type.indexType.literal.text!=='0')return null;
 const module=analysis.syntax.get(analysis.runtimeRoot+'/'+CONTRACT.declarationModule),symbol=module&&checker.getSymbolAtLocation(module),exports=symbol&&checker.getExportsOfModule(symbol),selected=exports?.filter(value=>value.name===CONTRACT.javascriptName);
 if(selected?.length!==1||selected[0].declarations?.length!==1||selected[0].declarations[0].getSourceFile()!==module||!ts.isFunctionDeclaration(selected[0].declarations[0]))fail('actual current canonical declaration owner required');
 return 'standard-text-map-input';
}
export function readBorrowedStandardMapReverseCall({ts,node,binding,analysis,params,expression,current}){
 if(binding.name!==CONTRACT.javascriptName||binding.target!==analysis.runtimeRoot+'/'+CONTRACT.runtimeModule)return null;
 current();if(binding.typeOnly||node.arguments.length!==3||!ts.isIdentifier(node.arguments[0])||!ts.isArrayLiteralExpression(node.arguments[2])||node.arguments[2].elements.length>64)fail('actual input and complete bounded literal array required');
 const map=expression(node.arguments[0]),key=expression(node.arguments[1]),literals=[];
 if(map.type!=='standard-text-map-input'||!map.root||!params.some(param=>param.type==='standard-text-map-input'&&param.name===map.root)||key.type!=='str')fail('actual shared standard-map input and scalar key required');
 for(const literal of node.arguments[2].elements){if(!ts.isStringLiteral(literal)&&!ts.isNoSubstitutionTemplateLiteral(literal))fail('dense pure scalar literal array required');for(const point of literal.text){const code=point.codePointAt(0);if(code>=0xd800&&code<=0xdfff)fail('unpaired surrogate literal refused');}literals.push(literal.text);}
 current();return {kind:'standard-map-predicate',name:CONTRACT.javascriptName,args:[map,key],literals,type:'bool',root:null};
}
export function borrowedStandardMapReverseInputPrelude(item,rust,imports){
 if(rust)return '';const inputs=item.params.filter(parameter=>parameter.type==='standard-text-map-input');if(!inputs.length)return '';imports.add('borrowedStandardMapInput');return inputs.map(parameter=>'    __ro_borrowedStandardMapInput('+parameter.name+');').join('\n');
}
/** Consume only a complete prefix over actual parameter/import symbols. */
export function consumeBorrowedStandardMapReverseInputPrelude(analysis,declaration,params,resolveImport,statements){
 const {ts,checker}=analysis,inputs=params.filter(parameter=>parameter.type==='standard-text-map-input');if(!inputs.length||!statements.length)return statements;
 const first=statements[0],call=ts.isExpressionStatement(first)&&ts.isCallExpression(first.expression)?first.expression:null;
 if(!call||!ts.isIdentifier(call.expression))return statements;const selected=resolveImport(call.expression);if(selected.name!=='borrowedStandardMapInput'||selected.target!==analysis.runtimeRoot+'/borrowed-standard-map-20261103-input-runtime.mjs')return statements;
 for(let at=0;at<inputs.length;at++){
  const parameter=inputs[at],statement=statements[at],call=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||!ts.isIdentifier(call.expression)||!ts.isIdentifier(call.arguments[0])||call.arguments[0].text!==parameter.name)fail('complete native map input-shape prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===parameter.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(call.expression);
  if(!symbol||checker.getSymbolAtLocation(call.arguments[0])!==symbol||binding.typeOnly||binding.name!=='borrowedStandardMapInput'||binding.target!==analysis.runtimeRoot+'/borrowed-standard-map-20261103-input-runtime.mjs')fail('actual input-shape import and parameter symbol required');
 }return statements.slice(inputs.length);
}
