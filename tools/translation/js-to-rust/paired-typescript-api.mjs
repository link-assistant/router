// Paired source proposes API formatting only. The final complete TypeScript
// must independently reproduce the authoritative Rust before acceptance.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {camelFromSnake} from './vendor/ir.mjs';
import {constructMap,idBySpelling} from './vendor/constructs.mjs';
import {translateTypeScript} from './typed-portable.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Paired TypeScript API: '+message);};
function parsed(ts,source){const file=ts.createSourceFile('paired-api.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete native TypeScript syntax differs');return file;}
function substitute(source,edits){
 const ordered=[...edits].sort((a,b)=>a.span[0]-b.span[0]||a.span[1]-b.span[1]);let after='',cursor=0;
 for(const edit of ordered){const [start,end]=edit.span;if(start<cursor||start<0||end<start||source.slice(start,end)!==edit.expected)fail('overlapping or stale native API selection');after+=source.slice(cursor,start)+edit.replacement;cursor=end;}
 return after+source.slice(cursor);
}

export function preservePairedTypeScriptAPI({original,typescript,program,rustSource}={}){
 if(typeof original!=='string'||typeof typescript!=='string'||typeof rustSource!=='string'||[original,typescript,rustSource].some(source=>source.length>2097152)||!Array.isArray(program))fail('bounded complete original/target sources and checked proposal program required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const oldConcrete=transportConcreteSyntaxSource(original,{language:'TypeScript'});if(oldConcrete.source!==original)fail('original paired CST differs');
 const oldFile=parsed(ts,original),targetFile=parsed(ts,typescript),aliases=oldFile.statements.filter(ts.isTypeAliasDeclaration),typeOnly=oldFile.statements.every(node=>ts.isTypeAliasDeclaration(node)||ts.isEmptyStatement(node));
 let analysis=null,witness=null;
 if(oldFile.statements.length){
  const source=typeOnly?original+'\nfunction routerPairedTypeWitness(value:number):number{return value;}\n':original;
  if(typeOnly)witness=transportConcreteSourceEquations([{before:original,after:source,language:'TypeScript'}])[0];
  analysis=translateTypeScript(source);
 }
 const type=value=>idBySpelling(constructMap().types,'javascript',value),matched=[];
 for(const contract of analysis?.typeAnnotationHistory.contracts??[]){
  if(contract.kind!=='function')continue;const originals=oldFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===camelFromSnake(contract.name));if(originals.length!==1)continue;
  const entries=program.filter(entry=>entry.kind==='function'&&entry.name===contract.name);if(entries.length!==1)continue;const entry=entries[0];
  if(entry.params.length!==contract.parameters.length||entry.params.some((parameter,index)=>parameter.name!==contract.parameters[index].name||parameter.type!==type(contract.parameters[index].type)))continue;
  const targets=targetFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===camelFromSnake(contract.name));if(targets.length!==1||targets[0].parameters.length!==entry.params.length)fail('complete fresh target signature differs');
  matched.push({name:contract.name,original:originals[0],target:targets[0],contract,returns:contract.returns&&entry.returns===type(contract.returns)});
 }
 const languageSelections=[];
 for(const row of matched){
  for(let index=0;index<row.target.parameters.length;index++){
   const from=row.original.parameters[index],to=row.target.parameters[index];if(from.type&&to.type)languageSelections.push({span:[to.type.getStart(targetFile),to.type.end],expected:to.type.getText(targetFile),replacement:from.type.getText(oldFile),function:row.name,parameter:row.contract.parameters[index].name});
  }
  if(row.returns&&row.original.type&&row.target.type)languageSelections.push({span:[row.target.type.getStart(targetFile),row.target.type.end],expected:row.target.type.getText(targetFile),replacement:row.original.type.getText(oldFile),function:row.name,returnType:true});
 }
 let language,after,repositorySelections;const run=createRulePipeline([
  {phase:'language',rules:[{id:'typescript:substitute-native-paired-scalar-domain-annotations',apply:source=>{language=substitute(source,languageSelections);parsed(ts,language);return language;}}]},
  {phase:'repository',rules:[{id:'router:preserve-original-scalar-alias-and-optional-API-format',apply:source=>{
   const file=parsed(ts,source);repositorySelections=[];
   const declaredTypes=new Set(file.statements.filter(ts.isTypeAliasDeclaration).map(node=>node.name.text));if(aliases.some(node=>declaredTypes.has(node.name.text)))fail('paired alias would overwrite a fresh target type');
   if(aliases.length)repositorySelections.push({span:[0,0],expected:'',replacement:aliases.map(node=>node.getText(oldFile)).join('\n')+'\n',kind:'complete-original-scalar-alias-declarations'});
   for(const row of matched){const targets=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===camelFromSnake(row.name));if(targets.length!==1)fail('fresh native target owner changed');
    for(let index=0;index<row.original.parameters.length;index++){const from=row.original.parameters[index],to=targets[0].parameters[index];if(from.questionToken&&!to.questionToken&&!to.initializer){if(!ts.isIdentifier(to.name))fail('ordinary optional target binding required');repositorySelections.push({span:[to.name.end,to.name.end],expected:'',replacement:'?',kind:'actual-paired-optional-parameter',function:row.name,parameter:row.contract.parameters[index].name});}else if(!from.questionToken&&to.questionToken&&!to.initializer)repositorySelections.push({span:[to.questionToken.getStart(file),to.questionToken.end],expected:to.questionToken.getText(file),replacement:'',kind:'actual-paired-required-parameter',function:row.name,parameter:row.contract.parameters[index].name});}
   }
   after=substitute(source,repositorySelections);parsed(ts,after);return after;
  }}]},
 ]).run(typescript);
 const equations=transportConcreteSourceEquations([{before:typescript,after:language,language:'TypeScript'},{before:language,after,language:'TypeScript'}]);if(equations[0].inverse!==typescript||equations[1].inverse!==language)fail('complete target API inverses differ');
 const checked=translateTypeScript(after);if(!sameRustSourceSyntax(checked.rust,rustSource))fail('formatted paired API does not reproduce the authoritative complete Rust syntax');
 return {typescript:after,history:{originalTypeScriptConcreteSyntax:oldConcrete.meta,typeOnlyWitness:witness,matchedFunctions:matched.map(row=>({name:row.name,originalSpan:[row.original.getStart(oldFile),row.original.end],returnAnnotationRestored:Boolean(row.returns)})),languageSelections,repositorySelections,equations,trace:run.trace,checkedSemanticMeta:checked.meta,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false}};
}
