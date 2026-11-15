// Bounded lexical DATA only. No original-source, owner or executable authority.
import {types} from 'node:util';
import {rustTokens} from './rust-structure.mjs';
import {originalStaticSourceIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const ENTRY_LIMIT=16,SOURCE_CHAR_LIMIT=128000,TOKEN_LIMIT=32000,CELL_LIMIT=200000,CHAR_LIMIT=1000000;
const native=()=>originalStaticSourceIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged();
const fresh=tokens=>tokens.map(token=>({type:token.type,text:token.text,start:token.start,end:token.end}));
const observations=new WeakMap();
// Optional scalar diagnostics verify that tests exercise reuse and fallback.
// They neither retain source nor authenticate a profile or parse result.
export function staticRustTokenReaderFacts(reader){return observations.get(reader)?.()??null;}
export function createStaticRustTokenReader({diagnostics=false}={}){
 if(typeof diagnostics!=='boolean')throw new TypeError('Lexical diagnostics require a boolean');
 let entries=null,slots=0,cells=0,chars=0,hits=0,misses=0,fallbacks=0;
 const reader=function staticRustTokens(pin,source){
  if(!native()||typeof source!=='string'||source.length>SOURCE_CHAR_LIMIT||source[source.length-1]!=='\n'||!pin||typeof pin!=='object'||types.isProxy(pin)||Object.getPrototypeOf(pin)!==Object.prototype||!Object.isFrozen(pin)){if(diagnostics)fallbacks++;return rustTokens(source);}
  const field=Object.getOwnPropertyDescriptor(pin,'source');
  if(!field||!Object.hasOwn(field,'value')||field.value!==source){if(diagnostics)fallbacks++;return rustTokens(source);}
  const entry=entries?.get(pin);
  if(entry&&entry.source===source){
   if(diagnostics)hits++;
   // The complete original lexer ends an LF-terminated source with this test.
   // Preserve its native legacy RegExp state before the fresh macro walk.
   /\s/u.test('\n');return fresh(entry.tokens);
  }
  if(diagnostics)misses++;const tokens=rustTokens(source);
  if(!native()||tokens.length>TOKEN_LIMIT)return tokens;
  const entryCells=5+tokens.length*5;let entryChars=source.length;
  if(entryCells>CELL_LIMIT)return tokens;
  for(let at=0;at<tokens.length;at++)entryChars+=tokens[at].type.length+tokens[at].text.length;
  if(entryChars>CHAR_LIMIT)return tokens;
  // Store an independent private copy; callers keep the original mutable data.
  const stored=fresh(tokens);for(let at=0;at<stored.length;at++)Object.freeze(stored[at]);Object.freeze(stored);
  // Weak keys cannot retain unrelated caller data reachable from a pin.
  // Slot accounting stays conservative even when the collector removes keys.
  if(!entries||slots>=ENTRY_LIMIT||cells+entryCells>CELL_LIMIT||chars+entryChars>CHAR_LIMIT){entries=new WeakMap();slots=0;cells=0;chars=0;}
  entries.set(pin,{source,tokens:stored});slots++;cells+=entryCells;chars+=entryChars;/\s/u.test('\n');
  return tokens;
 };
 if(diagnostics)observations.set(reader,()=>Object.freeze({hits,misses,fallbacks,entries:slots,cells,chars,sourceAuthority:false}));
 return reader;
}
