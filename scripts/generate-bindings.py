#!/usr/bin/env python3
"""Generate package versions, exported operation types, and namespace parity data."""
import argparse
import json
import keyword
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def camel(value): return re.sub(r'[-_]([a-z])', lambda match:match[1].upper(), value)
def pyname(value):
    value=value.replace('-','_')
    return value+'_' if keyword.iskeyword(value) else value

def main():
    parser=argparse.ArgumentParser(__doc__); parser.add_argument('--check',action='store_true'); args=parser.parse_args()
    catalog=json.loads((ROOT/'schemas/operation-catalog.v1.json').read_text())
    spec=json.loads((ROOT/'openapi/router.yaml').read_text())
    components=spec['components']['schemas']
    def ts(schema):
        if isinstance(schema,bool): return 'JsonValue' if schema else 'never'
        if '$ref' in schema: return schema['$ref'].split('/')[-1]
        if 'const' in schema: return json.dumps(schema['const'])
        if 'enum' in schema: return ' | '.join(json.dumps(value) for value in schema['enum'])
        for union in ['anyOf','oneOf']:
            if union in schema:return '('+' | '.join(ts(value) for value in schema[union])+')'
        kind=schema.get('type')
        if isinstance(kind,list):return ' | '.join(ts({**schema,'type':part}) for part in kind)
        if kind=='array':return f'ReadonlyArray<{ts(schema.get("items",{}))}>'
        if kind=='object' or 'properties' in schema:
            required=schema.get('required',[])
            fields=[json.dumps(name)+('' if name in required else '?')+': '+ts(value)+';' for name,value in schema.get('properties',{}).items()]
            if schema.get('additionalProperties') not in [False,None]: fields.append('[key: string]: JsonValue;')
            return '{ '+' '.join(fields)+' }' if fields else 'Record<string, JsonValue>'
        return {'string':'string','boolean':'boolean','integer':'number','number':'number','null':'null'}.get(kind,'JsonValue')
    declarations=['// Generated from the canonical Rust command and JSON Schema catalogs.',
        'export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };',
        'export interface Result<T = JsonValue> { schema: string; operation: string; success: boolean; exit_code: number; data: T; diagnostics: string[]; }',
        'export interface Invocation { env?: Record<string, string>; stdin?: string | Uint8Array; deadlineMs?: number; signal?: AbortSignal; cwd?: string; maxOutputBytes?: number; }',
        'export interface RouterOptions extends Invocation { binary?: string; allowDownload?: boolean; allowVersionMismatch?: boolean; cacheDir?: string; }',
        'export class RouterError extends Error { code: string; exitCode: number | null; stderr: string; result: Result | null; }',
        'export const catalog: { version: string; operations: ReadonlyArray<{ name: string; schema: string; command: string[]; options: unknown[] }> };',
        'export const version: string; export const operationNames: readonly string[];']
    for name,schema in sorted(components.items()):
        if name=='OperationResult':continue
        declarations.append(f'export type {name} = {ts(schema)};')
    tree={}; pytrees={}
    py=['# Generated operation signatures, with Python keyword aliases.',
        'from typing import Any, Callable, Literal, Mapping, NoReturn, TypedDict', 'from pathlib import Path',
        'class OperationResult(TypedDict):','    schema: str','    operation: str','    success: bool','    exit_code: int','    data: Any','    diagnostics: list[str]',
        'class RouterError(RuntimeError):','    code: str','    exit_code: int | None','    stderr: str','    result: OperationResult | None',
        '__version__: str','operation_names: tuple[str, ...]','catalog: dict[str, Any]']
    def pytype(schema):
        if isinstance(schema,bool): return 'Any' if schema else 'NoReturn'
        if '$ref' in schema: return schema['$ref'].split('/')[-1]
        if 'const' in schema: return 'Literal['+repr(schema['const'])+']'
        if 'enum' in schema: return 'Literal['+', '.join(repr(value) for value in schema['enum'])+']'
        for union in ['anyOf','oneOf']:
            if union in schema: return ' | '.join(pytype(value) for value in schema[union])
        kind=schema.get('type')
        if isinstance(kind,list): return ' | '.join(pytype({**schema,'type':part}) for part in kind)
        if kind=='array': return 'list['+pytype(schema.get('items',{}))+']'
        return {'string':'str','boolean':'bool','integer':'int','number':'float','null':'None','object':'dict[str, Any]'}.get(kind,'Any')
    for name,schema in sorted(components.items()):
        if name=='OperationResult': continue
        if schema.get('properties'):
            fields=', '.join(repr(key)+': '+repr(pytype(value)) for key,value in schema['properties'].items())
            py.append(name+' = TypedDict('+repr(name)+', {'+fields+'}, total=False)')
        else: py.append(name+' = '+pytype(schema))
    for op in catalog['operations']:
        schema=json.loads((ROOT/'schemas'/ (op['name'].replace('.','-')+'.v1.json')).read_text())
        variants=schema['properties']['data']['anyOf']
        payload=variants[-1] if len(variants)>2 else variants[0]
        # Published payload names match the HTTP components used above.
        shape=ts(json.loads(json.dumps(payload).replace('#/$defs/','#/components/schemas/')))
        typename=''.join(part.title().replace('-','') for part in op['name'].split('.'))+'Options'
        options={option['name']:option for option in op['options'] if not option['secret']}
        fields=[]
        for name,option in options.items():
            typ='boolean' if option['boolean'] else 'string | number'
            if option['multiple'] or name=='arguments':typ+=' | readonly (string | number)[]'
            fields.append(f'  {json.dumps(camel(name))}?: {typ};')
        declarations.append('export interface '+typename+' {\n'+'\n'.join(fields)+'\n}')
        parts=op['name'].split('.'); node=tree
        for part in parts[:-1]:node=node.setdefault(camel(part),{})
        node[camel(parts[-1])]=f'(options?: {typename}, invocation?: Invocation) => Promise<Result<{shape}>>'
        node=pytrees
        for part in parts[:-1]:node=node.setdefault(pyname(part),{})
        result_name=typename.replace('Options','Result')
        # A success result has its operation-specific generated payload type.
        py+=['class '+result_name+'(TypedDict):', '    schema: str', '    operation: str', '    success: bool', '    exit_code: int', '    diagnostics: list[str]', '    data: '+pytype(payload)]
        node[pyname(parts[-1])]=(options,result_name)
    def tree_type(node):return '{ '+' '.join(json.dumps(name)+': '+(tree_type(child) if isinstance(child,dict) else child)+';' for name,child in node.items())+' }'
    declarations+=['export class Router {','  constructor(options?: RouterOptions);','  invoke(name: string, options?: Record<string, unknown>, invocation?: Invocation): Promise<Result>;']
    for name,node in tree.items():
        typ=tree_type(node) if isinstance(node,dict) else node
        if name=='logs':typ+=' & ((options?: LogsShowOptions, invocation?: Invocation) => Promise<Result<LogRecordsReport>>)'
        if name=='with':typ='('+typ+') & ((client: string, args: readonly string[], options?: WithOptions, invocation?: Invocation) => Promise<Result<{ client_exit_code: number | null; stdout: string; stderr: string }>>)'
        declarations.append('  '+name+': '+typ+';')
    declarations.append('  deployStatus(options?: DeployOptions, invocation?: Invocation): ReturnType<Router["deploy"]>;')
    declarations+=['}','export function createRouter(options?: RouterOptions): Router;', 'export function resolveBinary(options?: RouterOptions): Promise<string>;','export function validateOperation(name: string, result: unknown): Result;','export function runProcess(binary: string, args: string[], options?: Invocation): Promise<{ stdout: string; stderr: string; exitCode: number }>;','',"export { NativeRouter, NativeRouterError, createNativeRouter } from './native.d.ts';",'']
    def pytree(node,classname):
        lines=[]; body=['class '+classname+':']
        for name,child in node.items():
            if isinstance(child,dict):
                nested=classname+'_'+name.title().replace('_','')
                lines+=pytree(child,nested);body.append(f'    {name}: {nested}')
            else:
                child,result_name=child
                options=[]
                for key,option in child.items():
                    if keyword.iskeyword(key) or key in ['env','stdin','deadline','cwd']:continue
                    typ='bool' if option['boolean'] else 'str | int'
                    if option['multiple'] or key=='arguments':typ+=' | list[str]'
                    options.append(f'{key}: {typ} | None = ...')
                options += ['options: Mapping[str, Any] | None = ...','env: Mapping[str, str] | None = ...','stdin: str | bytes | None = ...','deadline: float | None = ...','cwd: str | Path | None = ...']
                body.append(f'    def {name}(self, *, '+', '.join(options)+') -> '+result_name+': ...')
        if classname=='Router':body+=['    def __init__(self, *, binary: str | None = ..., env: Mapping[str, str] | None = ..., deadline: float = ..., allow_download: bool = ..., allow_version_mismatch: bool = ..., cache_dir: str | Path | None = ..., cwd: str | Path | None = ...) -> None: ...','    def invoke(self, operation_name: str, /, **options: Any) -> OperationResult: ...','    def deploy_status(self, **options: Any) -> DeployResult: ...']
        return lines+body+['']
    py+=pytree(pytrees,'Router')
    py+=['def create_router(**options: Any) -> Router: ...','def resolve_binary(**options: Any) -> str: ...','def run_process(binary: str, args: list[str], **options: Any) -> tuple[int, str, str]: ...','']
    package=json.loads((ROOT/'packages/javascript/package.json').read_text());package['version']=catalog['version']
    project=(ROOT/'packages/python/pyproject.toml').read_text();project=re.sub(r'(?m)^version = ".*"$',f'version = "{catalog["version"]}"',project)
    lock=json.loads((ROOT/'packages/javascript/package-lock.json').read_text());lock['version']=catalog['version'];lock['packages']['']['version']=catalog['version']
    outputs={'packages/javascript/index.d.ts':'\n'.join(declarations),'packages/python/link_assistant_router/__init__.pyi':'\n'.join(py),'packages/javascript/package.json':json.dumps(package,indent=2)+'\n','packages/javascript/package-lock.json':json.dumps(lock,indent=2)+'\n','packages/python/pyproject.toml':project}
    stale=[]
    for path,content in outputs.items():
        target=ROOT/path
        if args.check:
            if not target.exists() or target.read_text()!=content: stale.append(path)
        else: target.write_text(content)
    if stale: raise SystemExit('Stale bindings: '+', '.join(stale))
    print('Checked binding parity' if args.check else 'Generated binding types and versions')
if __name__=='__main__':main()
