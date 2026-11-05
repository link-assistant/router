// Input control for the additive fixed-width slice domain. DATA is not authority.
import {ownedPrimitiveSliceElement} from './owned-wide-primitive-slice-contracts.mjs';
const fail=message=>{throw new TypeError('Wide primitive slice input: '+message);};
export const widePrimitiveSliceElement=type=>{const element=ownedPrimitiveSliceElement(type);return element&&!['bool','u64','i64'].includes(element)?element:null;};
export const hasWidePrimitiveSliceInput=program=>program.some(item=>item.params.some(param=>widePrimitiveSliceElement(param.type)));
export function widePrimitiveSliceInputPrelude(item,rust){return rust?'':item.params.filter(param=>widePrimitiveSliceElement(param.type)).map(param=>'    '+param.name+' = __ro_primitiveSliceInput('+param.name+', '+JSON.stringify(widePrimitiveSliceElement(param.type))+');').join('\n');}
export function consumeWidePrimitiveSliceInputPrelude(analysis,declaration,params,resolveImport,statements){
 const {ts,checker}=analysis,inputs=params.filter(param=>widePrimitiveSliceElement(param.type));if(!inputs.length)return statements;if(!statements.length)fail('written immutable slice input contract required before translation');
 const first=statements[0],candidate=ts.isExpressionStatement(first)&&ts.isBinaryExpression(first.expression)?first.expression:null;if(!candidate||candidate.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(candidate.left)||!inputs.some(param=>param.name===candidate.left.text))fail('written immutable slice input contract required before translation');
 for(let at=0;at<inputs.length;at++){
  const param=inputs[at],statement=statements[at],expression=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!expression||!ts.isBinaryExpression(expression)||expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(expression.left)||expression.left.text!==param.name||!ts.isCallExpression(expression.right)||expression.right.questionDotToken||expression.right.typeArguments?.length||expression.right.arguments.length!==2||!ts.isIdentifier(expression.right.arguments[0])||expression.right.arguments[0].text!==param.name||!ts.isStringLiteral(expression.right.arguments[1])||expression.right.arguments[1].text!==widePrimitiveSliceElement(param.type))fail('complete canonical domain-exact input prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===param.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(expression.right.expression);
  if(!symbol||checker.getSymbolAtLocation(expression.left)!==symbol||checker.getSymbolAtLocation(expression.right.arguments[0])!==symbol||binding.typeOnly||binding.name!=='primitiveSliceInput'||binding.target!==analysis.runtimeRoot+'/primitive-operator-runtime.mjs')fail('actual original parameter and checked runtime binding required');
 }
 return statements.slice(inputs.length);
}
export function applyWidePrimitiveSliceInputs(params,environment,modules){
 for(const param of params){const element=widePrimitiveSliceElement(param.type);if(!element)continue;if(typeof modules.primitive?.primitiveSliceInput!=='function')fail('actual complete prepared primitive runtime required');environment.set(param.name,modules.primitive.primitiveSliceInput(environment.get(param.name),element));}return environment;
}
