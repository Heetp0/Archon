import os
import struct
import subprocess
import tempfile
import logging
from typing import List, Dict, Any
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)

def deserialize_strokes(data: bytes) -> List[Dict[str, Any]]:
    strokes = []
    offset = 0
    
    if len(data) < 4:
        return strokes

    try:
        # Read numStrokes
        num_strokes = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        
        for _ in range(num_strokes):
            if len(data) - offset < 8:
                break
                
            # Read inputsLen
            inputs_len = struct.unpack_from('<I', data, offset)[0]
            offset += 4
            
            # Read n
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
            
            # Read Brush
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
        logger.error(f"Error deserializing binary strokes in python: {e}")
        
    return strokes

class TesseractClient:
    def recognize_strokes(self, binary_data: bytes) -> str:
        try:
            strokes = deserialize_strokes(binary_data)
            
            # Filter empty strokes or strokes without points
            valid_strokes = [s for s in strokes if s.get('points')]
            if not valid_strokes:
                return ""
            
            # Calculate min/max bounds
            min_x = min(point['x'] for stroke in valid_strokes for point in stroke['points'])
            max_x = max(point['x'] for stroke in valid_strokes for point in stroke['points'])
            min_y = min(point['y'] for stroke in valid_strokes for point in stroke['points'])
            max_y = max(point['y'] for stroke in valid_strokes for point in stroke['points'])
            
            # Create PIL image
            width = max(100, int(max_x - min_x + 100))
            height = max(100, int(max_y - min_y + 100))
            padding = 50
            
            img = Image.new('RGB', (width + 2 * padding, height + 2 * padding), 'white')
            draw = ImageDraw.Draw(img)
            
            # Draw strokes
            for stroke in valid_strokes:
                brush = stroke.get('brush', {})
                brush_size = max(2, min(8, int(brush.get('size', 4))))
                
                last_point = None
                for point in stroke['points']:
                    if last_point is not None:
                        x1, y1 = last_point['x'] + padding - min_x, last_point['y'] + padding - min_y
                        x2, y2 = point['x'] + padding - min_x, point['y'] + padding - min_y
                        draw.line([(x1, y1), (x2, y2)], fill='black', width=brush_size)
                    last_point = point
            
            # Save image to temp file
            temp_fd, temp_img_path = tempfile.mkstemp(suffix=".png")
            os.close(temp_fd)
            
            try:
                img.save(temp_img_path, format="PNG")
                
                # Run tesseract via subprocess on the temp file
                result = subprocess.run(
                    ['tesseract', temp_img_path, 'stdout', '--psm', '3'],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                recognized_text = result.stdout.strip()
            except FileNotFoundError:
                logger.warning("Tesseract binary not found on this system. Returning empty fallback.")
                recognized_text = ""
            except Exception as e:
                logger.error(f"Error running tesseract process: {e}")
                recognized_text = ""
            finally:
                if os.path.exists(temp_img_path):
                    os.remove(temp_img_path)
            
            return recognized_text
            
        except Exception as e:
            logger.error(f"Unexpected error in Tesseract OCR Client: {e}")
            return ""
