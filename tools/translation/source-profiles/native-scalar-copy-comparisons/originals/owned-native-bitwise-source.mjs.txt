// Native syntax and carrier DATA only. The private complete-source checker must
// independently authenticate operand bindings, native types and the context.
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {joinOwnedNativeScalarOperands} from './owned-native-scalar-flow.mjs';
const fail=message=>{throw new TypeError('Owned native bitwise source: '+message);};
export function readOwnedNativeBitwiseExpression(ts,node,read,{enabled=false,compound=false}={}){
 if(enabled!==true||!ts.isBinaryExpression(node))return null;const pairs=compound?[[ts.SyntaxKind.AmpersandEqualsToken,'&'],[ts.SyntaxKind.BarEqualsToken,'|'],[ts.SyntaxKind.CaretEqualsToken,'^']]:[[ts.SyntaxKind.AmpersandToken,'&'],[ts.SyntaxKind.BarToken,'|'],[ts.SyntaxKind.CaretToken,'^']],operation=pairs.find(([kind])=>kind===node.operatorToken.kind)?.[1];if(!operation)return null;
 const left=read(node.left),right=read(node.right);joinOwnedNativeScalarOperands(left,right,true);const domain=primitiveBitwiseType(left.type);if(!domain||right.type!==domain.name||left.root!==null||right.root!==null)fail('identical actual root-free native integer operands required');return {kind:'primitive-bitwise-call',name:'primitiveBitwise',args:[left,right],operation,type:domain.name,bits:domain.bits,signed:domain.signed,root:null};
}
export function createOwnedNativeBitwiseHistory(){
 const rows=[];let units=0;return {rows,retain(node,file,value){
  if(rows.length>=4096||value?.kind!=='primitive-bitwise-call'||!primitiveBitwiseType(value.type))fail('bounded actual native operator history required');const span=[node.getStart(file),node.end],source=node.getText(file);if(span[0]<0||span[1]>file.text.length||file.text.slice(...span)!==source||(units+=source.length)>2097152)fail('complete actual native operator spans or history bound differ');rows.push({kind:'native-fixed-bitwise',span,source,operation:value.operation,domain:value.type,sourceAuthority:false,semanticAuthority:false});
 }};
}
