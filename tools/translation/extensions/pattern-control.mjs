// Structural if-let lowering over checked Rust layouts. Vendor source, bodies
// and shared frontend integration are unchanged; Data may adopt these classes.
import {ControlRustParser,ControlChecker,ControlEmitter} from './control.mjs';
import {emitWith} from './core.mjs';
import {tokenizeRust} from './lexical.mjs';
import {parseBindingPattern} from '../pattern-syntax.mjs';
import {planPattern} from '../pattern-bindings.mjs';
import {BOOL,UNIT,sameType} from '../vendor/meta-language/translation/types.js';
import {coerce} from '../vendor/meta-language/translation/check.js';
import {TranslationError,typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const range=(start,end)=>({start:start.start,end:end.end});
const containsExit=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(containsExit):containsExit(value))));
const scalar=type=>['fixed','bool','string','unit'].includes(type?.kind);
const owned=new Set(['Box','Vec','String','Arc','Rc','Cell','RefCell','UnsafeCell','Mutex','RwLock','Pin','ManuallyDrop','MaybeUninit']);
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
    controlIf(path) {
      const c=this.cursor;
      if(!c.is('if')||!c.is('let',1))return super.controlIf(path);
      const first=c.next();c.next();
      let pattern;
      try {pattern=parseBindingPattern(c,{resolvePath:segments=>this.resolve(segments,path)});}
      catch(error){if(error instanceof TranslationError&&c.is('<'))throw unsupported('generic if-let pattern','generic pattern arguments require checked monomorphization',range(first,c.peek()));throw error;}
      c.expect('=','if-let condition');
      let depth=0;
      for(let offset=0;offset<c.tokens.length-c.index;offset++) {
        const token=c.peek(offset);
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
      const location=node.span,entry=type.kind==='data'?this.items.get(type.name):null;
      if(node.k==='or')return {...node,alternatives:node.alternatives.map(child=>this.patternOwner(child,type,path,env))};
      if(node.k==='routerTuplePattern') {
        if(!entry?.tuple||entry.ctors.length!==1)throw unsupported('if-let tuple pattern','only an actual checked anonymous tuple has tuple ownership',location);
        return {...node,items:node.items.map((child,index)=>this.patternOwner(child,entry.ctors[0].fields[index]?.type??UNIT,path,env))};
      }
      if(!['ctor','bindOrCtor','routerRecordPattern'].includes(node.k))return node;
      const names=node.k==='bindOrCtor'?[node.name]:node.path;
      const actual=names?this.lookup(names,path,location):null;
      const standard=names&&this.standardConstructor(names,type,path,env,location);
      const record=actual?.k==='data'&&actual.record&&actual.ctors.length===1?actual:null;
      const owner=actual?.k==='ctor'?actual.data:record?.fullName??(standard?type.name:null);
      const name=actual?.k==='ctor'?actual.name:record?.ctors[0].name??names?.at(-1);
      if(!owner) {
        if(node.k==='bindOrCtor'&&!actual)return {k:'bind',name:node.name,span:location};
        throw typeError(`if-let pattern ${names?.join('::')} has no checked constructor owner`,location);
      }
      if(owner!==type.name)throw typeError(`if-let constructor belongs to ${owner}, not ${type.name}`,location);
      const ctor=entry?.ctors.find(ctor=>ctor.name===name);
      if(!ctor)throw typeError('if-let constructor requires an actual checked layout',location);
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
      if(['and','or'].includes(test.kind))return test.tests.map(test=>this.patternTest(test,subject)).reduce((left,right)=>({k:'binary',op:test.kind,left,right,type:BOOL}));
      throw typeError('unchecked pattern test plan',subject.span);
    }
    expr(node,env,path,expected,allowLiteral=false) {
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
      for(const binding of plan.bindings)if(!scalar(binding.type))throw unsupported('if-let aggregate binding','only immutable scalar bindings are lowered; aggregate moves and aliases need ownership semantics',binding.span??node.span);
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
      if(subject.type.kind==='data')condition={k:'binary',op:'and',left:{k:'routerPatternImmutable',object:variable,type:BOOL},right:condition,type:BOOL};
      const conditional={k:node.k,cond:condition,then,else:otherwise,type:resultType,span:node.span};
      if(statement){conditional.body=this.expr(node.body,env,path,expected,allowLiteral);conditional.type=conditional.body.type;}
      return {k:'let',name:temporary,value:subject,body:conditional,mutable:false,type:conditional.type,span:node.span,patternControl:{plan,subjectType:subject.type}};
    }
  };
}
export function withPatternControlEmitter(Base=ControlEmitter) {
  return class extends Base {
    constructor(program,state) {
      super(program,state);state.reserved.add('ml_pattern_immutable');
    }
    fn(entry) {
      const previous=this.patternFunction;
      const contains=node=>node&&typeof node==='object'&&(node.patternControl||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(contains):contains(value))));
      this.patternFunction=Boolean(contains(entry.body));
      try{return super.fn(entry);}finally{this.patternFunction=previous;}
    }
    parameterGuard(param) {
      if(this.patternFunction&&param.type.kind==='data') {
        this.patternImmutability=true;
        return [`ml_pattern_immutable(${param.name});`,...super.parameterGuard(param)];
      }
      return super.parameterGuard(param);
    }
    file() {
      const result=super.file();
      if(!this.patternImmutability)return result;
      const path=(this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'copy-runtime.mjs');
      const dependency=`import { assertImmutableCopy as ml_pattern_immutable } from ${JSON.stringify(path)};`;
      return {...result,preludes:[dependency,...result.preludes],text:dependency+'\n'+result.text};
    }
    expr(node) {
      if(node.k==='routerPatternImmutable'){this.patternImmutability=true;return `ml_pattern_immutable(${this.expr(node.object)})`;}
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
