==========================================
Python Cheating Detection Service Setup
==========================================

ISSUE: Python service connection failed: http://localhost:8000

SOLUTION STEPS:
==========================================

1. INSTALL PYTHON (if not installed)
   - Download from: https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation
   - Verify: python --version

2. INSTALL DEPENDENCIES
   Open terminal/command prompt in cheating_detection folder:
   
   Windows:
   pip install -r requirements.txt
   
   Linux/Mac:
   pip3 install -r requirements.txt

3. START THE SERVICE
   
   Option A - Windows (Double click):
   start_service.bat
   
   Option B - Windows (Command Prompt):
   cd cheating_detection
   python run.py
   
   Option C - Linux/Mac:
   cd cheating_detection
   chmod +x start_service.sh
   ./start_service.sh
   
   OR:
   python3 run.py

4. VERIFY SERVICE IS RUNNING
   Open browser: http://localhost:8000
   Should see: {"status":"ok","service":"cheating-detection"}
   
   OR run:
   python check_service.py

5. KEEP SERVICE RUNNING
   - Keep the terminal window open
   - Service must be running for backend to work
   - If you close terminal, service stops

TROUBLESHOOTING:
==========================================

Error: "Python is not recognized"
→ Install Python and add to PATH

Error: "pip is not recognized"  
→ Use: python -m pip install -r requirements.txt

Error: "Port 8000 already in use"
→ Change port in run.py (line 14) to 8001
→ Update PYTHON_SERVICE_URL in backend .env file

Error: "Failed to load YOLOv8 model"
→ First run will download model (~6MB)
→ Make sure you have internet connection
→ Wait for download to complete

Error: "Module not found"
→ Run: pip install -r requirements.txt again

PORT CONFIGURATION:
==========================================
Default: http://localhost:8000

To change port:
1. Edit cheating_detection/run.py (line 14)
2. Edit backend .env file:
   PYTHON_SERVICE_URL=http://localhost:8001

QUICK START:
==========================================
1. cd cheating_detection
2. pip install -r requirements.txt
3. python run.py
4. Keep terminal open!

Service will be available at: http://localhost:8000

