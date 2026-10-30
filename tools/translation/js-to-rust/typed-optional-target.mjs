// Repository API formatting after complete source/semantic checking.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {camelFromSnake} from './vendor/ir.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
export function restoreTypedOptionalTarget(source,contracts){
 const fail=message=>{throw new TypeError('Typed optional target: '+message);};
 const wanted=contracts.filter(contract=>contract.kind==='function'&&contract.parameters.some(parameter=>parameter.optionalSource));
 if(!wanted.length)return {source,history:null};
 const ts=ownershipCompiler(),file=ts.createSourceFile('optional-target.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(ts.version!=='5.9.3'||file.parseDiagnostics.length)fail('complete native emitted TypeScript grammar required');
 const selections=[];
 for(const contract of wanted){
  const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===camelFromSnake(contract.name));
  if(nodes.length!==1||nodes[0].parameters.length!==contract.parameters.length)fail('one complete checked target signature required');
  for(let index=0;index<contract.parameters.length;index++){
   const written=contract.parameters[index];if(!written.optionalSource)continue;
   const parameter=nodes[0].parameters[index];if(!ts.isIdentifier(parameter.name)||parameter.name.text!==camelFromSnake(written.name)||parameter.questionToken||parameter.initializer||parameter.dotDotDotToken)fail('ordinary original optional target parameter required');
   selections.push({span:[parameter.name.end,parameter.name.end],expected:'',replacement:'?',function:contract.name,parameter:written.name,originalOptionalSource:written.optionalSource});
  }
 }
 let after=source;for(const selection of [...selections].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,selection.span[0])+'?'+after.slice(selection.span[1]);
 const reparsed=ts.createSourceFile('optional-target.ts',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(reparsed.parseDiagnostics.length)fail('complete optional target grammar differs');
 const equation=transportConcreteSourceEquations([{before:source,after,language:'TypeScript'}])[0];if(equation.inverse!==source)fail('full original emitted signature inverse differs');
 return {source:after,history:{selections,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false}};
}
