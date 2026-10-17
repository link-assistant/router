// Producer facts are derived from original syntax and lexical symbols. They
// describe conditional private inline callback inputs, never enclosing execution.
// Effectful parents may change intrinsic lookups; their stability is unproved.
import {ownershipSyntax} from './module-syntax.mjs';
const authorized=new WeakMap(),active=new Map();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function callbackInputsFor(source){const contract=active.get(source);return authorized.has(contract)?contract:null;}
export function withCallbackInputs(source,contract,analyze){const expected=authorized.get(contract);if(!expected)throw Error('unproved private callback inputs');const {ts,file}=ownershipSyntax(source),statements=file.statements;if(statements.length!==1||!ts.isVariableStatement(statements[0])||statements[0].declarationList.declarations.length!==1||statements[0].declarationList.declarations[0].initializer?.getText(file)!==expected)throw Error('private callback source-body drift');const previous=active.get(source);active.set(source,contract);try{return analyze(source,{includeScoped:false,lossless:true});}finally{if(previous)active.set(source,previous);else active.delete(source);}}
export function callbackProducerInputs({ts,file,checker,checkedCallbacks}) {
  const unwrap=node=>{while(node&&ts.isParenthesizedExpression(node))node=node.expression;return node;};
  const symbol=node=>checker.getSymbolAtLocation(node);
  const lexical=declaration=>[ts.SyntaxKind.VariableDeclaration,ts.SyntaxKind.BindingElement,ts.SyntaxKind.Parameter,ts.SyntaxKind.ImportSpecifier,ts.SyntaxKind.ImportClause,ts.SyntaxKind.NamespaceImport,ts.SyntaxKind.FunctionDeclaration,ts.SyntaxKind.FunctionExpression,ts.SyntaxKind.ClassDeclaration,ts.SyntaxKind.ClassExpression].includes(declaration.kind);
  const global=(node,name)=>ts.isIdentifier(node)&&node.text===name&&!symbol(node)?.declarations?.some(lexical);
  const inside=(node,container)=>node.pos>=container.pos&&node.end<=container.end;
  const span=node=>({kind:ts.SyntaxKind[node.kind],start:node.getStart(file),end:node.end});
  const written=node=>{let target=node;while(target.parent&&(ts.isParenthesizedExpression(target.parent)||ts.isArrayLiteralExpression(target.parent)||ts.isObjectLiteralExpression(target.parent)||ts.isPropertyAssignment(target.parent)&&target.parent.initializer===target||ts.isShorthandPropertyAssignment(target.parent)||ts.isSpreadElement(target.parent)))target=target.parent;const parent=target.parent;return parent&&(ts.isBinaryExpression(parent)&&parent.left===target&&ts.isAssignmentOperator(parent.operatorToken.kind)||ts.isPrefixUnaryExpression(parent)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(parent.operator)||ts.isPostfixUnaryExpression(parent)||ts.isForOfStatement(parent)&&parent.initializer===target||ts.isForInStatement(parent)&&parent.initializer===target);};
  const writes=new Set();const scan=node=>{if(ts.isIdentifier(node)&&written(node)){const binding=ts.isShorthandPropertyAssignment(node.parent)?checker.getShorthandAssignmentValueSymbol(node.parent):symbol(node);if(binding)writes.add(binding);}ts.forEachChild(node,scan);};scan(file);
  const typeGuard=(condition,binding,truth)=>{
    const node=unwrap(condition);if(!node)return false;
    if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return typeGuard(node.operand,binding,!truth);
    if(ts.isBinaryExpression(node)){
      const op=node.operatorToken.kind;if(truth&&op===ts.SyntaxKind.AmpersandAmpersandToken||!truth&&op===ts.SyntaxKind.BarBarToken)return typeGuard(node.left,binding,truth)||typeGuard(node.right,binding,truth);
      if(![ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)||truth!==(op===ts.SyntaxKind.EqualsEqualsEqualsToken))return false;
      const left=unwrap(node.left),right=unwrap(node.right),probe=ts.isTypeOfExpression(left)?left:ts.isTypeOfExpression(right)?right:null,tag=probe===left?right:left;
      return probe&&ts.isStringLiteralLike(tag)&&tag.text==='string'&&ts.isIdentifier(unwrap(probe.expression))&&symbol(unwrap(probe.expression))===binding;
    }return false;
  };
  const abrupt=node=>{node=unwrap(node);if(ts.isThrowStatement(node)||ts.isReturnStatement(node))return true;if(ts.isBlock(node))return node.statements.length>0&&abrupt(node.statements.at(-1));if(ts.isIfStatement(node)&&node.elseStatement)return abrupt(node.thenStatement)&&abrupt(node.elseStatement);return false;};
  const guarded=(binding,at)=>{
    for(let ancestor=at.parent;ancestor&&ancestor!==file;ancestor=ancestor.parent){
      if(ts.isIfStatement(ancestor)){if(inside(at,ancestor.thenStatement)&&typeGuard(ancestor.expression,binding,true)||ancestor.elseStatement&&inside(at,ancestor.elseStatement)&&typeGuard(ancestor.expression,binding,false))return span(ancestor);}
      if(ts.isBlock(ancestor)){for(const statement of ancestor.statements){if(statement.end>at.getStart(file))break;if(ts.isIfStatement(statement)&&!statement.elseStatement&&abrupt(statement.thenStatement)&&typeGuard(statement.expression,binding,false))return span(statement);}}
      if(ts.isFunctionLike(ancestor))break;
    }return null;
  };
  const stringOrigin=(input,at,seen=new Set())=>{
    const node=unwrap(input);if(!node)return null;
    if(ts.isStringLiteralLike(node)||ts.isTemplateExpression(node))return {kind:'string-literal',span:span(node)};
    if(ts.isCallExpression(node)&&global(unwrap(node.expression),'String'))return {kind:'genuine-String-result',span:span(node)};
    if(ts.isIdentifier(node)){
      const binding=symbol(node);if(!binding||writes.has(binding)||seen.has(binding))return null;
      const guard=guarded(binding,at);if(guard)return {kind:'dominating-string-guard',binding:binding.declarations.map(span),guard};
      const declarations=binding.declarations??[];if(declarations.length===1&&ts.isVariableDeclaration(declarations[0])&&declarations[0].initializer&&declarations[0].end<=at.getStart(file)){
        const next=new Set(seen);next.add(binding);const origin=stringOrigin(declarations[0].initializer,declarations[0],next);if(origin)return {kind:'immutable-string-binding',binding:span(declarations[0]),origin};
      }
    }
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['trim','trimStart','trimEnd'].includes(node.expression.name.text)&&node.arguments.length===0){const receiver=stringOrigin(node.expression.expression,at,seen);if(receiver)return {kind:'genuine-string-method-result',method:node.expression.name.text,span:span(node),receiver};}
    return null;
  };
  const fixedSeparator=node=>{
    node=unwrap(node);if(!node)return {kind:'omitted'};
    if(ts.isStringLiteralLike(node)||ts.isNumericLiteral(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind)||global(node,'undefined'))return {kind:'fixed-primitive',span:span(node)};
    if(ts.isRegularExpressionLiteral(node)){
      const text=node.getText(file),end=text.lastIndexOf('/'),pattern=text.slice(1,end),flags=text.slice(end+1);try{new RegExp(pattern,flags);}catch{return null;}
      let escaped=false,inClass=false;for(let index=0;index<pattern.length;index++){const ch=pattern[index];if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch==='['){inClass=true;continue;}if(ch===']'){inClass=false;continue;}if(!inClass&&ch==='('&&!['(?:','(?=','(?!','(?<=','(?<!'].some(prefix=>pattern.startsWith(prefix,index)))return null;}
      return {kind:'owned-noncapturing-RegExp-literal',span:span(node)};
    }return null;
  };
  const sequence=(input,at,seen=new Set())=>{
    const node=unwrap(input);if(!node||seen.has(node)||!ts.isCallExpression(node)||!ts.isPropertyAccessExpression(node.expression))return null;const next=new Set(seen);next.add(node);const method=node.expression.name.text,receiver=unwrap(node.expression.expression);
    if(global(receiver,'Object')&&method==='entries'&&node.arguments.length===1&&!ts.isSpreadElement(node.arguments[0]))return {type:'entry-value',proof:{kind:'genuine-Object.entries',span:span(node)}};
    if(method==='split'&&node.arguments.length<=1){const origin=stringOrigin(receiver,at),separator=fixedSeparator(node.arguments[0]);if(origin&&separator)return {type:'utf16-string',proof:{kind:'genuine-string-split',span:span(node),origin,separator}};}
    if(['map','filter'].includes(method)&&node.arguments.length===1){const producer=sequence(receiver,at,next),callback=node.arguments[0],checked=checkedCallbacks.get(callback);if(!producer||!checked)return null;if(method==='filter')return {...producer,proof:{kind:'checked-filter-pipeline',span:span(node),callback:span(callback),producer:producer.proof}};if(['string','utf16-string'].includes(checked.returns))return {type:'utf16-string',proof:{kind:'checked-string-map-pipeline',span:span(node),callback:span(callback),producer:producer.proof,returns:checked.returns}};}
    return null;
  };
  return node=>{
    const call=node.parent;if(!ts.isCallExpression(call)||call.arguments[0]!==node||call.arguments.length!==1||!ts.isPropertyAccessExpression(call.expression)||!['map','filter','some','every','flatMap'].includes(call.expression.name.text)||node.parameters.length!==1)return null;
    const parameter=node.parameters[0];if(parameter.initializer||parameter.dotDotDotToken||parameter.type)return null;
    const producer=sequence(call.expression.expression,node);if(!producer)return null;
    let bindings=null;
    if(producer.type==='utf16-string'){if(!ts.isIdentifier(parameter.name))return null;}
    else if(ts.isArrayBindingPattern(parameter.name)&&parameter.name.elements.length>=1&&parameter.name.elements.length<=2){bindings=[];for(const element of parameter.name.elements){if(ts.isOmittedExpression(element)){bindings.push(null);continue;}if(!ts.isBindingElement(element)||!ts.isIdentifier(element.name)||element.initializer||element.dotDotDotToken||element.propertyName)return null;bindings.push(element.name.text);}}
    else return null;
    const capability={status:'conditional-private-body-draft',standardProducerAndCallbackIntrinsicsRequired:true,producerLookupStabilityProved:false,producerEffectsTranslated:false,originalSignatureFullDomainPreserved:false,parentAdmitted:false,unqualifiedCallerAdmitted:false,runtimeParity:false};
    const contract={type:producer.type,bindings,capability,parameter:span(parameter),callsite:span(call),producer:producer.proof};freeze(contract);authorized.set(contract,node.getText(file));return contract;
  };
}
