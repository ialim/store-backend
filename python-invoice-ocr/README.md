Python Invoice OCR Microservice

Overview
- Small FastAPI service that accepts a PDF/image (base64) and returns structured invoice data.
- Uses:
  - pdfplumber for PDF text extraction
  - Optional camelot for PDF table extraction (better on vector PDFs)
  - OpenCV + Tesseract (pytesseract) for image OCR

API
- POST /parse
  - Body (JSON): { "contentType": "application/pdf|image/jpeg|...", "data": "<base64>" }
  - Response JSON: { supplierName?, invoiceNumber?, date?, total?, lines: [ { description, qty, unitPrice, lineTotal, discountPct?, discountedUnitPrice? } ], rawText? }

Environment tuning
- OCR_RASTER_DPI: base DPI for scanned PDF rasterization (default: 300). Try 400–450 for small fonts.
- OCR_PSMS: comma-separated Tesseract PSMs to try (default: 6,4,12,11,3).
- OCR_REMOVE_LINES: set to 1 to attempt table border line removal before OCR.

Quick Start
1) System deps (macOS example):
   - brew install tesseract ghostscript
   - (Optional for better PDF rasterization) brew install poppler
2) Python deps:
   - python3 -m venv .venv && source .venv/bin/activate
   - pip install -r requirements.txt
3) Run:
   - uvicorn app:app --host 0.0.0.0 --port 8000

Configure Backend
- In the Node backend env:
  - INVOICE_OCR_PROVIDER=python
  - INVOICE_OCR_URL=http://localhost:8000/parse

Notes
- Camelot requires Ghostscript. If camelot import fails, the service continues without table extraction.
- For noisy mobile photos, consider preprocessing (binarization/deskew). The app includes light preproc.
