import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceItems} from './rust-structure.mjs';
import {proposeCoreJsonTypeMatches} from './migrate-core-json-type-matches.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ORIGINAL='tools/translation/source-profiles/core-json-type-matches/safety_identifier.rs.txt';
const PATH='rust/src/safety_identifier.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Safety JSON projection preparation: '+message);};
function formatHeaders(source){
 const edits=[];
 for(const item of sourceItems(source).filter(item=>item.term==='fn')){
  const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.find(token=>token.text==='{');
  if(!open)continue;
  const before=source.slice(item.start,open.start),match=/^(pub )?fn ([a-z_]+)\(([^()]*)\)\s*->\s*([^]*?)\s*$/u.exec(before);
  if(!match||!match[3].trim()||before.trim().length<=100)continue;
  const after=(match[1]??'')+'fn '+match[2]+'(\n    '+match[3].trim()+',\n) -> '+match[4].trim()+' ';
  edits.push({start:item.start,end:open.start,after});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.after+source.slice(edit.end);
 return source;
}
function repositoryQuality(source){
 const items=sourceItems(source),unused=items.filter(item=>item.term==='use'&&source.slice(item.start,item.end).trim()==='use serde_json::Value;');
 if(unused.length===1&&!items.filter(item=>item!==unused[0]).some(item=>item.tokens.some((token,index)=>token.type==='ident'&&token.text==='Value'&&item.tokens[index-1]?.text!=='::'))){const item=unused[0];source=source.slice(0,item.start)+source.slice(item.end).replace(/^\n/u,'');}
 return formatHeaders(source);
}
function oracle(before,selections,format=true){
 const declarations=sourceItems(before),copies=selections.map(row=>{
  const item=declarations.find(item=>item.term==='fn'&&item.name===row.name),name=item.tokens.find(token=>token.type==='ident'&&token.text===item.name),start=item.start;
  const original=before.slice(start,item.end),at=name.start-start;
  const copy=original.slice(0,at)+name.text+'_reference'+original.slice(at+name.text.length);
  return format?formatHeaders(copy):copy;
 });
 return `#[cfg(test)]
mod json_projection_translation_tests {
    use super::{validate_openai, validate_openai_user};

${copies.map(source=>source.split('\n').map(line=>'    '+line).join('\n')).join('\n\n')}

    #[test]
    fn projected_validation_preserves_original_json_patterns() {
        assert_eq!(super::validate_openai_value(None), validate_openai_value_reference(None));
        assert_eq!(super::validate_openai_user_value(None), validate_openai_user_value_reference(None));
        let mut values = vec![
            serde_json::Value::Null,
            serde_json::Value::Bool(false),
            serde_json::json!(0),
            serde_json::json!(1.25),
            serde_json::json!([]),
            serde_json::json!({}),
        ];
        for size in [0, 1, 63, 64, 65] {
            for scalar in ["a", "😀", "e\\u{301}"] {
                values.push(serde_json::Value::String(scalar.repeat(size)));
            }
        }
        for value in &values {
            assert_eq!(super::validate_openai_value(Some(value)), validate_openai_value_reference(Some(value)));
            assert_eq!(super::validate_openai_user_value(Some(value)), validate_openai_user_value_reference(Some(value)));
        }
    }
}
`;
}
export function prepareSafetyJsonProjections({root=ROOT}={}){
 const libraryInputs=[['rust/src/translation_core.rs',ROUTER_FORMATTING_FACADE_SOURCE],['rust/src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE]].map(([path,expected])=>{const source=readFileSync(resolve(root,path),'utf8');if(source!==expected)fail('complete actual owned library source differs: '+path);return {path,source};});
 const rootSource=readFileSync(resolve(root,'rust/src/lib.rs'),'utf8'),edges=sourceItems(rootSource).filter(item=>item.term==='mod'&&item.name==='translation_core');
 if(edges.length!==1||rootSource.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public owned library edge required');libraryInputs.push({path:'rust/src/lib.rs',source:rootSource});
 const before=readFileSync(resolve(root,ORIGINAL),'utf8');
 if(hash(before)!=='3fc317d7db138e9316e77a959f0e77a747cf9eba0ce805af20210e4035f19cca')fail('complete original safety source differs');
 const proposal=proposeCoreJsonTypeMatches(before);
 if(proposal.selections.map(row=>row.name).join(',')!=='validate_openai_value,validate_openai_user_value')fail('both complete production validators required');
 const withOracle=proposal.after+'\n'+oracle(before,proposal.selections),after=repositoryQuality(withOracle),equation=transportConcreteSourceEquations([{before:proposal.after,after,language:'Rust'}])[0];
 if(equation.inverse!==proposal.after)fail('complete native oracle source inverse differs');
 const historical=proposal.after+'\n'+oracle(before,proposal.selections,false);
 const current=readFileSync(resolve(root,PATH),'utf8');if(current!==before&&current!==after&&current!==historical&&current!==formatHeaders(withOracle))fail('complete physical source differs');
 if(readFileSync(resolve(root,ORIGINAL),'utf8')!==before)fail('complete original source changed');
 for(const row of libraryInputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete actual library source changed');
 return {schema:'safety-json-projections-v1',files:[{path:PATH,before,after,current}],proposal,oracleEquation:equation,libraryInputs,rustExecuted:false,semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('use --write|--check');
 const plan=prepareSafetyJsonProjections();
 if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))fail('generated safety source is stale');
 if(args[0]==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('source changed before write');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 console.log(JSON.stringify({schema:plan.schema,functions:plan.proposal.selections.map(row=>row.name),rustExecuted:false}));
}
