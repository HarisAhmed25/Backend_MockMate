"""
Run script for the cheating detection service.
Usage: python3 run.py
"""

import os
import uvicorn

# -------------------------------
# Optional: Print env variables for testing
# -------------------------------
if os.environ.get("MONGO_URI"):
    print("MONGO_URI detected in Python:", os.environ.get("MONGO_URI"))
else:
    print("MONGO_URI not found in Python environment!")

# -------------------------------
# Run FastAPI server
# -------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("CHEATING_DETECTION_PORT", 8000)),  # use env var if provided
        workers=1,  # single worker for consistent performance
        log_level="info"
    )
