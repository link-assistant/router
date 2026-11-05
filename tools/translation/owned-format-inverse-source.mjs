// Native syntax candidates only. Fresh whole original/project reproduction
// remains mandatory; no annotation or syntax row grants Display authority.
import {floatingScalarType} from './body-inverse-source-support.mjs';
import {emitForwardLensRustString} from './js-to-rust/forward-string-lens-targets.mjs';
export function ownedFormatSourceScalarType(type){
 if(floatingScalarType(type))return true;
 return !!type&&type.kind==='string'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&(type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'||typeof type.patternOwnershipRefusal==='string'&&type.patternOwnershipRefusal.startsWith('owned String'));
}
export function lowerOwnedFormatSource(ts,node,scope,read){
 const fail=message=>{throw new TypeError('Owned format inverse source: '+message);};let work=0;
 const unwrap=value=>{let groups=0;while(ts.isParenthesizedExpression(value)){if(++groups>16)fail('complete format grouping bound');value=value.expression;}return value;};
 const stringCall=value=>{value=unwrap(value);return ts.isCallExpression(value)&&ts.isIdentifier(value.expression)&&value.expression.text==='String'&&!scope.has('String')?value:null;};
 const root=unwrap(node),direct=stringCall(root);
 if(direct){if(direct.questionDotToken||direct.typeArguments?.length||direct.arguments.length!==1||direct.arguments.some(ts.isSpreadElement))fail('one complete actual primitive String argument required');return 'crate::translation_core::format!("{}", '+read(direct.arguments[0])+')';}
 if(!ts.isBinaryExpression(root)||root.operatorToken.kind!==ts.SyntaxKind.PlusToken)return null;
 const pieces=[];const collect=(value,depth=0)=>{if(++work>4096||depth>64)fail('complete concatenation source bound');value=unwrap(value);if(ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.PlusToken)return collect(value.left,depth+1)&&collect(value.right,depth+1);if(ts.isStringLiteral(value)){pieces.push({text:value.text});return true;}const call=stringCall(value);if(!call)return false;if(call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||call.arguments.some(ts.isSpreadElement))fail('one complete actual concatenated primitive conversion required');pieces.push({argument:read(call.arguments[0])});return true;};
 if(!collect(root))return null;let template='';const args=[];for(const piece of pieces){if(Object.hasOwn(piece,'text'))template+=piece.text.replace(/\{/gu,'{{').replace(/\}/gu,'}}');else{template+='{}';args.push(piece.argument);}}
 return 'crate::translation_core::format!('+emitForwardLensRustString(template)+(args.length?', '+args.join(', '):'')+')';
}
