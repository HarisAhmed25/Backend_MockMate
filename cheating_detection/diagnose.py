"""
Diagnostic script to check Python service setup
Run: python diagnose.py
"""

import sys
import os

print("=" * 50)
print("Python Cheating Detection Service - Diagnostics")
print("=" * 50)
print()

# Check Python version
print("1. Checking Python version...")
print(f"   Python: {sys.version}")
if sys.version_info < (3, 7):
    print("   [X] ERROR: Python 3.7+ required")
    sys.exit(1)
else:
    print("   [OK] Python version OK")
print()

# Check required modules
print("2. Checking required modules...")
required_modules = [
    'numpy', 'cv2', 'ultralytics', 'fastapi', 
    'uvicorn', 'pydantic', 'PIL'
]

missing_modules = []
for module in required_modules:
    try:
        if module == 'cv2':
            __import__('cv2')
        elif module == 'PIL':
            __import__('PIL')
        else:
            __import__(module)
        print(f"   [OK] {module}")
    except ImportError:
        print(f"   [X] {module} - NOT INSTALLED")
        missing_modules.append(module)

if missing_modules:
    print()
    print("   Missing modules detected!")
    print("   Run: pip install -r requirements.txt")
    print()
else:
    print("   [OK] All modules installed")
print()

# Check files
print("3. Checking required files...")
required_files = [
    'main.py',
    'run.py',
    'services/detection_service.py',
    'services/__init__.py',
    'requirements.txt'
]

missing_files = []
for file in required_files:
    if os.path.exists(file):
        print(f"   [OK] {file}")
    else:
        print(f"   [X] {file} - NOT FOUND")
        missing_files.append(file)

if missing_files:
    print()
    print("   Missing files detected!")
    sys.exit(1)
else:
    print("   [OK] All files present")
print()

# Check numpy function
print("4. Checking numpy functions...")
try:
    import numpy as np
    if hasattr(np, 'frombuffer'):
        print("   [OK] np.frombuffer exists")
    else:
        print("   [X] np.frombuffer NOT FOUND - numpy version issue")
        print("   Run: pip install --upgrade numpy")
except Exception as e:
    print(f"   [X] Error checking numpy: {e}")
print()

# Final summary
print("=" * 50)
if not missing_modules and not missing_files:
    print("[OK] All checks passed!")
    print()
    print("To start the service, run:")
    print("   python run.py")
else:
    print("[X] Issues found - please fix them first")
    if missing_modules:
        print(f"   Install: pip install {' '.join(missing_modules)}")
print("=" * 50)

