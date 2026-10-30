// Shared source-only input control, emission and evaluator adapters. Public
// role records never grant native/source/ownership permission on their own.
export const OWNED_BASE64_RESULT_RUST_TYPE='::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error>';
export const hasOwnedBase64Input=program=>program.some(item=>item.params.some(param=>param.type==='base64-result'));
export function readOwnedBase64ResultImportType(ts,type,target,runtimeRoot){
 if(!ts.isImportTypeNode(type)||type.isTypeOf||!ts.isLiteralTypeNode(type.argument)||!ts.isStringLiteral(type.argument.literal)||!type.qualifier||!ts.isIdentifier(type.qualifier)||type.qualifier.text!=='Base64Result'||type.typeArguments?.length||type.attributes)return null;
 if(target(type.argument.literal.text)!==runtimeRoot+'/base64-runtime.mjs')throw new TypeError('Base64 Result type requires its actual registered runtime edge');return 'base64-result';
}
export function consumeOwnedBase64InputPrelude(analysis,declaration,params,resolveImport){
 const {ts,checker}=analysis,body=declaration.body.statements,inputs=params.filter(param=>param.type==='base64-result');if(!inputs.length||!body.length)return body;
 const first=body[0];if(!ts.isExpressionStatement(first)||!ts.isBinaryExpression(first.expression)||first.expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken)return body;
 const firstLeft=first.expression.left;if(!ts.isIdentifier(firstLeft)||!inputs.some(param=>param.name===firstLeft.text))return body;
 for(let at=0;at<inputs.length;at++){
  const param=inputs[at],statement=body[at],expression=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!expression||!ts.isBinaryExpression(expression)||expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(expression.left)||expression.left.text!==param.name||!ts.isCallExpression(expression.right)||expression.right.questionDotToken||expression.right.typeArguments?.length||expression.right.arguments.length!==1||!ts.isIdentifier(expression.right.arguments[0])||expression.right.arguments[0].text!==param.name)throw new TypeError('Complete canonical Base64 Result input prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(expression.right.expression);
  if(!symbol||checker.getSymbolAtLocation(expression.left)!==symbol||checker.getSymbolAtLocation(expression.right.arguments[0])!==symbol||binding.typeOnly||binding.name!=='base64ResultInput'||binding.target!==analysis.runtimeRoot+'/base64-runtime.mjs')throw new TypeError('Base64 Result input prefix requires its original parameter and actual native runtime binding');
 }
 return body.slice(inputs.length);
}
export function ownedBase64InputPrelude(item,rust){
 return item.params.filter(param=>param.type==='base64-result').map(param=>rust?'    if let ::std::result::Result::Ok(__ro_base64_input) = &'+param.rust+' { assert!(__ro_base64_input.len() <= 1048576, "owned reverse base64 result input bound"); }':'    '+param.name+' = __ro_base64ResultInput('+param.name+');').join('\n');
}
export function ownedBase64InputEnvironment(params,args,modules){
 return new Map(params.map((param,index)=>{if(param.type!=='base64-result')return [param.name,args[index]];if(typeof modules.base64?.base64ResultInput!=='function')throw new TypeError('Actual prepared Base64 Result input runtime required');return [param.name,modules.base64.base64ResultInput(args[index])];}));
}
