// Original runtime factory/import observations only. Fresh Rust checking is mandatory.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {fixedIntegerContracts} from './extensions/fixed-integer-contracts.mjs';
import {createStandardFloatingCallSource} from './standard-floating-call-source.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Standard numeric call source: '+message);};
function primitiveCandidates(){
 const result=[];
 for(const bits of [8,16,32,64,128])for(const signed of [false,true])result.push({kind:'fixed',bits,signed,rustPrimitiveName:(signed?'i':'u')+bits});
 for(const signed of [false,true])result.push({kind:'fixed',bits:64,signed,rustPrimitiveName:signed?'isize':'usize'});
 return result;
}
function ordinaryFixedType(ts,node){
 need(ts.isObjectLiteralExpression(node)&&node.properties.length===3,'complete original fixed runtime type literal');
 const values=new Map();
 for(const property of node.properties){
  need(ts.isPropertyAssignment(property)&&(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)),'ordinary original fixed type fields');
  const name=property.name.text;need(['kind','bits','signed'].includes(name)&&!values.has(name),'unique original fixed type fields');
  values.set(name,property.initializer);
 }
 const kind=values.get('kind'),bits=values.get('bits'),signed=values.get('signed');
 need(ts.isStringLiteral(kind)&&kind.text==='fixed'&&ts.isNumericLiteral(bits)&&/^(8|16|32|64|128)$/u.test(bits.text)&&[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(signed.kind),'closed original runtime width and signedness');
 return {kind:'fixed',bits:Number(bits.text),signed:signed.kind===ts.SyntaxKind.TrueKeyword};
}
function assertUnshadowed(ts,row,names){
 const bind=node=>{
  if(ts.isIdentifier(node)){need(!names.has(node.text),'numeric runtime binding is shadowed by an actual lexical declaration');return;}
  if(ts.isObjectBindingPattern(node)||ts.isArrayBindingPattern(node))for(const element of node.elements)if(ts.isBindingElement(element))bind(element.name);
 };
 for(const name of row.parameters)need(!names.has(name),'numeric runtime binding is shadowed by a parameter');
 let cells=0;
 const visit=(node,depth=0)=>{
  need(++cells<=100000&&depth<=160,'complete numeric binding shadow census bound');
  if(ts.isVariableDeclaration(node)||ts.isParameter(node)||ts.isBindingElement(node))bind(node.name);
  if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node))&&node.name)bind(node.name);
  ts.forEachChild(node,child=>visit(child,depth+1));
 };
 visit(row.expression);
}
export function createStandardNumericCallSource({entry,source,file}){
 const ts=ownershipCompiler();need(file?.text===source&&!file.parseDiagnostics.length,'complete actual original native target file');
 const floats=createStandardFloatingCallSource({entry,source,file}),relative=posix.relative(posix.dirname(entry),'runtime/fixed-integer-runtime.mjs'),expected=relative.startsWith('.')?relative:'./'+relative;
 const primitive=createPrimitiveOperatorCallSource({entry,source,file}),factories=new Map(),bindings=new Map(),used=new Set();
 for(const node of file.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!==expected)continue;
  const clause=node.importClause;need(clause&&!clause.isTypeOnly&&clause.namedBindings&&ts.isNamedImports(clause.namedBindings),'ordinary original fixed runtime named import');
  for(const specifier of clause.namedBindings.elements){
   if(specifier.isTypeOnly||(specifier.propertyName??specifier.name).text!=='createFixedIntegerRuntime')continue;
   need(ts.isIdentifier(specifier.name)&&!factories.has(specifier.name.text),'unique original fixed runtime factory import');
   factories.set(specifier.name.text,{span:[node.getStart(file),node.end],source:node.getText(file),specifier:expected});
  }
 }
 const contracts=new Map();
 if(factories.size)for(const type of primitiveCandidates())for(const contract of fixedIntegerContracts(type).contracts){
  const name='ml_host_'+contract.id;need(!contracts.has(name),'distinct original fixed primitive encoding');contracts.set(name,{contract,type});
 }
 for(const statement of file.statements){
  if(!ts.isVariableStatement(statement))continue;
  for(const declaration of statement.declarationList.declarations){
   if(!ts.isIdentifier(declaration.name))continue;
   const selected=contracts.get(declaration.name.text);if(!selected)continue;
   need(!statement.modifiers?.length&&(statement.declarationList.flags&ts.NodeFlags.BlockScoped)===ts.NodeFlags.Const&&statement.declarationList.declarations.length===1&&!declaration.type&&!declaration.exclamationToken,'one original immutable numeric instantiation');
   const member=declaration.initializer;need(member&&ts.isPropertyAccessExpression(member)&&!member.questionDotToken&&member.name.text===selected.contract.jsExport,'actual registered fixed operation member');
   const call=member.expression;need(ts.isCallExpression(call)&&ts.isIdentifier(call.expression)&&factories.has(call.expression.text)&&!call.questionDotToken&&!call.typeArguments?.length&&call.arguments.length===1&&!ts.isSpreadElement(call.arguments[0]),'actual imported fixed runtime factory call');
   const observed=ordinaryFixedType(ts,call.arguments[0]),type=selected.contract.runtimeInstantiation.type;
   need(observed.bits===type.bits&&observed.signed===type.signed&&!bindings.has(declaration.name.text),'original runtime instantiation matches registered primitive');
   bindings.set(declaration.name.text,{local:declaration.name.text,method:selected.contract.rustPath.at(-1),arity:selected.contract.params.length,primitive:selected.type.rustPrimitiveName,type:observed,originalImport:factories.get(call.expression.text),originalInstantiation:{span:[statement.getStart(file),statement.end],source:statement.getText(file)},sourceAuthority:false,semanticAuthority:false});
  }
 }
 const names=new Set([...bindings.keys(),...factories.keys()]);
 return {
  has(name){return bindings.has(name)||floats.has(name);},
  primitiveActive:primitive.active,
  hasPrimitive(name){return primitive.has(name);},
  lowerPrimitive(name,node,read){return primitive.lower(name,node,read);},
  assertFunctionScope(row){floats.assertFunctionScope(row);primitive.assertFunctionScope(row);assertUnshadowed(ts,row,names);},
  lower(name,args){
   if(!bindings.has(name))return floats.lower(name,args);
   const binding=bindings.get(name);need(Array.isArray(args)&&args.length===binding.arity&&args.length>=1&&args.every(value=>typeof value==='string'),'complete actual fixed inherent call arity');
   used.add(name);return '('+args[0]+').'+binding.method+'('+args.slice(1).join(', ')+')';
  },
  evidence(){return {schema:'original-standard-numeric-import-observations-v1',entry,floating:floats.evidence(),...(primitive.active?{primitiveOperators:primitive.evidence()}:{}),bindings:[...used].sort().map(name=>bindings.get(name)),sourceAuthority:false,semanticAuthority:false};},
 };
}

import {createPrimitiveOperatorCallSource} from './primitive-operator-call-source.mjs';
