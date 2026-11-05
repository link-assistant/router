// Derive the opt-in tuple-struct Clone source path from complete originals.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/tuple-derive/complete-originals.json.gz';
const PIN='82a80b5f5ea4672b5a5c3d9503d5e5b2e4bd38c4bf000413021f0696c661ec68';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Tuple derive source preparation: '+message);};
function once(source,before,after){
 const start=source.indexOf(before);if(start<0||source.indexOf(before,start+before.length)>=0)fail('one exact original source selection required');
 return source.slice(0,start)+after+source.slice(start+before.length);
}
function parsed(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native syntax or line bound');return file;
}
function selectedFunction(ts,path,source,name){
 const file=parsed(ts,path,source),matches=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 if(matches.length!==1)fail('one original function '+name+' required');
 const node=matches[0];return {span:[node.getStart(file),node.end],source:node.getText(file)};
}
function replaceFunction(ts,path,source,name,rewrite,selections){
 const selected=selectedFunction(ts,path,source,name),replacement=rewrite(selected.source);
 selections.push({...selected,name,replacement});return source.slice(0,selected.span[0])+replacement+source.slice(selected.span[1]);
}
export function prepareTupleDerive({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));
 if(packed.length!==32815||hash(packed)!==PIN)fail('complete original source archive differs');
 const originals=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));
 if(originals.schema!=='tuple-derive-complete-originals-v3'||originals.files.length!==5)fail('complete original census differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const files=[];
 for(const original of originals.files){
  const {path,source:before}=original,selections=[];
  if(Buffer.byteLength(before)!==original.bytes||hash(before)!==original.sha256)fail('complete original source differs');
  let language=before;
  if(path.endsWith('/builtin-derive-data-inputs.mjs')){
   const selected=selectedFunction(ts,path,before,'dataInputs');
   let copied=once(selected.source,'function dataInputs(options,enumPayloads)','function cloneDataInputs(options,enumPayloads)');
   copied=once(copied,"if(kind==='struct'&&body?.text===';'&&at+1===trees.length)style='unit-struct';",[
    "if(kind==='struct'&&body?.delimiter==='('&&trees[at+1]?.text===';'&&at+2===trees.length){",
    "  style='tuple-struct';fields.push(...fieldList(body.children,false,true));",
    " }else if(kind==='struct'&&body?.text===';'&&at+1===trees.length)style='unit-struct';",
   ].join('\n'));
   selections.push({...selected,name:'dataInputs',copiedAs:'cloneDataInputs',replacement:copied});
   language=before+'\n// Clone opts into tuple-struct syntax; old syntax APIs retain their domains.\n'+copied+'\nexport const builtinCloneDataInputs=options=>cloneDataInputs(options,true);\n';
  }else if(path.endsWith('/builtin-clone-ast-route.mjs')){
   language=replaceFunction(ts,path,language,'originalLeaves',source=>once(source,"(input.style==='payload-enum'?builtinPayloadDataInputs:builtinDeriveDataInputs)","(input.style==='tuple-struct'?builtinCloneDataInputs:input.style==='payload-enum'?builtinPayloadDataInputs:builtinDeriveDataInputs)"),selections);
   language=replaceFunction(ts,path,language,'materialize',source=>once(source,"}else if(leaves.inputSyntax.style==='named-struct')full=",[
    "}else if(leaves.inputSyntax.style==='tuple-struct')full=expr('expr_call',{expr:expr('expr_path',{qself:null,path:path([leaves.inputSyntax.name])}),args:leaves.fields.map(cloneField)});",
    " else if(leaves.inputSyntax.style==='named-struct')full=",
   ].join('\n')),selections);
   language=replaceFunction(ts,path,language,'liftBuiltinCloneAstRoute',source=>{
    let after=once(source,'if(payload){const original=',[
     "let tupleStructFlow=null;",
     " if(input.style==='tuple-struct'){",
     "  const tupleOriginal=originalAstFunction(profile,directory+'clone.rs','cs_clone'),access=originalAstFunction(profile,generic,'create_struct_field_access_fields'),parser=originalAstFunction(profile,'compiler/rustc_parse/src/parser/item.rs','parse_tuple_struct_body');",
     "  contains(tupleOriginal,'VariantData::Tuple(..)','let subcalls = all_fields.iter().map(|f| subcall(cx, f)).collect()','cx.expr_call(trait_span, path, subcalls)');",
     "  contains(access,'self.create_fields(struct_def, |i, struct_field, sp|','Ident::from_str_and_span(&i.to_string(), struct_field.span)');",
     "  contains(parser,'self.parse_paren_comma_seq','p.parse_outer_attributes()?','let lo = p.token.span','p.parse_visibility(FollowedByType::Yes)','let ty = match p.parse_ty()','span: lo.to(ty.span)','ident: None');",
     "  tupleStructFlow={schema:'original-clone-tuple-struct-output-v1',originalCompilerFragments:[tupleOriginal,access,parser].map(row=>({source:row.source,sourceSha256:row.sourceSha256,span:row.span,digest:row.digest})),fields:leaves.fields.map((field,index)=>({index,ident:field.name,fieldInfoSpan:field.fieldInfoSpan})),construction:'actual tuple constructor called with ordered Clone::clone shared field accesses',resolverBranches:['has_derive_copy=false','has_derive_copy=true'],generatedImplBehavior:false};",
     " }",
     " if(payload){const original=",
    ].join('\n'));
    return once(after,'typedSource:leaves,plan:', 'typedSource:leaves,...(tupleStructFlow?{tupleStructFlow}:{}),plan:');
   },selections);
  }else if(path.endsWith('/builtin-derive-bang-footprints.mjs')){
   language=replaceFunction(ts,path,language,'proveCloneDataOutput',source=>once(source,'const input=builtinPayloadDataInputs(', 'const input=builtinCloneDataInputs('),selections);
   language=replaceFunction(ts,path,language,'debugDataInput',source=>once(source,'const input=builtinDebugDataInputs(', 'const input=builtinCloneDataInputs('),selections);
   language=replaceFunction(ts,path,language,'proveBuiltinDeriveBangFootprint',source=>once(source,'route=liftBuiltinDebugAstRoute(',"route=(selected.input.style==='tuple-struct'?liftBuiltinDebugTupleAstRoute:liftBuiltinDebugAstRoute)("),selections);
   language=replaceFunction(ts,path,language,'proveBuiltinDebugEnclosingNamespace',source=>once(source,'grammar=compileBuiltinDebugEnclosingNamespaceModel(',"grammar=(selected.input.style==='tuple-struct'?compileBuiltinDebugTupleEnclosingNamespaceModel:compileBuiltinDebugEnclosingNamespaceModel)("),selections);
  }else if(path.endsWith('/builtin-debug-ast-route.mjs')){
   const close=selectedFunction(ts,path,before,'closeBranches');
   let closing=once(close.source,'function closeBranches(','function closeTupleDebugBranches(');
   closing=once(closing,"input.style==='named-struct'&&fields.length>plan.sourceControls.fieldCountCutoff&&branch.statements.length===2","input.style==='tuple-struct'&&fields.length>plan.sourceControls.fieldCountCutoff&&branch.statements.length===1");
   closing=once(closing,"local.pattern.ident!==['names','values'][index]","local.pattern.ident!=='values'");
   selections.push({...close,name:'closeBranches',copiedAs:'closeTupleDebugBranches',replacement:closing});
   const sourcePlan=[
    'function tupleDebugSourcePlan(profile,entry){',
    ' const plan=sourcePlan(profile,entry),show=originalAstFunction(profile,directory+\'debug.rs\',\'show_substructure\'),access=originalAstFunction(profile,generic,\'create_struct_field_access_fields\'),parser=originalAstFunction(profile,\'compiler/rustc_parse/src/parser/item.rs\',\'parse_tuple_struct_body\');',
    ' contains(show,\'Struct(vdata, fields) => (substr.type_ident, *vdata, fields)\',\'ast::VariantData::Tuple(..) => (false, 1)\',\'format!("debug_tuple_field{}_finish", fields.len())\',\'sym::debug_tuple_fields_finish\');',
    ' contains(access,\'self.create_fields(struct_def, |i, struct_field, sp|\',\'Ident::from_str_and_span(&i.to_string(), struct_field.span)\');',
    ' contains(parser,\'self.parse_paren_comma_seq\',\'p.parse_outer_attributes()?\',\'let lo = p.token.span\',\'p.parse_visibility(FollowedByType::Yes)\',\'let ty = match p.parse_ty()\',\'span: lo.to(ty.span)\',\'ident: None\');',
    ' return {...plan,recipes:[...plan.recipes,show,access,parser]};',
    '}',
   ].join('\n');
   const copies=[];
   for(const name of ['liftBuiltinDebugAstRoute','compileBuiltinDebugEnclosingNamespaceModel']){
    const selected=selectedFunction(ts,path,before,name),replacementName=name==='liftBuiltinDebugAstRoute'?'liftBuiltinDebugTupleAstRoute':'compileBuiltinDebugTupleEnclosingNamespaceModel';
    let copied=once(selected.source,'function '+name+'(','function '+replacementName+'(');
    copied=once(copied,'sourcePlan(profile,entry)','tupleDebugSourcePlan(profile,entry)');
    copied=once(copied,'fresh=builtinDebugDataInputs(','fresh=builtinCloneDataInputs(');
    copied=once(copied," if(input.style==='payload-enum')"+(name==='liftBuiltinDebugAstRoute'?'return liftPayloadEnum(profile,plan,original,certificate,input);':'return null;')," if(input.style!=='tuple-struct')throw new TypeError('Tuple Debug requires its explicit source input style');");
    copied=once(copied,'closeBranches(plan,branches,input,fields)','closeTupleDebugBranches(plan,branches,input,fields)');
    copied=once(copied,"originalFormat:'debug_struct_field{}_finish'","originalFormat:'debug_tuple_field{}_finish'");
    copied=once(copied,'...fields.flatMap((field,index)=>[string(field.name),last(fieldExpressions[index],index)])','...fieldExpressions.map(last)');
    copied=once(copied,"statements:[local('names',namesTy,names),local('values',valuesTy,values)]","statements:[local('values',valuesTy,values)]");
    copied=once(copied,"'debug_struct_fields_finish'","'debug_tuple_fields_finish'");
    copied=once(copied,"[fmt,name,path(['names']),path(['values'])]","[fmt,name,path(['values'])]");
    selections.push({...selected,name,copiedAs:replacementName,replacement:copied});copies.push(copied);
   }
   language=before+'\n// Explicit tuple Debug paths retain every original public source entry.\n'+sourcePlan+'\n'+closing+'\n'+copies.join('\n')+'\n';
  }else if(path.endsWith('/test/builtin-clone-ast-route.test.mjs')){
   const file=parsed(ts,path,before),loops=[];function visit(node){if(ts.isForOfStatement(node)&&ts.isArrayLiteralExpression(node.expression)&&node.expression.elements.some(value=>ts.isStringLiteral(value)&&value.text==='pub struct P(String);'))loops.push(node);ts.forEachChild(node,visit);}visit(file);
   if(loops.length!==1||!ts.isExpressionStatement(loops[0].statement))fail('one complete original refusal loop required');const node=loops[0].statement,selected=node.getText(file);
   selections.push({span:[node.getStart(file),node.end],source:selected,replacement:"{if(written==='pub struct P(String);'){const result=prove('#[derive(Clone,serde::Serialize)]'+written);assert.equal(result.inputSyntax.style,'tuple-struct');assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.generatedImplBehavior,false);}else "+selected+"}",reason:'retain every original input and deadline; the newly qualified tuple case now checks its actual source proof while all other refusal cases remain exact'});
  }else fail('unknown source path');
  let after=language;
  if(path.endsWith('/test/builtin-clone-ast-route.test.mjs')){const row=selections[0];after=language.slice(0,row.span[0])+row.replacement+language.slice(row.span[1]);}
  else if(!path.endsWith('/builtin-derive-data-inputs.mjs')){
   const file=parsed(ts,path,language),imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./builtin-derive-data-inputs.mjs');
   if(imports.length!==1||!ts.isNamedImports(imports[0].importClause.namedBindings))fail('one native input-module import required');
   const bindings=imports[0].importClause.namedBindings,at=bindings.getStart(file)+1;
   after=language.slice(0,at)+'builtinCloneDataInputs,'+language.slice(at);
   if(path.endsWith('/builtin-derive-bang-footprints.mjs')){
    const bound=parsed(ts,path,after),routes=bound.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./builtin-debug-ast-route.mjs'&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(element=>element.name.text==='liftBuiltinDebugAstRoute'));
    if(routes.length!==1||!ts.isNamedImports(routes[0].importClause.namedBindings))fail('one native Debug route import required');
    const at=routes[0].importClause.namedBindings.getStart(bound)+1;
    after=after.slice(0,at)+'liftBuiltinDebugTupleAstRoute,compileBuiltinDebugTupleEnclosingNamespaceModel,'+after.slice(at);
   }
  }
  parsed(ts,path,after);const current=readFileSync(resolve(root,path),'utf8'),previousAfter=after.replaceAll("'let ty = match p.parse_ty()','span: lo.to(ty.span)','ident: None'","'p.parse_ty()?'");
  if(current!==before&&current!==after&&current!==previousAfter)fail('unknown complete physical source '+path);
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'rust-clone:derive-original-tuple-struct-output',apply:source=>{if(source!==before)fail('original phase join');return language;}}]},
   {phase:'repository',rules:[{id:'router-clone:bind-opt-in-original-input-helper',apply:source=>{if(source!==language)fail('language phase join');return after;}}]},
  ]).run(before);
  if(run.value!==after)fail('complete source rule result differs');
  const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}])
   .map((stage,index)=>({...stage,phase:index?'repository':'language',completeInverse:stage.inverse===(index?language:before)}));
  if(stages.some(stage=>!stage.completeInverse))fail('complete serialized/reparsed inverse differs');
  const currentToAfter=current!==before&&current!==after?transportConcreteSourceEquations([{before:current,after,language:'JavaScript'}])[0]:null;if(currentToAfter&&currentToAfter.inverse!==current)fail('complete receiving inverse differs');
  files.push({path,before,language,after,current,previousAfter,currentToAfter,inverse:before,nativeSelections:selections,stages,trace:run.trace});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));
 files.forEach((row,index)=>{row.nativeBindings=bindings[index];if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('complete physical source changed');});
 if(!readFileSync(resolve(root,ARCHIVE)).equals(packed))fail('original archive changed');
 return {schema:'tuple-derive-source-preparation-v2',files,originalInputs:originals.files,semanticAuthority:false,runtimeAuthority:false,generatedCloneBehavior:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');
 const plan=prepareTupleDerive();if(mode==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('generated sources are stale');
 console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
