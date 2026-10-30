// Exact native endpoint for the original monomorphic alias resolver. Caller
// alias declarations retain their original fully resolved source-scope guards.
import {matchesParserFacts} from './matches-macro-context.mjs';
import {selectOriginalFixedTypeCore} from './fixed-type-core-interface.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from './fixed-type-core-source.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {rustFixedType,BOOL} from './checked-types.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireOriginalFromNamespaceCallbacks} from './extensions/host-contracts.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
export function originalFixedTypeAliasEndpoint(parser,route,span){
 if(!Array.isArray(route)||route.length!==3||route[0]!=='crate'||route[1]!=='translation_fixed_types_core')return null;
 requireOriginalFromNamespaceCallbacks(parser);const name=route[2],cursor=parser.cursor,tokens=cursor.tokens,index=cursor.index;const state=matchesParserFacts(parser),select=()=>selectOriginalFixedTypeCore({modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile});
 try{
  const selected=select(),module=state.facts.modules.find(row=>row.file===selected.file&&row.path.length===1&&row.path[0]==='translation_fixed_types_core'),view=module?.sourceView,items=module&&originalSourceModuleItems(module),owners=items?.filter(item=>item.term==='type'&&item.name===name);if(owners?.length!==1)throw new TypeError('actual original monomorphic paired alias item required');const owner=owners[0],words=owner.tokens.filter(row=>row.type!=='comment').map(row=>row.text),primitive=words[9];if(words.length!==11||!['pub','type',name,'=','::','std','::','primitive','::',primitive,';'].every((word,at)=>word===words[at]))throw new TypeError('actual paired scalar alias RHS required');
  const run=createRulePipeline([{phase:'language',rules:[{id:'scalar-alias-endpoint:transport-complete-original-native-library',apply:()=>{const concrete=transportConcreteSyntaxSource(selected.source,{language:'Rust'});if(concrete.source!==FIXED_TYPE_CORE_NATIVE_SOURCE||transportConcreteSyntaxMeta(concrete.meta).source!==selected.source)throw new TypeError('actual complete paired scalar CST inverse differs');return concrete;}}]},{phase:'repository',rules:[{id:'router:resolve-only-original-protected-native-scalar-endpoint',apply:()=>{const type=primitive==='bool'?{...BOOL}:primitive==='f64'?{kind:'float'}:rustFixedType(primitive);if(!type)throw new TypeError('existing checked scalar domain required');return {...type,rustPrimitiveName:primitive,rustSourceType:true};}}]}]).run(null);
  const current=select();if(current.source!==selected.source||current.file!==selected.file||current.rootFile!==selected.rootFile||current.span[0]!==selected.span[0]||current.span[1]!==selected.span[1]||module.sourceView!==view||module.source!==selected.source||!originalSourceModuleItems(module).includes(owner)||matchesParserFacts(parser)!==state||parser.cursor!==cursor||cursor.tokens!==tokens||cursor.index!==index||route.length!==3||route[0]!=='crate'||route[1]!=='translation_fixed_types_core'||route[2]!==name)throw new TypeError('current original protected alias/source/scope association changed');return run.value;
 }catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('owned scalar alias endpoint',error.message,span);}
}
