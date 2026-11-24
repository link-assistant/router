// Only the complete parent checker may issue a value from this candidate.
import {requireCurrentOwnedTextVectorJoinOperationSource} from '../current-owned-text-vector-join-source.mjs';
import {ownedTextVectorType,ownedTextVectorSharedType} from '../owned-text-vector-call-shape.mjs';
import {ownedTextVectorSourceConfiguration} from './owned-text-vector-call-source.mjs';
export function checkOwnedTextVectorJoinCall(node,binding,scope,depth,helpers){
 if(binding.target!==helpers.runtimeRoot+'/owned-text-vector-join-runtime.mjs')return null;const fail=message=>{throw new TypeError('Owned text vector join caller: '+message);},{ts,file}=helpers;helpers.current();const data=helpers.data();
 if(data.primitiveOperators!==true||helpers.insideCallback||binding.typeOnly||node.questionDotToken||node.typeArguments?.length||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('actual ordinary join import outside callbacks required');
 const row=requireCurrentOwnedTextVectorJoinOperationSource(new Map(data.files.map(value=>[value.path,value.source])),ownedTextVectorSourceConfiguration(data),binding.name);if(node.arguments.length!==2)fail('exact actual shared vector and scalar separator required');const args=[];
 for(let index=0;index<2;index++){
  const value=helpers.expression(node.arguments[index],scope,depth+1,index===0,row.parameters[index]);
  if(index===0){if(!ownedTextVectorType(value.type)&&!ownedTextVectorSharedType(value.type))fail('actual owned/shared String vector required');if(ownedTextVectorSharedType(value.type)&&(typeof value.root!=='string'||!helpers.params.some(parameter=>parameter.name===value.root&&parameter.type===value.type)))fail('shared String vector needs its actual live original input root');}
  else if(!['str','text-owned'].includes(value.type))fail('actual scalar borrowed or owning text separator required');
  if(value.kind==='variable'){const binding=scope.get(value.name);if(!binding||binding.type!==value.type)fail('actual complete original lexical binding required');}args.push(value);
 }
 helpers.current();return {value:{kind:'owned-text-vector-join-call',name:row.javascriptName,args,type:'text-owned',root:null},hostCall:{name:row.javascriptName,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]}};
}
