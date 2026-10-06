import json
import os
import platform
import tempfile
import unittest
from pathlib import Path
from link_assistant_router import Router, RouterError, operation_names, catalog, __version__, run_process
from link_assistant_router.testing import temporary_home, mock_upstream, vendor_stub

BINARY = str(Path(os.environ.get('ROUTER_TEST_BIN','target/debug/router')).resolve())
class BindingTests(unittest.TestCase):
    def test_catalog_parity(self):
        router = Router(binary=BINARY, allow_download=False)
        for operation in operation_names:
            entry=router
            for name in operation.split('.'):
                name=name.replace('-','_')
                if name in ['with','import']: name+='_'
                entry=getattr(entry,name)
            self.assertTrue(callable(entry),operation)
        self.assertEqual(len(set(operation_names)),len(catalog['operations']))

    def test_real_binary_isolated_lifecycle(self):
        home=temporary_home(); upstream=mock_upstream()
        router=Router(binary=BINARY,allow_download=False,env={**home.env,'TOKEN_SECRET':'python-binding-test-secret','STORAGE_POLICY':'text','UPSTREAM_ALLOW_PRIVATE_NETWORKS':'loopback'})
        try:
            self.assertEqual(router.version()['data']['version'],__version__)
            with self.assertRaises(RouterError) as error: router.tokens.issue(ttl_hours='invalid')
            self.assertEqual(error.exception.code,'operation')
            self.assertEqual(error.exception.exit_code,2)
            self.assertTrue(router.tokens.issue(label='python-fixture')['data']['token'].startswith('la_sk_'))
            token=next(row for row in router.tokens.list()['data'] if row['label']=='python-fixture')
            router.tokens.revoke(id=token['id'])
            self.assertTrue(router.tokens.show(id=token['id'])['data']['revoked'])
            router.providers.add(name='fixture',base_url=upstream.origin,api_key_stdin=True,stdin='fixture-secret\n')
            self.assertEqual(router.providers.show(name='fixture')['data']['name'],'fixture')
            self.assertEqual(len(router.clients.list()['data']),8)
            with self.assertRaises(RouterError) as error: router.providers.add(api_key='secret')
            self.assertEqual(error.exception.code,'secret-argv')
        finally: upstream.close(); home.close()

    def test_strict_schema(self):
        from link_assistant_router import _validate
        result={'schema':'link-assistant-router/doctor/v1','operation':'doctor','success':True,'exit_code':0,'data':{'output':[],'undocumented':True},'diagnostics':[]}
        with self.assertRaises(RouterError) as error: _validate('doctor',result,0,'fixture diagnostic')
        self.assertEqual(error.exception.code,'schema')
        self.assertEqual(error.exception.stderr,'fixture diagnostic')

    def test_finite_deadline_and_output(self):
        import sys
        with self.assertRaises(RouterError) as error: run_process(sys.executable,['-c','import time; time.sleep(2)'],deadline=.05)
        self.assertEqual(error.exception.code,'deadline')
        with self.assertRaises(RouterError) as error: run_process(sys.executable,['-c','print("x"*8192)'],max_output_bytes=1024)
        self.assertEqual(error.exception.code,'output-limit')

    def test_helpers(self):
        stub=vendor_stub(version='0.158.0')
        try:self.assertIn('0.158.0',run_process(str(stub.binary),['--version'])[1])
        finally:stub.close()

    def test_version_and_operation_errors(self):
        import sys
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'router'
            version={'schema':'link-assistant-router/version/v1','operation':'version','success':True,'exit_code':0,'data':{'version':'99.0.0','source_commit':'a'*40},'diagnostics':[]}
            failure={'schema':'link-assistant-router/doctor/v1','operation':'doctor','success':False,'exit_code':17,'data':{'output':[]},'diagnostics':['operation diagnostic']}
            path.write_text(f'#!{sys.executable}\nimport sys,json\nif "version" in sys.argv:\n print({json.dumps(version)!r}); sys.exit(0)\nprint("transport diagnostic", file=sys.stderr)\nprint({json.dumps(failure)!r}); sys.exit(17)\n');path.chmod(0o755)
            with self.assertRaises(RouterError) as error: Router(binary=str(path)).doctor()
            self.assertEqual(error.exception.code,'version')
            with self.assertRaises(RouterError) as error: Router(binary=str(path),allow_version_mismatch=True).doctor()
            self.assertEqual(error.exception.exit_code,17)
            self.assertEqual(error.exception.result['operation'],'doctor')
            self.assertIn('operation diagnostic',error.exception.stderr)
            self.assertIn('transport diagnostic',error.exception.stderr)

    def test_all_catalog_secrets_are_rejected_before_spawn(self):
        router=Router(binary='/must-not-start-router',allow_download=False)
        for operation in catalog['operations']:
            for option in operation['options']:
                if not option['secret']: continue
                with self.assertRaises(RouterError) as error:
                    router.invoke(operation['name'],options={option['name']:'never-in-argv'})
                self.assertEqual(error.exception.code,'secret-argv',operation['name']+':'+option['name'])

    def test_verification_document(self):
        from link_assistant_router.testing import verify_contracts
        home=temporary_home(); stub=vendor_stub(name='codex',version='0.158.0')
        router=Router(binary=BINARY,allow_download=False,env={**home.env,**stub.env},cwd=home.home)
        try:
            result=router.verify(arguments=['--prepare-clients','--client','codex','--output',str(home.home/'result.json')])['data']
            self.assertEqual(result['schema'],'link-assistant-router/verification/v1')
            self.assertIsNone(result['router_version'])
            preparation=result['client_preparation'][0]
            if platform.system()=='Darwin':
                self.assertIsNone(preparation['observed'])
                self.assertEqual(preparation['status'],'not-proven')
                self.assertIn('credential-store boundary',preparation['reason'])
            else:
                self.assertEqual(preparation['observed'],'0.158.0')
                self.assertEqual(preparation['status'],'prepared')
            with self.assertRaises(RouterError) as error: verify_contracts(router=router,areas=['missing-area'])
            self.assertEqual(error.exception.exit_code,2)
        finally: stub.close(); home.close()

if __name__=='__main__':unittest.main()
