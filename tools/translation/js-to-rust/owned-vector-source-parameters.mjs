// Source binding DATA for pure primitive vector arguments. The caller retains
// the complete Rust forward capture and paired JS/TS private source traversal.
export function vectorSourceParameters({ts,checker,declaration,paired,profile}){
 const fail=message=>{throw new TypeError('Owned reverse vector parameters: '+message);};
 if(declaration.parameters.length!==profile.parameters.length||paired.declaration.parameters.length!==profile.parameters.length)fail('actual Rust and paired source arity differs');
 const params=[],inputs=[],seen=new Set();
 for(let at=0;at<profile.parameters.length;at++){
  const node=declaration.parameters[at],typed=paired.declaration.parameters[at],domain=profile.parameters[at];
  if(!ts.isIdentifier(node.name)||!ts.isIdentifier(typed.name)||typed.name.text!==node.name.text||seen.has(node.name.text)||node.initializer||typed.initializer||node.dotDotDotToken||typed.dotDotDotToken||node.questionToken||typed.questionToken||node.modifiers?.length||typed.modifiers?.length)fail('plain distinct by-value parameters required');
  if(!/^[a-z][A-Za-z0-9_]*$/u.test(node.name.text)||['arguments','eval','await','yield'].includes(node.name.text))fail('portable ordinary scalar parameter name required');
  seen.add(node.name.text);let annotation=typed.type;while(annotation&&ts.isParenthesizedTypeNode(annotation))annotation=annotation.type;
  if(annotation?.kind!==(domain.kind==='bool'?ts.SyntaxKind.BooleanKeyword:domain.kind==='float'?ts.SyntaxKind.NumberKeyword:domain.kind==='text'?ts.SyntaxKind.StringKeyword:ts.SyntaxKind.BigIntKeyword))fail('actual paired scalar keyword type differs');
  const symbol=checker.getSymbolAtLocation(node.name);if(!symbol||symbol.declarations?.length!==1||symbol.declarations[0]!==node)fail('unique actual parameter symbol required');
  const value={kind:'vector-input',name:node.name.text,rust:'__ro_vector_input_'+at,type:domain.name};params.push({name:value.name,rust:value.rust,type:value.type});inputs.push([symbol,{declaration:node,value}]);
 }
 return {params,inputs};
}
