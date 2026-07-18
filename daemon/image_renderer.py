import io
import struct
import logging
from typing import List, Dict, Any
from PIL import Image, ImageDraw

logger = logging.getLogger("image_renderer")

def deserialize_strokes(data: bytes) -> List[Dict[str, Any]]:
    strokes = []
    offset = 0
    if len(data) < 4:
        return strokes
    try:
        num_strokes = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        for _ in range(num_strokes):
            if len(data) - offset < 8:
                break
            inputs_len = struct.unpack_from('<I', data, offset)[0]
            offset += 4
            n = struct.unpack_from('<I', data, offset)[0]
            offset += 4
            points = []
            for _ in range(n):
                if len(data) - offset < 24:
                    break
                x, y, time_val, pressure, tilt, orientation = struct.unpack_from('<ffffff', data, offset)
                points.append({
                    'x': float(x),
                    'y': float(y),
                    'time': float(time_val),
                    'pressure': float(pressure),
                    'tilt': float(tilt),
                    'orientation': float(orientation)
                })
                offset += 24
            if len(data) - offset < 24:
                break
            brush_size, color_long, epsilon, stock_val, family_len = struct.unpack_from('<fqfII', data, offset)
            offset += 24
            family_id = ""
            if family_len > 0 and len(data) - offset >= family_len:
                family_id = data[offset:offset + family_len].decode('utf-8', errors='ignore')
                offset += family_len
            strokes.append({
                'points': points,
                'brush': {
                    'size': float(brush_size),
                    'color': int(color_long),
                    'epsilon': float(epsilon),
                    'stock_val': int(stock_val),
                    'family_id': family_id
                }
            })
    except Exception as e:
        logger.error(f"Error deserializing binary strokes: {e}")
    return strokes

def render_strokes_to_png(binary_data: bytes) -> bytes:
    try:
        strokes = deserialize_strokes(binary_data)
        valid_strokes = [s for s in strokes if s.get('points')]
        if not valid_strokes:
            img = Image.new('RGB', (224, 224), 'white')
            out = io.BytesIO()
            img.save(out, format="PNG")
            return out.getvalue()

        all_xs = [p['x'] for s in valid_strokes for p in s['points']]
        all_ys = [p['y'] for s in valid_strokes for p in s['points']]
        min_x, max_x = min(all_xs), max(all_xs)
        min_y, max_y = min(all_ys), max(all_ys)

        stroke_width = int(max_x - min_x + 1)
        stroke_height = int(max_y - min_y + 1)
        
        padding = 20
        temp_img = Image.new('RGB', (stroke_width + 2 * padding, stroke_height + 2 * padding), 'white')
        draw = ImageDraw.Draw(temp_img)

        for stroke in valid_strokes:
            brush = stroke.get('brush', {})
            brush_size = max(2, min(8, int(brush.get('size', 4))))
            last_point = None
            for point in stroke['points']:
                if last_point is not None:
                    x1 = last_point['x'] + padding - min_x
                    y1 = last_point['y'] + padding - min_y
                    x2 = point['x'] + padding - min_x
                    y2 = point['y'] + padding - min_y
                    draw.line([(x1, y1), (x2, y2)], fill='black', width=brush_size)
                last_point = point

        bbox = temp_img.getbbox()
        if bbox:
            cropped = temp_img.crop(bbox)
        else:
            cropped = temp_img

        final_size = 224
        cropped.thumbnail((final_size - 10, final_size - 10), Image.Resampling.LANCZOS)
        
        canvas = Image.new('RGB', (final_size, final_size), 'white')
        offset_x = (final_size - cropped.width) // 2
        offset_y = (final_size - cropped.height) // 2
        canvas.paste(cropped, (offset_x, offset_y))

        out = io.BytesIO()
        canvas.save(out, format="PNG")
        return out.getvalue()

    except Exception as e:
        logger.error(f"Error rendering strokes to PNG: {e}")
        img = Image.new('RGB', (224, 224), 'white')
        out = io.BytesIO()
        img.save(out, format="PNG")
        return out.getvalue()
