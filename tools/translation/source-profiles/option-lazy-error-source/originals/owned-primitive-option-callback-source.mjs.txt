// Finite source substitutions only. The parent private checker owns issuance,
// native bindings, original source observations and the complete body recheck.
import {primitiveOptionCallbackContract} from '../primitive-option-callback-contracts.mjs';
const option=domain=>({bool:'bool-option',u64:'u64-option',i64:'i64-option',str:'str-option-ref'})[domain];
const ownedCaptures=new Set(['base64-result','json','json-list-owned','json-text-result','json-owned-option','text-owned']);
const fail=message=>{throw new TypeError('Owned primitive Option callback: '+message);};
export function checkOwnedPrimitiveOptionCallback(node,binding,scope,depth,helpers){
 const row=primitiveOptionCallbackContract(binding.name);if(!row||binding.target!==helpers.runtimeRoot+'/primitive-option-callback-runtime.mjs')return null;
 if(row.input==='text-owned'||row.output==='text-owned')fail('owning optional text callbacks require the complete resource ownership lane');
 const {ts,file}=helpers;helpers.current();if(node.arguments.length!==2)fail('complete actual receiver and callback arguments required');const receiver=helpers.expression(node.arguments[0],scope,depth+1,false,option(row.input)),callback=node.arguments[1];
 if(receiver.type!==option(row.input)||!ts.isArrowFunction(callback)||callback.modifiers?.length||callback.typeParameters?.length||callback.parameters.length!==row.callbackParameters.length)fail('actual optional domain and ordinary fixed callback required');
 const staticInput=row.input==='str'&&receiver.root===null?helpers.staticOptional(receiver):false;if(row.input==='str'&&receiver.root===null&&!staticInput)fail('borrowed callback input requires an actual live or independently proved static optional origin');
 const local=helpers.branchScope(scope);for(const [name,value]of local)if(value.mutable||ownedCaptures.has(value.type)||['bool-text-result','u64-text-result','i64-text-result','str-text-result','text-owned-option'].includes(value.type))local.delete(name);const names=[];
 for(let index=0;index<callback.parameters.length;index++){
  const parameter=callback.parameters[index],domain=row.callbackParameters[index];if(!ts.isIdentifier(parameter.name)||parameter.initializer||parameter.questionToken||parameter.dotDotDotToken||parameter.modifiers?.length||parameter.type||callback.type)fail('ordinary projected callback parameters required');
  local.delete(parameter.name.text);names.push(helpers.bind(parameter.name,{type:domain,root:domain==='str'?receiver.root:null,input:false,...(domain==='str'&&staticInput?{asciiStaticLoan:true}:{})},local));
 }
 const pair=helpers.pairedCallback(callback);for(let index=0;index<callback.parameters.length;index++){const written=pair?.declaration.parameters[index].type??ts.getJSDocType(callback.parameters[index]);if(written&&helpers.writtenType(written,pair)!==row.callbackParameters[index])fail('written callback parameter contradicts the actual bound input domain');}
 const checked=helpers.body(callback,pair,local,row.callbackReturns,depth+1);if(checked.returns!==row.callbackReturns)fail('every actual callback branch must have the declared result domain');
 const annotation=pair?.declaration.type??ts.getJSDocReturnType(callback);if(annotation&&helpers.writtenType(annotation,pair)!==row.callbackReturns)fail('written callback result contradicts its independently checked body');
 helpers.current();return {value:{kind:'primitive-option-callback-call',name:row.javascriptName,receiver,callback:{parameters:names,parameterTypes:row.callbackParameters,returns:row.callbackReturns,body:checked.body,span:[callback.getStart(file),callback.end]},type:row.returns,root:row.returns==='str-option-ref'?checked.root:null,staticOptionalBorrow:row.returns==='str-option-ref'&&checked.staticBorrow===true},hostCall:{name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end],callbackSpan:[callback.getStart(file),callback.end]}};
}
