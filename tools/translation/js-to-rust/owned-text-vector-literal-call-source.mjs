// Actual ordinary call operands; complete parent move/source checks still issue IR.
import {requireCurrentOwnedTextVectorLiteralOperationSource} from '../current-owned-text-vector-literal-source.mjs';
import {ownedTextVectorSourceConfiguration} from './owned-text-vector-call-source.mjs';
const fail=message=>{throw new TypeError('Owned String literal call: '+message);};
export function checkOwnedTextVectorLiteralCall(node,binding,scope,depth,helpers){
 if(binding.target!==helpers.runtimeRoot+'/owned-text-vector-literal-runtime.mjs')return null;const {ts,file}=helpers;helpers.current();const data=helpers.data();
 if(data.primitiveOperators!==true||helpers.insideCallback||binding.typeOnly||node.questionDotToken||node.typeArguments?.length||node.arguments.length>64||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('actual bounded individual operands outside callbacks required');
 const row=requireCurrentOwnedTextVectorLiteralOperationSource(new Map(data.files.map(value=>[value.path,value.source])),ownedTextVectorSourceConfiguration(data),binding.name,node.arguments.length),args=[];
 for(const argument of node.arguments){let value=helpers.expression(argument,scope,depth+1,true,'text-owned');if(value.type==='str')value=helpers.ownedText(value,scope);helpers.current();if(value.type!=='text-owned'||value.root!==null)fail('actual by-value owned String operand or explicitly copied actual str loan required');args.push(value);}
 helpers.current();return {value:{kind:'owned-text-vector-literal-call',name:row.javascriptName,args,type:row.returns,root:null},hostCall:{name:row.javascriptName,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
}
