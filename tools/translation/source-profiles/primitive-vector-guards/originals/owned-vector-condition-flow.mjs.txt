// Closed original AST branch selection. Every returned leaf still passes the
// existing scalar constructor; this helper grants no source/type authority.
import {readOwnedVectorScalarConstruction} from './owned-vector-scalar-construction.mjs';
export function readOwnedVectorConditionFlow(options){
 const {ts,checker,inputs=[],readLiteral,makeReturn}=options;
 const fail=message=>{throw new TypeError('Owned reverse vector condition: '+message);};
 let work=0,leaves=0;const charge=()=>{if(++work>20000)fail('source work bound');};
 const unwrap=node=>{let depth=0;while(ts.isParenthesizedExpression(node)){if(++depth>64)fail('grouping depth bound');node=node.expression;}return node;};
 const parameters=new Map(inputs);
 function condition(node,aliases,active=new Set(),depth=0){
  charge();if(depth>64)fail('condition depth bound');node=unwrap(node);
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool',root:null};
  if(ts.isIdentifier(node)){
   const symbol=checker.getSymbolAtLocation(node),parameter=parameters.get(symbol);
   if(parameter){if(parameter.value.type!=='bool'||symbol.declarations?.length!==1||symbol.declarations[0]!==parameter.declaration)fail('condition requires its actual native bool parameter');return {...parameter.value,kind:'vector-condition-input',root:null};}
   const declaration=aliases.get(symbol);if(!symbol||!declaration||symbol.declarations?.length!==1||symbol.declarations[0]!==declaration||active.has(symbol))fail('condition alias lacks a unique available original declaration');active.add(symbol);try{return condition(declaration.initializer,aliases,active,depth+1);}finally{active.delete(symbol);}
  }
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return {kind:'not',value:condition(node.operand,aliases,active,depth+1),type:'bool',root:null};
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind))return {kind:'binary',op:node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'&&':'||',left:condition(node.left,aliases,active,depth+1),right:condition(node.right,aliases,active,depth+1),type:'bool',root:null};
  fail('only actual bool source values and short-circuit logical conditions are qualified');
 }
 function statements(rows,prefix=[],depth=0){
  charge();if(depth>8||prefix.length+rows.length>65||!rows.length)fail('bounded complete branch source required');
  const last=rows[rows.length-1];
  if(!ts.isIfStatement(last)){if(++leaves>64)fail('branch leaf bound');const items=readOwnedVectorScalarConstruction({...options,statements:[...prefix,...rows],readLiteral});work+=items.length+prefix.length+rows.length;if(work>20000)fail('complete branch work bound');return [{kind:'return',value:makeReturn(items)}];}
  const preceding=[...prefix,...rows.slice(0,-1)],aliases=new Map();
  for(const row of preceding){if(!ts.isVariableStatement(row)||row.modifiers?.length||row.declarationList.flags!==ts.NodeFlags.Const||row.declarationList.declarations.length!==1)fail('only immutable scalar prefixes before branches are qualified');const declaration=row.declarationList.declarations[0];if(!ts.isIdentifier(declaration.name)||!declaration.initializer)fail('plain scalar prefix required');const symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||aliases.has(symbol))fail('unique actual prefix symbol required');aliases.set(symbol,declaration);}
  if(!ts.isBlock(last.thenStatement)||!last.elseStatement||!ts.isBlock(last.elseStatement)&&!ts.isIfStatement(last.elseStatement))fail('complete block branches and final else required');
  return [{kind:'if',cond:condition(last.expression,aliases),then:statements(last.thenStatement.statements,preceding,depth+1),else:statements(ts.isBlock(last.elseStatement)?last.elseStatement.statements:[last.elseStatement],preceding,depth+1)}];
 }
 return statements(options.statements);
}
