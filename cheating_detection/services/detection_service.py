"""
Detection service using YOLOv8 for cheating material detection.
Handles model loading, image processing, and object detection.
"""

import cv2
import numpy as np
from ultralytics import YOLO
import base64
from io import BytesIO
from typing import Dict, List, Tuple
import os
import ssl

# Disable SSL verification for model download (Windows certificate issue workaround)
# WARNING: Only for development. Use proper certificates in production.
ssl._create_default_https_context = ssl._create_unverified_context


class DetectionService:
    """
    Service for detecting cheating materials using YOLOv8.
    
    Detects:
    - Cell phones
    - Books
    - Paper/Notebooks
    """
    
    # COCO class IDs for cheating objects
    # YOLOv8 uses COCO dataset classes
    COCO_CLASSES = {
        67: "cell phone",      # COCO class ID 67
        73: "book",            # COCO class ID 73
        74: "clock",           # Not used but for reference
        75: "vase",            # Not used but for reference
        76: "scissors",        # Not used but for reference
        77: "teddy bear",      # Not used but for reference
        78: "hair drier",      # Not used but for reference
        79: "toothbrush"       # Not used but for reference
    }
    
    # Paper/notebook might not be in COCO, so we'll use book as proxy
    # or detect based on rectangular shapes
    TARGET_CLASSES = {
        67: "cell phone",
        73: "book"
    }
    
    # Confidence threshold for detections
    CONFIDENCE_THRESHOLD = 0.4
    
    def __init__(self, model_path: str = "yolov8n.pt"):
        """
        Initialize detection service and load YOLOv8 model.
        
        Args:
            model_path: Path to YOLOv8 model file (default: yolov8n.pt - nano model for speed)
        """
        try:
            # Load YOLOv8 model (will download if not present)
            # Using nano model (yolov8n.pt) for faster inference (1-2 FPS target)
            self.model = YOLO(model_path)
            print(f"YOLOv8 model loaded successfully: {model_path}")
        except Exception as e:
            raise RuntimeError(f"Failed to load YOLOv8 model: {str(e)}")
    
    def _decode_image(self, image_data: bytes) -> np.ndarray:
        """
        Decode image bytes to OpenCV format.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            numpy array representing the image (BGR format for OpenCV)
        """
        try:
            # Decode image from bytes
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image. Invalid image format.")
            
            return image
        except Exception as e:
            raise ValueError(f"Image decoding error: {str(e)}")
    
    def _decode_base64_image(self, base64_string: str) -> np.ndarray:
        """
        Decode base64 encoded image to OpenCV format.
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            numpy array representing the image (BGR format for OpenCV)
        """
        try:
            # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,...")
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_string)
            
            # Decode image from bytes
            return self._decode_image(image_bytes)
        except Exception as e:
            raise ValueError(f"Base64 image decoding error: {str(e)}")
    
    def _detect_objects(self, image: np.ndarray) -> List[Dict]:
        """
        Run YOLOv8 inference on image.
        
        Args:
            image: Image as numpy array (BGR format)
            
        Returns:
            List of detected objects with class, confidence, and bounding box
        """
        try:
            # Run YOLOv8 inference
            # conf parameter sets minimum confidence threshold
            results = self.model(image, conf=self.CONFIDENCE_THRESHOLD, verbose=False)
            
            detections = []
            
            # Process results
            for result in results:
                boxes = result.boxes
                
                for box in boxes:
                    # Get class ID and confidence
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    
                    # Check if detected class is a target cheating object
                    if class_id in self.TARGET_CLASSES:
                        detections.append({
                            "class_id": class_id,
                            "class_name": self.TARGET_CLASSES[class_id],
                            "confidence": confidence,
                            "bbox": box.xyxy[0].cpu().numpy().tolist()  # [x1, y1, x2, y2]
                        })
            
            return detections
        except Exception as e:
            raise RuntimeError(f"YOLOv8 inference error: {str(e)}")
    
    def _detect_paper_notebook(self, image: np.ndarray, detections: List[Dict]) -> List[Dict]:
        """
        Detect paper/notebook using shape detection (rectangular objects).
        This is a fallback since paper/notebook might not be in COCO classes.
        
        Args:
            image: Image as numpy array
            detections: Existing detections from YOLOv8
            
        Returns:
            Updated list of detections including paper/notebook if found
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter for rectangular shapes (potential paper/notebook)
            for contour in contours:
                # Approximate contour to polygon
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Check if it's roughly rectangular (4 corners)
                if len(approx) == 4:
                    area = cv2.contourArea(contour)
                    
                    # Filter by size (reasonable paper size)
                    if area > 5000:  # Minimum area threshold
                        x, y, w, h = cv2.boundingRect(contour)
                        aspect_ratio = float(w) / h
                        
                        # Paper/notebook typically has aspect ratio between 0.5 and 2.0
                        if 0.5 <= aspect_ratio <= 2.0:
                            # Calculate confidence based on how rectangular it is
                            rect_area = w * h
                            extent = float(area) / rect_area
                            
                            if extent > 0.7:  # At least 70% of bounding box is filled
                                confidence = min(extent * 0.6, 0.6)  # Cap at 0.6 for shape detection
                                
                                if confidence >= self.CONFIDENCE_THRESHOLD:
                                    detections.append({
                                        "class_id": -1,  # Custom class ID
                                        "class_name": "paper",
                                        "confidence": confidence,
                                        "bbox": [x, y, x + w, y + h]
                                    })
        except Exception as e:
            # If paper detection fails, continue with YOLOv8 detections only
            print(f"Paper detection warning: {str(e)}")
        
        return detections
    
    def detect_cheating_objects(self, image_data: bytes) -> Dict:
        """
        Main detection method for image bytes.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary with phoneDetected, detectedObjects, and confidence
        """
        # Decode image
        image = self._decode_image(image_data)
        
        # Run YOLOv8 detection
        detections = self._detect_objects(image)
        
        # Also check for paper/notebook using shape detection
        detections = self._detect_paper_notebook(image, detections)
        
        # Process results
        return self._process_detections(detections)
    
    def detect_cheating_objects_from_base64(self, base64_image: str) -> Dict:
        """
        Main detection method for base64 encoded image.
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Dictionary with phoneDetected, detectedObjects, and confidence
        """
        # Decode base64 image
        image = self._decode_base64_image(base64_image)
        
        # Run YOLOv8 detection
        detections = self._detect_objects(image)
        
        # Also check for paper/notebook using shape detection
        detections = self._detect_paper_notebook(image, detections)
        
        # Process results
        return self._process_detections(detections)
    
    def _process_detections(self, detections: List[Dict]) -> Dict:
        """
        Process detection results and format response.
        
        Args:
            detections: List of detected objects
            
        Returns:
            Formatted dictionary with detection results
        """
        # Check if cell phone is detected
        phone_detected = any(
            det["class_name"] == "cell phone" 
            for det in detections
        )
        
        # Get unique detected object names
        detected_objects = list(set([det["class_name"] for det in detections]))
        
        # Get highest confidence score
        highest_confidence = 0.0
        if detections:
            highest_confidence = max([det["confidence"] for det in detections])
        
        return {
            "phoneDetected": phone_detected,
            "detectedObjects": detected_objects,
            "confidence": round(highest_confidence, 3)  # Round to 3 decimal places
        }

