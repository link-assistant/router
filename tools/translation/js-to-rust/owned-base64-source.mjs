// Finite public-ABI equations only. These rows issue no source/import permit;
// the private original-source checker must freshly resolve every selected use.
const fail=message=>{throw TypeError('Owned reverse base64: '+message);};
const rows=[
 ['standard_encode_bytes','bytes-ref','borrow'],['standard_encode_text','str','borrow'],['standard_encode_owned_bytes','bytes-ref','to_vec'],['standard_no_pad_encode_text','str','borrow'],
 ['url_no_pad_encode_bytes','bytes-ref','borrow'],['url_no_pad_encode_owned_bytes','bytes-ref','to_vec'],['url_no_pad_encode_owned_text','str','to_owned'],['url_no_pad_encode_array32','bytes-ref','array32'],
 ['standard_decode_text','str','borrow'],['standard_decode_owned_text','str','to_owned'],['standard_no_pad_decode_text','str','borrow'],['url_no_pad_decode_text','str','borrow'],['url_no_pad_decode_owned_text','str','to_owned'],
];
const contracts=Object.freeze(rows.map(([name,input,copy])=>Object.freeze({name:'router_core_base64_'+name,rust:'base64_'+name,input,copy,ret:name.includes('_decode_')?'base64-result':'text-owned'})));
const display=Object.freeze({name:'base64ErrorText',rust:null,input:'base64-error-ref',copy:'borrow',ret:'text-owned'});
export function ownedBase64Operation(name){return contracts.find(row=>row.name===name)??(name===display.name?display:null);}
export const ownedBase64Result=type=>type==='base64-result';
export const ownedBase64Compatible=(actual,wanted)=>actual===wanted||actual==='text-owned'&&wanted==='str';
export const ownedBase64RustTypes=Object.freeze({'bytes-ref':"&'a [u8]",'text-owned':'::std::string::String','base64-result':'::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error>','base64-error-ref':"&'a crate::translation_core::Base64Error"});
export const ownedBase64TypeScriptTypes=Object.freeze({'bytes-ref':'readonly bigint[]','text-owned':'string','base64-result':'Base64Result','base64-error-ref':'Base64Error'});
/** Source-only syntactic DATA: actual symbol/endpoint selection stays private. */
export function ownedBase64ReadonlyOctets(ts,type){
 const unwrap=node=>{let depth=0;while(ts.isParenthesizedTypeNode(node)){if(++depth>64)fail('written byte type grouping bound');node=node.type;}return node;};type=unwrap(type);if(!ts.isTypeOperatorNode(type)||type.operator!==ts.SyntaxKind.ReadonlyKeyword)return false;const array=unwrap(type.type);return ts.isArrayTypeNode(array)&&unwrap(array.elementType).kind===ts.SyntaxKind.BigIntKeyword;
}
/** One already-bound original operand, never a caller-supplied Rust program. */
export function ownedBase64RustCall(name,argument){
 const op=ownedBase64Operation(name);if(!op||typeof argument!=='string'||!/^__ro_arg_[0-9]+$/u.test(argument))fail('fixed operation and bound operand required');
 if(name==='base64ErrorText')return '::std::format!("{}", '+argument+')';
 const bound='assert!('+argument+'.len() <= 1048576, "owned reverse base64 input bound"); ';
 const value=op.copy==='to_vec'?argument+'.to_vec()':op.copy==='to_owned'?argument+'.to_owned()':op.copy==='array32'?'::core::convert::TryInto::<[u8; 32]>::try_into('+argument+').expect("owned reverse base64 array32 length")':argument;
 return '{ '+bound+'crate::translation_core::'+op.rust+'('+value+') }';
}
