"""
Example usage of the cheating detection API.
Demonstrates how to call the /detect-cheating endpoint.
"""

import requests
import base64
from pathlib import Path


def test_multipart_upload(image_path: str):
    """
    Test the /detect-cheating endpoint with multipart/form-data.
    
    Args:
        image_path: Path to image file
    """
    url = "http://localhost:8000/detect-cheating"
    
    with open(image_path, "rb") as f:
        files = {"file": (Path(image_path).name, f, "image/jpeg")}
        response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")


def test_base64_upload(image_path: str):
    """
    Test the /detect-cheating-base64 endpoint with base64 encoded image.
    
    Args:
        image_path: Path to image file
    """
    url = "http://localhost:8000/detect-cheating-base64"
    
    # Read and encode image to base64
    with open(image_path, "rb") as f:
        image_bytes = f.read()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    # Send request
    payload = {"image": base64_image}
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")


if __name__ == "__main__":
    # Example usage
    # Replace with your actual image path
    image_path = "test_image.jpg"
    
    print("Testing multipart upload:")
    test_multipart_upload(image_path)
    
    print("\nTesting base64 upload:")
    test_base64_upload(image_path)

