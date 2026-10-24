// Canonical owned-emitter syntax observations are DATA, never checked IR.
// Complete fresh checked-JS-to-Rust reproduction is required by the consumer.
import {rustTokens} from '../rust-structure.mjs';
export class UnsupportedOwnedRustSource extends TypeError {
 constructor(message){super('Canonical owned Rust source: '+message);this.name='UnsupportedOwnedRustSource';}
}
const fail=message=>{throw new UnsupportedOwnedRustSource(message);};
export function ownedRustString(text){
 if(typeof text!=='string'||text[0]!=='"'||text.at(-1)!=='"')fail('ordinary emitted Rust string required');let output='';
 for(let index=1;index<text.length-1;index++){
  let character=text[index];if(character==='\\'){
   character=text[++index];const simple={n:'\n',r:'\r',t:'\t','0':'\0','\\':'\\','"':'"'};
   if(Object.hasOwn(simple,character))output+=simple[character];
   else if(character==='u'&&text[++index]==='{'){
    const end=text.indexOf('}',index+1),digits=text.slice(index+1,end);if(end<0||! /^[0-9a-fA-F]{1,6}$/u.test(digits))fail('canonical Unicode scalar escape required');const value=Number.parseInt(digits,16);if(value>0x10ffff||value>=0xd800&&value<=0xdfff)fail('Rust string contains a non-scalar value');output+=String.fromCodePoint(value);index=end;
   }else fail('string escape is outside the emitted Rust form');
  }else output+=character;
 }
 if(/\p{Surrogate}/u.test(output))fail('Rust string must contain Unicode scalar values');return output;
}
const PRECEDENCE=new Map([['||',1],['&&',2],['==',3],['!=',3],['<',4],['<=',4],['>',4],['>=',4]]);
export class OwnedRustReader {
 constructor(tokens){if(!Array.isArray(tokens)||tokens.length>200000)fail('bounded complete Rust tokens required');this.tokens=tokens.filter(token=>token.type!=='comment');this.index=0;this.cells=0;}
 peek(ahead=0){return this.tokens[this.index+ahead]??{text:'',type:'end'};}
 is(text,ahead=0){return this.peek(ahead).text===text&&this.peek(ahead).type!=='string';}
 next(){const value=this.peek();if(value.type==='end')fail('unexpected end of complete Rust source');this.index++;return value;}
 eat(text){if(!this.is(text))return false;this.index++;return true;}
 expect(text){if(!this.eat(text))fail('expected '+text+' in complete owned Rust source');}
 tick(depth){if(++this.cells>100000||depth>160)fail('original owned source node/depth bound exceeded');}
 identifier(){const node=this.next();if(node.type!=='ident'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text))fail('ordinary original Rust identifier required');return node.text;}
 path(){let value=this.eat('::')?'::':'';const first=this.next();if(first.type!=='ident')fail('ordinary Rust path required');value+=first.text;while(this.eat('::'))value+='::'+this.next().text;return value;}
 group(open,close){this.expect(open);const result=[],stack=[close],pairs={'(':')','[':']','{':'}'};while(stack.length){const token=this.next();if(token.type==='punct'){if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)&&stack.pop()!==token.text)fail('complete Rust delimiters differ');}if(stack.length)result.push(token);}return result;}
 skipGuard(){
  const start=this.index;let stack=[],pairs={'(':')','[':']','{':'}'},sawBrace=false;
  while(this.peek().type!=='end'){
   const token=this.next();if(token.type==='punct'){
    if(pairs[token.text]){if(token.text==='{')sawBrace=true;stack.push(pairs[token.text]);}
    else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)fail('guard delimiters differ');if(sawBrace&&stack.length===0)return;}
    else if(token.text===';'&&!stack.length)return;
   }
   if(this.index-start>200000)fail('guard source token budget exceeded');
  }fail('complete runtime guard statement required');
 }
 typeUntil(stops){const result=[];let depth=0;while(!(depth===0&&stops.includes(this.peek().text))){const token=this.next();if(['<','[','('].includes(token.text))depth++;if(['>',']',')'].includes(token.text))depth--;if(depth<0)fail('Rust type delimiters differ');result.push(token.text);}return result.join('');}
 function(){
  while(this.eat('#'))this.group('[',']');const exported=this.eat('pub');this.expect('fn');const name=this.identifier();
  if(this.eat('<')){this.expect("'a");this.expect('>');}this.expect('(');const parameters=[];
  while(!this.eat(')')){const name=this.identifier();this.expect(':');const type=this.typeUntil([',',')']);parameters.push({name,type});if(!this.is(')'))this.expect(',');}
  this.expect('->');const returns=this.typeUntil(['{']),body=this.block(new Map(),0);if(this.peek().type!=='end')fail('complete function item was not consumed');return {name,exported,parameters,returns,body};
 }
 block(environment,depth){
  this.tick(depth);this.expect('{');const local=new Map(environment),statements=[];let tail=null;
  while(!this.eat('}')){
   this.tick(depth);
   if(this.eat('let')){const mutable=this.eat('mut'),name=this.identifier();if(mutable&&name.startsWith('__ro_'))fail('mutable compiler temporary is outside the emitted form');this.expect('=');const value=this.expression(local,0,depth+1);this.expect(';');if(name.startsWith('__ro_'))local.set(name,value);else statements.push({kind:'let',name,value,...(mutable?{mutable:true}:{})});continue;}
   if(this.peek().type==='ident'&&this.is('=',1)){const name=this.identifier();this.expect('=');const value=this.expression(local,0,depth+1);this.expect(';');statements.push({kind:'assign',name,value});continue;}
   if(this.eat('return')){const value=this.expression(local,0,depth+1);this.expect(';');statements.push({kind:'return',value});continue;}
   if(this.is('assert!')||this.is('for')||this.is('__ro_domain')||this.is('if')&&this.is('let',1)){this.skipGuard();continue;}
   if(this.eat('if')){const condition=this.expression(local,0,depth+1),yes=this.block(local,depth+1);this.expect('else');const no=this.block(local,depth+1);statements.push({kind:'if',condition,yes,no});continue;}
   tail=this.expression(local,0,depth+1);if(this.eat(';'))fail('unrecognized standalone Rust effect statement');this.expect('}');break;
  }
  return {kind:'block',statements,tail};
 }
 expression(environment,minimum=0,depth=0){
  this.tick(depth);let value=this.primary(environment,depth+1);
  for(;;){
   if(this.eat('.')){const name=this.identifier();if(this.eat('(')){const args=this.arguments(environment,depth+1);value={kind:'method',name,value,args};}else value={kind:'field',name,value};continue;}
   const op=this.peek().text,precedence=PRECEDENCE.get(op);if(precedence===undefined||precedence<minimum)break;this.next();value={kind:'binary',op,left:value,right:this.expression(environment,precedence+1,depth+1)};
  }return value;
 }
 arguments(environment,depth){const args=[];while(!this.eat(')')){args.push(this.expression(environment,0,depth+1));if(!this.is(')'))this.expect(',');}return args;}
 primary(environment,depth){
  this.tick(depth);
  if(this.eat('&'))return {kind:'borrow',value:this.expression(environment,5,depth+1)};
  if(this.eat('!'))return {kind:'not',value:this.expression(environment,5,depth+1)};
  if(this.eat('(')){const value=this.expression(environment,0,depth+1);this.expect(')');return value;}
  if(this.is('{'))return this.block(environment,depth+1);
  if(this.eat('if')){const condition=this.expression(environment,0,depth+1),yes=this.block(environment,depth+1);this.expect('else');return {kind:'choose',condition,yes,no:this.block(environment,depth+1)};}
  if(this.eat('match')){
   const value=this.expression(environment,0,depth+1);this.expect('{');const arms=[];
   while(!this.eat('}')){const pattern=[];while(!this.eat('=>'))pattern.push(this.next().text);arms.push({pattern:pattern.join(''),value:this.expression(environment,0,depth+1)});if(!this.is('}'))this.expect(',');}
   return {kind:'match',value,arms};
  }
  if(this.eat('|')){const parameters=[];while(!this.eat('|')){parameters.push(this.identifier());if(!this.is('|'))this.expect(',');}return {kind:'lambda',parameters,body:this.block(environment,depth+1)};}
  const token=this.peek();
  if(token.type==='string'){this.next();return {kind:'string',value:ownedRustString(token.text)};}
  if(token.type==='number'){this.next();const found=/^(0|[1-9][0-9]*)_(u64|i64)$/u.exec(token.text);if(!found)fail('canonical suffixed integer required');return {kind:'integer',value:found[1],type:found[2]};}
  if(this.eat('true'))return {kind:'boolean',value:true};if(this.eat('false'))return {kind:'boolean',value:false};
  const path=this.path();
  if(path==='crate::translation_core::json!')return this.jsonMacro(environment,depth+1);
  if(this.eat('('))return {kind:'call',path,args:this.arguments(environment,depth+1)};
  if(environment.has(path))return {kind:'temporary',name:path,value:environment.get(path)};
  return {kind:'name',name:path};
 }
 jsonMacro(environment,depth){
  this.expect('(');let value;
  if(this.eat('[')){const elements=[];while(!this.eat(']')){elements.push(this.expression(environment,0,depth+1));if(!this.is(']'))this.expect(',');}value={kind:'json-array',elements};}
  else if(this.eat('{')){const entries=[];while(!this.eat('}')){const token=this.next();if(token.type!=='string')fail('emitted literal JSON key required');const key=ownedRustString(token.text);this.expect(':');entries.push({key,value:this.expression(environment,0,depth+1)});if(!this.is('}'))this.expect(',');}value={kind:'json-object',entries};}
  else fail('canonical owned JSON aggregate macro required');this.expect(')');return value;
 }
}
export function readOwnedRustFunction(source){if(typeof source!=='string'||source.length>2097152)fail('bounded complete original Rust function required');return new OwnedRustReader(rustTokens(source)).function();}
