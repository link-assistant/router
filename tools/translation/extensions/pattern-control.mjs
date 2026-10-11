// Structural if-let lowering over checked Rust layouts. Vendor source, bodies
// and shared frontend integration are unchanged; Data may adopt these classes.
import {ControlRustParser,ControlChecker,ControlEmitter} from './control.mjs';
import {emitWith} from './core.mjs';
import {tokenizeRust} from './lexical.mjs';
import {parseBindingPattern} from '../pattern-syntax.mjs';
import {planPattern} from '../pattern-bindings.mjs';
import {BOOL,UNIT,sameType} from '../checked-types.mjs';
import {coerce} from '../checked-coercions.mjs';
import {TranslationError,typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
const range=(start,end)=>({start:start.start,end:end.end});
const containsExit=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(containsExit):containsExit(value))));
const scalar=type=>['fixed','bool','string','unit'].includes(type?.kind);
function immutableBinding(type,checker,active=new Set()) {
  if(type.rustGenericIdentityUnresolved)return false;
  if(type.rustReference)return type.rustReference.kind==='shared'&&Boolean(type.rustReference.pointee);
  if(scalar(type))return !type.patternOwnershipRefusal&&type.rustOwnership?.kind!=='owned';
  const entry=type.kind==='data'?checker.items.get(type.name):null,profile=type.rustStandardGeneric??entry?.standardGeneric;
  if(!entry||!['Option','Result'].includes(entry.standardGeneric?.kind)||profile?.kind!==entry.standardGeneric.kind||active.has(type.name))return false;
  active.add(type.name);const result=profile.arguments.every(argument=>immutableBinding(checker.resolveType(argument,entry.modulePath,entry.span),checker,active));active.delete(type.name);return result;
}
const owned=new Set(['Box','Vec','String','Arc','Rc','Cell','RefCell','UnsafeCell','Mutex','RwLock','Pin','ManuallyDrop','MaybeUninit']);
function checkCallbackCaptures(node,env,bound,span) {
  if(!node||typeof node!=='object')return;
  if(node.k==='routerSet'||node.k==='let'&&node.mutable)throw unsupported('tuple callback mutation','requires a separate checked closure mutation and borrowing contract',node.span??span);
  if(node.k==='var'&&!bound.has(node.name)&&env.has(node.name)) {
    const type=env.get(node.name);
    if(!scalar(type)||type.patternOwnershipRefusal)throw unsupported('tuple callback capture ownership','only immutable scalar capture views have a checked contract',node.span??span);
  }
  if(node.k==='let') {
    checkCallbackCaptures(node.value,env,bound,span);
    checkCallbackCaptures(node.body,env,new Set([...bound,node.name]),span);return;
  }
  for(const [key,value]of Object.entries(node))if(!['type','span','patternControl'].includes(key)) {
    if(Array.isArray(value))for(const child of value)checkCallbackCaptures(child,env,bound,span);
    else checkCallbackCaptures(value,env,bound,span);
  }
}
// A proof about this block's own exits, never an exit hidden in a nested loop
// or a value expression. Calls/loops with an unproven never type stay refused.
function diverges(node) {
  if(!node)return false;
  if(['routerReturn','routerBreak','routerContinue'].includes(node.k))return true;
  if(['if','routerIf'].includes(node.k))return diverges(node.then)&&diverges(node.else)||node.k==='routerIf'&&diverges(node.body);
  if(['let','routerSet','routerDiscard','routerWhile'].includes(node.k))return diverges(node.body);
  return false;
}
// Preserve provenance erased by the portable Box<T>/&T type encoding. Owned
// String uses the same portable primitive as &str, but owned String moves
// require a separate contract; shared string views are the supported scalar.
function ownershipRefusal(tokens) {
  for(let index=0;index<tokens.length;index++) {
    const value=tokens[index].value;
    if(owned.has(value))return `ownership-bearing ${value} type`;
    if(value==='&') {
      let next=index+1;
      if(tokens[next]?.value==="'"){next+=2;}
      if(tokens[next]?.value!=='str')return 'non-string reference type';
    }
  }
  return null;
}
export function withPatternControlParser(Base=ControlRustParser) {
  return class extends Base {
    type() {
      const first=this.cursor.index,type=super.type(),tokens=this.cursor.tokens.slice(first,this.cursor.index),reason=ownershipRefusal(tokens);
      return reason?{...type,patternOwnershipRefusal:reason}:type;
    }
    registeredPatternOwner(written,resolved,path,location) {
      if(typeof this.registeredGenericKind!=='function')return null;
      if(this.unresolvedImportScope&&resolved.length===written.length&&resolved.every((name,index)=>name===written[index])&&(['Some','None','Ok','Err'].includes(written[0])||['Option','Result'].includes(written[0])))throw unsupported('unproven standard if-let owner','requires actual source namespace resolution',location);
      const kind=this.registeredGenericKind(resolved.slice(0,-1),path,written[0]);
      return (kind==='Option'?['Some','None']:kind==='Result'?['Ok','Err']:[]).includes(resolved.at(-1))?kind:null;
    }
    controlPattern(path,first) {
      const c=this.cursor;
      let pattern;const owners=[];
      try {pattern=parseBindingPattern(c,{resolvePath:(written,location)=>{
        const resolved=this.resolve(written,path),kind=this.registeredPatternOwner(written,resolved,path,location);
        owners.push({resolved,kind,span:location});return resolved;
      }});}
      catch(error){if(error instanceof TranslationError&&c.is('<'))throw unsupported('generic if-let pattern','generic pattern arguments require checked monomorphization',range(first,c.peek()));throw error;}
      const annotate=node=>{
        if(['ctor','bindOrCtor','routerRecordPattern'].includes(node.k)) {
          const names=node.k==='bindOrCtor'?[node.name]:node.path;
          // The earliest matching source path is this node's own owner, even
          // through parentheses. Never borrow a nested constructor's proof.
          const owner=owners.find(owner=>owner.span.start>=node.span.start&&owner.span.end<=node.span.end&&owner.resolved.length===names.length&&owner.resolved.every((name,index)=>name===names[index]));
          if(owner?.kind)node={...node,registeredGenericOwner:owner.kind};
        }
        if(node.args)node={...node,args:node.args.map(annotate)};
        if(node.alternatives)node={...node,alternatives:node.alternatives.map(annotate)};
        if(node.items)node={...node,items:node.items.map(annotate)};
        if(node.fields)node={...node,fields:node.fields.map(field=>({...field,pattern:annotate(field.pattern)}))};
        return node;
      };
      return annotate(pattern);
    }
    callbackPatternParameter(path) {
      const c=this.cursor,first=c.peek();
      if(c.is('&')&&c.is('(',1))throw unsupported('reference tuple callback pattern','requires actual checked borrowing, not portable reference erasure',first);
      if(!c.is('('))return null;
      let depth=0,stop=c.index;
      for(;stop<c.tokens.length;stop++) {
        const token=c.tokens[stop];
        if(token.kind==='punct'&&depth===0&&['|',',',':'].includes(token.value))break;
        if(token.kind==='punct'&&['(','[','{'].includes(token.value))depth++;
        if(token.kind==='punct'&&[')',']','}'].includes(token.value))depth--;
        if(depth<0||token.kind==='eof')throw unsupported('tuple callback parameter syntax','requires a bounded actual parameter pattern',first);
      }
      // The closing closure bar is not a top-level or-pattern separator. This
      // cursor view bounds the original tokens; no source text is substituted.
      const end=c.tokens[stop];
      class ParameterCursor extends TokenCursor {
        peek(offset=0){return this.index+offset>=stop?{kind:'eof',value:'',start:end.start,end:end.start}:super.peek(offset);}
      }
      const bounded=new ParameterCursor(c.tokens,c.language);bounded.index=c.index;
      this.cursor=bounded;
      let pattern;
      try {pattern=this.controlPattern(path,first);if(bounded.index!==stop)throw unsupported('tuple callback pattern suffix','requires a completely checked parameter pattern',bounded.peek());}
      finally {this.cursor=c;c.index=bounded.index;}
      return {pattern,span:pattern.span};
    }
    primary(path,options) {
      const c=this.cursor;
      if(!c.is('return'))return super.primary(path,options);
      const first=c.next(),value=[';',',','}',')',']'].some(token=>c.is(token))?{k:'unit',span:range(first,first)}:this.expr(path);
      return {k:'routerReturn',value,body:{k:'unit',span:range(first,c.peek())},expressionReturn:true,span:range(first,c.peek())};
    }
    letStatement(path) {
      const c=this.cursor,checkpoint=c.index;
      // Look only for a structural statement-level else. Ordinary let parsing
      // remains with the enclosing frontend, including its mutable bindings.
      let depth=0,hasElse=false;
      for(let offset=1;offset<c.tokens.length-c.index;offset++) {
        const token=c.peek(offset);if(!['punct','identifier'].includes(token.kind))continue;
        const value=token.value;
        if(value===';'&&depth===0)break;
        if(value==='}'&&depth===0)break;
        if(value==='else'&&depth===0){hasElse=true;break;}
        if(['(','[','{'].includes(value))depth++;
        if([')',']','}'].includes(value))depth--;
      }
      if(!hasElse&&!c.is('(',1))return super.letStatement(path);
      if(c.is('mut',1))return super.letStatement(path);
      const first=c.next(),pattern=this.controlPattern(path,first);
      const annotation=c.eat(':')?this.type():undefined;
      c.expect('=','let-else initializer');
      const begin=c.index,subject=this.expr(path);
      if(!c.is('else')) {
        if(!c.tokens[checkpoint+1]||c.tokens[checkpoint+1].value!=='('){c.index=checkpoint;return super.letStatement(path);}
        if(annotation)throw unsupported('tuple binding annotation','requires a separately checked annotated pattern contract',range(first,c.peek()));
        c.expect(';','tuple binding');
        return {k:'routerLetPattern',pattern,subject,span:range(first,c.peek())};
      }
      if(annotation)throw unsupported('let-else type annotation','requires a separate checked pattern annotation contract',range(first,c.peek()));
      const initializer=c.tokens.slice(begin,c.index);
      if(initializer.at(-1)?.kind==='punct'&&initializer.at(-1)?.value==='}')throw unsupported('let-else brace initializer','Rust requires parentheses around an initializer ending in a brace',subject.span);
      depth=0;
      for(const token of initializer) {
        if(token.kind!=='punct')continue;
        if(['&&','||'].includes(token.value)&&depth===0)throw unsupported('let-else lazy boolean initializer','Rust requires parentheses around a lazy boolean initializer',subject.span);
        if(['(','[','{'].includes(token.value))depth++;
        if([')',']','}'].includes(token.value))depth--;
      }
      // LetStatement uses PatternNoTopAlt: parentheses are required around an
      // or-pattern, unlike the if-let grammar handled by controlIf.
      const syntax=c.tokens.slice(checkpoint+1,begin-1);depth=0;
      for(const token of syntax) {
        if(token.kind!=='punct')continue;
        if(token.value==='|'&&depth===0)throw unsupported('let-else top-level or-pattern','requires source parentheses',pattern.span);
        if(['(','[','{'].includes(token.value))depth++;
        if([')',']','}'].includes(token.value))depth--;
      }
      c.next();const otherwise=this.block(path,true);c.expect(';','let-else statement');
      return {k:'routerLetElse',pattern,subject,else:otherwise,span:range(first,c.peek())};
    }
    controlIf(path) {
      const c=this.cursor;
      if(!c.is('if')||!c.is('let',1))return super.controlIf(path);
      const first=c.next();c.next();
      const pattern=this.controlPattern(path,first);
      c.expect('=','if-let condition');
      let depth=0;
      for(let offset=0;offset<c.tokens.length-c.index;offset++) {
        const token=c.peek(offset);
        if(!['punct','identifier'].includes(token.kind))continue;
        if(token.value==='{'&&depth===0)break;
        if(token.value==='&&'&&depth===0)throw unsupported('if-let chain or guard','guard bindings and let chains require separate control lowering',range(first,token));
        if(['(','['].includes(token.value))depth++;
        if([')',']'].includes(token.value))depth--;
      }
      const subject=this.expr(path,{noStruct:true});
      const then=this.block(path,true);
      const otherwise=c.eat('else')?c.is('if')?this.controlIf(path):this.block(path,true):{k:'unit',span:range(first,c.peek())};
      return {k:'if',cond:{k:'routerPatternCondition',subject,pattern,span:range(first,c.peek())},then,else:otherwise,span:range(first,c.peek())};
    }
    ifExpr(path) {return this.controlIf(path);}
  };
}

export function withPatternControlChecker(Base=ControlChecker) {
  return class extends Base {
    resolveType(type,path,span) {
      const resolved=super.resolveType(type,path,span);
      return type?.patternOwnershipRefusal?{...resolved,patternOwnershipRefusal:type.patternOwnershipRefusal}:resolved;
    }
    patternOwner(node,type,path,env) {
      if(type.rustReference) {
        if(node.k==='wild'||node.k==='bind')return node;
        if(node.k==='bindOrCtor') {const actual=this.lookup([node.name],path,node.span);if(!actual||actual.k==='fn')return {k:'bind',name:node.name,span:node.span};}
        throw unsupported('shared aggregate pattern','only a checked reference binder or wildcard is lowered; nested borrowed destructuring requires another profile',node.span);
      }
      const location=node.span,entry=type.kind==='data'?this.items.get(type.name):null;
      if(node.k==='or')return {...node,alternatives:node.alternatives.map(child=>this.patternOwner(child,type,path,env))};
      if(node.k==='routerTuplePattern') {
        if(!entry?.tuple||entry.ctors.length!==1)throw unsupported('if-let tuple pattern','only an actual checked anonymous tuple has tuple ownership',location);
        return {...node,items:node.items.map((child,index)=>this.patternOwner(child,entry.ctors[0].fields[index]?.type??UNIT,path,env))};
      }
      if(!['ctor','bindOrCtor','routerRecordPattern'].includes(node.k))return node;
      const names=node.k==='bindOrCtor'?[node.name]:node.path;
      const actual=names?this.lookup(names,path,location):null;
      const registered=node.registeredGenericOwner;
      if(registered&&(!['Option','Result'].includes(registered)||entry?.standardGeneric?.kind!==registered||!(registered==='Option'?['Some','None']:['Ok','Err']).includes(names?.at(-1))))throw typeError('registered if-let owner differs from its actual checked generic layout',location);
      const standard=Boolean(registered)||names&&typeof this.standardConstructor==='function'&&this.standardConstructor(names,type,path,env,location);
      const record=actual?.k==='data'&&actual.record&&actual.ctors.length===1?actual:null;
      const owner=actual?.k==='ctor'?actual.data:record?.fullName??(standard?type.name:null);
      const name=actual?.k==='ctor'?actual.name:record?.ctors[0].name??names?.at(-1);
      if(!owner) {
        if(node.k==='bindOrCtor'&&(!actual||actual.k==='fn'))return {k:'bind',name:node.name,span:location};
        throw typeError(`if-let pattern ${names?.join('::')} has no checked constructor owner`,location);
      }
      if(owner!==type.name)throw typeError(`if-let constructor belongs to ${owner}, not ${type.name}`,location);
      const ctor=entry?.ctors.find(ctor=>ctor.name===name);
      if(!ctor)throw typeError('if-let constructor requires an actual checked layout',location);
      const named=ctor.ctorStyle==='named';
      if(node.k==='routerRecordPattern'&&!named)throw unsupported('if-let source record pattern','portable tuple ABI fields are not actual Rust named fields',location);
      if(node.k!=='routerRecordPattern'&&named)throw unsupported('if-let source tuple pattern','an actual named constructor requires record pattern syntax',location);
      const normalized={...node,k:node.k==='bindOrCtor'?'ctor':node.k,path:[type.name,name],data:type.name,ctor:name};
      if(node.k==='routerRecordPattern') {
        normalized.fields=node.fields.map(field=>{
          const declared=ctor.fields.find(candidate=>candidate.name===field.name);
          if(!declared)throw typeError(`unknown pattern field ${field.name}`,field.span);
          return {...field,pattern:this.patternOwner(field.pattern,declared.type,path,env)};
        });
      } else normalized.args=(node.args??[]).map((child,index)=>this.patternOwner(child,ctor.fields[index]?.type??UNIT,path,env));
      return normalized;
    }
    patternDomain(type,span,active=new Set()) {
      if(type.rustReference) {
        const reference=type.rustReference,pointee=reference.pointee;
        if(reference.kind!=='shared'||!pointee||type.rustGenericIdentityUnresolved||pointee.kind==='data'&&!this.items.has(pointee.name))throw unsupported('shared pattern reference','requires its actual checked immutable source pointee',span);
        return;
      }
      if(type.patternOwnershipRefusal)throw unsupported('if-let ownership',type.patternOwnershipRefusal,span);
      if(type.kind!=='data')return;
      if(active.has(type.name))throw unsupported('recursive if-let layout','recursive ownership requires a separate contract',span);
      const entry=this.items.get(type.name);
      if(!entry||entry.k!=='data')throw typeError('if-let subject needs its actual checked declaration',span);
      active.add(type.name);
      for(const ctor of entry.ctors)for(const field of ctor.fields) {
        if(field.rustTypeSyntax&&ownershipRefusal(field.rustTypeSyntax.map(value=>({value}))))throw unsupported('if-let ownership','the original field syntax carries unresolved ownership',span);
        this.patternDomain(field.type,span,active);
      }
      active.delete(type.name);
    }
    sharedPatternView(type,active=new Set()) {
      if(type.rustReference&&['data','array'].includes(type.rustReference.pointee?.kind))return true;
      if(type.kind!=='data'||active.has(type.name))return false;
      active.add(type.name);const entry=this.items.get(type.name),result=entry?.ctors.some(ctor=>ctor.fields.some(field=>this.sharedPatternView(field.type,active)))??false;active.delete(type.name);return result;
    }
    patternProjection(subject,projection,targetType) {
      let value=subject;
      for(const [index,field] of projection.entries()) {
        const entry=this.items.get(value.type.name),fields=entry?.ctors.flatMap(ctor=>ctor.fields.filter(candidate=>candidate.name===field))??[];
        const final=index===projection.length-1;
        const wanted=final&&targetType?targetType:fields[0]?.type;
        if(!wanted||!fields.some(candidate=>sameType(candidate.type,wanted))||!final&&fields.some(candidate=>!sameType(candidate.type,wanted)))throw unsupported('conditional field projection','different intermediate layouts require case-specific projections',subject.span);
        // The final type comes from the checked planner's selected constructor,
        // binding or literal; another variant's same-named field cannot change it.
        value={k:'routerPatternProjection',object:value,field,type:wanted,span:subject.span};
      }
      return value;
    }
    patternTest(test,subject) {
      if(test.kind==='always')return {k:'lit',value:true,type:BOOL};
      if(test.kind==='ctor')return {k:'routerPatternTag',object:this.patternProjection(subject,test.projection,{kind:'data',name:test.data}),data:test.data,ctor:test.ctor,type:BOOL};
      if(test.kind==='literal')return {k:'binary',op:'eq',left:this.patternProjection(subject,test.projection,test.type),right:{k:'lit',value:test.value,type:test.type},type:BOOL};
      if(['and','or'].includes(test.kind)) {
        // Plans inspect only a checked immutable subject. Idempotent duplicate
        // tests can be removed without changing observable evaluation; keeping
        // them makes TS's narrowed discriminant reject valid duplicate arms.
        const seen=new Set(),tests=test.tests.filter(test=>{const key=JSON.stringify(test,(_,value)=>typeof value==='bigint'?{$bigint:String(value)}:value);if(seen.has(key))return false;seen.add(key);return true;});
        return tests.map(test=>this.patternTest(test,subject)).reduce((left,right)=>({k:'binary',op:test.kind,left,right,type:BOOL}));
      }
      throw typeError('unchecked pattern test plan',subject.span);
    }
    patternLambda(node,argumentTypes,env,path,expected,context) {
      if(context?.source!=='standard-option'||context.receiverType?.patternOwnershipRefusal)throw unsupported('tuple callback argument ownership','requires an actual by-value standard Option payload; erased iterator/reference inputs are unproven',node.span);
      const receiver=context.receiverType?.kind==='data'?this.items.get(context.receiverType.name):null;
      if(receiver?.standardGeneric?.kind!=='Option'||argumentTypes.length!==1||!sameType(this.resolveType(receiver.standardGeneric.arguments[0],receiver.modulePath,node.span),argumentTypes[0]))throw typeError('tuple callback argument differs from the actual checked Option payload',node.span);
      const payload=argumentTypes[0].kind==='data'?this.items.get(argumentTypes[0].name):null;
      if(!payload?.tuple||payload.generated!=='router-tuple-type')throw unsupported('tuple callback payload','requires an actual anonymous tuple product, not a named aggregate or erased array',node.span);
      let inner=new Map(env),parameters=[],bindings=[],names=new Set();
      for(const [index,param] of node.params.entries()) {
        if(!param.pattern)throw unsupported('mixed tuple callback parameters','requires a separate checked multi-argument callback context',param.span);
        if(param.type)throw unsupported('tuple callback annotation','requires a separately checked annotated pattern contract',param.span);
        const type=argumentTypes[index];this.patternDomain(type,param.span);
        const pattern=this.patternOwner(param.pattern,type,path,env),plan=planPattern(pattern,type,{declarations:this.items,resolveType:type=>this.resolveType(type,path,param.span),span:param.span});
        if(plan.refutable)throw typeError('callback parameters require irrefutable checked patterns',param.span);
        for(const binding of plan.bindings) {
          if(!scalar(binding.type)||binding.type.patternOwnershipRefusal)throw unsupported('tuple callback binding ownership','only immutable scalar bindings have a checked contract',binding.span??param.span);
          if(names.has(binding.name))throw typeError('duplicate callback pattern binding',binding.span??param.span);
          names.add(binding.name);inner=this.bindingEnvironment(inner,binding.name,binding.type,false);
        }
        let name;do{name=this.freshName('ml_pattern_callback_');}while(env.has(name)||names.has(name));
        parameters.push({name,type,plan,span:param.span});
        const variable={k:'var',name,type,span:param.span};
        bindings.push(...plan.bindings.map(binding=>({name:binding.name,value:this.patternProjection(variable,binding.projection,binding.type),span:binding.span??param.span})));
      }
      let body=this.expr(node.body,inner,path,expected);if(expected)body=coerce(body,expected,this.language,node.span);
      checkCallbackCaptures(body,env,names,node.span);
      if(!scalar(body.type)||body.type.patternOwnershipRefusal)throw unsupported('tuple callback result ownership','only immutable scalar callback results have a checked contract',node.span);
      const result=body.type;
      body=bindings.reduceRight((body,binding)=>({k:'let',...binding,body,mutable:false,type:result}),body);
      for(const param of parameters.toReversed()) {
        body={k:'routerDiscard',value:{k:'routerPatternImmutable',object:{k:'var',name:param.name,type:param.type,span:param.span},type:BOOL},body,type:result,span:param.span};
        body={k:'let',name:param.name,value:{k:'routerLambdaInput',position:parameters.indexOf(param),type:param.type},body,mutable:false,type:result,span:param.span};
      }
      return {k:'routerLambda',binding:body,arity:parameters.length,type:{kind:'routerCallback',result},span:node.span,patternControl:{kind:'tuple-callback',parameters:parameters.map(param=>({type:param.type,plan:param.plan})),ownership:'checked-by-value-option'}};
    }
    expr(node,env,path,expected,allowLiteral=false) {
      if(node.k==='match'&&containsExit(node)) {
        env=this.contextEnvironment(node,env,expected);
        if(node.scrutinees.length!==1||containsExit(node.scrutinees[0]))throw unsupported('return-valued match subject','requires one ordinary once-evaluated subject',node.span);
        if(node.rows.some(row=>containsExit(row.body)&&row.body.k!=='routerReturn'))throw unsupported('nested match-arm control','only direct function-return arms have a checked join contract',node.span);
        const subject=this.expr(node.scrutinees[0],env,path);this.patternDomain(subject.type,node.span);
        let join=expected;
        if(!join) {
          const seed=node.rows.find(row=>row.body.k!=='routerReturn');
          if(!seed)throw unsupported('all-return match join','requires an explicit contextual result type',node.span);
          const value=this.expr(seed.body,env,path,undefined,true);
          join=value.type.kind==='literal'?this.defaultNumber():value.type;
        }
        const value=super.expr(node,env,path,join,allowLiteral);
        return {k:'routerControlInitializer',value,type:value.type,span:node.span,patternControl:{kind:'match-return',initializerType:value.type}};
      }
      if(node.k==='let'&&containsExit(node.value)) {
        env=this.contextEnvironment(node,env,expected);
        if(node.value.k!=='match')throw unsupported('return-valued let initializer','requires an ordinary match with direct function-return arms',node.span);
        const declared=node.type?this.resolveType(node.type,path,node.span):undefined;
        let value=this.expr(node.value,env,path,declared);
        if(value.k!=='routerControlInitializer'||!scalar(value.type)||value.type.patternOwnershipRefusal||node.mutable)throw unsupported('match initializer binding ownership','only immutable scalar joins have a checked contract',node.span);
        if(declared)value=coerce(value,declared,this.language,node.span);
        const body=this.expr(node.body,this.bindingEnvironment(env,node.name,value.type,false),path,expected,allowLiteral);
        return {k:'let',name:node.name,value,body,mutable:false,type:body.type,span:node.span};
      }
      if(node.k==='routerLetPattern') {
        env=this.contextEnvironment(node,env,expected);
        if(containsExit(node.subject))throw unsupported('tuple binding subject control','nonlocal exits cannot be emitted through a subject value',node.subject.span);
        const subject=this.expr(node.subject,env,path);
        this.patternDomain(subject.type,node.span);
        const pattern=this.patternOwner(node.pattern,subject.type,path,env);
        const plan=planPattern(pattern,subject.type,{declarations:this.items,resolveType:type=>this.resolveType(type,path,node.span),span:node.span});
        if(plan.refutable)throw typeError('ordinary tuple let requires an irrefutable checked pattern',node.span);
        for(const binding of plan.bindings)if(!immutableBinding(binding.type,this))throw unsupported('tuple aggregate binding','requires immutable scalar/shared-reference or actual standard Copy algebraic bindings',binding.span??node.span);
        let temporary;do{temporary=this.freshName('ml_pattern_');}while(env.has(temporary));
        const variable={k:'var',name:temporary,type:subject.type,span:node.span};
        let inner=new Map(env);
        for(const binding of plan.bindings)inner=this.bindingEnvironment(inner,binding.name,binding.type,false);
        let body=this.expr(node.body,inner,path,expected,allowLiteral);
        body=plan.bindings.reduceRight((body,binding)=>({k:'let',name:binding.name,value:this.patternProjection(variable,binding.projection,binding.type),body,mutable:false,type:body.type,span:binding.span??node.span}),body);
        if(subject.type.kind==='data')body={k:'routerDiscard',value:{k:'routerPatternImmutable',object:variable,type:BOOL,borrowedAggregate:this.sharedPatternView(subject.type)},body,type:body.type,span:node.span};
        return {k:'let',name:temporary,value:subject,body,mutable:false,type:body.type,span:node.span,patternControl:{plan,subjectType:subject.type,kind:'tuple-let'}};
      }
      if(node.k==='routerLetElse') {
        env=this.contextEnvironment(node,env,expected);
        if(!diverges(node.else))throw unsupported('let-else divergence','the failure block must have a checked unconditional return, break or continue',node.else.span??node.span);
        if(containsExit(node.subject))throw unsupported('let-else subject control','nonlocal exits cannot be emitted through a subject value',node.subject.span);
        const subject=this.expr(node.subject,env,path);
        this.patternDomain(subject.type,node.span);
        const pattern=this.patternOwner(node.pattern,subject.type,path,env);
        const plan=planPattern(pattern,subject.type,{declarations:this.items,resolveType:type=>this.resolveType(type,path,node.span),span:node.span});
        for(const binding of plan.bindings)if(!scalar(binding.type))throw unsupported('let-else aggregate binding','only immutable scalar bindings have a checked ownership contract',binding.span??node.span);
        let temporary;do{temporary=this.freshName('ml_pattern_');}while(env.has(temporary));
        const variable={k:'var',name:temporary,type:subject.type,span:node.span};
        const otherwise=this.expr(node.else,new Map(env),path,UNIT);
        if(!sameType(otherwise.type,UNIT))throw typeError('let-else failure block must be a diverging statement block',node.span);
        let inner=new Map(env);
        for(const binding of plan.bindings)inner=this.bindingEnvironment(inner,binding.name,binding.type,false);
        let body=this.expr(node.body,inner,path,expected,allowLiteral);
        body=plan.bindings.reduceRight((body,binding)=>({k:'let',name:binding.name,value:this.patternProjection(variable,binding.projection,binding.type),body,mutable:false,type:body.type,span:binding.span??node.span}),body);
        let condition=this.patternTest(plan.test,variable);
        if(subject.type.kind==='data')condition={k:'binary',op:'and',left:{k:'routerPatternImmutable',object:variable,type:BOOL},right:condition,type:BOOL};
        const conditional={k:'routerIf',cond:condition,then:{k:'unit',type:UNIT},else:otherwise,body,type:body.type,span:node.span};
        return {k:'let',name:temporary,value:subject,body:conditional,mutable:false,type:body.type,span:node.span,patternControl:{plan,subjectType:subject.type,kind:'let-else',divergence:'checked-exit'}};
      }
      if(node.k==='let'&&node.type?.patternOwnershipRefusal) {
        env=this.contextEnvironment(node,env,expected);
        if(containsExit(node.value))throw unsupported('control in binding value','nonlocal exits require statement lowering',node.value.span);
        const declared=this.resolveType(node.type,path,node.span);
        const value=coerce(this.expr(node.value,env,path,declared),declared,this.language,node.span);
        if(node.mutable&&!scalar(value.type))throw unsupported('mutable aggregate','aggregate ownership needs a separate contract',node.span);
        const retained={...value,type:{...value.type,patternOwnershipRefusal:declared.patternOwnershipRefusal}};
        const body=this.expr(node.body,this.bindingEnvironment(env,node.name,retained.type,node.mutable??false),path,expected,allowLiteral);
        return {k:'let',name:node.name,value:retained,body,mutable:node.mutable??false,type:body.type,span:node.span};
      }
      if(!['if','routerIf'].includes(node.k)||node.cond?.k!=='routerPatternCondition') {
        const value=super.expr(node,env,path,expected,allowLiteral);
        if(value.type.kind==='string'&&(node.k==='toString'||node.k==='routerStringOperation'&&['to_ascii_lowercase','to_ascii_uppercase'].includes(node.op)))return {...value,type:{...value.type,patternOwnershipRefusal:'owned String conversion'}};
        return value;
      }
      env=this.contextEnvironment(node,env,expected);
      if(containsExit(node.cond.subject))throw unsupported('if-let subject control','a nonlocal exit cannot be emitted through a subject value expression',node.cond.subject.span);
      const subject=this.expr(node.cond.subject,env,path);
      this.patternDomain(subject.type,node.span);
      const pattern=this.patternOwner(node.cond.pattern,subject.type,path,env);
      const plan=planPattern(pattern,subject.type,{declarations:this.items,resolveType:type=>this.resolveType(type,path,node.span),span:node.span});
      for(const binding of plan.bindings)if(!immutableBinding(binding.type,this))throw unsupported('if-let aggregate binding','requires immutable scalar/shared-reference or actual standard Copy algebraic bindings',binding.span??node.span);
      let temporary;do{temporary=this.freshName('ml_pattern_');}while(env.has(temporary));
      const variable={k:'var',name:temporary,type:subject.type,span:node.span};
      let inner=new Map(env);
      for(const binding of plan.bindings)inner=this.bindingEnvironment(inner,binding.name,binding.type,false);
      const statement=node.k==='routerIf';
      let then=this.expr(node.then,inner,path,statement?UNIT:expected,allowLiteral);
      let otherwise=this.expr(node.else,new Map(env),path,statement?UNIT:then.type.kind==='literal'?expected:then.type,allowLiteral);
      if(then.type.kind==='literal')then=this.expr(node.then,inner,path,otherwise.type.kind==='literal'?this.defaultNumber():otherwise.type);
      if(otherwise.type.kind==='literal')otherwise=this.expr(node.else,new Map(env),path,then.type);
      const resultType=statement?UNIT:expected??then.type;
      then=coerce(then,resultType,this.language,node.span);otherwise=coerce(otherwise,resultType,this.language,node.span);
      then=plan.bindings.reduceRight((body,binding)=>({k:'let',name:binding.name,value:this.patternProjection(variable,binding.projection,binding.type),body,mutable:false,type:body.type,span:binding.span??node.span}),then);
      let condition=this.patternTest(plan.test,variable);
      if(subject.type.kind==='data')condition={k:'binary',op:'and',left:{k:'routerPatternImmutable',object:variable,type:BOOL,borrowedAggregate:this.sharedPatternView(subject.type)},right:condition,type:BOOL};
      const conditional={k:node.k,cond:condition,then,else:otherwise,type:resultType,span:node.span};
      if(statement){conditional.body=this.expr(node.body,env,path,expected,allowLiteral);conditional.type=conditional.body.type;}
      return {k:'let',name:temporary,value:subject,body:conditional,mutable:false,type:conditional.type,span:node.span,patternControl:{plan,subjectType:subject.type}};
    }
  };
}
export function withPatternControlEmitter(Base=ControlEmitter) {
  return class extends Base {
    constructor(program,state) {
      super(program,state);state.reserved.add('ml_pattern_immutable').add('ml_pattern_immutable_view');
    }
    fn(entry) {
      const previous=this.patternFunction,previousView=this.patternViewFunction;
      const contains=node=>node&&typeof node==='object'&&(node.patternControl||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(contains):contains(value))));
      this.patternFunction=Boolean(contains(entry.body));
      const view=node=>node&&typeof node==='object'&&(node.k==='routerPatternImmutable'&&node.borrowedAggregate||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(view):view(value))));
      this.patternViewFunction=Boolean(view(entry.body));
      try{return super.fn(entry);}finally{this.patternFunction=previous;this.patternViewFunction=previousView;}
    }
    patternParameterGuards(param) {
      if(!this.patternFunction||param.type.kind!=='data')return [];
      // An unrelated shared aggregate parameter is a borrowed view even when
      // this function destructures a different, by-value Copy tuple. Its
      // legitimate immutable arrays do not become a Rust Copy receiver.
      if(this.patternViewFunction||param.type.rustReference?.kind==='shared'){
        this.patternViewImmutability=true;return [`ml_pattern_immutable_view(${param.name});`];
      }
      this.patternImmutability=true;
      return [`ml_pattern_immutable(${param.name});`];
    }
    parameterGuard(param) {
      return [...this.patternParameterGuards(param),...super.parameterGuard(param)];
    }
    file() {
      const result=super.file();
      const dependencies=[];
      if(this.patternImmutability)dependencies.push(`import { assertImmutableCopy as ml_pattern_immutable } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'copy-runtime.mjs'))};`);
      if(this.patternViewImmutability)dependencies.push(`import { assertImmutableIterator as ml_pattern_immutable_view } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'iterator-runtime.mjs'))};`);
      const fresh=dependencies.filter(dependency=>!result.preludes.includes(dependency));
      return {...result,preludes:[...fresh,...result.preludes],text:[...fresh,result.text].join('\n')};
    }
    statements(node,unit=false) {
      if(node.k==='let'&&node.value.k==='routerControlInitializer') {
        const label=`ml_control_exit_${this.controlLabels=(this.controlLabels??0)+1}`,previous=this.controlValueTarget;
        this.controlValueTarget={name:node.name,label};
        let initializer;
        try{initializer=this.statements(node.value.value);}finally{this.controlValueTarget=previous;}
        return [`let ${node.name};`,`${label}: {`,...initializer.map(line=>'  '+line),'}',...this.statements(node.body,unit)];
      }
      if(node.k==='routerControlInitializer')return this.statements(node.value,unit);
      if(this.controlValueTarget&&!['let','if','match','routerReturn','routerIf','routerDiscard','routerSet','routerWhile','routerBreak','routerContinue'].includes(node.k)) {
        return [`${this.controlValueTarget.name} = ${this.expr(node)};`,`break ${this.controlValueTarget.label};`];
      }
      return super.statements(node,unit);
    }
    expr(node) {
      // An expression helper may emit its own local statements (for example a
      // guarded match subject). It cannot jump to a surrounding Rust join.
      const previous=this.controlValueTarget;this.controlValueTarget=null;
      try{return this.#patternExpression(node);}finally{this.controlValueTarget=previous;}
    }
    // Each applied mixin owns this dispatch. A virtual helper would re-enter
    // the outer adapter when an already-adapted base delegates to super.expr.
    #patternExpression(node) {
      if(node.k==='routerControlInitializer')throw unsupported('return-valued match emission','requires statement lowering; a value IIFE would erase the function return',node.span);
      if(node.k==='routerPatternImmutable'){if(node.borrowedAggregate){this.patternViewImmutability=true;return `ml_pattern_immutable_view(${this.expr(node.object)})`;}this.patternImmutability=true;return `ml_pattern_immutable(${this.expr(node.object)})`;}
      if(node.k==='routerPatternTag')return `(${this.expr(node.object)}.$ === ${JSON.stringify(node.ctor)})`;
      if(node.k==='routerPatternProjection')return `(${this.expr(node.object)})[${JSON.stringify(node.field)}]`;
      return super.expr(node);
    }
  };
}
export const PatternControlRustParser=withPatternControlParser();
export const PatternControlChecker=withPatternControlChecker();
export const PatternControlEmitter=withPatternControlEmitter();
export const parseRust=source=>new PatternControlRustParser(tokenizeRust(source)).file();
export const checkProgram=surface=>new PatternControlChecker(surface.language,surface.externals??[]).program(surface);
export const emitJavaScript=program=>emitWith(program,PatternControlEmitter);
