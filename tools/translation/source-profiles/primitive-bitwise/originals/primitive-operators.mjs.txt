// Rust primitive operators lower through checked common meta. Trait operators,
// pointer widths and borrowed operands require separate source contracts.
import {rustFixedType} from '../checked-types.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
export function actualFixedOperand(type,span){
  const primitive=rustFixedType(type?.rustPrimitiveName);
  if(type?.kind!=='fixed'||!primitive||!/^([iu])(8|16|32|64|128)$/u.test(type.rustPrimitiveName)||primitive.bits!==type.bits||primitive.signed!==type.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('primitive integer operator','requires an actual by-value fixed primitive identity',span);
  return type;
}
export function checkedPrimitiveCast(value,target,span){
  actualFixedOperand(value.type,span);actualFixedOperand(target,span);
  return {k:'routerPrimitiveIntegerCast',value,type:target,span,constEligible:true,operationProof:{kind:'rust-integer-as',input:value.type.rustPrimitiveName,target:target.rustPrimitiveName,truncation:'two-complement-target-width',runtimeParity:false}};
}
export function checkedPrimitiveShift(checker,node,env,path,expected){
  const left=checker.expr(node.left,env,path,expected?.kind==='fixed'?expected:undefined);
  actualFixedOperand(left.type,node.span);
  const right=checker.expr(node.right,env,path,node.right.k==='num'&&!node.right.type?.rustPrimitiveName?{...rustFixedType('i32'),rustPrimitiveName:'i32'}:undefined);
  actualFixedOperand(right.type,node.span);
  if(!['<<','>>'].includes(node.operation))throw typeError('invalid original primitive shift',node.span);
  return {k:'routerPrimitiveIntegerShift',left,right,type:left.type,span:node.span,operatorSpan:node.operatorSpan,constEligible:true,operationProof:{kind:'rust-integer-shift',operation:node.operation,input:left.type.rustPrimitiveName,count:right.type.rustPrimitiveName,overflowPolicy:'checked-count',runtimeParity:false}};
}
export function requirePrimitiveOperator(node){
  actualFixedOperand(node.type,node.span);
  const proof=node.operationProof;
  if(node.k==='routerPrimitiveIntegerCast'){
    actualFixedOperand(node.value?.type,node.span);
    if(proof?.kind!=='rust-integer-as'||proof.input!==node.value.type.rustPrimitiveName||proof.target!==node.type.rustPrimitiveName||proof.truncation!=='two-complement-target-width'||proof.runtimeParity!==false)throw new TypeError('Missing checked primitive cast');
  }else if(node.k==='routerPrimitiveIntegerShift'){
    actualFixedOperand(node.left?.type,node.span);actualFixedOperand(node.right?.type,node.span);
    if(proof?.kind!=='rust-integer-shift'||!['<<','>>'].includes(proof.operation)||proof.input!==node.type.rustPrimitiveName||proof.input!==node.left.type.rustPrimitiveName||proof.count!==node.right.type.rustPrimitiveName||proof.overflowPolicy!=='checked-count'||proof.runtimeParity!==false)throw new TypeError('Missing checked primitive shift');
  }else throw new TypeError('Unknown checked primitive operator');
  return proof;
}
export function parsePrimitiveComparison(parser,path,options){
  const c=parser.cursor,comparison={'==':'eq','!=':'ne','<':'lt','<=':'le','>':'gt','>=':'ge'};
  const shift=(path,options)=>{
    let left=parser.additive(path,options);
    for(;;){const token=c.peek(),next=c.peek(1);
      if(options.statement&&['if','match','block'].includes(left.k))return left;
      if(!['<','>'].includes(token.value)||next.value!==token.value||token.end!==next.start)return left;
      c.next();c.next();const right=parser.additive(path,{noStruct:options.noStruct});
      left={k:'routerPrimitiveShift',operation:token.value.repeat(2),left,right,operatorSpan:{start:token.start,end:next.end},span:{start:left.span?.start??token.start,end:right.span?.end??next.end}};
    }
  };
  const left=shift(path,options),token=c.peek();
  const jointGreaterEqual=token.value==='>'&&c.peek(1).value==='='&&token.end===c.peek(1).start;
  if(token.kind==='punct'&&['|','^','&'].includes(token.value)&&!(options.statement&&['if','match'].includes(left.k)))throw unsupported('bitwise operator '+token.value,'requires a separately checked primitive or trait contract',token);
  if(token.kind==='punct'&&comparison[token.value]){
    c.next();if(jointGreaterEqual)c.next();const right=shift(path,{noStruct:options.noStruct});
    if(c.peek().kind==='punct'&&comparison[c.peek().value])throw parser.fail('comparison operators cannot be chained',c.peek());
    return {k:'binary',op:jointGreaterEqual?'ge':comparison[token.value],left,right,span:{start:left.span?.start??token.start,end:right.span?.end??token.end}};
  }
  return left;
}
