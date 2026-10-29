// Boundary adapters. Actual source symbols and the fresh native ABI are checked
// by the private source traversal before these DATA operations are selected.
const fail=message=>{throw new TypeError('Owned reverse JSON vector boundary: '+message);};
const isJson=type=>type==='json'||type==='json-ref';
export const isJsonVector=item=>['json-vector','json-value','json-scalar','primitive-scalar'].includes(item.vectorOrigin?.kind);
const scalarGuard=param=>vectorParameterPrelude({vectorOrigin:true,params:[param]},false).trimStart();
const booleanGuard=name=>'if (typeof '+name+' !== "boolean") throw new TypeError("Owned vector argument differs from actual original scalar domain");';
export function jsonVectorInputPrelude(item,rust,imports,{nativeJsonSource=false}={}){
 if(!isJsonVector(item))return '';
 return item.params.map((param,index)=>{
  if(isJson(param.type)){if(!rust)imports.add('router_core_json_copy');return rust?(nativeJsonSource?'    let __ro_json_guard_'+index+' = crate::translation_json_core::json_validate('+(param.type==='json'?'&':'')+param.rust+');':'    __ro_domain(&'+param.rust+');'):'    '+param.name+' = __ro_router_core_json_copy('+param.name+');';}
  if(param.type==='str')return rust?'':'    __ro_vectorTextInput('+param.name+');';
  if(param.type!=='bool'&&!primitiveBitwiseType(param.type))fail('unregistered original input');return rust?'':'    '+scalarGuard(param);
 }).filter(Boolean).join('\n');
}
export function validateJsonVectorInputs(item,scope,modules){
 if(!isJsonVector(item))return;
 for(const param of item.params){const value=scope.get(param.name);if(isJson(param.type))scope.set(param.name,modules.update.router_core_json_copy(value));else if(param.type==='str'){requireScalarString(value);}else if(param.type==='bool'){if(typeof value!=='boolean')fail('actual bool input required');}else if(primitiveBitwiseType(param.type)){const bounds=vectorScalarBounds(param.type);if(typeof value!=='bigint'||value<bounds.minimum||value>bounds.maximum)fail('actual bounded integer input required');}else fail('unregistered actual JSON-vector input');}
}
export function consumeJsonVectorInputPrelude(analysis,declaration,params,resolveImport,profile){
 const {ts,checker,file}=analysis,body=declaration.body.statements;if(!['json-vector','json-value','json-scalar','primitive-scalar'].includes(profile?.kind)||!params.length||!body.length)return body;
 const assignment=(statement,param)=>{
  const expr=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!expr||!ts.isBinaryExpression(expr)||expr.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(expr.left)||expr.left.text!==param.name||!ts.isCallExpression(expr.right)||expr.right.questionDotToken||expr.right.typeArguments?.length||expr.right.arguments.length!==1||!ts.isIdentifier(expr.right.arguments[0])||expr.right.arguments[0].text!==param.name)return false;
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(expr.right.expression);
  return !!symbol&&checker.getSymbolAtLocation(expr.left)===symbol&&checker.getSymbolAtLocation(expr.right.arguments[0])===symbol&&!binding.typeOnly&&binding.name==='router_core_json_copy'&&binding.target===analysis.runtimeRoot+'/json-update-runtime.mjs';
 };
 const scalar=(statement,param)=>{
  if(!statement||statement.getText(file)!==scalarGuard(param)||!ts.isIfStatement(statement))return false;
  const condition=statement.expression,original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),operands=[];let foreign=false;const visit=node=>{if(ts.isIdentifier(node)){if(node.text!==param.name)foreign=true;else operands.push(checker.getSymbolAtLocation(node));}ts.forEachChild(node,visit);};visit(condition);
  const branch=statement.thenStatement,call=ts.isThrowStatement(branch)?branch.expression:null,constructor=call&&ts.isNewExpression(call)?call.expression:null,builtin=constructor&&checker.getSymbolAtLocation(constructor);
  return !!symbol&&!foreign&&operands.length>0&&operands.every(value=>value===symbol)&&constructor&&ts.isIdentifier(constructor)&&constructor.text==='TypeError'&&(!builtin||!!builtin.declarations?.length&&builtin.declarations.every(row=>row.getSourceFile().isDeclarationFile&&/[/\\]lib\.[^/\\]+\.d\.ts$/u.test(row.getSourceFile().fileName)));
 };
 const text=(statement,param)=>{const value=statement&&ts.isExpressionStatement(statement)?statement.expression:null;if(!value||!ts.isCallExpression(value)||value.questionDotToken||value.typeArguments?.length||value.arguments.length!==1||!ts.isIdentifier(value.arguments[0])||value.arguments[0].text!==param.name)return false;const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(value.expression);return !!symbol&&checker.getSymbolAtLocation(value.arguments[0])===symbol&&!binding.typeOnly&&binding.name==='requireScalarString'&&binding.target===analysis.runtimeRoot+'/string-iterator-runtime.mjs'&&binding.links.length===2&&binding.links[0].path===analysis.runtimeRoot+'/owned-vector-text-runtime.mjs'&&binding.links[0].name==='vectorTextInput';};
 const prefix=(statement,param)=>isJson(param.type)?assignment(statement,param):param.type==='str'?text(statement,param):scalar(statement,param);
 const first=params[0],starts=prefix(body[0],first);if(!starts)return body;
 for(let i=0;i<params.length;i++)if(!prefix(body[i],params[i]))fail('complete canonical original-symbol input prefix required');
 return body.slice(params.length);
}

import {vectorScalarBounds,vectorParameterPrelude} from './owned-vector-parameter-values.mjs';

import {requireScalarString} from '../extensions/string-iterator-runtime.mjs';

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
