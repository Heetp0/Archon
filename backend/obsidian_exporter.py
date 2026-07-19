import os
import json
import time
import logging
from typing import Dict, Any, List
from tesseract_client import deserialize_strokes

logger = logging.getLogger(__name__)

def strokes_to_svg(strokes: List[Dict[str, Any]]) -> str:
    valid_strokes = [s for s in strokes if s.get('points')]
    if not valid_strokes:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>'
        
    min_x = min(point['x'] for stroke in valid_strokes for point in stroke['points'])
    max_x = max(point['x'] for stroke in valid_strokes for point in stroke['points'])
    min_y = min(point['y'] for stroke in valid_strokes for point in stroke['points'])
    max_y = max(point['y'] for stroke in valid_strokes for point in stroke['points'])
    
    width = max(100, int(max_x - min_x + 100))
    height = max(100, int(max_y - min_y + 100))
    padding = 50
    
    view_width = width + 2 * padding
    view_height = height + 2 * padding
    
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_width} {view_height}" width="{view_width}" height="{view_height}" style="background-color: white;">'
    ]
    
    for stroke in valid_strokes:
        brush = stroke.get('brush', {})
        brush_size = brush.get('size', 4.0)
        color_long = brush.get('color', 0xFF000000)
        
        # Unpack ARGB components
        r = (color_long >> 16) & 0xFF
        g = (color_long >> 8) & 0xFF
        b = color_long & 0xFF
        color_hex = f'#{r:02x}{g:02x}{b:02x}'
        
        path_data = []
        last_point = None
        for point in stroke['points']:
            x = point['x'] + padding - min_x
            y = point['y'] + padding - min_y
            if last_point is None:
                path_data.append(f'M {x:.1f} {y:.1f}')
            else:
                path_data.append(f'L {x:.1f} {y:.1f}')
            last_point = point
            
        if path_data:
            path_str = ' '.join(path_data)
            svg_lines.append(f'  <path d="{path_str}" stroke="{color_hex}" stroke-width="{brush_size:.1f}" fill="none" stroke-linecap="round" stroke-linejoin="round" />')
            
    svg_lines.append('</svg>')
    return '\n'.join(svg_lines)

class ObsidianExporter:
    def __init__(self):
        import config as config_module
        self.workspace_root = config_module.WORKSPACE_ROOT

    def export_page(
        self,
        notebook_id: str,
        page_id: str,
        recognized_text: str,
        ocr_result: Dict[str, Any],
        binary_strokes: bytes
    ):
        try:
            # Set export directory configured in environment or default workspace subfolder
            export_root = os.getenv("OBSIDIAN_VAULT_PATH", os.path.join(self.workspace_root, "Obsidian", "Archon-Notes"))
            date_str = time.strftime("%Y-%m-%d")
            page_dir = os.path.join(export_root, date_str)
            os.makedirs(page_dir, exist_ok=True)

            base_filename = f"{page_id}"
            
            # 1. Generate SVG file representation
            strokes = deserialize_strokes(binary_strokes)
            svg_content = strokes_to_svg(strokes)
            svg_file_path = os.path.join(page_dir, f"{base_filename}.svg")
            with open(svg_file_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
            logger.info(f"Saved SVG stroke export to {svg_file_path}")

            # 2. Generate sidecar JSON metadata file
            sidecar_data = {
                "page_id": page_id,
                "notebook_id": notebook_id,
                "recognized_text": recognized_text,
                "tokens": ocr_result.get("tokens", []),
                "math_formulas": [{
                    "latex": ocr_result.get("latex", ""),
                    "plain_text": recognized_text,
                    "confidence": ocr_result.get("confidence", 1.0)
                }] if ocr_result.get("latex") else [],
                "myscript_job_id": ocr_result.get("recognitionId", "local"),
                "processed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "provider": ocr_result.get("provider", "unknown")
            }
            json_file_path = os.path.join(page_dir, f"{base_filename}.ocr.json")
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(sidecar_data, f, indent=2)
            logger.info(f"Saved OCR JSON metadata to {json_file_path}")

            # 3. Generate Markdown note file
            confidence_pct = ocr_result.get("confidence", 1.0) * 100
            provider_name = ocr_result.get("provider", "unknown").capitalize()
            latex_formula = ocr_result.get("latex", "")

            # Formulate math markdown block
            math_md = ""
            if latex_formula:
                math_md = f"\n### Math Recognition (LaTeX)\n\n{latex_formula}\n"

            markdown_content = f"""# Archon Note: {page_id}

**OCR Confidence**: {confidence_pct:.1f}%
**OCR Engine**: {provider_name}
**Export Date**: {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

## Recognized Text

{recognized_text}
{math_md}
---

### Original Handwriting Visual
![Original Handwriting]({base_filename}.svg)

"""
            md_file_path = os.path.join(page_dir, f"{base_filename}.md")
            with open(md_file_path, "w", encoding="utf-8") as f:
                f.write(markdown_content.strip() + "\n")
            logger.info(f"Saved Markdown note to {md_file_path}")

        except Exception as e:
            logger.error(f"Error executing Obsidian file exports: {e}")
