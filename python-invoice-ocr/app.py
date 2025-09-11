import base64
import io
import re
from datetime import datetime
from typing import List, Optional

import pdfplumber
from fastapi import FastAPI
from pydantic import BaseModel

try:
    import camelot  # type: ignore
    HAS_CAMELOT = True
except Exception:
    HAS_CAMELOT = False

try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
    import pytesseract  # type: ignore
    HAS_CV = True
except Exception:
    HAS_CV = False


class ParseRequest(BaseModel):
    contentType: Optional[str] = None
    data: str  # base64


class Line(BaseModel):
    description: str
    qty: float
    unitPrice: float
    lineTotal: float
    discountPct: Optional[float] = None
    discountedUnitPrice: Optional[float] = None


class ParseResponse(BaseModel):
    supplierName: Optional[str] = None
    invoiceNumber: Optional[str] = None
    date: Optional[datetime] = None
    total: Optional[float] = None
    lines: List[Line] = []  # type: ignore
    rawText: Optional[str] = None


app = FastAPI()


def b64_to_bytes(b64: str) -> bytes:
    return base64.b64decode(b64)


def extract_text_pdf(data: bytes) -> str:
    text_parts: List[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text(x_tolerance=1.5, y_tolerance=1.5) or ""
            if t:
                text_parts.append(t)
    # Try camelot tables if available
    if HAS_CAMELOT:
        try:
            # Camelot expects a file path; write to memory buffer workaround via temporary file
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
                tmp.write(data)
                tmp.flush()
                tables = camelot.read_pdf(tmp.name, pages='all', flavor='lattice')
                for tb in tables:
                    df = tb.df
                    # Append table rows as text lines
                    for _, row in df.iterrows():
                        text_parts.append(" ".join(map(str, row.tolist())))
        except Exception:
            pass
    return "\n".join(text_parts)


def ocr_image(data: bytes) -> str:
    if not HAS_CV:
        return ""
    img = np.frombuffer(data, dtype=np.uint8)
    im = cv2.imdecode(img, cv2.IMREAD_COLOR)
    if im is None:
        return ""
    # Light preprocess: grayscale, bilateral filter, adaptive threshold
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    blur = cv2.bilateralFilter(gray, 9, 75, 75)
    th = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY, 31, 10)
    cfg = "--psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:%-()[] "
    text = pytesseract.image_to_string(th, config=cfg)
    return text or ""


def to_number(s: str) -> Optional[float]:
    s = s.replace(",", "")
    try:
        return float(s)
    except Exception:
        return None


def parse_text(text: str) -> ParseResponse:
    resp = ParseResponse(lines=[])
    norm = text.replace("\r", "")
    m = re.search(r"(Invoice|Invoice\s*#|Invoice\s*No\.?):\s*([A-Z0-9-]+)", norm, re.I)
    if m:
        resp.invoiceNumber = m.group(2)
    m = re.search(r"(Date|Invoice\s*Date):\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", norm, re.I)
    if m:
        try:
            ds = m.group(2).replace('-', '/').replace('.', '/')
            resp.date = datetime.strptime(ds, "%d/%m/%Y")
        except Exception:
            pass
    m = re.search(r"(Seinde\s+Signature\s+Ltd|Seinde\s+Signature|Supplier:\s*([\w .&-]+))", norm, re.I)
    if m:
        resp.supplierName = m.group(2) or m.group(1)
    # Heuristics: if supplier not found, try common vendor identifiers in the header/footer
    if not resp.supplierName:
        header_lines = [ln.strip() for ln in norm.split("\n")[:30] if ln.strip()]
        joined = "\n".join(header_lines).lower()
        if "seinde signature" in joined or "salondeparfum" in joined:
            resp.supplierName = "Seinde Signature Ltd"

    lines = [ln.strip() for ln in norm.split("\n") if ln.strip()]
    for ln in lines:
        if ln.lower().startswith('total'):
            break
        cleaned = re.sub(r"[\[\]()|]", " ", ln)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # Only consider lines that start with a quantity number
        if not re.match(r"^\d{1,5}\b", cleaned):
            continue
        # Patterns
        m = re.match(r"^(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+(\d{1,2})%\s+([\d,.]+)\s+([\d,.]+)$", cleaned)
        if m:
            qty = float(m.group(1))
            desc = m.group(2)
            unit = to_number(m.group(3)) or 0.0
            disc = float(m.group(4))
            disc_unit = to_number(m.group(5)) or None
            total = to_number(m.group(6)) or qty * unit
            resp.lines.append(Line(description=desc, qty=qty, unitPrice=unit, lineTotal=total,
                                   discountPct=disc, discountedUnitPrice=disc_unit))
            continue
        m = re.match(r"^(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+([\d,.]+)$", cleaned)
        if m:
            qty = float(m.group(1))
            desc = m.group(2)
            unit = to_number(m.group(3)) or 0.0
            total = to_number(m.group(4)) or qty * unit
            resp.lines.append(Line(description=desc, qty=qty, unitPrice=unit, lineTotal=total))
            continue
        # Fuzzy as last resort for qty-first lines
        tokens = cleaned.split()
        nums = [(i, re.sub(r"[^0-9.,]", "", t)) for i, t in enumerate(tokens) if re.search(r"\d", t)]
        if not nums:
            continue
        try:
            qty = int(re.sub(r"[^0-9]", "", tokens[0]))
        except Exception:
            continue
        # pick last numeric as total
        try:
            total = float(nums[-1][1].replace(",", ""))
        except Exception:
            continue
        unit = round(total / qty, 2) if qty else None
        desc = " ".join(tokens[1:nums[0][0]]).strip()
        if desc and unit is not None:
            resp.lines.append(Line(description=desc, qty=qty, unitPrice=unit, lineTotal=round(total, 2)))

    m = re.search(r"\b(total|amount\s*due)\b(.*)$", norm, re.I | re.M)
    if m:
        tail = m.group(2)
        nums = re.findall(r"([\d,]+(?:\.\d{2})?)", tail)
        if nums:
            try:
                resp.total = float(nums[-1].replace(",", ""))
            except Exception:
                pass
    resp.rawText = text
    return resp


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
    data = b64_to_bytes(req.data)
    ct = (req.contentType or "").lower()
    text = ""
    if "pdf" in ct:
        text = extract_text_pdf(data)
    elif ct.startswith("image/"):
        text = ocr_image(data)
    if not text:
        # Try OCR as ultimate fallback
        text = ocr_image(data)
    return parse_text(text)


@app.get("/health")
def health():
    return {"ok": True, "hasCamelot": HAS_CAMELOT, "hasCV": HAS_CV}
