// An actual written recursive signature is a typing obligation. Every original
// body must independently satisfy it before a whole module can be emitted.
export function captureHttpResourceRecursiveSignature(ts,item,file,language,imports=new Map()){
 const written=language==='TypeScript'?item.type:ts.getJSDocReturnType(item);if(!written)throw new TypeError('Every recursive helper requires its actual explicit return annotation');
 let domain=written.kind===ts.SyntaxKind.BooleanKeyword?'bool':written.kind===ts.SyntaxKind.BigIntKeyword?'u64':written.kind===ts.SyntaxKind.StringKeyword?'text-owned':written.kind===ts.SyntaxKind.NullKeyword||ts.isLiteralTypeNode(written)&&written.literal.kind===ts.SyntaxKind.NullKeyword?'unit':null;
 if(!domain){let cells=0;const actual=createHttpResourceWrittenAnnotationReader(ts,imports,()=>{if(++cells>4096)throw new TypeError('Complete recursive signature source bound');})(written);if(actual.kind==='domain'&&httpResourceOwnedSignatureDomain(actual.type))domain=actual.type;}if(!domain)throw new TypeError('Recursive helpers require a complete scalar or owned non-resource return domain');
 const span={start:written.getStart(file),end:written.end},source=file.text.slice(span.start,span.end),children=item.getChildren(file),close=children.filter(node=>node.kind===ts.SyntaxKind.CloseParenToken);
 if(close.length!==1)throw new TypeError('Actual native recursive signature parameter boundary required');let erase=null,annotate=null,javascriptAnnotation=null;
 if(language==='TypeScript'){const colon=children.filter(node=>node.kind===ts.SyntaxKind.ColonToken);if(colon.length!==1||colon[0].getStart(file)<close[0].end||colon[0].end>span.start)throw new TypeError('Actual native recursive return type boundary required');erase={span:[colon[0].getStart(file),written.end],replacement:''};const previous=ts.getJSDocReturnType(item);if(previous){if(previous.getText(file)!==source)javascriptAnnotation={span:[previous.getStart(file),previous.end],replacement:source};}else{const start=item.getStart(file);javascriptAnnotation={span:[start,start],replacement:'/** @returns {'+source+'} */\n'};}}
 else annotate={span:[close[0].end,close[0].end],replacement:': '+source};
 return {domain,span,source,erase,annotate,javascriptAnnotation,sourceAuthority:false,semanticAuthority:false};
}
export function httpResourceRecursivePrototype(plan){
 if(plan.lazy||plan.parameters.some(parameter=>!['str','bool','u64','json-ref','json-list-ref','bytes-ref'].includes(parameter.type)&&!httpResourceOwnedSignatureDomain(parameter.type)))throw new TypeError('Recursive helpers require synchronous immutable or owned non-resource inputs');
 return {javascriptName:plan.item.name.text,rustPath:plan.item.name.text,args:plan.parameters.map(parameter=>parameter.type),ret:plan.signature.domain,async:false,local:true,borrowedResult:false,rootArgument:null,rootArguments:[],release:null,releasedArguments:[],localRefusal:null,sourceAuthority:false,semanticAuthority:false};
}

import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
import {httpResourceOwnedSignatureDomain} from './http-resource-public-domains.mjs';
