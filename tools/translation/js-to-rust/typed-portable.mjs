// Native-selected TypeScript annotations become independently checked contracts.
// This is an additive frontend, not unrestricted TypeScript annotation erasure.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {translateJavaScript} from './translator.mjs';
import {snakeFromCamel} from './vendor/ir.mjs';
import {constructMap,idBySpelling} from './vendor/constructs.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';

const fail=message=>{throw new TypeError('Typed portable source: '+message);};
const scalarKinds=ts=>new Map([[ts.SyntaxKind.StringKeyword,'string'],[ts.SyntaxKind.NumberKeyword,'number'],[ts.SyntaxKind.BooleanKeyword,'boolean']]);
function nativeSource(source,path){const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete native TypeScript grammar differs');return {ts,file};}
function sourcePlan(stage,path){
 if(stage.concreteSyntax.language!=='TypeScript')fail('TypeScript concrete input required');
 const source=stage.source,{ts,file}=nativeSource(source,path),kinds=scalarKinds(ts),aliases=new Map(),selections=[],contracts=[],ranges=[],locals=[];
 const selected=(node,replacement,kind,start=node.getStart(file))=>{selections.push({span:[start,node.end],expected:source.slice(start,node.end),replacement,kind});};
 const allowType=node=>{ranges.push([node.getStart(file),node.end]);};
 for(const node of file.statements)if(ts.isTypeAliasDeclaration(node)){
  if(node.typeParameters?.length||node.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword)||aliases.has(node.name.text))fail('one nongeneric scalar type alias required');aliases.set(node.name.text,node);
 }
 function scalar(node,seen=new Set()){
  if(!node)fail('explicit scalar source type required');const primitive=kinds.get(node.kind);if(primitive)return primitive;
  if(ts.isParenthesizedTypeNode(node))return scalar(node.type,seen);
  if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&!node.typeArguments?.length){const name=node.typeName.text;if(!aliases.has(name)||seen.has(name))fail('unresolved or recursive scalar alias');return scalar(aliases.get(name).type,new Set(seen).add(name));}
  fail('type is outside the explicit string/number/boolean domain');
 }
 for(const node of file.statements){
  if(ts.isTypeAliasDeclaration(node)){scalar(node.type,new Set([node.name.text]));allowType(node.type);selected(node,'','compile-time-scalar-alias');continue;}
  if(ts.isFunctionDeclaration(node)){
   if(!node.name||!node.body||node.asteriskToken||node.typeParameters?.length||node.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary nongeneric scalar function required');
   if(ts.getJSDocTags(node).some(tag=>['param','return','returns','type','template','this'].includes(tag.tagName.text)))fail('competing JSDoc signature or generic contract');
   const parameters=[],docs=[];
   for(const parameter of node.parameters){
    if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('ordinary required scalar parameter');
    const type=scalar(parameter.type);allowType(parameter.type);parameters.push({name:snakeFromCamel(parameter.name.text),type});docs.push('@param {'+type+'} '+parameter.name.text);selected(parameter.type,'','native-scalar-parameter-annotation',parameter.name.end);
   }
   const returns=node.type?scalar(node.type):null;
   if(node.type){allowType(node.type);docs.push('@returns {'+returns+'}');const close=node.parameters.end;let at=close;while(at<node.body.getStart(file)&&source[at]!==')')at++;if(source[at]!==')')fail('complete native parameter-list close');selected(node.type,'','native-scalar-return-annotation',at+1);}
   const start=node.getStart(file);selections.push({span:[start,start],expected:'',replacement:'/**\n'+docs.map(value=>' * '+value).join('\n')+'\n */\n',kind:'native-signature-to-checked-jsdoc'});
   contracts.push({kind:'function',name:snakeFromCamel(node.name.text),parameters,returns,span:[node.getStart(file),node.end]});
   const names=new Set();function visitLocal(child){
    if(child!==node&&(ts.isFunctionLike(child)||ts.isClassLike(child)))fail('nested function/class source requires its own typed frontend');
    if(ts.isVariableDeclaration(child)&&child.type){if(!ts.isIdentifier(child.name)||!child.initializer||names.has(child.name.text))fail('unambiguous initialized scalar local required');names.add(child.name.text);const type=scalar(child.type);allowType(child.type);selected(child.type,'','native-scalar-local-annotation',child.name.end);locals.push({owner:snakeFromCamel(node.name.text),name:snakeFromCamel(child.name.text),type,span:[child.getStart(file),child.end]});}
    ts.forEachChild(child,visitLocal);
   }visitLocal(node);
   continue;
  }
  if(ts.isVariableStatement(node)){
   if(node.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword)||!(node.declarationList.flags&ts.NodeFlags.Const))fail('ordinary scalar const declaration required');
   for(const declaration of node.declarationList.declarations){if(!ts.isIdentifier(declaration.name)||!declaration.initializer)fail('one initialized scalar const binding required');if(declaration.type){const type=scalar(declaration.type);allowType(declaration.type);selected(declaration.type,'','native-scalar-constant-annotation',declaration.name.end);contracts.push({kind:'constant',name:snakeFromCamel(declaration.name.text),type,span:[declaration.getStart(file),declaration.end]});}}
   continue;
  }
  fail('module contains unsupported runtime or type declarations');
 }
 function inspect(node){
  if(ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node))fail('type assertions and non-null assertions need independent semantic rules');
  if(ts.isTypeNode(node)){const start=node.getStart(file);if(ranges.some(([a,b])=>start>=a&&node.end<=b))return;fail('unselected TypeScript type construct');}
  ts.forEachChild(node,inspect);
 }inspect(file);
 if(!contracts.some(row=>row.kind==='function')||contracts.length>4096||selections.length>4096)fail('bounded nonempty scalar function module required');
 const concrete=transportConcreteSyntaxMeta(stage.concreteSyntax.meta);if(concrete.source!==source)fail('complete source/CST join differs');
 const run=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'typescript:substitute-native-selected-scalar-contracts',edits:selections.map(({span,expected,replacement})=>({span,expected,replacement})).sort((a,b)=>a.span[0]-b.span[0]||a.span[1]-b.span[1])}],repositoryRules:[]});
 const afterMeta=serializeConcreteSyntaxMeta(run.value),after=transportConcreteSyntaxMeta(afterMeta).source;
 const equations=transportConcreteSourceEquations([{before:source,after,language:'TypeScript'}]);if(equations[0].inverse!==source)fail('complete annotation source inverse differs');
 return {source,after,originalConcreteSyntax:stage.concreteSyntax,afterMeta,selections,contracts,locals,equations,trace:run.trace};
}
function checkContracts(plan,translated){
 const type=value=>{const id=idBySpelling(constructMap().types,'javascript',value);if(!id)fail('scalar type has no existing semantic contract');return id;};
 for(const row of plan.contracts){
  const entries=translated.program.filter(entry=>entry.kind===row.kind&&entry.name===row.name);if(entries.length!==1)fail('one complete independently checked source declaration required');const entry=entries[0];
  if(row.kind==='constant'){if(entry.type!==type(row.type))fail('constant annotation and checked value differ');continue;}
  if(entry.params.length!==row.parameters.length||entry.params.some((parameter,index)=>parameter.name!==row.parameters[index].name||parameter.type!==type(row.parameters[index].type)))fail('parameter annotation and checked signature differ');
  if(row.returns&&entry.returns!==type(row.returns))fail('return annotation and checked body differ');
 }
 for(const row of plan.locals){
  const owner=translated.program.find(entry=>entry.kind==='function'&&entry.name===row.owner),found=[];function visit(value){if(!value||typeof value!=='object')return;if(value.kind==='let'&&value.name===row.name)found.push(value);for(const child of Object.values(value)){if(Array.isArray(child))child.forEach(visit);else if(child&&typeof child==='object')visit(child);}}visit(owner?.body);
  if(found.length!==1||found[0].value.type!==type(row.type))fail('local annotation and independently checked expression differ');
 }
}
function translate(stage,options={}){
 const path=options.sourcePath??'input.ts';let plan;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'typescript:bind-native-scalar-types-and-retain-CST-inverse',apply:()=>{plan=sourcePlan(stage,path);return plan.after;}},
   {id:'javascript:use-existing-checked-meta-and-rust-typescript-emission',apply:source=>{const result=translateJavaScript(source,options);checkContracts(plan,result);return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-original-typescript-and-complete-annotation-history',apply:result=>({...result,javascript:plan.after,originalTypeScriptConcreteSyntax:plan.originalConcreteSyntax,typeAnnotationHistory:{selections:plan.selections,contracts:plan.contracts,locals:plan.locals,equations:plan.equations,trace:plan.trace},runtimeParity:false,wholeRouterSynchronization:false})}]},
 ]).run(stage);
 return {...run.value,typedSourceRuleTrace:run.trace};
}
export function translateTypeScript(source,options){return translate(prepareReverseConcreteSource(source,'TypeScript'),options);}
export function translateTypeScriptConcreteSyntaxMeta(meta,options){return translate(parseReverseConcreteSource(meta),options);}
export function readTypeScriptSourceMeta(meta,source,options){const current=translateTypeScript(source,options);if(meta!==current.meta)fail('meta differs from freshly checked complete TypeScript source');return current.program;}
