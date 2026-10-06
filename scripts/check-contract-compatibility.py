#!/usr/bin/env python3
"""Require a new schema version for incompatible contracts; preserve old files."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def compare(old,new,path=''):
    errors=[]
    if isinstance(old,dict) and isinstance(new,dict):
        for key in ['$id','type','const','enum','$ref','additionalProperties','minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','minLength','maxLength','pattern','format','minItems','maxItems','uniqueItems','minProperties','maxProperties','security']:
            if old.get(key)!=new.get(key):errors.append(path+'/'+key+' changed')
        for key in ['properties','$defs','components','schemas','paths','responses','content']:
            if key in old:
                for name,value in old[key].items():
                    if name not in new.get(key,{}):errors.append(path+'/'+key+'/'+name+' removed')
                    else:errors+=compare(value,new[key][name],path+'/'+key+'/'+name)
        before_required=old.get('required',[]);after_required=new.get('required',[])
        if isinstance(before_required,bool) or isinstance(after_required,bool):
            # OpenAPI parameters/request bodies use a boolean; JSON Schema uses a list.
            before_required=old.get('required',False);after_required=new.get('required',False)
            if not isinstance(before_required,bool) or not isinstance(after_required,bool):errors.append(path+'/required changed type')
            elif after_required and not before_required:errors.append(path+' became required')
        elif not set(after_required).issubset(before_required):errors.append(path+' gained required fields')
        for key in ['items','anyOf','oneOf','allOf','schema','requestBody','parameters']:
            if key in old:errors+=compare(old[key],new.get(key),path+'/'+key)
    elif isinstance(old,list) and isinstance(new,list):
        if len(new)<len(old):errors.append(path+' removed variants')
        for index,value in enumerate(old[:len(new)]):errors+=compare(value,new[index],path+'/'+str(index))
    elif old != new:errors.append(path+' changed')
    return errors

def main():
    p=argparse.ArgumentParser(__doc__);p.add_argument('--base',required=True);args=p.parse_args()
    files=subprocess.check_output(['git','ls-tree','-r','--name-only',args.base,'schemas','openapi'],text=True).splitlines()
    errors=[]
    for name in files:
        path=ROOT/name
        if not path.exists():errors.append(name+' removed; retain published schemas for at least one minor release');continue
        old=json.loads(subprocess.check_output(['git','show',args.base+':'+name],text=True));new=json.loads(path.read_text())
        if name=='schemas/operation-catalog.v1.json':
            before={op['name']:op for op in old['operations']};after={op['name']:op for op in new['operations']}
            for op in before:
                if op not in after:errors.append('operation '+op+' removed')
        elif name.startswith('schemas/'):errors += [name+': '+e for e in compare(old,new)]
        else:
            errors += compare(old.get('components',{}),new.get('components',{}),'components')
            for path,methods in old['paths'].items():
                for method,operation in methods.items():
                    if method not in new['paths'].get(path,{}):errors.append(method+' '+path+' removed')
                    else:errors += compare(operation,new['paths'][path][method],method+' '+path)
    if errors:raise SystemExit('\n'.join(errors))
    print('Contract compatibility checked; published versions retained')
if __name__=='__main__':main()
