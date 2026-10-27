// One function's chronological source-selection DATA. No owner/type permit.
import {primitiveBitwiseType,primitiveBitwiseLiteral} from './primitive-bitwise-types.mjs';
import {createChronologicalLocalSource} from './chronological-local-source.mjs';
const fail=message=>{throw new TypeError('Primitive local argument source: '+message);};
export function createPrimitiveLocalArgumentSource(rows,parameters,allParameters=new Set(parameters.keys())){
 if(!rows.some(row=>row.text==='let')||!primitiveLocalCensus(rows,allParameters))return null;
 return createChronologicalLocalSource(rows,parameters,{readOperand:readPrimitiveAliasOperand,initializerSizes:[1,2,3],aliasKind:'complete-immutable-primitive-alias',resultKind:'complete-selected-primitive-result-alias',acceptResult:event=>primitiveBitwiseType(event.returnsKind)?.name??null});
}

const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function primitiveLocalCensus(rows,parameters){
 if(rows.length>200000||rows.some(row=>['match','for'].includes(row.text)))return false;const names=new Set(parameters),protectedNames=new Set(['std','core','crate','self','Self','translation_core','translation_integer_core','Some','None','Option',...['u','i'].flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))]);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){const name=rows[at+1],next=rows[at+2];if(!ident(name)||['mut','ref','_'].includes(name.text)||!['=',':'].includes(next?.text)||names.has(name.text)||protectedNames.has(name.text)||++count>4096)return false;names.add(name.text);}return true;
}
export function readPrimitiveAliasOperand(rows,bindings){
 if(rows.length===1&&ident(rows[0])&&primitiveBitwiseType(bindings.get(rows[0].text)))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 if(rows.length===3&&primitiveBitwiseType(rows[0].text)&&rows[1].text==='::'&&['MIN','MAX'].includes(rows[2].text))return {kind:rows[0].text,binding:null};
 const negative=rows[0]?.text==='-',literal=rows[negative?1:0];if(rows.length!==(negative?2:1)||literal?.type!=='number'||literal.text.length>64)return null;const match=/^([0-9][0-9_]{0,62})([iu](?:8|16|32|64|128))$/u.exec(literal.text);if(!match)return null;const domain=primitiveBitwiseType(match[2]),digits=match[1].replaceAll('_','');if(!domain||negative&&!domain.signed||primitiveBitwiseLiteral(digits+'n',negative,domain.name)===null)return null;return {kind:domain.name,binding:null};
}
