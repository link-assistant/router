import { rustTokens } from '../rust-structure.mjs';
import { tokenize } from '../vendor/meta-language/translation/lexer.js';
import { TranslationError } from '../vendor/meta-language/translation/diagnostics.js';
import {decodeRustCharacter} from './rust-character.mjs';
import {decodeRustInteger} from './rust-number.mjs';
import {decodeRustFloat,isRustFloatToken} from './rust-float.mjs';
import {decodeRustByteCharacter} from './rust-byte-character.mjs';
import {types} from 'node:util';

// Only this tokenizer creates the original-byte association. The returned
// snapshot is immutable; copying an array cannot copy its private identity.
const tokenSources=new WeakMap();
function tokenSnapshot(tokens) {
  if(!Array.isArray(tokens)||types.isProxy(tokens)||Object.getPrototypeOf(tokens)!==Array.prototype)throw new TypeError('source links: expected original tokenizer tokens');
  const descriptors=Object.getOwnPropertyDescriptors(tokens),keys=Reflect.ownKeys(descriptors),length=descriptors.length?.value;
  if(!Number.isSafeInteger(length)||keys.length!==length+1)throw new TypeError('source links: changed tokenizer array');
  const result=[];
  for(let index=0;index<length;index++) {
    const descriptor=descriptors[index];if(!descriptor||!('value' in descriptor))throw new TypeError('source links: changed tokenizer array');
    const token=descriptor.value;if(!token||types.isProxy(token)||Object.getPrototypeOf(token)!==Object.prototype)throw new TypeError('source links: changed tokenizer token');
    const fields=Object.getOwnPropertyDescriptors(token),copy={};
    for(const key of Reflect.ownKeys(fields)) {
      const field=fields[key];if(typeof key!=='string'||!field.enumerable||!('value' in field)||!['string','number','boolean','undefined'].includes(typeof field.value)&&field.value!==null)throw new TypeError('source links: changed tokenizer token fields');
      Object.defineProperty(copy,key,{value:field.value,enumerable:true});
    }
    result.push(Object.freeze(copy));
  }
  return Object.freeze(result);
}
export function capturedRustTokenSource(tokens) {
  const captured=tokenSources.get(tokens);if(!captured)return null;
  const actual=tokenSnapshot(tokens);
  if(JSON.stringify(actual)!==JSON.stringify(captured.tokens))throw new TypeError('source links: tokenizer tokens changed before parsing');
  return captured;
}

// Adapt written integer, character and string payloads to the pinned token
// vocabulary. Every token is mapped back to original source coordinates;
// the structural meta IR preserves the original source text.
export function tokenizeRust(source) {
  const replacements = [],characters=new Map(),numbers=new Map();
  const originalTokens=rustTokens(source);
  for (let index=0;index<originalTokens.length;index++) {
    let token=originalTokens[index];
    const character=originalTokens[index+1];
    if(token.type==='ident'&&token.text==='b'&&character?.type==='string'&&character.text.startsWith("'")&&character.start===token.end){
      const end=character.end,raw=source.slice(token.start,end),suffix=originalTokens[index+2];
      if(suffix?.start===end&&['ident','number'].includes(suffix.type))throw new TranslationError('syntax','Rust byte character literals do not accept a suffix',{start:token.start,end:suffix.end});
      numbers.set(token.start,{...decodeRustByteCharacter(raw,{start:token.start,end}),end});
      replacements.push({start:token.start,end,text:'0'});index++;continue;
    }
    if(token.type==='number'){
      // Rust's trailing decimal point cannot precede '.', '_' or XID_Start.
      // Consume only an adjacent actual dot; ranges and method calls stay intact.
      const next=originalTokens[index+1],point=next?source.codePointAt(next.end):undefined,after=point===undefined?'':String.fromCodePoint(point);
      if(/^[0-9][0-9_]*$/u.test(token.text)&&next?.text==='.'&&next.start===token.end&&after!=='.'&&after!=='_'&&!/[\p{ID_Start}]/u.test(after??'')) {
        token={...token,text:token.text+'.',end:next.end};index++;
      }
      const decode=isRustFloatToken(token.text)?decodeRustFloat:decodeRustInteger;
      numbers.set(token.start,{...decode(token.text,{start:token.start,end:token.end}),end:token.end});
      replacements.push({start:token.start,end:token.end,text:'0'});continue;
    }
    if (token.type !== 'string') continue;
    if(token.text.startsWith("'")){const value=decodeRustCharacter(token.text,{start:token.start,end:token.end});characters.set(token.start,{value,raw:token.text,end:token.end});replacements.push({start:token.start,end:token.end,text:'"\\u{'+value.codePointAt(0).toString(16)+'}"'});continue;}
    const raw = /^r(#{0,})"([\s\S]*)"\1$/u.exec(token.text);
    let replacement;
    if (raw) {
      if (/\r(?!\n)/u.test(raw[2])) throw new TranslationError('syntax', 'bare carriage return in Rust raw string', { start: token.start, end: token.end });
      replacement = JSON.stringify(raw[2].replace(/\r\n/gu, '\n'));
    }
    else if (token.text.startsWith('"')) {
      replacement = '"';
      for (let at = 1; at < token.text.length - 1; at++) {
        const char = token.text[at];
        if (char === '\r') {
          if (token.text[at + 1] !== '\n') throw new TranslationError('syntax', 'bare carriage return in Rust string', { start: token.start + at, end: token.start + at + 1 });
          replacement += '\n'; at++; continue;
        }
        if (char !== '\\') { replacement += char; continue; }
        const next = token.text[++at];
        if (next === '\n' || (next === '\r' && token.text[at + 1] === '\n')) {
          while (/[ \t\r\n]/u.test(token.text[at + 1] ?? '')) at++;
        } else if (next === 'x' && /^[0-7][0-9a-fA-F]$/u.test(token.text.slice(at + 1, at + 3))) {
          replacement += `\\u{${token.text.slice(at + 1, at + 3)}}`;
          at += 2;
        } else replacement += '\\' + next;
      }
      replacement += '"';
    }
    if (replacement !== undefined && replacement !== token.text) replacements.push({ start: token.start, end: token.end, text: replacement });
  }
  const starts = [], ends = [];
  let normalized = '';
  let offset = 0;
  const appendPlain = stop => {
    for (; offset < stop; offset++) { normalized += source[offset]; starts.push(offset); ends.push(offset + 1); }
  };
  for (const replacement of replacements) {
    appendPlain(replacement.start);
    normalized += replacement.text;
    for (let index = 0; index < replacement.text.length; index++) { starts.push(replacement.start); ends.push(replacement.end); }
    offset = replacement.end;
  }
  appendPlain(source.length);
  let parsed;
  try { parsed = tokenize(normalized, 'Rust'); }
  catch (error) {
    if (!(error instanceof TranslationError) || !error.span) throw error;
    throw new TranslationError(error.kind, error.reason, { start: starts[error.span.start] ?? source.length, end: ends[error.span.end - 1] ?? source.length }, error.details);
  }
  // Preserve source qualification, including const fn. Eligibility is checked
  // by the semantic frontend rather than erased during lexical normalization.
  const tokens=parsed.tokens.flatMap(token => {
    const start=starts[token.start]??source.length,end=ends[token.end-1]??source.length,character=characters.get(start),number=numbers.get(start);
    if(number&&number.end===end)return {...token,...number,start,end};
    // Rust permits the joint punctuation `>=` to close a generic type and
    // introduce its initializer. Keep both original coordinates; expression
    // parsing rejoins only the adjacent written comparison punctuators.
    if(token.kind==='punct'&&token.value==='>=')return [{...token,value:'>',start,end:start+1},{...token,value:'=',start:start+1,end}];
    return character&&character.end===end?{...token,kind:'rustChar',value:character.value,raw:character.raw,start,end}:{...token,start,end};
  });
  tokenSources.set(tokens,Object.freeze({source,tokens:tokenSnapshot(tokens)}));
  return tokens;
}
