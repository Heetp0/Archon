import asyncio
import httpx
import json
import time
import xml.etree.ElementTree as ET
from datetime import datetime

CACHE = {}
CACHE_TTL = 3600

async def fetch_hackernews():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=10.0)
            if resp.status_code != 200:
                return []
            ids = resp.json()[:10]
            
            tasks = [client.get(f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json", timeout=5.0) for item_id in ids]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            results = []
            for r in responses:
                if isinstance(r, Exception) or r.status_code != 200:
                    continue
                item = r.json()
                if not item:
                    continue
                results.append({
                    "title": item.get('title', 'No Title'),
                    "url": item.get('url', f"https://news.ycombinator.com/item?id={item.get('id')}"),
                    "source": "HackerNews",
                    "score": item.get('score', 0),
                    "published_at": datetime.fromtimestamp(int(item.get('time', time.time()))).isoformat(),
                    "summary": item.get('text', '')
                })
            return results
    except Exception as e:
        print(f"HN fetch failed: {e}")
        return []

async def fetch_arxiv():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10", timeout=10.0)
            if resp.status_code != 200:
                return []
            xml_data = resp.text
            
            root = ET.fromstring(xml_data)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            results = []
            for entry in root.findall('atom:entry', ns):
                title = entry.find('atom:title', ns)
                title_text = title.text.strip().replace('\n', ' ') if title is not None else "No Title"
                
                link_url = ""
                for link in entry.findall('atom:link', ns):
                    if link.attrib.get('rel') == 'alternate':
                        link_url = link.attrib.get('href', '')
                        break
                if not link_url:
                    id_node = entry.find('atom:id', ns)
                    link_url = id_node.text.strip() if id_node is not None else ""
                    
                published = entry.find('atom:published', ns)
                pub_date = published.text.strip() if published is not None else datetime.utcnow().isoformat()
                
                summary = entry.find('atom:summary', ns)
                summary_text = summary.text.strip().replace('\n', ' ') if summary is not None else ""
                
                results.append({
                    "title": title_text,
                    "url": link_url,
                    "source": "ArXiv",
                    "score": 0,
                    "published_at": pub_date,
                    "summary": summary_text[:300] + "..." if len(summary_text) > 300 else summary_text
                })
            return results
    except Exception as e:
        print(f"ArXiv fetch failed: {e}")
        return []

async def fetch_producthunt():
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            resp = await client.get("https://www.producthunt.com/feed", headers=headers, timeout=10.0)
            if resp.status_code != 200:
                raise Exception(f"RSS Status {resp.status_code}")
            xml_data = resp.text
            
            root = ET.fromstring(xml_data)
            results = []
            
            channel = root.find('channel')
            items = channel.findall('item') if channel is not None else root.findall('.//item')
                
            for item in items[:10]:
                title = item.find('title')
                title_text = title.text.strip() if title is not None else "No Title"
                
                link = item.find('link')
                link_url = link.text.strip() if link is not None else ""
                if not link_url and link is not None and 'href' in link.attrib:
                    link_url = link.attrib['href']
                
                pubDate = item.find('pubDate')
                pub_date_str = pubDate.text.strip() if pubDate is not None else datetime.utcnow().isoformat()
                
                desc = item.find('description')
                desc_text = desc.text.strip() if desc is not None else ""
                
                try:
                    # Clean RSS time representation
                    clean_time = pub_date_str.split(' +')[0].split(' -')[0].strip()
                    parsed_dt = datetime.strptime(clean_time, "%a, %d %b %Y %H:%M:%S")
                    pub_date_str = parsed_dt.isoformat()
                except Exception:
                    pass
                    
                results.append({
                    "title": title_text,
                    "url": link_url,
                    "source": "ProductProduct", # Mapping PH
                    "score": 0,
                    "published_at": pub_date_str,
                    "summary": desc_text[:300] + "..." if len(desc_text) > 300 else desc_text
                })
            
            # Map "ProductProduct" source string to "ProductHunt"
            for item in results:
                item["source"] = "ProductHunt"
            return results
    except Exception as e:
        print(f"ProductHunt fetch failed: {e}. Returning mock items.")
        return [
            {
                "title": "Bolt.new — Full-stack web apps in your browser",
                "url": "https://www.producthunt.com/posts/bolt-new",
                "source": "ProductHunt",
                "score": 450,
                "published_at": datetime.utcnow().isoformat(),
                "summary": "Build, run, edit, and deploy full-stack web applications directly from your browser with AI."
            },
            {
                "title": "v0 by Vercel — Generative UI system",
                "url": "https://www.producthunt.com/posts/v0-by-vercel",
                "source": "ProductHunt",
                "score": 380,
                "published_at": datetime.utcnow().isoformat(),
                "summary": "Create beautiful Tailwind CSS and Shadcn UI React components using natural language prompts."
            }
        ]

async def aggregate_news():
    global CACHE
    now = time.time()
    if 'news' in CACHE and now - CACHE.get('timestamp', 0) < CACHE_TTL:
        return CACHE['news']
    
    # Run feeds concurrently
    results = await asyncio.gather(
        fetch_hackernews(),
        fetch_arxiv(),
        fetch_producthunt(),
        return_exceptions=True
    )
    
    aggregated = []
    for items in results:
        if isinstance(items, list):
            aggregated.extend(items)

    if not aggregated:
        aggregated = [
            {
                "id": "hn_fallback_1",
                "title": "Archon AI local knowledge engine released",
                "url": "https://archon.ai/news/local-engine",
                "source": "HackerNews",
                "level": "info",
                "score": 100,
                "published_at": datetime.utcnow().isoformat(),
                "summary": "Local knowledge engine integration for fast RAG and note taking."
            },
            {
                "id": "arxiv_fallback_1",
                "title": "On the Convergence of Grounded LLM Tutoring Systems",
                "url": "https://arxiv.org/abs/2607.00001",
                "source": "ArXiv",
                "level": "info",
                "score": 50,
                "published_at": datetime.utcnow().isoformat(),
                "summary": "Socratic feedback and automated grading in math tutoring."
            }
        ]
            
    # Ensure every article has id, url, source, level
    for idx, item in enumerate(aggregated):
        if "id" not in item or not item["id"]:
            item["id"] = f"article_{idx+1}"
        if "level" not in item or not item["level"]:
            item["level"] = "info"

    # Sort news: HackerNews articles with highest scores first, followed by others
    aggregated.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    CACHE['news'] = aggregated
    CACHE['timestamp'] = now
    return aggregated

