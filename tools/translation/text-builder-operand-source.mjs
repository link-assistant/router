// Closed borrowed suffix source composition; every original whole caller must
// independently establish actual bindings, types, loans, effects and emission.
import {readTextAliasOperand} from './text-local-argument-source.mjs';
import {readTextCoreCallSource} from './text-core-call-source.mjs';
import {readPrimitiveSourceBindingRole} from './primitive-core-call-source.mjs';
import {readCarrierConditionalSource} from './carrier-conditional-source.mjs';
import {readParenthesizedSourceOperandTokens} from './qualified-source-call-tokens.mjs';
export function readTextBuilderBorrowedOperandSource(rows,bindings){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;let work=0;const scope={get:name=>readPrimitiveSourceBindingRole(bindings.get(name))};
 function selected(part,depth){
  if(++work>256||depth>8||!part.length)return null;
  const original=readTextAliasOperand(part,bindings);if(original?.kind==='str')return {kind:'payload',domain:'str',bridge:original.bridge??'complete-original-borrowed-text-source',binding:original.binding};
  const grouped=readParenthesizedSourceOperandTokens(part);if(grouped)return selected(grouped,depth+1);
  if(part.length===2&&part[0].text==='&'&&part[1].type==='ident'&&bindings.get(part[1].text)==='text-owned')return {kind:'payload',domain:'str',binding:part[1].text,bridge:'complete-original-shared-owned-text-borrow-source'};
  const core=readTextCoreCallSource(part,bindings);if(core?.kind==='str')return {kind:'payload',domain:'str',binding:core.binding,bridge:core.bridge};
  return readCarrierConditionalSource(part,scope,{kind:'payload',domain:'str'},{readExpression:branch=>selected(branch,depth+1)});
 }
 const result=selected(rows,0);return result?{...result,operandsUnevaluated:true,originalSourceRetained:true,loanProved:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}

// Reuse the original text substitution engine for a complete suffix expression.
// Temporary wrapper types select only source candidates, never original loans.
export function proposeTextBuilderBorrowedOperandSource(source,rows,bindings){
 if(typeof source!=='string'||!Array.isArray(rows)||!rows.length||rows.length>128)return null;const original=source.slice(rows[0].start,rows.at(-1).end);if(!original.includes('.')||original.length>65536)return null;
 const scope=new Map();for(const [name,domain]of bindings){const role=readPrimitiveSourceBindingRole(domain);if(role)scope.set(name,role);}const proposal=proposeCallbackTextBodySource(original,scope,{expectedOutput:'str'});if(!proposal||proposal.before.source!==original)return null;const replacement=proposal.after.source,tokens=rustTokens(replacement).filter(row=>row.type!=='comment'),selected=readTextBuilderBorrowedOperandSource(tokens,bindings);if(!selected)return null;
 const before=transportConcreteSyntaxMeta(proposal.before.meta).source,after=transportConcreteSyntaxMeta(proposal.after.meta).source;if(before!==original||after!==replacement)throw new TypeError('Complete original builder suffix source history differs');let inverse=replacement;for(const part of [...proposal.mapping].reverse())if(part.kind==='substitution'){if(inverse.slice(...part.after)!==part.replacement)throw new TypeError('Complete original builder suffix replacement changed');inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);}if(inverse!==original)throw new TypeError('Complete original builder suffix source inverse differs');const wrapper=transportConcreteSyntaxMeta(proposal.wrapper.concreteSyntax);if(wrapper.source!==proposal.wrapper.source)throw new TypeError('Complete original builder suffix wrapper source differs');const sourceCells=wrapper.document.nodes.length+rows.length+tokens.length;if(sourceCells>200000)throw new RangeError('Complete original builder suffix source-cell bound');
 return {...selected,replacement,originalSourceRetained:true,nestedTextSource:{before:proposal.before,after:proposal.after,mapping:proposal.mapping,trace:proposal.trace,wrapper:proposal.wrapper,selections:proposal.selections,inverse:original,temporaryTypesAreSourceData:true,originalLoanProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false},sourceCells};
}
import {proposeCallbackTextBodySource} from './callback-text-body-source.mjs';
import {rustTokens} from './rust-structure.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
