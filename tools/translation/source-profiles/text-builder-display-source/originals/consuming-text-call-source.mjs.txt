// Source-bound import/call observations only. No source/type/loan permission.
import {fileURLToPath} from 'node:url';
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {textContract} from './text-contracts.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function createConsumingTextCallSource({entry,source,file}){
 const fail=message=>{throw new TypeError('Consuming text call source: '+message);},ts=ownershipCompiler();if(file?.text!==source||file.parseDiagnostics.length)fail('complete original native emitted target required');
 const relative=posix.relative(posix.dirname(entry),'runtime/text-runtime.mjs'),expected=relative.startsWith('.')?relative:'./'+relative,bindings=new Map(),used=new Set();let library=null;
 const current=()=>withNativeSubstitutionOperation(()=>{const plan=prepareNativeSubstitutionCopy({root:ROOT,archive:'tools/translation/source-profiles/consuming-text-call-source/complete-library-source-history.json.gz',pin:'f7eb4b68f8048f5dde6b648403e46ebb2f915aaabcf58804b97d65b455841e4e',id:'router:consuming-text-call-library-history-v1'});if(plan.files.length!==3||plan.files.some(row=>row.current!==row.currentAfter))fail('complete original consuming text runtime/declaration/catalog sources differ');return plan;});
 for(const node of file.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!==expected)continue;const clause=node.importClause;
  if(!clause||clause.isTypeOnly||clause.name||!clause.namedBindings||!ts.isNamedImports(clause.namedBindings)||node.attributes||node.modifiers?.length)fail('ordinary original named text runtime import required');
  for(const specifier of clause.namedBindings.elements){const imported=(specifier.propertyName??specifier.name).text,row=textContract(imported);if(!row||!['append_owned','clear_owned','to_owned'].includes(row.rustName))continue;if(specifier.isTypeOnly||!ts.isIdentifier(specifier.name)||bindings.has(specifier.name.text))fail('unique original consuming text import required');bindings.set(specifier.name.text,{local:specifier.name.text,operation:row.rustName,path:row.rustPath,arity:row.parameters.length,parameters:[...row.parameters],returns:row.returns,import:{span:[node.getStart(file),node.end],source:node.getText(file),specifier:expected},sourceAuthority:false,semanticAuthority:false});}
 }
 return {
  has(name){return bindings.has(name);},
  lower(name,args){const binding=bindings.get(name);if(!binding||!Array.isArray(args)||args.length!==binding.arity||args.some(value=>typeof value!=='string'))fail('complete actual imported consuming text call arity required');library??=current();used.add(name);return binding.path+'('+args.join(', ')+')';},
  assertFunctionScope(row){
   const bind=node=>{if(ts.isIdentifier(node)){if(bindings.has(node.text))fail('consuming text import is shadowed by an actual lexical binding');return;}if(ts.isObjectBindingPattern(node)||ts.isArrayBindingPattern(node))for(const element of node.elements)if(ts.isBindingElement(element))bind(element.name);};
   for(const parameter of row.parameters)if(bindings.has(parameter))fail('consuming text import is shadowed by an actual parameter');let cells=0;const visit=(node,depth=0)=>{if(++cells>100000||depth>160)fail('complete consuming text binding source census bound');if(ts.isVariableDeclaration(node)||ts.isParameter(node)||ts.isBindingElement(node))bind(node.name);if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node))&&node.name)bind(node.name);ts.forEachChild(node,child=>visit(child,depth+1));};visit(row.expression);
  },
  evidence(){return {schema:'original-consuming-text-call-source-v1',entry,bindings:[...used].sort().map(name=>bindings.get(name)),library:library?library.files.map(row=>({path:row.path,source:row.currentAfter,inverse:row.before,stages:row.stages,sourceAuthority:false,semanticAuthority:false})):null,sourceAuthority:false,semanticAuthority:false};},
  verify(){if(library){const fresh=current();for(let at=0;at<library.files.length;at++)if(library.files[at].path!==fresh.files[at].path||library.files[at].currentAfter!==fresh.files[at].currentAfter)fail('complete current consuming text library changed during source proposal');}},
 };
}
