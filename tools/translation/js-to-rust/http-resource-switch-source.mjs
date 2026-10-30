// Actual native clause observations only. Whole checked flows supply domains.
const fail=message=>{throw new TypeError('Resource original switch source: '+message);};
export function observeHttpResourceSwitchSource(ts,node,tick){
 const clauses=node.caseBlock.clauses;if(!clauses.length||clauses.length>256||!ts.isDefaultClause(clauses.at(-1))||clauses.filter(clause=>ts.isDefaultClause(clause)).length!==1)fail('bounded original switch clauses with one final default required');
 let value=node.expression,depth=0;while(ts.isParenthesizedExpression(value)||ts.isAsExpression(value)||ts.isTypeAssertionExpression(value)||ts.isSatisfiesExpression(value)||ts.isNonNullExpression(value)){tick();if(++depth>160)fail('complete original switch selector depth bound');value=value.expression;}
 if(!ts.isIdentifier(value)&&!ts.isStringLiteral(value)&&!ts.isBigIntLiteral(value)&&value.kind!==ts.SyntaxKind.TrueKeyword&&value.kind!==ts.SyntaxKind.FalseKeyword&&!(ts.isPrefixUnaryExpression(value)&&value.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(value.operand)))fail('switch selector must be an actual stable scalar binding or original literal');
 const groups=[],names=new Set();let labels=[];
 function binding(node,level=0){tick();if(level>160)fail('complete original switch binding depth bound');if(ts.isIdentifier(node)){if(names.has(node.text))fail('every original switch lexical binding must be unique across its complete case block');names.add(node.text);return;}if(ts.isArrayBindingPattern(node)||ts.isObjectBindingPattern(node)){for(const element of node.elements)if(ts.isBindingElement(element))binding(element.name,level+1);return;}fail('actual original switch lexical binding required');}
 for(const clause of clauses){tick();if(clause.statements.length>4096)fail('complete original switch body statement bound');const statements=clause.statements.filter(statement=>{if(!ts.isEmptyStatement(statement))return true;tick();return false;});if(ts.isCaseClause(clause))labels.push(clause.expression);else if(!ts.isDefaultClause(clause))fail('original native case/default clause required');for(const statement of statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)binding(declaration.name);
  if(statements.length){groups.push({labels,statements,default:ts.isDefaultClause(clause)});labels=[];}
 }
 if(labels.length||!groups.length||!groups.at(-1).default)fail('complete original switch default body required');return {groups,sourceAuthority:false,semanticAuthority:false};
}
export function joinHttpResourceSwitchConditions(conditions,tick){
 if(!conditions.length||conditions.length>256)fail('complete bounded original case conditions required');function join(start,end,depth=0){tick();if(depth>64)fail('complete original case condition depth bound');if(end-start===1)return conditions[start];const middle=start+Math.floor((end-start)/2);return {kind:'or',left:join(start,middle,depth+1),right:join(middle,end,depth+1),type:'bool'};}return join(0,conditions.length);
}
