// Bounded source patterns reuse the checked planner. Guarded alternatives are
// separate ordered attempts: a false guard retries the next alternative, even
// when it belongs to the same source arm. No guard contributes exhaustiveness.
import {planPattern} from '../pattern-bindings.mjs';
import {BOOL,sameType} from '../checked-types.mjs';
import {coerce} from '../checked-coercions.mjs';
import {renameExpr,Scope} from '../vendor/meta-language/translation/ir.js';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {containsIntegerRange,proveIntegerCoverage} from './integer-range-patterns.mjs';
const LIMIT=256;
const exits=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(exits):exits(value))));
const scalar=type=>['fixed','bool','string','unit'].includes(type.kind)&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustReference&&type.rustOwnership?.kind!=='owned'&&(type.kind!=='string'||type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str');
export const ORDERED_MATCH_PROFILE=Object.freeze({id:'rust-1.89-ordered-scalar-match',rust:'1.89.0',reference:'https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards',macroSource:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/macros/mod.rs',macroSourceSha256:'9a950cfa3735eef653b7f9a6a4701e7b218f9876141701dac72ccb8b8e8d3862',macroSourceLines:Object.freeze([444,453]),alternativeLimit:LIMIT,guards:'checked-bool-no-nonlocal-control',exhaustiveness:'unguarded-source-patterns-only'});
const tokens=(cursor,start)=>cursor.tokens.slice(start,cursor.index).map(token=>({kind:token.kind,value:token.value,...(token.raw?{raw:token.raw}:{}),span:{start:token.start,end:token.end}}));
export function hasOrderedMatchGuard(cursor) {
  let depth=0,body=false,head=true;
  for(let at=cursor.index;at<cursor.tokens.length;at++) {
    const token=cursor.tokens[at];
    if(token.kind==='punct'&&token.value==='{'&&!body){body=true;depth=1;continue;}
    if(!body)continue;
    if(head&&(depth===1&&token.kind==='identifier'&&token.value==='if'||token.kind==='punct'&&['..','..='].includes(token.value)))return true;
    if(token.kind!=='punct')continue;
    if(depth===1&&token.value==='=>')head=false;
    if(depth===1&&token.value===',')head=true;
    if(['(','[','{'].includes(token.value))depth++;
    if([')',']','}'].includes(token.value)) {
      if(--depth===0)return false;
      // Rust permits an ExpressionWithBlock arm to omit its trailing comma.
      // A following source pattern starts another arm; `else` and postfix or
      // operator continuations still belong to the current block expression.
      if(depth===1&&!head&&token.value==='}') {
        const next=cursor.tokens[at+1];
        if(next&&next.value!=='else'&&next.value!==','&&(next.kind==='identifier'||next.kind==='string'||next.kind==='number'||['_','&','-'].includes(next.value)))head=true;
      }
    }
  }
  return false;
}
function sourcePattern(parser,path) {
  const c=parser.cursor,start=c.index;
  const pattern=parser.controlPattern(path,c.peek());
  if(c.index-start>4096)throw unsupported('ordered match pattern','exceeds the checked source token bound',pattern.span);
  return {pattern,sourcePattern:{pattern,tokens:tokens(c,start),span:pattern.span}};
}
export function parseOrderedMatch(parser,path) {
  const c=parser.cursor,start=c.expect('match','ordered match'),subject=parser.expr(path,{noStruct:true});
  c.expect('{','ordered match');const rows=[];
  while(!c.is('}')) {
    const first=c.peek(),parsed=sourcePattern(parser,path),guard=c.eat('if')?parser.expr(path):null;
    c.expect('=>','ordered match arm');const body=parser.expr(path);
    if(body.block||['if','match','routerOrderedMatch','routerIf'].includes(body.k))c.eat(',');
    else if(!c.is('}'))c.expect(',','ordered match arm');
    rows.push({...parsed,guard,body,span:{start:first.start,end:c.peek().start}});
    if(rows.length>LIMIT)throw unsupported('ordered match rows','exceeds the checked row bound',first);
  }
  const end=c.expect('}','ordered match');
  if(!rows.length)throw unsupported('empty ordered match','uninhabited layouts require another profile',start);
  return {k:'routerOrderedMatch',subject,rows,span:{start:start.start,end:end.end}};
}
export function parseStandardMatches(parser,token,path) {
  // This is only reached after the highest source resolver proves the ordinary
  // unshadowed standard macro. Qualified/custom/macro-expanded owners refuse.
  const c=parser.cursor,open=c.next(),close={'(':')','[':']','{':'}'}[open.value];
  if(!close)throw typeError('matches! requires an original delimited token group',open);
  const subject=parser.expr(path);c.expect(',','matches! pattern');
  const parsed=sourcePattern(parser,path),guard=c.eat('if')?parser.expr(path):null;
  c.eat(',');const end=c.expect(close,'matches!');
  const span={start:token.start,end:end.end},literal=value=>({k:'bool',value,span});
  return {k:'routerOrderedMatch',subject,rows:[{...parsed,guard,body:literal(true),span},{pattern:{k:'wild',span},sourcePattern:{pattern:{k:'wild',span},tokens:[],span},guard:null,body:literal(false),span}],sourceMacro:{name:'matches',owner:'standard-prelude',profile:ORDERED_MATCH_PROFILE.id,span},span};
}
function alternatives(pattern,depth=0) {
  if(depth>128)throw unsupported('ordered match pattern','exceeds the checked pattern depth',pattern.span);
  if(pattern.k==='or') {
    const result=[];for(const child of pattern.alternatives){result.push(...alternatives(child,depth+1));if(result.length>LIMIT)throw unsupported('ordered match alternatives','exceeds the checked expansion bound',pattern.span);}return result;
  }
  if(pattern.k==='ctor') {
    let products=[[]];for(const child of pattern.args){const parts=alternatives(child,depth+1);if(products.length*parts.length>LIMIT)throw unsupported('ordered match alternatives','exceeds the checked product bound',pattern.span);products=products.flatMap(prefix=>parts.map(part=>[...prefix,part]));}return products.map(args=>({...pattern,args}));
  }
  if(!['wild','bind','numLit','boolLit','strLit','routerIntegerRangePattern'].includes(pattern.k))throw unsupported('ordered match source pattern',`${pattern.k} requires another checked pattern profile`,pattern.span);
  return [pattern];
}
function plan(checker,pattern,type,path,span) {return planPattern(pattern,type,{declarations:checker.items,resolveType:type=>checker.resolveType(type,path,span),span});}
function literalIdentities(pattern,type,checker,path,range) {
  if(pattern.k==='or'){for(const child of pattern.alternatives)literalIdentities(child,type,checker,path,range);return;}
  if(pattern.k==='numLit'&&pattern.suffix&&pattern.suffix!==type.rustPrimitiveName)throw typeError('ordered match literal requires its actual Rust primitive identity',pattern.span);
  if(pattern.k==='ctor') {
    const ctor=checker.items.get(type.name)?.ctors.find(ctor=>ctor.name===pattern.ctor);
    for(const [index,child]of pattern.args.entries())literalIdentities(child,checker.resolveType(ctor.fields[index].type,path,range),checker,path,range);
  }
}
export function checkOrderedMatch(checker,node,env,path,expected,allowLiteral=false) {
  env=checker.contextEnvironment(node,env,expected);
  if(exits(node.subject)||node.rows.some(row=>exits(row.guard)||exits(row.body)))throw unsupported('ordered match control','nonlocal control needs a separately checked statement join',node.span);
  const subject=checker.expr(node.subject,env,path);checker.patternDomain(subject.type,node.span);
  const integerRange=node.rows.some(row=>containsIntegerRange(row.pattern));
  if(integerRange&&subject.type.kind!=='fixed')throw unsupported('nested integer range match','this profile requires a primitive integer subject',node.span);
  let name;do{name=checker.freshName('ml_ordered_match_');}while(env.has(name));
  const variable={k:'var',name,type:subject.type,span:node.span},attempts=[],coverage=[],evidence=[];
  for(const row of node.rows) {
    const pattern=checker.patternOwner(row.pattern,subject.type,path,env),shared=plan(checker,pattern,subject.type,path,row.span);
    literalIdentities(pattern,subject.type,checker,path,row.span);
    for(const binding of shared.bindings)if(!scalar(binding.type)||binding.type.kind==='fixed'&&!binding.type.rustPrimitiveName)throw unsupported('ordered match binding ownership','requires actual immutable scalar source identities',binding.span??row.span);
    const parts=alternatives(pattern);
    if(attempts.length+parts.length>LIMIT)throw unsupported('ordered match alternatives','exceeds the checked whole-match bound',row.span);
    for(const part of parts) {
      const bindingPlan=plan(checker,part,subject.type,path,row.span);let inner=new Map(env);
      for(const binding of bindingPlan.bindings)inner=checker.bindingEnvironment(inner,binding.name,binding.type,false);
      const names=new Map([...env.keys()].filter(name=>typeof name==='string').map(name=>[name,name]));
      const bound=bindingPlan.bindings.map(binding=>{let name;do{name=checker.freshName('ml_guard_binding_');}while(env.has(name));names.set(binding.name,name);return {...binding,name};});
      const scope=new Scope(name=>checker.freshName('ml_arm_'+name+'_'));
      const guard=row.guard?renameExpr(coerce(checker.expr(row.guard,inner,path,BOOL),BOOL,checker.language,row.span),names,scope):null;
      const body=renameExpr(checker.expr(row.body,inner,path,expected,allowLiteral),names,scope);
      attempts.push({plan:{...bindingPlan,bindings:bound},guard,body,span:row.span});
      if(!row.guard)coverage.push({patterns:[part],binds:[],body:{k:'unit'},span:row.span});
    }
    evidence.push({sourcePattern:row.sourcePattern,plan:shared,alternatives:parts.length,guarded:Boolean(row.guard),span:row.span});
  }
  // Use the existing constructor/literal matrix solely for its checked
  // coverage proof; guards and effects are never run during compilation.
  const intervalProof=integerRange?proveIntegerCoverage(coverage.map(row=>row.patterns[0]),subject.type,node.span):null;
  if(!intervalProof)checker.compileRows([{name,type:subject.type}],coverage,node.span);
  let type=expected??attempts.find(attempt=>attempt.body.type.kind!=='literal')?.body.type;
  type??=checker.defaultNumber();
  const bind=(plan,body)=>plan.bindings.reduceRight((body,binding)=>({k:'let',name:binding.name,value:checker.patternProjection(variable,binding.projection,binding.type),body,type:body.type,mutable:false,span:binding.span??node.span}),body);
  const branches=[];
  for(const attempt of attempts) {
    const body=coerce(attempt.body,type,checker.language,attempt.span);
    if(!sameType(body.type,type))throw typeError('ordered match arms have different checked result types',attempt.span);
    const selected={k:'routerOrderedArm',guard:attempt.guard,body,type,span:attempt.span};
    branches.push({cond:checker.patternTest(attempt.plan.test,variable),body:bind(attempt.plan,selected),span:attempt.span});
  }
  if(intervalProof&&attempts.every(attempt=>!attempt.guard)) {
    // Coverage proves that the last remaining row always selects if preceding
    // tests fail. Ordinary checked if/let IR preserves runtime and selected
    // path CTFE semantics, without granting a new const trait or guard rule.
    let result=branches.at(-1).body;
    const ordinary=arm=>arm.k==='routerOrderedArm'?arm.body:arm.k==='let'?{...arm,body:ordinary(arm.body)}:arm;
    result=ordinary(result);
    for(let index=branches.length-2;index>=0;index--)result={k:'if',cond:branches[index].cond,then:ordinary(branches[index].body),else:result,type,span:branches[index].span};
    return {k:'let',name,value:subject,body:result,type,mutable:false,span:node.span,integerRangeMatchProof:{...intervalProof,rows:evidence,subjectEvaluatedOnce:true}};
  }
  // A linear list avoids copying all following attempts into both paths of
  // every guarded alternative. Each branch's ordinary let tree owns binders.
  let result={k:'routerOrderedMatchArms',branches,type,span:node.span};
  if(subject.type.kind==='data')result={k:'routerDiscard',value:{k:'routerPatternImmutable',object:variable,type:BOOL,borrowedAggregate:checker.sharedPatternView(subject.type),span:node.span},body:result,type,span:node.span};
  return {k:'let',name,value:subject,body:result,type,mutable:false,span:node.span,constEligible:false,patternControl:{kind:'ordered-scalar-match',profile:ORDERED_MATCH_PROFILE.id,subjectType:subject.type,rows:evidence,expandedRows:attempts.length,exhaustiveness:'unguarded-source-patterns-only',...(intervalProof?{intervalProof}:{}),...(node.sourceMacro?{sourceMacro:node.sourceMacro}:{})}};
}
export function emitOrderedMatch(emitter,node) {
  const lines=['(() => {'];
  for(const branch of node.branches) {
    lines.push(`  if (${emitter.expr(branch.cond)}) {`);
    let arm=branch.body;
    while(arm.k==='let'){lines.push(`    const ${arm.name} = ${emitter.expr(arm.value)};`);arm=arm.body;}
    if(arm.k!=='routerOrderedArm')throw new Error('Ordered match has an unchecked branch shape');
    if(arm.guard)lines.push(`    if (${emitter.expr(arm.guard)}) return ${emitter.expr(arm.body)};`);
    else lines.push(`    return ${emitter.expr(arm.body)};`);
    lines.push('  }');
  }
  lines.push('  throw new Error("unreachable exhaustive ordered match");','})()');
  return lines.join('\n');
}
