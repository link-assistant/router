// Additional language-domain checks only. The original caller WeakMaps,
// checker/frame joins, ownership pass and emission reissuer remain mandatory.
import {createHash} from 'node:crypto';
import {jsonIterationContract} from './json-iteration-contracts.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from './json-iteration-native-source.mjs';
import {BOOL,sameType} from './checked-types.mjs';
import {sourceShared,sourceVector} from './extensions/source-contract-types.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
export function forwardJsonIterationContract(operation){
 const row=jsonIterationContract(operation);return row?{...row,namespace:'translation_collections_core',source:JSON_ITERATION_NATIVE_SOURCE,sourceSha256:createHash('sha256').update(JSON_ITERATION_NATIVE_SOURCE).digest('hex')}:null;
}
export function checkForwardJsonIteration(checker,node,env,path,expected,{receiver,json,canonical,requireOption,current}){
 const row=forwardJsonIterationContract(node.operation);if(!row)throw typeError('unknown actual JSON iteration operation',node.span);
 const arity=row.parameters.length,syntax=node.args.at(-1);if(node.args.length!==arity||syntax?.k!=='routerLambda'||syntax.params.length!==row.callbackParameters.length||syntax.params.some(parameter=>parameter.pattern))throw unsupported('owned JSON iteration callback','requires its actual fixed inline parameter list',node.span);
 const initial=arity===3?checker.expr(node.args[1],env,path):null;current();if(initial)canonical(checker,initial.type,path,node.span);
 const parameters=row.callbackParameters.map(type=>type==='shared-json'?sourceShared(json):json),result=row.callbackReturns==='bool'?BOOL:json;
 const callback=checker.hostLambda(syntax,parameters,checker.callbackEnvironment(new Map(env),result),path,result,{source:'owned-json-collection',receiverType:receiver.type});current();
 if(!sameType(callback.type.result,result))throw typeError('actual JSON iteration callback result differs',node.span);checker.expectedOwnership(callback.type.result,result,path,node.span);checker.expectedPrimitiveIdentity(callback.type.result,result,path,node.span);
 let output;if(row.returns==='owned-json-list')output={...sourceVector(json),rustSourceType:true};else if(row.returns==='bool')output=BOOL;else if(row.returns==='owned-json')output=json;else{
  output=checker.instantiations.option(json,node.span);requireOption(checker,output,output,json,path,node.span);
 }
 if(expected){if(!sameType(output,expected))throw typeError('actual JSON iteration output differs',node.span);checker.expectedOwnership(output,expected,path,node.span);checker.expectedPrimitiveIdentity(output,expected,path,node.span);}
 current();return {k:'routerCoreJsonCollection',id:row.javascriptName,args:[receiver,...(initial?[initial]:[]),callback],type:output,constEligible:false,span:node.span};
}
