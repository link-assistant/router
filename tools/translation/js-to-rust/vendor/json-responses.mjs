// A closed JSON tree is semantic AST data, not carried JSON/source text.
// Response itself remains a host capability; Rust exposes an explicit projection.
import { refuse } from './constructs.mjs';
import { ownershipSyntax } from './module-syntax.mjs';

export function utf16Link(value) {return ['units',...Array.from({length:value.length},(_,i)=>String(value.charCodeAt(i)))];}
export function utf16Of(link) {
  if(!Array.isArray(link)||link[0]!=='units'||link.slice(1).some(unit=>!/^\d+$/u.test(unit)||Number(unit)>65535))refuse('collection','malformed closed JSON UTF16 units');
  return link.slice(1).map(unit=>String.fromCharCode(Number(unit))).join('');
}
function stringLiteral(text) {
  // Legacy numeric escapes are forbidden in original ECMAScript modules.
  if(/\\(?:[1-9]|0[0-9])/u.test(text))refuse('collection','a legacy closed JSON string escape');
  let syntax;try{syntax=ownershipSyntax('const jsonLiteral='+text+';');}catch{refuse('collection','invalid closed JSON string syntax');}
  const value=syntax.file.statements[0]?.declarationList?.declarations[0]?.initializer;
  if(!value||!syntax.ts.isStringLiteral(value))refuse('collection','a nonliteral closed JSON string');
  return value.text;
}
export function parseClosedJson(at,depth=0) {
  if(depth>32)refuse('collection','an oversized closed JSON depth');
  const token=at.next();
  if(token.type==='string')return {kind:'json-string',value:stringLiteral(token.text)};
  if(token.type==='number'||token.text==='-') {
    const text=(token.text==='-'?'-'+at.next().text:token.text);
    if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(text)||!Number.isFinite(Number(text)))refuse('collection','a nonfinite or malformed closed JSON number');
    return {kind:'json-number',text};
  }
  if(token.text==='null')return {kind:'json-null'};
  if(['true','false'].includes(token.text))return {kind:'json-boolean',value:token.text==='true'};
  if(token.text==='('){const value=parseClosedJson(at,depth+1);at.expect(')');return value;}
  if(token.text==='[') {
    const values=[];
    while(!at.eat(']')){values.push(parseClosedJson(at,depth+1));if(values.length>256)refuse('collection','an oversized closed JSON array');if(!at.is(']'))at.expect(',');}
    return {kind:'json-array',values};
  }
  if(token.text==='{') {
    const fields=[];
    while(!at.eat('}')) {
      const key=at.next();let name;
      if(key.type==='string')name=stringLiteral(key.text);
      else if(key.type==='ident')name=key.text;
      else if(key.type==='number'&&/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(key.text)&&Number.isFinite(Number(key.text)))name=String(Number(key.text));
      else refuse('collection','a computed, spread or dynamic closed JSON key');
      at.expect(':');fields.push({name,value:parseClosedJson(at,depth+1)});
      if(fields.length>256)refuse('collection','an oversized closed JSON record');if(!at.is('}'))at.expect(',');
    }
    return {kind:'json-record',fields};
  }
  refuse('collection','a nonliteral or effectful closed JSON operand');
}
export function checkClosedJson(node,depth=0,budget={nodes:0}) {
  if(!node||depth>32||++budget.nodes>4096)refuse('collection','an oversized or malformed closed JSON tree');
  let checked;
  switch(node.kind) {
    case 'json-string':if(typeof node.value!=='string'||node.value.length>65536)refuse('collection','a malformed closed JSON string');checked={...node};break;
    case 'json-number':if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(node.text)||!Number.isFinite(Number(node.text)))refuse('collection','a malformed closed JSON number');checked={...node};break;
    case 'json-boolean':if(typeof node.value!=='boolean')refuse('collection','a malformed closed JSON boolean');checked={...node};break;
    case 'json-null':checked={...node};break;
    case 'json-array':if(!Array.isArray(node.values)||node.values.length>256)refuse('collection','a malformed closed JSON array');checked={...node,values:node.values.map(value=>checkClosedJson(value,depth+1,budget))};break;
    case 'json-record':
      if(!Array.isArray(node.fields)||node.fields.length>256)refuse('collection','a malformed closed JSON record');
      checked={...node,fields:node.fields.map(field=>{if(typeof field.name!=='string'||field.name.length>65536||['__proto__','toJSON'].includes(field.name))refuse('collection','a closed JSON prototype or serialization hook');return {name:field.name,value:checkClosedJson(field.value,depth+1,budget)};})};break;
    default:refuse('collection','a nonliteral closed JSON tree');
  }
  return {...checked,type:'closed-json'};
}
export function closedJsonValue(node) {
  switch(node.kind) {
    case 'json-number':return Number(node.text);
    case 'json-string':case 'json-boolean':return node.value;
    case 'json-null':return null;
    case 'json-array':return node.values.map(closedJsonValue);
    case 'json-record':return Object.fromEntries(node.fields.map(field=>[field.name,closedJsonValue(field.value)]));
    default:refuse('collection','a nonliteral closed JSON value');
  }
}
export function jsonResponseStatus(options) {
  if(options===null)return 200;
  if(options.kind!=='json-record'||options.fields.some(field=>field.name!=='status'))refuse('collection','unimplemented JSON Response options');
  const field=options.fields.at(-1),status=field?closedJsonValue(field.value):200;
  if(!Number.isInteger(status)||status<200||status>599||[204,205,304].includes(status))refuse('collection','a throwing or bodyless JSON Response status');
  return status;
}
export function jsonResponseOwnership(source) {
  if(!source.includes('Response'))return {owned:false};
  let syntax;try{syntax=ownershipSyntax(source);}catch{return {owned:false,reason:'complete Response ownership syntax is unavailable'};}
  const {ts,file}=syntax;let reason=null;
  const propertyName=node=>{const p=node.parent;return p&&(ts.isPropertyAccessExpression(p)&&p.name===node||ts.isPropertyAssignment(p)&&p.name===node||ts.isBindingElement(p)&&p.propertyName===node||ts.isImportSpecifier(p)&&p.propertyName===node);};
  const keyOf=node=>ts.isStringLiteralLike(node)?node.text:ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&keyOf(node.left)!==null&&keyOf(node.right)!==null?keyOf(node.left)+keyOf(node.right):null;
  const forbidden=new Set(['prototype','__proto__','constructor','defineProperty','defineProperties','getPrototypeOf','setPrototypeOf','getOwnPropertyDescriptor','getOwnPropertyDescriptors']);
  const visit=node=>{
    if(ts.isJSDoc(node))return;const p=node.parent;
    if(ts.isPropertyAccessExpression(node)&&forbidden.has(node.name.text)||ts.isElementAccessExpression(node)&&forbidden.has(keyOf(node.argumentExpression)))reason??='unproved Response/prototype reflection capability';
    if(ts.isIdentifier(node)&&!propertyName(node)) {
      if(['eval','Function'].includes(node.text))reason??='unproved dynamic Response ownership';
      if(node.text==='Response'&&!(ts.isPropertyAccessExpression(p)&&p.expression===node&&p.name.text==='json'&&ts.isCallExpression(p.parent)&&p.parent.expression===p&&!ts.isOptionalChain(p.parent)))reason??='a shadowed, mutated or escaping Response owner';
      if(['Object','JSON'].includes(node.text)) {
        if(!ts.isPropertyAccessExpression(p)||p.expression!==node)reason??='an escaping JSON/Object intrinsic';
        else {
          let member=p;
          while(ts.isParenthesizedExpression(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent))member=member.parent;
          const outer=member.parent;
          if(ts.isBinaryExpression(outer)&&outer.left===member&&ts.isAssignmentOperator(outer.operatorToken.kind)||ts.isPrefixUnaryExpression(outer)||ts.isPostfixUnaryExpression(outer)||ts.isDeleteExpression(outer)||ts.isForOfStatement(outer)&&outer.initializer===member||ts.isForInStatement(outer)&&outer.initializer===member)reason??='a mutable JSON/Object intrinsic';
        }
      }
      if(['globalThis','global','window'].includes(node.text)) {
        const key=ts.isPropertyAccessExpression(p)&&p.expression===node?p.name.text:ts.isElementAccessExpression(p)&&p.expression===node?keyOf(p.argumentExpression):null;
        if(key===null||['Response','JSON','Object','eval','Function'].includes(key))reason??='unproved global Response/JSON ownership';
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(file);return {owned:!reason,reason};
}
