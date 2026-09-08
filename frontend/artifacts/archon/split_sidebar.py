import os
import re

with open('src/components/RightSidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_code = f.read()

# We'll split the file and create the new files manually
