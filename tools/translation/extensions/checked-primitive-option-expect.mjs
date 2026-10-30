// Fuse only an actual standard Option expect over a genuine checked fixed
// add/sub/multiply call with the exact existing overflow message. Other Option
// producers, failure messages and arithmetic families need separate rules.
import {withCurrentOptionExpectSource} from './current-option-expect-source.mjs';
import {requireOriginalPrimitiveAssociatedCall} from './primitive-associated-calls.mjs';
import {actualFixedOperand} from './primitive-operators.mjs';
import {sameType} from '../checked-types.mjs';
import {overflowMessage} from '../vendor/meta-language/translation/aborts.js';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
function fail(message,node){throw unsupported('checked primitive Option expect',message,node.span);}
export function checkCurrentPrimitiveOptionExpect(checker,node,env,path,expected){
 requireOriginalPrimitiveAssociatedCall(checker,node);if(node.method!=='expect'||node.owner.length!==3||!['core','std'].includes(node.owner[0])||node.owner[1]!=='option'||node.owner[2]!=='Option')fail('requires the actual qualified standard Option owner',node);
 if(node.args.length!==2)throw typeError('standard Option expect requires its value and literal message',node.span);
 return withCurrentOptionExpectSource(()=>{
  const value=checker.expr(node.args[0],env,path),contract=value.contract,method=contract?.rustPath?.at(-1),operation={checked_add:'add',checked_sub:'sub',checked_mul:'mul',checked_neg:'neg'}[method];
  if(value.k!=='routerHostCall'||!operation||value.args.length!==(operation==='neg'?1:2)||contract.family!=='fixed'||value.id!==contract.id||contract.jsExport!=='rust_fixed_'+method||contract.kind!=='method'||contract.async!==false||contract.pure!==true||contract.constEligible!==true)fail('requires an actual checked primitive arithmetic call',node);
  const left=value.args[0],right=value.args[1],domain=actualFixedOperand(left.type,node.span);if(operation==='neg'){if(domain.signed!==true)fail('unsigned checked negation cannot become a Rust unary signed operation',node);}else actualFixedOperand(right.type,node.span);
  if(operation!=='neg'&&right.type.rustPrimitiveName!==domain.rustPrimitiveName||contract.rustPath.length!==2||contract.rustPath[0]!==domain.rustPrimitiveName||contract.runtimeInstantiation?.factory!=='createFixedIntegerRuntime'||contract.runtimeInstantiation.type?.bits!==domain.bits||contract.runtimeInstantiation.type?.signed!==domain.signed)fail('actual by-value primitive contract or operand identities differ',node);
  const instance=checker.instantiations.fixed(domain,node.span),option=checker.instantiations.option(domain,node.span),fresh=instance.contracts.filter(row=>row.rustPath.at(-1)===method),registered=checker.instantiations.contracts.get(value.id);
  if(fresh.length!==1||fresh[0].id!==value.id||!registered||registered.family!=='fixed'||registered.id!==value.id||registered.jsExport!==contract.jsExport||!sameType(value.type,option)||!sameType(contract.ret,option))fail('requires the current genuine standard Option instantiation',node);
  const message=node.args[1];if(message.k!=='str'||typeof message.value!=='string'||message.value!==overflowMessage(operation))fail('only the exact inert canonical overflow message is admitted',node);
  if(expected&&(!sameType(domain,expected)||expected.rustPrimitiveName&&expected.rustPrimitiveName!==domain.rustPrimitiveName))throw typeError('checked Option expect result differs from its expected source primitive',node.span);
  // Both operands are already independently checked, and the original message
  // is an inert literal. The common checked node evaluates each operand once.
  return operation==='neg'?{k:'unary',op:'neg',arg:left,type:domain,semantics:'checked',span:node.span}:{k:'binary',op:operation,left,right,type:domain,semantics:'checked',span:node.span};
 });
}
