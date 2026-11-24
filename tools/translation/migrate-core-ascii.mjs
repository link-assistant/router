// Explicit source adoption of ASCII byte predicates, not generic Iterator proof.
// The existing scalar selector supplies complete source/owner/typed-position
// boundaries. This pass independently checks every replaced callback and binder.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {proposeCoreScalarsCorpus} from './migrate-core-scalars.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {decodeRustByteCharacter} from './extensions/rust-byte-character.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',STR='&'+C+'Str';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned ASCII adoption: '+message);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function close(rows,start){const stack=[],pairs={'(':')','[':']','{':'}'};for(let at=start;at<rows.length;at++){const word=rows[at].text;if(['string','char','comment'].includes(rows[at].type))continue;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;}
function split(rows,separator){const result=[];let begin=0;for(let at=0;at<rows.length;at++){if(['(','[','{'].includes(rows[at].text)){at=close(rows,at);if(at<0)return null;}else if(rows[at].text===separator){result.push(rows.slice(begin,at));begin=at+1;}}result.push(rows.slice(begin));return result;}
const ranges={is_ascii_alphabetic:[[65,90],[97,122]],is_ascii_alphanumeric:[[48,57],[65,90],[97,122]],is_ascii_lowercase:[[97,122]],is_ascii_uppercase:[[65,90]],is_ascii_digit:[[48,57]],is_ascii_hexdigit:[[48,57],[65,70],[97,102]],is_ascii_graphic:[[33,126]],is_ascii:[[0,127]]};
function alphabet(rows,name){
 if(!rows.length)return null;
 if(rows[0].text==='('&&close(rows,0)===rows.length-1)return alphabet(rows.slice(1,-1),name);
 const terms=split(rows,'||');if(!terms||terms.length>64)return null;
 if(terms.length>1){const values=terms.map(term=>alphabet(term,name));if(values.some(value=>value===null))return null;return new Set(values.flatMap(value=>[...value]));}
 const words=rows.map(row=>row.text),bytes=new Set();
 if(words.length===5&&words[0]===name&&words[1]==='.'&&Object.hasOwn(ranges,words[2])&&words[3]==='('&&words[4]===')'){
  for(const [first,last]of ranges[words[2]])for(let byte=first;byte<=last;byte++)bytes.add(byte);return bytes;
 }
 // A byte literal is decoded by the independent Rust literal grammar, never
 // JavaScript eval or a regex interpretation of its spelling.
 if(words.length===4&&words[0]===name&&words[1]==='=='&&words[2]==='b'&&rows[2].end===rows[3].start){
  try{const value=decodeRustByteCharacter(words[2]+words[3],{start:rows[2].start,end:rows[3].end}),byte=Number(value.value);if(!Number.isInteger(byte)||byte<0||byte>127)return null;bytes.add(byte);return bytes;}catch{return null;}
 }
 return null;
}
function literal(bytes){return '"'+[...bytes].sort((a,b)=>a-b).map(byte=>byte===34?'\\"':byte===92?'\\\\':byte<32||byte===127?'\\x'+byte.toString(16).padStart(2,'0'):String.fromCharCode(byte)).join('')+'"';}
function select(source,item){
 const rows=item.tokens.filter(row=>row.type!=='comment'),fn=rows.findIndex(row=>row.text==='fn'),open=fn+2,end=close(rows,open),bindings=new Set();
 if(rows[open]?.text!=='('||end<0)return {edits:[],reason:'ordinary source parameters required'};
 const parameters=split(rows.slice(open+1,end),',');if(!parameters)return {edits:[],reason:'balanced source parameters required'};
 for(const part of parameters){if(!part.length)continue;if(!ident(part[0])||part[1]?.text!==':')return {edits:[],reason:'ordinary source parameter binders required'};if(part.slice(2).map(row=>row.text).join('')===STR)bindings.add(part[0].text);}
 let body=end+1;while(body<rows.length&&rows[body].text!=='{')body++;if(close(rows,body)!==rows.length-1)return {edits:[],reason:'complete function body required'};
 const edits=[],callbacks=[];
 for(let at=body+1;at+10<rows.length;at++){
  if(!ident(rows[at])||!bindings.has(rows[at].text)||['.','::','#'].includes(rows[at-1]?.text)||!['.','bytes','(',')','.','all','(','|'].every((word,index)=>rows[at+index+1]?.text===word))continue;
  const name=rows[at+9],last=close(rows,at+7);if(!ident(name)||rows[at+10]?.text!=='|'||last<0)return {edits:[],reason:'ordinary complete byte callback required'};
  const set=alphabet(rows.slice(at+11,last),name.text);if(set===null)return {edits:[],reason:'byte callback is outside finite ASCII predicate grammar'};
  const span=[rows[at].start,rows[last].end];if(item.tokens.some(token=>token.type==='comment'&&token.start>=span[0]&&token.end<=span[1]))return {edits:[],reason:'replaced predicate contains retained comments'};
  const expected=source.slice(...span),alphabetSource=literal(set);edits.push({span,expected,replacement:C+'ascii_chars_in('+rows[at].text+', '+alphabetSource+')',receiver:rows[at].text,alphabet:[...set].sort((a,b)=>a-b),callback:{name:name.text,span:[rows[at+8].start,rows[last].start],source:source.slice(rows[at+8].start,rows[last].start)}});callbacks.push([at+8,last]);at=last;
 }
 if(!edits.length)return {edits};
 // No unobserved callback may bind a selected parameter. Original let scope
 // enters after its initializer; this deliberately refuses all same-name lets.
 for(let at=body+1;at<rows.length;at++){
  if(callbacks.some(([first,last])=>at>=first&&at<last))continue;
  const word=rows[at].text;
  if(['|','||','for','while','loop','match','fn','const','static','type','struct','enum','union','trait','impl','mod','use','extern','macro','macro_rules!','#'].includes(word))return {edits:[],reason:'other binder, loop, item or producer remains unclosed'};
  if(word==='let'){
   let next=at+1;if(rows[next]?.text==='mut')next++;
   if(!ident(rows[next])||bindings.has(rows[next].text)||!['=',':'].includes(rows[next+1]?.text))return {edits:[],reason:'unknown or shadowing local pattern'};
  }
  const macro=word.endsWith('!')&&word!=='!'||word==='!'&&ident(rows[at-1])&&['(','[','{'].includes(rows[at+1]?.text);
  if(macro){const name=word==='!'?at-1:at,qualified=rows.slice(name-4,name).map(row=>row.text).join('')==='crate::translation_core::',kind=rows[name].text.replace(/!$/u,'');if(!qualified||kind!=='format')return {edits:[],reason:'unexpanded macro producer remains unclosed'};const first=word==='!'?at+1:at+1,last=close(rows,first);if(last<0)return {edits:[],reason:'unclosed owned formatting token tree'};at=last;}
 }
 return {edits};
}
function proposal(source,modules,baseline){
 const edits=[],selections=[],skipped=[];
 for(const module of modules)for(const item of originalSourceModuleItems(module))if(item.term==='fn'){
  const record={name:item.name,module:module.path,span:[item.start,item.end]},barrier=baseline.skipped.find(row=>row.span?.[0]===item.start&&row.span?.[1]===item.end&&['source owner, typed-position, attribute or binding uncertainty','complete ordinary function required','complete ordinary function body required'].includes(row.reason));
  if(barrier){skipped.push({...record,reason:barrier.reason});continue;}
  const result=select(source,item);if(result.reason)skipped.push({...record,reason:result.reason});if(result.edits.length){edits.push(...result.edits);selections.push({...record,edits:result.edits,originalIteratorDispatchProved:false});}
 }
 edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping source substitutions');
 const before=transportConcreteSyntaxSource(source,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'ascii-predicate:check-complete-byte-callbacks',edits:[]}],repositoryRules:[{id:'router-core:adopt-explicit-ASCII-membership',edits:edits.map(({span,expected,replacement})=>({span,expected,replacement}))}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value));
 const mapping=[];let old=0,next=0;for(const edit of edits){if(old<edit.span[0]){const length=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[next,next+length]});next+=length;}mapping.push({kind:'substitution',before:edit.span,after:[next,next+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];next+=edit.replacement.length;}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[next,next+source.length-old]});
 let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);if(inverse!==source)fail('whole source inverse differs');
 return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},inverse,mapping,selections,skipped,edits,trace:run.trace,executableAdmission:false};
}
export function proposeCoreAsciiCorpus(options={}){
 if(!options||types.isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('own source options required');
 const baseline=proposeCoreScalarsCorpus(options),graph=baseline.moduleGraph,after={...baseline.before},proposals=[];
 for(const row of baseline.proposals){if(row.file.includes('/translation_core/'))continue;const modules=graph.modules.filter(module=>module.file===row.file),result=proposal(baseline.before[row.file],modules,row);proposals.push({file:row.file,...result});after[row.file]=result.after.source;}
 return {schema:'router-owned-ascii-corpus-proposal-v1',entry:baseline.entry,compilationProfile:baseline.compilationProfile,before:baseline.before,after,inputs:baseline.inputs,moduleGraph:graph,dependencyInputs:baseline.dependencyInputs,proposals,skipped:baseline.skipped,executableAdmission:false,migrationSemantics:'maintainer-authorized explicit owned API adoption; actual reconstructed callers need fresh semantic checking'};
}
