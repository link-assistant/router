// Candidate-only source substitutions. Whole-function checks remain required.
import {createHash} from 'node:crypto';
import {rustTokens} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=reason=>{throw new TypeError('Layered core source adoption: '+reason);};
export function applyLayeredCoreAdoptionSource(source,edits,{languageRule,repositoryRule,bindings}){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact edits');
 const bound=sourceBindings(bindings);if(typeof languageRule!=='string'||!languageRule||languageRule.length>256||typeof repositoryRule!=='string'||!repositoryRule||repositoryRule.length>256)fail('bounded explicit rule identities required');const languageEdits=[],repositoryEdits=[];let delta=0;
 for(const edit of edits){const selected=neutralReplacement(edit.replacement,bound),start=edit.span[0]+delta;languageEdits.push({...edit,replacement:selected.source});for(const row of selected.spans)repositoryEdits.push({span:[start+row.span[0],start+row.span[1]],expected:row.binding.neutral,replacement:row.original});delta+=selected.source.length-(edit.span[1]-edit.span[0]);}
 const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:languageRule,edits:languageEdits}],repositoryRules:[{id:repositoryRule,edits:repositoryEdits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)),mapping=[];let old=0,current=0;
 for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse source differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}if(inverse!==source)fail('complete source inverse differs');return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,trace:changed.trace,executableAdmission:false};
}

function sourceBindings(bindings){
 if(!Array.isArray(bindings)||!bindings.length||bindings.length>16)fail('bounded explicit native and neutral binding rows required');const native=new Set(),neutral=new Set();return bindings.map(row=>{if(!row||typeof row.native!=='string'||typeof row.neutral!=='string'||!/^crate::[A-Za-z_][A-Za-z_0-9]*::$/u.test(row.native)||!/^::translation_compatibility_[A-Za-z_][A-Za-z_0-9]*::$/u.test(row.neutral)||native.has(row.native)||neutral.has(row.neutral))fail('distinct closed compatibility roots required');native.add(row.native);neutral.add(row.neutral);return {native:row.native,neutral:row.neutral,words:row.native.match(/[A-Za-z_][A-Za-z_0-9]*|::/gu)};});
}
function neutralReplacement(source,bindings){
 if(typeof source!=='string'||source.length>2000000)fail('complete bounded selected expression required');const tokens=rustTokens(source).filter(row=>row.type!=='comment');if(tokens.length>200000)fail('complete selected expression token bound');const pieces=[],spans=[];let stop=0,length=0,work=0;
 for(let at=0;at<tokens.length;at++){
  if(++work>200000)fail('complete binding selection cell bound');if(tokens[at].text!=='crate'||['.','::'].includes(tokens[at-1]?.text))continue;
  for(const binding of bindings){if(++work>200000)fail('complete binding selection cell bound');const width=binding.words.length;if(!binding.words.every((word,index)=>tokens[at+index]?.text===word)||tokens[at+width]?.type!=='ident'||tokens[at+width+1]?.text!=='(')continue;const start=tokens[at].start,end=tokens[at+width-1].end,unchanged=source.slice(stop,start);pieces.push(unchanged,binding.neutral);length+=unchanged.length;spans.push({span:[length,length+binding.neutral.length],binding,original:source.slice(start,end)});length+=binding.neutral.length;stop=end;at+=width-1;break;}
 }
 if(!spans.length)fail('actual selected qualified compatibility call required');pieces.push(source.slice(stop));return {source:pieces.join(''),spans};
}
