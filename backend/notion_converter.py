"""
notion_converter.py
Convert Obsidian-flavoured Markdown into Notion block objects.

Handles:
  - YAML frontmatter (skipped)
  - h1 / h2 / h3 / h4 headings
  - Fenced code blocks (```mermaid -> callout, others -> code block)
  - LaTeX display blocks ($$ ... $$)
  - Bullet points (- item)
  - Numbered lists (1. item)
  - Blockquotes (> text)
  - Bold (**text**) and inline code (`code`) inside rich text
  - Horizontal rules (---)
  - Plain paragraphs
"""

import re
from typing import List


# ─────────────────────────────────────────────────────────────
# Rich-text helpers
# ─────────────────────────────────────────────────────────────

def _parse_inline(text: str) -> List[dict]:
    """Convert **bold**, *italic*, `code`, and plain text into Notion rich_text."""
    parts: List[dict] = []
    pattern = re.compile(r'\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+)', re.DOTALL)
    for m in pattern.finditer(text):
        bold_text, italic_text, code_text, plain_text = m.groups()
        if bold_text is not None:
            parts.append({"type": "text", "text": {"content": bold_text},
                          "annotations": {"bold": True, "italic": False, "code": False, "color": "default"}})
        elif italic_text is not None:
            parts.append({"type": "text", "text": {"content": italic_text},
                          "annotations": {"bold": False, "italic": True, "code": False, "color": "default"}})
        elif code_text is not None:
            parts.append({"type": "text", "text": {"content": code_text},
                          "annotations": {"bold": False, "italic": False, "code": True, "color": "default"}})
        elif plain_text is not None:
            parts.append({"type": "text", "text": {"content": plain_text},
                          "annotations": {"bold": False, "italic": False, "code": False, "color": "default"}})
    return parts or [{"type": "text", "text": {"content": text}}]


def _rich(text: str) -> List[dict]:
    """Inline-parsed rich_text list, chunked for Notion's 2000-char limit."""
    parsed = _parse_inline(text)
    result = []
    for p in parsed:
        content = p["text"]["content"]
        if len(content) > 2000:
            for i in range(0, len(content), 2000):
                chunk = dict(p)
                chunk["text"] = {"content": content[i:i + 2000]}
                result.append(chunk)
        else:
            result.append(p)
    return result


def _plain(text: str) -> List[dict]:
    """Plain rich_text (no inline parsing), chunked for 2000-char limit."""
    chunks = []
    for i in range(0, max(len(text), 1), 2000):
        chunks.append({"type": "text", "text": {"content": text[i:i + 2000]}})
    return chunks


# ─────────────────────────────────────────────────────────────
# Block constructors
# ─────────────────────────────────────────────────────────────

def _h1(text):  return {"object": "block", "type": "heading_1", "heading_1": {"rich_text": _rich(text)}}
def _h2(text):  return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": _rich(text)}}
def _h3(text):  return {"object": "block", "type": "heading_3", "heading_3": {"rich_text": _rich(text)}}
def _para(text): return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rich(text)}}
def _bullet(text): return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": _rich(text)}}
def _numbered(text): return {"object": "block", "type": "numbered_list_item", "numbered_list_item": {"rich_text": _rich(text)}}
def _quote(text): return {"object": "block", "type": "quote", "quote": {"rich_text": _rich(text)}}
def _divider():  return {"object": "block", "type": "divider", "divider": {}}


NOTION_LANGS = {
    "mermaid", "python", "javascript", "typescript", "bash", "shell",
    "sql", "json", "yaml", "latex", "css", "html", "markdown",
    "c", "c++", "c#", "java", "rust", "go", "ruby", "plain text"
}

def _code(content: str, language: str = "plain text") -> dict:
    lang = language.lower()
    if lang not in NOTION_LANGS:
        lang = "plain text"
    return {"object": "block", "type": "code",
            "code": {"rich_text": _plain(content[:2000]), "language": lang}}

def _callout(text: str, emoji: str = "📊", color: str = "blue_background") -> dict:
    return {"object": "block", "type": "callout",
            "callout": {"icon": {"type": "emoji", "emoji": emoji},
                        "rich_text": _plain(text[:2000]), "color": color}}


# ─────────────────────────────────────────────────────────────
# Main converter
# ─────────────────────────────────────────────────────────────

def md_to_notion_blocks(md_content: str) -> List[dict]:
    """Convert a Markdown string into a flat list of Notion block dicts."""
    blocks: List[dict] = []
    lines = md_content.split("\n")
    i = 0
    total = len(lines)

    while i < total:
        line = lines[i]

        # YAML frontmatter
        if i == 0 and line.strip() == "---":
            i += 1
            while i < total and lines[i].strip() != "---":
                i += 1
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^-{3,}$|^\*{3,}$|^_{3,}$", line.strip()):
            blocks.append(_divider())
            i += 1
            continue

        # Fenced code blocks
        fence_match = re.match(r"^```(\w*)", line)
        if fence_match:
            lang = fence_match.group(1) or "plain text"
            code_lines: List[str] = []
            i += 1
            while i < total and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            content = "\n".join(code_lines)
            if lang.lower() == "mermaid":
                blocks.append(_callout("📊 Diagram (Mermaid)\n" + content, emoji="📊", color="blue_background"))
            else:
                blocks.append(_code(content, lang))
            continue

        # Display LaTeX $$ ... $$
        if line.strip().startswith("$$"):
            latex_lines: List[str] = []
            i += 1
            while i < total and not lines[i].strip().startswith("$$"):
                latex_lines.append(lines[i])
                i += 1
            i += 1
            blocks.append(_code("\n".join(latex_lines), "latex"))
            continue

        # Headings
        if line.startswith("#### "):
            blocks.append(_h3(line[5:].strip()))
        elif line.startswith("### "):
            blocks.append(_h3(line[4:].strip()))
        elif line.startswith("## "):
            blocks.append(_h2(line[3:].strip()))
        elif line.startswith("# "):
            blocks.append(_h1(line[2:].strip()))
        elif line.startswith("> "):
            blocks.append(_quote(line[2:].strip()))
        elif re.match(r"^[-*+] ", line):
            blocks.append(_bullet(line[2:].strip()))
        elif re.match(r"^\d+\. ", line):
            blocks.append(_numbered(re.sub(r"^\d+\. ", "", line).strip()))
        elif line.strip():
            blocks.append(_para(line.strip()))

        i += 1

    return blocks
