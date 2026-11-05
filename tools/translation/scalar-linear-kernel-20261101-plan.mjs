// Shape DATA only. The caller MUST freshly reissue complete original semantic
// meta through its real private source checker before calling this selector.
import {primitiveOwnedVectorOperationShape,ownedPrimitiveVectorElement} from './primitive-owned-vector-call-shape.mjs';
import {primitiveVectorLiteralOperationShape} from './primitive-vector-literal-call-shape.mjs';
import {ownedPrimitiveSliceElement} from './js-to-rust/owned-wide-primitive-slice-contracts.mjs';
import {ownedPrimitiveOperatorCallMetadata} from './js-to-rust/owned-primitive-operator-emission.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Scalar linear complete-stage selection: '+message);};
const variable=(node,name)=>node?.kind==='variable'&&node.name===name;
const empty=body=>Array.isArray(body)&&body.length===0;
function operation(node,name,domain,args){const row=primitiveOwnedVectorOperationShape(node?.name);return node?.kind==='primitive-owned-vector-call'&&row?.operation===name&&row.domain===domain&&node.args.length===args.length&&args.every((name,index)=>variable(node.args[index],name));}
export function selectScalarLinearFunctions(program){
 let cells=0;
 function pure(node,parameter,domain,depth=0){
  if(++cells>100000||depth>160||!node||node.root!==null)fail('bounded actual root-free scalar expression required');
  if(node.kind==='variable'){if(node.name!==parameter||node.type!==domain)fail('captured or mismatched scalar binding');return;}
  if(node.kind==='integer'){if(typeof node.value!=='string'||!/^[-]?(?:0|[1-9][0-9]{0,38})$/u.test(node.value)||node.type!=='usize'&&!primitiveBitwiseType(node.type))fail('actual primitive literal required');return;}
  if(node.kind==='bool'){if(node.type!=='bool'||typeof node.value!=='boolean')fail('actual Boolean literal required');return;}
  if(node.kind==='not'){if(node.type!=='bool'||node.value.type!=='bool')fail('actual Boolean negation required');pure(node.value,parameter,domain,depth+1);return;}
  if(node.kind==='choose'){if(node.cond.type!=='bool'||node.then.type!==node.type||node.else.type!==node.type)fail('actual scalar conditional required');for(const value of [node.cond,node.then,node.else])pure(value,parameter,domain,depth+1);return;}
  if(node.kind==='binary'){if(node.type!=='bool'||!['===','!==','<','<=','>','>=','&&','||'].includes(node.op))fail('actual checked scalar comparison required');pure(node.left,parameter,domain,depth+1);pure(node.right,parameter,domain,depth+1);return;}
  if(node.kind==='primitive-bitwise-call'){
   const type=primitiveBitwiseType(node.type);if(node.name!=='primitiveBitwise'||!['&','|','^'].includes(node.operation)||node.args.length!==2||node.args.some(value=>value.type!==node.type)||node.type!=='bool'&&(!type||node.bits!==type.bits||node.signed!==type.signed))fail('actual checked eager bitwise expression required');
  }else if(['primitive-arithmetic-call','primitive-method-call','primitive-not-call','primitive-cast-call','primitive-shift-call'].includes(node.kind))ownedPrimitiveOperatorCallMetadata(node);
  else fail('unsupported callback effect or scalar expression');
  for(const value of node.args)pure(value,parameter,domain,depth+1);
 }
 const functions=[];
 for(const item of program){
  if(item.params.length!==1||item.resultRoot!==null||item.localCalls?.length)fail('complete single-input unaliased scalar collection function required');
  const input=item.params[0],inputDomain=ownedPrimitiveSliceElement(input.type),outputDomain=ownedPrimitiveVectorElement(item.returns);
  if(!inputDomain||!outputDomain)fail('actual checked primitive slice and owned vector result required');
  const stages=[];let cursor=0,previous=input.name,previousDomain=inputDomain;
  while(cursor<item.body.length-1){
   if(stages.length>=8)fail('original eight-stage bound');
   const init=item.body[cursor++],literal=primitiveVectorLiteralOperationShape(init?.value?.name,0);
   if(init?.kind!=='let'||init.mutable!==true||init.value.kind!=='primitive-vector-literal-call'||!literal||init.value.args.length||init.value.type!=='vec:'+literal.domain)fail('complete empty owned stage accumulator required');
   const local=init.name,domain=literal.domain;let loop,body,parameter;
   if(stages.length===0){
    loop=item.body[cursor++];if(loop?.kind!=='for-scalar'||!variable(loop.value,previous)||loop.value.type!==previousDomain+'-list-ref')fail('actual original shared-slice stage iteration required');
    parameter=loop.name;body=loop.body;
   }else{
    const size=item.body[cursor++];loop=item.body[cursor++];
    if(size?.kind!=='let'||size.mutable||!operation(size.value,'len',previousDomain,[previous])||loop?.kind!=='for-range'||loop.reverse||loop.inclusive||loop.start.kind!=='integer'||loop.start.value!=='0'||!variable(loop.end,size.name)||loop.start.type!=='u64'||loop.end.type!=='u64'||loop.body.length!==2)fail('complete immutable-length ascending stage loop required');
    const option=loop.body[0],branch=loop.body[1];
    if(option.kind!=='let'||option.mutable||!operation(option.value,'get',previousDomain,[previous,loop.name])||branch.kind!=='if'||branch.cond.kind!=='option-test'||branch.cond.some!==true||!variable(branch.cond.value,option.name)||!empty(branch.else)||branch.then.length!==2)fail('actual complete copied Vec get/Some stage required');
    const bind=branch.then[0];if(bind.kind!=='let'||bind.mutable||bind.value.kind!=='option-field'||!variable(bind.value.value,option.name)||bind.value.type!==previousDomain)fail('dominating Some scalar payload binding required');
    parameter=bind.name;body=branch.then.slice(1);
   }
   if(body.length!==1)fail('one complete map/filter action required');
   let action=body[0],op='map',expression;
   if(action.kind==='if'){
    if(!empty(action.else)||action.then.length!==1||action.cond.type!=='bool'||domain!==previousDomain)fail('complete domain-preserving scalar filter required');
    expression=action.cond;action=action.then[0];op='filter';
   }
   const push=action.value,row=primitiveOwnedVectorOperationShape(push?.name);
   if(action.kind!=='assign'||action.name!==local||push.kind!=='primitive-owned-vector-call'||row?.operation!=='push'||row.domain!==domain||push.args.length!==2||!variable(push.args[0],local)||push.type!=='vec:'+domain)fail('complete isolated owned stage push/rebind required');
   if(op==='filter'){if(!variable(push.args[1],parameter)||push.args[1].type!==previousDomain)fail('filter must copy its actual scalar item');}
   else expression=push.args[1];
   pure(expression,parameter,previousDomain);
   stages.push({operation:op,inputDomain:previousDomain,domain,parameter,expression});previous=local;previousDomain=domain;
  }
  const result=item.body[cursor];
  if(stages.length<2||cursor!==item.body.length-1||result?.kind!=='return'||!variable(result.value,previous)||result.value.type!==item.returns||previousDomain!==outputDomain)fail('complete stage-only function and final owned return required');
  functions.push({name:item.name,javascript:item.javascript,exported:item.exported,input:input.name,inputDomain,outputDomain,stages});
 }
 if(!functions.length||functions.length>128)fail('bounded nonempty complete specialized function census required');return functions;
}
