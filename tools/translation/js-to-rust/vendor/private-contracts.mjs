import { ownershipSyntax } from './module-syntax.mjs';

const forbidden=new Set(['prototype','__proto__','constructor','stack','getPrototypeOf','setPrototypeOf','defineProperty','defineProperties','getOwnPropertyDescriptor','getOwnPropertyDescriptors']);
const unwrap=(ts,node)=>ts.isParenthesizedExpression(node)?unwrap(ts,node.expression):node;
function keyOf(ts,node) {
  if(ts.isStringLiteralLike(node))return node.text;
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken){const a=keyOf(ts,node.left),b=keyOf(ts,node.right);if(a!==null&&b!==null)return a+b;}
  return null;
}
function guaranteedString(ts,node) {
  node=unwrap(ts,node);
  return ts.isStringLiteralLike(node)||ts.isTemplateExpression(node)||ts.isConditionalExpression(node)&&guaranteedString(ts,node.whenTrue)&&guaranteedString(ts,node.whenFalse)||ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&(guaranteedString(ts,node.left)||guaranteedString(ts,node.right));
}
function propertyName(ts,node) {
  const p=node.parent;
  return p&&(ts.isPropertyAccessExpression(p)&&p.name===node||ts.isPropertyAssignment(p)&&p.name===node||ts.isBindingElement(p)&&p.propertyName===node||ts.isImportSpecifier(p)&&p.propertyName===node);
}
function intrinsicOwnership(ts,file) {
  let reason=null;
  const visit=node=>{
    if(ts.isJSDoc(node))return;
    const p=node.parent;
    if(ts.isPropertyAccessExpression(node)&&forbidden.has(node.name.text)||ts.isElementAccessExpression(node)&&forbidden.has(keyOf(ts,node.argumentExpression)))reason??='unproved Error prototype, stack or reflection capability';
    if(ts.isIdentifier(node)&&!propertyName(ts,node)) {
      if(['eval','Function'].includes(node.text))reason??='unproved dynamic evaluation capability';
      if(node.text==='Error'&&!(ts.isNewExpression(p)&&p.expression===node||ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.InstanceOfKeyword&&p.right===node||ts.isExpressionWithTypeArguments(p)&&p.expression===node))reason??='a shadowed, escaping or mutable Error constructor';
      if(node.text==='Object') {
        if(!ts.isPropertyAccessExpression(p)||p.expression!==node)reason??='unproved Object intrinsic ownership';
        else {
          let member=p;
          while(ts.isParenthesizedExpression(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent))member=member.parent;
          const outer=member.parent;
          if(ts.isBinaryExpression(outer)&&outer.left===member&&ts.isAssignmentOperator(outer.operatorToken.kind)||ts.isPrefixUnaryExpression(outer)||ts.isPostfixUnaryExpression(outer)||ts.isDeleteExpression(outer)||ts.isForOfStatement(outer)&&outer.initializer===member||ts.isForInStatement(outer)&&outer.initializer===member)reason??='a mutable Object intrinsic';
        }
      }
      if(['globalThis','global','window'].includes(node.text)) {
        const direct=ts.isPropertyAccessExpression(p)&&p.expression===node,computed=ts.isElementAccessExpression(p)&&p.expression===node;
        const key=direct?p.name.text:computed?keyOf(ts,p.argumentExpression):null;
        if(key===null||['Object','Error','eval','Function'].includes(key))reason??='unproved global Error/Object ownership';
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(file);return reason;
}

// Infer only a closed private call contract. A successful string literal,
// template, conditional or string concatenation argument is a primitive JS
// string before the helper starts; possible argument effects are not erased.
export function privateErrorContracts(source) {
  const bindings=new Map();
  if(!source.includes('new Error'))return {bindings,owned:false};
  let syntax;
  try{syntax=ownershipSyntax(source);}catch{return {bindings,owned:false,reason:'complete Error ownership syntax is unavailable'};}
  const {ts,file}=syntax,reason=intrinsicOwnership(ts,file);
  for(const statement of file.statements) {
    if(!ts.isVariableStatement(statement))continue;
    for(const declaration of statement.declarationList.declarations) {
      if(!ts.isIdentifier(declaration.name)||!declaration.initializer||!ts.isArrowFunction(declaration.initializer))continue;
      const fn=declaration.initializer,body=unwrap(ts,fn.body);
      if(!ts.isCallExpression(body)||!ts.isPropertyAccessExpression(body.expression)||body.expression.expression.getText(file)!=='Object'||body.expression.name.text!=='assign'||body.arguments.length!==2)continue;
      const first=body.arguments[0];
      if(!ts.isNewExpression(first)||first.expression.getText(file)!=='Error'||first.arguments?.length!==1||!ts.isIdentifier(first.arguments[0]))continue;
      const message=fn.parameters.findIndex(param=>param.name.getText(file)===first.arguments[0].text);
      if(message<0)continue;
      const plan={message,calls:[],reason:reason??(statement.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)?'an exported helper has no closed call contract':null)};
      if(!(statement.declarationList.flags&ts.NodeFlags.Const))plan.reason??='a mutable helper binding';
      const name=declaration.name.text,start=declaration.name.getStart(file);
      const visit=node=>{
        if(ts.isJSDoc(node))return;
        if(ts.isIdentifier(node)&&node.text===name&&node.getStart(file)!==start&&!propertyName(ts,node)) {
          const call=node.parent;
          if(!ts.isCallExpression(call)||call.expression!==node||ts.isOptionalChain(call)||call.arguments.some(ts.isSpreadElement))plan.reason??='a private helper binding escapes or is shadowed';
          else {
            const argument=call.arguments[message];
            const proved=Boolean(argument&&guaranteedString(ts,argument));
            plan.calls.push({start:call.getStart(file),end:call.end,messageStart:argument?.getStart(file)??null,messageEnd:argument?.end??null,proved});
            if(!proved)plan.reason??='a message argument without a primitive string syntax contract';
          }
        }
        ts.forEachChild(node,visit);
      };
      visit(file);if(!plan.calls.length)plan.reason??='a helper without proved source calls';
      bindings.set(start,plan);
    }
  }
  return {bindings,owned:!reason,reason};
}
