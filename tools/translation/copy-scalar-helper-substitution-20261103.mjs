// Pure substitution DATA. Private original source/type/body checking is required
// before this runs; this module cannot issue a checked/executable item.
import {createRulePipeline} from './rule-pipeline.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {narrowOwnedNumericLiteral} from './js-to-rust/owned-numeric-literals.mjs';
const fail=message=>{throw TypeError('Copy scalar helper substitution: '+message);};
const scalar=role=>role==='bool'||primitiveBitwiseType(role)!==null;
function inert(value,role){
 if(!value||value.root!==null||value.type!==role||!scalar(role))fail('identical checked root-free scalar operand required');
 if(value.kind==='variable'&&typeof value.name==='string')return {...value};
 if(value.kind==='bool'&&role==='bool'&&typeof value.value==='boolean')return {...value};
 if(value.kind==='integer'&&primitiveBitwiseType(role)){const result={...value};narrowOwnedNumericLiteral(result,role);if(BigInt(result.value).toString()!==result.value)fail('canonical native integer value required');return result;}
 fail('only inert actual lexical operands and scalar literals are supported');
}
export function substituteCopyScalarHelperExpression20261103(helper,args,charge){
 if(!scalar(helper.returns)||helper.params.some(row=>!scalar(row.type))||helper.body.length!==1||helper.hostCalls.length||helper.sourceCalls?.length||args.length!==helper.params.length)fail('whole pure scalar helper and exact arity required');
 const values=new Map(helper.params.map((row,at)=>[row.name,inert(args[at],row.type)]));let cells=0;
 function expression(row,depth=0){
  if(++cells>100000||depth>160)fail('original complete expression work bound');charge(depth);
  if(!row||row.root!==null||!scalar(row.type))fail('root-free original Copy scalar expression required');
  if(row.kind==='variable'){const value=values.get(row.name);if(!value)fail('captures and local bindings need separate rules');return inert(value,row.type);}
  if(row.kind==='bool'||row.kind==='integer')return inert(row,row.type);
  if(row.kind==='not'){
   const value=expression(row.value,depth+1);if(value.type!=='bool'||row.type!=='bool')fail('Boolean negation domains differ');return {...row,value};
  }
  if(row.kind==='choose'){
   const cond=expression(row.cond,depth+1),yes=expression(row.then,depth+1),no=expression(row.else,depth+1);
   if(cond.type!=='bool'||yes.type!==row.type||no.type!==row.type)fail('actual choice domains differ');return {...row,cond,then:yes,else:no};
  }
  if(row.kind==='binary'){
   const left=expression(row.left,depth+1),right=expression(row.right,depth+1);
   if(row.type!=='bool'||left.type!==right.type)fail('comparison/logical domains differ');
   if(['&&','||'].includes(row.op)){if(left.type!=='bool')fail('logical operators require Boolean inputs');}
   else if(['<','<=','>','>='].includes(row.op)){if(!primitiveBitwiseType(left.type))fail('ordered comparison requires a fixed integer');}
   else if(!['===','!=='].includes(row.op))fail('arithmetic, bitwise and effect operations need separate rules');
   return {...row,left,right};
  }
  fail('unsupported effect, ownership or operation in helper');
 }
 function returned(body,depth=0){
  if(++cells>100000||depth>160)fail('original complete expression work bound');charge(depth);
  if(!Array.isArray(body)||body.length!==1)fail('each complete helper branch must contain only its return tree');
  const statement=body[0];if(statement.kind==='return')return expression(statement.value,depth+1);
  if(statement.kind==='if'){
   const cond=expression(statement.cond,depth+1),yes=returned(statement.then,depth+1),no=returned(statement.else,depth+1);
   if(cond.type!=='bool'||yes.type!==helper.returns||no.type!==helper.returns)fail('whole return-tree domains differ');
   return {kind:'choose',cond,then:yes,else:no,type:helper.returns,root:null};
  }
  fail('helper statements with effects or locals require separate rules');
 }
 return createRulePipeline([
  {phase:'language',rules:[{id:'language:substitute-checked-Copy-scalar-helper-operands',apply:()=>{const result=returned(helper.body);if(result.type!==helper.returns)fail('whole helper result differs');return result;}}]},
  {phase:'repository',rules:[{id:'repository:preserve-original-expression-shape-and-caller-binding-names',apply:value=>value}]},
 ]).run(null).value;
}
