// Actual original-source syntax observations only. The enclosing flow checks
// the complete argument/type/move/borrow state and every source association.
const fail=reason=>{throw new TypeError('Primitive Display source: '+reason);};
export function httpResourcePrimitiveDisplayDomain(type){return resourceInteger(type)||['bool','u64','i64','str','text-owned'].includes(type);}
export function observeHttpResourcePrimitiveDisplayCall(ts,node,{imports,moduleNames,environment,sourceFile,tick}){
 if(!ts.isCallExpression(node))return null;const global=ts.isIdentifier(node.expression)&&node.expression.text==='String',method=ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='toString';if(!global&&!method)return null;tick();
 if(!sourceFile||node.getSourceFile()!==sourceFile||node.questionDotToken||node.typeArguments?.length||node.arguments.some(argument=>ts.isSpreadElement(argument)))fail('complete original nonoptional nongeneric display call required');
 if(global&&(imports.has('String')||moduleNames.has('String')||environment.has('String')))fail('actual unshadowed global String binding required');if(method&&node.expression.questionDotToken)fail('optional primitive display method is unsupported');if(node.arguments.length!==(global?1:0))fail('one global conversion argument or zero method arguments required');
 return {argument:global?node.arguments[0]:node.expression.expression,operation:global?'String':'toString',sourceAuthority:false,semanticAuthority:false};
}

import {resourceInteger} from './http-resource-integer-domains.mjs';
