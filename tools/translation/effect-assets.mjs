import { readFileSync } from 'node:fs';
import { FILESYSTEM_EFFECT_CONTRACTS as EFFECT_CONTRACTS } from './extensions/filesystem-effects-contracts.mjs';
import { effectData, checkProgram } from './extensions/effects.mjs';
import { tsType } from './translate.mjs';
export function effectRuntimeAssets() {
  const program=checkProgram({language:'Rust',items:effectData(),main:null});
  const dataTypes=[...program.declarations.values()].filter(entry=>entry.k === 'data');
  const resolved=type=>type.kind === 'named'?{kind:'data',name:type.path.join('.')}:type;
  const declarations=EFFECT_CONTRACTS.map(contract=>`export declare function ${contract.jsExport}(${contract.params.map((type,index)=>`arg${index}: ${tsType(type,dataTypes)}`).join(', ')}): ${contract.async?'Promise<':''}${tsType(resolved(contract.ret),dataTypes)}${contract.async?'>':''};`).join('\n');
  return {javascript:readFileSync(new URL('./extensions/filesystem-effects-runtime.mjs',import.meta.url),'utf8'),declarations:(`// Generated from checked host-effect value contracts.\n${declarations}\nexport declare function withEffectCapabilities<T>(capabilities: unknown, operation: () => T): T;\n`)+'\n'+EFFECT_CONTRACTS.filter(row=>row.async).map(row=>`export declare function deferFilesystemEffect(operation: ${JSON.stringify(row.id)}, args: readonly [${row.params.map(type=>tsType(type,dataTypes)).join(', ')}], capability?: unknown): PromiseLike<${tsType(resolved(row.ret),dataTypes)}>;`).join('\n')+'\nexport declare function deferFilesystemFlow<T>(operation: () => PromiseLike<T>): PromiseLike<T>;\n'};
}
