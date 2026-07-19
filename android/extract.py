import os
import re

files_to_process = [
    (r'app\src\main\java\com\example\archonnotesinkcanvas\ui\screens\OnboardingScreen.kt', r'C:\Users\heetp\.gemini\antigravity\brain\8885bca5-712e-4245-859c-18973a595af2\.system_generated\steps\13\output.txt'),
    (r'app\src\main\java\com\example\archonnotesinkcanvas\ui\screens\ChatScreen.kt', r'C:\Users\heetp\.gemini\antigravity\brain\8885bca5-712e-4245-859c-18973a595af2\.system_generated\steps\14\output.txt'),
    (r'app\src\main\java\com\example\archonnotesinkcanvas\ui\screens\NotebookListScreen.kt', r'C:\Users\heetp\.gemini\antigravity\brain\8885bca5-712e-4245-859c-18973a595af2\.system_generated\steps\15\output.txt'),
]

for out_path, in_path in files_to_process:
    with open(in_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'\\`\\`\\`kotlin\s*(.*?)\s*\\`\\`\\`', content, re.DOTALL)
    if not match:
        match = re.search(r'```kotlin\s*(.*?)\s*```', content, re.DOTALL)
        
    if match:
        code = match.group(1)
        # Ensure it has the correct package
        if "package com.example.archonnotesinkcanvas.ui.screens" not in code:
            code = "package com.example.archonnotesinkcanvas.ui.screens\n\n" + code
            
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as out_f:
            out_f.write(code)
        print(f"Written {out_path}")
    else:
        print(f"No kotlin code block found in {in_path}")
