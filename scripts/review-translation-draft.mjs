#!/usr/bin/env node
// Review original inputs and every generated output. This does not certify
// target behavior, replace regeneration checks or grant a green gate stamp.
import fs from 'node:fs';
import {createHistoricalTranslationReview} from './historical-translation-review.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual,types as utilTypes} from 'node:util';
import {parseProgram,roundTripProgram} from '../tools/translation/semantic-meta.mjs';
import {loadProjectMetaStorage} from '../tools/translation/project-meta-storage.mjs';
import {sourceItems} from '../tools/translation/rust-structure.mjs';
import {inspectDeriveInput} from '../tools/translation/derive-inputs.mjs';
import {loadDeriveDependencyProof} from '../tools/translation/derive-dependencies.mjs';
import {reviewInitialSourceGenericLayouts,reviewSourceAdmittedHostLayouts} from './review-source-generic-layouts.mjs';
import {loadJsonMacroSourceProof} from '../tools/translation/json-macro-inputs.mjs';
import {proveBuiltinScalarSourceOutput,builtinScalarOriginalSourcePlan} from '../tools/translation/builtin-scalar-ast-route.mjs';
import {pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence} from '../tools/translation/extensions/standard-body-source.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from '../tools/translation/extensions/host-contracts.mjs';
import {assertOriginalParserIdentity} from '../tools/translation/original-parser-identity.mjs';
import {tokenizeRust} from '../tools/translation/extensions/lexical.mjs';
import {TokenCursor} from '../tools/translation/vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from '../tools/translation/extensions/text.mjs';
import {rustFixedType} from '../tools/translation/checked-types.mjs';
import {itemConfiguration} from '../tools/translation/cfg-profile.mjs';
import {TranslationError} from '../tools/translation/vendor/meta-language/translation/diagnostics.js';
import {resolveModuleGraph} from '../tools/translation/project.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintExternalModules} from '../tools/translation/derive-footprints.mjs';
import {createCloneSourceContext,cloneSourceContextFacts} from '../tools/translation/clone-trait-source.mjs';
import {originalCloneGeneratedMethod} from '../tools/translation/clone-source-ir.mjs';
import {createDefaultSourceContext,defaultSourceContextFacts} from '../tools/translation/default-trait-source.mjs';
import {originalDefaultGeneratedMethod,assertOriginalDefaultGeneratedMethod,originalDefaultGeneratedDependencyEvidence} from '../tools/translation/default-source-ir.mjs';
import {linkOriginalCloneSemantic} from '../tools/translation/extensions/clone-source-body.mjs';
import {registeredStandardHostBindings} from '../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../tools/translation/toml-value-namespace.mjs';
import {configureParserSourceScope} from '../tools/translation/source-scopes.mjs';
import {resolveModuleBindings} from '../tools/translation/module-bindings.mjs';
import {createDeriveBangContext} from '../tools/translation/derive-bang-context.mjs';
import {createToolAttributeContext} from '../tools/translation/tool-attributes.mjs';
import {configureToolAttributes} from '../tools/translation/tool-attribute-layout.mjs';
import {configureDeriveLayout} from '../tools/translation/derive-layout.mjs';
import {moduleScopeKey,originalSourceModuleItems} from '../tools/translation/source-module-views.mjs';
import {linkProjectDeclaration,metadataDigest} from '../tools/translation/extensions/source-links.mjs';
import {projectCopyEvidence,originalOptionCopyPayload} from '../tools/translation/project-copy.mjs';
import {HostChecker} from '../tools/translation/extensions/host-contracts.mjs';

const MAX_FILE_BYTES=64*1024*1024,MAX_TOTAL_BYTES=512*1024*1024,MAX_FILES=32768;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const outputRoots=['tools/translation/meta','tools/translation/projects','js/generated/rust-draft','ts/generated/rust-draft','js/generated/rust-project','ts/generated/rust-project'];
const statusNames=['executable','carried','preserved'];
const identity=item=>JSON.stringify([item.term,item.name??null,item.span.start,item.span.end,item.sha256]);
function git(root,args,input) {
  const result=spawnSync('git',args,{cwd:root,input,timeout:30_000,maxBuffer:MAX_TOTAL_BYTES});
  if(result.status!==0)throw new Error(result.error?.message??result.stderr?.toString()??'Git review failed');
  return result.stdout;
}
function relativeName(name) {
  if(typeof name!=='string'||!name||name.length>4096||name.includes('\\')||/[\x00-\x1f]/u.test(name)||path.isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Review requires bounded relative paths');
  return name;
}
function parse(bytes) {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
function categoryCounts(rows) {
  const counts=new Map();
  for(const row of rows){const key=JSON.stringify([row.kind??null,row.message??row.diagnostic??null]);counts.set(key,(counts.get(key)??0)+1);}
  return [...counts].map(([key,count])=>{const [kind,message]=JSON.parse(key);return {kind,message,count};}).sort((a,b)=>b.count-a.count||JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function compactItem(source,item) {return {source,term:item.term,name:item.name??null,span:item.span,sha256:item.sha256,status:item.status,diagnostic:item.diagnostic??null};}

const sha256Pattern=/^[a-f0-9]{64}$/u;
const same=(actual,expected,message)=>{if(!isDeepStrictEqual(actual,expected))throw new Error(message);};
const generatedIdentity=item=>JSON.stringify([item.source,item.name,item.generator,item.origin,item.originalDeclarationTerm,item.span.start,item.span.end,item.itemSha256]);
function generatedArray(meta) {
  if(!Object.hasOwn(meta,'checkedGeneratedMethods'))return [];
  if(!Array.isArray(meta.checkedGeneratedMethods))throw new Error('Malformed generated method metadata');
  return meta.checkedGeneratedMethods;
}
function flattenedNode(node,names) {
  if(Array.isArray(node))return node.map(value=>flattenedNode(value,names));
  if(!node||typeof node!=='object')return node;
  const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,flattenedNode(value,names)]));
  if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);
  if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;
  if(node.k==='ctor')result.data=names.get(node.data)??node.data;
  return result;
}
function primitiveType(type){const result={...type};delete result.rustSourceType;return result;}
function originalPrimitiveBody(selection){
  const parser=new HostRustParser(tokenizeRust(selection.method.bodySource)),snapshot=originalHostParserIdentitySnapshot();
  const identity=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  identity();const body=parsePinnedBody(HostRustParser,selection);identity();return body;
}
function checkDefaultBody(entry,data,fields) {
  if(!data?.record||data.ctors.length!==1||data.ctors[0].ctorStyle!=='named')throw new Error('Generated Default has no checked named record');
  const layout=data.ctors[0].fields,names=[];let node=entry.body;
  if(layout.length!==fields.length)throw new Error('Generated Default field count mismatch');
  for(let index=0;index<fields.length;index++){
    const field=fields[index],declared=layout[index],body=field.originalBody;
    if(declared.name!==field.field||node?.k!=='let'||typeof node.name!=='string'||names.includes(node.name)||node.value?.k!=='lit')throw new Error('Generated Default field body mismatch');
    same(node.type,{kind:'data',name:data.fullName},'Generated Default binding result mismatch');
    same(primitiveType(declared.type),field.type==='bool'?{kind:'bool'}:{...rustFixedType(field.type),rustPrimitiveName:field.type},'Generated Default source field type mismatch');
    same(primitiveType(node.value.type),primitiveType(declared.type),'Generated Default literal type mismatch');
    const expected=body.k==='bool'?body.value:body.k==='num'?body.value:null;
    if(expected===null||node.value.value!==expected)throw new Error('Generated Default differs from original primitive body');
    names.push(node.name);node=node.body;
  }
  if(node?.k!=='ctor'||node.data!==data.fullName||node.ctor!==data.ctors[0].name||node.args.length!==layout.length)throw new Error('Generated Default constructor mismatch');
  same(node.type,{kind:'data',name:data.fullName},'Generated Default constructor type mismatch');
  node.args.forEach((arg,index)=>{same(arg,{k:'var',name:names[index],type:layout[index].type},'Generated Default field binding mismatch');});
}
const cloneSame=(actual,expected,message)=>{if(!isDeepStrictEqual(actual,expected))throw new Error(message,{cause:{actual,expected}});};
// Reinspect source-owned Clone output, then check only its actual bounded
// nominal declaration and generated body. No original Rust function body is translated here.
function originalCloneReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies}) {
  const proof=typeof dependencies==='function'?dependencies():dependencies;
  if(!Array.isArray(meta.sources)||!meta.sources.length)throw new Error('Clone review requires complete original source modules');
  const paths=[...new Set(meta.sources.map(item=>{relativeName(item.source);return item.source;}))],sources=new Map(paths.map(name=>[name,readSource(name)]));
  for(const item of meta.sources)if(typeof sources.get(item.source)!=='string'||digest(sources.get(item.source))!==item.sha256)throw new Error('Clone original source module hash mismatch');
  const graph=resolveModuleGraph({entry:row.entry,paths,readSource:name=>sources.get(name),compilationProfile:meta.compilationProfile});
  cloneSame(graph.modules.map(module=>({source:module.file,sha256:digest(module.source),module:module.path})),meta.sources,'Clone complete original source module layout mismatch');
  const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(proof)]),derive=createDeriveFootprintContext({modules:graph.modules,dependencies:proof,externalModules,compilationProfile:graph.compilationProfile}),context=createCloneSourceContext(derive),state=cloneSourceContextFacts(context);
  return {graph,derive,context,state,sources,jsonMacroDependencies};
}
function cloneRelocate(node,offset) {
  if(Array.isArray(node))return node.map(value=>cloneRelocate(value,offset));if(!node||typeof node!=='object')return node;
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,['cloneSourceProof','deriveNamespaceProof','copyCertificate','toolAttributeProof'].includes(key)?value:key==='span'&&value?{start:value.start+offset,end:value.end+offset}:cloneRelocate(value,offset)]));
}
function cloneTree(path,items){for(const name of [...path].reverse())items=[{k:'module',name,items}];return items;}
function originalEnumBinding(context) {
  if(context.enumBinding)return context.enumBinding;
  const {graph,derive}=context,externalModules=deriveFootprintExternalModules(derive);
  const toolContext=createToolAttributeContext({modules:graph.modules,externalModules,deriveContext:derive,compilationProfile:graph.compilationProfile}),deriveBangContext=createDeriveBangContext({deriveContext:derive});
  context.enumToolContext=toolContext;
  return context.enumBinding=resolveModuleBindings({modules:graph.modules,externalModules,deriveContext:derive,deriveBangContext,toolContext,compilationProfile:graph.compilationProfile});
}
// Reparse source-owned nominal layouts only. Original function/method bodies
// are excluded, and unsupported layouts retain the producer's type refusal.
function originalEnumNominals(context,module,item,data,offset,binding) {
  const declarations=[],snapshot=originalHostParserIdentitySnapshot();
  for(const owner of context.graph.modules){
    if(owner.configurationCondition!=='active')continue;
    for(const original of originalSourceModuleItems(owner).filter(original=>['struct','enum'].includes(original.term)&&original.name!=='main'&&itemConfiguration(original.tokens,context.graph.compilationProfile).status==='active')){
      if(owner.file===module.file&&moduleScopeKey(owner)===moduleScopeKey(module)&&original.start===item.start&&original.end===item.end){declarations.push({file:owner.file,path:owner.path,name:[...owner.path,original.name].join('.'),term:original.term,span:{start:original.start,end:original.end},globalSpan:{start:offset+original.start,end:offset+original.end},surface:data});continue;}
      const scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(owner)),kernel=owner.source.slice(original.start,original.end),parser=new HostRustParser(tokenizeRust(kernel));
      const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
      try{
        const configured=configureParserSourceScope(parser,scope,binding.scopes,owner.path);parser.aliases=configured.aliases;parser.modulePath=owner.path;
        configureToolAttributes(parser,context.enumToolContext,owner,original,kernel);const certificate=deriveFootprintAt(context.derive,owner,original);if(certificate)configureDeriveLayout(parser,certificate,kernel,original.start);
        guard();const items=[];parser.items({main:null},items,owner.path,()=>parser.cursor.atEnd());guard();if(items.length!==1||items[0].k!=='data'||!parser.cursor.atEnd())throw new Error('Clone original nominal parser mismatch');
        const surface=cloneRelocate(items[0],owner.offset+original.start),globalSpan={start:owner.offset+original.start,end:owner.offset+original.end};
        linkProjectDeclaration(parser,items[0],surface,{source:owner.source,sourcePath:owner.file,itemSpan:{start:original.start,end:original.end},itemOffset:original.start,globalOffset:owner.offset,path:owner.path,scope:{bindingEvidence:scope,compilationProfile:context.graph.compilationProfile,configurationCondition:owner.configurationCondition}});
        declarations.push({file:owner.file,path:owner.path,name:[...owner.path,original.name].join('.'),term:original.term,span:{start:original.start,end:original.end},globalSpan,surface});
        for(const type of parser.genericTypes.values()){
          const previous=declarations.find(entry=>entry.name===type.name&&entry.path.length===0),origin={file:owner.file,path:[...owner.path]};
          if(previous){if(previous.term==='generated-type'&&!previous.sourceModuleOrigins.some(candidate=>moduleScopeKey(candidate)===moduleScopeKey(origin)))previous.sourceModuleOrigins.push(origin);continue;}
          declarations.push({file:owner.file,path:[],sourceModuleOrigins:[origin],name:type.name,term:'generated-type',globalSpan,surface:cloneRelocate(type,owner.offset+original.start)});
        }
      }catch(error){if(!(error instanceof TranslationError))throw error;}
    }
  }
  return declarations;
}
function originalCloneCheckedNominal(context,module,item,surface,offset) {
  const {state,derive}=context,binding=item.term==='enum'?originalEnumBinding(context):state.binding,scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module)),parser=new HostRustParser(tokenizeRust(module.source.slice(item.start,item.end))),snapshot=originalHostParserIdentitySnapshot();
  const configured=configureParserSourceScope(parser,scope,binding.scopes,module.path);parser.aliases=configured.aliases;parser.modulePath=module.path;
  const certificate=deriveFootprintAt(derive,module,item);if(certificate)configureDeriveLayout(parser,certificate,module.source.slice(item.start,item.end),item.start);
  const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  guard();const items=[];parser.items({main:null},items,module.path,()=>parser.cursor.atEnd());guard();
  if(items.length!==1||items[0].k!=='data'||!parser.cursor.atEnd())throw new Error('Clone original record parser mismatch');
  const data=cloneRelocate(items[0],offset+item.start),span={start:offset+item.start,end:offset+item.end};
  linkProjectDeclaration(parser,items[0],data,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:offset,path:module.path,scope:{bindingEvidence:scope,compilationProfile:state.compilationProfile,configurationCondition:module.configurationCondition}});
  const aliases=new Map(state.modules.map(owner=>[moduleScopeKey(owner),configureParserSourceScope(new HostRustParser([]),binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(owner)),binding.scopes,owner.path).aliases])),scopes=new Map(binding.scopes.map(scope=>[moduleScopeKey(scope),scope]));
  if(surface.impl.cloneSourceProof.selectedBranch==='has_derive_copy=true'){
    const copyDependencies=item.term==='enum'?{deriveDependencies:state.dependencies,jsonMacroDependencies:typeof context.jsonMacroDependencies==='function'?context.jsonMacroDependencies():context.jsonMacroDependencies,sourceScopes:binding.scopes}:null;
    const originalNominals=item.term==='enum'?originalEnumNominals(context,module,item,data,offset,binding):[{file:module.file,path:module.path,name:[...module.path,item.name].join('.'),term:item.term,span:{start:item.start,end:item.end},globalSpan:span,surface:data}];
    projectCopyEvidence(originalNominals,state.modules,aliases,scopes,copyDependencies);
    if(!originalOptionCopyPayload(data))throw new Error('Clone Copy branch lacks its genuine original private Copy/no-Drop layout');
  }
  const generated=cloneRelocate(surface,offset);linkOriginalCloneSemantic(surface,generated,offset);
  const checked=roundTripProgram(new HostChecker('Rust',[]).program({language:'Rust',items:cloneTree(module.path,[data,generated]),main:null}));
  return {data:checked.declarations.get([...module.path,item.name].join('.')),entry:checked.declarations.get([...module.path,surface.name].join('.'))};
}
// Canonical Option layouts come only from fresh parsing of the full original
// nominal census. Checker state and private Copy/source identities are fresh.
function originalOptionCloneChecked(context,module,item,surface,offset) {
  const binding=originalEnumBinding(context),scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module)),kernel=module.source.slice(item.start,item.end),parser=new HostRustParser(tokenizeRust(kernel)),snapshot=originalHostParserIdentitySnapshot();
  const configured=configureParserSourceScope(parser,scope,binding.scopes,module.path);parser.aliases=configured.aliases;parser.modulePath=module.path;
  configureToolAttributes(parser,context.enumToolContext,module,item,kernel);const certificate=deriveFootprintAt(context.derive,module,item);if(certificate)configureDeriveLayout(parser,certificate,kernel,item.start);
  const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  guard();const parsed=[];parser.items({main:null},parsed,module.path,()=>parser.cursor.atEnd());guard();if(parsed.length!==1||parsed[0].k!=='data'||!parser.cursor.atEnd())throw new Error('Option Clone original record parser mismatch');
  const data=cloneRelocate(parsed[0],offset+item.start),span={start:offset+item.start,end:offset+item.end};
  linkProjectDeclaration(parser,parsed[0],data,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:offset,path:module.path,scope:{bindingEvidence:scope,compilationProfile:context.graph.compilationProfile,configurationCondition:module.configurationCondition}});
  context.optionNominals??=originalEnumNominals(context,module,{start:-1,end:-1},null,offset,binding);
  const layouts=new Map(context.optionNominals.map(declaration=>[declaration.name,declaration])),needed=new Set(),nominal=[...module.path,item.name].join('.');
  function requireLayout(name){if(needed.has(name))return;const declaration=layouts.get(name);if(!declaration)throw new Error('Option Clone original dependent layout missing: '+name);needed.add(name);const visit=node=>{if(Array.isArray(node))return node.forEach(visit);if(!node||typeof node!=='object')return;if(node.kind==='named'&&node.path?.[0]==='crate')requireLayout(node.path.slice(1).join('.'));for(const [key,value]of Object.entries(node))if(!['deriveNamespaceProof','toolAttributeProof','copyCertificate'].includes(key))visit(value);};visit(declaration.surface);}
  requireLayout(nominal);const declarations=[...needed].map(name=>name===nominal?{...layouts.get(name),surface:data}:layouts.get(name));
  if(surface.impl.cloneSourceProof.selectedBranch==='has_derive_copy=true'){
    const aliases=new Map(context.state.modules.map(owner=>[moduleScopeKey(owner),configureParserSourceScope(new HostRustParser([]),binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(owner)),binding.scopes,owner.path).aliases])),scopes=new Map(binding.scopes.map(scope=>[moduleScopeKey(scope),scope]));
    projectCopyEvidence(declarations,context.state.modules,aliases,scopes,{deriveDependencies:context.state.dependencies,jsonMacroDependencies:typeof context.jsonMacroDependencies==='function'?context.jsonMacroDependencies():context.jsonMacroDependencies,sourceScopes:binding.scopes});
    if(!originalOptionCopyPayload(data))throw new Error('Option Clone Copy branch lacks actual private original Copy/no-Drop');
  }
  const tree=[];for(const declaration of declarations){let items=tree;for(const name of declaration.path){let owner=items.find(item=>item.k==='module'&&item.name===name);if(!owner){owner={k:'module',name,items:[]};items.push(owner);}items=owner.items;}items.push(declaration.surface);}
  const generated=cloneRelocate(surface,offset);linkOriginalCloneSemantic(surface,generated,offset);let items=tree;for(const name of module.path)items=items.find(item=>item.k==='module'&&item.name===name).items;items.push(generated);
  const checked=roundTripProgram(new HostChecker('Rust',[]).program({language:'Rust',items:tree,main:null}));
  return {data:checked.declarations.get(nominal),entry:checked.declarations.get([...module.path,surface.name].join('.')),dependencies:[...needed].filter(name=>name!==nominal).map(name=>checked.declarations.get(name))};
}
// Only corresponding let slots may rename fresh locals. Their initializers
// remain outside the new binding; every other node and proof stays exact.
function optionCloneAlpha(expected,actual,params) {
  const reserved=new Set(params.map(param=>param.name)),seen=new Set();
  const reserve=node=>{if(!node||typeof node!=='object')return;if(node.k==='match')for(const row of node.cases??[])for(const name of row.pattern?.binds??[])reserved.add(name);for(const [key,value]of Object.entries(node))if(!['type','cloneSourceProof'].includes(key))Array.isArray(value)?value.forEach(reserve):reserve(value);};reserve(expected);reserve(actual);
  const visit=(left,right,names)=>{if(Array.isArray(left)){if(!Array.isArray(right)||left.length!==right.length)throw new Error('Option Clone checked array shape mismatch');return left.map((value,index)=>visit(value,right[index],names));}if(!left||typeof left!=='object')return left;
    if(left.k==='let'){if(right?.k!=='let'||typeof right.name!=='string'||reserved.has(right.name)||seen.has(right.name))throw new Error('Option Clone checked scoped local mismatch');seen.add(right.name);const nested=new Map(names);nested.set(left.name,right.name);return Object.fromEntries(Object.entries(left).map(([key,value])=>[key,key==='name'?right.name:key==='cloneSourceProof'?value:visit(value,right[key],key==='body'?nested:names)]));}
    return Object.fromEntries(Object.entries(left).map(([key,value])=>[key,key==='cloneSourceProof'?value:key==='name'&&left.k==='var'&&names.has(value)?names.get(value):visit(value,right?.[key],names)]));
  };return visit(expected,actual,new Map());
}
function cloneAlpha(expected,actual) {
  const names=new Map(),seen=new Set();let left=expected,right=actual.body;
  while(left?.k==='let'){
    if(right?.k!=='let'||typeof right.name!=='string'||seen.has(right.name)||right.name===actual.params[0].name)throw new Error('Clone checked local binding mismatch');
    names.set(left.name,right.name);seen.add(right.name);left=left.body;right=right.body;
  }
  if(right?.k==='let')throw new Error('Clone checked body contains extra local bindings');
  const rename=node=>{if(Array.isArray(node))return node.map(rename);if(!node||typeof node!=='object')return node;const value=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='cloneSourceProof'?value:rename(value)]));if(['let','var'].includes(node.k)&&names.has(node.name))value.name=names.get(node.name);return value;};
  return rename(expected);
}
function flattenedCloneNode(node,names) {
  if(Array.isArray(node))return node.map(value=>flattenedCloneNode(value,names));if(!node||typeof node!=='object')return node;
  const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='cloneSourceProof'?value:flattenedCloneNode(value,names)]));
  if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);
  if(node.kind==='named'&&node.path?.[0]==='crate'&&names.has(node.path.slice(1).join('.')))result.path=['crate',names.get(node.path.slice(1).join('.'))];
  if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;
  if(node.k==='ctor')result.data=names.get(node.data)??node.data;
  return result;
}
function reviewCloneMethod(meta,item,{checked,target,entries,names,used,context}) {
  if(item.term!=='generated-method'||item.origin!=='derive-invocation'||!['struct','enum'].includes(item.originalDeclarationTerm)||item.receiver!=='shared'||item.semanticBodyChecked!==true||item.runtimeParity===true||item.semanticAuthority===true||typeof item.name!=='string'||Object.hasOwn(item,'defaultSourceProof'))throw new Error('Invalid generated Clone classification');
  relativeName(item.source);const proof=item.cloneSourceProof,span=item.span,source=context.sources.get(item.source);
  if(typeof source!=='string'||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new Error('Invalid Clone original declaration boundary');
  const sourceSha256=digest(source),itemSha256=digest(source.slice(span.start,span.end));
  const option=proof?.schema==='original-generated-option-clone-ir-v1';
  if(!['original-generated-clone-ir-v1','original-generated-option-clone-ir-v1'].includes(proof?.schema)||proof.generator!=='core::clone::Clone'||proof.source!==item.source||proof.sourceSha256!==sourceSha256||proof.itemSha256!==itemSha256)throw new Error('Clone original declaration hash/identity mismatch');
  cloneSame(proof.span,span,'Clone original declaration span mismatch');
  const candidates=entries.filter(entry=>entry.impl?.cloneSourceProof?.source===item.source&&isDeepStrictEqual(entry.impl.cloneSourceProof.span,span));if(candidates.length!==1||used.has(candidates[0]))throw new Error('Clone metadata is not one-to-one');
  const entry=candidates[0],module=context.graph.modules.find(module=>module.file===item.source&&isDeepStrictEqual(module.path,entry.modulePath));if(!module)throw new Error('Clone source module mismatch');
  const original=originalSourceModuleItems(module).find(original=>original.term===item.originalDeclarationTerm&&original.start===span.start&&original.end===span.end);if(!original)throw new Error('Clone source declaration classification differs from the exact original item');
  const actual=originalCloneGeneratedMethod(context.context,module,original,HostRustParser),originalProof=actual.impl.cloneSourceProof;
  // Genuine unit compiler outputs include null-prototype profile records.
  // Compare their complete persisted JSON representation; keep the private
  // live source proof intact for reconstruction and every semantic check.
  const serializedOriginalProof=original.term==='enum'||option?JSON.parse(JSON.stringify(originalProof)):originalProof;
  if(option&&(JSON.stringify(proof)!==JSON.stringify(serializedOriginalProof)||JSON.stringify(entry.impl.cloneSourceProof)!==JSON.stringify(serializedOriginalProof)))throw new Error('Option Clone exact persisted original proof mismatch');
  cloneSame(proof,serializedOriginalProof,'Clone original source/AST/primitive/receiver proof mismatch');cloneSame(entry.impl.cloneSourceProof,proof,'Clone checked source proof mismatch');
  const nominal=[...module.path,original.name].join('.'),localName=actual.name;
  if(item.name!==nominal+'.clone'||entry.generated!=='router-source-generated-clone-method'||entry.name!==localName||entry.fullName!==[...module.path,localName].join('.')||entry.impl.method!=='clone'||entry.impl.receiver!=='shared'||entry.params.length!==1||entry.async||entry.constant||entry.constFunction||Object.hasOwn(entry.impl,'defaultSourceProof'))throw new Error('Clone checked generated signature/symbol mismatch');
  cloneSame(entry.impl.type,actual.impl.type,'Clone checked nominal owner mismatch');
  cloneSame(entry.ret,{kind:'data',name:nominal,rustSourceType:true},'Clone checked owned return mismatch');
  if(!Number.isSafeInteger(entry.span?.start)||!Number.isSafeInteger(entry.span?.end))throw new Error('Clone checked declaration boundary mismatch');const shift=entry.span.start-span.start;if(!Number.isSafeInteger(shift)||shift<0||entry.span.end-span.end!==shift)throw new Error('Clone relocated declaration span mismatch');
  if(meta.checkedMethods.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span))||meta.executable.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span)))throw new Error('Clone overlaps original fn/method counts');
  if(option&&shift!==module.offset)throw new Error('Option Clone original relocation mismatch');
  const regenerated=option?originalOptionCloneChecked(context,module,original,actual,shift):originalCloneCheckedNominal(context,module,original,actual,shift),data=checked.declarations.get(nominal);
  for(const dependency of regenerated.dependencies??[]){cloneSame(checked.declarations.get(dependency.fullName),dependency,'Option Clone whole checked canonical generic layout mismatch');cloneSame(target.declarations.get(names.get(dependency.fullName)),{...flattenedCloneNode(dependency,names),name:names.get(dependency.fullName),fullName:names.get(dependency.fullName),modulePath:[],generated:'router-project-flattened'},'Option Clone whole flattened canonical generic layout mismatch');}
  cloneSame(data,regenerated.data,'Clone actual checked original layout mismatch');
  cloneSame(entry.impl,regenerated.entry.impl,'Clone whole original implementation header/receiver mismatch');
  cloneSame({params:entry.params,ret:entry.ret},{params:regenerated.entry.params,ret:regenerated.entry.ret},'Clone checked shared receiver/ownership mismatch');
  const expected=option?optionCloneAlpha(regenerated.entry.body.body,entry.body.body,entry.params):cloneAlpha(regenerated.entry.body.body,{body:entry.body.body,params:entry.params});
  cloneSame(entry.body.body,expected,'Clone whole actual primitive/record computation mismatch');
  const expectedProof={...regenerated.entry.body.cloneSourceProof,computationSha256:metadataDigest(expected)};expectedProof.digest=proof.digest;expectedProof.digest=metadataDigest(expectedProof);
  cloneSame(entry.body.cloneSourceProof,expectedProof,'Clone checked Copy/no-Drop/layout/receiver/body proof mismatch');
  cloneSame({...entry.body,body:expected,cloneSourceProof:expectedProof},{...regenerated.entry.body,body:expected,cloneSourceProof:expectedProof},'Clone checked wrapper ownership/authority mismatch');
  if(option)cloneSame(entry,{...regenerated.entry,body:{...regenerated.entry.body,body:expected,cloneSourceProof:expectedProof}},'Option Clone complete checked declaration/header/flags mismatch');
  const flattened=target.declarations.get(names.get(entry.fullName));if(!flattened||flattened.generated!=='router-project-flattened'||flattened.impl?.method!=='clone'||flattened.impl.receiver!=='shared'||flattened.name!==flattened.fullName||flattened.modulePath.length)throw new Error('Clone flattened target missing/identity mismatch');
  if(option&&JSON.stringify(flattened.impl.cloneSourceProof)!==JSON.stringify(serializedOriginalProof))throw new Error('Option Clone exact flattened original proof mismatch');
  cloneSame(flattened.impl.cloneSourceProof,proof,'Clone flattened source proof mismatch');
  cloneSame(flattened.impl,flattenedCloneNode(entry.impl,names),'Clone flattened whole implementation header mismatch');
  cloneSame({params:flattened.params,ret:flattened.ret},flattenedCloneNode({params:entry.params,ret:entry.ret},names),'Clone flattened shared signature mismatch');
  cloneSame(flattened.body,flattenedCloneNode(entry.body,names),'Clone flattened whole body mismatch');cloneSame(flattened.span,entry.span,'Clone flattened span mismatch');
  if(option)cloneSame(flattened,{...flattenedCloneNode(entry,names),name:names.get(entry.fullName),fullName:names.get(entry.fullName),modulePath:[],generated:'router-project-flattened'},'Option Clone complete flattened declaration/header/flags mismatch');
  const targetData=target.declarations.get(names.get(nominal));if(!targetData||targetData.generated!=='router-project-flattened')throw new Error('Clone flattened nominal layout missing');cloneSame(targetData,{...flattenedCloneNode(data,names),name:names.get(nominal),fullName:names.get(nominal),modulePath:[],generated:'router-project-flattened'},'Clone flattened whole nominal layout mismatch');
  used.add(entry);return {...item,sourceSha256,itemSha256,qualifiedName:entry.fullName,targetName:flattened.fullName,checkedSignatureSha256:digest(JSON.stringify({params:entry.params,ret:entry.ret})),checkedBodySha256:digest(JSON.stringify(entry.body)),targetBodySha256:digest(JSON.stringify(flattened.body)),semanticAuthority:false,runtimeParity:false};
}

function originalUnitDefaultReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest}) {
  const proof=typeof dependencies==='function'?dependencies():dependencies;
  if(!Array.isArray(meta.sources)||!meta.sources.length)throw new Error('Unit Default review requires complete original source modules');
  const paths=[...new Set(meta.sources.map(item=>{relativeName(item.source);return item.source;}))],sources=new Map(paths.map(name=>[name,readSource(name)]));
  for(const item of meta.sources)if(typeof sources.get(item.source)!=='string'||digest(sources.get(item.source))!==item.sha256)throw new Error('Unit Default original source module hash mismatch');
  const graph=resolveModuleGraph({entry:row.entry,paths,readSource:name=>sources.get(name),compilationProfile:meta.compilationProfile});
  cloneSame(graph.modules.map(module=>({source:module.file,sha256:digest(module.source),module:module.path})),meta.sources,'Unit Default complete original source module layout mismatch');
  const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(proof)]),derive=createDeriveFootprintContext({modules:graph.modules,dependencies:proof,externalModules,compilationProfile:graph.compilationProfile}),defaultContext=createDefaultSourceContext(derive);
  return {graph,derive,defaultContext,state:defaultSourceContextFacts(defaultContext),sources,genericReviewInputs:{
    deriveDependencies:proof,
    // The review caller supplies the producer's actual manifest explicitly.
    // A null producer input stays null even when dependency Cargo bytes exist.
    cargoManifest:cargoManifest??null,
    expectedCargoEdition:meta.originalCargoEditionInput??null,
    jsonMacroDependencies:jsonMacroDependencies??null,
    expectedJsonContext:meta.jsonMacroContext??null,
  }};
}
function originalUnitDefaultChecked(context,module,item,surface,offset) {
  const binding=originalEnumBinding(context),scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module)),kernel=module.source.slice(item.start,item.end),parser=new HostRustParser(tokenizeRust(kernel)),snapshot=originalHostParserIdentitySnapshot();
  const configured=configureParserSourceScope(parser,scope,binding.scopes,module.path);parser.aliases=configured.aliases;parser.modulePath=module.path;
  configureToolAttributes(parser,context.enumToolContext,module,item,kernel);const certificate=deriveFootprintAt(context.derive,module,item);if(certificate)configureDeriveLayout(parser,certificate,kernel,item.start);
  const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  guard();const items=[];parser.items({main:null},items,module.path,()=>parser.cursor.atEnd());guard();
  if(items.length!==1||items[0].k!=='data'||!parser.cursor.atEnd())throw new Error('Unit Default original enum parser mismatch');
  const data=cloneRelocate(items[0],offset+item.start);
  linkProjectDeclaration(parser,items[0],data,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:offset,path:module.path,scope:{bindingEvidence:scope,compilationProfile:context.graph.compilationProfile,configurationCondition:module.configurationCondition}});
  const relocate=node=>{if(Array.isArray(node))return node.map(relocate);if(!node||typeof node!=='object')return node;return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='defaultSourceProof'?value:key==='span'&&value?{start:value.start+offset,end:value.end+offset}:relocate(value)]));};
  assertOriginalDefaultGeneratedMethod(surface,context.defaultContext);
  const checked=roundTripProgram(new HostChecker('Rust',[]).program({language:'Rust',items:cloneTree(module.path,[data,relocate(surface)]),main:null}));
  assertOriginalDefaultGeneratedMethod(surface,context.defaultContext);
  return {data:checked.declarations.get([...module.path,item.name].join('.')),entry:checked.declarations.get([...module.path,surface.name].join('.'))};
}
function reviewUnitDefaultMethod(meta,item,{checked,target,entries,names,used,context}) {
  if(item.term!=='generated-method'||item.origin!=='derive-invocation'||item.originalDeclarationTerm!=='enum'||item.generator!=='core::default::Default'||item.receiver!==null||item.semanticBodyChecked!==true||item.runtimeParity===true||item.semanticAuthority===true||typeof item.name!=='string'||Object.hasOwn(item,'cloneSourceProof'))throw new Error('Invalid unit Default classification');
  relativeName(item.source);const proof=item.defaultSourceProof,span=item.span,source=context.sources.get(item.source);
  if(typeof source!=='string'||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new Error('Invalid unit Default original declaration boundary');
  const sourceSha256=digest(source),itemSha256=digest(source.slice(span.start,span.end));
  if(proof?.schema!=='original-generated-unit-default-ir-v1'||proof.source!==item.source||proof.sourceSha256!==sourceSha256||proof.itemSha256!==itemSha256)throw new Error('Unit Default original declaration hash mismatch');
  same(proof.span,span,'Unit Default original span mismatch');
  const candidates=entries.filter(entry=>entry.impl?.defaultSourceProof?.source===item.source&&isDeepStrictEqual(entry.impl.defaultSourceProof.span,span));if(candidates.length!==1||used.has(candidates[0]))throw new Error('Unit Default metadata is not one-to-one');
  const entry=candidates[0],module=context.graph.modules.find(module=>module.file===item.source&&isDeepStrictEqual(module.path,entry.modulePath));if(!module)throw new Error('Unit Default original module mismatch');
  const original=originalSourceModuleItems(module).find(original=>original.term==='enum'&&original.start===span.start&&original.end===span.end);if(!original)throw new Error('Unit Default original classification mismatch');
  context.defaultContext??=createDefaultSourceContext(context.derive);
  const surface=originalDefaultGeneratedMethod(context.defaultContext,module,original,HostRustParser),expectedProof=JSON.parse(JSON.stringify(surface.impl.defaultSourceProof)),nominal=[...module.path,original.name].join('.');
  cloneSame(proof,expectedProof,'Unit Default complete original source/compiler/variant proof mismatch');cloneSame(entry.impl.defaultSourceProof,proof,'Unit Default checked proof mismatch');
  if(item.name!==nominal+'.default'||entry.name!==surface.name||entry.fullName!==[...module.path,surface.name].join('.')||entry.generated!=='router-source-generated-default-method'||entry.params.length||entry.async||entry.constant||entry.constFunction||entry.impl.method!=='default'||entry.impl.receiver!==null||Object.hasOwn(entry.impl,'cloneSourceProof'))throw new Error('Unit Default original zero-argument signature mismatch');
  same(entry.ret,{kind:'data',name:nominal,rustSourceType:true},'Unit Default owned return mismatch');
  const shift=entry.span?.start-span.start;if(!Number.isSafeInteger(shift)||shift<0||entry.span.end-span.end!==shift)throw new Error('Unit Default original relocation mismatch');
  if(meta.checkedMethods.some(row=>row.source===item.source&&isDeepStrictEqual(row.span,span))||meta.executable.some(row=>row.source===item.source&&isDeepStrictEqual(row.span,span)))throw new Error('Unit Default overlaps original fn/method counts');
  const regenerated=originalUnitDefaultChecked(context,module,original,surface,shift),data=checked.declarations.get(nominal);
  cloneSame(data,regenerated.data,'Unit Default whole checked original enum layout mismatch');cloneSame(entry,regenerated.entry,'Unit Default whole checked constructor/signature/body mismatch');
  const flattened=target.declarations.get(names.get(entry.fullName)),targetData=target.declarations.get(names.get(nominal));
  cloneSame(flattened,{...flattenedCloneNode(entry,names),name:names.get(entry.fullName),fullName:names.get(entry.fullName),modulePath:[],generated:'router-project-flattened'},'Unit Default whole flattened constructor/signature/body mismatch');
  cloneSame(targetData,{...flattenedCloneNode(data,names),name:names.get(nominal),fullName:names.get(nominal),modulePath:[],generated:'router-project-flattened'},'Unit Default whole flattened enum layout mismatch');
  used.add(entry);return {...item,sourceSha256,itemSha256,qualifiedName:entry.fullName,targetName:flattened.fullName,checkedSignatureSha256:digest(JSON.stringify({params:entry.params,ret:entry.ret})),checkedBodySha256:digest(JSON.stringify(entry.body)),targetBodySha256:digest(JSON.stringify(flattened.body)),semanticAuthority:false,runtimeParity:false};
}

// Named container Default is independently rebuilt from the actual caller-bound
// compiler output. Public schema names select a review route, never authority.
function originalContainerDefaultChecked(context,module,item,surface,offset) {
  const binding=originalEnumBinding(context),scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module)),kernel=module.source.slice(item.start,item.end),parser=new HostRustParser(tokenizeRust(kernel)),snapshot=originalHostParserIdentitySnapshot();
  const configured=configureParserSourceScope(parser,scope,binding.scopes,module.path);parser.aliases=configured.aliases;parser.modulePath=module.path;
  configureToolAttributes(parser,context.enumToolContext,module,item,kernel);const certificate=deriveFootprintAt(context.derive,module,item);if(certificate)configureDeriveLayout(parser,certificate,kernel,item.start);
  const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  guard();const items=[];parser.items({main:null},items,module.path,()=>parser.cursor.atEnd());guard();
  if(items.length!==1||items[0].k!=='data'||!parser.cursor.atEnd())throw new Error('Container Default original struct parser mismatch');
  const data=cloneRelocate(items[0],offset+item.start);
  linkProjectDeclaration(parser,items[0],data,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:offset,path:module.path,scope:{bindingEvidence:scope,compilationProfile:context.graph.compilationProfile,configurationCondition:module.configurationCondition}});
  // Source-first generic issuance must retain the producer's first owner and
  // span even when several original records instantiate the same type.
  context.containerNominals??=originalEnumNominals(context,module,{start:-1,end:-1},null,offset,binding);
  context.containerInitialGenerics??=reviewInitialSourceGenericLayouts({graph:context.graph,binding,toolContext:context.enumToolContext,deriveContext:context.derive,...context.genericReviewInputs});
  // Retain the nominal/Copy reconstruction above; only canonical generic
  // layouts are independently rebuilt in their true initial issuance order.
  const sourceLayouts=new Map(context.containerNominals.filter(declaration=>declaration.term!=='generated-type').map(declaration=>[declaration.name,declaration]));
  for(const declaration of context.containerInitialGenerics.declarations)sourceLayouts.set(declaration.name,declaration);
  const support=reviewSourceAdmittedHostLayouts([...context.containerNominals,...context.containerInitialGenerics.declarations,...context.containerInitialGenerics.shadowDeclarations]);
  for(const declaration of support)if(!sourceLayouts.has(declaration.name))sourceLayouts.set(declaration.name,declaration);
  const needed=new Set();
  function requireLayout(name){
    if(needed.has(name))return;if(context.containerInitialGenerics.collisions.some(row=>row.name===name))throw new Error('Container Default original canonical generic name collides with a source declaration: '+name);const declaration=sourceLayouts.get(name);if(!declaration)throw new Error('Container Default original dependent layout missing from initial source issuance; method-first generic layouts require original method replay: '+name);needed.add(name);
    function types(node){if(Array.isArray(node)){for(const child of node)types(child);return;}if(!node||typeof node!=='object')return;if(node.kind==='named'&&Array.isArray(node.path))requireLayout(node.path.filter((part,index)=>index!==0||part!=='crate').join('.'));for(const [key,value]of Object.entries(node))if(!['deriveNamespaceProof','toolAttributeProof','copyCertificate'].includes(key))types(value);}
    types(declaration.surface);
  }
  requireLayout([...module.path,item.name].join('.'));
  const tree=[],modules=new Map([['',tree]]);
  function add(path,item){let items=tree;for(let index=0;index<path.length;index++){const key=JSON.stringify(path.slice(0,index+1));let nested=modules.get(key);if(!nested){nested=[];items.push({k:'module',name:path[index],items:nested});modules.set(key,nested);}items=nested;}items.push(item);}
  for(const name of needed){const declaration=sourceLayouts.get(name);add(declaration.path,declaration.name===[...module.path,item.name].join('.')?data:declaration.surface);}
  const relocate=node=>{if(Array.isArray(node))return node.map(relocate);if(!node||typeof node!=='object')return node;return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='defaultSourceProof'?value:key==='span'&&value?{start:value.start+offset,end:value.end+offset}:relocate(value)]));};
  assertOriginalDefaultGeneratedMethod(surface,context.defaultContext);
  add(module.path,relocate(surface));
  const checked=roundTripProgram(new HostChecker('Rust',[]).program({language:'Rust',items:tree,main:null}));
  assertOriginalDefaultGeneratedMethod(surface,context.defaultContext);
  return {data:checked.declarations.get([...module.path,item.name].join('.')),entry:checked.declarations.get([...module.path,surface.name].join('.')),dependencies:[...needed].filter(name=>name!==[...module.path,item.name].join('.')).map(name=>checked.declarations.get(name))};
}
function flattenedDefaultNode(node,names) {
  if(Array.isArray(node))return node.map(value=>flattenedDefaultNode(value,names));if(!node||typeof node!=='object')return node;
  if(Object.hasOwn(node,'defaultSourceProof'))return {...flattenedCloneNode({...node,defaultSourceProof:null},names),defaultSourceProof:node.defaultSourceProof};
  const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,flattenedDefaultNode(value,names)]));
  if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);
  if(node.kind==='named'&&Array.isArray(node.path)){const owner=node.path.filter((part,index)=>index!==0||part!=='crate').join('.');if(names.has(owner))result.path=['crate',names.get(owner)];}
  if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;
  if(node.k==='ctor')result.data=names.get(node.data)??node.data;
  return result;
}
function reviewContainerDefaultMethod(meta,item,{checked,target,entries,names,used,context}) {
  if(item.term!=='generated-method'||item.origin!=='derive-invocation'||item.originalDeclarationTerm!=='struct'||item.generator!=='core::default::Default'||item.receiver!==null||item.semanticBodyChecked!==true||item.runtimeParity===true||item.semanticAuthority===true||typeof item.name!=='string'||Object.hasOwn(item,'cloneSourceProof'))throw new Error('Invalid container Default classification');
  relativeName(item.source);const proof=item.defaultSourceProof,span=item.span,source=context.sources.get(item.source);
  if(typeof source!=='string'||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new Error('Invalid container Default original declaration boundary');
  const sourceSha256=digest(source),itemSha256=digest(source.slice(span.start,span.end));
  if(!['original-generated-container-default-ir-v1','original-generated-dependent-default-ir-v1'].includes(proof?.schema)||proof.source!==item.source||proof.sourceSha256!==sourceSha256||proof.itemSha256!==itemSha256)throw new Error('Container Default original declaration hash mismatch');
  same(proof.span,span,'Container Default original span mismatch');
  const candidates=entries.filter(entry=>entry.impl?.defaultSourceProof?.source===item.source&&isDeepStrictEqual(entry.impl.defaultSourceProof.span,span));if(candidates.length!==1||used.has(candidates[0]))throw new Error('Container Default metadata is not one-to-one');
  const entry=candidates[0],module=context.graph.modules.find(module=>module.file===item.source&&isDeepStrictEqual(module.path,entry.modulePath));if(!module)throw new Error('Container Default original module mismatch');
  const original=originalSourceModuleItems(module).find(original=>original.term==='struct'&&original.start===span.start&&original.end===span.end);if(!original)throw new Error('Container Default original classification mismatch');
  const surface=originalDefaultGeneratedMethod(context.defaultContext,module,original,HostRustParser),expectedProof=JSON.parse(JSON.stringify(surface.impl.defaultSourceProof)),nominal=[...module.path,original.name].join('.');
  if(proof.schema==='original-generated-dependent-default-ir-v1'){const dependencies=originalDefaultGeneratedDependencyEvidence(surface,context.defaultContext);if(dependencies.schema!=='original-generated-default-dependency-backing-v1'||!dependencies.dependencies.length)throw new Error('Dependent Default has no genuine original generated child');}
  const proofJson=JSON.stringify(expectedProof);if(JSON.stringify(proof)!==proofJson||JSON.stringify(entry.impl.defaultSourceProof)!==proofJson)throw new Error('Container Default exact persisted source/compiler proof mismatch');
  cloneSame(proof,expectedProof,'Container Default complete original source/compiler/type/helper/body proof mismatch');cloneSame(entry.impl.defaultSourceProof,proof,'Container Default checked proof mismatch');
  if(item.name!==nominal+'.default'||entry.name!==surface.name||entry.fullName!==[...module.path,surface.name].join('.')||entry.generated!=='router-source-generated-default-method'||entry.params.length||entry.async||entry.constant||entry.constFunction||entry.impl.method!=='default'||entry.impl.receiver!==null||Object.hasOwn(entry.impl,'cloneSourceProof'))throw new Error('Container Default original zero-argument signature mismatch');
  same(entry.ret,{kind:'data',name:nominal,rustSourceType:true},'Container Default owned return mismatch');
  const shift=entry.span?.start-span.start;if(!Number.isSafeInteger(shift)||shift!==module.offset||entry.span.end-span.end!==shift)throw new Error('Container Default original relocation mismatch');
  if(meta.checkedMethods.some(row=>row.source===item.source&&isDeepStrictEqual(row.span,span))||meta.executable.some(row=>row.source===item.source&&isDeepStrictEqual(row.span,span)))throw new Error('Container Default overlaps original fn/method counts');
  const regenerated=originalContainerDefaultChecked(context,module,original,surface,shift),data=checked.declarations.get(nominal);
  cloneSame(data,regenerated.data,'Container Default whole checked original layout mismatch');cloneSame(entry,regenerated.entry,'Container Default whole checked constructor/signature/body mismatch');
  for(const generic of regenerated.dependencies){const actual=checked.declarations.get(generic.fullName);cloneSame(actual,generic,'Container Default whole checked generic layout mismatch');cloneSame(target.declarations.get(names.get(generic.fullName)),{...flattenedDefaultNode(generic,names),name:names.get(generic.fullName),fullName:names.get(generic.fullName),modulePath:[],generated:'router-project-flattened'},'Container Default whole flattened generic layout mismatch');}
  const flattened=target.declarations.get(names.get(entry.fullName)),targetData=target.declarations.get(names.get(nominal));
  if(JSON.stringify(flattened?.impl?.defaultSourceProof)!==proofJson)throw new Error('Container Default exact flattened source/compiler proof mismatch');
  cloneSame(flattened,{...flattenedDefaultNode(entry,names),name:names.get(entry.fullName),fullName:names.get(entry.fullName),modulePath:[],generated:'router-project-flattened'},'Container Default whole flattened constructor/signature/body mismatch');
  cloneSame(targetData,{...flattenedDefaultNode(data,names),name:names.get(nominal),fullName:names.get(nominal),modulePath:[],generated:'router-project-flattened'},'Container Default whole flattened nominal layout mismatch');
  used.add(entry);return {...item,sourceSha256,itemSha256,qualifiedName:entry.fullName,targetName:flattened.fullName,checkedSignatureSha256:digest(JSON.stringify({params:entry.params,ret:entry.ret})),checkedBodySha256:digest(JSON.stringify(entry.body)),targetBodySha256:digest(JSON.stringify(flattened.body)),semanticAuthority:false,runtimeParity:false};
}

// Exported callers must supply inert persisted JSON trees. Check descriptors
// before JSON.stringify or property reads, so metadata cannot execute hooks.
function assertGeneratedReviewData(value) {
  const seen=new Set();let nodes=0;
  function visit(node,depth){
    if(node===null)return;
    if(typeof node!=='object'){if(!['string','number','boolean','undefined'].includes(typeof node))throw new TypeError('Generated review requires inert JSON metadata');return;}
    if(utilTypes.isProxy(node)||depth>512||++nodes>2_000_000||seen.has(node))throw new TypeError('Generated review requires bounded non-proxy JSON metadata');
    const prototype=Object.getPrototypeOf(node);if(prototype!==Object.prototype&&prototype!==Array.prototype&&prototype!==null)throw new TypeError('Generated review requires plain JSON metadata');
    seen.add(node);for(const key of Reflect.ownKeys(node)){const descriptor=Object.getOwnPropertyDescriptor(node,key);if(typeof key!=='string'||!Object.hasOwn(descriptor,'value'))throw new TypeError('Generated review rejects metadata accessors');visit(descriptor.value,depth+1);}seen.delete(node);
  }
  visit(value,0);
}

// Integrity only. Serialized rows never recreate the compiler's private caller
// brands; source namespace, runtime and whole-trait authority remain false.
// Direct callers must supply the actual cargoManifest when the producer used
// one. The CLI supplies its verified original input; metadata is no substitute.
export function reviewGeneratedMethods(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest}={}) {
  assertGeneratedReviewData(meta);assertGeneratedReviewData(row);
  if(meta.runtimeParity===true||meta.semanticAuthority===true)throw new Error('Generated review cannot accept semantic or runtime authority');
  const rows=generatedArray(meta),count=Object.hasOwn(row,'checkedGeneratedMethods')?row.checkedGeneratedMethods:0;
  if(!Number.isSafeInteger(count)||count<0||count!==rows.length)throw new Error('Generated method count mismatch: '+row.entry);
  if(!rows.length&&!Object.hasOwn(meta,'checkedSemanticProgram')&&!Object.hasOwn(meta,'targetSemanticProgram'))return [];
  const checked=parseProgram(JSON.stringify(meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(meta.targetSemanticProgram));
  const entries=[...checked.declarations.values()].filter(entry=>entry.generated==='router-source-generated-default-method'||entry.impl?.defaultSourceProof?.schema==='original-generated-default-ir-v1'||entry.generated==='router-source-generated-clone-method'||entry.impl?.cloneSourceProof?.schema==='original-generated-clone-ir-v1');
  if(entries.length!==rows.length)throw new Error('Generated method semantic count mismatch: '+row.entry);
  const names=new Map([...checked.declarations.keys()].map(name=>[name,'rp_'+Buffer.from(name).toString('hex')]));
  const used=new Set(),identities=new Set(),result=[];let cloneContext=null,unitDefaultContext=null,containerDefaultContext=null;
  for(const item of rows){
    if(['original-generated-container-default-ir-v1','original-generated-dependent-default-ir-v1'].includes(item?.defaultSourceProof?.schema)){
      containerDefaultContext??=originalUnitDefaultReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest});
      const reviewed=reviewContainerDefaultMethod(meta,item,{checked,target,entries,names,used,context:containerDefaultContext});
      const identity=generatedIdentity(reviewed);if(identities.has(identity))throw new Error('Duplicate generated method identity');identities.add(identity);result.push(reviewed);continue;
    }
    if(item?.generator==='core::default::Default'&&item.originalDeclarationTerm==='enum'){
      unitDefaultContext??=originalUnitDefaultReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest});
      const reviewed=reviewUnitDefaultMethod(meta,item,{checked,target,entries,names,used,context:unitDefaultContext});
      const identity=generatedIdentity(reviewed);if(identities.has(identity))throw new Error('Duplicate generated method identity');identities.add(identity);result.push(reviewed);continue;
    }
    if(item?.generator==='core::clone::Clone'){
      cloneContext??=originalCloneReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies});
      const reviewed=reviewCloneMethod(meta,item,{checked,target,entries,names,used,context:cloneContext});
      const identity=generatedIdentity(reviewed);if(identities.has(identity))throw new Error('Duplicate generated method identity');identities.add(identity);result.push(reviewed);continue;
    }
    if(item?.term!=='generated-method'||item.origin!=='derive-invocation'||item.originalDeclarationTerm!=='struct'||item.generator!=='core::default::Default'||item.receiver!==null||item.semanticBodyChecked!==true||item.runtimeParity===true||item.semanticAuthority===true||typeof item.name!=='string')throw new Error('Invalid generated method classification');
    relativeName(item.source);const source=readSource(item.source),proof=item.defaultSourceProof,span=item.span;
    if(typeof source!=='string'||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new Error('Invalid generated original declaration boundary');
    const sourceSha256=digest(Buffer.from(source)),original=source.slice(span.start,span.end),itemSha256=digest(Buffer.from(original));
    if(proof?.schema!=='original-generated-default-ir-v1'||proof.source!==item.source||proof.sourceSha256!==sourceSha256||proof.itemSha256!==itemSha256)throw new Error('Generated original declaration hash mismatch');
    same(proof.span,span,'Generated original declaration span mismatch');
    if(proof.bodyMapped!==true||proof.checkedBody!==false||proof.wholeCompilerExecuted!==false||proof.wholeTraitTranslated!==false||proof.runtimeParity!==false||!sha256Pattern.test(proof.contextDigest))throw new Error('Invalid generated source authority flags');
    const parsed=sourceItems(original).filter(entry=>!entry.comment);
    if(parsed.length!==1||parsed[0].term!=='struct'||parsed[0].start!==0||parsed[0].end!==original.length)throw new Error('Generated source is not the exact original struct');
    const input=inspectDeriveInput(parsed[0],meta.compilationProfile);
    if(input.derives.filter(derive=>isDeepStrictEqual(derive.path,['Default'])).length!==1)throw new Error('Generated source lacks its exact Default invocation');
    const candidates=entries.filter(entry=>entry.impl?.defaultSourceProof?.source===item.source&&isDeepStrictEqual(entry.impl.defaultSourceProof.span,span));
    if(candidates.length!==1||used.has(candidates[0]))throw new Error('Generated method metadata is not one-to-one');
    const entry=candidates[0],nominal=[...entry.modulePath,parsed[0].name].join('.');used.add(entry);
    if(item.name!==nominal+'.default'||entry.impl?.method!=='default'||entry.impl.receiver!==null||entry.generated!=='router-source-generated-default-method'||entry.params.length||entry.async||entry.constant||entry.constFunction||entry.ret.kind!=='data'||entry.ret.name!==nominal)throw new Error('Generated checked signature mismatch');
    same(entry.impl.type.path,['crate',...entry.modulePath,parsed[0].name],'Generated nominal owner mismatch');
    const localName='ml_impl_'+Buffer.from(['crate',...entry.modulePath,parsed[0].name].join('.')).toString('hex')+'_'+Buffer.from('default').toString('hex');
    if(entry.name!==localName||entry.fullName!==[...entry.modulePath,localName].join('.'))throw new Error('Generated original symbol mismatch');
    same(entry.ret,{kind:'data',name:nominal,rustSourceType:true},'Generated checked return ownership mismatch');
    same(entry.impl.defaultSourceProof,proof,'Generated source/checked proof mismatch');
    if(!meta.sources.some(original=>original.source===item.source&&original.sha256===sourceSha256&&isDeepStrictEqual(original.module,entry.modulePath)))throw new Error('Generated source module mismatch');
    if(!Number.isSafeInteger(entry.span?.start)||!Number.isSafeInteger(entry.span?.end))throw new Error('Generated checked declaration boundary mismatch');
    const shift=entry.span.start-span.start;
    if(!Number.isSafeInteger(shift)||shift<0||entry.span.end-span.end!==shift)throw new Error('Generated relocated declaration span mismatch');
    if(meta.checkedMethods.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span))||meta.executable.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span)))throw new Error('Generated method overlaps original fn/method counts');
    const output=proveBuiltinScalarSourceOutput({dependencies:typeof dependencies==='function'?dependencies():dependencies,source,span,owner:'Default'}),plan=builtinScalarOriginalSourcePlan(output),branch=output.branches[0];
    if(proof.originalOutputDigest!==output.digest||proof.originalCompilerPlanDigest!==plan.digest||proof.selectedBranch!==branch.feature||output.branches.length!==1)throw new Error('Generated original compiler plan mismatch');
    same(proof.hygiene,branch.body.slots.fields.map(field=>field.expr.slots.expr.slots.path.segments[0]),'Generated standard hygiene mismatch');
    if(!Array.isArray(proof.fields)||proof.fields.length!==output.input.fields.length)throw new Error('Generated primitive source field count mismatch');
    proof.fields.forEach((field,index)=>{
      const originalField=output.input.fields[index];if(field.field!==originalField.name||field.type!==originalField.type)throw new Error('Generated primitive source field mismatch');
      const selection=pinnedDefaultBody(field.type),body=originalPrimitiveBody(selection),syntax=parsedPinnedBodyEvidence(body);
      same(field.selection,selection,'Generated standard primitive selection mismatch');same(field.originalBody,body,'Generated primitive original body mismatch');
      if(field.syntaxSha256!==syntax.syntaxSha256)throw new Error('Generated primitive syntax hash mismatch');
    });
    checkDefaultBody(entry,checked.declarations.get(nominal),proof.fields);
    const flattened=target.declarations.get(names.get(entry.fullName));
    if(!flattened||flattened.generated!=='router-project-flattened'||flattened.impl?.method!=='default'||flattened.impl.receiver!==null)throw new Error('Generated flattened target missing');
    if(flattened.name!==flattened.fullName||flattened.modulePath.length)throw new Error('Generated flattened symbol mismatch');
    same(flattened.impl.defaultSourceProof,proof,'Generated flattened proof mismatch');
    same({params:flattened.params,ret:flattened.ret},flattenedNode({params:entry.params,ret:entry.ret},names),'Generated flattened signature mismatch');
    same(flattened.body,flattenedNode(entry.body,names),'Generated flattened body mismatch');
    same(flattened.span,entry.span,'Generated flattened span mismatch');
    const reviewed={...item,sourceSha256,itemSha256,qualifiedName:entry.fullName,targetName:flattened.fullName,checkedSignatureSha256:digest(JSON.stringify({params:entry.params,ret:entry.ret})),checkedBodySha256:digest(JSON.stringify(entry.body)),targetBodySha256:digest(JSON.stringify(flattened.body)),semanticAuthority:false,runtimeParity:false};
    const identity=generatedIdentity(reviewed);if(identities.has(identity))throw new Error('Duplicate generated method identity');identities.add(identity);result.push(reviewed);
  }
  return result;
}
export function compareGeneratedMethods(before,after) {
  const old=new Map(before.map(item=>[generatedIdentity(item),item])),current=new Map(after.map(item=>[generatedIdentity(item),item]));
  return {newlyCheckedGeneratedMethods:after.filter(item=>!old.has(generatedIdentity(item))),lostCheckedGeneratedMethods:before.filter(item=>!current.has(generatedIdentity(item))),changedGeneratedMethodBodies:after.filter(item=>{const prior=old.get(generatedIdentity(item));return prior&&(prior.checkedBodySha256!==item.checkedBodySha256||prior.checkedSignatureSha256!==item.checkedSignatureSha256);}).map(item=>({identity:generatedIdentity(item),previous:old.get(generatedIdentity(item)),current:item}))};
}

export function reviewTranslationDraft({root=process.cwd(),baselineSha=null,inventoryPath='parity/rust-source-inventory.json',projectMetaStorageLimits}={}) {
  root=fs.realpathSync(root);
  if(baselineSha!==null&&!/^[a-f0-9]{40}$/u.test(baselineSha))throw new TypeError('Baseline must be an immutable full Git SHA');
  relativeName(inventoryPath);
  const profile=/^(profiles\/[A-Za-z0-9_-]+\/)?parity\/rust-source-inventory\.json$/u.exec(inventoryPath);
  if(!profile)throw new TypeError('Review requires a canonical or profile Rust inventory');
  const prefix=profile[1]??'',roots=outputRoots.map(name=>prefix+name),head=git(root,['rev-parse','HEAD']).toString().trim();
  const inputs=new Map(),baselineProjectInputs=new Map();let inputBytes=0;
  function read(name) {
    relativeName(name);let absolute=root;
    for(const part of name.split('/')){absolute=path.join(absolute,part);if(fs.lstatSync(absolute).isSymbolicLink())throw new TypeError('Review refuses linked inputs: '+name);}
    const before=fs.statSync(absolute);
    if(!before.isFile()||before.size>MAX_FILE_BYTES)throw new RangeError('Review input file budget or kind: '+name);
    const bytes=fs.readFileSync(absolute),after=fs.statSync(absolute);
    if(bytes.length!==before.size||before.dev!==after.dev||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw new Error('Input changed during review: '+name);
    const row={path:name,bytes:bytes.length,sha256:digest(bytes)},old=inputs.get(name);
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new Error('Input changed during review: '+name);
    if(!old){inputBytes+=bytes.length;if(inputs.size+baselineProjectInputs.size>=MAX_FILES||inputBytes>MAX_TOTAL_BYTES)throw new RangeError('Review complete-input budget');inputs.set(name,row);}
    return bytes;
  }
  const inventory=parse(read(inventoryPath));
  if(!Array.isArray(inventory.sources)||!Array.isArray(inventory.projects)||!inventory.totals||!inventory.implementationHashes)throw new TypeError('Incomplete translation inventory');
  const tracked=git(root,['ls-files','-z','--','*.rs']).toString().split('\0').filter(Boolean).sort();
  if(JSON.stringify(inventory.sources.map(row=>row.source).sort())!==JSON.stringify(tracked))throw new Error('Inventory must cover every tracked Rust source exactly once');
  const outputs=new Map();
  function output(name) {
    if(name!==inventoryPath&&!roots.some(directory=>name.startsWith(directory+'/')))throw new TypeError('Target is outside generated roots: '+name);
    read(name);outputs.set(name,inputs.get(name));
  }
  function walk(name) {
    const absolute=path.join(root,name);if(!fs.existsSync(absolute))return;
    if(fs.lstatSync(absolute).isSymbolicLink())throw new TypeError('Review refuses linked output directories: '+name);
    for(const entry of fs.readdirSync(absolute,{withFileTypes:true})){
      const child=name+'/'+entry.name;
      if(entry.isDirectory())walk(child);else output(child);
    }
  }
  roots.forEach(walk);output(inventoryPath);
  const compilerInputs=[];
  for(const [name,sha256] of Object.entries(inventory.implementationHashes)){
    if(digest(read(name))!==sha256)throw new Error('Stale compiler input: '+name);
    compilerInputs.push(inputs.get(name));
  }
  const oldInventory=baselineSha?parse(git(root,['show',baselineSha+':'+inventoryPath])):null;
  const projectComponents=new Set(),baselineComponents=new Set();
  function baselineProjectRead(name){
    relativeName(name);if(!baselineSha||!roots.some(directory=>name.startsWith(directory+'/')))throw new TypeError('Baseline project target is outside generated roots: '+name);
    const listing=git(root,['ls-tree','-l','-z',baselineSha,'--',name]).toString().split('\0').filter(Boolean);
    const match=listing.length===1?/^(100644|100755) blob ([a-f0-9]{40})\s+(\d+)\t(.+)$/u.exec(listing[0]):null;
    if(!match||match[4]!==name)throw new TypeError('Missing or linked baseline project input: '+name);
    const bytes=Number(match[3]);if(!Number.isSafeInteger(bytes)||bytes>MAX_FILE_BYTES)throw new RangeError('Baseline project file byte budget: '+name);
    const value=git(root,['show',baselineSha+':'+name]);if(value.length!==bytes)throw new Error('Baseline project input changed: '+name);
    const row={path:name,commit:baselineSha,bytes,sha256:digest(value)},old=baselineProjectInputs.get(name);
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new Error('Baseline project input changed: '+name);
    if(!old){inputBytes+=bytes;if(inputs.size+baselineProjectInputs.size>=MAX_FILES||inputBytes>MAX_TOTAL_BYTES)throw new RangeError('Review complete-input budget');baselineProjectInputs.set(name,row);}
    return value;
  }
  function storedProject(row,reader,seen){
    const raw=reader(row.targets.meta),loaded=loadProjectMetaStorage(raw,{metaPath:row.targets.meta,targets:row.targets,read:reader,storageLimits:projectMetaStorageLimits});
    for(const component of loaded.components)seen.add(component.path);
    return {raw,meta:loaded.meta};
  }
  const oldRows=new Map((oldInventory?.sources??[]).map(row=>[row.source,row]));
  if(oldInventory&&(oldInventory.sources.length!==tracked.length||JSON.stringify([...oldRows.keys()].sort())!==JSON.stringify(tracked)))throw new Error('Baseline must cover the same original Rust source set');
  const originals=[],gained=[],lost=[],totals=Object.fromEntries(Object.keys(inventory.totals).map(key=>[key,0]));
  const previousTotals=Object.fromEntries(Object.keys(totals).map(key=>[key,0]));
  const metaPaths=baselineSha?inventory.sources.map(row=>{
    const old=oldRows.get(row.source);
    if(old.sha256!==row.sha256||old.bytes!==row.bytes)throw new Error('Original Rust changed since baseline: '+row.source);
    return relativeName(old.targets.meta);
  }):[];
  // A single bounded Git batch avoids one process per Rust source. Its buffers
  // contain complete original metadata, including every carried item.
  const batch=metaPaths.length?git(root,['cat-file','--batch'],metaPaths.map(name=>baselineSha+':'+name+'\n').join('')):Buffer.alloc(0);
  let offset=0;
  function oldMeta() {
    const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString();
    const match=/^[a-f0-9]{40} blob (\d+)$/u.exec(header);
    if(end<offset||!match)throw new Error('Missing baseline metadata');
    const size=Number(match[1]);if(!Number.isSafeInteger(size)||size>MAX_FILE_BYTES||end+1+size>=batch.length||batch[end+1+size]!==10)throw new RangeError('Baseline metadata budget or frame');
    const value=parse(batch.subarray(end+1,end+1+size));offset=end+2+size;return value;
  }
  function checkMeta(meta,row,source) {
    if(meta.sourcePath!==row.source||meta.sourceBytes!==row.bytes||meta.sourceSha256!==row.sha256||!Array.isArray(meta.items))throw new Error('Metadata source mismatch: '+row.source);
    const counts=Object.fromEntries(statusNames.map(name=>[name,0])),seen=new Set();
    for(const item of meta.items){
      if(!statusNames.includes(item.status)||!Number.isSafeInteger(item.span?.start)||!Number.isSafeInteger(item.span?.end)||item.span.start<0||item.span.end<item.span.start||item.span.end>source.length)throw new Error('Invalid original item boundary: '+row.source);
      const original=source.slice(item.span.start,item.span.end);
      if(item.source!==original||digest(Buffer.from(original))!==item.sha256||seen.has(identity(item)))throw new Error('Original item integrity failure: '+row.source);
      seen.add(identity(item));counts[item.status]++;
    }
    for(const name of statusNames)if(counts[name]!==meta.counts?.[name]||counts[name]!==row[name])throw new Error('Metadata count mismatch: '+row.source);
    return meta;
  }
  for(const row of inventory.sources){
    const bytes=read(row.source);
    if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)throw new Error('Stale original Rust: '+row.source);
    originals.push(inputs.get(row.source));
    const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    for(const target of Object.values(row.targets))output(target);
    const current=checkMeta(parse(read(row.targets.meta)),row,source);
    totals.sources++;
    for(const key of Object.keys(totals).filter(key=>key!=='sources')){
      if(!Number.isSafeInteger(row[key])||row[key]<0||current.counts[key]!==row[key])throw new Error('Invalid source total '+key+': '+row.source);
      totals[key]+=row[key];
    }
    if(baselineSha){
      const previous=checkMeta(oldMeta(),oldRows.get(row.source),source),before=new Map(previous.items.map(item=>[identity(item),item])),after=new Map(current.items.map(item=>[identity(item),item]));
      previousTotals.sources++;
      for(const key of Object.keys(previousTotals).filter(key=>key!=='sources')){
        const value=oldRows.get(row.source)[key];
        if(!Number.isSafeInteger(value)||value<0||previous.counts[key]!==value)throw new Error('Invalid baseline source total '+key+': '+row.source);
        previousTotals[key]+=value;
      }
      for(const item of current.items)if(item.status==='executable'&&before.get(identity(item))?.status!=='executable')gained.push({...compactItem(row.source,item),previousStatus:before.get(identity(item))?.status??null});
      for(const item of previous.items)if(item.status==='executable'&&after.get(identity(item))?.status!=='executable')lost.push({...compactItem(row.source,item),currentStatus:after.get(identity(item))?.status??null});
    }
  }
  if(offset!==batch.length)throw new Error('Unconsumed baseline metadata');
  for(const [key,count] of Object.entries(totals))if(inventory.totals[key]!==count)throw new Error('Invalid complete inventory total: '+key);
  if(oldInventory)for(const [key,count] of Object.entries(previousTotals))if(oldInventory.totals[key]!==count)throw new Error('Invalid baseline inventory total: '+key);
  const cargo=[];
  for(const name of git(root,['ls-files','-z','--','Cargo.toml','Cargo.lock']).toString().split('\0').filter(Boolean)){
    const bytes=read(name);if(baselineSha&&digest(git(root,['show',baselineSha+':'+name]))!==digest(bytes))throw new Error('Original Cargo input changed since baseline: '+name);cargo.push(inputs.get(name));
  }
  let generatedDependencies;const dependencies=()=>generatedDependencies??=loadDeriveDependencyProof({manifest:read('Cargo.toml').toString('utf8'),lock:read('Cargo.lock').toString('utf8')});
  let generatedJsonDependencies;const jsonMacroDependencies=()=>generatedJsonDependencies??=loadJsonMacroSourceProof({manifest:read('Cargo.toml').toString('utf8'),lock:read('Cargo.lock').toString('utf8')});
  const projectIdentity=item=>JSON.stringify([item.source,item.name,item.term??null,item.span.start,item.span.end]);
  function projectMeta(meta,row,historical=null,bytes=null) {
    if(!Array.isArray(meta.sources)||!Array.isArray(meta.refused)||!Array.isArray(meta.unloweredItems)||!Array.isArray(meta.checkedMethods)||!Array.isArray(meta.executable)||!Array.isArray(meta.moduleDiagnostics))throw new Error('Incomplete project metadata: '+row.entry);
    if(meta.sources.length!==row.sources||meta.refused.length!==row.refused||meta.unloweredItems.length!==row.unloweredItems||meta.checkedMethods.length!==row.checkedMethods||meta.moduleDiagnostics.length!==row.moduleDiagnostics||meta.executable.filter(item=>item.term==='fn').length!==row.executableFunctions||meta.executable.filter(item=>item.term==='const').length!==row.executableConstants)throw new Error('Project count mismatch: '+row.entry);
    for(const source of meta.sources)if(inputs.get(source.source)?.sha256!==source.sha256)throw new Error('Project source mismatch: '+row.entry);
    for(const item of [...meta.executable,...meta.checkedMethods]){
      if(!tracked.includes(item.source)||!Number.isSafeInteger(item.span?.start)||!Number.isSafeInteger(item.span?.end)||item.span.start<0||item.span.end<item.span.start||item.span.end>new TextDecoder('utf-8',{fatal:true}).decode(read(item.source)).length)throw new Error('Invalid project original item: '+row.entry);
    }
    return {...meta,reviewedGeneratedMethods:historical?historical.reviewProject(bytes,row):reviewGeneratedMethods(meta,row,{readSource:name=>new TextDecoder('utf-8',{fatal:true}).decode(read(name)),dependencies,jsonMacroDependencies,cargoManifest:cargo.some(input=>input.path==='Cargo.toml')?read('Cargo.toml').toString('utf8'):null})};
  }
  const historical=baselineSha?createHistoricalTranslationReview({root,baselineSha,inventoryPath,readSource:read}):null;
  let historicalBaselineReview=null,projects;
  try { projects=inventory.projects.map(row=>{
    for(const target of Object.values(row.targets))output(target);
    const current=storedProject(row,read,projectComponents),meta=projectMeta(current.meta,row);
    let comparison=null;
    if(oldInventory){
      const previousRow=oldInventory.projects.find(previous=>previous.entry===row.entry);
      if(!previousRow)throw new Error('Baseline project missing: '+row.entry);
      const previousStored=storedProject(previousRow,baselineProjectRead,baselineComponents);
      const previous=projectMeta(previousStored.meta,previousRow,historical,previousStored.raw);
      const differences=(before,after)=>{const known=new Set(before.map(projectIdentity));return after.filter(item=>!known.has(projectIdentity(item)));};
      comparison={previousCounts:previousRow,countChanges:Object.fromEntries(['sources','executableFunctions','executableConstants','checkedMethods','checkedGeneratedMethods','refused','unloweredItems','moduleDiagnostics'].map(key=>[key,(row[key]??0)-(previousRow[key]??0)])),newlyExecutableItems:differences(previous.executable,meta.executable),lostExecutableItems:differences(meta.executable,previous.executable),newlyCheckedMethods:differences(previous.checkedMethods,meta.checkedMethods),lostCheckedMethods:differences(meta.checkedMethods,previous.checkedMethods),...compareGeneratedMethods(previous.reviewedGeneratedMethods,meta.reviewedGeneratedMethods)};
    }
    return {...row,checkedGeneratedMethods:meta.reviewedGeneratedMethods.length,executableItems:meta.executable,checkedMethodItems:meta.checkedMethods,checkedGeneratedMethodItems:meta.reviewedGeneratedMethods,refusalCategories:categoryCounts(meta.refused),unloweredCategories:categoryCounts(meta.unloweredItems),moduleDiagnosticItems:meta.moduleDiagnostics,comparison};
  });historicalBaselineReview=historical?.provenance()??null;
  } finally {historical?.close();}
  for(const name of outputs.keys())if(name.includes('.meta.json.parts/')&&!projectComponents.has(name))throw new Error('Unexpected project metadata component: '+name);
  if(baselineSha){
    const entries=git(root,['ls-tree','-r','-z',baselineSha,'--',...roots]).toString().split('\0').filter(Boolean);
    for(const entry of entries){const name=entry.slice(entry.indexOf('\t')+1);if(name.includes('.meta.json.parts/')&&!baselineComponents.has(name))throw new Error('Unexpected baseline project metadata component: '+name);}
  }
  for(const name of [...inputs.keys()])read(name);
  if(git(root,['rev-parse','HEAD']).toString().trim()!==head)throw new Error('Commit changed during review');
  return {schema:'original-corpus-draft-review-v1',headSha:head,baselineSha,inventoryPath,historicalBaselineReview,originalRustInputs:originals,originalCargoInputs:cargo,originalInputsUnchangedFromBaseline:baselineSha?true:null,compilerInputs,outputs:[...outputs.values()].sort((a,b)=>a.path.localeCompare(b.path)),totals,functionCoverage:inventory.functionCoverage,projects,comparison:oldInventory?{previousTotals:oldInventory.totals,totalChanges:Object.fromEntries(Object.entries(totals).map(([key,count])=>[key,count-oldInventory.totals[key]])),newlyExecutableItems:gained,lostExecutableItems:lost}:null,reviewInputs:[...inputs.values()].sort((a,b)=>a.path.localeCompare(b.path)),...(baselineProjectInputs.size?{baselineProjectInputs:[...baselineProjectInputs.values()].sort((a,b)=>a.path.localeCompare(b.path))}:{}),semanticAuthority:false,runtimeParity:false,fullGatePass:false,rustExecuted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const options={},args=process.argv.slice(2);let output;
    for(let i=0;i<args.length;i++){
      if(!['--root','--baseline','--inventory','--output'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Usage: node scripts/review-translation-draft.mjs [--root ROOT] [--baseline FULL_SHA] [--inventory PATH] --output NEW_JSON');
      const flag=args[i],value=args[++i];
      if(flag==='--output')output=value;else options[{'--root':'root','--baseline':'baselineSha','--inventory':'inventoryPath'}[flag]]=value;
    }
    if(!output)throw new Error('A new --output report path is required');
    const report=reviewTranslationDraft(options);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({output,headSha:report.headSha,sources:report.totals.sources,outputFiles:report.outputs.length,totals:report.totals,newlyExecutableItems:report.comparison?.newlyExecutableItems.length??null,lostExecutableItems:report.comparison?.lostExecutableItems.length??null,runtimeParity:false,fullGatePass:false}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
