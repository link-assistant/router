// Actual explicit type arguments are obligations, never value/source permits.
import {httpResourceWrittenNumericDomain,requireHttpResourceWrittenValueType,httpResourceWrittenDocSource} from './http-resource-local-annotations.mjs';
const fail=message=>{throw new TypeError('Resource original generic call type: '+message);};
function written(node,context){
 if(!node.typeArguments?.length)return null;if(node.typeArguments.length!==1||!context||context.language!=='TypeScript'||node.getSourceFile()!==context.file||!Array.isArray(context.erase))fail('one complete original TypeScript generic type argument required');return node.typeArguments[0];
}
export function httpResourceGenericCallNumericDomain(ts,node,imports,context,tick,fallback=null){const type=written(node,context);return type?httpResourceWrittenNumericDomain(ts,type,node,imports,context,tick,fallback):fallback;}
export function captureHttpResourceGenericCallType(ts,node,type,imports,context,tick,{carrier=null}={}){
 const annotation=written(node,context);if(!annotation)return;const payload=carrier?httpResourceOption(type):null;if(carrier&&!payload)fail('the actual generic call requires its whole Option carrier');requireHttpResourceWrittenValueType(ts,annotation,payload?payload.value:type,imports,context,tick);
 const children=node.getChildren(context.file),less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken);if(less.length!==1||greater.length!==1||node.arguments.length!==1||less[0].end>annotation.getStart(context.file)||greater[0].getStart(context.file)<annotation.end)fail('complete actual native generic argument boundaries required');
 const argument=node.arguments[0],start=argument.getStart(context.file),innerDoc=httpResourceWrittenDocSource(ts,annotation,context),binding=carrier?[...imports].find(([,id])=>httpResourceCallerContract(id)?.family==='generic-option-signature')?.[0]:null;if(carrier&&!binding)fail('a real current generic Option import is required to retain its full argument doc');const text=carrier?'ReturnType<typeof '+binding+'<'+innerDoc+'>>':innerDoc;context.erase.push({span:[less[0].getStart(context.file),greater[0].end],replacement:''},{span:[start,start],replacement:'/** @type {'+text+'} */ ('},{span:[argument.end,argument.end],replacement:')'});
}

// Actual deadline T describes its whole settled callback value. Retain a source
// JSDoc obligation on that expression when erasing the original type argument.
export function captureHttpResourceGenericDeadlineCallType(ts,node,type,imports,context,tick){
 const annotation=written(node,context);if(!annotation)return;requireHttpResourceWrittenValueType(ts,annotation,type,imports,context,tick);if(node.arguments.length!==3)fail('complete original generic deadline call arity required');let callback=node.arguments[2],groups=0;while(ts.isParenthesizedExpression(callback)){tick();if(++groups>16)fail('complete actual generic callback grouping bound');callback=callback.expression;}if(!ts.isArrowFunction(callback))fail('actual checked original generic async arrow required');let value=callback.body;if(ts.isBlock(value)){const rows=value.statements.filter(statement=>!ts.isEmptyStatement(statement));if(rows.length!==1||!ts.isReturnStatement(rows[0])||!rows[0].expression)fail('complete original generic callback return expression required');value=rows[0].expression;}
 const children=node.getChildren(context.file),less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken);if(less.length!==1||greater.length!==1||less[0].end>annotation.getStart(context.file)||greater[0].getStart(context.file)<annotation.end)fail('complete original native generic deadline boundaries required');const text=httpResourceWrittenDocSource(ts,annotation,context),start=value.getStart(context.file);context.erase.push({span:[less[0].getStart(context.file),greater[0].end],replacement:''},{span:[start,start],replacement:'/** @type {'+text+'} */ ('},{span:[value.end,value.end],replacement:')'});
}

import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceCallerContract} from './http-resource-caller-contracts.mjs';
