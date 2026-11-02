// Complete native ABI/source equation for the existing private reverse context.
// Returned DATA never registers a reverse source frame or checked function.
import {orderedTextMapReversePairInputRust} from './ordered-text-map-callers-20261102-reverse.mjs';
import {requireOrderedTextMapNativeLibraryOwners} from './ordered-text-map-callers-20261102-native-owner.mjs';
import {captureOriginalCargoEdition} from './cargo-edition-context.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {HostRustParser} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from './matches-macro-context.mjs';
import {selectOriginalOrderedTextMapCore} from './ordered-text-map-20261102-interface.mjs';
import {ORDERED_TEXT_MAP_NATIVE_SOURCE} from './ordered-text-map-20261102-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=()=>{throw TypeError('Reverse ordered map requires complete actual root, opaque native leaf and receiving Cargo inputs');};
export function requireOrderedTextMapReverseNativeSources(files){
 if(!(files instanceof Map))fail();const root=files.get('src/lib.rs'),leaf=files.get('src/translation_ordered_text_map_core.rs'),manifest=files.get('Cargo.toml'),lock=files.get('Cargo.lock');
 if(typeof root!=='string'||leaf!==ORDERED_TEXT_MAP_NATIVE_SOURCE||typeof manifest!=='string'||typeof lock!=='string')fail();
 const retained=[...files].filter(([path])=>path.endsWith('.rs')||path==='Cargo.toml'||path==='Cargo.lock');if(retained.length>512||retained.reduce((sum,[,source])=>sum+Buffer.byteLength(source),0)>8388608)fail();
 const current=()=>{const fresh=[...files].filter(([path])=>path.endsWith('.rs')||path==='Cargo.toml'||path==='Cargo.lock');if(fresh.length!==retained.length||fresh.some(([path,source],at)=>path!==retained[at][0]||source!==retained[at][1]))fail();};
 return withCompleteSourceClosingFence(()=>createRulePipeline([{phase:'language',rules:[{id:'ordered-map:reverse-complete-root-and-native-leaf-lossless-CST',apply:()=>{
  for(const source of [root,leaf]){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail();}
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths:retained.filter(([path])=>path.endsWith('.rs')).map(([path])=>path),readSource:path=>{current();if(!files.has(path))fail();return files.get(path);},compilationProfile:PRODUCTION_PROFILE});if(graph.diagnostics.length)fail();
  const deriveDependencies=loadDeriveDependencyProof({manifest,lock}),cargoEditionContext=captureOriginalCargoEdition(manifest),context=createMatchesMacroContext({modules:graph.modules,deriveDependencies,cargoEditionContext,compilationProfile:PRODUCTION_PROFILE}),parser=new HostRustParser(tokenizeRust(root));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});
  const state=matchesParserFacts(parser),modules=state.facts.modules,evidence=state.facts.evidence;selectOriginalOrderedTextMapCore({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});requireOrderedTextMapNativeLibraryOwners({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile,cargoEditionContext,deriveDependencies,parser});return null;
 }}]},{phase:'repository',rules:[{id:'router:reverse-owned-map-native-ABI-cargo-source-join',apply:()=>{current();return {root,leaf,manifest,lock,sourceAuthority:false,semanticAuthority:false};}}]}]).run(null).value,[current]);
}
export function orderedTextMapReverseInputPrelude(item,rust,imports){
 if(rust)return item.params.filter(parameter=>parameter.type==='text-pairs-input').map(parameter=>'    '+orderedTextMapReversePairInputRust(parameter.rust??parameter.name)).join('\n');return item.params.flatMap(parameter=>{const name=parameter.type==='text-map-input'?'router_text_map_len':parameter.type==='text-pairs-input'?'router_text_map_from_pairs':null;if(!name)return [];imports.add(name);return ['    __ro_'+name+'('+parameter.name+');'];}).join('\n');
}
export function validateOrderedTextMapReverseInputs(item,scope,modules){
 for(const parameter of item.params){const name=parameter.type==='text-map-input'?'router_text_map_len':parameter.type==='text-pairs-input'?'router_text_map_from_pairs':null;if(name){if(typeof modules.orderedMap?.[name]!=='function')fail();modules.orderedMap[name](scope.get(parameter.name));}}
}
export function consumeOrderedTextMapReverseInputPrelude(analysis,declaration,params,resolveImport,statements){
 const {ts,checker}=analysis,inputs=params.filter(param=>['text-map-input','text-pairs-input'].includes(param.type));if(!inputs.length||!statements.length)return statements;
 const first=statements[0],candidate=ts.isExpressionStatement(first)&&ts.isCallExpression(first.expression)&&first.expression.arguments.length===1&&ts.isIdentifier(first.expression.arguments[0])&&inputs.some(param=>param.name===first.expression.arguments[0].text);
 if(!candidate)return statements;
 const firstBinding=resolveImport(first.expression.expression);if(firstBinding.target!==analysis.runtimeRoot+'/ordered-text-map-20261102-runtime.mjs'||firstBinding.name!==(inputs[0].type==='text-map-input'?'router_text_map_len':'router_text_map_from_pairs'))return statements;
 for(let index=0;index<inputs.length;index++){
  const parameter=inputs[index],statement=statements[index],call=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||!ts.isIdentifier(call.arguments[0])||call.arguments[0].text!==parameter.name)throw TypeError('Complete map input validation prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===parameter.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(call.expression);
  if(!symbol||checker.getSymbolAtLocation(call.arguments[0])!==symbol||binding.typeOnly||binding.name!==(parameter.type==='text-map-input'?'router_text_map_len':'router_text_map_from_pairs')||binding.target!==analysis.runtimeRoot+'/ordered-text-map-20261102-runtime.mjs')throw TypeError('Map input prefix requires its actual parameter symbol and fixed runtime import');
 }
 return statements.slice(inputs.length);
}
export function readOrderedTextMapReverseImportType(ts,checker,type,analysis,target,declarationRoot){
 if(!ts.isImportTypeNode(type)||type.isTypeOf||!ts.isLiteralTypeNode(type.argument)||!ts.isStringLiteral(type.argument.literal)||type.qualifier?.text!=='OrderedTextMap'||type.typeArguments?.length||type.attributes)return null;
 if(target(type.argument.literal.text)!==analysis.runtimeRoot+'/ordered-text-map-20261102-runtime.mjs')throw TypeError('Opaque map type import requires its actual registered runtime');
 const declarations=checker.getSymbolAtLocation(type.qualifier)?.declarations,canonical=declarationRoot+'/ordered-text-map-20261102-runtime.d.mts';
 if(declarations?.length!==1||!ts.isTypeAliasDeclaration(declarations[0])||declarations[0].name.text!=='OrderedTextMap'||declarations[0].getSourceFile()!==analysis.syntax.get(canonical))throw TypeError('Opaque map type needs its actual native canonical declaration symbol');
 return 'text-map-input';
}
