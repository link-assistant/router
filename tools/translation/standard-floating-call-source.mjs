// Actual original import observations, never a callee/type/owner permit.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {FLOAT_CONTRACTS,PRIMITIVE_FLOAT_PROFILE} from './extensions/primitive-float-contracts.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Standard floating call source: '+message);};
export function createStandardFloatingCallSource({entry,source,file}){
 const ts=ownershipCompiler();need(file?.text===source&&!file.parseDiagnostics.length,'complete actual original native target file required');const relative=posix.relative(posix.dirname(entry),'runtime/float-runtime.mjs'),expected=relative.startsWith('.')?relative:'./'+relative,contracts=new Map(FLOAT_CONTRACTS.map(row=>[row.jsExport,row])),bindings=new Map(),used=new Set();
 for(const node of file.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!==expected)continue;const clause=node.importClause;need(clause&&!clause.isTypeOnly&&clause.namedBindings&&ts.isNamedImports(clause.namedBindings),'actual ordinary named float runtime import');
  for(const specifier of clause.namedBindings.elements){if(specifier.isTypeOnly)continue;const imported=(specifier.propertyName??specifier.name).text,contract=contracts.get(imported);if(!contract)continue;need(ts.isIdentifier(specifier.name)&&!bindings.has(specifier.name.text),'unique actual float runtime local binding');bindings.set(specifier.name.text,{local:specifier.name.text,imported,method:contract.rustPath[1],arity:contract.params.length,profile:contract.profile,requiresRefinement:contract.requiresRefinement??null,originalImport:{span:[node.getStart(file),node.end],source:source.slice(node.getStart(file),node.end),specifier:expected},sourceAuthority:false,semanticAuthority:false});}
 }
 return {
  has(name){return bindings.has(name);},
  assertFunctionScope(row){
   for(const name of row.parameters)need(!bindings.has(name),'standard runtime binding is shadowed by a parameter');let cells=0;const inspect=(node,depth=0)=>{need(++cells<=100000&&depth<=160,'complete standard binding shadow census bound');if(ts.isVariableDeclaration(node)||ts.isParameter(node))need(!ts.isIdentifier(node.name)||!bindings.has(node.name.text),'standard runtime binding is shadowed by an actual lexical declaration');ts.forEachChild(node,child=>inspect(child,depth+1));};inspect(row.expression);
  },
  lower(name,args){const binding=bindings.get(name);need(binding&&Array.isArray(args)&&args.length===binding.arity&&args.length===1&&args.every(value=>typeof value==='string'),'complete actual source-f64 inherent call arity required');used.add(name);return '('+args[0]+').'+binding.method+'()';},
  evidence(){return {schema:'original-standard-floating-import-observations-v1',entry,profile:PRIMITIVE_FLOAT_PROFILE,bindings:[...used].sort().map(name=>bindings.get(name)),sourceAuthority:false,semanticAuthority:false};},
 };
}
