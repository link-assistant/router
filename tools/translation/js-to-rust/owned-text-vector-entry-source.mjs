// Actual leading guard selection in the new parent's original source traversal.
import {requirePrimitiveVectorPublicEntryInput} from './primitive-vector-public-entry-inputs.mjs';
import {ownedTextVectorType,ownedTextVectorSharedType} from '../owned-text-vector-call-shape.mjs';
import {requireCurrentOwnedTextVectorOperationSource} from '../current-owned-text-vector-source.mjs';
import {ownedTextVectorSourceConfiguration} from './owned-text-vector-call-source.mjs';
export function requireOwnedTextVectorEntryInput(declaration,parameter,type,helpers){
 if(!ownedTextVectorType(type)&&!ownedTextVectorSharedType(type)&&type!=='text-owned-list-ref')return requirePrimitiveVectorPublicEntryInput(declaration,parameter,type,helpers);
 const {ts,file,checker,data,resolveImport,fail}=helpers;if(!ts.isIdentifier(parameter.name)||!declaration.body||!ts.isBlock(declaration.body))fail('actual bounded owned text entry body required');const symbol=checker.getSymbolAtLocation(parameter.name),names=new Set(declaration.parameters.filter(value=>ts.isIdentifier(value.name)).map(value=>value.name.text));if(!symbol)fail('actual input symbol required');
 const operation=ownedTextVectorType(type)?'truncate':ownedTextVectorSharedType(type)?'len':'from_slice';
 for(const statement of declaration.body.statements.slice(0,declaration.parameters.length)){
  if(!ts.isVariableStatement(statement)||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||statement.declarationList.declarations.length!==1)break;const local=statement.declarationList.declarations[0],call=local.initializer;
  if(!ts.isIdentifier(local.name)||names.has(local.name.text)||local.type||local.exclamationToken||!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||!ts.isIdentifier(call.expression)||!ts.isIdentifier(call.arguments[0]))break;
  const binding=resolveImport(call.expression);if(binding.typeOnly||binding.target!==data.runtimeRoot+'/owned-text-vector-runtime.mjs')break;
  const row=requireCurrentOwnedTextVectorOperationSource(new Map(data.files.map(value=>[value.path,value.source])),ownedTextVectorSourceConfiguration(data),binding.name);
  if(!['truncate','len','from_slice'].includes(row.operation))break;if(row.operation==='truncate'?call.arguments.length!==2||!ts.isBigIntLiteral(call.arguments[1])||call.arguments[1].getText(file)!=='18446744073709551615n':call.arguments.length!==1)break;
  if(checker.getSymbolAtLocation(call.arguments[0])===symbol){if(row.operation!==operation||row.parameters[0]!==type)fail('exact actual String vector/slice entry guard required');return;}
 }fail('owned text inputs require leading const truncate(input, u64::MAX), shared len(input), or slice from_slice(input)');
}
