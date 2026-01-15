"""
Quick script to check if Python service is running
Usage: python check_service.py
"""

import requests
import sys

SERVICE_URL = "http://localhost:8000"

try:
    response = requests.get(f"{SERVICE_URL}/", timeout=2)
    if response.status_code == 200:
        print("✅ Python service is running!")
        print(f"   Status: {response.json()}")
        sys.exit(0)
    else:
        print(f"❌ Service returned status code: {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("❌ Python service is NOT running!")
    print(f"   Could not connect to {SERVICE_URL}")
    print("\n   To start the service, run:")
    print("   python run.py")
    print("   or")
    print("   ./start_service.sh (Linux/Mac)")
    print("   start_service.bat (Windows)")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error checking service: {e}")
    sys.exit(1)

