// Bounded executable original Rust control. Source branches and helper bodies
// produce capture pieces; no source receipt grants caller namespace authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from './format-source-profiles.mjs';
import {isSourceLiteralFormatConstructorCandidate} from './format-constructor-inputs.mjs';
import {RUST_WHITESPACE_CODE_UNITS} from './extensions/whitespace-data.mjs';
import {isOriginalControlRecord,originalControlRecordPatternFields} from './source-control-records.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('source format control: '+message);};
const PROFILE_DIGEST='098331076dab9b8876c110a4a0feb3442bf57aa4adac3f0abc230036c1e839cc';
const root=new URL('./source-profiles/source-format-template/',import.meta.url);
const programs=new WeakMap(),executions=new WeakMap(),bodyPrograms=new WeakMap(),originalPatternSlots=new WeakMap();
const word=node=>node?.kind==='token'?node.text:null;
const name=node=>node?.kind==='token'&&node.type==='ident'&&/^(?:r#)?[\p{L}_][\p{L}\p{N}_]*$/u.test(node.text);
// Original BinOpKind::precedence/fixity separates bitwise groups and gives
// every comparison one non-associative precedence (pinned ast.rs).
const precedence={'..':0,'||':1,'&&':2,'==':3,'!=':3,'<':3,'<=':3,'>':3,'>=':3,'|':4,'^':5,'&':6,'<<':7,'>>':7,'+':8,'-':8,'*':9,'/':9,'%':9};
const comparison=operation=>['==','!=','<','<=','>','>='].includes(operation);
const range=nodes=>({start:nodes[0]?.span.start??0,end:nodes.at(-1)?.span.end??0});
function split(nodes,separator=',') {
  if(!nodes.length)return [];
  const rows=[];let start=0,closureParameters=false;
  for(let at=0;at<=nodes.length;at++){
    if(separator===','&&word(nodes[at])==='|')closureParameters=!closureParameters;
    if(at===nodes.length||word(nodes[at])===separator&&!closureParameters){const row=nodes.slice(start,at);if(!row.length){if(at===nodes.length&&start===at)break;throw new TypeError('Source control has an empty separated operand');}rows.push(row);start=at+1;}
  }
  return rows;
}
// TT punctuation remains original. Rejoin only adjacent source punctuators
// needed by this expression grammar; never expose opaque macro fragments.
function expressionTokens(nodes) {
  const result=[];
  for(let at=0;at<nodes.length;at++){const first=nodes[at],second=nodes[at+1];
    if(first?.kind==='token'&&second?.kind==='token'&&first.type==='punct'&&second.type==='punct'&&first.sourceSha256===second.sourceSha256&&first.span.end===second.span.start&&(word(first)==='>'&&word(second)==='>'||word(first)==='.'&&word(second)==='.')){result.push({...first,text:word(first)+word(second),span:{start:first.span.start,end:second.span.end},originalPunctuation:[first,second]});at++;}else result.push(first);
  }
  return result;
}
function expansionOrigins(nodes){const result=new Map();const visit=node=>{for(const origin of node.sourceOrigins??[])result.set(JSON.stringify(origin),origin);if(node.kind==='group')node.children.forEach(visit);};nodes.forEach(visit);return [...result.values()];}
class SourceControlParser {
  constructor(nodes,budget,depth=0,slots=null){if(depth>64)throw new TypeError('Source control depth exceeds its finite bound');this.nodes=expressionTokens(nodes);this.at=0;this.budget=budget;this.depth=depth;this.records=true;this.slots=slots;}
  current(){return this.nodes[this.at];}
  take(value){if(word(this.current())===value){this.at++;return true;}return false;}
  need(value){if(!this.take(value))throw new TypeError('Source control requires original '+value);}
  group(delimiter){const node=this.nodes[this.at++];if(node?.kind!=='group'||node.delimiter!==delimiter)throw new TypeError('Source control requires original '+delimiter+' group');return node;}
  child(nodes){return new SourceControlParser(nodes,this.budget,this.depth+1,this.slots);}
  coordinates(nodes){return this.slots?{sourceSpan:null,sourceOrigins:expansionOrigins(nodes)}:{sourceSpan:range(nodes)};}
  blockGroup(group=this.group('{')){return {...this.child(group.children).block(),...this.coordinates([group])};}
  node(kind,start,fields={}){if(--this.budget.cells<0)throw new TypeError('Source control cell bound exhausted');return {kind,...fields,...this.coordinates(this.nodes.slice(start,this.at))};}
  expressionAll(nodes){const parser=this.child(nodes),result=parser.expression();if(parser.at!==parser.nodes.length)throw new TypeError('Source control expression leaves original tokens at '+parser.current()?.span.start+' ('+String(word(parser.current())).slice(0,64)+')');return result;}
  condition(){const before=this.records;this.records=false;try{return this.expression();}finally{this.records=before;}}
  pattern(nodes){if(!nodes.length)throw new TypeError('Source control pattern is empty');if(nodes.some(node=>node.kind==='original-control-ast-slot'&&!originalPatternSlots.has(node)))throw new TypeError('Source control pattern requires its private original AST slot');return {kind:'original-pattern-obligation',tokens:nodes,...this.coordinates(nodes),bindingSemanticsVerified:false,constructorOwnerResolved:false};}
  conditional(start){if(++this.budget.conditionals>64){this.budget.conditionals--;throw new TypeError('Source control conditional depth exceeds its finite bound');}
    try{const condition=this.condition(),then=this.blockGroup();let otherwise=null;
      if(this.take('else'))otherwise=this.take('if')?this.conditional(this.at-1):this.blockGroup();
      return this.node('if',start,{condition,then,otherwise,branchBindingVerified:false});
    }finally{this.budget.conditionals--;}
  }
  matching(start){const subject=this.condition(),group=this.group('{'),arms=[];
    const parser=this.child(group.children);
    while(parser.at<parser.nodes.length){
      const begin=parser.at;let arrow=begin;
      while(arrow<parser.nodes.length&&word(parser.nodes[arrow])!=='=>')arrow++;
      if(arrow===begin||arrow===parser.nodes.length)throw new TypeError('Source match arm lacks its original pattern/arrow');
      const pattern=parser.nodes.slice(begin,arrow),guardAt=pattern.findIndex(token=>word(token)==='if');parser.at=arrow+1;
      const value=parser.expression(),end=parser.at;
      if(!parser.take(',')&&parser.at<parser.nodes.length&&!['block-expression','if','match'].includes(value.kind))throw new TypeError('Source match arm requires its original comma');
      arms.push({pattern:this.pattern(guardAt<0?pattern:pattern.slice(0,guardAt)),guard:guardAt<0?null:this.expressionAll(pattern.slice(guardAt+1)),value,...parser.coordinates(parser.nodes.slice(begin,end))});
    }
    if(!arms.length)throw new TypeError('Source control match has no original arms');return this.node('match',start,{subject,arms,armBindingVerified:false,exhaustivenessVerified:false});
  }
  expression(minimum=0){if(++this.budget.expressions>64){this.budget.expressions--;throw new TypeError('Source control expression depth exceeds its finite bound');}
    try{const start=this.at;let value=this.primary();
      for(;;){const operation=word(this.current()),level=precedence[operation];if(['while','for'].includes(value.kind)||level===undefined||level<minimum)break;
        if(comparison(operation)&&value.kind==='binary'&&comparison(value.operation))throw new TypeError('Source control comparisons require original parentheses rather than a comparison chain');
        const operatorToken=this.nodes[this.at++],right=operation==='..'&&this.at===this.nodes.length?null:this.expression(level+1),lazy=operation==='&&'||operation==='||';
        value=this.node('binary',start,{operation,operatorToken,left:value,right,operatorOwnerResolved:false,evaluationOrderVerified:false,...(lazy?{rightEvaluation:operation==='&&'?'conditional-on-left-true':'conditional-on-left-false',shortCircuitSemanticsVerified:false}:{})});
      }
      return value;
    }finally{this.budget.expressions--;}
  }
  primary(){const start=this.at,node=this.nodes[this.at++],raw=word(node);let value;
    if(node?.kind==='original-control-ast-slot'){const slot=this.slots?.get(node);if(slot?.fragment!=='expr'||!slot.ir)throw new TypeError('Source control expression requires its private original AST slot');value=slot.ir;}
    else if(['async','move','yield','await','const'].includes(raw))throw new TypeError('Source control modifier requires additional source grammar: '+raw);
    else if(raw==='unsafe')value=this.node('unresolved-source-branch',start,{modifier:raw,originalGroup:this.group('{')});
    else if(raw==='if')value=this.conditional(start);
    else if(raw==='match')value=this.matching(start);
    else if(raw==='while'){const condition=this.condition(),body=this.blockGroup();value=this.node('while',start,{condition,body,terminationVerified:false});}
    else if(raw==='loop')value=this.node('loop',start,{body:this.blockGroup(),terminationVerified:false});
    else if(raw==='for'){const beginning=this.at;while(this.at<this.nodes.length&&word(this.current())!=='in')this.at++;const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('in');const iterable=this.condition(),body=this.blockGroup();value=this.node('for',start,{pattern,iterable,body,iteratorOwnerResolved:false});}
    else if(raw==='let'){const beginning=this.at;while(this.at<this.nodes.length&&word(this.current())!=='=')this.at++;const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('=');value=this.node('condition-let',start,{pattern,value:this.expression(3),chainBindingVerified:false});}
    else if(['return','break','continue'].includes(raw)){const empty=this.at===this.nodes.length||[',',';'].includes(word(this.current()));
      if(raw==='continue'&&!empty)throw new TypeError('Source control continue labels/values require additional original grammar');
      value=this.node(raw,start,{value:empty?null:this.expression(),exitScopeVerified:false});
    }
    else if(raw==='..')value=this.node('binary',start,{operation:'..',left:null,right:this.at===this.nodes.length?null:this.expression(1)});
    else if(['!','-','*','&'].includes(raw)){const mutable=raw==='&'&&this.take('mut');value=this.node('unary',start,{operation:raw,mutable,value:this.expression(10),operatorOwnerResolved:false});}
    else if(raw==='|'||raw==='||'){const beginning=this.at;if(raw==='|'){while(this.at<this.nodes.length&&word(this.current())!=='|')this.at++;this.need('|');}const parameters=raw==='||'?[]:this.nodes.slice(beginning,this.at-1);value=this.node('closure',start,{parameterTokens:parameters,body:this.expression(),captureSemanticsVerified:false});}
    else if(node?.kind==='group'&&node.delimiter==='{')value=this.node('block-expression',start,{body:this.blockGroup(node)});
    else if(node?.kind==='group'&&node.delimiter==='('){const parts=split(node.children),trailingComma=word(node.children.at(-1))===',';value=parts.length===1&&!trailingComma?this.node('parenthesized',start,{value:this.expressionAll(parts[0])}):this.node('tuple',start,{items:parts.map(part=>this.expressionAll(part)),trailingComma});}
    else if(node?.kind==='group'&&node.delimiter==='[')value=this.node('array',start,{items:split(node.children).map(part=>this.expressionAll(part)),allocationVerified:false});
    else if(raw==='true'||raw==='false'||['string','char','number'].includes(node?.type))value=this.node('literal',start,{sourceLiteralKind:raw==='true'||raw==='false'?'bool':node.type,raw,sourceLiteral:node});
    else if(name(node)){const path=[raw];while(this.take('::')){if(this.take('<')){while(this.at<this.nodes.length&&!this.take('>'))this.at++;break;}if(!name(this.current()))throw new TypeError('Source control generic/qualified type arguments require additional source grammar');path.push(word(this.nodes[this.at++]));}
      value=this.node('written-path',start,{path,ownerResolved:false});
      if(this.take('!')){const arguments_=this.nodes[this.at++];if(arguments_?.kind!=='group')throw new TypeError('Source macro requires its original delimiter');value=this.node('opaque-macro',start,{path,arguments:arguments_,macroOwnerResolved:false,expansionVerified:false});}
      else if(this.records&&this.current()?.delimiter==='{'){const group=this.group('{'),fields=split(group.children).map(tokens=>{
        if(tokens.length===1&&name(tokens[0]))return {kind:'shorthand',name:word(tokens[0]),tokens};
        if(name(tokens[0])&&word(tokens[1])===':')return {kind:'field',name:word(tokens[0]),value:this.expressionAll(tokens.slice(2)),tokens};
        throw new TypeError('Source record field/update/attribute requires additional source grammar');
      });value=this.node('record',start,{path,fields,layoutOwnerResolved:false});}
    }else throw new TypeError('Source control prefix requires additional source grammar: '+String(raw));
    for(;;){
      if(this.current()?.delimiter==='('){const group=this.group('(');value=this.node('call',start,{callee:value,arguments:split(group.children).map(tokens=>this.expressionAll(tokens)),calleeOwnerResolved:false});}
      else if(this.current()?.delimiter==='['){const group=this.group('[');value=this.node('index',start,{object:value,index:this.expressionAll(group.children),indexContractVerified:false});}
      else if(this.take('.')){const field=this.nodes[this.at++];if(!name(field)&&!/^[0-9]+$/u.test(word(field)??''))throw new TypeError('Source control member requires an original field identifier');value=this.node('field',start,{object:value,name:word(field),fieldOwnerResolved:false});}
      else if(this.take('as')){const target=word(this.nodes[this.at++]);value=this.node('cast',start,{value,target});}
      else if(this.take('?'))value=this.node('try',start,{value,residualOwnerResolved:false,exitScopeVerified:false});
      else break;
    }
    return value;
  }
  block(){const statements=[];let tail=null;
    while(this.at<this.nodes.length){const start=this.at;
      if(this.take('let')){
        const beginning=this.at;while(this.at<this.nodes.length&&!['=',';'].includes(word(this.current())))this.at++;
        const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('=');const initializer=this.expression();let otherwise=null;
        if(this.take('else'))otherwise=this.blockGroup();this.need(';');statements.push(this.node('let',start,{pattern,initializer,otherwise,initializerBeforeBinding:true,bindingSemanticsVerified:false,divergenceVerified:false}));continue;
      }
      const value=this.expression();
      if(['=','+=','-=','*=','/=','%=','|=','&=','^='].includes(word(this.current()))){const operation=word(this.nodes[this.at++]),right=this.expression();this.need(';');statements.push(this.node('assign',start,{target:value,operation,value:right,placeOwnerResolved:false,evaluationOrderVerified:false}));}
      else if(this.take(';'))statements.push(this.node('expression-statement',start,{value}));
      else if(this.at===this.nodes.length){tail=value;break;}
      else if(['if','match','while','for','loop','block-expression'].includes(value.kind))statements.push(this.node('expression-statement',start,{value}));
      else throw new TypeError('Source control expression is not followed by its original statement delimiter');
    }
    return {kind:'control-block',statements,tail,lexicalScopeVerified:false,...(this.slots?this.coordinates(this.nodes):{})};
  }
}

class Scope {
  constructor(parent=null){this.parent=parent;this.values=new Map();this.functionOriginal=parent?.functionOriginal??null;}
  has(name){return this.values.has(name)||!!this.parent?.has(name);}
  get(name){return this.values.has(name)?this.values.get(name):this.parent?.get(name);}
  set(name,value){if(this.values.has(name)||!this.parent?.has(name))this.values.set(name,value);else this.parent.set(name,value);}
}
const variant=(tag,...args)=>({tag,args});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const utf8=value=>Buffer.byteLength(value,'utf8');
function literal(raw){
  if(raw==='true'||raw==='false')return raw==='true';
  if(/^\d|^0x/u.test(raw))return Number(raw.replace(/_/gu,''));
  if(!['"',"'"].includes(raw[0]))fail('unresolved source literal');
  const content=raw.slice(1,-1);let result='';
  for(let at=0;at<content.length;at++){
    if(content[at]!=='\\'){result+=content[at];continue;}
    const next=content[++at],simple={n:'\n',r:'\r',t:'\t','0':'\0','\\':'\\',"'":"'",'"':'"'};
    if(Object.hasOwn(simple,next))result+=simple[next];
    else if(next==='x'){result+=String.fromCodePoint(parseInt(content.slice(at+1,at+3),16));at+=2;}
    else fail('unresolved control literal escape');
  }
  return result;
}
function patternTokens(nodes){
  const colon=nodes.findIndex(node=>word(node)===':');
  return nodes.slice(0,colon<0?nodes.length:colon).filter(node=>!['ref','mut','&'].includes(word(node)));
}
function bindPattern(nodes,value,env){
  nodes=patternTokens(nodes);
  if(nodes.length===1&&originalPatternSlots.has(nodes[0]))return bindOriginalAstPattern(originalPatternSlots.get(nodes[0]),value,env);
  const alternatives=split(nodes,'|');if(alternatives.length>1){for(const alternative of alternatives){const local=new Scope(env);if(bindPattern(alternative,value,local)){for(const [key,item] of local.values)env.values.set(key,item);return true;}}return false;}
  if(nodes.length===1){const node=nodes[0],text=word(node);
    if(text==='_')return true;
    if(node.delimiter==='('){if(!Array.isArray(value))return false;const parts=split(node.children);return parts.length===value.length&&parts.every((part,index)=>bindPattern(part,value[index],env));}
    if(node.type==='string'||node.type==='char'||node.type==='number'||['true','false'].includes(text))return equal(literal(text),value);
    if(text==='None')return value?.tag==='None';
    if(['Str','RawStr','Format','InlineAsm','Diagnostic','Char','Byte','ByteStr','RawByteStr','RawCStr','CStr'].includes(text))return value===text;
    if(node.type==='ident'){env.values.set(text,value);return true;}
  }
  const group=nodes.at(-1),path=nodes.slice(0,-1).map(word).filter(text=>text!=='::').join('::');
  if(group?.delimiter==='('){if(value?.tag!==path)return false;const parts=split(group.children);return parts.length===value.args.length&&parts.every((part,index)=>bindPattern(part,value.args[index],env));}
  if(group?.delimiter==='{'&&path==='Range'){
    if(!value||typeof value.start!=='number'||typeof value.end!=='number')return false;
    return split(group.children).every(part=>word(part[0])==='..'||bindPattern(part.length===1?part:part.slice(2),value[word(part[0])],env));
  }
  if(group?.delimiter==='{'){
    const fields=split(group.children),rest=fields.some(part=>word(part[0])==='..'),named=fields.filter(part=>word(part[0])!=='..');
    if(fields.some(part=>word(part[0])==='..'&&part.length!==1)||named.some(part=>!name(part[0])||part.length>1&&word(part[1])!==':'))fail('unresolved original record field pattern');
    const values=originalControlRecordPatternFields(value,env.functionOriginal,path.split('::'),named.map(part=>word(part[0])),rest);
    return named.every(part=>bindPattern(part.length===1?part:part.slice(2),values[word(part[0])],env));
  }
  if(nodes.length===3&&word(nodes[1])==='::'&&['ParseMode','Mode'].includes(word(nodes[0])))return value===word(nodes[2]);
  fail('unresolved original pattern '+nodes.map(node=>word(node)??node.delimiter).join(' '));
}
function bindOriginalAstPattern(pattern,value,env){
 if(pattern.k==='wild')return true;
 if(['strLit','boolLit','numLit'].includes(pattern.k))return equal(pattern.k==='numLit'?Number(pattern.value)*(pattern.negative?-1:1):pattern.value,value);
 if(pattern.k==='bind'||pattern.k==='bindOrCtor'){
  if(pattern.k==='bindOrCtor'&&pattern.name==='None')return value?.tag==='None';
  if(pattern.k==='bindOrCtor'&&/^[A-Z]/u.test(pattern.name))fail('unresolved original AST constructor '+pattern.name);
  env.values.set(pattern.name,value);return true;
 }
 if(pattern.k==='or'){for(const alternative of pattern.alternatives){const local=new Scope(env);if(bindOriginalAstPattern(alternative,value,local)){for(const [key,item]of local.values)env.values.set(key,item);return true;}}return false;}
 if(pattern.k==='routerTuplePattern')return Array.isArray(value)&&value.length===pattern.items.length&&pattern.items.every((part,index)=>bindOriginalAstPattern(part,value[index],env));
 if(pattern.k==='ctor'){if(value?.tag!==pattern.path.join('::')||value.args?.length!==pattern.args.length)return false;return pattern.args.every((part,index)=>bindOriginalAstPattern(part,value.args[index],env));}
 if(pattern.k==='routerRecordPattern'){const values=originalControlRecordPatternFields(value,env.functionOriginal,pattern.path,pattern.fields.map(field=>field.name),pattern.rest);return pattern.fields.every(field=>bindOriginalAstPattern(field.pattern,values[field.name],env));}
 fail('unresolved original AST pattern '+pattern.k);
}
class Exit {constructor(kind,value){this.kind=kind;this.value=value;}}
class Chars {
  constructor(text,at=0){this.text=text;this.at=at;}
  next(){if(this.at>=this.text.length)return variant('None');const ch=String.fromCodePoint(this.text.codePointAt(this.at));this.at+=ch.length;return variant('Some',ch);}
  clone(){return new Chars(this.text,this.at);}
  rest(){return this.text.slice(this.at);}
}
function compileFunctions(source,prefix){
  const result=new Map();
  function visit(nodes){for(let at=0;at<nodes.length;at++){
    if(word(nodes[at])==='fn'&&name(nodes[at+1])){
      const functionName=word(nodes[at+1]);let end=at+2;
      while(end<nodes.length&&nodes[end].delimiter!=='{'&&word(nodes[end])!==';')end++;
      if(nodes[end]?.delimiter==='{'){
        const signature=nodes.slice(at,end),parameterGroup=signature.find(node=>node.delimiter==='('),body=nodes[end];
        if(result.has(prefix+functionName)){result.set(prefix+functionName,{name:prefix+functionName,ir:null,refusal:'ambiguous enclosing source owner'});continue;}
        let ir,refusal=null;try{ir=new SourceControlParser(body.children,{cells:32000,expressions:0,conditionals:0}).block();}catch(error){refusal=error.message;}
        result.set(prefix+functionName,{name:prefix+functionName,parameters:split(parameterGroup.children),ir,refusal,span:{start:nodes[at].span.start,end:body.span.end},original:source.slice(nodes[at].span.start,body.span.end)});
      }
    }
    if(nodes[at].kind==='group'&&nodes[at].delimiter==='{')visit(nodes[at].children);
  }}
  visit(originalMacroTrees(source,{maxBytes:200000,maxTokens:32000}));return result;
}
function parserDefaultLayout(source){
  const nodes=originalMacroTrees(source),declaration=(kind,name)=>{
    const at=nodes.findIndex((node,index)=>word(node)===kind&&word(nodes[index+1])===name);if(at<0)fail('default source declaration absent');
    let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{')end++;
    const attributes=[];let start=at-1;if(word(nodes[start])==='pub')start--;
    while(nodes[start]?.delimiter==='['&&word(nodes[start-1])==='#'){attributes.push(nodes[start]);start-=2;}
    if(!attributes.some(attribute=>word(attribute.children[0])==='derive'&&attribute.children[1]?.children.some(node=>word(node)==='Default')))fail('original Default derive absent');
    return nodes[end];
  };
  const enumDefault=name=>{const body=declaration('enum',name),choices=[];for(let at=0;at<body.children.length;at++)if(word(body.children[at])==='#'&&body.children[at+1]?.delimiter==='['&&body.children[at+1].children.length===1&&word(body.children[at+1].children[0])==='default'&&nameToken(body.children[at+2])&&word(body.children[at+3])===',')choices.push(word(body.children[at+2]));if(choices.length!==1)fail('one original unit default variant required');return {kind:'unit-default',variant:choices[0],original:body};};
  const nameToken=node=>node?.type==='ident';
  const body=declaration('struct','FormatSpec'),fields=split(body.children).map(original=>{
    let nodes=original;while(word(nodes[0])==='#'&&nodes[1]?.delimiter==='['&&word(nodes[1].children[0])==='doc')nodes=nodes.slice(2);
    if(word(nodes[0])!=='pub'||!nameToken(nodes[1])||word(nodes[2])!==':')fail('original format default field');
    const type=nodes.slice(3),first=word(type[0]);let value;
    if(first==='Option')value={kind:'option-none'};
    else if(first==='bool'&&type.length===1)value={kind:'bool-false'};
    else if(first==='&'&&word(type.at(-1))==='str')value={kind:'empty-str'};
    else if(['Alignment','Count'].includes(first))value=enumDefault(first);
    else fail('unresolved original field Default');
    return {name:word(nodes[1]),value,original};
  });
  return {kind:'derived-default-parser-memory',fields,original:body};
}
class Machine {
  constructor(functions,defaultLayout,{constants=new Map(),methods=new WeakMap()}={}){this.functions=functions;this.defaultLayout=defaultLayout;this.constants=constants;this.methods=methods;this.remaining=200000;this.depth=0;this.trace=[];}
  tick(){if(--this.remaining<0)fail('execution budget exhausted');}
  call(name,args){
    this.tick();const fn=this.functions.get(name);if(!fn||!fn.ir)fail('unresolved original helper '+name+': '+(fn?.refusal??'absent'));
    if(++this.depth>64)fail('call depth budget exhausted');this.trace.push(name);
    const env=new Scope();env.functionOriginal=fn.original;
    try{
      if(fn.parameters.length!==args.length)fail('source helper arity '+name);
      fn.parameters.forEach((pattern,index)=>{if(!bindPattern(pattern,args[index],env))fail('source helper argument pattern '+name);});
      return this.block(fn.ir,env);
    }catch(error){if(error instanceof Exit&&error.kind==='return')return error.value;throw error;}finally{this.depth--;}
  }
  block(block,parent){const env=new Scope(parent);for(const statement of block.statements){this.tick();
    if(statement.kind==='let'){const value=this.eval(statement.initializer,env);if(!bindPattern(statement.pattern.tokens,value,env)){if(statement.otherwise)this.block(statement.otherwise,env);else fail('irrefutable let pattern');}}
    else if(statement.kind==='assign'){const value=this.eval(statement.value,env),target=statement.target,old=statement.operation==='='?null:this.eval(target,env),next=statement.operation==='='?value:this.binary(statement.operation.slice(0,-1),old,value);this.assign(target,next,env);}
    else this.eval(statement.value,env);
  }return block.tail?this.eval(block.tail,env):undefined;}
  assign(target,value,env){
    if(target.kind==='written-path'&&target.path.length===1){env.set(target.path[0],value);return;}
    if(target.kind==='field'){const object=this.eval(target.object,env);if(isOriginalControlRecord(object))fail('candidate original records are immutable; no mutation/borrow authority');object[target.name]=value;return;}
    if(target.kind==='unary'&&target.operation==='*'){this.assign(target.value,value,env);return;}
    fail('unresolved assignment place');
  }
  binary(op,a,b){
    switch(op){case '..':return {start:a??0,end:b??null};case '==':return equal(a,b);case '!=':return !equal(a,b);case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;case '|':return (a|b)>>>0;case '&':return (a&b)>>>0;case '<<':return (a<<b)>>>0;default:fail('unresolved operator '+op);}
  }
  condition(node,env){
    if(node.kind==='condition-let')return bindPattern(node.pattern.tokens,this.eval(node.value,env),env);
    if(node.kind==='binary'&&node.operation==='&&')return this.condition(node.left,env)&&this.condition(node.right,env);
    return this.eval(node,env);
  }
  eval(node,env){this.tick();if(!node)return null;
    const run=value=>this.eval(value,env);
    switch(node.kind){
      case 'literal':return literal(node.raw);
      case 'written-path':{const name=node.path.join('::');if(node.path.length===1&&env.has(name))return env.get(name);if(this.constants.has(name))return this.constants.get(name);if(name==='None')return variant('None');if(['Str','RawStr','Format','ParseMode::Format','Mode::Str','Mode::RawStr'].includes(name))return name.split('::').at(-1);return {sourcePath:name};}
      case 'parenthesized':return run(node.value);
      case 'tuple':case 'array':return node.items.map(run);
      case 'block-expression':return this.block(node.body,env);
      case 'record':return Object.fromEntries(node.fields.map(field=>[field.name,field.kind==='shorthand'?env.get(field.name):run(field.value)]));
      case 'field':{const object=run(node.object);if(object&&Object.hasOwn(object,node.name))return object[node.name];return {receiver:object,method:node.name};}
      case 'index':{const object=run(node.object),index=run(node.index);if(typeof index==='number')return object[index];const end=index.end??(typeof object==='string'?utf8(object):object.length);return typeof object==='string'?Buffer.from(object).subarray(index.start,end).toString('utf8'):object.slice(index.start,end);}
      case 'unary':{const value=run(node.value);return node.operation==='!'?!value:node.operation==='-'?-value:value;}
      case 'cast':{const value=run(node.value);if(['u8','u16','u32','usize'].includes(node.target))return typeof value==='string'?value.codePointAt(0):value;fail('unresolved cast '+node.target);}
      case 'binary':if(node.operation==='&&')return this.condition(node.left,env)&&this.condition(node.right,env);else if(node.operation==='||')return run(node.left)||run(node.right);else return this.binary(node.operation,run(node.left),run(node.right));
      case 'condition-let':return this.condition(node,env);
      case 'if':{const local=new Scope(env);return this.condition(node.condition,local)?this.block(node.then,local):node.otherwise?.kind==='if'?this.eval(node.otherwise,env):node.otherwise?this.block(node.otherwise,env):undefined;}
      case 'match':{const value=run(node.subject);for(const arm of node.arms){const local=new Scope(env);if(bindPattern(arm.pattern.tokens,value,local)&&(!arm.guard||this.condition(arm.guard,local)))return this.eval(arm.value,local);}fail('nonexhaustive source match');}
      case 'while':case 'loop':{while(true){this.tick();const local=new Scope(env);if(node.kind==='while'&&!this.condition(node.condition,local))break;try{this.block(node.body,local);}catch(error){if(error instanceof Exit&&error.kind==='continue')continue;if(error instanceof Exit&&error.kind==='break')return error.value;throw error;}}return undefined;}
      case 'return':case 'break':case 'continue':throw new Exit(node.kind,node.value?run(node.value):undefined);
      case 'closure':return (...args)=>{const local=new Scope(env);const parameters=split(node.parameterTokens);if(parameters.length!==args.length)fail('closure arity');parameters.forEach((pattern,index)=>{if(!bindPattern(pattern,args[index],local))fail('closure pattern');});return this.eval(node.body,local);};
      case 'try':{const value=run(node.value);if(value.tag==='Ok'||value.tag==='Some')return value.args[0];throw new Exit('return',value);}
      case 'opaque-macro':if(node.path.join('::')==='vec'&&node.arguments.children.length===0)return [];else fail('unresolved original macro '+node.path.join('::'));
      case 'call':{const callee=run(node.callee),args=node.arguments.map(run);if(typeof callee==='function')return callee(...args);if(callee?.sourcePath)return this.pathCall(callee.sourcePath,args);if(callee?.method)return this.method(callee.receiver,callee.method,args);fail('unresolved callee');}
      default:fail('unresolved control '+node.kind);
    }
  }
  pathCall(path,args){
    if(['Some','Ok','Err','ArgumentNamed','ArgumentIs','ArgumentImplicitlyIs','Piece::Lit','Piece::NextArgument'].includes(path))return variant(path,...args);
    if(path==='Box::new')return args[0];
    // This interpreter instantiates the unicode-only callback at char. The
    // source's numeric escape branch converts u8 to that same char payload.
    if(path==='T::from')return typeof args[0]==='number'?String.fromCodePoint(args[0]):args[0];
    if(path==='std::char::from_u32'){const value=args[0];return value<=0x10ffff&&!(value>=0xd800&&value<=0xdfff)?variant('Some',String.fromCodePoint(value)):variant('None');}
    if(path==='FormatSpec::default')return Object.fromEntries(this.defaultLayout.fields.map(field=>[field.name,field.value.kind==='option-none'?variant('None'):field.value.kind==='bool-false'?false:field.value.kind==='empty-str'?'':field.value.variant]));
    if(path==='rustc_lexer::is_id_start'||path==='rustc_lexer::is_id_continue'){
      if(utf8(args[0])!==1)fail('non-ASCII capture identifier');return this.call('lexer::'+path.split('::').at(-1),args);
    }
    if(path==='unicode_xid::UnicodeXID::is_xid_start'||path==='unicode_xid::UnicodeXID::is_xid_continue')return this.call('xid::'+path.split('::').at(-1),args);
    if(this.functions.has('escaper::'+path))return this.call('escaper::'+path,args);
    if(this.functions.has(path))return this.call(path,args);
    fail('unresolved original path '+path);
  }
  method(value,name,args){
    const original=this.methods.get(value)?.get(name);if(original){if(typeof original==='string')return this.call(original,[value,...args]);return original(...args);}
    if(value?.input_vec&&this.functions.has('parser::'+name))return this.call('parser::'+name,[value,...args]);
    if(['Str','RawStr'].includes(value)&&this.functions.has('escaper::'+name))return this.call('escaper::'+name,[value,...args]);
    if(name==='chars'&&typeof value==='string')return new Chars(value);
    if(name==='next'&&value instanceof Chars)return value.next();
    if(name==='as_str'&&value instanceof Chars)return value.rest();
    if(name==='clone')return value instanceof Chars?value.clone():structuredClone(value);
    if(name==='cloned'&&value?.tag)return value;
    if(name==='len')return typeof value==='string'?utf8(value):value.length;
    if(name==='len_utf8'&&typeof value==='string')return utf8(value);
    if(name==='is_ascii')return typeof value==='number'?value<=127:utf8(value)===1;
    if(name==='is_whitespace'&&typeof value==='string')return RUST_WHITESPACE_CODE_UNITS.includes(value.codePointAt(0));
    if(name==='to_digit'){const digit=parseInt(value,args[0]);return /^[0-9a-f]$/iu.test(value)&&Number.isInteger(digit)&&digit<args[0]?variant('Some',digit):variant('None');}
    if(name==='starts_with')return value.startsWith(args[0]);
    if(name==='push'){value.push(args[0]);return undefined;}
    if(name==='get')return args[0]<value.length?variant('Some',value[args[0]]):variant('None');
    if(name==='last')return value.length?variant('Some',value.at(-1)):variant('None');
    if(name==='is_empty')return value.length===0;
    if(name==='is_some')return value.tag==='Some';
    if(name==='then_some'&&typeof value==='boolean')return value?variant('Some',args[0]):variant('None');
    if(name==='is_some_and')return value.tag==='Some'&&args[0](value.args[0]);
    if(name==='ok_or')return value.tag==='Some'?variant('Ok',value.args[0]):variant('Err',args[0]);
    if(name==='unwrap_or')return value.tag==='Some'?value.args[0]:args[0];
    if(name==='unwrap_or_else')return value.tag==='Some'?value.args[0]:args[0]();
    if(name==='map_or')return value.tag==='Some'?args[1](value.args[0]):args[0];
    const apply=(fn,items)=>typeof fn==='function'?fn(...items):fn?.sourcePath?this.pathCall(fn.sourcePath,items):fail('unresolved primitive callback');
    if(name==='map'&&value?.tag)return ['Some','Ok'].includes(value.tag)?variant(value.tag,apply(args[0],[value.args[0]])):value;
    if(name==='iter'||name==='collect')return value;
    if(name==='map'&&Array.isArray(value))return value.map(item=>apply(args[0],[item]));
    if(name==='position'&&Array.isArray(value)){const index=value.findIndex(item=>apply(args[0],[item]));return index<0?variant('None'):variant('Some',index);}
    if(name==='char_indices'&&typeof value==='string'){let at=0;return Array.from(value,ch=>{const row=[at,ch];at+=utf8(ch);return row;});}
    if(name==='zip'&&Array.isArray(value))return value.slice(0,args[0].length).map((item,index)=>[item,args[0][index]]);
    if(name==='into')return value;
    if(name==='overflowing_mul'||name==='overflowing_add'){const n=name==='overflowing_mul'?value*args[0]:value+args[0];return [n%65536,n>65535];}
    fail('unresolved primitive helper '+name);
  }
}

function readDependencies(){
  const manifestBytes=readFileSync(new URL('manifest.json',root));
  if(hash(manifestBytes)!==PROFILE_DIGEST)fail('original helper profile changed');
  const manifest=JSON.parse(manifestBytes),sources={};
  for(const row of manifest.members){
    const bytes=readFileSync(new URL(row.archive,root));if(bytes.length!==row.archiveBytes||hash(bytes)!==row.archiveSha256)fail('full helper archive changed: '+row.path);
    const raw=gunzipSync(bytes,{maxOutputLength:200000});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('full helper source changed: '+row.path);
    sources[row.path]=new TextDecoder('utf-8',{fatal:true}).decode(raw);
  }
  for(const row of manifest.receipts){const bytes=readFileSync(new URL(row.path,root));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('retrieval receipt changed');}
  return sources;
}
function compileSources(sources,trusted){
  const functions=new Map();
  for(const [kind,source] of Object.entries(sources))for(const [name,fn] of compileFunctions(source,kind+'::'))functions.set(name,fn);
  const defaultLayout=parserDefaultLayout(sources.parser);
  const result=freezeMacroTree({schema:'original-format-template-control-v1',sources:Object.fromEntries(Object.entries(sources).map(([name,source])=>[name,{source,sha256:hash(source)}])),functions:[...functions.values()],defaultLayout,executableSubset:'direct-literal-ascii-named-display-captures',namespaceAuthority:false,traitSelectionVerified:false,runtimeParity:false});
  programs.set(result,{functions,defaultLayout,trusted});return result;
}
let originalProgram;
export function loadSourceFormatTemplateControl(){
  if(originalProgram)return originalProgram;
  const dependencies=readDependencies(),proof=loadPinnedFormatSourceStages();
  originalProgram=compileSources({parser:formatSourceStageInput(proof,'compiler/rustc_parse_format/src/lib.rs').source,escaper:dependencies['rustc-literal-escaper-0.0.2/src/lib.rs'],xid:dependencies['unicode-xid-0.2.6/src/lib.rs'],lexer:dependencies['compiler/rustc_lexer/src/lib.rs']},true);
  return originalProgram;
}
// Mutation experiments can execute their own control program. They cannot
// issue the private production identity accepted by checkedSourceFormatPieces.
export function compileFormatTemplateControlCandidate(sources){
  if(!sources||Object.keys(sources).sort().join(',')!=='escaper,lexer,parser,xid'||Object.values(sources).some(source=>typeof source!=='string'||utf8(source)>200000))fail('four bounded original source inputs required');
  return compileSources(sources,false);
}
export const isSourceFormatTemplateControl=value=>programs.has(value);
export function executeSourceFormatTemplate(program,raw,expected){
  const state=programs.get(program);if(!state)fail('copied or forged control program');
  if(typeof raw!=='string'||utf8(raw)>32768||typeof expected!=='string'||utf8(expected)>32768)fail('literal input budget');
  const machine=new Machine(state.functions,state.defaultLayout);let value='',style=variant('None'),ranges=[];
  const rawMatch=/^r(#{0,255})"([\s\S]*)"\1$/u.exec(raw);
  let contents,quoteOffset;
  if(rawMatch){contents=rawMatch[2];style=variant('Some',rawMatch[1].length);quoteOffset=rawMatch[1].length+2;}
  else if(raw.startsWith('"')&&raw.endsWith('"')){contents=raw.slice(1,-1);quoteOffset=1;}
  else fail('direct source string literal required');
  machine.call('escaper::unescape_unicode',[contents,rawMatch?'RawStr':'Str',(range,result)=>{
    if(result.tag!=='Ok')fail('original literal escaper error');value+=result.args[0];ranges.push({range:{start:range.start+quoteOffset,end:range.end+quoteOffset},character:result.args[0]});
  }]);
  if(value!==expected)fail('original literal decode differs from parser value');
  const parser=machine.call('parser::new',[value,style,variant('Some',raw),false,'Format']);
  if(!parser.is_source_literal)fail('original parser refused literal origin');
  const pieces=[];let loops=0;
  while(true){if(++loops>32769)fail('piece count budget');const next=machine.call('parser::next',[parser]);if(next.tag==='None')break;
    const piece=next.args[0];if(piece.tag==='Piece::Lit'){pieces.push({text:piece.args[0]});continue;}
    if(piece.tag!=='Piece::NextArgument')fail('unresolved original piece');
    const argument=piece.args[0];if(argument.position.tag!=='ArgumentNamed'||!argument.position.args[0]||argument.position.args[0]==='_')fail('ASCII named captures required');
    const name=argument.position.args[0];if(Array.from(name).some(character=>utf8(character)!==1))fail('non-ASCII capture identifier');
    if(argument.format.ty!==''||argument.format.fill.tag!=='None'||argument.format.width!=='CountImplied'||argument.format.precision!=='CountImplied')fail('format specification remains outside bounded control');
    pieces.push({captureName:name,positionSpan:argument.position_span,placeholderSpan:parser.arg_places.at(-1),spec:''});
  }
  if(parser.errors.length)fail('original parser error');
  const result=freezeMacroTree({schema:'executed-source-format-template-v1',raw,value,pieces,originRanges:ranges,argPlaces:parser.arg_places,lineSpans:parser.line_spans,trace:machine.trace,namespaceAuthority:false,traitSelectionVerified:false,runtimeParity:false});
  executions.set(result,{program,trusted:state.trusted});return result;
}
export function executeSourceFormatConstructorTemplate(program,candidate,expected){
  if(!isSourceLiteralFormatConstructorCandidate(candidate))fail('copied or forged literal constructor candidate');
  return executeSourceFormatTemplate(program,candidate.templateToken.text,expected);
}
export function checkedSourceFormatPieces(execution,resolve,baseSpan){
  const state=executions.get(execution);if(!state?.trusted||typeof resolve!=='function'||!Number.isSafeInteger(baseSpan?.start))fail('genuine executed original production template required');
  const offset=byte=>baseSpan.start+Buffer.from(execution.raw).subarray(0,byte).toString('utf8').length;
  return execution.pieces.map(piece=>Object.hasOwn(piece,'text')?{text:piece.text}:{capture:{name:piece.captureName,path:resolve(piece.captureName)},spec:'',literalBytePositionSpan:piece.positionSpan,sourcePosition:{span:{start:offset(piece.positionSpan.start),end:offset(piece.positionSpan.end)}},sourcePlaceholder:{span:{start:offset(piece.placeholderSpan.start),end:offset(piece.placeholderSpan.end)}}});
}

// Separate entry point: keep the established capture-only receipt byte for
// byte unchanged. These positions come from the same original Parser helpers;
// association with genuine caller ASTs is a separate consumer obligation.
const argumentExecutions=new WeakMap();
export function executeSourceFormatArgumentTemplate(program,raw,expected){
  const state=programs.get(program);if(!state)fail('copied or forged control program');
  if(typeof raw!=='string'||utf8(raw)>32768||typeof expected!=='string'||utf8(expected)>32768)fail('literal input budget');
  const machine=new Machine(state.functions,state.defaultLayout);let value='',style=variant('None');const ranges=[];
  const rawMatch=/^r(#{0,255})"([\s\S]*)"\1$/u.exec(raw);
  let contents,quoteOffset;
  if(rawMatch){contents=rawMatch[2];style=variant('Some',rawMatch[1].length);quoteOffset=rawMatch[1].length+2;}
  else if(raw.startsWith('"')&&raw.endsWith('"')){contents=raw.slice(1,-1);quoteOffset=1;}
  else fail('direct source string literal required');
  machine.call('escaper::unescape_unicode',[contents,rawMatch?'RawStr':'Str',(range,result)=>{
    if(result.tag!=='Ok')fail('original literal escaper error');value+=result.args[0];ranges.push({range:{start:range.start+quoteOffset,end:range.end+quoteOffset},character:result.args[0]});
  }]);
  if(value!==expected)fail('original literal decode differs from parser value');
  const parser=machine.call('parser::new',[value,style,variant('Some',raw),false,'Format']);
  if(!parser.is_source_literal)fail('original parser refused literal origin');
  const pieces=[];let loops=0;
  while(true){if(++loops>32769)fail('piece count budget');const next=machine.call('parser::next',[parser]);if(next.tag==='None')break;
    const piece=next.args[0];if(piece.tag==='Piece::Lit'){pieces.push({text:piece.args[0]});continue;}
    if(piece.tag!=='Piece::NextArgument')fail('unresolved original piece');
    const argument=piece.args[0],position=argument.position;
    if(position.tag==='ArgumentNamed'){
      const name=position.args[0];if(!name||name==='_'||Array.from(name).some(character=>utf8(character)!==1))fail('ASCII argument identifier required');
    }else if(!['ArgumentIs','ArgumentImplicitlyIs'].includes(position.tag)||!Number.isSafeInteger(position.args[0])||position.args[0]<0)fail('unresolved original argument position');
    if(argument.format.ty!==''||argument.format.fill.tag!=='None'||argument.format.width!=='CountImplied'||argument.format.precision!=='CountImplied')fail('format specification remains outside bounded control');
    pieces.push({position,positionSpan:argument.position_span,placeholderSpan:parser.arg_places.at(-1),spec:''});
  }
  if(parser.errors.length)fail('original parser error');
  const result=freezeMacroTree({schema:'executed-source-format-argument-template-v1',raw,value,pieces,originRanges:ranges,argPlaces:parser.arg_places,lineSpans:parser.line_spans,trace:machine.trace,argumentAstAssociationVerified:false,namespaceAuthority:false,traitSelectionVerified:false,runtimeParity:false});
  argumentExecutions.set(result,{program,trusted:state.trusted});return result;
}
export function originalSourceFormatArgumentTemplate(execution){
  if(!argumentExecutions.get(execution)?.trusted)fail('genuine original argument template execution required');
  return execution;
}

// Generic control candidates carry no source namespace or execution authority.
// A higher consumer must independently select complete original declarations.
export function compileFormatSourceControlBodies(sources){
  if(!sources||typeof sources!=='object'||Object.keys(sources).length>16)fail('bounded source helper map required');
  const functions=new Map();
  for(const [key,source] of Object.entries(sources)){
    if(typeof source!=='string'||utf8(source)>200000)fail('complete source helper budget');
    const parsed=compileFunctions(source,key+'::');if(parsed.size!==1)fail('one complete original helper per source entry');const fn=[...parsed.values()][0];functions.set(key,fn);
  }
  const result=freezeMacroTree({schema:'format-source-control-body-candidates-v1',sources,functions:[...functions].map(([key,fn])=>({key,...fn})),namespaceAuthority:false,traitSelectionVerified:false,runtimeParity:false});bodyPrograms.set(result,{functions});return result;
}
export function formatSourceControlBodyFacts(program){const state=bodyPrograms.get(program);if(!state)fail('copied or forged source body program');return program.functions;}
export async function compileFormatSourceControlBodiesWithOriginalMacros(sources){
  const original=compileFormatSourceControlBodies(sources),state=bodyPrograms.get(original),functions=new Map(),expansions=[];
  // Loading the Host AST adapter only while compiling avoids a module-load
  // dependency cycle through the real production Host/parser composition.
  const {expandOriginalControlDeclarative,originalControlDeclarativeFacts,originalControlDeclarativeSlot}=await import('./source-control-declarative.mjs');
  for(const [key,fn]of state.functions){
    if(!fn.ir)fail('complete original macro helper grammar: '+fn.refusal);
    const rewrite=node=>{
      if(!node||typeof node!=='object')return node;
      if(node.kind==='opaque-macro'){
        const proof=expandOriginalControlDeclarative(sources[key],node),facts=originalControlDeclarativeFacts(proof,sources[key],node),slots=new WeakMap();expansions.push(proof);
        const register=tree=>{if(tree.kind==='original-control-ast-slot'){const slot=originalControlDeclarativeSlot(proof,sources[key],node,tree);slots.set(tree,slot);if(slot.fragment==='pat')originalPatternSlots.set(tree,slot.ast);}if(tree.kind==='group')tree.children.forEach(register);};facts.trees.forEach(register);
        const parser=new SourceControlParser(facts.trees,{cells:32000,expressions:0,conditionals:0},0,slots);return parser.expressionAll(facts.trees);
      }
      if(Array.isArray(node))return node.map(rewrite);
      return Object.fromEntries(Object.entries(node).map(([name,value])=>[name,rewrite(value)]));
    };
    functions.set(key,{...fn,ir:rewrite(fn.ir)});
  }
  const result=freezeMacroTree({schema:'format-original-expanded-control-body-candidates-v1',sources,functions:[...functions].map(([key,fn])=>({key,...fn})),expansions,macroOwnerResolved:false,namespaceAuthority:false,typeAuthority:false,traitSelectionVerified:false,applicationEffectCompleteness:false,runtimeParity:false});bodyPrograms.set(result,{functions});return result;
}
export function executeFormatSourceControlBodies(program,entry,args,{constants=new Map(),methods=new WeakMap()}={}){
  const state=bodyPrograms.get(program);if(!state)fail('copied or forged source body program');
  const machine=new Machine(state.functions,null,{constants,methods}),result=machine.call(entry,args);
  return {result,trace:machine.trace};
}
export function evaluateFormatSourceScalarExpression(source){
  if(typeof source!=='string'||utf8(source)>1024)fail('bounded original scalar expression required');
  const nodes=originalMacroTrees(source),parser=new SourceControlParser(nodes,{cells:1024,expressions:0,conditionals:0}),ir=parser.expressionAll(nodes),machine=new Machine(new Map(),null),result=machine.eval(ir,new Scope());
  if(!Number.isInteger(result)||result<0||result>0xffffffff)fail('original scalar expression is outside u32');
  return {source,ir,result,namespaceAuthority:false};
}

// This region stays in the existing realm. Source/canonical inputs are DATA;
// only the private caller's fresh native/source transaction may issue proof.
function asciiRegionOperations(dependencies){
  dependencies.assertParser();
  const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf;
  const allowed=['constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString'];
  const names=keys(Object.prototype);if(names.length!==allowed.length)fail('ASCII region requires closed native Object prototype');
  for(let at=0;at<names.length;at++)if(!allowed.includes(names[at]))fail('ASCII region has an inherited callback field');
  const field=descriptor(globalThis,'parseInt');
  if(!field||!own(field,'value')||typeof field.value!=='function'||dependencies.isProxy(field.value)||prototype(field.value)!==Function.prototype||dependencies.nativeSource(field.value)!=='function parseInt() { [native code] }')fail('ASCII region requires native own parseInt');
  return {descriptor,own,keys,prototype,parse:JSON.parse,stringify:JSON.stringify,freeze:Object.freeze,isArray:Array.isArray,
    isProxy:dependencies.isProxy,parseIntField:field,
    finish(){dependencies.assertParser();const now=descriptor(globalThis,'parseInt');if(!now||!own(now,'value')||now.value!==field.value||now.writable!==field.writable||now.enumerable!==field.enumerable||now.configurable!==field.configurable)fail('ASCII region parseInt changed');const after=keys(Object.prototype);if(after.length!==names.length)fail('ASCII region inherited fields changed');for(let at=0;at<after.length;at++)if(after[at]!==names[at])fail('ASCII region inherited field order changed');}};
}
function asciiRegionRecord(value,names,ops,label){
  if(!value||typeof value!=='object'||ops.isProxy(value)||ops.isArray(value)||![Object.prototype,null].includes(ops.prototype(value)))fail(label+' requires ordinary own data');
  const found=ops.keys(value);if(found.length!==names.length)fail(label+' fields differ');
  const result={};for(let at=0;at<names.length;at++){const key=names[at];if(found[at]!==key)fail(label+' field order differs');const field=ops.descriptor(value,key);if(!field||!ops.own(field,'value')||!field.enumerable)fail(label+' contains an accessor');Object.defineProperty(result,key,{value:field.value,enumerable:true});}return result;
}
function asciiRegionArray(value,limit,ops,label){
  if(!ops.isArray(value)||ops.isProxy(value)||ops.prototype(value)!==Array.prototype)fail(label+' requires a native dense array');
  const length=ops.descriptor(value,'length');if(!length||!ops.own(length,'value')||typeof length.value!=='number'||length.value<0||length.value%1||length.value>limit)fail(label+' array bound');
  const keys=ops.keys(value);if(keys.length!==length.value+1||keys[keys.length-1]!=='length')fail(label+' dense fields differ');
  for(let at=0;at<length.value;at++){if(keys[at]!==''+at)fail(label+' dense index differs');const field=ops.descriptor(value,''+at);if(!field||!ops.own(field,'value')||!field.enumerable)fail(label+' array accessor');}return value;
}
function asciiCanonicalPreflight(source){
  if(typeof source!=='string'||source.length>33554432)fail('ASCII canonical primitive length bound');
  let depth=0,arrays=0,cells=0,strings=0;
  for(let at=0;at<source.length;at++){const unit=source[at];
    if(unit==='"'){if(++strings>600100)fail('ASCII canonical string-count bound');for(at++;at<source.length;at++){if(source[at]==='\\')at++;else if(source[at]==='"')break;}if(at>=source.length)fail('ASCII canonical unclosed string');}
    else if(unit==='['||unit==='{'){if(++depth>4)fail('ASCII canonical nesting bound');if(unit==='['&&++arrays>400016)fail('ASCII canonical array-count bound');}
    else if(unit===']'||unit==='}'){if(--depth<0)fail('ASCII canonical delimiters');}
    else if((unit===','||unit===':')&&++cells>2000100)fail('ASCII canonical cell bound');
  }if(depth!==0)fail('ASCII canonical delimiters');
}
function asciiCanonicalDocument(source,canonical,ops){
  if(typeof source!=='string'||source.length>200000)fail('bounded actual lexical source required');asciiCanonicalPreflight(canonical);
  const parsed=ops.parse(canonical),doc=asciiRegionRecord(parsed,['schema','representationLevel','language','source','sourceEncoding','status','nodes','diagnostics','authority'],ops,'ASCII native CST');
  if(doc.schema!=='meta-language-concrete-syntax-v1'||doc.representationLevel!=='concrete-syntax'||doc.language!=='Rust'||doc.source!==source||doc.status!=='lexical')fail('ASCII native CST complete source differs');
  const encoding=asciiRegionRecord(doc.sourceEncoding,['utf16CodeUnits','utf8Bytes','wellFormedUnicode','utf8BytePreservation','utf8Mapping'],ops,'ASCII CST encoding');
  const authority=asciiRegionRecord(doc.authority,['type','owner','executable'],ops,'ASCII CST data level');if(authority.type!==false||authority.owner!==false||authority.executable!==false)fail('ASCII CST cannot grant authority');
  const offsets=[0];let bytes=0;for(let at=0;at<source.length;at++){let unit=source.charCodeAt(at);if(unit>=55296&&unit<=56319){const next=source.charCodeAt(at+1);if(!(next>=56320&&next<=57343))fail('ASCII source unpaired surrogate');offsets.push(-1);at++;bytes+=4;}else{if(unit>=56320&&unit<=57343)fail('ASCII source unpaired surrogate');bytes+=unit<128?1:unit<2048?2:3;}offsets.push(bytes);}
  if(bytes>200000||encoding.utf16CodeUnits!==source.length||encoding.utf8Bytes!==bytes||encoding.wellFormedUnicode!==true||encoding.utf8BytePreservation!==true||encoding.utf8Mapping!=='unicode-scalar-boundaries')fail('ASCII CST full UTF8 mapping differs');
  const nodes=asciiRegionArray(doc.nodes,200000,ops,'ASCII CST nodes'),diagnostics=asciiRegionArray(doc.diagnostics,200000,ops,'ASCII CST diagnostics');if(!nodes.length||diagnostics.length)fail('ASCII CST requires full lexical partition');
  const containers=[0],children=new Map(),stack=[0];children.set(0,[]);let cursor=0;
  for(let at=0;at<nodes.length;at++){
    const node=asciiRegionArray(nodes[at],7,ops,'ASCII CST node');if(node.length!==7)fail('ASCII CST node fields differ');
    for(let field=2;field<=5;field++)if(typeof node[field]!=='number'||node[field]<0||node[field]%1||node[field]>8388608)fail('ASCII CST finite coordinates required');
    if(node[2]>node[3]||node[3]>source.length||offsets[node[2]]<0||offsets[node[3]]<0||node[4]!==offsets[node[2]]||node[5]!==offsets[node[3]])fail('ASCII CST complete coordinates differ');
    if(at===0){if(node[0]!=='root'||node[1]!=='file'||node[2]!==0||node[3]!==source.length||node[6]!==-1)fail('ASCII CST root differs');continue;}
    if(typeof node[6]!=='number'||node[6]%1||node[6]<0||node[6]>=at||node[6]!==stack[stack.length-1])fail('ASCII CST complete parent differs');
    if(node[0]==='group'){
      if(!['brace','paren','bracket'].includes(node[1])||node[2]!==cursor||stack.length>=256)fail('ASCII CST group differs');children.get(node[6]).push(at);children.set(at,[]);containers.push(at);stack.push(at);continue;
    }
    if(!['token','trivia'].includes(node[0])||!['identifier','macro','number','string','template','regex','char','punct','comment','bom','whitespace','delimiter'].includes(node[1])||node[2]!==cursor||node[3]<=cursor)fail('ASCII CST complete leaf partition differs');
    const spelling=source.slice(node[2],node[3]);cursor=node[3];
    if(node[1]==='delimiter'){
      const group=nodes[stack[stack.length-1]],open=group[1]==='brace'?'{':group[1]==='paren'?'(':'[',close=open==='{'?'}':open==='('?')':']';
      if(node[2]===group[2]){if(spelling!==open)fail('ASCII CST opening delimiter differs');}
      else{if(spelling!==close||node[3]!==group[3])fail('ASCII CST closing delimiter differs');stack.pop();}
    }else if(node[0]==='token')children.get(node[6]).push(at);
  }
  if(cursor!==source.length||stack.length!==1||ops.stringify(parsed)!==canonical)fail('ASCII CST full canonical/source equation differs');
  return {source,canonical,document:parsed,nodes,children,containers};
}
function asciiProjectFunctions(packet,prefix,ops){
  const {source,nodes,children,containers}=packet,selected=[],wanted=prefix==='lexer::'?['is_id_start','is_id_continue']:['is_xid_start','is_xid_continue'];
  const raw=id=>source.slice(nodes[id][2],nodes[id][3]);
  function project(id){const row=nodes[id],span={start:row[2],end:row[3]};
    if(row[0]==='group'){
      if(row[1]!=='paren')fail('ASCII predicate has an unsupported nested group');const nested=[],list=children.get(id);for(let at=0;at<list.length;at++)nested.push(project(list[at]));return {kind:'group',delimiter:'(',children:nested,span};
    }
    const spelling=raw(id);let type=row[1]==='identifier'?'ident':row[1];
    // The native Rust CST keeps written characters in its string class. Refine
    // only this independent control projection; original nodes/spans stay exact.
    if(type==='string'&&spelling[0]==="'")type='char';
    if(type==='ident'){
      if(!['c','self','char','true','false','unicode_xid','UnicodeXID','is_xid_start','is_xid_continue','derived_property','XID_Start','XID_Continue'].includes(spelling))fail('ASCII predicate identifier requires another rule');
    }else if(type==='char'){
      if(!(spelling.length===3&&spelling[0]==="'"&&spelling[2]==="'"&&spelling.charCodeAt(1)<=127&&spelling[1]!=="'"&&spelling[1]!=='\\'&&spelling[1]!=='\n'&&spelling[1]!=='\r'&&spelling[1]!=='\t')&&spelling!=="'\\x7f'")fail('ASCII predicate char requires another rule');
    }else if(type!=='punct'||!['::',':','==','<','<=','>','>=','&&','||',','].includes(spelling))fail('ASCII predicate token requires another rule');
    return {kind:'token',type,text:spelling,span};
  }
  for(let ci=0;ci<containers.length;ci++){
    const list=children.get(containers[ci]);for(let at=0;at+5<list.length;at++){
      if(raw(list[at])!=='fn'||!wanted.includes(raw(list[at+1])))continue;
      const parameter=nodes[list[at+2]],arrow=raw(list[at+3]),output=raw(list[at+4]),body=nodes[list[at+5]];
      if(parameter[0]!=='group'||parameter[1]!=='paren'||arrow!=='->'||output!=='bool'||body[0]!=='group'||body[1]!=='brace')continue;
      const name=raw(list[at+1]);if(selected.some(row=>row.name===prefix+name))fail('ASCII predicate definition is not unique');
      if(prefix==='lexer::'){if(containers[ci]!==0)fail('actual root lexer function required');}
      else{const container=containers[ci],root=children.get(0);let header=-1;for(let hi=0;hi<root.length;hi++)if(root[hi]===container)header=hi;if(container===0||nodes[container][6]!==0||header<4||raw(root[header-4])!=='impl'||raw(root[header-3])!=='UnicodeXID'||raw(root[header-2])!=='for'||raw(root[header-1])!=='char')fail('actual UnicodeXID for char implementation required');}
      const parameters=[],parameterIds=children.get(list[at+2]);for(let pi=0;pi<parameterIds.length;pi++)parameters.push(project(parameterIds[pi]));
      if(prefix==='lexer::'?(parameters.length!==3||word(parameters[0])!=='c'||word(parameters[1])!==':'||word(parameters[2])!=='char'):(parameters.length!==1||word(parameters[0])!=='self'))fail('ASCII predicate parameter contract differs');
      const bodyTokens=[],bodyIds=children.get(list[at+5]);for(let bi=0;bi<bodyIds.length;bi++)bodyTokens.push(project(bodyIds[bi]));
      const parser=new SourceControlParser(bodyTokens,{cells:32000,expressions:0,conditionals:0}),ir=parser.block();if(parser.at!==parser.nodes.length)fail('ASCII predicate did not consume its full body');
      selected.push({name:prefix+name,parameters:split(parameters),ir,refusal:null,span:{start:nodes[list[at]][2],end:body[3]},original:source.slice(nodes[list[at]][2],body[3])});
    }
  }
  if(selected.length!==2)fail('ASCII predicate actual complete definitions missing');return selected;
}
function asciiFiniteIr(fn){
  if(fn.ir.kind!=='control-block'||fn.ir.statements.length!==0||!fn.ir.tail||fn.parameters.length!==1)fail('ASCII predicate requires a tail-only body');
  const argument=fn.name.slice(0,7)==='lexer::'?'c':'self';let cells=0;
  function visit(node,depth){if(++cells>32000||depth>64)fail('ASCII predicate IR bound');
    if(node.kind==='literal'){if(!['char','bool'].includes(node.sourceLiteralKind))fail('ASCII predicate literal kind');return node.sourceLiteralKind;}
    if(node.kind==='parenthesized')return visit(node.value,depth+1);
    if(node.kind==='written-path'){const spelling=node.path.join('::');if(![argument,'unicode_xid::UnicodeXID::is_xid_start','unicode_xid::UnicodeXID::is_xid_continue','derived_property::XID_Start','derived_property::XID_Continue'].includes(spelling))fail('ASCII predicate written path');return spelling===argument?'char':'callee';}
    if(node.kind==='binary'){if(!['==','<','<=','>','>=','&&','||'].includes(node.operation))fail('ASCII predicate binary operator');const left=visit(node.left,depth+1),right=visit(node.right,depth+1),expected=node.operation==='&&'||node.operation==='||'?'bool':'char';if(left!==expected||right!==expected)fail('ASCII predicate primitive operand domains');return 'bool';}
    if(node.kind==='call'){
      const path=node.callee?.kind==='written-path'?node.callee.path.join('::'):null;
      if(!['unicode_xid::UnicodeXID::is_xid_start','unicode_xid::UnicodeXID::is_xid_continue','derived_property::XID_Start','derived_property::XID_Continue'].includes(path)||node.arguments.length!==1||node.arguments[0].kind!=='written-path'||node.arguments[0].path.length!==1||node.arguments[0].path[0]!==argument)fail('ASCII predicate direct call contract');if(visit(node.callee,depth+1)!=='callee'||visit(node.arguments[0],depth+1)!=='char')fail('ASCII predicate primitive call domains');return 'bool';
    }fail('ASCII predicate IR requires another rule');
  }if(visit(fn.ir.tail,0)!=='bool')fail('ASCII predicate bool return domain');
}
function asciiFreezeData(value,ops,seen=new WeakSet(),depth=0,budget={cells:16777216}){
  if(--budget.cells<0||depth>256)fail('ASCII private data freeze bound');
  if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean'||value===undefined)return value;
  if(typeof value!=='object'||ops.isProxy(value))fail('ASCII region cannot expose executable data');if(seen.has(value))return value;
  const array=ops.isArray(value),parent=ops.prototype(value);if(parent!==(array?Array.prototype:Object.prototype)&&parent!==null)fail('ASCII region cannot expose class/collection storage');seen.add(value);
  const names=ops.keys(value);for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string')fail('ASCII region cannot expose symbols');if(array&&key==='length')continue;const field=ops.descriptor(value,key);if(!field||!ops.own(field,'value')||!field.enumerable)fail('ASCII region cannot expose an accessor');asciiFreezeData(field.value,ops,seen,depth+1,budget);}return ops.freeze(value);
}
/** Pure DATA execution; the private caller separately proves fresh native/source joins. */
function asciiExecuteFreshPredicates(input,dependencies){
  const ops=asciiRegionOperations(dependencies),row=asciiRegionRecord(input,['lexer','xid'],ops,'ASCII concrete source input'),packets=[],functions=new Map();
  for(let at=0;at<2;at++){
    const source=asciiRegionRecord(row[at===0?'lexer':'xid'],['source','canonical'],ops,'ASCII concrete source pair'),packet=asciiCanonicalDocument(source.source,source.canonical,ops);packets.push(packet);
    const selected=asciiProjectFunctions(packet,at===0?'lexer::':'xid::',ops);for(let fi=0;fi<selected.length;fi++){const fn=selected[fi];asciiFiniteIr(fn);asciiFreezeData(fn,ops);functions.set(fn.name,fn);}
  }
  const machine=new Machine(functions,null),characters=[],alphabet="\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u007f";
  for(let code=0;code<128;code++){const character=alphabet[code],start=machine.call('lexer::is_id_start',[character]),continued=machine.call('lexer::is_id_continue',[character]);if(typeof start!=='boolean'||typeof continued!=='boolean')fail('actual ASCII lexical predicate boolean required');characters.push({code,character,start,continue:continued});}
  const result=asciiFreezeData({schema:'fresh-source-ascii-identifier-predicates-v1',sources:{lexer:{source:packets[0].source,canonical:packets[0].canonical},xid:{source:packets[1].source,canonical:packets[1].canonical}},characters,trace:machine.trace,sourceDataOnly:true,namespaceAuthority:false,runtimeAuthority:false},ops);
  for(let at=0;at<packets.length;at++){const packet=packets[at];asciiFreezeData(packet.document,ops);for(let ci=0;ci<packet.containers.length;ci++)asciiFreezeData(packet.children.get(packet.containers[ci]),ops);packet.children.clear();packet.children=null;asciiFreezeData(packet.containers,ops);ops.freeze(packet);}
  functions.clear();machine.constants.clear();machine.functions=null;machine.constants=null;machine.methods=null;ops.freeze(machine);ops.finish();return result;
}
// Only genuine fixed modules/native references are captured. This closure
// retains no source, canonical, IR, program, table, proof or verdict across calls.
export async function createFreshSourceAsciiIdentifierPredicateExecutor(){
  const parser=await import('./private-parser-execution.mjs'),intrinsics=await import('./original-json-intrinsics.mjs'),util=await import('node:util');
  parser.assertPrivateParserExecution();
  const dependencies=Object.freeze({assertParser:parser.assertPrivateParserExecution,nativeSource:intrinsics.originalCapturedFunctionSource,isProxy:util.types.isProxy});
  asciiRegionOperations(dependencies);
  return input=>asciiExecuteFreshPredicates(input,dependencies);
}
// Fresh native transport precedes the synchronous region. This public wrapper
// returns DATA even for modified original source; it is never a private issuer.
export async function executeFreshSourceAsciiIdentifierPredicates(sources){
  const native=await import('./concrete-syntax-meta.mjs'),util=await import('node:util'),parser=await import('./private-parser-execution.mjs'),execute=await createFreshSourceAsciiIdentifierPredicateExecutor();
  const parserCurrent=parser.assertPrivateParserExecution;parserCurrent();
  if(!sources||typeof sources!=='object'||util.types.isProxy(sources))fail('ordinary lexical source input required');
  // Entry qualification already ran in the no-argument factory. Capture current
  // descriptors here; actual execution independently qualifies the full region.
  const keys=Reflect.ownKeys(sources??{});
  if(!sources||typeof sources!=='object'||keys.length!==2||!keys.includes('lexer')||!keys.includes('xid'))fail('two lexical sources required');
  const fields=[Object.getOwnPropertyDescriptor(sources,'lexer'),Object.getOwnPropertyDescriptor(sources,'xid')],parent=Object.getPrototypeOf(sources);
  if(![Object.prototype,null].includes(parent))fail('ordinary lexical source input required');
  for(let at=0;at<2;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='string'||field.value.length>200000)fail('bounded primitive own lexical sources required');}
  const row={lexer:fields[0].value,xid:fields[1].value};
  function current(){parserCurrent();const nowKeys=Reflect.ownKeys(sources);if(Object.getPrototypeOf(sources)!==parent||nowKeys.length!==2||!nowKeys.includes('lexer')||!nowKeys.includes('xid'))fail('lexical source input changed');for(let at=0;at<2;at++){const now=Object.getOwnPropertyDescriptor(sources,at===0?'lexer':'xid'),old=fields[at];if(!now||!Object.hasOwn(now,'value')||now.value!==old.value||now.enumerable!==old.enumerable||now.configurable!==old.configurable||now.writable!==old.writable)fail('lexical source descriptor changed');}}
  current();
  const first=native.transportConcreteSyntaxSources([{source:row.lexer,language:'Rust'},{source:row.xid,language:'Rust'}]);current();
  const second=native.transportConcreteSyntaxMetaChunks([first.rows.map(item=>item.meta)]);current();
  if(second.chunks.length!==1||second.chunks[0].rows.length!==2)fail('full fresh native predicate source transaction differs');
  for(let at=0;at<2;at++)if(second.chunks[0].rows[at].meta!==first.rows[at].meta||second.chunks[0].rows[at].source!==(at===0?row.lexer:row.xid))fail('full fresh native predicate source differs');
  const result=execute({lexer:{source:row.lexer,canonical:second.chunks[0].rows[0].meta},xid:{source:row.xid,canonical:second.chunks[0].rows[1].meta}});current();return result;
}
