// Select complete original primitive constant initializers and interpret only
// their closed fixed-integer expression grammar. Documentation slots are never
// values. This is independent of caller namespace and runtime emission rights.
import {createHash} from 'node:crypto';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {primitiveTryFromOriginalSource,PRIMITIVE_TRY_FROM_PROFILE} from './primitive-try-from-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),states=new WeakMap(),cache=new Map();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const words=tokens=>significant(tokens).map(token=>token.text);
const fail=message=>{throw new TypeError('Original primitive integer constant: '+message);};
const fixedName=name=>typeof name==='string'&&/^[iu](8|16|32|64|128)$/u.test(name);
const primitive=name=>{if(!fixedName(name))fail('only original fixed-width primitive types are supported');return {...rustFixedType(name),rustPrimitiveName:name};};
function bodyGroup(tokens,at){
 const pairs={'(':')','[':']','{':'}'},open=tokens[at]?.text;if(!Object.hasOwn(pairs,open))fail('original group opener required');
 const stack=[pairs[open]];for(let i=at+1;i<tokens.length;i++){const word=tokens[i].text;if(Object.hasOwn(pairs,word))stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(word!==stack.pop())fail('original delimiter mismatch');if(!stack.length)return i;}}fail('original group is incomplete');
}
function originalBindings(type){
 const module=primitiveTryFromOriginalSource('library/core/src/num/mod.rs'),name=type.rustPrimitiveName,owners=sourceItems(module.source).filter(item=>item.term==='impl'&&item.name===name),owner=owners.find(item=>words(item.tokens).slice(0,3).join('')==='impl'+name+'{');
 if(!owner||owners.length!==1)fail('requires one unconditional original primitive implementation');
 const family=type.signed?'int':'uint',macro=primitiveTryFromOriginalSource('library/core/src/num/'+family+'_macros.rs'),macroName=family+'_impl',tokens=significant(owner.tokens),at=tokens.findIndex(token=>token.text===macroName+'!'||token.text===macroName),open=at+(tokens[at]?.text.endsWith('!')?1:2),close=bodyGroup(tokens,open);
 if(at<0||tokens[open].text!=='{')fail('requires its original primitive macro call');
 const trees=originalMacroTrees(module.source.slice(tokens[open].start,tokens[close].end))[0].children,rows=[],fields=new Map();
 let current=[];for(const tree of trees){if(tree.kind==='token'&&tree.text===','){if(!current.length)fail('empty original macro argument');rows.push(current);current=[];}else current.push(tree);}if(current.length)fail('original named argument list must retain its trailing separator');
 for(const row of rows){if(row[0]?.kind!=='token'||row[1]?.text!=='='||row.length<3||fields.has(row[0].text))fail('original named argument differs');fields.set(row[0].text,row.slice(2));}
 const mt=significant(rustTokens(macro.source)),matcherAt=mt.findIndex(token=>token.text==='('),matcherEnd=bodyGroup(mt,matcherAt);
 if(mt[0]?.text!=='macro_rules!'||mt[1]?.text!==macroName||mt[matcherEnd+1]?.text!=='=>')fail('original macro definition/matcher differs');
 const matcher=originalMacroTrees(macro.source.slice(mt[matcherAt].start,mt[matcherEnd].end))[0].children,slots=new Map();let index=0;
 while(index<matcher.length){
  const [key,eq,dollar,variable,colon,fragment,comma]=matcher.slice(index,index+7);
  if(key?.kind!=='token'||eq?.text!=='='||dollar?.text!=='$'||variable?.kind!=='token'||colon?.text!==':'||!['ty','ident','literal','expr'].includes(fragment?.text)||comma?.text!==','||slots.has(key.text))fail('original named matcher is outside the bounded binding grammar');
  slots.set(key.text,{name:variable.text,fragment:fragment.text,span:{start:mt[matcherAt].start+key.span.start,end:mt[matcherAt].start+comma.span.end}});index+=7;
 }
 if(fields.size!==slots.size||[...fields.keys()].some((key,index)=>key!==[...slots.keys()][index]))fail('original complete named arguments do not match the actual matcher order');
 const resolve=key=>{const values=fields.get(key),slot=slots.get(key);if(!slot||!['ty','ident'].includes(slot.fragment)||values?.length!==1||values[0].kind!=='token'||!fixedName(values[0].text))fail('original primitive type slot is unsupported');return values[0].text;};
 if(resolve('Self')!==name||resolve('ActualT')!==name)fail('actual original Self/ActualT substitution differs');
 const bindings={Self:name};for(const key of ['Self',type.signed?'UnsignedT':'SignedT'])bindings[slots.get(key).name]=resolve(key);
 return {module,owner,macro,macroName,bindings,matcher:{span:{start:mt[matcherAt].start,end:mt[matcherEnd].end},original:macro.source.slice(mt[matcherAt].start,mt[matcherEnd].end),slots:Object.fromEntries(slots)},invocation:{span:{start:tokens[at].start,end:tokens[close].end},original:module.source.slice(tokens[at].start,tokens[close].end),arguments:[...fields].map(([key,trees])=>({key,trees})),documentationArgumentsUsedAsValues:false}};
}
function parseInitializer(trees,bindings,depth=0){
 if(depth>16)fail('constant expression depth budget exceeded');let at=0,steps=0;
 const text=()=>trees[at]?.text;
 function primary(){
  if(++steps>128)fail('constant expression step budget exceeded');const tree=trees[at++];
  if(tree?.kind==='token'&&tree.text==='!')return {kind:'not',arg:primary()};
  if(tree?.kind==='group'&&tree.delimiter==='(')return parseInitializer(tree.children,bindings,depth+1);
  if(tree?.kind==='token'&&/^\d[\d_]*$/u.test(tree.text))return {kind:'integer',decimal:tree.text.replaceAll('_','')};
  if(tree?.text==='Self'&&text()==='::'&&['MIN','MAX'].includes(trees[at+1]?.text)){at+=2;return {kind:'constant',owner:bindings.Self,name:trees[at-1].text};}
  // Preserve original UFCS punctuation and the actual macro metavariable slot.
  if(tree?.text==='<'&&text()==='$'&&trees[at+1]?.kind==='token'&&trees[at+2]?.text==='>'&&trees[at+3]?.text==='::'&&['MIN','MAX'].includes(trees[at+4]?.text)){
   const variable=trees[at+1].text,owner=bindings[variable];if(!owner)fail('unbound original type metavariable');const name=trees[at+4].text;at+=5;return {kind:'constant',owner,name,originalTypeVariable:variable};
  }
  fail('constant initializer contains unsupported original syntax');
 }
 let expression=primary();
 while(at<trees.length){
  if(text()==='as'){at++;if(text()!=='Self')fail('constant cast requires its actual Self slot');at++;expression={kind:'cast',arg:expression,target:bindings.Self};}
  else if(text()==='>'&&trees[at+1]?.text==='>'){at+=2;expression={kind:'shiftRight',left:expression,right:primary()};}
  else fail('constant initializer has unproved operators or trailing tokens');
 }
 return expression;
}
function unsignedResidue(value,bits){const modulus=1n<<BigInt(bits);return (value%modulus+modulus)%modulus;}
function cast(value,type){const residue=unsignedResidue(value,type.bits),sign=1n<<BigInt(type.bits-1);return type.signed&&residue>=sign?residue-(1n<<BigInt(type.bits)):residue;}
function evaluate(node,type,active,dependencies){
 if(node.kind==='integer')return {value:BigInt(node.decimal),type};
 if(node.kind==='constant'){const proof=select(node.owner,node.name,active);dependencies.push(proof);return {value:BigInt(proof.decimal),type:proof.type};}
 if(node.kind==='cast'){const value=evaluate(node.arg,type,active,dependencies),target=primitive(node.target);return {value:cast(value.value,target),type:target};}
 if(node.kind==='not'){const value=evaluate(node.arg,type,active,dependencies);return {value:cast(~value.value,value.type),type:value.type};}
 if(node.kind==='shiftRight'){const left=evaluate(node.left,type,active,dependencies),right=evaluate(node.right,type,active,dependencies);if(right.value<0n||right.value>=BigInt(left.type.bits))fail('original shift is outside its actual primitive domain');return {value:left.value>>right.value,type:left.type};}
 fail('unproved constant operation');
}
function select(name,constant,active=new Set()){
 const type=primitive(name),key=name+'::'+constant;if(!['MIN','MAX'].includes(constant)||active.has(key)||active.size>=8)fail('unsupported or cyclic original constant');if(cache.has(key))return cache.get(key);
 const origin=originalBindings(type),tokens=significant(rustTokens(origin.macro.source)),positions=tokens.flatMap((token,index)=>token.text==='const'&&tokens[index+1]?.text===constant?[index]:[]);
 if(positions.length!==1)fail('original constant declaration is absent or ambiguous');const at=positions[0];
 if(tokens[at-1]?.text!=='pub'||tokens[at+2]?.text!==':'||tokens[at+3]?.text!=='Self'||tokens[at+4]?.text!=='=')fail('original constant header differs');
 let end=at+5;while(end<tokens.length&&tokens[end].text!==';')end++;if(end===tokens.length)fail('original constant initializer is incomplete');
 const span={start:tokens[at-1].start,end:tokens[end].end},bodySpan={start:tokens[at+5].start,end:tokens[end].start},source=origin.macro.source.slice(bodySpan.start,bodySpan.end),trees=originalMacroTrees(source),syntax=parseInitializer(trees,origin.bindings),dependencies=[],result=evaluate(syntax,type,new Set(active).add(key),dependencies);
 if(result.type.rustPrimitiveName!==name||cast(result.value,type)!==result.value)fail('original constant does not inhabit its actual Self domain');
 const proof=freeze({schema:'original-fixed-integer-constant-v1',profileSha256:PRIMITIVE_TRY_FROM_PROFILE.manifestSha256,type,name:constant,sourcePath:origin.macro.path,sourceSha256:origin.macro.sha256,span,original:origin.macro.source.slice(span.start,span.end),bodySpan,bodySource:source,bodySha256:hash(source),syntax,bindings:origin.bindings,matcher:origin.matcher,invocation:origin.invocation,primitiveImpl:{sourcePath:origin.module.path,sourceSha256:origin.module.sha256,span:{start:origin.owner.start,end:origin.owner.end}},decimal:result.value.toString(),dependencies,semantics:'finite original checked-width bitwise complement, arithmetic shift and Rust integer residue cast',documentationArgumentsUsedAsValues:false,callerNamespaceJoined:false,constTraitCall:false,wholeMacroExpansion:false,runtimeParity:false});states.set(proof,{origin,trees,syntax});cache.set(key,proof);return proof;
}
export function originalPrimitiveIntegerConstant(type,name){const actual=primitive(type?.rustPrimitiveName);if(type.kind!=='fixed'||type.bits!==actual.bits||type.signed!==actual.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)fail('requires actual by-value primitive identity');return select(actual.rustPrimitiveName,name);}
export function requireOriginalPrimitiveIntegerConstant(proof,type,name){if(!states.has(proof)||originalPrimitiveIntegerConstant(type,name)!==proof)fail('copied, forged or foreign source constant');return proof;}
