// Explicit source adoption of Router's owned API. This does not prove the
// implementation or candidate ordering of arbitrary standard Range methods.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,lstatSync,rmdirSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_RANGES_SOURCE} from './router-core-source-data.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Core inclusive-range adoption: '+message);};
const target='crate::translation_core::f64_inclusive_contains';
const ident=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text);
const inert=new Set(['doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller','test']);
function close(rows,at){
  const opens={'(':')','[':']','{':'}'},stack=[];
  for(let next=at;next<rows.length;next++){
    const text=rows[next].text;if(opens[text])stack.push(opens[text]);
    else if([')',']','}'].includes(text)){if(stack.pop()!==text)return -1;if(!stack.length)return next;}
  }return -1;
}
function endpoint(rows,at){
  const start=at;if(rows[at]?.text==='-')at++;
  const token=rows[at];
  // A written decimal floating endpoint only. Integer, f32, path, expression,
  // arbitrary infinity spellings and evaluated constants remain untouched.
  if(token?.type!=='number'||!/^\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d[\d_]*)?(?:f64)?$/u.test(token.text))return null;
  return {start,end:at+1,text:rows.slice(start,at+1).map(row=>row.text).join('')};
}
function candidate(rows,at){
  if(rows[at]?.text!=='(')return null;const lower=endpoint(rows,at+1);if(!lower)return null;
  let next=lower.end;if(rows[next]?.text!=='.'||rows[next+1]?.text!=='.'||rows[next+2]?.text!=='=')return null;
  const upper=endpoint(rows,next+3);if(!upper)return null;next=upper.end;
  if(rows[next]?.text!==')'||rows[next+1]?.text!=='.'||rows[next+2]?.text!=='contains'||rows[next+3]?.text!=='(')return null;
  const argument=next+4,borrow=rows[argument]?.text==='&',value=argument+(borrow?1:0);
  if(!ident(rows[value])||rows[value+1]?.text!==')')return null;
  return {lower,upper,value:rows[value],borrow,end:value+2};
}
export function migrateCoreRanges(source,{compilationProfile=PRODUCTION_PROFILE}={}){
  if(typeof source!=='string'||source.length>2_000_000)fail('complete bounded primitive Rust source required');
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),items=sourceItems(source);
  const active=items.filter(item=>itemConfiguration(item.tokens,compilationProfile).status!=='inactive'),all=active.flatMap(item=>item.tokens.filter(row=>row.type!=='comment')),scope=macroProvenance(active.map(item=>source.slice(item.start,item.end)).join('\n'));
  const edits=[],selections=[],skipped=[];
  const uncertain=scope.unresolvedImportScope||all.some((row,index)=>row.text==='as'&&all[index+1]?.text==='_')||all.some((row,index)=>row.text==='fn'&&all[index+1]?.text==='contains')||all.some((row,index)=>['type','struct','enum','trait','mod'].includes(row.text)&&all[index+1]?.text==='f64');
  for(const item of items){
    if(item.term!=='fn')continue;
    const condition=itemConfiguration(item.tokens,compilationProfile),rows=item.tokens.filter(row=>row.type!=='comment');
    if(condition.status!=='active'||condition.attributes.some(row=>!inert.has(row.name))||uncertain){skipped.push({function:item.name,span:[item.start,item.end],reason:'inactive, ambiguous binding, or unresolved attribute/import/method producer'});continue;}
    const fn=rows.findIndex(row=>row.text==='fn'),parameters=rows.findIndex((row,index)=>index>fn&&row.text==='('),parameterEnd=parameters<0?-1:close(rows,parameters);
    let body=parameterEnd+1;while(body>0&&body<rows.length&&rows[body].text!=='{')body++;
    if(parameterEnd<0||body>=rows.length){skipped.push({function:item.name,span:[item.start,item.end],reason:'complete function body unavailable'});continue;}
    const localProducer=rows.slice(body+1).some(row=>['fn','trait','impl','use','macro_rules!','macro'].includes(row.text));
    if(localProducer){skipped.push({function:item.name,span:[item.start,item.end],reason:'nested declaration or method/import producer'});continue;}
    const macroSpans=[];
    for(let at=body+1;at<rows.length;at++)if(rows[at].text.endsWith('!')||rows[at+1]?.text==='!'){
      const open=rows[at].text.endsWith('!')?at+1:at+2;if(!['(','[','{'].includes(rows[open]?.text))continue;
      const end=close(rows,open);if(end>=0){macroSpans.push([open,end]);at=end;}
    }
    for(let at=body+1;at<rows.length-1;at++){
      const match=candidate(rows,at);if(!match)continue;
      const span=[rows[at].start,rows[match.end-1].end];
      if(macroSpans.some(([first,last])=>at>=first&&at<=last)){skipped.push({function:item.name,span,reason:'range inside unexpanded macro token tree'});continue;}
      if(!match.borrow){skipped.push({function:item.name,span,reason:'bare identifier may be a shared closure argument; explicit checked dereference adoption is separate'});continue;}
      // This is explicit API adoption. The resulting source still requires
      // independent actual f64 type/ownership checking, not a spelling grant.
      const edit={span,expected:source.slice(...span),replacement:`${target}(${match.lower.text}, ${match.upper.text}, ${match.value.text})`};
      edits.push(edit);selections.push({function:item.name,functionSpan:[item.start,item.end],span,lower:match.lower.text,upper:match.upper.text,argument:match.value.text,argumentRead:'by-value identifier, once',originalDispatchProved:false});at=match.end-1;
    }
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'inclusive-f64-adoption:retain-literal-operands',edits:[]}],repositoryRules:[{id:'router-core:adopt-qualified-inclusive-bounds',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}
    mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];}
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
  let reverse=after.source;for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(reverse.slice(...row.after)!==row.replacement)fail('inverse replacement changed');reverse=reverse.slice(0,row.after[0])+row.expected+reverse.slice(row.after[1]);}}
  if(reverse!==source)fail('complete inverse differs');
  return {schema:'router-owned-inclusive-bounds-adoption-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},mapping,edits,selections,skipped,trace:applied.trace,executableAdmission:false,migrationSemantics:'maintainer-authorized owned API adoption; no arbitrary standard Range dispatch equivalence theorem',libraryImplementation:'untranslated-owned-rust-library'};
}
function freshOutput(root,output){
  const source=realpathSync(root),parent=realpathSync(dirname(output)),targetPath=join(parent,basename(output)),inside=(a,b)=>a===b||a.startsWith(b+'/');
  if(inside(targetPath,source)||inside(source,targetPath))fail('physical proposal overlaps source root');
  const before=lstatSync(parent);mkdirSync(output,{recursive:false});
  try{const after=lstatSync(parent),created=lstatSync(output);if(before.dev!==after.dev||before.ino!==after.ino||before.mode!==after.mode||!created.isDirectory()||created.isSymbolicLink()||realpathSync(output)!==targetPath||realpathSync(root)!==source)fail('proposal identity changed');}
  catch(error){try{rmdirSync(output);}catch{}throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args[0]!=='--root'||args[2]!=='--output'||args.length<6||args.length%2!==0)fail('usage: --root ROOT --output FRESH_OUTSIDE --file src/file.rs [--file ...]');
  const root=resolve(args[1]),output=resolve(args[3]),paths=[];
  for(let at=4;at<args.length;at+=2){const path=args[at+1];if(args[at]!=='--file'||!/^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.rs$/u.test(path)||paths.includes(path))fail('unique canonical source file required');paths.push(path);}
  const rootSource=readFileSync(join(root,'src/lib.rs'),'utf8'),coreEdges=sourceItems(rootSource).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(coreEdges.length!==1||rootSource.slice(coreEdges[0].start,coreEdges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
  if(readFileSync(join(root,'src/translation_core.rs'),'utf8')!==ROUTER_FORMATTING_FACADE_SOURCE||readFileSync(join(root,'src/translation_core/ranges.rs'),'utf8')!==ROUTER_CORE_RANGES_SOURCE)fail('complete actual owned interface required');
  const inputs=paths.map(path=>({path,source:readFileSync(join(root,path),'utf8')})),proposals=inputs.map(row=>({path:row.path,proposal:migrateCoreRanges(row.source)}));
  for(const row of inputs)if(readFileSync(join(root,row.path),'utf8')!==row.source)fail('source changed while proposing');
  freshOutput(root,output);for(const row of proposals){const file=join(output,row.path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,row.proposal.after.source,{flag:'wx'});}
  writeFileSync(join(output,'proposal.json'),JSON.stringify({inputs,proposals},null,2)+'\n',{flag:'wx'});
}
