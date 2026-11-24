// Pure total argument expansion DATA; original private source/type/body facts
// are prerequisites. No AST, owner, checker or executable token is issued here.
import {createRulePipeline} from './rule-pipeline.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {narrowOwnedNumericLiteral} from './js-to-rust/owned-numeric-literals.mjs';
import {substituteCopyScalarHelperLocalExpression20261103} from './copy-scalar-helper-local-substitution-20261103.mjs';
const fail=message=>{throw TypeError('Scalar helper arguments: '+message);};
const scalar=type=>type==='bool'||primitiveBitwiseType(type)!==null;
export function substituteCopyScalarHelperArguments20261103(helper,args,charge){
 // Existing inert operands keep the exact old errors, work and local behavior.
 if(args.every(value=>['variable','bool','integer'].includes(value?.kind)))return substituteCopyScalarHelperLocalExpression20261103(helper,args,charge);
 if(args.length!==helper.params.length||!scalar(helper.returns)||helper.params.some(param=>!scalar(param.type)))fail('complete actual scalar signature/arity required');
 let cells=0;const tick=depth=>{if(++cells>100000||depth>160)fail('original complete expanded argument work bound');charge(depth);};
 function pure(row,depth=0){
  tick(depth);if(!row||row.root!==null||!scalar(row.type))fail('actual root-free scalar argument required');
  if(row.kind==='variable'){if(typeof row.name!=='string')fail('actual lexical scalar identifier required');return {...row};}
  if(row.kind==='bool'){if(row.type!=='bool'||typeof row.value!=='boolean')fail('actual Boolean literal required');return {...row};}
  if(row.kind==='integer'){if(!primitiveBitwiseType(row.type))fail('actual native literal domain required');const value={...row};narrowOwnedNumericLiteral(value,row.type);if(BigInt(value.value).toString()!==value.value)fail('canonical native integer required');return value;}
  if(row.kind==='not'){const value=pure(row.value,depth+1);if(row.type!=='bool'||value.type!=='bool')fail('actual Boolean negation required');return {...row,value};}
  if(row.kind==='choose'){
   const cond=pure(row.cond,depth+1),yes=pure(row.then,depth+1),no=pure(row.else,depth+1);if(cond.type!=='bool'||yes.type!==row.type||no.type!==row.type)fail('actual argument choice domains differ');return {...row,cond,then:yes,else:no};
  }
  if(row.kind==='binary'){
   const left=pure(row.left,depth+1),right=pure(row.right,depth+1);if(row.type!=='bool'||left.type!==right.type)fail('actual logical/comparison argument domains differ');
   if(['&&','||'].includes(row.op)){if(left.type!=='bool')fail('actual Boolean logical operands required');}
   else if(['<','<=','>','>='].includes(row.op)){if(!primitiveBitwiseType(left.type))fail('actual fixed ordered operands required');}
   else if(!['===','!=='].includes(row.op))fail('argument arithmetic/bitwise/effects need separate rules');return {...row,left,right};
  }
  fail('argument calls, ownership, effects and unsupported expressions require separate rules');
 }
 const values=new Map();
 // Validate every argument, including any unused by the helper. Only total,
 // effect-free primitive expressions may move into lazy helper branches.
 for(let at=0;at<args.length;at++){const value=pure(args[at]);if(value.type!==helper.params[at].type||values.has(helper.params[at].name))fail('actual operand domain or unique parameter differs');values.set(helper.params[at].name,value);}
 function expand(row,depth=0){
  tick(depth);
  if(row.kind==='variable'){const value=values.get(row.name);if(!value||value.type!==row.type)fail('helper expression contains a capture or mismatched binding');return pure(value,depth+1);}
  if(row.kind==='bool'||row.kind==='integer')return pure(row,depth+1);
  if(row.kind==='not')return {...row,value:expand(row.value,depth+1)};
  if(row.kind==='binary')return {...row,left:expand(row.left,depth+1),right:expand(row.right,depth+1)};
  if(row.kind==='choose')return {...row,cond:expand(row.cond,depth+1),then:expand(row.then,depth+1),else:expand(row.else,depth+1)};
  fail('normalized helper operation is outside the total scalar family');
 }
 return createRulePipeline([
  {phase:'language',rules:[
   {id:'language:normalize-original-helper-to-its-own-parameter-namespace',apply:()=>substituteCopyScalarHelperLocalExpression20261103(helper,helper.params.map(param=>({kind:'variable',name:param.name,type:param.type,root:null})),tick)},
   {id:'language:expand-checked-total-arguments-without-recursive-caller-name-lookup',apply:row=>expand(row)},
  ]},
  {phase:'repository',rules:[{id:'repository:retain-existing-expression-IR-and-caller-binding-identities',apply:value=>value}]},
 ]).run(null).value;
}
