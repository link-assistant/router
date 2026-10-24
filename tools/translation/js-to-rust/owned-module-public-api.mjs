// Public module packaging follows original native symbol selections and a
// checked complete program. It adds aliases, never new function bodies.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {snakeFromCamel} from './vendor/ir.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {publicScalarRustTypes} from './module-scalar-types.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Portable module public API: '+message);};
const valid=name=>typeof name==='string'&&/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name)&&!['default','__esModule'].includes(name);
export function moduleDeclarationPublicEdits(ts,file,source,publicDeclarations){
 const edits=[];
 const erase=node=>edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'',kind:'native-module-declaration'});
 for(const node of file.statements){
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)||ts.isEmptyStatement(node)||ts.isExpressionStatement(node)&&ts.isStringLiteral(node.expression)&&node.expression.text==='use strict'){erase(node);continue;}
  const declarations=ts.isVariableStatement(node)?[...node.declarationList.declarations]:[node],firstPublic=publicDeclarations.has(declarations[0]),modifier=node.modifiers?.find(value=>value.kind===ts.SyntaxKind.ExportKeyword);
  if(modifier&&!firstPublic)erase(modifier);
  if(!modifier&&firstPublic)edits.push({span:[node.getStart(file),node.getStart(file)],expected:'',replacement:'export ',kind:'native-public-value-visibility'});
  if(ts.isVariableStatement(node))for(let index=1;index<declarations.length;index++){
   const previous=declarations[index-1],next=declarations[index],start=previous.end,end=next.getStart(file);
   edits.push({span:[start,end],expected:source.slice(start,end),replacement:';\n'+(publicDeclarations.has(next)?'export ':'')+'const ',kind:'native-ordered-constant-export-split'});
  }
 }return edits;
}
function native(ts,source,language){const file=ts.createSourceFile('public-target.'+(language==='TypeScript'?'ts':'mjs'),source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native module target syntax differs');return file;}
function removeExports(ts,source,language){
 const file=native(ts,source,language),edits=[];
 for(const node of file.statements)for(const modifier of node.modifiers??[])if(modifier.kind===ts.SyntaxKind.ExportKeyword)edits.push({span:[modifier.getStart(file),modifier.end],expected:modifier.getText(file),replacement:''});
 let after=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+after.slice(edit.span[1]);native(ts,after,language);return {source:after,edits};
}
function scalarAliases(ts,source){
 const file=native(ts,source,'TypeScript'),rows=[];
 for(const node of file.statements)if(ts.isTypeAliasDeclaration(node)){
  let text=node.getText(file);const start=node.getStart(file);for(const modifier of [...(node.modifiers??[])].reverse())if(modifier.kind===ts.SyntaxKind.ExportKeyword)text=text.slice(0,modifier.getStart(file)-start)+text.slice(modifier.end-start);
  rows.push({name:node.name.text,source:text,span:[start,node.end]});
 }return rows;
}
export function packageOwnedModuleAPI(result,{publicExports,linkedSource,language}={}){
 if(!Array.isArray(publicExports)||publicExports.length>4096||!['JavaScript','TypeScript'].includes(language))fail('bounded native public export table required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const exports_=publicExports.map(row=>{if(!valid(row.publicName)||!valid(row.internalName)||!['value','type'].includes(row.kind))fail('portable named public export required');return row;});
 if(new Set(exports_.map(row=>row.publicName)).size!==exports_.length)fail('ambiguous public export name');
 if(exports_.some(row=>row.kind!=='value'))fail('owned project public types need their own complete source-bound profile');const values=exports_,types=[],aliases=[];
 for(const row of values){const candidates=result.program.filter(item=>item.kind==='owned-function'&&item.javascript===row.internalName);if(candidates.length!==1||candidates[0].exported!==true)fail('public alias requires its complete checked exported declaration');}
 for(const row of types)if(aliases.filter(alias=>alias.name===row.internalName).length!==1)fail('public type alias requires its complete checked scalar declaration');
 const js=removeExports(ts,result.javascript,'JavaScript'),typed=removeExports(ts,result.typescript,'TypeScript');
 const javascriptFooter=values.length?'\nexport { '+values.map(row=>row.internalName+(row.internalName===row.publicName?'':' as '+row.publicName)).join(', ')+' };\n':'\nexport {};\n';
 const typeFooter=types.length?'\nexport type { '+types.map(row=>row.internalName+(row.internalName===row.publicName?'':' as '+row.publicName)).join(', ')+' };\n':'';
 const rustScalarTypes={helpers:'',rows:[],declarations:''},rustImplementation=rustScalarTypes.helpers+result.rust,rustItems=sourceItems(rustImplementation),publicTypes=[];
 for(const item of rustItems)if(['struct','enum','type'].includes(item.term)){const tokens=item.tokens.filter(token=>token.type!=='comment'),keyword=tokens.findIndex(token=>token.text===item.term);if(tokens.slice(0,keyword).some(token=>token.text==='pub'))publicTypes.push(item.name);}
 const rustNames=values.map(row=>snakeFromCamel(row.publicName));if(new Set(rustNames).size!==rustNames.length)fail('public aliases collide after Rust naming');
 const allPublicNames=[...rustNames,...publicTypes,...rustScalarTypes.rows.map(row=>row.publicName)];if(new Set(allPublicNames).size!==allPublicNames.length)fail('public value, support type and scalar alias names collide');
 const module='__router_owned_project',rustLanguage='mod '+module+' {\n'+rustImplementation+'\n}\n';
 const rustFooter=values.map((row,index)=>'pub use self::'+module+'::'+snakeFromCamel(row.internalName)+(snakeFromCamel(row.internalName)===rustNames[index]?'':' as '+rustNames[index])+';').concat([...new Set(publicTypes)].map(name=>'pub use self::'+module+'::'+name+';')).join('\n')+'\n';
 const before={JavaScript:result.javascript,TypeScript:result.typescript,Rust:result.rust},general={JavaScript:js.source,TypeScript:typed.source,Rust:rustLanguage},after={};
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'module:strip-original-output-exports-and-isolate-Rust-implementation',apply:()=>general}]},
  {phase:'repository',rules:[{id:'router:publish-only-native-selected-public-aliases-and-TS-type-API',apply:()=>{
   after.JavaScript=general.JavaScript+javascriptFooter;after.TypeScript=aliases.map(row=>row.source).join('\n')+'\n'+general.TypeScript+javascriptFooter+typeFooter;after.Rust=general.Rust+rustFooter+rustScalarTypes.declarations;
   native(ts,after.JavaScript,'JavaScript');native(ts,after.TypeScript,'TypeScript');for(const source of Object.values(after))if(source.length>2097152)fail('complete public target exceeds existing source bound');return after;
  }}]},
 ]).run(before);
 const equations=[];for(const target of ['JavaScript','TypeScript','Rust']){const stages=transportConcreteSourceEquations([{before:before[target],after:general[target],language:target},{before:general[target],after:after[target],language:target}]);if(stages[0].inverse!==before[target]||stages[1].inverse!==general[target])fail('complete public target inverse differs');equations.push({language:target,stages});}
 return {...result,javascript:run.value.JavaScript,typescript:run.value.TypeScript,rust:run.value.Rust,modulePublicAPIHistory:{publicExports:exports_,scalarAliases:aliases,rustScalarTypes,publicRustSupportTypes:publicTypes,equations,trace:run.trace,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,rustScalarTypeAliasesEmitted:false}};
}
