// Boundary adapters. Actual source symbols and the fresh native ABI are checked
// by the private source traversal before these DATA operations are selected.
const fail=message=>{throw new TypeError('Owned reverse JSON vector boundary: '+message);};
const isJson=type=>type==='json'||type==='json-ref';
export const isJsonVector=item=>item.vectorOrigin?.kind==='json-vector';
const booleanGuard=name=>'if (typeof '+name+' !== "boolean") throw new TypeError("Owned vector argument differs from actual original scalar domain");';
export function jsonVectorInputPrelude(item,rust,imports){
 if(!isJsonVector(item))return '';
 return item.params.map(param=>{
  if(isJson(param.type)){if(!rust)imports.add('router_core_json_copy');return rust?'    __ro_domain(&'+param.rust+');':'    '+param.name+' = __ro_router_core_json_copy('+param.name+');';}
  if(param.type!=='bool')fail('unregistered original input');return rust?'':'    '+booleanGuard(param.name);
 }).filter(Boolean).join('\n');
}
export function validateJsonVectorInputs(item,scope,modules){
 if(!isJsonVector(item))return;
 for(const param of item.params){const value=scope.get(param.name);if(isJson(param.type))scope.set(param.name,modules.update.router_core_json_copy(value));else if(param.type!=='bool'||typeof value!=='boolean')fail('actual bool input required');}
}
export function consumeJsonVectorInputPrelude(analysis,declaration,params,resolveImport,profile){
 const {ts,checker,file}=analysis,body=declaration.body.statements;if(profile?.kind!=='json-vector'||!params.length||!body.length)return body;
 const assignment=(statement,param)=>{
  const expr=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!expr||!ts.isBinaryExpression(expr)||expr.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(expr.left)||expr.left.text!==param.name||!ts.isCallExpression(expr.right)||expr.right.questionDotToken||expr.right.typeArguments?.length||expr.right.arguments.length!==1||!ts.isIdentifier(expr.right.arguments[0])||expr.right.arguments[0].text!==param.name)return false;
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(expr.right.expression);
  return !!symbol&&checker.getSymbolAtLocation(expr.left)===symbol&&checker.getSymbolAtLocation(expr.right.arguments[0])===symbol&&!binding.typeOnly&&binding.name==='router_core_json_copy'&&binding.target===analysis.runtimeRoot+'/json-update-runtime.mjs';
 };
 const bool=(statement,param)=>{
  if(!statement||statement.getText(file)!==booleanGuard(param.name)||!ts.isIfStatement(statement))return false;
  const condition=statement.expression,operand=ts.isBinaryExpression(condition)&&ts.isTypeOfExpression(condition.left)?condition.left.expression:null,original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name);
  const branch=statement.thenStatement,call=ts.isThrowStatement(branch)?branch.expression:null,constructor=call&&ts.isNewExpression(call)?call.expression:null,builtin=constructor&&checker.getSymbolAtLocation(constructor);
  return !!symbol&&operand&&ts.isIdentifier(operand)&&checker.getSymbolAtLocation(operand)===symbol&&constructor&&ts.isIdentifier(constructor)&&constructor.text==='TypeError'&&(!builtin||!!builtin.declarations?.length&&builtin.declarations.every(row=>row.getSourceFile().isDeclarationFile&&/[/\\]lib\.[^/\\]+\.d\.ts$/u.test(row.getSourceFile().fileName)));
 };
 const first=params[0],starts=isJson(first.type)?assignment(body[0],first):bool(body[0],first);if(!starts)return body;
 for(let i=0;i<params.length;i++)if(!(isJson(params[i].type)?assignment(body[i],params[i]):bool(body[i],params[i])))fail('complete canonical original-symbol input prefix required');
 return body.slice(params.length);
}
