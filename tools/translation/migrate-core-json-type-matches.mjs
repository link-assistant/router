// A source proposal, never a semantic permit. The ordinary forward compiler
// independently checks the complete reconstructed functions and their callers.
import {sourceItems} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const JSON_PATH='crate::translation_core::Json';
const fail=message=>{throw TypeError('Owned JSON type-match substitution: '+message);};
const identifier=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text);
function select(source){
 const selections=[];
 for(const item of sourceItems(source)){
  if(item.term!=='fn')continue;
  const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{');
  if(open<0)continue;
  const body=tokens.slice(open),words=body.map(token=>token.text);let at=0;
  const take=(...expected)=>{for(const word of expected)if(words[at++]!==word)throw null;};
  const binding=()=>{const token=body[at++];if(!identifier(token))throw null;return token.text;};
  const path=()=>{const names=[binding()];while(words[at]==='::'&&!['Null','String'].includes(words[at+1])){take('::');names.push(binding());}return names.join('::');};
  try{
   take('{','match');const parameter=binding();take('{','None','|','Some','(');const enumPath=path();take('::','Null',')','=>','Ok','(','(',')',')',',','Some','(');
   if(path()!==enumPath)continue;take('::','String','(');const payload=binding();take(')',')','=>');const callee=binding();take('(','Some','(');if(binding()!==payload)continue;
   take(')',')',',','Some','(','_',')','=>','Err','(');const error=body[at++];if(!error||!/^"(?:[^"\\]|\\.)*"$/su.test(error.text))continue;
   take('.','into','(',')',')',',','}','}');if(at!==words.length)continue;
   const header=tokens.slice(0,open).map(token=>token.text).join('');
   if(enumPath!==JSON_PATH||header!==`pubfn${item.name}(${parameter}:crate::translation_core::Maybe<&${JSON_PATH}>)->crate::translation_core::Outcome<(),String>`)continue;
   selections.push({name:item.name,parameter,payload,callee,error:error.text,span:[body[0].start,body.at(-1).end],functionSpan:[item.start,item.end]});
  }catch(error){if(error!==null)throw error;}
 }
 return selections;
}
function bodies(row){
 const {parameter:p,payload:v,callee:c,error:e}=row;
 const prefix=`{\n    let Some(${p}) = ${p} else {\n        return Ok(());\n    };\n`;
 return {
  language:prefix+`    match ${p} {\n        ${JSON_PATH}::Null => Ok(()),\n        ${JSON_PATH}::String(${v}) => ${c}(Some(${v})),\n        _ => Err(${e}.into()),\n    }\n}`,
  repository:prefix+`    if ${p}.is_null() {\n        return Ok(());\n    }\n    let Some(${v}) = ${p}.as_str() else {\n        return Err(${e}.into());\n    };\n    ${c}(Some(${v}))\n}`,
 };
}
function replace(source,edits){
 let after=source,last=source.length;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(edit.span[1]>last||source.slice(...edit.span)!==edit.expected)fail('complete selected source span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);last=edit.span[0];
 }
 return after;
}
function stage(before,after,phase,id){
 const first=transportConcreteSyntaxSource(before,{language:'Rust'}),wire=serializeConcreteSyntaxMeta(first.document),fresh=transportConcreteSyntaxMeta(wire);
 const rule=(left,right,name)=>({id:name,edits:[{span:[0,left.length],expected:left,replacement:right}]});
 const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?[rule(before,after,id)]:[],repositoryRules:phase==='repository'?[rule(before,after,id)]:[]});
 const afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);if(parsed.source!==after)fail('complete phase source differs');
 const undo=applyConcreteSyntaxSubstitutions(parsed.document,{languageRules:phase==='language'?[rule(after,before,id+':inverse')]:[],repositoryRules:phase==='repository'?[rule(after,before,id+':inverse')]:[]});
 const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source;if(inverse!==before)fail('complete phase inverse differs');
 sourceItems(after);
 return {phase,before,after,beforeMeta:wire,afterMeta,inverse,trace:run.trace};
}
export function proposeCoreJsonTypeMatches(source){
 if(typeof source!=='string'||source.length>2_000_000)fail('bounded complete Rust source required');
 const selections=select(source),languageEdits=selections.map(row=>({span:row.span,expected:source.slice(...row.span),replacement:bodies(row).language}));
 const language=replace(source,languageEdits),items=sourceItems(language),repositoryEdits=selections.map(row=>{
  const matches=items.filter(item=>item.term==='fn'&&item.name===row.name);if(matches.length!==1)fail('one complete intermediate declaration required');
  const tokens=matches[0].tokens.filter(token=>token.type!=='comment'),start=tokens.find(token=>token.text==='{').start,end=tokens.at(-1).end,expected=bodies(row).language;
  if(language.slice(start,end)!==expected)fail('complete intermediate body differs');return {span:[start,end],expected,replacement:bodies(row).repository};
 });
 const after=replace(language,repositoryEdits),stages=[stage(source,language,'language','rust:lift-optional-enum-dispatch'),stage(language,after,'repository','router:project-owned-json-shapes')];
 return {schema:'router-owned-json-type-match-proposal-v1',before:source,language,after,inverse:source,selections,languageEdits,repositoryEdits,stages,trace:stages.flatMap(row=>row.trace),semanticAuthority:false,executableAdmission:false,rustExecuted:false};
}
