// Checked semantic contracts for generic Rust standard-library effects.
// These declarations describe value/error layouts, never repository functions.
import {monomorphicTypeName} from '../monomorphic.mjs';
import {STRING,UNIT,fixed,array} from '../vendor/meta-language/translation/types.js';
const named = (...path) => ({kind:'named',path});
const span = {start:0,end:0};
const OPTION_I32=monomorphicTypeName('Option',[fixed(32,true)]);
const RESULT_STRING_IO=monomorphicTypeName('Result',[STRING,named('std','io','Error')]);
const RESULT_UNIT_IO=monomorphicTypeName('Result',[UNIT,named('std','io','Error')]);
const RESULT_STRING_ENV=monomorphicTypeName('Result',[STRING,named('std','env','VarError')]);
function freeze(value) {if (value && typeof value === 'object') {for (const item of Object.values(value)) freeze(item);Object.freeze(value);}return value;}
const declaration = (name,ctors,standardGeneric) => ({k:'data',name,ctors,span,generated:'router-standard-effect-contract',...(standardGeneric?{standardGeneric}:{})});
const constructor = (name,fields = []) => ({name,fields});
const field = (type,name='field0') => ({name,type});
const result = (name,ok,error) => declaration(name,[constructor('Ok',[field(ok)]),constructor('Err',[field(error)])],{kind:'Result',arguments:[ok,error]});

export const EFFECT_DATA = freeze([
  declaration(OPTION_I32,[constructor('None'),constructor('Some',[field(fixed(32,true))])],{kind:'Option',arguments:[fixed(32,true)]}),
  {k:'module',name:'std',span,items:[
    {k:'module',name:'io',span,items:[declaration('Error',[constructor('IoError',[
      field(STRING,'kind'),field(STRING,'message'),field(named('crate',OPTION_I32),'raw_os_error'),
    ])])]},
    {k:'module',name:'ffi',span,items:[declaration('OsString',[constructor('OsString',[field(array(fixed(8,false)),'bytes')])])]},
    {k:'module',name:'env',span,items:[declaration('VarError',[
      constructor('NotPresent'),constructor('NotUnicode',[field(named('crate','std','ffi','OsString'))]),
    ])]},
  ]},
  result(RESULT_STRING_IO,STRING,named('crate','std','io','Error')),
  result(RESULT_UNIT_IO,UNIT,named('crate','std','io','Error')),
  result(RESULT_STRING_ENV,STRING,named('crate','std','env','VarError')),
]);
const filesystemAssumptions = [
  'Rust string paths are Unicode scalar strings; opaque/non-Unicode OsStr paths need a separate checked capability.',
  'Filesystem effects use the injected capability or the Node standard filesystem adapter; no Rust executable is invoked.',
  'Operating-system failures return immutable Rust Result values; malformed capability output or invalid typed arguments are adapter faults.',
  'raw_os_error uses the POSIX errno constant when available, represented as a signed-i32 OS code; Windows libuv errno is not the original Win32 value and remains None.',
];
const environmentAssumptions = [
  'The default Node environment capability covers Unicode scalar keys and values; a byte-valued capability represents NotUnicode explicitly.',
  'Environment mutation uses an injected per-invocation capability when provided; default mutation changes this process environment.',
  'Rust 2024 unsafe-environment call-site authorization remains a frontend obligation; this contract does not erase unsafe syntax.',
];
function contract(id,rustPath,async,params,ret,assumptions) {return {id,jsExport:id,rustPath:rustPath.split('::'),async,params,ret,assumptions};}
export const EFFECT_CONTRACTS = freeze([
  ...['std','tokio'].flatMap(namespace=>[
    contract(`${namespace}_fs_read_to_string`,`${namespace}::fs::read_to_string`,namespace === 'tokio',[STRING],named(RESULT_STRING_IO),[
      ...filesystemAssumptions,'Read bytes are decoded as strict UTF-8; invalid sequences return InvalidData and the leading BOM remains part of the Rust String.',
    ]),
    contract(`${namespace}_fs_write`,`${namespace}::fs::write`,namespace === 'tokio',[STRING,STRING],named(RESULT_UNIT_IO),[
      ...filesystemAssumptions,'The string-content overload creates or truncates the file; byte-array overloads require separate checked instantiation.',
    ]),
    contract(`${namespace}_fs_create_dir_all`,`${namespace}::fs::create_dir_all`,namespace === 'tokio',[STRING],named(RESULT_UNIT_IO),filesystemAssumptions),
    contract(`${namespace}_fs_remove_file`,`${namespace}::fs::remove_file`,namespace === 'tokio',[STRING],named(RESULT_UNIT_IO),filesystemAssumptions),
  ]),
  contract('std_env_var','std::env::var',false,[STRING],named(RESULT_STRING_ENV),environmentAssumptions),
  contract('std_env_set_var','std::env::set_var',false,[STRING,STRING],UNIT,environmentAssumptions),
  contract('std_env_remove_var','std::env::remove_var',false,[STRING],UNIT,environmentAssumptions),
]);
export const effectContract = rustPath => EFFECT_CONTRACTS.find(contract=>contract.rustPath.join('::') === (Array.isArray(rustPath) ? rustPath.join('::') : rustPath));
