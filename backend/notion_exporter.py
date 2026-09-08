"""
notion_exporter.py
Send generated lecture notes to a Notion database via the notion-client SDK.

Env vars required:
  NOTION_API_KEY       - Notion integration secret
  NOTION_DATABASE_ID   - Target database ID
  NOTION_ENABLED       - "true" (default) / "false"
"""

import os
import re
import logging
from datetime import datetime, timezone
from typing import List, Optional

from notion_client import Client, APIErrorCode, APIResponseError
from notion_converter import md_to_notion_blocks

logger = logging.getLogger("notion_exporter")


def _get_client() -> Client:
    api_key = os.getenv("NOTION_API_KEY", "")
    if not api_key:
        raise ValueError("NOTION_API_KEY is not set in .env")
    return Client(auth=api_key)


def _get_database_id() -> str:
    db_id = os.getenv("NOTION_DATABASE_ID", "")
    if not db_id:
        raise ValueError("NOTION_DATABASE_ID is not set in .env")
    return db_id


def is_notion_enabled() -> bool:
    return (
        bool(os.getenv("NOTION_API_KEY"))
        and os.getenv("NOTION_ENABLED", "true").lower() not in ("false", "0", "no")
    )


def _extract_concepts(md: str) -> List[str]:
    """Pull concept names from a ## Key Concepts section, or bold tokens."""
    concepts: List[str] = []
    section_match = re.search(r"## Key Concepts\n(.*?)(?=\n##|\Z)", md, re.DOTALL)
    if section_match:
        for line in section_match.group(1).split("\n"):
            line = line.strip()
            if line.startswith("- **"):
                name = re.match(r"- \*\*(.+?)\*\*", line)
                if name:
                    concepts.append(name.group(1)[:100])
            elif line.startswith("- "):
                concepts.append(line[2:100])
            if len(concepts) >= 10:
                break
        return concepts

    for m in re.finditer(r"\*\*(.+?)\*\*", md):
        candidate = m.group(1).strip()
        if 3 < len(candidate) < 50 and candidate not in concepts:
            concepts.append(candidate)
        if len(concepts) >= 10:
            break
    return concepts


def _batch(blocks: List[dict], size: int = 100) -> List[List[dict]]:
    return [blocks[i:i + size] for i in range(0, len(blocks), size)]


def save_to_notion(
    notes_content: str,
    subject: str,
    lecture_num: int,
    concepts: Optional[List[str]] = None,
    difficulty: str = "Intermediate",
    textbooks_used: str = "",
) -> str:
    """
    Convert notes to Notion blocks and create a page in the configured database.
    Returns the Notion page URL on success. Raises on misconfiguration or API error.
    """
    if not is_notion_enabled():
        raise ValueError("Notion export is disabled (NOTION_ENABLED=false or NOTION_API_KEY missing)")

    notion = _get_client()
    database_id = _get_database_id()

    if concepts is None:
        concepts = _extract_concepts(notes_content)

    date_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    title = f"{subject} — Lecture {lecture_num} — {date_str}"

    all_blocks = md_to_notion_blocks(notes_content)
    batches = _batch(all_blocks, 100)

    logger.info(
        f"Creating Notion page '{title}' | {len(all_blocks)} blocks | {len(batches)} batch(es)"
    )

    properties: dict = {
        "Name": {"title": [{"type": "text", "text": {"content": title[:2000]}}]},
        "Subject": {"rich_text": [{"type": "text", "text": {"content": subject[:2000]}}]},
        "Lecture": {"number": lecture_num},
        "Date": {"date": {"start": datetime.now(tz=timezone.utc).isoformat()}},
        "Difficulty": {"select": {"name": difficulty}},
        "Status": {"select": {"name": "Ready"}},
    }
    if concepts:
        properties["Concepts"] = {"multi_select": [{"name": c[:100]} for c in concepts]}
    if textbooks_used:
        properties["Textbooks Used"] = {
            "rich_text": [{"type": "text", "text": {"content": textbooks_used[:2000]}}]
        }

    first_batch = batches[0] if batches else []

    try:
        response = notion.pages.create(
            parent={"database_id": database_id},
            properties=properties,
            children=first_batch,
        )
    except APIResponseError as e:
        if e.code in (APIErrorCode.ValidationError,):
            logger.warning(
                f"Notion property validation error ({e.code}); retrying with title-only properties. "
                "Check your database schema matches the expected fields."
            )
            response = notion.pages.create(
                parent={"database_id": database_id},
                properties={"Name": {"title": [{"type": "text", "text": {"content": title[:2000]}}]}},
                children=first_batch,
            )
        else:
            raise

    page_id = response["id"]
    notion_url = response.get("url", f"https://notion.so/{page_id.replace('-', '')}")
    logger.info(f"Notion page created: {notion_url}")

    for batch in batches[1:]:
        notion.blocks.children.append(block_id=page_id, children=batch)
        logger.debug(f"Appended {len(batch)} blocks to page {page_id}")

    return notion_url
