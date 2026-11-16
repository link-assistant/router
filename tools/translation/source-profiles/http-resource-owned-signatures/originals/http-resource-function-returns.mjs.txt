// Return annotations are original-source obligations over a freshly checked
// body. This module grants no type, ownership, source or namespace authority.
import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
const fail=message=>{throw new TypeError('Resource function return annotation: '+message);};
export function captureHttpResourceFunctionReturnAnnotation(ts,item,{language,file,imports,flow,lazy,erase}){
 if(language!=='TypeScript'||!item.type)return null;if(item.getSourceFile()!==file||lazy||!Array.isArray(erase))fail('actual synchronous original TypeScript function and target sink required');
 const written=item.type,domain=flow.type,primitive=written.kind===ts.SyntaxKind.StringKeyword?['str','text-owned'].includes(domain):written.kind===ts.SyntaxKind.BooleanKeyword?domain==='bool':written.kind===ts.SyntaxKind.BigIntKeyword?domain==='u64':ts.isLiteralTypeNode(written)&&written.literal.kind===ts.SyntaxKind.NullKeyword?domain==='unit':false;
 if(!primitive){let cells=0;const tick=()=>{if(++cells>4096)fail('complete written return source-cell bound');},actual=createHttpResourceWrittenAnnotationReader(ts,imports,tick)(written);if(actual.kind!=='domain'||actual.type!==domain)fail('written return must preserve the actual complete inferred native domain');}
 const children=item.getChildren(file),close=children.filter(child=>child.kind===ts.SyntaxKind.CloseParenToken),colon=children.filter(child=>child.kind===ts.SyntaxKind.ColonToken);if(close.length!==1||colon.length!==1||colon[0].getStart(file)<close[0].end||colon[0].end>written.getStart(file))fail('actual native function return annotation boundary required');
 const span=[colon[0].getStart(file),written.end];erase.push({span,replacement:''});return {domain,span,original:file.text.slice(span[0],span[1]),sourceAuthority:false,semanticAuthority:false};
}
