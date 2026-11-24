// Character literals are one Unicode scalar; lifetimes and byte literals differ.
// https://doc.rust-lang.org/reference/tokens.html#character-literals
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
export function decodeRustCharacter(raw,span) {
  const fail=()=>{throw new TranslationError('syntax','requires a valid single Rust Unicode scalar character literal',span);};
  if(!raw.startsWith("'")||!raw.endsWith("'"))return fail();
  const content=raw.slice(1,-1);let value;
  if(!content.startsWith('\\')){if(/[\n\r\t'\\]/u.test(content))return fail();value=content;}
  else if(Object.hasOwn({"\\'":"'",'\\"':'"','\\n':'\n','\\r':'\r','\\t':'\t','\\\\':'\\','\\0':'\0'},content))value={"\\'":"'",'\\"':'"','\\n':'\n','\\r':'\r','\\t':'\t','\\\\':'\\','\\0':'\0'}[content];
  else if(/^\\x[0-7][0-9a-fA-F]$/u.test(content))value=String.fromCodePoint(Number.parseInt(content.slice(2),16));
  else if(/^\\u\{(?:[0-9a-fA-F]_*){1,6}\}$/u.test(content)){const code=Number.parseInt(content.slice(3,-1).replaceAll('_',''),16);if(code>0x10ffff||code>=0xd800&&code<=0xdfff)return fail();value=String.fromCodePoint(code);}
  else return fail();
  if(Array.from(value).length!==1||/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))return fail();
  return value;
}
