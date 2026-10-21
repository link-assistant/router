type RustResult<T,E> = Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:E}>;
type Success<R extends RustResult<unknown,unknown>> = Extract<R,{$:'Ok'}>['field0'];
type Failure<R extends RustResult<unknown,unknown>> = Extract<R,{$:'Err'}>['field0'];
export declare function collectResult<R extends RustResult<unknown,unknown>>(values: Iterable<R>): RustResult<ReadonlyArray<Success<R>>,Failure<R>>;
export declare function mapResultError<R extends RustResult<unknown,unknown>,F>(value: R, callback: (error: Failure<R>) => F): RustResult<Success<R>,F>;
