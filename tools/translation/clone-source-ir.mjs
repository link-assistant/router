// Original compiler Clone AST slots -> source-selected ordinary record/copy
// operations. No original Router method is fabricated or counted here.
import {createHash} from 'node:crypto';
import {assertCloneCaller,cloneSourceContextFacts} from './clone-trait-source.mjs';
import {extractImplDeclarations} from './impl-resolver.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget} from './project-nominal.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {proveBuiltinScalarSourceOutput,assertBuiltinScalarSourceOutput,builtinScalarOriginalSourcePlan} from './builtin-scalar-ast-route.mjs';
import {astSyntaxText} from './builtin-derive-ast-meta.mjs';
import {originalPrimitiveCloneExpansion} from './extensions/primitive-clone-source.mjs';
import {proveCloneOnlyRecordNoDrop} from './clone-record-no-drop.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {createOriginalCloneSurface,createOriginalCloneUnitSurface,assertOriginalCloneSurface} from './extensions/clone-source-body.mjs';
import {originalUnitCloneSource} from './clone-unit-source.mjs';
import {originalNestedImplementationObligations} from './nested-implementation-obligations.mjs';
import {originalCloneContainerFields} from './clone-container-fields.mjs';
import {proveCloneContainerNoDrop} from './clone-container-no-drop.mjs';
import {createOriginalCloneContainerSurface} from './extensions/clone-container-body.mjs';
const generated=new WeakMap(),coherence=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original Clone AST lowering: '+message);};
function writtenCloneFamilies(context,state){
 const cached=coherence.get(context),cacheable=Object.isFrozen(state.modules)&&Object.isFrozen(state.binding)&&Object.isFrozen(state.compilationProfile);
 if(cacheable&&cached?.modules===state.modules&&cached.binding===state.binding&&cached.profile===state.compilationProfile)return cached;
 const identities=nominalTypeIdentities(state.binding.scopes,state.modules),families=new Set();let unresolved=false;
 for(const owner of state.modules){
  if(originalNestedImplementationObligations(owner).length)unresolved=true;
  const extracted=extractImplDeclarations(owner.source,{sourcePath:owner.file,modulePath:owner.path,sourceView:owner.sourceView,compilationProfile:state.compilationProfile});
  for(const implementation of extracted.implementations){
   if(!implementation.methods.some(method=>method.name==='clone'))continue;
   const target=resolveNominalImplTarget(implementation,{...owner,items:originalSourceModuleItems(owner)},state.binding.scopes,identities);
   if(!target)unresolved=true;else families.add(JSON.stringify(target.family));
  }
 }
 const result={modules:state.modules,binding:state.binding,profile:state.compilationProfile,unresolved,families};if(cacheable)coherence.set(context,result);return result;
}
function primitiveSyntax(Parser,member){
  if(Parser!==HostRustParser)fail('requires the actual original Host parser');
  // Preserve the actual expanded block including original braces. The
  // enclosing member signature/attributes stay in the complete source proof.
  const tokens=tokenizeRust(member.methodSource),open=tokens.findIndex(token=>token.value==='{'),close=tokens.findLastIndex(token=>token.value==='}');if(open<0||close<open)fail('original primitive block is absent');
  const source=member.methodSource.slice(tokens[open].start,tokens[close].end),parser=new Parser(tokenizeRust(source)),identity=originalHostParserIdentitySnapshot();
  const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(identity.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(identity.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  guard();const syntax=parser.block([]);guard();
  if(!parser.cursor.atEnd()||syntax.k!=='routerPrimitiveDereference'||syntax.value?.k!=='name'||!same(syntax.value.path,['self']))fail('complete original primitive Clone AST differs');
  return {target:member.target,member,blockSource:source,blockSha256:hash(source),syntax,syntaxSha256:hash(JSON.stringify(syntax)),parser:'actual original HostRustParser and TokenCursor identities rechecked'};
}
export function originalCloneGeneratedMethod(context,module,item,Parser){
  if(Parser!==HostRustParser)fail('requires the actual original Host parser');const {state,original}=assertCloneCaller(context,module),actual=originalSourceModuleItems(original).find(candidate=>candidate.start===item.start&&candidate.end===item.end&&candidate.name===item.name);
  if(!actual||!same(actual.tokens,item.tokens))fail('original declaration differs');item=actual;const input=inspectDeriveInput(item,state.compilationProfile);
  if(input.derives.filter(owner=>same(owner.path,['Clone'])).length!==1||input.genericParameters||input.lifetimeParameters)fail('one actual nongeneric standard Clone invocation required');
  const written=writtenCloneFamilies(context,state),family=['crate',...original.path,item.name];
  if(written.unresolved||written.families.has(JSON.stringify(family)))fail('written clone method has an unresolved or overlapping actual nominal target');
  if(item.term==='enum'){
    const unitSource=originalUnitCloneSource(context,original,item),surface=createOriginalCloneUnitSurface(context,original,item,unitSource);
    assertOriginalCloneSurface(surface);generated.set(surface,{context,module:original,item,unitSource,digest:hash(JSON.stringify(surface))});return surface;
  }
  const args={dependencies:state.dependencies,source:original.source,span:{start:item.start,end:item.end},owner:'Clone'};let output;try{output=proveBuiltinScalarSourceOutput(args);}catch(error){if(!(error instanceof TypeError))throw error;const fields=originalCloneContainerFields(context,original,item,Parser),noDrop=fields.hasDeriveCopy?null:proveCloneContainerNoDrop(context,original,item,fields),surface=createOriginalCloneContainerSurface({context,module:original,item,fields,noDrop,Parser});assertOriginalCloneSurface(surface);generated.set(surface,{context,module:original,item,containerFields:fields,digest:hash(JSON.stringify(surface))});return surface;}assertBuiltinScalarSourceOutput(output,args);const plan=builtinScalarOriginalSourcePlan(output);
  for(const [name,expected]of [['name','sym :: clone'],['nonself_args','Vec :: new ()'],['ret_ty','Self_'],['explicit_self','true']]){const field=plan.descriptors.Clone.method.fields.find(field=>field.name===name);if(!field||astSyntaxText(field.expression)!==expected)fail('actual MethodDef signature slot differs: '+name);}
  const hasCopy=input.derives.some(owner=>same(owner.path,['Copy'])),branch=output.branches.find(branch=>branch.feature==='has_derive_copy='+hasCopy);if(!branch||output.branches.length!==2)fail('actual original Clone feature branches differ');
  const primitive=originalPrimitiveCloneExpansion(),bodies=output.input.fields.map(field=>{const members=primitive.members.filter(member=>member.target===field.type);if(members.length!==1)fail('field lacks its actual original primitive Clone implementation');return {field:field.name,type:field.type,typeSpan:field.typeSpan,...primitiveSyntax(Parser,members[0])};});
  const noDrop=hasCopy?null:proveCloneOnlyRecordNoDrop(context,original,item,output);
  const surface=createOriginalCloneSurface({context,module:original,item,output,branch,plan,primitive,bodies,noDrop,methodName:context.standard.symbols.slots.clone.value});
  assertOriginalCloneSurface(surface);generated.set(surface,{context,module:original,item,output,args,digest:hash(JSON.stringify(surface))});return surface;
}
export function assertOriginalCloneGeneratedMethod(surface,context){const state=generated.get(surface);if(!state||state.context!==context||hash(JSON.stringify(surface))!==state.digest)fail('surface is copied, changed or rebound');assertCloneCaller(context,state.module);if(!state.unitSource&&!state.containerFields)assertBuiltinScalarSourceOutput(state.output,state.args);assertOriginalCloneSurface(surface);return surface;}
export function originalCloneGeneratedMethods(context,module,Parser){const state=cloneSourceContextFacts(context),methods=[],refused=[];
  for(const item of originalSourceModuleItems(module).filter(item=>['struct','enum'].includes(item.term)&&itemConfiguration(item.tokens,state.compilationProfile).status==='active')){let input;try{input=inspectDeriveInput(item,state.compilationProfile);}catch{continue;}if(!input.derives.some(owner=>same(owner.path,['Clone'])))continue;try{methods.push({item,surface:originalCloneGeneratedMethod(context,module,item,Parser)});}catch(error){if(!(error instanceof TypeError))throw error;refused.push({item,message:error.message});}}
  return {methods,refused};
}
