import os
import re
import hashlib
from typing import Dict, List, Any, Optional

# Regex patterns
LINK_PATTERN = re.compile(r"\[\[(.*?)\]\]")
TAG_PATTERN = re.compile(r"(?:^|\s)#([a-zA-Z0-9_\-]+)")
YAML_START_END = re.compile(r"^---\s*$")

def compute_sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def parse_frontmatter(lines: List[str]) -> tuple[Dict[str, Any], int]:
    """
    Parses YAML frontmatter at the start of a list of lines.
    Returns parsed dictionary and the index where frontmatter ends.
    """
    frontmatter = {}
    if not lines or not YAML_START_END.match(lines[0]):
        return frontmatter, 0

    end_idx = -1
    for i in range(1, len(lines)):
        if YAML_START_END.match(lines[i]):
            end_idx = i
            break

    if end_idx == -1:
        return frontmatter, 0

    yaml_text = "\n".join(lines[1:end_idx])
    try:
        import yaml
        parsed = yaml.safe_load(yaml_text)
        if isinstance(parsed, dict):
            frontmatter = parsed
    except Exception:
        pass

    return frontmatter, end_idx + 1

def parse_note(filepath: str, root_path: str) -> Dict[str, Any]:
    """
    Parses a single markdown note file and extracts all metadata, links, and tags.
    """
    rel_path = os.path.relpath(filepath, root_path).replace("\\", "/")
    
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    lines = content.splitlines()
    frontmatter, content_start_line = parse_frontmatter(lines)
    
    body_text = "\n".join(lines[content_start_line:])
    
    # Extract title
    title = frontmatter.get("title", "")
    if not title:
        # Look for first H1 header in the body
        for line in lines[content_start_line:]:
            line_strip = line.strip()
            if line_strip.startswith("# "):
                title = line_strip[2:].strip()
                break
    if not title:
        # Fallback to filename without extension
        title = os.path.splitext(os.path.basename(filepath))[0]

    # Extract tags from frontmatter and body
    tags = []
    fm_tags = frontmatter.get("tags", [])
    if isinstance(fm_tags, list):
        for t in fm_tags:
            tags.extend([x.strip() for x in t.split(",") if x.strip()])
    elif isinstance(fm_tags, str):
        tags.extend([x.strip() for x in fm_tags.split(",") if x.strip()])
        
    # Strip code blocks to avoid tag pollution from comments
    sanitized_body = re.sub(r"`.*?`", "", body_text, flags=re.DOTALL)
    
    # Find inline tags (e.g. #my-tag)
    inline_tags = TAG_PATTERN.findall(sanitized_body)
    tags.extend(inline_tags)
    # Deduplicate tags
    tags = list(set(t.strip() for t in tags if t.strip()))

    # Extract links
    raw_links = LINK_PATTERN.findall(body_text)
    links = []
    for link in raw_links:
        # Split alias: [[Target Note|Alias]] -> Target Note
        target = link.split("|", 1)[0].strip()
        target = target.split("#", 1)[0].strip() # Strip heading anchors
        if target:
            links.append(target)
    # Deduplicate links
    links = list(set(links))

    # File attributes
    stat = os.stat(filepath)
    last_modified = stat.st_mtime
    
    return {
        "relative_path": rel_path,
        "title": title,
        "tags": tags,
        "links": links,
        "last_modified": last_modified,
        "content_hash": compute_sha256(content),
        "frontmatter": frontmatter
    }

def walk_vault(root_path: str) -> List[Dict[str, Any]]:
    """
    Recursively scans the vault and parses all markdown notes.
    Skips ignored folders (.obsidian, .git, etc.).
    """
    notes = []
    ignored_dirs = {
        ".obsidian", ".git", ".agent", ".agy", "Archives", 
        "Builds", "Logs", "node_modules", "dist", "target",
        ".venv", "venv", "build", ".pytest_cache", "ecc"
    }

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Exclude ignored directories in-place
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs]
        
        for filename in filenames:
            if filename.endswith(".md"):
                filepath = os.path.join(dirpath, filename)
                try:
                    note_meta = parse_note(filepath, root_path)
                    notes.append(note_meta)
                except Exception as e:
                    # Log error and skip file
                    print(f"Error parsing note {filepath}: {str(e)}")
                    
    return notes
