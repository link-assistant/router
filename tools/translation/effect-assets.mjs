import { readFileSync } from 'node:fs';
import { EFFECT_CONTRACTS } from './extensions/effects-contracts.mjs';
import { effectData, checkProgram } from './extensions/effects.mjs';
import { tsType } from './translate.mjs';
export function effectRuntimeAssets() {
  const program=checkProgram({language:'Rust',items:effectData(),main:null});
  const dataTypes=[...program.declarations.values()].filter(entry=>entry.k === 'data');
  const resolved=type=>type.kind === 'named'?{kind:'data',name:type.path.join('.')}:type;
  const declarations=EFFECT_CONTRACTS.map(contract=>`export declare function ${contract.jsExport}(${contract.params.map((type,index)=>`arg${index}: ${tsType(type,dataTypes)}`).join(', ')}): ${contract.async?'Promise<':''}${tsType(resolved(contract.ret),dataTypes)}${contract.async?'>':''};`).join('\n');
  return {javascript:readFileSync(new URL('./extensions/effects-runtime.mjs',import.meta.url),'utf8'),declarations:`// Generated from checked host-effect value contracts.\n${declarations}\nexport declare function withEffectCapabilities<T>(capabilities: unknown, operation: () => T): T;\n`};
}
