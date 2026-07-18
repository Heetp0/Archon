import os
import random
import io
import logging
import json
import numpy as np
import scipy.ndimage as ndimage
from PIL import Image, ImageEnhance, ImageOps
from typing import List, Tuple, Dict, Any

logger = logging.getLogger("data_augmenter")

def apply_elastic_deform(image_arr: np.ndarray, alpha: float = 8.0, sigma: float = 3.0) -> np.ndarray:
    random_state = np.random.RandomState(None)
    shape = image_arr.shape
    
    # 2D coordinates grid
    dx = ndimage.gaussian_filter((random_state.rand(*shape[:2]) * 2 - 1), sigma) * alpha
    dy = ndimage.gaussian_filter((random_state.rand(*shape[:2]) * 2 - 1), sigma) * alpha
    
    x, y = np.meshgrid(np.arange(shape[1]), np.arange(shape[0]))
    indices = (y + dy).ravel(), (x + dx).ravel()
    
    # For RGB images, deform each channel
    if len(shape) == 3:
        distorted_channels = []
        for i in range(shape[2]):
            distorted_channel = ndimage.map_coordinates(image_arr[:, :, i], indices, order=1, mode='constant', cval=255)
            distorted_channels.append(distorted_channel.reshape(shape[:2]))
        return np.stack(distorted_channels, axis=2)
    else:
        distorted = ndimage.map_coordinates(image_arr, indices, order=1, mode='constant', cval=255)
        return distorted.reshape(shape)

def augment_image(img: Image.Image, seed: int) -> Image.Image:
    np.random.seed(seed)
    random.seed(seed)
    
    aug = img.convert("RGB")
    
    if random.random() > 0.5:
        angle = random.uniform(-10, 10)
        aug = aug.rotate(angle, fillcolor=(255, 255, 255), resample=Image.Resampling.BILINEAR)
        
    if random.random() > 0.5:
        scale = random.uniform(0.9, 1.1)
        w, h = aug.size
        new_w, new_h = int(w * scale), int(h * scale)
        scaled_img = aug.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        canvas = Image.new("RGB", (w, h), "white")
        if scale > 1.0:
            crop_x = (new_w - w) // 2
            crop_y = (new_h - h) // 2
            cropped = scaled_img.crop((crop_x, crop_y, crop_x + w, crop_y + h))
            canvas.paste(cropped, (0, 0))
        else:
            pad_x = (w - new_w) // 2
            pad_y = (h - new_h) // 2
            canvas.paste(scaled_img, (pad_x, pad_y))
        aug = canvas
        
    if random.random() > 0.5:
        shear = random.uniform(-0.08, 0.08)
        aug = aug.transform(aug.size, Image.Transform.AFFINE, (1, shear, 0, 0, 1, 0), fillcolor=(255, 255, 255))
        
    if random.random() > 0.5:
        bright = random.uniform(0.9, 1.1)
        aug = ImageEnhance.Brightness(aug).enhance(bright)
    if random.random() > 0.5:
        contrast = random.uniform(0.9, 1.1)
        aug = ImageEnhance.Contrast(aug).enhance(contrast)

    arr = np.array(aug)

    # Elastic Deformation
    if random.random() > 0.6:
        arr = apply_elastic_deform(arr, alpha=6.0, sigma=2.5)

    # Stroke Width Variation (Grey Dilation/Erosion)
    if random.random() > 0.5:
        if random.random() > 0.5:
            arr = ndimage.grey_erosion(arr, size=(2, 2, 1))
        else:
            arr = ndimage.grey_dilation(arr, size=(2, 2, 1))

    # Add noise
    if random.random() > 0.5:
        noise = np.random.normal(0, 3.0, arr.shape)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)

    return Image.fromarray(arr.astype(np.uint8))

def augment_training_data(real_samples: List[Dict[str, Any]], multiplier: int = 9) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    shuffled = list(real_samples)
    random.seed(42)
    random.shuffle(shuffled)
    
    if len(shuffled) <= 1:
        train_raw = shuffled
        val_set = []
    else:
        split_idx = max(1, int(len(shuffled) * 0.8))
        train_raw = shuffled[:split_idx]
        val_set = shuffled[split_idx:]
    
    train_set = []
    for sample in train_raw:
        train_set.append(sample)
        
        try:
            img = Image.open(io.BytesIO(sample["handwriting_image_png"]))
        except Exception:
            continue
            
        for i in range(multiplier):
            seed = 1000 * (i + 1) + len(train_set)
            try:
                aug_img = augment_image(img, seed)
                out_bytes = io.BytesIO()
                aug_img.save(out_bytes, format="PNG")
                
                aug_sample = dict(sample)
                aug_sample["handwriting_image_png"] = out_bytes.getvalue()
                import uuid
                aug_sample["training_id"] = str(uuid.uuid4())
                metadata = json.loads(sample["metadata_json"])
                metadata["is_augmented"] = True
                metadata["augmented_index"] = i
                aug_sample["metadata_json"] = json.dumps(metadata)
                
                train_set.append(aug_sample)
            except Exception as e:
                logger.error(f"Augmentation failed for index {i}: {e}")
                continue
                
    return train_set, val_set
