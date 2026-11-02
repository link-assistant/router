// Complete native ABI/source equation for the existing private reverse context.
// Returned DATA never registers a reverse source frame or checked function.
import {requireOrderedTextMapNativeLibraryOwners} from './ordered-text-map-callers-20261102-native-owner.mjs';
import {captureOriginalCargoEdition} from './cargo-edition-context.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {captureSourceModuleViews} from './source-module-views.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {selectOriginalOrderedTextMapCore} from './ordered-text-map-20261102-interface.mjs';
import {ORDERED_TEXT_MAP_NATIVE_SOURCE} from './ordered-text-map-20261102-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=()=>{throw TypeError('Reverse ordered map requires complete actual root, opaque native leaf and receiving Cargo inputs');};
export function requireOrderedTextMapReverseNativeSources(files){
 if(!(files instanceof Map))fail();const root=files.get('src/lib.rs'),leaf=files.get('src/translation_ordered_text_map_core.rs'),manifest=files.get('Cargo.toml'),lock=files.get('Cargo.lock');
 if(typeof root!=='string'||leaf!==ORDERED_TEXT_MAP_NATIVE_SOURCE||typeof manifest!=='string'||typeof lock!=='string')fail();
 const current=()=>{if(files.get('src/lib.rs')!==root||files.get('src/translation_ordered_text_map_core.rs')!==leaf||files.get('Cargo.toml')!==manifest||files.get('Cargo.lock')!==lock)fail();};
 return withCompleteSourceClosingFence(()=>createRulePipeline([{phase:'language',rules:[{id:'ordered-map:reverse-complete-root-and-native-leaf-lossless-CST',apply:()=>{
  for(const source of [root,leaf]){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail();}
  const modules=[['src/lib.rs',[],root],['src/translation_ordered_text_map_core.rs',['translation_ordered_text_map_core'],leaf]].map(([file,path,source])=>{const captured=captureSourceModuleViews({source,sourcePath:file}),sourceView=captured.views[0];return {file,path,source,sourceView,configurationCondition:sourceView.configurationCondition};});
  const evidence=resolveModuleBindings({modules});selectOriginalOrderedTextMapCore({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});requireOrderedTextMapNativeLibraryOwners({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile,cargoEditionContext:captureOriginalCargoEdition(manifest),deriveDependencies:loadDeriveDependencyProof({manifest,lock})});return null;
 }}]},{phase:'repository',rules:[{id:'router:reverse-owned-map-native-ABI-cargo-source-join',apply:()=>{current();return {root,leaf,manifest,lock,sourceAuthority:false,semanticAuthority:false};}}]}]).run(null).value,[current]);
}
export function orderedTextMapReverseInputPrelude(item,rust,imports){
 if(rust)return '';const inputs=item.params.filter(parameter=>parameter.type==='text-map-input');if(!inputs.length)return '';imports.add('router_text_map_len');return inputs.map(parameter=>'    __ro_router_text_map_len('+parameter.name+');').join('\n');
}
export function validateOrderedTextMapReverseInputs(item,scope,modules){
 for(const parameter of item.params)if(parameter.type==='text-map-input'){
  if(typeof modules.orderedMap?.router_text_map_len!=='function')fail();modules.orderedMap.router_text_map_len(scope.get(parameter.name));
 }
}
export function consumeOrderedTextMapReverseInputPrelude(analysis,declaration,params,resolveImport,statements){
 const {ts,checker}=analysis,inputs=params.filter(param=>param.type==='text-map-input');if(!inputs.length||!statements.length)return statements;
 const first=statements[0],candidate=ts.isExpressionStatement(first)&&ts.isCallExpression(first.expression)&&first.expression.arguments.length===1&&ts.isIdentifier(first.expression.arguments[0])&&inputs.some(param=>param.name===first.expression.arguments[0].text);
 if(!candidate)return statements;
 const firstBinding=resolveImport(first.expression.expression);if(firstBinding.target!==analysis.runtimeRoot+'/ordered-text-map-20261102-runtime.mjs'||firstBinding.name!=='router_text_map_len')return statements;
 for(let index=0;index<inputs.length;index++){
  const parameter=inputs[index],statement=statements[index],call=statement&&ts.isExpressionStatement(statement)?statement.expression:null;
  if(!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||!ts.isIdentifier(call.arguments[0])||call.arguments[0].text!==parameter.name)throw TypeError('Complete map input validation prefix required');
  const original=declaration.parameters.find(row=>ts.isIdentifier(row.name)&&row.name.text===parameter.name),symbol=original&&checker.getSymbolAtLocation(original.name),binding=resolveImport(call.expression);
  if(!symbol||checker.getSymbolAtLocation(call.arguments[0])!==symbol||binding.typeOnly||binding.name!=='router_text_map_len'||binding.target!==analysis.runtimeRoot+'/ordered-text-map-20261102-runtime.mjs')throw TypeError('Map input prefix requires its actual parameter symbol and fixed runtime import');
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
