// Presentation/evaluation DATA adapters for freshly reissued complete plans.
import {posix} from 'node:path';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {emitOwnedPrimitiveOperatorCall,evaluateOwnedPrimitiveOperatorCall} from './js-to-rust/owned-primitive-operator-emission.mjs';
import * as primitive from './extensions/primitive-operator-runtime.mjs';
import {scalarLinearStage} from './extensions/scalar-linear-kernel-20261101-runtime.mjs';
const fail=message=>{throw new TypeError('Scalar linear checked execution: '+message);};
function scalar(node,item,parameter){
 if(node.kind==='variable'){if(node.name!==parameter)fail('captured scalar variable');return item;}
 if(node.kind==='integer')return BigInt(node.value);if(node.kind==='bool')return node.value;
 if(node.kind==='not')return !scalar(node.value,item,parameter);
 if(node.kind==='choose')return scalar(node.cond,item,parameter)?scalar(node.then,item,parameter):scalar(node.else,item,parameter);
 if(node.kind==='binary'){
  const left=scalar(node.left,item,parameter);if(node.op==='&&')return left&&scalar(node.right,item,parameter);if(node.op==='||')return left||scalar(node.right,item,parameter);
  const right=scalar(node.right,item,parameter);switch(node.op){case '===':return left===right;case '!==':return left!==right;case '<':return left<right;case '<=':return left<=right;case '>':return left>right;case '>=':return left>=right;default:fail('unselected scalar binary operation');}
 }
 if(node.kind==='primitive-bitwise-call'){const domain=primitiveBitwiseType(node.type);return primitive.primitiveBitwise(scalar(node.args[0],item,parameter),scalar(node.args[1],item,parameter),node.operation,domain?.bits??null,domain?.signed??null);}
 return evaluateOwnedPrimitiveOperatorCall(node,null,value=>scalar(value,item,parameter),primitive);
}
export function evaluateScalarLinearFunction(plan,args){
 let value=args[0];for(const stage of plan.stages)value=scalarLinearStage(value,stage.inputDomain,stage.operation,stage.domain,item=>scalar(stage.expression,item,stage.parameter));return value;
}
export function emitScalarLinearFunctions(functions,{path,runtimeRoot,typed=false}){
 const operators=new Set(),type=domain=>domain==='bool'?'boolean':'bigint';
 function expression(node,parameter){
  if(node.kind==='variable'){if(node.name!==parameter)fail('captured emitted scalar variable');return '__ro_item';}
  if(node.kind==='integer')return '('+node.value+'n)';if(node.kind==='bool')return node.value?'true':'false';
  if(node.kind==='not')return '(!'+expression(node.value,parameter)+')';
  if(node.kind==='choose')return '('+expression(node.cond,parameter)+'?'+expression(node.then,parameter)+':'+expression(node.else,parameter)+')';
  if(node.kind==='binary')return '('+expression(node.left,parameter)+' '+node.op+' '+expression(node.right,parameter)+')';
  if(node.kind==='primitive-bitwise-call'){operators.add('primitiveBitwise');const domain=primitiveBitwiseType(node.type);return '__ro_primitiveBitwise('+node.args.map(value=>expression(value,parameter)).concat([JSON.stringify(node.operation),String(domain?.bits??null),String(domain?.signed??null)]).join(', ')+')';}
  operators.add(node.name);return emitOwnedPrimitiveOperatorCall(node,{rust:false,expression:value=>expression(value,parameter),argumentName:()=>{fail('JavaScript expression emission must not request Rust temporaries');}});
 }
 const code=functions.map(plan=>{
  let previous=plan.input;const lines=[];
  for(let index=0;index<plan.stages.length;index++){
   const stage=plan.stages[index],name='__ro_linear_stage_'+index,callback='(__ro_item'+(typed?': '+type(stage.inputDomain):'')+') => '+expression(stage.expression,stage.parameter);
   lines.push('  const '+name+' = __ro_linearStage('+previous+', '+JSON.stringify(stage.inputDomain)+', '+JSON.stringify(stage.operation)+', '+JSON.stringify(stage.domain)+', '+callback+');');previous=name;
  }
  lines.push('  return '+previous+';');
  return (plan.exported?'export ':'')+'function '+plan.javascript+'('+plan.input+(typed?': readonly '+type(plan.inputDomain)+'[]':'')+')'+(typed?': readonly '+type(plan.outputDomain)+'[]':'')+' {\n'+lines.join('\n')+'\n}';
 }).join('\n\n');
 const relative=file=>{const value=posix.relative(posix.dirname(path),runtimeRoot+'/'+file);return value.startsWith('.')?value:'./'+value;};
 return 'import {scalarLinearStage as __ro_linearStage} from '+JSON.stringify(relative('scalar-linear-kernel-20261101-runtime.mjs'))+';\n'+
  (operators.size?'import { '+[...operators].sort().map(name=>name+' as __ro_'+name).join(', ')+' } from '+JSON.stringify(relative('primitive-operator-runtime.mjs'))+';\n':'')+'\n'+code+'\n';
}
