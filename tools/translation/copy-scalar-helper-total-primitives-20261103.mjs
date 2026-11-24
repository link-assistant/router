// Pure checked-IR normalization DATA. Only the original native reader may
// establish actual import/type/body/provenance facts before calling this rule.
import {createRulePipeline} from './rule-pipeline.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {ownedPrimitiveOperatorCallMetadata} from './js-to-rust/owned-primitive-operator-emission.mjs';
import {narrowOwnedNumericLiteral} from './js-to-rust/owned-numeric-literals.mjs';
import {substituteCopyScalarHelperArguments20261103} from './copy-scalar-helper-argument-substitution-20261103.mjs';
const fail=message=>{throw TypeError('Total scalar helper: '+message);};
const scalar=type=>type==='bool'||primitiveBitwiseType(type)!==null;
const kinds=new Set(['primitive-bitwise-call','primitive-not-call','primitive-cast-call','primitive-method-call']);
const methods=new Set(['wrapping_add','wrapping_sub','wrapping_mul','saturating_add','saturating_sub','saturating_mul','min','max']);
const names=new Set(['primitiveBitwise','primitiveNot','integerCast','primitiveIntegerMethod']);
function containsPrimitive(value){
 const pending=[{value,depth:0}];let cells=0;
 while(pending.length){const {value,depth}=pending.pop();if(++cells>100000||depth>160)fail('original complete helper work bound');if(value&&typeof value==='object'){if(kinds.has(value.kind))return true;for(const child of Object.values(value))if(child&&typeof child==='object')pending.push({value:child,depth:depth+1});}}
 return false;
}
function primitive(row,args){
 if(row.kind==='primitive-bitwise-call'){
  if(row.name!=='primitiveBitwise'||!['&','|','^'].includes(row.operation)||args.length!==2||args.some(arg=>arg.type!==row.type))fail('actual eager bitwise domains differ');
  const domain=primitiveBitwiseType(row.type);
  if(domain?row.bits!==domain.bits||row.signed!==domain.signed:row.type!=='bool'||row.bits!==undefined||row.signed!==undefined)fail('actual bitwise metadata differs');
 }else{
  const checked={...row,args};ownedPrimitiveOperatorCallMetadata(checked);
  if(row.kind==='primitive-method-call'&&!methods.has(row.operation))fail('potentially failing method requires ordered statement rules');
  if(!['primitive-not-call','primitive-cast-call','primitive-method-call'].includes(row.kind))fail('potentially failing operation requires separate rules');
 }
 return {...row,args};
}
export function substituteCopyScalarHelperTotalPrimitives20261103(helper,args,charge){
 // Every old family, error and callback-work sequence stays on its old path.
 if(!containsPrimitive(helper.body)&&!containsPrimitive(args))return substituteCopyScalarHelperArguments20261103(helper,args,charge);
 if(!scalar(helper.returns)||helper.params.some(param=>!scalar(param.type))||args.length!==helper.params.length||helper.sourceCalls?.length)fail('complete scalar signature and original exact arity required');
 let cells=0;const tick=depth=>{if(++cells>100000||depth>160)fail('original complete expanded helper work bound');charge(depth);};
 const calls=new Map();
 function expression(row,scope,depth=0,lookup=true,record=false){
  tick(depth);if(!row||row.root!==null||!scalar(row.type))fail('actual root-free scalar expression required');
  if(row.kind==='variable'){
   if(typeof row.name!=='string')fail('actual lexical scalar name required');
   if(!lookup)return {...row};const value=scope.get(row.name);if(!value||value.type!==row.type)fail('capture, forward reference or mismatched local');
   // Resolved terms belong to the caller namespace: never look their names up
   // again as helper parameters/locals and never count their receipts twice.
   return expression(value,null,depth+1,false,false);
  }
  if(row.kind==='bool'){if(row.type!=='bool'||typeof row.value!=='boolean')fail('actual Boolean literal required');return {...row};}
  if(row.kind==='integer'){if(!primitiveBitwiseType(row.type))fail('actual native integer domain required');const value={...row};narrowOwnedNumericLiteral(value,row.type);if(BigInt(value.value).toString()!==value.value)fail('canonical native literal required');return value;}
  if(row.kind==='not'){const value=expression(row.value,scope,depth+1,lookup,record);if(row.type!=='bool'||value.type!=='bool')fail('Boolean negation domain differs');return {...row,value};}
  if(row.kind==='choose'){
   const cond=expression(row.cond,scope,depth+1,lookup,record),yes=expression(row.then,scope,depth+1,lookup,record),no=expression(row.else,scope,depth+1,lookup,record);if(cond.type!=='bool'||yes.type!==row.type||no.type!==row.type)fail('actual conditional domains differ');return {...row,cond,then:yes,else:no};
  }
  if(row.kind==='binary'){
   const left=expression(row.left,scope,depth+1,lookup,record),right=expression(row.right,scope,depth+1,lookup,record);if(row.type!=='bool'||left.type!==right.type)fail('actual comparison domains differ');
   if(['&&','||'].includes(row.op)){if(left.type!=='bool')fail('actual logical operands required');}else if(['<','<=','>','>='].includes(row.op)){if(!primitiveBitwiseType(left.type))fail('actual ordered operands required');}else if(!['===','!=='].includes(row.op))fail('arithmetic needs ordered statement rules');return {...row,left,right};
  }
  if(kinds.has(row.kind)){
   if(!Array.isArray(row.args))fail('complete original operation operands required');const args=row.args.map(arg=>expression(arg,scope,depth+1,lookup,record)),value=primitive(row,args);if(record)calls.set(row.name,(calls.get(row.name)??0)+1);return value;
  }
  fail('ownership, arbitrary calls or potentially failing operations require separate rules');
 }
 function block(body,parent,depth=0){
  tick(depth);if(!Array.isArray(body)||!body.length)fail('complete returning scalar helper block required');const scope=new Map(parent);
  for(let at=0;at<body.length;at++){
   tick(depth+1);const statement=body[at];
   if(statement.kind==='let'){if(typeof statement.name!=='string'||scope.has(statement.name))fail('duplicate or shadowed scalar local');scope.set(statement.name,expression(statement.value,scope,depth+1,true,true));continue;}
   if(at!==body.length-1)fail('statements after complete return tree');
   if(statement.kind==='return')return expression(statement.value,scope,depth+1,true,true);
   if(statement.kind==='if'){const cond=expression(statement.cond,scope,depth+1,true,true),yes=block(statement.then,scope,depth+1),no=block(statement.else,scope,depth+1);if(cond.type!=='bool'||yes.type!==helper.returns||no.type!==helper.returns)fail('whole return tree domains differ');return {kind:'choose',cond,then:yes,else:no,type:helper.returns,root:null};}
   fail('assignment, loops or partial return need ordered statement rules');
  }
  fail('helper has no complete return');
 }
 return createRulePipeline([
  {phase:'language',rules:[
   {id:'language:check-all-eager-total-operands-and-bind-original-parameters',apply:()=>{const scope=new Map();helper.params.forEach((param,at)=>{const value=expression(args[at],null,0,false,false);if(scope.has(param.name)||value.type!==param.type)fail('unique original parameter and operand type required');scope.set(param.name,value);});return scope;}},
   {id:'language:normalize-complete-total-helper-with-separate-branch-scopes',apply:scope=>{const value=block(helper.body,scope);if(value.type!==helper.returns)fail('actual helper result differs');const receipts=new Map();for(const call of helper.hostCalls){if(!names.has(call.name))fail('unsupported helper runtime receipt');receipts.set(call.name,(receipts.get(call.name)??0)+1);}if(receipts.size!==calls.size||[...calls].some(([name,count])=>receipts.get(name)!==count))fail('whole helper operation receipt census differs');return value;}},
  ]},
  {phase:'repository',rules:[{id:'repository:retain-canonical-primitive-IR-and-caller-binding-hygiene',apply:value=>value}]},
 ]).run(null).value;
}
