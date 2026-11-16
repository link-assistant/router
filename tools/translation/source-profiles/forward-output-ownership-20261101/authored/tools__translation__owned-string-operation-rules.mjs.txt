// Source substitutions only. The receiving compiler still resolves actual
// imports, validates the complete runtime and proves every operand's loan.
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {addOwnedCoreBatchSource,removeOwnedCoreBatchSource} from './owned-core-batch-source.mjs';

const prefix='tools/translation/js-to-rust/';
const oldRegistry=`// Finite ABI equations only. Native source/import/loan checks remain private.
const operation=Object.freeze({name:'router_core_ascii_chars_in',args:Object.freeze(['str','str']),ret:'bool',rust:'ascii_chars_in'});
export const ownedAsciiOperation=name=>name===operation.name?operation:null;
export function ownedAsciiRustCall(name,args){
 if(!ownedAsciiOperation(name)||!Array.isArray(args)||args.length!==2||args.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))throw TypeError('Owned reverse ASCII: fixed operation and two bound operands required');
 return 'crate::translation_core::ascii_chars_in('+args.join(', ')+')';
}
`;
const newRegistry=`// Finite string ABI equations. Native source/import/loan checks remain private.
const operations=Object.freeze([
 Object.freeze({name:'router_core_ascii_chars_in',args:Object.freeze(['str','str']),ret:'bool',rust:'ascii_chars_in'}),
 Object.freeze({name:'router_core_unicode_scalar_count',args:Object.freeze(['str']),ret:'usize',rust:'unicode_scalar_count'}),
]);
// Keep the existing ASCII API and its exact fixed-operation refusal contract.
export const ownedAsciiOperation=name=>operations.find(operation=>name===operation.name)??null;
export function ownedAsciiRustCall(name,args){
 const operation=ownedAsciiOperation(name);
 if(!operation||!Array.isArray(args)||args.length!==operation.args.length||args.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))throw TypeError('Owned reverse ASCII: fixed operation and two bound operands required');
 const call='crate::translation_core::'+operation.rust+'('+args.join(', ')+')';
 // The checked JavaScript usize domain uses u64. A scalar count cannot exceed
 // its borrowed string's byte length, hence usize -> u64 is lossless here.
 return operation.ret==='usize'?'('+call+' as u64)':call;
}
`;
const changes=Object.freeze({
 [prefix+'owned-ascii-source.mjs']:[[oldRegistry,newRegistry]],
 [prefix+'owned-core-source.mjs']:[
  ["node.arguments.length!==2)fail('fixed ASCII arity')","node.arguments.length!==ascii.args.length)fail('fixed ASCII arity')"],
  ['ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)', 'ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.GreaterThanEqualsToken].includes(node.operatorToken.kind)'],
  ["if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':!['bool','str','usize'].includes(left.type)||left.type!==right.type)fail('identity/coercion comparison outside owned profile');", "if(['<','<=','>','>='].includes(op)){if(!['usize','u64','i64'].includes(left.type)||left.type!==right.type)fail('ordered comparison requires identical checked integer domains');}\n   else if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':!['bool','str','usize'].includes(left.type)||left.type!==right.type)fail('identity/coercion comparison outside owned profile');"],
 ],
 [prefix+'owned-core-operations.mjs']:[
  ["value.type!==op.ret||value.args.length!==2||value.args.some(argument=>argument.type!=='str')","value.type!==op.ret||value.args.length!==op.args.length||value.args.some(argument=>argument.type!=='str')"],
  ["return value.op==='==='?left===right:left!==right;", "switch(value.op){case '===':return left===right;case '!==':return left!==right;case '<':return left<right;case '<=':return left<=right;case '>':return left>right;case '>=':return left>=right;default:fail('unissued checked binary operator');}"],
  ["ownedPlainData,ownedCoreSourceData} from './owned-core-source.mjs';", "ownedPlainData,ownedCoreSourceData,withOwnedRuntimeImportEdges} from './owned-core-source.mjs';",'repository'],
  ["return withOwnedCoreItemChecks(check=>program.map(item=>{const result=check(item,context);if(names.has(result.name))fail('duplicate function');names.add(result.name);return result;}));", "return withOwnedRuntimeImportEdges(()=>withOwnedCoreItemChecks(check=>program.map(item=>{const result=check(item,context);if(names.has(result.name))fail('duplicate function');names.add(result.name);return result;})));",'repository'],
 ],
 [prefix+'owned-core-corpus.mjs']:[
  ["throw TypeError('Actual authored ASCII witness and library alias required');", "throw TypeError('Actual authored ASCII witness and library alias required');\n const scalar=[...original.matchAll(/const REVERSE_SCALAR_JS_WITNESS: &str = r###\"([\\s\\S]*?)\"###;/gu)];if(scalar.length>1)throw TypeError('Ambiguous authored scalar witness');\n const authored=matches[0][1]+(scalar[0]?.[1]??'');"],
  ["header='// GENERATED: actual checked reverse ASCII receiving witness.\\n',source=header+matches[0][1]", "header='// GENERATED: actual checked reverse ASCII receiving witness.\\n',source=header+authored"],
  ["sourceRecipe:{kind:'prepend-one-generated-comment',before:matches[0][1],after:source,prefix:header,wholeUndo:source.slice(header.length)===matches[0][1]}", "sourceRecipe:{kind:'prepend-one-generated-comment',before:authored,after:source,prefix:header,wholeUndo:source.slice(header.length)===authored}"],
 ],
});
const fail=message=>{throw TypeError('Owned string operation source rules: '+message);};
function substitute(path,source,inverse){
 if(typeof source!=='string')fail('complete primitive source required');
 const pairs=changes[path];if(!pairs)return source;
 if(inverse&&path.endsWith('owned-core-operations.mjs'))source=removeOwnedCoreBatchSource(source);
 let start=0,end=source.length;
 if(path.endsWith('owned-core-corpus.mjs')){
  const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),owners=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ownedCoreAsciiWitnessArtifacts');
  if(file.parseDiagnostics.length||owners.length!==1)fail('one complete native ASCII witness producer required');
  start=owners[0].getStart(file);end=owners[0].end;
 }
 const language=path.endsWith('owned-core-source.mjs')||path.endsWith('owned-core-operations.mjs');
 const indexed=pairs.map((pair,index)=>({pair,index})),rules=(inverse?indexed.reverse():indexed).map(({pair,index})=>{const [before,after]=inverse?[pair[1],pair[0]]:pair;return {phase:pair[2]??(language&&index>0?'language':'repository'),rule:{id:'substitution-'+index,apply:value=>value.includes(before)?exactLiteralSubstitutionRule('selected',before,after,'one exact string operation anchor required').apply(value):value}};});
 const languageRules=rules.filter(row=>row.phase==='language').map(row=>row.rule),repositoryRules=rules.filter(row=>row.phase==='repository').map(row=>row.rule);
 const after=createRulePipeline([
  {phase:'language',rules:languageRules},
  {phase:'repository',rules:repositoryRules},
 ]).run(source.slice(start,end)).value;
 const result=source.slice(0,start)+after+source.slice(end);
 return !inverse&&path.endsWith('owned-core-operations.mjs')?addOwnedCoreBatchSource(result):result;
}
export const extendOwnedStringOperations=(path,source)=>substitute(path,source,false);
export function restoreOwnedStringOperations(path,source){
 // Earlier complete outputs may contain a prefix of the ordered additions.
 // Every consumer still joins this full inverse to its pinned full predecessor.
 return substitute(path,source,true);
}
export const OWNED_STRING_OPERATION_PATHS=Object.freeze(Object.keys(changes));
