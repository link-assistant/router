// Only the parent complete private source issuer can admit this candidate IR.
import {requireCurrentPrimitiveSequenceOperationSource} from '../failure-aware-primitive-sequence-source.mjs';
const fail=message=>{throw new TypeError('Owned primitive sequence call: '+message);};
export function checkOwnedPrimitiveSequenceCall(node,binding,scope,depth,helpers){
 const {ts,file}=helpers;if(binding.target!==helpers.runtimeRoot+'/primitive-sequence-runtime.mjs')return null;helpers.current();const data=helpers.data();if(data.primitiveOperators!==true||binding.typeOnly||node.questionDotToken||node.typeArguments?.length||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('actual primitive profile and ordinary value import/call required');
 const operation=requireCurrentPrimitiveSequenceOperationSource(new Map(data.files.map(row=>[row.path,row.source])),data,binding.name);if(node.arguments.length!==operation.parameters.length)fail('actual complete core call arity differs');
 const args=node.arguments.map((argument,index)=>helpers.expression(argument,scope,depth+1,false,operation.parameters[index]));if(args.some((value,index)=>value.type!==operation.parameters[index]&&!(operation.parameters[index]==='u64'&&value.type==='usize')))fail('actual primitive slice/index operand domain differs');
 const receiver=args[0];if(typeof receiver.root!=='string'||!helpers.params.some(param=>param.name===receiver.root&&param.type===operation.parameters[0]))fail('shared primitive receiver requires its actual live immutable input root');helpers.current();
 return {value:{kind:'primitive-sequence-call',name:operation.javascriptName,args,type:operation.returns,root:null},hostCall:{name:operation.javascriptName,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
}
