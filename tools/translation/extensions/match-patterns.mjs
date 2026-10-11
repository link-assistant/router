// Nested alternatives are checked as source patterns before distribution.
// The existing matrix compiler retains first-arm priority and exhaustiveness.
import {planPattern} from '../pattern-bindings.mjs';
import {BOOL} from '../checked-types.mjs';
import {hasOrderedMatchGuard,parseOrderedMatch,checkOrderedMatch} from './ordered-matches.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const LIMIT=256;
const scalar=type=>['fixed','bool','string','unit','nat','int','float'].includes(type.kind)&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved;
const originalTokens=tokens=>tokens.map(token=>({kind:token.kind,value:token.value,start:token.start,end:token.end,...(token.suffix?{suffix:token.suffix}:{}),...(token.raw?{raw:token.raw}:{})}));
const evidenceTokens=tokens=>tokens.map(({start,end,...token})=>({...token,span:{start,end}}));
function cleanPattern(node) {
  const {routerMatchOriginalTokens,...pattern}=node;
  return {...pattern,...(pattern.args?{args:pattern.args.map(cleanPattern)}:{})};
}
function structuralPatternNeeded(cursor) {
  let depth=0;
  for(let at=cursor.index;at<cursor.tokens.length&&at-cursor.index<4096;at++) {
    const token=cursor.tokens[at];if(token.kind!=='punct')continue;
    if(!depth&&['=>','}'].includes(token.value))return false;
    // A constructor's argument group follows its original identifier. A
    // separate parenthesis group retains tuple, unit or grouping syntax that
    // the older matrix frontend cannot parse without erasing source evidence.
    if(token.value==='('&&(at===cursor.index||cursor.tokens[at-1]?.kind!=='identifier'))return true;
    if(['(','[','{'].includes(token.value))depth++;
    if([')',']','}'].includes(token.value))depth--;
    if(token.value==='|'&&depth>0)return true;
  }
  return false;
}
function matrixPattern(pattern,type,declarations) {
  if(pattern.k==='or')return {...pattern,alternatives:pattern.alternatives.map(child=>matrixPattern(child,type,declarations))};
  if(pattern.k==='lit'&&pattern.value===null) {
    if(type.kind!=='unit')throw typeError('unit match pattern requires its actual checked unit type',pattern.span);
    return {k:'wild',span:pattern.span};
  }
  const entry=type.kind==='data'?declarations.get(type.name):null;
  if(pattern.k==='routerTuplePattern') {
    if(!entry?.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1)throw unsupported('tuple match matrix','requires the actual checked anonymous tuple product',pattern.span);
    const ctor=entry.ctors[0];
    if(pattern.items.length!==ctor.fields.length)throw typeError('tuple match arity differs from the actual checked product',pattern.span);
    return {k:'ctor',path:[type.name,ctor.name],data:type.name,ctor:ctor.name,args:pattern.items.map((child,index)=>matrixPattern(child,ctor.fields[index].type,declarations)),span:pattern.span};
  }
  if(pattern.k==='ctor') {
    const ctor=entry?.ctors.find(ctor=>ctor.name===pattern.ctor);
    if(!ctor||pattern.args.length!==ctor.fields.length)throw typeError('match constructor requires its complete actual checked field layout',pattern.span);
    return {...pattern,args:pattern.args.map((child,index)=>matrixPattern(child,ctor.fields[index].type,declarations))};
  }
  return pattern;
}
function checkSyntaxBounds(cursor) {
  let depth=0;
  for(let at=cursor.index;at<cursor.tokens.length;at++) {
    const token=cursor.tokens[at];
    if(at-cursor.index>=4096)throw unsupported('nested match pattern','exceeds the checked token bound',token);
    if(token.kind==='eof'||!depth&&(token.kind==='punct'&&token.value==='=>'||token.kind==='identifier'&&token.value==='if'))return;
    if(token.kind!=='punct')continue;
    if(['(','[','{'].includes(token.value)&&++depth>128)throw unsupported('nested match pattern','exceeds the checked depth bound',token);
    if([')',']','}'].includes(token.value))depth--;
  }
}
function distribute(pattern,depth=0) {
  if(depth>128)throw unsupported('nested match pattern','exceeds the checked depth bound',pattern.span);
  if(pattern.k==='or') {
    const alternatives=[];
    for(const child of pattern.alternatives){alternatives.push(...distribute(child,depth+1));if(alternatives.length>LIMIT)throw unsupported('nested match alternatives','exceeds the checked expansion bound',pattern.span);}
    return alternatives;
  }
  if(pattern.k!=='ctor') {
    if(!['wild','bind','numLit','boolLit','strLit'].includes(pattern.k))throw unsupported('nested match pattern',`${pattern.k} needs separate matrix lowering`,pattern.span);
    return [pattern];
  }
  let combinations=[[]];
  for(const child of pattern.args) {
    const alternatives=distribute(child,depth+1);
    if(combinations.length*alternatives.length>LIMIT)throw unsupported('nested match alternatives','exceeds the checked expansion bound',pattern.span);
    combinations=combinations.flatMap(prefix=>alternatives.map(alternative=>[...prefix,alternative]));
  }
  return combinations.map(args=>({...pattern,args}));
}
function validateLiterals(pattern,type,declarations) {
  if(pattern.k==='or'){for(const child of pattern.alternatives)validateLiterals(child,type,declarations);return;}
  if(pattern.k==='numLit'&&pattern.suffix&&pattern.suffix!==type.rustPrimitiveName)throw typeError('nested match literal requires its actual Rust primitive identity',pattern.span);
  if(pattern.k==='ctor') {
    const ctor=declarations.get(type.name)?.ctors.find(ctor=>ctor.name===pattern.ctor);
    for(const [index,child]of pattern.args.entries())validateLiterals(child,ctor.fields[index]?.type??{},declarations);
  }
}
function validateAlternativeBindings(pattern,type,checker,path,range) {
  if(pattern.k==='or') {
    const signatures=pattern.alternatives.map(child=>planPattern(child,type,{declarations:checker.items,resolveType:type=>checker.resolveType(type,path,range),span:range}).bindings.map(binding=>({name:binding.name,projection:binding.projection,type:binding.type})).sort((a,b)=>a.name.localeCompare(b.name)));
    if(signatures.some(signature=>JSON.stringify(signature)!==JSON.stringify(signatures[0])))throw typeError('nested match alternatives require the same actual Rust binding identities',pattern.span);
    for(const child of pattern.alternatives)validateAlternativeBindings(child,type,checker,path,range);
  } else if(pattern.k==='ctor') {
    const ctor=checker.items.get(type.name)?.ctors.find(ctor=>ctor.name===pattern.ctor);
    for(const [index,child]of pattern.args.entries())validateAlternativeBindings(child,ctor.fields[index]?.type??{},checker,path,range);
  }
}
export function withNestedMatchPatternsParser(Base) {
  return class extends Base {
    match(path) {
      if(hasOrderedMatchGuard(this.cursor))return parseOrderedMatch(this,path);
      const cursor=this.cursor,previous=this.collectNestedMatchSyntax;this.collectNestedMatchSyntax=true;
      let node;try{node=super.match(path);}finally{this.collectNestedMatchSyntax=previous;}
      const active=node.rows.some(row=>row.patterns.some(pattern=>pattern.k==='routerNestedMatchPattern'));
      const rows=node.rows.map(row=>({...row,patterns:row.patterns.map(pattern=>{
        if(pattern.k==='routerNestedMatchPattern')return pattern;
        if(!active)return cleanPattern(pattern);
        // Replay every other original pattern, rather than accepting reference
        // or alias syntax erased by an older portable parser branch.
        const cursor=this.cursor,tokens=pattern.routerMatchOriginalTokens,last=tokens?.at(-1);
        if(!last)throw unsupported('nested match source syntax','requires retained original arm tokens',pattern.span);
        this.cursor=new cursor.constructor([...tokens,{kind:'eof',value:'',start:last.end,end:last.end}],cursor.language);
        try {
          const parsed=this.controlPattern(path,this.cursor.peek());
          if(!this.cursor.atEnd())throw unsupported('nested match source syntax','requires complete original arm parsing',pattern.span);
          return {k:'routerNestedMatchPattern',pattern:parsed,tokens:evidenceTokens(tokens),span:parsed.span};
        } finally {this.cursor=cursor;}
      })}));
      if(!active)return {...node,rows};
      // A top-level or-arm must retain one shared binder proof even when the
      // older parser represented its alternatives as separate matrix rows.
      const grouped=[];
      for(const row of rows) {
        const previous=grouped.at(-1);
        if(previous&&previous.span.start===row.span.start&&previous.span.end===row.span.end)previous.patterns[0].pattern.alternatives.push(row.patterns[0].pattern);
        else grouped.push({...row,patterns:[{...row.patterns[0],pattern:{k:'or',alternatives:[row.patterns[0].pattern],span:row.patterns[0].span}}]});
      }
      for(const row of grouped) {
        const wrapper=row.patterns[0],alternatives=wrapper.pattern.alternatives;
        if(alternatives.length===1)wrapper.pattern=alternatives[0];
        else {
          const start=alternatives[0].span.start,end=alternatives.at(-1).span.end;
          wrapper.tokens=evidenceTokens(originalTokens(cursor.tokens.filter(token=>token.start>=start&&token.end<=end)));
          wrapper.span=wrapper.pattern.span={start,end};
        }
      }
      return {...node,rows:grouped};
    }
    pattern(path,aliases) {
      const start=this.cursor.index;
      if(!structuralPatternNeeded(this.cursor)) {
        const pattern=super.pattern(path,aliases);
        return this.collectNestedMatchSyntax?{...pattern,routerMatchOriginalTokens:originalTokens(this.cursor.tokens.slice(start,this.cursor.index))}:pattern;
      }
      if(!this.controlPattern)throw unsupported('nested match alternatives','requires the checked source-pattern frontend',this.cursor.peek());
      checkSyntaxBounds(this.cursor);
      const pattern=this.controlPattern(path,this.cursor.peek());
      const tokens=evidenceTokens(originalTokens(this.cursor.tokens.slice(start,this.cursor.index)));
      return {k:'routerNestedMatchPattern',pattern,tokens,span:pattern.span};
    }
  };
}
export function withNestedMatchPatternsChecker(Base) {
  return class extends Base {
    compileMatch(node,env,path) {
      if(!node.rows.some(row=>row.patterns.some(pattern=>pattern.k==='routerNestedMatchPattern')))return super.compileMatch(node,env,path);
      if(node.scrutinees.length!==1)throw unsupported('nested match alternatives','only one original scrutinee is checked',node.span);
      const subject=this.expr(node.scrutinees[0],env,path,undefined);
      this.patternDomain(subject.type,node.span);
      const rows=[],evidence=[];
      for(const row of node.rows) {
        if(row.guard)throw unsupported('match guard','requires separate checked guard semantics',row.span);
        const source=row.patterns[0],pattern=this.patternOwner(source.k==='routerNestedMatchPattern'?source.pattern:source,subject.type,path,env);
        const matrix=matrixPattern(pattern,subject.type,this.items);
        validateAlternativeBindings(matrix,subject.type,this,path,row.span);
        const plan=planPattern(pattern,subject.type,{declarations:this.items,resolveType:type=>this.resolveType(type,path,row.span),span:row.span});
        for(const binding of plan.bindings)if(!scalar(binding.type)||binding.type.kind==='fixed'&&!binding.type.rustPrimitiveName)throw unsupported('nested match binding ownership','only immutable scalar bindings with actual Rust primitive identities are checked',binding.span??row.span);
        validateLiterals(matrix,subject.type,this.items);
        const alternatives=distribute(matrix);
        if(rows.length+alternatives.length>LIMIT)throw unsupported('nested match alternatives','exceeds the checked whole-match expansion bound',row.span);
        rows.push(...alternatives.map(pattern=>({...row,patterns:[pattern]})));
        evidence.push({sourcePattern:source,plan,expandedRows:alternatives.length,span:row.span});
      }
      const metadata={kind:'nested-match-alternatives',subjectType:subject.type,rows:evidence,expandedRows:rows.length,expansionBound:LIMIT,guards:'refused',bindingProfile:'immutable-scalars'};
      (this.nestedMatchEvidence??=new WeakMap()).set(node,metadata);
      const subjectNode={k:'routerNestedMatchSubject',value:node.scrutinees[0],span:node.span};
      return super.compileMatch({...node,scrutinees:[subjectNode],rows},env,path);
    }
    expr(node,env,path,expected,allowLiteral=false) {
      if(node.k==='routerOrderedMatch')return checkOrderedMatch(this,node,env,path,expected,allowLiteral);
      if(node.k==='routerNestedMatchSubject') {
        const value=this.expr(node.value,env,path,undefined),name=this.freshName('ml_match_subject'),variable={k:'var',name,type:value.type,span:node.span};
        const body=value.type.kind==='data'?{k:'routerDiscard',value:{k:'routerPatternImmutable',object:variable,type:BOOL,span:node.span},body:variable,type:value.type,span:node.span}:variable;
        return {k:'let',name,value,body,type:value.type,span:node.span};
      }
      const result=super.expr(node,env,path,expected,allowLiteral),evidence=this.nestedMatchEvidence?.get(node);
      // PatternEmitter installs boundary guards before typed layout inspection.
      // Const permission for the new immutable-match profile is not inferred.
      return evidence?{...result,patternControl:result.patternControl?{...result.patternControl,nestedMatchAlternatives:evidence}:evidence,constEligible:false}:result;
    }
  };
}
