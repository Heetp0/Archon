import os
import re

with open('src/pages/Home.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('export default function Home() {', 'const Home = React.memo(function Home() {')
content += '\nexport default Home;\n'

with open('src/pages/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
