import { refuse } from './constructs.mjs';
import { ownershipSyntax } from './module-syntax.mjs';

function propertyKey(ts,node) {
  if(ts.isStringLiteralLike(node))return node.text;
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken) {
    const left=propertyKey(ts,node.left),right=propertyKey(ts,node.right);
    if(left!==null&&right!==null)return left+right;
  }
  return null;
}

function astOwnership(ts,file,binding,constructor) {
  let reason=null,references=0;
  const visit=node=>{
    if(ts.isJSDoc(node))return;
    const parent=node.parent;
    const propertyName=ts.isIdentifier(node)&&parent&&(ts.isPropertyAccessExpression(parent)&&parent.name===node||ts.isPropertyAssignment(parent)&&parent.name===node||ts.isBindingElement(parent)&&parent.propertyName===node||ts.isImportSpecifier(parent)&&parent.propertyName===node);
    if(ts.isPropertyAccessExpression(node)&&['prototype','__proto__','constructor','iterator'].includes(node.name.text))reason??='unproved prototype or iterator behavior';
    if(ts.isElementAccessExpression(node)&&['prototype','__proto__','constructor','iterator'].includes(propertyKey(ts,node.argumentExpression)))reason??='a computed prototype or iterator reference';
    if(ts.isIdentifier(node)&&!propertyName) {
      if(['globalThis','global','window'].includes(node.text)) {
        const direct=ts.isPropertyAccessExpression(parent)&&parent.expression===node;
        const computed=ts.isElementAccessExpression(parent)&&parent.expression===node;
        const key=direct?parent.name.text:computed?propertyKey(ts,parent.argumentExpression):null;
        if(!direct&&!computed||key===null||[constructor,'Array'].includes(key))reason??='unproved global constructor or iterator ownership';
      }
      if(node.text==='eval')reason??='direct or unproved evaluation can access module bindings';
      if(node.text==='Array'&&!(ts.isPropertyAccessExpression(parent)&&parent.expression===node&&parent.name.text==='isArray'&&ts.isCallExpression(parent.parent)&&parent.parent.expression===parent))reason??='unproved literal-array intrinsic ownership';
      if(node.text===constructor&&!(ts.isNewExpression(parent)&&parent.expression===node))reason??=`unproved constructor/prototype ownership for ${constructor}`;
      if(node.text===binding.text&&node.getStart(file)!==binding.start) {
        references++;
        if(!ts.isPropertyAccessExpression(parent)||parent.expression!==node||ts.isOptionalChain(parent))reason??='a table reference escapes or is shadowed';
        else {
          const method=parent.name.text,call=parent.parent;
          if(['has',...(constructor==='Map'?['get']:[])].includes(method)) {
            if(!ts.isCallExpression(call)||call.expression!==parent||ts.isOptionalChain(call))reason??='a table method escapes direct invocation';
          } else if(method==='size') {
            let member=parent;
            // Destructuring assignment targets can wrap a member in nested
            // arrays, object properties and rest elements before the write.
            while(ts.isParenthesizedExpression(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent))member=member.parent;
            const outer=member.parent;
            if(ts.isBinaryExpression(outer)&&outer.left===member&&ts.isAssignmentOperator(outer.operatorToken.kind)||ts.isPrefixUnaryExpression(outer)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(outer.operator)||ts.isPostfixUnaryExpression(outer)||ts.isDeleteExpression(outer)||ts.isForOfStatement(outer)&&outer.initializer===member||ts.isForInStatement(outer)&&outer.initializer===member)reason??='a table size is written';
          } else reason??='an unproved table operation or reference';
        }
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(file);
  return {reason,references};
}

// Conservative whole-module ownership: every binding occurrence must be the
// declaration or a direct primitive-valued read. Unknown aliases and scopes
// refuse admission instead of assuming a heap object is an immutable table.
export function tableOwnership(tokens, items, shadowed,source) {
  const words=tokens.filter(token=>token.type!=='comment'),plans=new Map();
  for(const item of items) {
    if(item.comment)continue;
    const head=item.tokens[0]?.text==='export'?1:0,t=item.tokens;
    if(t[head]?.text!=='const'||t[head+1]?.type!=='ident'||t[head+2]?.text!=='='||t[head+3]?.text!=='new'||!['Map','Set'].includes(t[head+4]?.text)||t[head+5]?.text!=='('||t[head+6]?.text!=='[')continue;
    const binding=t[head+1],constructor=t[head+4].text;
    let reason=head?'an exported table escapes module ownership':shadowed.has(constructor)?`a shadowed ${constructor} constructor`:null;
    let references=0;
    for(let index=0;index<words.length;index++) {
      const token=words[index];
      if(token.type==='ident'&&token.text==='eval')reason??='direct or unproved evaluation can access module bindings';
      if(token.text==='prototype'||token.text==='__proto__'||token.text==='iterator'&&words[index-1]?.text==='.')reason??='unproved prototype or literal-array iterator behavior';
      if(token.type==='ident'&&token.text==='Array'&&!(words[index+1]?.text==='.'&&words[index+2]?.text==='isArray'&&words[index+3]?.text==='('))reason??='unproved literal-array intrinsic ownership';
      if(token.text==='constructor'&&words[index-1]?.text==='.')reason??='an unproved prototype constructor reference';
      if(token.type==='string'&&['"constructor"',"'constructor'",'"prototype"',"'prototype'",'"__proto__"',"'__proto__'"].includes(token.text)&&words[index-1]?.text==='['&&words[index+1]?.text===']'&&['ident','string'].includes(words[index-2]?.type))reason??='a computed prototype reference';
      if(token.type==='ident'&&token.text===constructor&&!(words[index-1]?.text==='new'&&words[index+1]?.text==='('))reason??=`unproved constructor/prototype ownership for ${constructor}`;
      if(token.type!=='ident'||token.text!==binding.text||token.start===binding.start)continue;
      references++;
      const method=words[index+2]?.text;
      const call=['has',...(constructor==='Map'?['get']:[])].includes(method)&&words[index+3]?.text==='(';
      let after=index+3,before=index-1;
      while(words[after]?.text===')')after++;
      while(words[before]?.text==='(')before--;
      const writes=['=','+=','-=','*=','/=','%=','**=','&=','|=','^=','<<=','>>=','>>>=','++','--','&&=','||=','??=','in','of'];
      const size=method==='size'&&!writes.includes(words[after]?.text)&&words[index+3]?.text!=='(';
      if(words[index+1]?.text!=='.'||!call&&!size)reason??='a table reference escapes or is written through an unproved operation';
      if(['++','--','delete'].includes(words[before]?.text))reason??='a table member is mutated';
    }
    plans.set(binding.start,{constructor,references,reason});
  }
  if(plans.size) {
    let syntax;
    try{syntax=ownershipSyntax(source);}catch{for(const plan of plans.values())plan.reason??='the complete module ownership parser is unavailable';return plans;}
    for(const [start,plan]of plans) {
      const binding=words.find(token=>token.start===start);
      const checked=astOwnership(syntax.ts,syntax.file,binding,plan.constructor);
      plan.reason??=checked.reason;plan.references=checked.references;
    }
  }
  return plans;
}

export function staticTableType(kind, entries) {
  if(entries.length>256)refuse('collection','an oversized static table');
  if(kind==='table-set')return 'table-set';
  if(!entries.length)refuse('collection','a Map without a closed primitive value contract');
  const type=entries[0].value.type;
  if(!['number','string','boolean'].includes(type)||entries.some(entry=>entry.value.type!==type))refuse('collection','heterogeneous or dynamic Map values');
  return `table-map-${type}`;
}

export function mapValueType(type) {
  return /^table-map-(string|number|boolean)$/u.exec(type)?.[1]??null;
}
