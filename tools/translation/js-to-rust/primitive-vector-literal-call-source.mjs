// Literal call proposals only. The parent rechecks the complete original
// source/import symbols, owned flow and serialized/reparsed semantic boundary.
import {withOriginalPrimitiveVectorLiteralSourceOperation,requireCurrentPrimitiveVectorLiteralOperationSource} from '../failure-aware-primitive-vector-literal-source.mjs';
const fail=message=>{throw new TypeError('Primitive vector literal call: '+message);};
export function checkPrimitiveVectorLiteralCall(node,binding,scope,depth,helpers){
 if(binding.target!==helpers.runtimeRoot+'/primitive-vector-literal-runtime.mjs')return null;
 return withOriginalPrimitiveVectorLiteralSourceOperation(()=>{const {ts,file}=helpers;helpers.current();const data=helpers.data();if(data.primitiveOperators!==true||helpers.insideCallback||binding.typeOnly||node.questionDotToken||node.typeArguments?.length||node.arguments.length>64||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('actual bounded individual source operands outside callbacks required');const row=requireCurrentPrimitiveVectorLiteralOperationSource(new Map(data.files.map(value=>[value.path,value.source])),data,binding.name,node.arguments.length),args=[];
  for(const argument of node.arguments){const value=helpers.expression(argument,scope,depth+1,false,row.domain);helpers.current();if(value.root!==null||value.type!==row.domain&&!(row.domain==='u64'&&value.type==='usize'))fail('actual copied scalar literal operand differs');args.push(value);}
  helpers.current();return {value:{kind:'primitive-vector-literal-call',name:row.javascriptName,args,type:row.returns,root:null},hostCall:{name:row.javascriptName,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
 });
}
