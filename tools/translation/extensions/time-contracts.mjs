// Checked pure std::time::Duration ABI from Rust 1.89 core/time.rs.
import {BOOL,STRING,FLOAT,fixed} from '../vendor/meta-language/translation/types.js';
import {monomorphicTypeName} from '../monomorphic.mjs';
const named=(...path)=>({kind:'named',path}),span={start:0,end:0};
function freeze(value){if(value && typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
const declaration=(name,ctors)=>({k:'data',name,ctors,span,generated:'router-time-contract'}),field=(name,type)=>({name,type}),ctor=(name,type)=>({name,fields:type?[field('field0',type)]:[]});
export const TIME_TYPES=freeze({duration:named('std','time','Duration'),floatError:named('std','time','TryFromFloatSecsError'),floatErrorKind:named('std','time','TryFromFloatSecsErrorKind')});
const {duration:DURATION,floatError:FLOAT_ERROR,floatErrorKind:FLOAT_ERROR_KIND}=TIME_TYPES,U64=fixed(64,false),U32=fixed(32,false),U128=fixed(128,false);
const option=named(monomorphicTypeName('Option',[DURATION])),result=named(monomorphicTypeName('Result',[DURATION,FLOAT_ERROR]));
export const TIME_DATA=freeze([
  {k:'module',name:'std',span,generated:'router-time-contract',items:[{k:'module',name:'time',span,generated:'router-time-contract',items:[
    {...declaration('Duration',[{name:'Duration',fields:[field('secs',U64),field('nanos',U32)]}]),record:true,privateFields:['secs','nanos'],invariant:'0 <= nanos < 1000000000'},
    declaration('TryFromFloatSecsError',[{name:'TryFromFloatSecsError',fields:[field('kind',FLOAT_ERROR_KIND)]}]),
    declaration('TryFromFloatSecsErrorKind',[ctor('Negative'),ctor('OverflowOrNan')]),
  ]}]},
  declaration(monomorphicTypeName('Option',[DURATION]),[ctor('None'),ctor('Some',DURATION)]),
  declaration(monomorphicTypeName('Result',[DURATION,FLOAT_ERROR]),[ctor('Ok',DURATION),ctor('Err',FLOAT_ERROR)]),
]);
const assumptions=[
  'Pinned pure semantic profile: Rust 1.89.0 core/time.rs, stable functions only; clocks and Tokio sleep require separate checked effects.',
  'Duration values are immutable tagged records with own u64 BigInt seconds and normalized u32 BigInt nanoseconds below 1000000000; private fields describe the lowering ABI, not source-level constructor permission.',
  'Checked operations return frozen Rust Option values; ordinary operation overflow and invalid float constructors abort as Rust panics, never synthetic successful Results.',
  'Source f64 conversions preserve IEEE-754 values and nearest-nanosecond ties-to-even; f32 contracts are omitted until the frontend distinguishes binary32.',
  'constEligible means the pinned source declares the function const; pure alone never grants const evaluation to trait or floating constructor methods.',
  'Source-derived fixtures establish the adapter subset; Rust differential execution stays gated on complete JavaScript checks.',
];
const contract=(method,params,ret,{kind='function',constEligible=true,owner='Duration',...extra}={})=>({id:`std_time_${owner==='Duration'?'duration':'float_secs_error'}_${method}`,jsExport:`std_time_${owner==='Duration'?'duration':'float_secs_error'}_${method}`,rustPath:['std','time',owner,method],kind,...(kind==='method'?{receiver:owner==='Duration'?DURATION:FLOAT_ERROR}:{}),async:false,pure:true,constEligible,params,ret,assumptions,...extra});
const method=(name,args,ret,extra={})=>contract(name,[DURATION,...args],ret,{kind:'method',...extra});
export const TIME_CONTRACTS=freeze([
  contract('new',[U64,U32],DURATION),contract('from_secs',[U64],DURATION),...['from_millis','from_micros','from_nanos'].map(name=>contract(name,[U64],DURATION)),
  contract('default',[],DURATION,{constEligible:false,trait:['std','default','Default']}),
  method('is_zero',[],BOOL),method('as_secs',[],U64),...['subsec_millis','subsec_micros','subsec_nanos'].map(name=>method(name,[],U32)),...['as_millis','as_micros','as_nanos'].map(name=>method(name,[],U128)),
  method('abs_diff',[DURATION],DURATION),...['checked_add','checked_sub'].map(name=>method(name,[DURATION],option)),...['checked_mul','checked_div'].map(name=>method(name,[U32],option)),
  ...['saturating_add','saturating_sub'].map(name=>method(name,[DURATION],DURATION)),method('saturating_mul',[U32],DURATION),
  ...[['add','Add',DURATION],['sub','Sub',DURATION],['mul','Mul',U32],['div','Div',U32]].map(([name,trait,argument])=>method(name,[argument],DURATION,{constEligible:false,trait:['std','ops',trait]})),
  ...['eq','lt','le','gt','ge'].map(name=>method(name,[DURATION],BOOL,{constEligible:false,trait:['std','cmp',name==='eq'?'PartialEq':'PartialOrd']})),
  ...['min','max'].map(name=>method(name,[DURATION],DURATION,{constEligible:false,trait:['std','cmp','Ord'],ownership:'checked immutable Copy values; selected operand identity retained',tieOperand:name==='min'?'self':'other'})),
  method('as_secs_f64',[],FLOAT),method('div_duration_f64',[DURATION],FLOAT),
  contract('try_from_secs_f64',[FLOAT],result,{constEligible:false}),contract('from_secs_f64',[FLOAT],DURATION,{constEligible:false}),...['mul_f64','div_f64'].map(name=>method(name,[FLOAT],DURATION,{constEligible:false})),
  contract('to_string',[FLOAT_ERROR],STRING,{kind:'method',owner:'TryFromFloatSecsError',constEligible:false,trait:['std','string','ToString']}),
]);
export const TIME_CONSTANTS=freeze([
  {id:'std_time_duration_ZERO',jsExport:'std_time_duration_ZERO',rustPath:['std','time','Duration','ZERO'],type:DURATION,pure:true,constEligible:true,value:{$:'Duration',secs:0n,nanos:0n}},
  {id:'std_time_duration_MAX',jsExport:'std_time_duration_MAX',rustPath:['std','time','Duration','MAX'],type:DURATION,pure:true,constEligible:true,value:{$:'Duration',secs:18446744073709551615n,nanos:999999999n}},
]);
export const timeContracts=path=>TIME_CONTRACTS.filter(contract=>contract.rustPath.join('::')===(Array.isArray(path)?path.join('::'):path));
