
import os

def replace_in_file(filepath, target, replacement):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    if target not in content:
        print(f"ERROR: Target content not found in {filepath}!")
        return False
    new_content = content.replace(target, replacement)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Successfully modified {filepath}")
    return True

