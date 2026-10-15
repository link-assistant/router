// Thin source parser orchestration over the shared completion decisions.
// A completion is private parser state, never a new semantic operation.
import {unsupported} from './diagnostics.js';
import {acceptRustReturnOwnership,readRustConditionalCompletion,readRustCompletionKind} from './rust-completion-rules.js';

export function readRustFunctionCompletion(parser,path) {
  return block(parser,path).expression;
}

function range(from,to) {
  return {start:from.start,end:Math.max(from.end,to?.kind==='eof'?from.end:to.start)};
}

function block(parser,path) {
  const c=parser.cursor,open=c.expect('{','block'),previous=parser.origins.enter();
  try {
    const result=sequence(parser,path,open);
    c.expect('}','block');
    return result;
  } finally {parser.origins.scope=previous;}
}

function sequence(parser,path,open) {
  const c=parser.cursor,bindings=[];
  while(c.is('let'))bindings.push(...parser.letStatement(path));
  const token=c.peek();
  let result;
  if(c.is('}'))throw unsupported('block without a value','the block evaluates to (), which is not a portable result',range(open,token));
  if(c.is('return')) {
    c.next();
    if(c.is(';')||c.is('}'))throw unsupported('return without a value','the selected completion model requires a portable value',range(token,c.peek()));
    const expression=parser.expr(path);
    const origin=parser.origins.origin(expression,path);
    if(!acceptRustReturnOwnership(origin.proven,origin.wrappers.length>0))throw unsupported('Rust return ownership','the selected completion model requires proved direct value ownership; escaping or indirect returns need their own proof',expression.span);
    if(!c.eat(';')&&!c.is('}'))throw parser.fail('expected ; or }');
    if(!c.is('}'))throw unsupported('unreachable continuation','statements after a completed return are not removed by this model',range(token,c.peek()));
    result={kind:'returned',expression};
  } else if(c.is('if')) {
    result=conditional(parser,path,open);
  } else {
    if(['while','loop','for'].includes(token.value)&&token.kind==='identifier')throw unsupported(`${token.value} loop`,'loops over mutable state are outside the portable core; use recursion',range(token,token));
    const expression=parser.expr(path,{statement:true});
    const terminated=Boolean(c.eat(';'));
    if(terminated&&expression.k!=='abort')throw unsupported('expression statement','statements with effects are outside the portable core in function bodies',expression.span);
    if(!c.is('}')) {
      if(expression.k==='abort')throw unsupported('unreachable continuation','statements after an abort are not removed by this model',expression.span);
      if(['if','match','block'].includes(expression.k))throw unsupported('expression statement','a block value must be its last expression',expression.span);
      throw parser.fail('expected }');
    }
    result={kind:expression.k==='abort'?'aborted':'value',expression};
  }
  const origin=parser.origins.origin(result.expression,path);
  result.expression=bindings.reduceRight((body,binding)=>({k:'let',...binding,body,span:binding.span}),result.expression);
  parser.origins.mark(result.expression,origin);
  return result;
}

function conditional(parser,path,open) {
  const c=parser.cursor,token=c.next();
  if(c.is('let'))throw unsupported('if let','write a match',range(token,c.peek()));
  const cond=parser.expr(path,{noStruct:true});
  parser.origins.direct(cond,path,cond.span);
  const then=block(parser,path);
  const hasElse=Boolean(c.eat('else'));
  let otherwise=hasElse?(c.is('if')?conditional(parser,path,open):block(parser,path)):null;
  const terminated=Boolean(c.eat(';')),continuation=!c.is('}');
  const action=readRustConditionalCompletion(then.kind,otherwise?.kind??'',hasElse,continuation);
  switch(action) {
    case 'guarded continuation':
      // Parse only after restoring the branch's scope. Its outer continuation
      // becomes the else expression, never a capture of branch-local names.
      otherwise=sequence(parser,path,open);
      break;
    case 'returned conditional':
    case 'aborted conditional':
      break;
    case 'conditional value':
      if(terminated)throw unsupported('expression statement','statements with effects are outside the portable core in function bodies',range(token,c.peek()));
      break;
    case 'unreachable continuation':
      throw unsupported('unreachable continuation','statements after a completed return are not removed by this model',range(token,c.peek()));
    case 'discarded conditional value':
      throw unsupported('expression statement','a block value must be its last expression',range(token,c.peek()));
    default:
      throw unsupported('guarded return completion','every guard branch must complete a return or abort, with an enclosing continuation; mixed return/value branches need a separate completion proof',range(token,c.peek()));
  }
  const expression={k:'if',cond,then:then.expression,else:otherwise.expression,span:range(token,c.peek())};
  parser.origins.mark(expression,parser.origins.join([parser.origins.origin(then.expression,path),parser.origins.origin(otherwise.expression,path)]));
  return {kind:readRustCompletionKind(action,then.kind,otherwise.kind),expression};
}
