"""Finite regression cases for the published-contract compatibility policy."""
import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('compatibility', Path(__file__).resolve().parents[2] / 'scripts/check-contract-compatibility.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class CompatibilityTests(unittest.TestCase):
    def test_optional_property_addition_is_compatible(self):
        old = {'type':'object','properties':{'id':{'type':'string'}},'required':['id'],'additionalProperties':False}
        new = {**old,'properties':{**old['properties'],'label':{'type':'string'}}}
        self.assertEqual(module.compare(old,new), [])
    def test_removed_property_and_new_required_fields_are_breaking(self):
        self.assertTrue(module.compare({'properties':{'id':{'type':'string'}}}, {'properties':{}}))
        self.assertTrue(module.compare({'required':[]}, {'required':['id']}))
    def test_value_constraint_changes_require_a_new_version(self):
        for key,value in [('minimum',0),('maximum',100),('minLength',1),('maxLength',10),('pattern','^a'),('format','date-time')]:
            with self.subTest(key=key): self.assertTrue(module.compare({'type':'string'}, {'type':'string',key:value}))
    def test_type_constraint_added_to_opaque_property_is_breaking(self):
        self.assertTrue(module.compare({}, {'type':'string'}))
    def test_security_change_is_breaking(self):
        self.assertTrue(module.compare({'security':[{'ClientBearer':[]}]}, {'security':[{'AdminBearer':[]}]}))
    def test_definition_removal_is_breaking(self):
        self.assertTrue(module.compare({'$defs':{'Client':{'type':'string'}}}, {'$defs':{}}))

if __name__ == '__main__': unittest.main()
