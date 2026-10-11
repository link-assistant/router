// Inherent shared/static methods resolve to checked declarations. Extraction
// supplies no runtime body: receiver fields, calls, arguments and results check.
import {EffectRustParser,EffectChecker,emitJavaScript} from './effects.mjs';
import {tokenizeRust} from './lexical.mjs';
import {typeError,unsupported,TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
export class MethodRustParser extends EffectRustParser {
  method(object,method,args,span) {
    let fallback=null,refusal=null;
    try {fallback=super.method(object.k === 'routerDispatchMethod' && object.fallback?.k === 'routerStringView' ? object.fallback : object,method,args,span);}catch(error){if(!(error instanceof TranslationError))throw error;refusal={kind:error.kind,reason:error.reason,span:error.span};}
    return {k:'routerDispatchMethod',object,method:method.value,args,fallback,refusal,span};
  }
}
export class MethodChecker extends EffectChecker {
  resolvedMethod(type,name,receiver) {
    if(type.kind !== 'data')return null;
    const candidates=[...this.items.values()].filter(entry=>entry.k === 'fn' && entry.impl?.method === name && (entry.impl.receiver === receiver || receiver==='shared' && entry.impl.receiver==='value' && entry.impl.copyCertificate?.verified) && this.resolveType(entry.impl.type,entry.modulePath,entry.span).name === type.name);
    if(candidates.length > 1)throw typeError(`ambiguous inherent method ${type.name}::${name}`,candidates[0].span);
    return candidates[0] ?? null;
  }
  methodCall(entry,object,args,env,path,expected,span) {
    // Feed the original surface arguments into normal checking, preserving
    // receiver-first argument order without evaluating the receiver twice.
    return super.application({k:'name',path:['crate',...entry.fullName.split('.')]},object?[object,...args]:args,env,path,expected,span);
  }
  application(head,args,env,path,expected,span) {
    if(head.k === 'name' && head.path.length > 1) {
      let type;
      try {type=this.resolveType({kind:'named',path:head.path.slice(0,-1)},path,span);}catch(error){if(!(error instanceof TranslationError))throw error;}
      if(type) {const entry=this.resolvedMethod(type,head.path.at(-1),null);if(entry)return this.methodCall(entry,null,args,env,path,expected,span);}
    }
    return super.application(head,args,env,path,expected,span);
  }
  expr(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(['routerDispatchMethod','routerIteratorOperation'].includes(node.k)) {
      if (node.k === 'routerDispatchMethod' && node.object.k === 'routerDispatchMethod' && node.object.fallback?.k === 'routerStringView') {
        const subject = this.expr(node.object.object,env,path);
        if (subject.type.kind === 'string' && node.fallback) return this.expr(node.fallback,env,path,expected,allowLiteral);
      }
      const object=this.expr(node.object,env,path);
      const method=node.method ?? node.op,entry=this.resolvedMethod(object.type,method,'shared');
      if(entry)return this.methodCall(entry,node.object,node.args,env,path,expected,node.span);
      if(node.k === 'routerDispatchMethod') {
        if(object.type.kind === 'data' && ['clone','to_owned','as_str'].includes(method)) throw unsupported(`aggregate method ${method}`, 'trait or inherent behavior requires a checked implementation', node.span);
        if(node.refusal)throw new TranslationError(node.refusal.kind,node.refusal.reason,node.refusal.span);
        return this.expr(node.fallback,env,path,expected,allowLiteral);
      }
    }
    return super.expr(node,env,path,expected,allowLiteral);
  }
}
export const parseRust=(source,{shadowedEffectRoots}={})=>{const parser=new MethodRustParser(tokenizeRust(source));parser.shadowedEffectRoots=shadowedEffectRoots;return parser.file();};
export const checkProgram=surface=>new MethodChecker(surface.language,surface.externals??[]).program(surface);
export {emitJavaScript};
