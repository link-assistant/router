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
 const rows=[],copies=[];let units=0;
 function record(node,file,value,copy=false){
  const comparison=!copy&&value?.kind==='binary'&&['===','!==','<','<=','>','>='].includes(value.op),domain=primitiveBitwiseType(comparison?value.left?.type:value?.type);if(!domain||value.root!==null||copy&&value.kind!=='variable'||!copy&&!comparison&&value.kind!=='primitive-bitwise-call'||comparison&&(value.type!=='bool'||value.left.root!==null||value.right.root!==null||value.right.type!==domain.name))fail('actual closed native scalar source operation required');if(rows.length+copies.length>=4096)fail('bounded complete native scalar source history required');const span=[node.getStart(file),node.end],source=node.getText(file);if(span[0]<0||span[1]>file.text.length||file.text.slice(...span)!==source||(units+=source.length)>2097152)fail('complete actual native scalar spans or history bound differ');return {kind:copy?'native-fixed-copy':comparison?'native-fixed-comparison':'native-fixed-bitwise',span,source,operation:copy?'Copy':comparison?value.op:value.operation,domain:domain.name,sourceAuthority:false,semanticAuthority:false};
 }
 return {rows,retain(node,file,value){rows.push(record(node,file,value));},retainCopy(node,file,value){if(value?.kind==='variable'&&primitiveBitwiseType(value.type)&&value.root===null)copies.push(record(node,file,value,true));},adoptCopies(){if(!rows.length)rows.push(...copies);}};
}
