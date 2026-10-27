// Original written-type obligations only. Values and whole source still check.
import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
import {resolveHttpResourceTypeAlias,expandHttpResourceTypeAliasSource} from './http-resource-type-aliases.mjs';
const fail=message=>{throw new TypeError('Resource original local annotation: '+message);};
function requireContext(node,context){if(!context||node.getSourceFile()!==context.file||!Array.isArray(context.erase))fail('complete original native annotation context required');}
function read(ts,written,imports,context,tick,numericDomain){return createHttpResourceWrittenAnnotationReader(ts,imports,tick,{aliases:context.aliases,coldTypeCurrent:context.coldTypeCurrent,numericDomain})(written);}
function requireType(ts,written,type,imports,context,tick){
 const resolved=resolveHttpResourceTypeAlias(ts,written,context.aliases,tick),primitive=resolved.kind===ts.SyntaxKind.StringKeyword?['str','text-owned'].includes(type):resolved.kind===ts.SyntaxKind.BigIntKeyword?['u64','i64'].includes(type):resolved.kind===ts.SyntaxKind.BooleanKeyword?type==='bool':ts.isLiteralTypeNode(resolved)&&resolved.literal.kind===ts.SyntaxKind.NullKeyword?type==='unit':false;
 if(primitive)return;const actual=read(ts,written,imports,context,tick,type);if(actual.kind!=='domain'||actual.type!==type)fail('written type must preserve the complete independently checked native value domain');
}
function docSource(ts,written,context){
 const expanded=expandHttpResourceTypeAliasSource(ts,written,{file:context.file,aliases:context.aliases??new Map()}),file=ts.createSourceFile('original-local-doc.mts','type LocalDoc = '+expanded+';',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(file.parseDiagnostics.length||file.statements.length!==1||!ts.isTypeAliasDeclaration(file.statements[0]))fail('complete expanded original local JSDoc type required');const text=ts.createPrinter({removeComments:true}).printNode(ts.EmitHint.Unspecified,file.statements[0].type,file).replace(/\s+/gu,' ').trim();if(!text||text.length>65536||text.includes('/*')||text.includes('*/'))fail('bounded original local JSDoc type required');return text;
}
function retainDoc(ts,written,context){if(context.language!=='TypeScript'||!context.aliases?.size)return;const span=[written.getStart(context.file),written.end],replacement=docSource(ts,written,context),previous=context.erase.find(row=>row.span[0]===span[0]&&row.span[1]===span[1]);if(previous){if(previous.replacement!==replacement)fail('one original doc span cannot acquire differing target spellings');return;}context.erase.push({span,replacement});}
export function httpResourceWrittenNumericDomain(ts,written,owner,imports,context,tick,fallback=null){
 if(!written)return fallback;requireContext(owner,context);const actual=read(ts,written,imports,context,tick,fallback);return actual.kind==='domain'&&['u64','i64'].includes(actual.type)?actual.type:fallback;
}
export function httpResourceLocalNumericDomain(ts,declaration,imports,context,tick,fallback=null){return httpResourceWrittenNumericDomain(ts,declaration.type??ts.getJSDocType(declaration),declaration,imports,context,tick,fallback);}
export function captureHttpResourceLocalAnnotation(ts,declaration,type,imports,context,tick){
 const annotation=declaration.type,doc=ts.getJSDocType(declaration);if(!annotation&&!doc)return;requireContext(declaration,context);
 if(annotation){
  if(context.language!=='TypeScript'||!ts.isIdentifier(declaration.name)||!declaration.initializer)fail('actual original TypeScript scalar or owned local declaration required');requireType(ts,annotation,type,imports,context,tick);const text=docSource(ts,annotation,context);
  context.erase.push({span:[declaration.name.end,annotation.end],replacement:''},{span:[declaration.initializer.getStart(context.file),declaration.initializer.getStart(context.file)],replacement:'/** @type {'+text+'} */ ('},{span:[declaration.initializer.end,declaration.initializer.end],replacement:')'});
 }
 if(doc){requireType(ts,doc,type,imports,context,tick);retainDoc(ts,doc,context);}
}
export function captureHttpResourceParenthesizedDoc(ts,node,type,imports,context,tick){const written=ts.getJSDocType(node);if(!written)return;requireContext(node,context);requireType(ts,written,type,imports,context,tick);retainDoc(ts,written,context);}
export function isHttpResourceTypeWrapper(ts,node){return ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node);}
export function httpResourceAssertionNumericDomain(ts,node,imports,context,tick,fallback=null){
 requireContext(node,context);if(context.language!=='TypeScript')fail('type-only value wrappers require actual TypeScript source');return httpResourceWrittenNumericDomain(ts,node.type,node,imports,context,tick,fallback);
}
export function captureHttpResourceTypeWrapper(ts,node,type,imports,context,tick){
 requireContext(node,context);if(context.language!=='TypeScript'||!isHttpResourceTypeWrapper(ts,node))fail('actual complete TypeScript value wrapper required');
 if(!node.type){if(type==='unit'||type.startsWith('optional:')||type==='option-text')fail('non-null assertion cannot change an actual nullable native value');context.erase.push({span:[node.expression.end,node.end],replacement:''});return;}
 requireType(ts,node.type,type,imports,context,tick);const prefix='/** @type {'+docSource(ts,node.type,context)+'} */ (';
 if(ts.isTypeAssertionExpression(node))context.erase.push({span:[node.getStart(context.file),node.expression.getStart(context.file)],replacement:prefix},{span:[node.end,node.end],replacement:')'});
 else context.erase.push({span:[node.getStart(context.file),node.getStart(context.file)],replacement:prefix},{span:[node.expression.end,node.end],replacement:')'});
}

// Shared source-obligation helpers; neither result is executable authority.
export {requireType as requireHttpResourceWrittenValueType,docSource as httpResourceWrittenDocSource};
