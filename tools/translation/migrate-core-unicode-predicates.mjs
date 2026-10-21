// Explicit maintainer-authorized API adoption. Written iterator spelling is
// never admitted by this proposal; the complete reconstructed caller checks anew.
import {createHash} from 'node:crypto';
import {proposeCoreScalarsCorpus} from './migrate-core-scalars.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',STR='&'+C+'Str';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned Unicode predicate adoption: '+message);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function close(rows,start){
 const stack=[],pairs={'(':')','[':']','{':'}'};
 for(let at=start;at<rows.length;at++){const word=rows[at].text;if(['string','char','comment'].includes(rows[at].type))continue;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;
}
function noCompetingChar(modules){
 // Deliberately conservative across the entire fresh graph. The shared scalar
 // selector independently rejects unknown producers, traits and import roles.
 for(const module of modules)for(const item of originalSourceModuleItems(module)){
  const rows=item.tokens.filter(row=>row.type!=='comment');
  if(rows.some(row=>row.type==='ident'&&row.text==='no_implicit_prelude'))return false;
  const header=originalDeclarationHeader(item,module.path);
  if(header?.name==='char'&&header.kind!=='fn')return false;
  if(item.term==='use')for(const leaf of originalUseDeclarationLeaves(item,module.path))if(leaf.glob||leaf.name==='char')return false;
  if(rows.some((row,at)=>row.text==='extern'&&rows[at+1]?.text==='crate'&&rows.slice(at+2).some(token=>token.text==='char')))return false;
 }return true;
}
function select(source,item,charClosed){
 const rows=item.tokens.filter(row=>row.type!=='comment'),fn=rows.findIndex(row=>row.text==='fn'),open=fn+2,end=close(rows,open),bindings=new Set();
 if(rows[open]?.text!=='('||end<0)return {edits:[],reason:'ordinary complete parameter binders required'};
 let begin=open+1;
 for(let at=begin;at<=end;at++)if(at===end||rows[at].text===','){
  const part=rows.slice(begin,at);begin=at+1;if(!part.length)continue;
  if(!ident(part[0])||part[1]?.text!==':')return {edits:[],reason:'ordinary named source parameters required'};
  if(part.slice(2).map(row=>row.text).join('')===STR)bindings.add(part[0].text);
 }
 let body=end+1;while(body<rows.length&&rows[body].text!=='{')body++;
 if(close(rows,body)!==rows.length-1)return {edits:[],reason:'complete function body required'};
 const edits=[],callbacks=[];
 for(let at=body+1;at<rows.length;at++){
  if(!ident(rows[at])||!bindings.has(rows[at].text)||['.','::','#'].includes(rows[at-1]?.text))continue;
  const name=rows[at+9],filter=['.','chars','(',')','.','filter','(','|',name?.text,'|','!',name?.text,'.','is_whitespace','(',')',')','.','collect','(',')'];
  const control=['.','chars','(',')','.','any','(','char','::','is_control',')'];
  let operation=null,length=0;
  if(ident(name)&&filter.every((word,index)=>rows[at+index+1]?.text===word)){operation='strip_unicode_whitespace';length=filter.length;callbacks.push([at+8,at+17]);}
  else if(charClosed&&control.every((word,index)=>rows[at+index+1]?.text===word)){operation='has_unicode_control';length=control.length;}
  if(!operation)continue;
  const span=[rows[at].start,rows[at+length].end];
  if(item.tokens.some(row=>row.type==='comment'&&row.start>=span[0]&&row.end<=span[1]))return {edits:[],reason:'replaced expression contains retained comments'};
  edits.push({span,expected:source.slice(...span),replacement:C+operation+'('+rows[at].text+')',operation,receiver:rows[at].text,originalIteratorDispatchProved:false});at+=length;
 }
 if(!edits.length)return {edits};
 // No unrelated binders or opaque producers may introduce a receiver/type name.
 // Original attribute, cfg, import and ancestor barriers come from the fresh
 // complete scalar selector, rather than caller-supplied eligibility metadata.
 for(let at=body+1;at<rows.length;at++){
  if(callbacks.some(([first,last])=>at>=first&&at<last))continue;
  const word=rows[at].text;
  if(['let','|','||','for','while','loop','match','fn','const','static','type','struct','enum','union','trait','impl','mod','use','extern','macro','macro_rules!','#'].includes(word))return {edits:[],reason:'other binder, item or producer remains unclosed'};
  if(word.endsWith('!')&&word!=='!'||word==='!'&&ident(rows[at-1])&&['(','[','{'].includes(rows[at+1]?.text))return {edits:[],reason:'opaque body macro remains unclosed'};
 }
 return {edits};
}
function proposal(source,modules,baseline,charClosed){
 const edits=[],selections=[],skipped=[];
 for(const module of modules)for(const item of originalSourceModuleItems(module))if(item.term==='fn'){
  const record={name:item.name,module:module.path,span:[item.start,item.end]};
  const barrier=baseline.skipped.find(row=>row.span?.[0]===item.start&&row.span?.[1]===item.end&&['source owner, typed-position, attribute or binding uncertainty','complete ordinary function required','complete ordinary function body required'].includes(row.reason));
  if(barrier){skipped.push({...record,reason:barrier.reason});continue;}
  const result=select(source,item,charClosed);if(result.reason)skipped.push({...record,reason:result.reason});
  if(result.edits.length){edits.push(...result.edits);selections.push({...record,edits:result.edits,executableAdmission:false});}
 }
 edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping complete expression substitutions');
 const before=transportConcreteSyntaxSource(source,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'unicode-predicates:retain-complete-source-bindings',edits:[]}],repositoryRules:[{id:'router-core:adopt-owned-unicode-predicates',edits:edits.map(({span,expected,replacement})=>({span,expected,replacement}))}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value));
 const mapping=[];let old=0,next=0;
 for(const edit of edits){if(old<edit.span[0]){const length=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[next,next+length]});next+=length;}mapping.push({kind:'substitution',before:edit.span,after:[next,next+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];next+=edit.replacement.length;}
 if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[next,next+source.length-old]});
 let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);if(inverse!==source)fail('complete source inverse differs');
 return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},inverse,mapping,selections,skipped,edits,trace:run.trace,executableAdmission:false};
}
export function proposeCoreUnicodePredicatesCorpus(options={}){
 // The original API validates own-data options, all sources and fresh private
 // module/producer context. No public proposal field is reused as authority.
 const baseline=proposeCoreScalarsCorpus(options),graph=baseline.moduleGraph,charClosed=noCompetingChar(graph.modules),after={...baseline.before},proposals=[];
 for(const row of baseline.proposals){const modules=graph.modules.filter(module=>module.file===row.file),result=proposal(baseline.before[row.file],modules,row,charClosed);proposals.push({file:row.file,...result});after[row.file]=result.after.source;}
 return {schema:'router-owned-unicode-predicate-corpus-v1',entry:baseline.entry,compilationProfile:baseline.compilationProfile,before:baseline.before,after,inputs:baseline.inputs,moduleGraph:graph,dependencyInputs:baseline.dependencyInputs,proposals,skipped:baseline.skipped,executableAdmission:false,migrationSemantics:'explicit owned API adoption; complete reconstructed callers require fresh independent checking'};
}
