"""
FastAPI application for cheating detection using YOLOv8.
Main entry point for the cheating detection service.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import uvicorn
from services.detection_service import DetectionService

# Initialize FastAPI app
app = FastAPI(
    title="Cheating Detection API",
    description="API for detecting cheating materials using YOLOv8",
    version="1.0.0"
)

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detection service (loads YOLOv8 model)
detection_service = DetectionService()


class DetectionResponse(BaseModel):
    """Response model for cheating detection endpoint."""
    phoneDetected: bool
    detectedObjects: List[str]
    confidence: float


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "cheating-detection"}


@app.post("/detect-cheating", response_model=DetectionResponse)
async def detect_cheating(file: UploadFile = File(...)):
    """
    Detect cheating materials in an uploaded image.
    
    Args:
        file: Image file (multipart/form-data) or base64 encoded image
        
    Returns:
        DetectionResponse with phoneDetected, detectedObjects, and confidence
        
    Raises:
        HTTPException: If image processing fails or invalid input
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only image files are allowed."
            )
        
        # Read image data
        image_data = await file.read()
        
        if not image_data or len(image_data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty image file provided."
            )
        
        # Validate image size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(image_data) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Image file too large. Maximum size is {max_size / (1024*1024)}MB."
            )
        
        # Process image and detect cheating objects
        result = detection_service.detect_cheating_objects(image_data)
        
        return DetectionResponse(
            phoneDetected=result["phoneDetected"],
            detectedObjects=result["detectedObjects"],
            confidence=result["confidence"]
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors safely
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@app.post("/detect-cheating-base64", response_model=DetectionResponse)
async def detect_cheating_base64(data: dict):
    """
    Detect cheating materials from base64 encoded image.
    
    Args:
        data: JSON object with 'image' field containing base64 string
        
    Returns:
        DetectionResponse with phoneDetected, detectedObjects, and confidence
    """
    try:
        # Validate input
        if "image" not in data:
            raise HTTPException(
                status_code=400,
                detail="Missing 'image' field in request body."
            )
        
        base64_image = data["image"]
        
        if not base64_image or not isinstance(base64_image, str):
            raise HTTPException(
                status_code=400,
                detail="Invalid base64 image data."
            )
        
        # Process base64 image
        result = detection_service.detect_cheating_objects_from_base64(base64_image)
        
        return DetectionResponse(
            phoneDetected=result["phoneDetected"],
            detectedObjects=result["detectedObjects"],
            confidence=result["confidence"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing base64 image: {str(e)}"
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # fallback 8000
    uvicorn.run("main:app", host="0.0.0.0", port=port)

