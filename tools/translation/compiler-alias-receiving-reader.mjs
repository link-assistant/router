// Source-comparison DATA only; no callable or compiler permission is issued.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-sequential-phases.mjs';
export const COMPILER_ALIAS_SCOPE_READER={
 consumer:'tools/translation/test/private-native-proof-cost-scope.test.mjs',
 module:'./current-proof-cost-source-history.mjs',
 path:'tools/translation/test/current-proof-cost-source-history.mjs',
 imported:'readProofCostScopeHistory',
};
const fail=message=>{throw new TypeError('Compiler alias receiving reader: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one complete '+label+' required');return rows[0];};
export function deriveCompilerAliasScopeReader(consumer,wrapper){
 for(const source of [consumer,wrapper])if(typeof source!=='string'||Buffer.byteLength(source)>2097152)fail('bounded complete sources required');
 const equations=transportConcreteNamedSourcePhases([consumer,wrapper].map(source=>({
  before:source,middle:source,after:source,language:'JavaScript',rules:[
   'language:retain-complete-reader-source','repository:retain-actual-reader-composition',
   'language:restore-complete-reader-source','repository:restore-actual-reader-composition'],
 })));
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=(path,source)=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const current=parse(COMPILER_ALIAS_SCOPE_READER.consumer,equations[0].after),actual=parse(COMPILER_ALIAS_SCOPE_READER.path,equations[1].after);
 const imports=(file,local)=>file.statements.filter(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.name.text===local));
 const reader=one(imports(current,'readFileSync'),'consumer reader import');
 if(reader.getText(current)!=="import {readProofCostScopeHistory as readFileSync} from './current-proof-cost-source-history.mjs';")fail('registered complete consumer import differs');
 const prior=one(imports(actual,'readCompilerAliasHistory'),'original alias import');
 if(prior.getText(actual)!=="import {readCompilerAliasHistory} from './fixtures/compiler-data-alias-history.mjs';")fail('original alias import differs');
 const definitions=name=>actual.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 const entry=one(definitions('readProofCostScopeHistory'),'receiving reader declaration');
 if(entry.getText(actual)!=='export function readProofCostScopeHistory(...args){return historicalRead(readCompilerAliasHistory,args);}')fail('original reader delegation differs');
 const history=one(definitions('historicalRead'),'native-first history declaration');
 if(history.parameters.length!==2||history.parameters[0].getText(actual)!=='read'||history.parameters[1].getText(actual)!=='args'||history.body?.statements[0]?.getText(actual)!=='const source=read(...args);'||history.body?.statements.at(-1)?.getText(actual)!=='return source;')fail('original complete native-first history boundary differs');
 for(const equation of equations)if(equation.inverse!==equation.before)fail('complete source inverse differs');
 return {schema:'compiler-alias-scope-receiving-reader-v1',consumer,wrapper,equations,
  selections:{consumer:reader.getText(current),prior:prior.getText(actual),entry:entry.getText(actual),history:history.getText(actual)},
  typescriptVersion:ts.version,sourceAuthority:false,runtimeAuthority:false};
}
