// Return annotations are original-source obligations over a freshly checked
// body. This module grants no type, ownership, source or namespace authority.
import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
import {resolveHttpResourceTypeAlias} from './http-resource-type-aliases.mjs';
const fail=message=>{throw new TypeError('Resource function return annotation: '+message);};
export function captureHttpResourceFunctionReturnAnnotation(ts,item,{language,file,imports,aliases=null,coldTypeCurrent=null,flow,lazy,erase}){
 const written=language==='TypeScript'?item.type:ts.getJSDocReturnType(item);if(!written)return null;if(item.getSourceFile()!==file||!Array.isArray(erase))fail('actual original native function and target sink required');
 const resolved=resolveHttpResourceTypeAlias(ts,written,aliases),domain=flow.type,primitive=resolved.kind===ts.SyntaxKind.StringKeyword?['str','text-owned'].includes(domain):resolved.kind===ts.SyntaxKind.BooleanKeyword?domain==='bool':resolved.kind===ts.SyntaxKind.BigIntKeyword?domain==='u64':ts.isLiteralTypeNode(resolved)&&resolved.literal.kind===ts.SyntaxKind.NullKeyword?domain==='unit':false;
 if(lazy||!primitive){let cells=0;const tick=()=>{if(++cells>4096)fail('complete written return source-cell bound');},actual=createHttpResourceWrittenAnnotationReader(ts,imports,tick,{aliases,coldTypeCurrent})(written),value=lazy?actual.kind==='future'?actual.value:null:actual;if(value?.kind!=='domain'||value.type!==domain)fail('written return must preserve the actual complete inferred native value or cold future domain');}
 if(language==='JavaScript'){const span=[written.getStart(file),written.end];return {domain,span,original:file.text.slice(...span),sourceAuthority:false,semanticAuthority:false};}
 const children=item.getChildren(file),close=children.filter(child=>child.kind===ts.SyntaxKind.CloseParenToken),colon=children.filter(child=>child.kind===ts.SyntaxKind.ColonToken);if(close.length!==1||colon.length!==1||colon[0].getStart(file)<close[0].end||colon[0].end>written.getStart(file))fail('actual native function return annotation boundary required');
 const span=[colon[0].getStart(file),written.end];erase.push({span,replacement:''});return {domain,span,original:file.text.slice(span[0],span[1]),sourceAuthority:false,semanticAuthority:false};
}
