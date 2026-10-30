// Actual String source literals only. This DATA adapter issues no authority.
import {requireScalarString} from '../extensions/string-iterator-runtime.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';
export function ownedVectorTextLiteral(ts,node){
 assertReverseConcreteSourceHost();if(!ts.isStringLiteral(node))throw new TypeError('Owned vector text requires an actual native string literal');
 const result={kind:'text',value:requireScalarString(node.text)};assertReverseConcreteSourceHost();return result;
}
export function ownedVectorTextValue(item){
 assertReverseConcreteSourceHost();if(item.kind!=='text')throw new TypeError('Owned vector text literal DATA differs');const value=requireScalarString(item.value);assertReverseConcreteSourceHost();return value;
}
export function emitOwnedVectorText(item,rust,borrowedStatic=false){
 const value=ownedVectorTextValue(item);if(!rust)return JSON.stringify(value);
 const escaped=value.replace(/[\\"\x00-\x1f\x7f]/gu,letter=>({'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'}[letter]??'\\u{'+letter.codePointAt(0).toString(16)+'}'));
 if(borrowedStatic)return '"'+escaped+'"';
 return '<::std::string::String as ::std::convert::From<&::std::primitive::str>>::from("'+escaped+'")';
}
