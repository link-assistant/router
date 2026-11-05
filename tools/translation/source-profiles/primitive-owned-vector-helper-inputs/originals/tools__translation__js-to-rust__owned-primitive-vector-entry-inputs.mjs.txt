// Entry-prefix checking inside the original complete caller issuer only.
// Scope spelling, parameter metadata and this DATA helper confer no permission.
import {ownedPrimitiveVectorElement} from '../primitive-owned-vector-call-shape.mjs';
import {requireCurrentPrimitiveOwnedVectorOperationSource} from '../current-primitive-owned-vector-source.mjs';
export function requireOwnedPrimitiveVectorEntryInput(declaration,parameter,type,{ts,file,checker,data,resolveImport,fail}){
 const domain=ownedPrimitiveVectorElement(type);if(!domain||!ts.isIdentifier(parameter.name)||!declaration.body||!ts.isBlock(declaration.body))fail('owned vector public parameters require their actual bounded entry prefix');const symbol=checker.getSymbolAtLocation(parameter.name),names=new Set(declaration.parameters.filter(row=>ts.isIdentifier(row.name)).map(row=>row.name.text));if(!symbol)fail('owned vector public parameters need their actual original binding');
 for(const statement of declaration.body.statements.slice(0,declaration.parameters.length)){
  if(!ts.isVariableStatement(statement)||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||statement.declarationList.declarations.length!==1)break;const local=statement.declarationList.declarations[0],call=local.initializer;if(!ts.isIdentifier(local.name)||names.has(local.name.text)||local.type||local.exclamationToken||!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==2||!ts.isIdentifier(call.expression)||!ts.isIdentifier(call.arguments[0])||!ts.isBigIntLiteral(call.arguments[1])||call.arguments[1].getText(file)!=='18446744073709551615n')break;
  const binding=resolveImport(call.expression),match=/^router_vec_(bool|[ui](?:8|16|32|64|128))_truncate$/u.exec(binding.name);if(binding.typeOnly||binding.target!==data.runtimeRoot+'/primitive-owned-vector-runtime.mjs'||!match||match[0]!==binding.name)break;const row=requireCurrentPrimitiveOwnedVectorOperationSource(new Map(data.files.map(row=>[row.path,row.source])),data,binding.name);if(row.operation!=='truncate'||row.parameters[0]!=='vec:'+match[1]||row.parameters[1]!=='u64'||row.maxValues!==4096)fail('actual entry guard ABI/source differs');
  if(checker.getSymbolAtLocation(call.arguments[0])===symbol){if(match[1]!==domain)fail('owned vector public parameters need their exact primitive guard domain');return;}
 }
 fail('owned vector public parameters require an actual leading const owned result of their paired truncate(input, u64::MAX)');
}
