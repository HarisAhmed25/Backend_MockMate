"""
Run script for the cheating detection service.
Usage: python run.py
"""

import uvicorn

if __name__ == "__main__":
    # Run FastAPI server
    # Optimized for performance (1-2 FPS target, <300ms response time)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=1,  # Single worker for consistent performance
        log_level="info"
    )

