// Actual explicit type arguments are obligations, never value/source permits.
import {httpResourceWrittenNumericDomain,requireHttpResourceWrittenValueType,httpResourceWrittenDocSource} from './http-resource-local-annotations.mjs';
const fail=message=>{throw new TypeError('Resource original generic call type: '+message);};
function written(node,context){
 if(!node.typeArguments?.length)return null;if(node.typeArguments.length!==1||!context||context.language!=='TypeScript'||node.getSourceFile()!==context.file||!Array.isArray(context.erase))fail('one complete original TypeScript identity type argument required');return node.typeArguments[0];
}
export function httpResourceGenericCallNumericDomain(ts,node,imports,context,tick,fallback=null){const type=written(node,context);return type?httpResourceWrittenNumericDomain(ts,type,node,imports,context,tick,fallback):fallback;}
export function captureHttpResourceGenericCallType(ts,node,type,imports,context,tick){
 const annotation=written(node,context);if(!annotation)return;requireHttpResourceWrittenValueType(ts,annotation,type,imports,context,tick);
 const children=node.getChildren(context.file),less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken);if(less.length!==1||greater.length!==1||node.arguments.length!==1||less[0].end>annotation.getStart(context.file)||greater[0].getStart(context.file)<annotation.end)fail('complete actual native generic argument boundaries required');
 const argument=node.arguments[0],start=argument.getStart(context.file),text=httpResourceWrittenDocSource(ts,annotation,context);context.erase.push({span:[less[0].getStart(context.file),greater[0].end],replacement:''},{span:[start,start],replacement:'/** @type {'+text+'} */ ('},{span:[argument.end,argument.end],replacement:')'});
}
