// Candidate construction only. The new parent's complete typed function and
// independent move pass must both succeed before private IR issuance.
import {requireCurrentOwnedTextVectorOperationSource} from '../current-owned-text-vector-source.mjs';
import {ownedTextVectorSharedType,ownedTextVectorType} from '../owned-text-vector-call-shape.mjs';
export function ownedTextVectorSourceConfiguration(data){return {runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot};}
export function checkOwnedTextVectorCall(node,binding,scope,depth,helpers){
 if(binding.target!==helpers.runtimeRoot+'/owned-text-vector-runtime.mjs')return null;const fail=message=>{throw new TypeError('Owned text vector call: '+message);},{ts,file}=helpers;helpers.current();const data=helpers.data();
 if(data.primitiveOperators!==true||helpers.insideCallback||binding.typeOnly||node.questionDotToken||node.typeArguments?.length||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('ordinary original source call outside callbacks required');
 const row=requireCurrentOwnedTextVectorOperationSource(new Map(data.files.map(value=>[value.path,value.source])),ownedTextVectorSourceConfiguration(data),binding.name);if(node.arguments.length!==row.parameters.length)fail('complete actual call arity differs');const args=[];
 for(let index=0;index<row.parameters.length;index++){
  const role=row.parameters[index],shared=ownedTextVectorSharedType(role),value=helpers.expression(node.arguments[index],scope,depth+1,true,role);
  if(shared){if(value.type!==role&&!ownedTextVectorType(value.type))fail('actual shared/owned text vector receiver required');if(value.type===role&&(typeof value.root!=='string'||!helpers.params.some(parameter=>parameter.name===value.root&&parameter.type===role)))fail('shared receiver needs its actual live input root');}
  else if(role==='text-owned-list-ref'){if(value.type!==role||typeof value.root!=='string'||!helpers.params.some(parameter=>parameter.name===value.root&&parameter.type===role))fail('shared owned-String slice input root required');}
  else if(value.type!==role&&!(role==='u64'&&value.type==='usize'))fail('actual owned text/vector/scalar domain differs');
  if(value.kind==='variable'&&[role,'vec:text-owned'].includes(value.type)){const entry=scope.get(value.name);if(!entry||entry.type!==value.type)fail('actual local source binding required');}args.push(value);
 }
 // No moved/owns bit is manufactured here. The full-function move pass replays
 // all these actual operands in order, including nested moves and loans.
 helpers.current();return {value:{kind:'owned-text-vector-call',name:row.javascriptName,args,type:row.returns,root:null},hostCall:{name:row.javascriptName,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
}
