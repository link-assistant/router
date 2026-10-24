// Source rules only; the parent whole-function checker owns semantic issuance.
import {ownedPrimitiveResultOperation,ownedPrimitiveResultPayload} from './owned-primitive-result-contracts.mjs';
const fail=message=>{throw new TypeError('Owned primitive Result: '+message);};
const owned=type=>['base64-result','json','json-list-owned','json-text-result','json-owned-option','text-owned','text-owned-option'].includes(type)||ownedPrimitiveResultPayload(type)!==null;
const compatible=(actual,wanted)=>actual===wanted||wanted==='str'&&actual==='text-owned';
export function checkOwnedPrimitiveResult(node,binding,scope,depth,helpers){
 const row=ownedPrimitiveResultOperation(binding.name);if(!row||binding.target!==helpers.runtimeRoot+'/primitive-result-runtime.mjs')return null;helpers.current();const {ts,file}=helpers;
 if(node.arguments.length!==row.parameters.length)fail('complete actual argument count required');const args=[];for(let index=0;index<row.parameters.length;index++){
  const role=row.parameters[index];if(role==='callback')continue;const value=helpers.expression(node.arguments[index],scope,depth+1,false,role);if(!compatible(value.type,role))fail('actual primitive Result operand differs');args.push(value);
 }
 let callback=null,root=null,staticResultBorrow=false;
 if(row.parameters.includes('callback')){
  const syntax=node.arguments[1];if(!ts.isArrowFunction(syntax)||syntax.modifiers?.length||syntax.typeParameters?.length||syntax.type||syntax.parameters.length!==row.callbackParameters.length)fail('ordinary actual fixed callback required');const local=helpers.branchScope(scope);for(const [name,value]of local)if(value.mutable||owned(value.type))local.delete(name);const names=[];
  for(let index=0;index<syntax.parameters.length;index++){
   const parameter=syntax.parameters[index],domain=row.callbackParameters[index];if(!ts.isIdentifier(parameter.name)||parameter.type||parameter.initializer||parameter.questionToken||parameter.dotDotDotToken||parameter.modifiers?.length)fail('ordinary projected callback parameter required');const receiver=args[0],staticInput=domain==='str'&&receiver.root===null&&helpers.staticResult(receiver);if(domain==='str'&&receiver.root===null&&!staticInput)fail('callback input needs an independent actual static or live Result origin');local.delete(parameter.name.text);names.push(helpers.bind(parameter.name,{type:domain,root:domain==='str'?receiver.root:null,input:false,...(staticInput?{asciiStaticLoan:true}:{})},local));
  }
  const pair=helpers.pairedCallback(syntax);for(let index=0;index<syntax.parameters.length;index++){const written=pair?.declaration.parameters[index].type??ts.getJSDocType(syntax.parameters[index]);if(written&&!compatible(row.callbackParameters[index],helpers.writtenType(written,pair)))fail('written callback input contradicts actual native domain');}
  const checked=helpers.body(syntax,pair,local,row.callbackReturns,depth+1);if(checked.returns!==row.callbackReturns)fail('every callback result needs the actual complete native output domain');const written=pair?.declaration.type??ts.getJSDocReturnType(syntax);if(written&&!compatible(checked.returns,helpers.writtenType(written,pair)))fail('written callback output contradicts independently checked body');callback={parameters:names,parameterTypes:row.callbackParameters,returns:row.callbackReturns,body:checked.body,span:[syntax.getStart(file),syntax.end]};
  if(row.returns==='str-text-result'){
   if(row.method==='map'||row.method==='and_then'){root=checked.root;staticResultBorrow=checked.staticBorrow===true;}
   else if(row.method==='map_err'){root=args[0].root;staticResultBorrow=helpers.staticResult(args[0]);}
   else if(row.method==='or_else'){const left=args[0],leftStatic=helpers.staticResult(left),rightStatic=checked.staticBorrow===true;if(left.root===checked.root){root=left.root;staticResultBorrow=root===null&&leftStatic&&rightStatic;}else if(leftStatic){root=checked.root;staticResultBorrow=rightStatic;}else if(rightStatic){root=left.root;}else fail('lazy Result recovery requires compatible actual success loan roots');}
  }
 }else if(row.root!==null){
  const source=args[row.root];if(row.method==='ok'){const loan=helpers.stringLoan(source);if(!loan)fail('borrowed success requires actual live or literal source text');root=loan.root;staticResultBorrow=root===null;}
  else{root=source.root;staticResultBorrow=helpers.staticResult(source);if(root===null&&!staticResultBorrow)fail('borrowed success conversion requires an independently proved static origin');}
 }else if(row.returns==='str-text-result'&&row.method==='err')staticResultBorrow=true;
 helpers.current();return {value:{kind:'primitive-result-call',name:row.javascriptName,args,callback,type:row.returns,root,staticResultBorrow,staticOptionalBorrow:row.returns==='str-option-ref'&&staticResultBorrow},hostCall:{name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
}
