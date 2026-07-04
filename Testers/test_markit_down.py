import sys
import os
import unittest
import tempfile
import shutil
import csv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'daemon')))
from markit_down import MarkitDownNormalizer

class TestMarkitDown(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.cache_dir = os.path.join(self.test_dir, 'cache')
        self.normalizer = MarkitDownNormalizer(self.cache_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    async def test_convert_txt(self):
        txt_path = os.path.join(self.test_dir, 'sample.txt')
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('Hello World!\nThis is a simple text file.')
        
        cached_path = await self.normalizer.convert(txt_path)
        self.assertTrue(os.path.exists(cached_path))
        with open(cached_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn('Hello World!', content)
        self.assertIn('sample.txt', content)

    async def test_convert_csv(self):
        csv_path = os.path.join(self.test_dir, 'sample.csv')
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Name', 'Age', 'City'])
            writer.writerow(['Alice', '25', 'London'])
            writer.writerow(['Bob', '30', 'Paris'])
        
        cached_path = await self.normalizer.convert(csv_path)
        self.assertTrue(os.path.exists(cached_path))
        with open(cached_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn('| Name | Age | City |', content)
        self.assertIn('| Alice | 25 | London |', content)
        self.assertIn('| --- | --- | --- |', content)

    async def test_cache_hit_logic(self):
        txt_path = os.path.join(self.test_dir, 'sample.txt')
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('Cached content')
        
        path1 = await self.normalizer.convert(txt_path)
        index_entry_1 = self.normalizer.index[self.normalizer._get_file_hash(txt_path)]
        conv_time_1 = index_entry_1['converted_at']
        
        path2 = await self.normalizer.convert(txt_path)
        self.assertEqual(path1, path2)
        index_entry_2 = self.normalizer.index[self.normalizer._get_file_hash(txt_path)]
        self.assertEqual(conv_time_1, index_entry_2['converted_at'])

if __name__ == '__main__':
    unittest.main()
