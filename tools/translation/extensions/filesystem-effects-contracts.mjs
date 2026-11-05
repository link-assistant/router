// Additive standard-library contracts; the original eleven rows stay intact.
import {EFFECT_DATA,EFFECT_CONTRACTS} from './effects-contracts.mjs';
import {STRING,UNIT,fixed} from '../checked-types.mjs';
import {sourceVector} from './source-contract-types.mjs';
import {monomorphicTypeName} from '../monomorphic.mjs';

const freeze=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
const BYTE={...fixed(8,false),rustPrimitiveName:'u8'},BYTES=sourceVector(BYTE);
const ERROR={kind:'named',path:['std','io','Error']},ERROR_FIELD={kind:'named',path:['crate','std','io','Error']};
const RESULT_BYTES=monomorphicTypeName('Result',[BYTES,ERROR]);
const UNIT_RESULT=EFFECT_CONTRACTS.find(row=>row.id==='std_fs_remove_file').ret;
const assumptions=[
 'Only freshly resolved std/tokio paths select these operations; local lookalikes, unknown overloads and unresolved roots remain refused.',
 'Unicode scalar string paths retain NUL rejection and the original operating-system Result/error adapter; non-Unicode OsStr inputs remain outside this contract.',
 'Byte vectors use the checked Vec<u8> layout: immutable arrays of BigInt values from 0n through 255n, never JS text decoding or number coercion.',
 'Async operations are polled through the existing lazy-future lowering; injected capabilities remain invocation scoped across awaits.',
 'Filesystem ordering, symlink treatment and errors come from the selected native adapter; adapter faults remain exceptions.',
];
const operations=[
 ['read',1,{kind:'named',path:[RESULT_BYTES]}],
 ['rename',2,UNIT_RESULT],
 ['create_dir',1,UNIT_RESULT],
 ['remove_dir',1,UNIT_RESULT],
 ['remove_dir_all',1,UNIT_RESULT],
 ['hard_link',2,UNIT_RESULT],
];
export const FILESYSTEM_EFFECT_DATA=freeze([
 ...EFFECT_DATA,
 {k:'data',name:RESULT_BYTES,ctors:[{name:'Ok',fields:[{name:'field0',type:BYTES}]},{name:'Err',fields:[{name:'field0',type:ERROR_FIELD}]}],span:{start:0,end:0},generated:'router-standard-effect-contract',standardGeneric:{kind:'Result',arguments:[BYTES,ERROR_FIELD]}},
]);
export const FILESYSTEM_EFFECT_CONTRACTS=freeze([
 ...EFFECT_CONTRACTS,
 ...['std','tokio'].flatMap(namespace=>operations.map(([method,arity,ret])=>({
  id:namespace+'_fs_'+method,jsExport:namespace+'_fs_'+method,rustPath:[namespace,'fs',method],async:namespace==='tokio',params:Array.from({length:arity},()=>STRING),ret,assumptions,
 }))),
]);
export const filesystemEffectContract=path=>FILESYSTEM_EFFECT_CONTRACTS.find(row=>row.rustPath.join('::')===(Array.isArray(path)?path.join('::'):path));
export const FILESYSTEM_EFFECT_OPERATION_IDS=freeze(operations.flatMap(([method])=>['std_fs_'+method,'tokio_fs_'+method]));
