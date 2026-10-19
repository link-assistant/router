// Conservative binding evidence, never macro expansion. Textual ordering and
// path scope require further resolution before any matching built-in dispatch.
// https://doc.rust-lang.org/reference/macros-by-example.html#scoping-exporting-and-importing
// https://doc.rust-lang.org/reference/items/use-declarations.html
import {rustTokens} from './rust-structure.mjs';
const builtins=new Set(['vec','format','format_args','panic','unreachable','unimplemented','todo','assert','assert_eq','assert_ne','matches','println','print','eprintln','eprint','dbg','write','writeln','include','include_str','include_bytes','concat','env','option_env','file','line','column','module_path','stringify','thread_local']);
const name=token=>token?.type==='ident' && /^[\p{L}_][\p{L}\p{N}_]*$/u.test(token.text);
const range=(first,last=first)=>({start:first.start,end:last.end});
const freeze=value=>{if(value && typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function identifiers(tokens) {
  const normalized=[];
  for(let index=0;index<tokens.length;index++) {
    const first=tokens[index],hash=tokens[index+1],last=tokens[index+2];
    if(first.text==='r' && hash?.text==='#' && name(last) && first.end===hash.start && hash.end===last.start) {
      normalized.push({...last,start:first.start,rawIdentifier:true});index+=2;
    } else normalized.push(first);
  }
  return normalized;
}
function useBindings(tokens,start,record,unresolved) {
  let index=start+1;
  const peek=()=>tokens[index],eat=text=>peek()?.text===text?tokens[index++]:null;
  const identifier=()=>{if(!name(peek()))throw new Error('unresolved use binding syntax');return tokens[index++];};
  const tree=prefix=>{
    if(eat('{')) {
      while(peek()?.text!=='}') {if(!peek())throw new Error('unclosed use group');tree(prefix);if(!eat(','))break;}
      if(!eat('}'))throw new Error('unclosed use group');return;
    }
    const glob=eat('*');if(glob){unresolved('glob import requires macro and prelude namespace resolution',range(glob));return;}
    const segment=identifier(),path=[...prefix,segment.text];
    if(eat('::')){tree(path);return;}
    const alias=eat('as')?identifier():null;
    const bound=alias?.text ?? (segment.text==='self'?prefix.at(-1):segment.text);
    if(bound && bound!=='_')record(bound,range(alias??segment),'use-binding');
  };
  eat('::');tree([]);
  if(!eat(';'))throw new Error('use declaration requires a resolved terminator');
  return index-1;
}
export function macroProvenance(source) {
  if(typeof source!=='string')throw new TypeError('Macro provenance requires original Rust source text');
  const shadowed=new Set(),imported=new Set(),diagnostics=[];let unresolvedImportScope=false;
  const unresolved=(message,span)=>{unresolvedImportScope=true;diagnostics.push({kind:'unresolved-macro-scope',message,span});};
  const record=(binding,span,kind)=>{
    if(kind==='use-binding'){imported.add(binding);if(!builtins.has(binding))return;}
    shadowed.add(binding);diagnostics.push({kind,message:`${binding} requires resolved source macro provenance`,span});
  };
  let tokens;
  try {tokens=identifiers(rustTokens(source).filter(token=>token.type!=='comment'));}
  catch(error){unresolved(`Rust lexical evidence unavailable: ${error.message}`,error.span??{start:0,end:source.length});tokens=[];}
  for(let index=0;index<tokens.length;index++) {
    const token=tokens[index];
    if(token.text==='#' && (tokens[index+1]?.text==='[' || tokens[index+1]?.text==='!' && tokens[index+2]?.text==='[')) {
      let end=index+(tokens[index+1].text==='!'?2:1),depth=0,macroUse=false;
      for(;end<tokens.length;end++) {
        const current=tokens[end];if(current.text==='[')depth++;if(current.text===']' && --depth===0)break;
        if(current.type==='ident' && current.text==='macro_use')macroUse=true;
      }
      if(macroUse)unresolved('macro_use attribute requires imported macro scope resolution',range(token,tokens[Math.min(end,tokens.length-1)]));
      index=Math.min(end,tokens.length-1);continue;
    }
    if(token.rawIdentifier)continue;
    let bindingIndex;
    if(token.text==='macro_rules!')bindingIndex=index+1;
    else if(token.text==='macro_rules' && tokens[index+1]?.text==='!')bindingIndex=index+2;
    else if(token.text==='macro')bindingIndex=index+1;
    if(bindingIndex!=null) {
      const binding=tokens[bindingIndex];
      if(name(binding))record(binding.text,range(token,binding),'macro-definition');
      else unresolved('macro definition has an unresolved binding name',range(token));
      continue;
    }
    if(token.text==='use') {
      try {index=useBindings(tokens,index,record,unresolved);}
      catch(error){unresolved(error.message,range(token));}
    }
  }
  return freeze({shadowedNames:[...shadowed].sort(),importedNames:[...imported].sort(),unresolvedImportScope,diagnostics});
}
