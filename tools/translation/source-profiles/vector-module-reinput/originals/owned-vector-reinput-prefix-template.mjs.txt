// Canonical scalar guard recognition is subordinate to the current private
// native profile and original lexical/import symbols. No saved permit is read.
import {vectorParameterPrelude} from './owned-vector-parameter-values.mjs';
const fail=message=>{throw new TypeError('Owned reverse vector reinput: '+message);};
export function consumeVectorParameterPrelude(analysis,declaration,params,resolveImport){
 const {ts,file,checker}=analysis,body=declaration.body.statements;if(!params.length||!body.length)return body;
 const expected=vectorParameterPrelude({vectorOrigin:true,params},false).split('\n').map(line=>line.trim());
 if(body[0].getText(file)!==expected[0])return body;
 for(let at=0;at<params.length;at++){
  const param=params[at],statement=body[at],original=declaration.parameters[at],symbol=original&&ts.isIdentifier(original.name)&&checker.getSymbolAtLocation(original.name);
  if(!symbol||statement?.getText(file)!==expected[at])fail('complete canonical actual-parameter guard sequence required');
  if(['text-owned','str-static'].includes(param.type)){
   const call=ts.isExpressionStatement(statement)?statement.expression:null;
   if(!call||!ts.isCallExpression(call)||call.arguments.length!==1||!ts.isIdentifier(call.arguments[0])||checker.getSymbolAtLocation(call.arguments[0])!==symbol)fail('actual text input symbol required');
   const binding=resolveImport(call.expression);if(binding.typeOnly||binding.target!==analysis.runtimeRoot+'/owned-vector-text-runtime.mjs'||binding.name!=='vectorTextInput')fail('actual original Unicode input import required');
  }else{
   if(!ts.isIfStatement(statement)||statement.elseStatement||!ts.isThrowStatement(statement.thenStatement))fail('canonical actual primitive input guard required');
   let reads=0;const visit=node=>{if(ts.isIdentifier(node)&&node.text===param.name){if(checker.getSymbolAtLocation(node)!==symbol)fail('guard source parameter binding differs');reads++;}ts.forEachChild(node,visit);};visit(statement.expression);if(!reads)fail('guard has no actual source input');
   const thrown=statement.thenStatement.expression,constructor=thrown&&ts.isNewExpression(thrown)?thrown.expression:null,builtin=constructor&&checker.getSymbolAtLocation(constructor);
   if(!constructor||!ts.isIdentifier(constructor)||constructor.text!=='TypeError'||builtin&&(!builtin.declarations?.length||!builtin.declarations.every(row=>row.getSourceFile().isDeclarationFile&&/[/\\]lib\.[^/\\]+\.d\.ts$/u.test(row.getSourceFile().fileName))))fail('guard constructor must resolve to the original native declaration');
  }
 }
 return body.slice(params.length);
}
