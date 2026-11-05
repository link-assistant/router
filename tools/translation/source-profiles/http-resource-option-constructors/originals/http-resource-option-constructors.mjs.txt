// Original literal syntax DATA. Complete source flow checks every payload,
// contextual domain, move, borrow, returned root and disposal obligation.
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceCallerRustType,httpResourceResult,httpResourceResultOwnsDisposal} from './http-resource-caller-contracts.mjs';
import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
import {httpResourceValueRoots} from './http-resource-root-sets.mjs';
const fail=message=>{throw new TypeError('Resource original tagged constructor: '+message);};
export function httpResourceOptionWrittenContext(ts,written,imports,context,tick,fallback=null){
 if(!written)return fallback;if(!context||written.getSourceFile()!==context.file)fail('complete actual written Option context required');const actual=createHttpResourceWrittenAnnotationReader(ts,imports,tick,{aliases:context.aliases,coldTypeCurrent:context.coldTypeCurrent,numericDomain:fallback?.endsWith(':i64')||fallback==='i64'?'i64':null})(written);return actual.kind==='domain'?actual.type:fallback;
}
export function captureHttpResourceOptionLiteral(ts,node,{expectedType=null,expression,imports,context,tick,level=0}={}){
 if(!ts.isObjectLiteralExpression(node))return null;if(!context||node.getSourceFile()!==context.file||!Array.isArray(context.erase)||!Array.isArray(context.annotate))fail('actual whole source and original literal annotation sinks required');tick();
 const fields=node.properties;if(fields.length<1||fields.length>2||fields.some(field=>!ts.isPropertyAssignment(field)||!ts.isIdentifier(field.name)&&!ts.isStringLiteral(field.name)))fail('exact original Option literal data fields required');if(fields[0].name.text!=='$'||fields.length===2&&fields[1].name.text!=='field0')fail('complete ordered original Option tag and payload required');
 let tag=fields[0].initializer,asserted=false;if(ts.isAsExpression(tag)){if(context.language!=='TypeScript'||!ts.isTypeReferenceNode(tag.type)||!ts.isIdentifier(tag.type.typeName)||tag.type.typeName.text!=='const'||tag.type.typeArguments?.length)fail('only the original literal tag may retain a const assertion');asserted=true;tag=tag.expression;}
 if(!ts.isStringLiteral(tag)||!['Some','None','Ok','Err'].includes(tag.text)||tag.text==='None'&&fields.length!==1||tag.text!=='None'&&fields.length!==2)fail('complete actual tagged payload or empty None required');
 if(context.language==='JavaScript')context.annotate.push({span:[tag.end,tag.end],replacement:' as const'});else if(asserted)context.erase.push({span:[tag.end,fields[0].initializer.end],replacement:''});
 const result=httpResourceResult(expectedType);if(['Ok','Err'].includes(tag.text)){
  if(!result||result.error!=='text'||httpResourceResultOwnsDisposal(expectedType))fail('Result construction needs a complete original String-error context and supported disposal rules');const wanted=tag.text==='Ok'?result.value:'text-owned',value=expression(fields[1].initializer,{expectedType:wanted,numberDomain:wanted==='i64'?'i64':null,level:level+1});if(value.type!==wanted)fail('the actual Result constructor must retain its complete contextual payload domain');httpResourceCallerRustType(expectedType);const roots=httpResourceValueRoots(value);return {kind:tag.text==='Ok'?'result-ok':'result-err',value,type:expectedType,root:roots[0]??null,roots};
 }
 const expected=httpResourceOption(expectedType);if(expectedType&&!expected)fail('the contextual domain must retain the actual Option carrier');
 if(tag.text==='None'){if(!expected||httpResourceResultOwnsDisposal(expectedType))fail('None needs a complete original closed Option type context');httpResourceCallerRustType(expectedType);return {kind:'option-none',type:expectedType,root:null,roots:[]};}
 const value=expression(fields[1].initializer,{expectedType:expected?.value??null,numberDomain:expected?.value==='i64'?'i64':null,level:level+1}),type=value.type==='text-owned'?'option-text':'optional:'+value.type,roots=httpResourceValueRoots(value);
 httpResourceCallerRustType(type);if(httpResourceResultOwnsDisposal(type)||expectedType&&expectedType!==type)fail('the complete checked Option payload must retain its contextual domain and supported disposal rules');return {kind:'option-some',value,type,root:roots[0]??null,roots};
}
