// Source proposals only; original JS/TS source/symbol/owner checks remain.
import {BORROWED_JSON_TOOL_PREDICATE as CONTRACT} from './borrowed-json-tool-20261103-contracts.mjs';
export function borrowedJsonToolReverseOperation(name){
 if(name!==CONTRACT.javascriptName)return null;return {id:CONTRACT.id,javascriptName:name,rustPath:CONTRACT.rustPath,parameters:['borrowed-json-tool-input'],returns:'bool',shared:[0],consumed:[],returnedLoan:false,containerEntryLimit:null,valueByteLimit:null,sourceAuthority:false,semanticAuthority:false};
}
export function borrowedJsonToolReverseRustCall(name,arguments_){
 if(name!==CONTRACT.javascriptName||!Array.isArray(arguments_)||arguments_.length!==1||typeof arguments_[0]!=='string'||!/^__ro_arg_[0-9]+$/u.test(arguments_[0]))throw TypeError('Original JSON predicate requires one already bound native operand');return CONTRACT.rustPath+'('+arguments_[0]+')';
}
/** A checked direct parameter root is already a once-evaluated operand. */
export function borrowedJsonToolReverseDirectRootCall(name,root){
 if(name!==CONTRACT.javascriptName||typeof root!=='string'||!/^[a-z][A-Za-z0-9_]*$/u.test(root))throw TypeError('Original JSON predicate direct native root required');return CONTRACT.rustPath+'('+root+')';
}
/** Body DATA validation after the actual private TS/native source traversal.
 * It cannot create an owned item or replace its original symbol/source proof. */
export function validateBorrowedJsonToolReverseBody(params,returns,body){
 if(!params.some(parameter=>parameter.type==='borrowed-json-tool-input'))return;
 const fail=message=>{throw TypeError('Original JSON reverse caller: '+message);};
 if(returns!=='bool'||params.some(parameter=>!['borrowed-json-tool-input','bool'].includes(parameter.type)))fail('only direct JSON/boolean inputs and boolean result admitted');const env=new Map(params.map(parameter=>[parameter.name,parameter.type]));let cells=100000;
 function expression(value,scope,borrow=false,depth=0){
  if(--cells<0||depth>160||!value||typeof value!=='object')fail('complete original body work bound');
  if(value.kind==='variable'){if(scope.get(value.name)!==value.type)fail('actual lexical variable domain differs');if(value.type==='borrowed-json-tool-input'&&(!borrow||!params.some(parameter=>parameter.name===value.name&&parameter.type===value.type)))fail('JSON must be a direct input root');return value.type;}
  if(value.kind==='bool'&&value.type==='bool'&&typeof value.value==='boolean')return 'bool';
  if(value.kind==='borrowed-json-tool-predicate'&&borrowedJsonToolReverseOperation(value.name)&&value.args.length===1&&value.type==='bool'&&expression(value.args[0],scope,true,depth+1)==='borrowed-json-tool-input')return 'bool';
  if(value.kind==='not'&&value.type==='bool'&&expression(value.value,scope,false,depth+1)==='bool')return 'bool';
  if(value.kind==='binary'&&value.type==='bool'&&['&&','||','===','!=='].includes(value.op)&&expression(value.left,scope,false,depth+1)==='bool'&&expression(value.right,scope,false,depth+1)==='bool')return 'bool';
  if(value.kind==='choose'&&value.type==='bool'&&expression(value.cond,scope,false,depth+1)==='bool'&&expression(value.then,new Map(scope),false,depth+1)==='bool'&&expression(value.else,new Map(scope),false,depth+1)==='bool')return 'bool';fail('operation/escape requires a separate complete theorem: '+value.kind);
 }
 function block(statements,scope,depth=0){
  if(depth>160||!Array.isArray(statements))fail('complete statement body required');for(const statement of statements){if(--cells<0)fail('complete original statement bound');if(statement.kind==='let'){if(scope.has(statement.name)||expression(statement.value,scope,false,depth+1)!=='bool')fail('only fresh immutable boolean locals admitted');scope.set(statement.name,'bool');}else if(statement.kind==='return'){if(expression(statement.value,scope,false,depth+1)!=='bool')fail('only boolean result admitted');}else if(statement.kind==='if'){if(expression(statement.cond,scope,false,depth+1)!=='bool')fail('boolean condition required');block(statement.then,new Map(scope),depth+1);block(statement.else,new Map(scope),depth+1);}else fail('unsupported original statement');}
 }block(body,env);
}
