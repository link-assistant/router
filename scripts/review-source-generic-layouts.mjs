// Independent review of initial-phase generic issuance. No project production,
// semantic-success filtering, method replay or source-span repair occurs here.
import {isDeepStrictEqual} from 'node:util';
import {HostRustParser,originalHostParserIdentitySnapshot,hostData} from '../tools/translation/extensions/host-contracts.mjs';
import {tokenizeRust} from '../tools/translation/extensions/lexical.mjs';
import {TokenCursor} from '../tools/translation/vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from '../tools/translation/extensions/text.mjs';
import {TranslationError} from '../tools/translation/vendor/meta-language/translation/diagnostics.js';
import {assertOriginalParserIdentity} from '../tools/translation/original-parser-identity.mjs';
import {configureParserSourceScope} from '../tools/translation/source-scopes.mjs';
import {admittedHostData} from '../tools/translation/extensions/source-namespaces.mjs';
import {configureToolAttributes} from '../tools/translation/tool-attribute-layout.mjs';
import {deriveFootprintAt} from '../tools/translation/derive-footprints.mjs';
import {configureDeriveLayout} from '../tools/translation/derive-layout.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser} from '../tools/translation/matches-macro-context.mjs';
import {createJsonMacroContext,configureJsonMacroParser} from '../tools/translation/json-macro-context.mjs';
import {captureOriginalCargoEdition,originalCargoEditionEvidence} from '../tools/translation/cargo-edition-context.mjs';
import {moduleScopeKey} from '../tools/translation/source-module-views.mjs';
import {linkProjectDeclaration} from '../tools/translation/extensions/source-links.mjs';

// Match source relocation, including immutable source proof coordinates. The
// result is still independently parsed source, never a persisted checked item.
const sourceEvidence=new Set(['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceDisplayScope','sourceBoolFromScope','defaultSourceProof','sourceConversionProof','sourceSharedPatternProof','sourcePatternProjectionProof','sourceSharedStringViewProof','cloneSourceProof']);
function relocate(node,offset){
  if(Array.isArray(node))return node.map(value=>relocate(value,offset));
  if(!node||typeof node!=='object')return node;
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,sourceEvidence.has(key)?value:['span','subjectSyntaxSpan','patternSpan'].includes(key)&&value?{start:value.start+offset,end:value.end+offset}:relocate(value,offset)]));
}
export function reviewInitialSourceGenericLayouts({graph,binding,toolContext,deriveContext,deriveDependencies,jsonMacroDependencies=null,cargoManifest=null,expectedCargoEdition=null,expectedJsonContext=null}){
  const cargoEditionContext=cargoManifest===null?null:captureOriginalCargoEdition(cargoManifest);
  if(!isDeepStrictEqual(originalCargoEditionEvidence(cargoEditionContext),expectedCargoEdition))throw new Error('Review initial generic issuance original Cargo edition mismatch');
  const matches=createMatchesMacroContext({modules:graph.modules,compilationProfile:graph.compilationProfile,deriveDependencies,cargoEditionContext});
  const jsonDependencies=typeof jsonMacroDependencies==='function'?jsonMacroDependencies():jsonMacroDependencies;
  let json=null;
  // Match the producer's bounded optional-profile refusal, without supplying
  // invented JSON dependencies when the caller did not authenticate them.
  if(jsonDependencies)try{json=createJsonMacroContext({modules:graph.modules,dependencies:jsonDependencies,compilationProfile:graph.compilationProfile});}catch(error){if(!(error instanceof TypeError))throw error;}
  // This public certificate is persisted as JSON: prototype distinctions in
  // source-owned null-prototype configuration records are not JSON fields.
  // Compare the complete serialized protocol, including every field/order.
  if(JSON.stringify(json)!==JSON.stringify(expectedJsonContext))throw new Error('Review initial generic issuance original JSON macro context mismatch');
  const declarations=[],parses=[],collisions=[],shadowDeclarations=[],roots=new Map(),snapshot=originalHostParserIdentitySnapshot();
  const shadowed=graph.modules.flatMap(entry=>[...entry.path.filter(name=>['std','tokio','serde_json'].includes(name)),...entry.items.filter(item=>item.term==='mod'&&['std','tokio','serde_json'].includes(item.name)).map(item=>item.name)]);
  const scopes=new Map(binding.scopes.map(scope=>[moduleScopeKey(scope),scope]));
  for(const module of graph.modules){
    if(module.configurationCondition==='unknown')continue;
    const scope=scopes.get(moduleScopeKey(module));
    const aliases=configureParserSourceScope(new HostRustParser([]),scope,binding.scopes,module.path).aliases;
    for(const item of module.items.filter(item=>['fn','const','enum','struct'].includes(item.term)&&item.name!=='main')){
      const kernel=module.source.slice(item.start,item.end);let parser;
      const origin={file:module.file,path:[...module.path]},firstOwner={...origin,term:item.term,name:item.name,span:{start:item.start,end:item.end}};
      const guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
      try{
        parser=new HostRustParser(tokenizeRust(kernel));
        parser.shadowedEffectRoots=new Set(shadowed);
        configureParserSourceScope(parser,scope,binding.scopes,module.path);
        if(json)configureJsonMacroParser(parser,json,{file:module.file,modulePath:module.path,offset:item.start});
        configureToolAttributes(parser,toolContext,module,item,kernel);
        parser.aliases=aliases;parser.modulePath=module.path;
        configureMatchesMacroParser(parser,matches,{file:module.file,modulePath:module.path,offset:item.start});
        const certificate=['struct','enum'].includes(item.term)?deriveFootprintAt(deriveContext,module,item):null;
        if(certificate)configureDeriveLayout(parser,certificate,kernel,item.start);
        guard();let surface;
        if(['struct','enum'].includes(item.term)){
          const items=[];parser.items({main:null},items,module.path,()=>parser.cursor.atEnd());
          if(items.length!==1||items[0].k!=='data')throw new TranslationError('syntax','expected one original data declaration',parser.cursor.peek());
          surface=items[0];
        }else{
          const attributes=parser.attributes();parser.visibility();
          if(parser.cursor.is('const')&&parser.cursor.is('fn',1)){const qualifier=parser.cursor.next(),fn=parser.fn(module.path);surface={...fn,constFunction:true,span:{...fn.span,start:qualifier.start}};}
          else if(parser.cursor.is('fn')||parser.cursor.is('async'))surface=parser.fn(module.path);
          else if(parser.cursor.is('const'))surface=parser.constItem(module.path);
          else throw new TranslationError('syntax','expected original function or constant',parser.cursor.peek());
          if(attributes.some(attribute=>attribute.kind==='tool'))surface={...surface,rustAttributes:attributes};
        }
        if(!parser.cursor.atEnd())throw new TranslationError('syntax','unconsumed declaration tokens',parser.cursor.peek());guard();
        const base=module.offset+item.start,semantic=relocate(surface,base);
        linkProjectDeclaration(parser,surface,semantic,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:module.offset,path:module.path,scope:{bindingEvidence:scope,compilationProfile:graph.compilationProfile,configurationCondition:module.configurationCondition}});
        // Source shadow admission reads only these genuinely parsed names and
        // kinds, never a metadata claim or an inferred namespace-complete flag.
        shadowDeclarations.push({path:[...module.path],surface:{k:surface.k,name:surface.name}});
        // Only a complete successful parse may register its generic layouts;
        // subsequent semantic refusals cannot change this initial ownership.
        // Root declarations also occupy canonical names before capture, as in
        // the producer; a spelling collision cannot manufacture a generic.
        if(module.path.length===0&&!roots.has(item.name))roots.set(item.name,{term:item.term,firstOwner});
        for(const type of parser.genericTypes.values()){
          const previous=roots.get(type.name);
          if(previous){if(previous.term==='generated-type'){if(!previous.sourceModuleOrigins.some(candidate=>moduleScopeKey(candidate)===moduleScopeKey(origin)))previous.sourceModuleOrigins.push(origin);}else collisions.push({name:type.name,existingOwner:previous.firstOwner,attemptedOwner:firstOwner});continue;}
          const declaration={file:module.file,path:[],sourceModuleOrigins:[origin],name:type.name,term:'generated-type',globalSpan:{start:base,end:module.offset+item.end},surface:relocate(type,base),firstOwner};
          declarations.push(declaration);roots.set(type.name,declaration);
        }
        parses.push({...firstOwner,status:'parsed',genericNames:[...parser.genericTypes.keys()]});
      }catch(error){if(!(error instanceof TranslationError))throw error;parses.push({...firstOwner,status:'refused',diagnostic:{kind:error.kind,message:error.reason,span:error.span}});}
    }
  }
  return {phase:'initial-source-declaration-parse',declarations,parses,collisions,shadowDeclarations,methodOriginsReplayed:false};
}

// Reuse the producer's registered host boundary and source-shadow exclusion.
// This supplies expected layouts only; it grants no new host operation, trait
// implementation, allocator behavior or external Default dispatch.
export function reviewSourceAdmittedHostLayouts(sourceDeclarations){
  const tree=[];
  for(const declaration of sourceDeclarations){
    let items=tree;
    for(const name of declaration.path){let module=items.find(item=>item.k==='module'&&item.name===name);if(!module){module={k:'module',name,items:[]};items.push(module);}items=module.items;}
    items.push(declaration.surface);
  }
  const declarations=[];
  function visit(items,path=[]){for(const item of items){if(item.k==='module')visit(item.items,[...path,item.name]);else if(item.k==='data')declarations.push({name:[...path,item.name].join('.'),path:[...path],term:'registered-host-type',surface:item});}}
  visit(admittedHostData(hostData(),tree));return declarations;
}
