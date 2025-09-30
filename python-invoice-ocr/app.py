import base64
import io
import os
import re
from datetime import datetime
from typing import List, Optional, Tuple, Dict

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

# Optional import of the generic transfer parser (from generic_transfer.py)
try:
    # Local sibling module providing GenericConfig/extract
    from generic_transfer import GenericConfig as GenericTransferConfig  # type: ignore
    from generic_transfer import extract as generic_transfer_extract  # type: ignore
    HAS_GENERIC_TRANSFER = True
except Exception:
    # Fallback: load directly from file by path
    try:
        import importlib.util
        import pathlib
        _gt_path = pathlib.Path(__file__).with_name('generic_transfer.py')
        spec = importlib.util.spec_from_file_location('generic_transfer', str(_gt_path))
        if spec and spec.loader:
            _mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(_mod)
            GenericTransferConfig = getattr(_mod, 'GenericConfig')  # type: ignore
            generic_transfer_extract = getattr(_mod, 'extract')  # type: ignore
            HAS_GENERIC_TRANSFER = True
        else:
            HAS_GENERIC_TRANSFER = False
    except Exception:
        HAS_GENERIC_TRANSFER = False


class ParseRequest(BaseModel):
    contentType: Optional[str] = None
    data: str  # base64


class Line(BaseModel):
    description: str
    item: Optional[str] = None
    qty: float
    unitPrice: float
    unit: Optional[float] = None
    lineTotal: float
    barcode: Optional[str] = None
    discountPct: Optional[float] = None
    discountedUnitPrice: Optional[float] = None


class ParseResponse(BaseModel):
    supplierName: Optional[str] = None
    invoiceNumber: Optional[str] = None
    date: Optional[datetime] = None
    total: Optional[float] = None
    lines: List[Line] = []  # type: ignore
    rawText: Optional[str] = None
    parser: Optional[str] = None  # which parser produced the result
    textSource: Optional[str] = None  # how text was obtained (pdf_text, ocrmypdf, ocr_raster_XXX, ocr_image)


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
                if tables and len(tables):
                    for tb in tables:
                        df = tb.df
                        # Append table rows as text lines
                        for _, row in df.iterrows():
                            text_parts.append(" ".join(map(str, row.tolist())))
                else:
                    # Fallback to stream mode for tables without explicit lines
                    tables = camelot.read_pdf(tmp.name, pages='all', flavor='stream')
                    for tb in tables:
                        df = tb.df
                        for _, row in df.iterrows():
                            text_parts.append(" ".join(map(str, row.tolist())))
        except Exception:
            pass
    return "\n".join(text_parts)


# ------------------------------
# Specialized parser: Warehouse Transfer (Description, Bar Code, Qty, Price, Amount)
# Ported and simplified from test script that performs well on ELEMOH.PDF
# ------------------------------

def _clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _normalize_money(s: str) -> Optional[float]:
    s = s.strip()
    s = s.replace("₦", "").replace("NGN", "").replace("ngn", "").replace("Naira", "")
    s = s.replace(" ", "")
    neg = False
    if s.startswith("(") and s.endswith(")"):
        neg = True
        s = s[1:-1]
    m = re.findall(r"-?[0-9.,]+", s)
    if not m:
        return None
    val = float(m[0].replace(",", ""))
    return -val if neg else val


def _parse_transfer_row(line: str, money_re: re.Pattern, qty_re: re.Pattern, barcode_re: re.Pattern):
    tokens = _clean_spaces(line).split(" ")
    if len(tokens) < 5:
        return None
    i = len(tokens) - 1
    # Amount
    if i < 0 or not money_re.match(tokens[i]):
        return None
    amount_s = tokens[i]; i -= 1
    # Price
    if i < 0 or not money_re.match(tokens[i]):
        return None
    price_s = tokens[i]; i -= 1
    # Qty
    if i < 0 or not qty_re.match(tokens[i]):
        return None
    qty_s = tokens[i]; i -= 1
    # Barcode
    if i < 0 or not barcode_re.match(tokens[i]):
        return None
    barcode = tokens[i]; i -= 1
    # Description (remaining left tokens)
    desc = _clean_spaces(" ".join(tokens[:i+1]))
    if not desc:
        return None
    return (
        desc,
        barcode,
        int(qty_s),
        _normalize_money(price_s) or 0.0,
        _normalize_money(amount_s) or 0.0,
    )


def try_parse_warehouse_transfer(text: str) -> Optional[Dict[str, any]]:
    # Quick detector: header and table header keywords
    if not re.search(r"Description\s+Bar\s*Code\s+Qty\.?\s+Price\s+Amount", text, re.I):
        return None
    noise_patterns = [
        r"^\s*WAREHOUSE\s*:\s*Transfer between warehouses\s*$",
        r"^\s*BEAUTY\s*&\s*FRAGRANCE\s*$",
        r"^\s*\d{1,2}/\d{1,2}/\d{4}\s*Page\d+\s*$",
        r"^\s*Description\s+Bar\s*Code\s+Qty\.?\s+Price\s+Amount\s*$",
        r"^\s*Source\s*Warehouse\s*:\s*$",
        r"^\s*Destination\s*location\s*:\s*$",
    ]
    noise_res = [re.compile(p, re.I) for p in noise_patterns]
    def is_noise(s: str) -> bool:
        return any(p.match(s) for p in noise_res)

    money_re = re.compile(r"^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$")
    qty_re = re.compile(r"^\d+$")
    mn, mx = _get_barcode_len_range()
    barcode_re = re.compile(rf"^\d{{{mn},{mx}}}$")
    total_re = re.compile(r"TOTAL\s*:\s*(?P<qty>\d+)\s+(?P<amount>\d{1,3}(?:,\d{3})*(?:\.\d{2})?)", re.I)

    items: List[Dict[str, any]] = []
    reported_qty = None
    reported_amt = None
    for raw in text.splitlines():
        line = _clean_spaces(raw)
        if not line or is_noise(line):
            continue
        if re.search(r"\bPage\s*\d+\b", line, re.I):
            continue
        tm = total_re.search(line)
        if tm:
            try:
                reported_qty = int(tm.group("qty"))
            except Exception:
                pass
            reported_amt = _normalize_money(tm.group("amount"))
            continue
        parsed = _parse_transfer_row(line, money_re, qty_re, barcode_re)
        if parsed:
            desc, code, qty, price, amount = parsed
            items.append({
                "description": desc,
                "barcode": code,
                "qty": qty,
                "unitPrice": price,
                "lineTotal": amount,
            })
    if not items:
        return None
    # Compute header total if reported
    total_amount = reported_amt if isinstance(reported_amt, (int, float)) else None
    return {
        "supplierName": None,
        "invoiceNumber": None,
        "date": None,
        "total": total_amount,
        "lines": items,
    }


def _deskew(gray: "np.ndarray") -> Tuple["np.ndarray", float]:
    try:
        inv = cv2.bitwise_not(gray)
        coords = cv2.findNonZero(inv)
        if coords is None:
            return gray, 0.0
        coords = coords.reshape(-1, 2)
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 0.5:
            return gray, 0.0
        (h, w) = gray.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, angle
    except Exception:
        return gray, 0.0


def _auto_orient(gray: "np.ndarray") -> "np.ndarray":
    if not HAS_CV:
        return gray
    try:
        osd = pytesseract.image_to_osd(gray)
        m = re.search(r"Rotate:\s*(\d+)", osd)
        if not m:
            return gray
        rot = int(m.group(1)) % 360
        if rot == 0:
            return gray
        (h, w) = gray.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), -rot, 1.0)
        return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    except Exception:
        return gray


def _remove_lines(bin_img: "np.ndarray") -> "np.ndarray":
    # Remove prominent horizontal/vertical lines (table borders) that can confuse OCR
    try:
        inv = cv2.bitwise_not(bin_img)
        h = max(1, bin_img.shape[0] // 200)
        w = max(1, bin_img.shape[1] // 200)
        horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(10, bin_img.shape[1] // 30), h))
        vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w, max(10, bin_img.shape[0] // 30)))
        detect_h = cv2.morphologyEx(inv, cv2.MORPH_OPEN, horiz_kernel, iterations=1)
        detect_v = cv2.morphologyEx(inv, cv2.MORPH_OPEN, vert_kernel, iterations=1)
        lines = cv2.bitwise_or(detect_h, detect_v)
        cleaned = cv2.bitwise_and(bin_img, cv2.bitwise_not(lines))
        return cleaned
    except Exception:
        return bin_img


def _preprocess_for_ocr(im: "np.ndarray") -> "np.ndarray":
    # Grayscale
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    # Upscale slightly to help Tesseract with small fonts
    h, w = gray.shape[:2]
    scale = 2 if max(h, w) < 1500 else 1
    if scale != 1:
        gray = cv2.resize(gray, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    # Auto-orient via Tesseract OSD, then deskew
    gray = _auto_orient(gray)
    gray, _ = _deskew(gray)
    # Contrast enhancement (CLAHE)
    try:
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
    except Exception:
        pass
    # Denoise
    blur = cv2.bilateralFilter(gray, 9, 75, 75)
    # Two thresholding strategies: adaptive and Otsu
    th_adapt = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 31, 10)
    try:
        _, th_otsu = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    except Exception:
        th_otsu = th_adapt
    # Optional line removal
    if os.getenv('OCR_REMOVE_LINES', '0') in ('1', 'true', 'TRUE', 'yes', 'on'):
        th_adapt = _remove_lines(th_adapt)
        th_otsu = _remove_lines(th_otsu)
    # Choose threshold with more foreground pixels (heuristic)
    try:
        inv_a = 255 - th_adapt
        inv_o = 255 - th_otsu
        return th_adapt if cv2.countNonZero(inv_a) >= cv2.countNonZero(inv_o) * 0.9 else th_otsu
    except Exception:
        return th_adapt


def _get_psms() -> list:
    raw = os.getenv('OCR_PSMS', '')
    if raw:
        out = []
        for tok in raw.split(','):
            tok = tok.strip()
            if not tok:
                continue
            try:
                out.append(int(tok))
            except Exception:
                pass
        if out:
            return out
    return [6, 4, 12, 11, 3]


def ocr_image(data: bytes) -> str:
    if not HAS_CV:
        return ""
    img = np.frombuffer(data, dtype=np.uint8)
    im = cv2.imdecode(img, cv2.IMREAD_COLOR)
    if im is None:
        return ""
    th = _preprocess_for_ocr(im)
    base = "--oem 3 -l eng -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:%-()[] "
    for psm in _get_psms():
        cfg = f"{base} --psm {psm}"
        text = pytesseract.image_to_string(th, config=cfg)
        if text and len(text.strip()) >= 10:
            return text
    return text or ""


def ocr_pil_image(pil_img: "PIL.Image.Image") -> str:
    if not HAS_CV:
        return ""
    # Convert PIL image to OpenCV BGR
    im = cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)
    th = _preprocess_for_ocr(im)
    base = "--oem 3 -l eng -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:%-()[] "
    for psm in _get_psms():
        cfg = f"{base} --psm {psm}"
        text = pytesseract.image_to_string(th, config=cfg)
        if text and len(text.strip()) >= 10:
            return text
    return text or ""


def ocr_pdf_raster(data: bytes, dpi: int = 300) -> str:
    # Rasterize PDF pages and OCR each
    if not HAS_CV:
        return ""
    try:
        import pdfplumber
        pages_text: List[str] = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                try:
                    # Render page to image using pdfplumber (Pillow under the hood)
                    img = page.to_image(resolution=dpi).original
                    txt = ocr_pil_image(img)
                    if txt:
                        pages_text.append(txt)
                except Exception:
                    continue
        return "\n\n".join(pages_text)
    except Exception:
        return ""


def ocr_via_ocrmypdf(data: bytes) -> str:
    """Use OCRmyPDF to produce a searchable PDF, then extract text.
    Requires system deps (qpdf, ghostscript, tesseract) and Python ocrmypdf.
    """
    try:
        import tempfile
        import ocrmypdf  # type: ignore
        with tempfile.NamedTemporaryFile(suffix=".pdf") as fin, tempfile.NamedTemporaryFile(suffix=".pdf") as fout:
            fin.write(data)
            fin.flush()
            ocrmypdf.ocr(
                fin.name,
                fout.name,
                language="eng",
                rotate_pages=True,
                deskew=True,
                skip_text=True,
                optimize=1,
            )
            fout.seek(0)
            out_pdf = fout.read()
        # Extract text from the OCRed PDF
        return extract_text_pdf(out_pdf)
    except Exception:
        return ""


def to_number(s: str) -> Optional[float]:
    # Normalize common currency formats (₦, NGN, parentheses for negatives)
    if not s:
        return None
    s = s.strip()
    s = s.replace("₦", "").replace("NGN", "").replace("ngn", "").replace("Naira", "")
    s = s.replace(" ", "")
    neg = False
    if s.startswith("(") and s.endswith(")"):
        neg = True
        s = s[1:-1]
    # Keep digits, comma, dot, optional leading minus
    m = re.findall(r"-?[0-9.,]+", s)
    if not m:
        return None
    s = m[0].replace(",", "")
    try:
        v = float(s)
        return -v if neg else v
    except Exception:
        return None


def _get_barcode_len_range() -> Tuple[int, int]:
    try:
        mn = int(os.getenv('BARCODE_MIN_LENGTH', '8'))
    except Exception:
        mn = 8
    try:
        mx = int(os.getenv('BARCODE_MAX_LENGTH', '14'))
    except Exception:
        mx = 14
    if mn < 4:
        mn = 4
    if mx < mn:
        mx = mn
    return mn, mx


def _extract_barcode_from_text(text: str) -> Tuple[str, Optional[str]]:
    """Find a configurable-length digit token in text and remove it from description."""
    if not text:
        return text, None
    mn, mx = _get_barcode_len_range()
    m = re.search(rf"(^|\s)(\d{{{mn},{mx}}})(?=\s|$)", text)
    if not m:
        return text, None
    code = m.group(2)
    # Remove the matched barcode token and clean spaces
    start, end = m.span(2)
    cleaned = (text[:start] + text[end:]).strip()
    cleaned = _clean_spaces(cleaned)
    return cleaned, code


# ------------------------------
# Use generic transfer parser (from test.py)
# ------------------------------

def _map_generic_transfer_to_response(
    header: "object",
    items: List["object"],
    reported_total_qty: Optional[int],
    reported_total_amount: Optional[float],
) -> ParseResponse:
    resp = ParseResponse(lines=[])
    resp.parser = "generic_transfer"
    resp.textSource = "pdf_direct"
    # Try parse date from header if present (dd/mm/yyyy or variants)
    dt_str = getattr(header, "date_transfer", None)
    if dt_str:
        for fmt in ("%d/%m/%Y", "%d/%m/%y", "%m/%d/%Y", "%m/%d/%y"):
            try:
                resp.date = datetime.strptime(dt_str.replace("-", "/"), fmt)
                break
            except Exception:
                pass
    # Lines mapping
    total_amount = 0.0
    for it in items:
        desc = getattr(it, "description", "")
        qty = float(getattr(it, "qty", 0) or 0)
        unit = float(getattr(it, "price", 0.0) or 0.0)
        amt = float(getattr(it, "amount", qty * unit) or 0.0)
        desc, code = _extract_barcode_from_text(str(desc)) if getattr(it, "barcode", None) is None else (str(desc), getattr(it, "barcode", None))
        total_amount += amt
        resp.lines.append(
            Line(
                description=str(desc),
                item=str(desc),
                qty=qty,
                unitPrice=unit,
                unit=unit,
                lineTotal=amt,
                barcode=code,
                discountPct=None,
                discountedUnitPrice=None,
            )
        )
    # Prefer reported total if available
    if isinstance(reported_total_amount, (int, float)):
        resp.total = float(reported_total_amount)
    else:
        resp.total = float(total_amount)
    return resp


def try_parse_with_generic_transfer_pdf_bytes(data: bytes) -> Optional[ParseResponse]:
    if not HAS_GENERIC_TRANSFER:
        return None
    try:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
            tmp.write(data)
            tmp.flush()
            # Configure barcode length if provided via environment
            mn, mx = _get_barcode_len_range()
            cfg = GenericTransferConfig(barcode_regex=rf"^\d{{{mn},{mx}}}$")
            header, items, rep_qty, rep_amt = generic_transfer_extract(tmp.name, cfg)
            if items:
                return _map_generic_transfer_to_response(header, items, rep_qty, rep_amt)
    except Exception:
        return None
    return None


def parse_text(text: str) -> ParseResponse:
    resp = ParseResponse(lines=[])
    norm = text.replace("\r", "")
    # Try specialized Warehouse Transfer parser first (legacy in-file parser)
    try:
        transfer = try_parse_warehouse_transfer(norm)
        if transfer and transfer.get("lines"):
            resp.supplierName = transfer.get("supplierName")
            resp.invoiceNumber = transfer.get("invoiceNumber")
            resp.date = transfer.get("date")
            resp.total = transfer.get("total")
            # Map lines
            for it in transfer["lines"]:
                desc = str(it.get("description") or "")
                desc, code = _extract_barcode_from_text(desc) if not it.get("barcode") else (desc, it.get("barcode"))
                unit = float(it.get("unitPrice") or 0.0)
                resp.lines.append(Line(
                    description=desc,
                    item=desc,
                    qty=float(it.get("qty") or 0),
                    unitPrice=unit,
                    unit=unit,
                    lineTotal=float(it.get("lineTotal") or 0.0),
                    barcode=code,
                    discountPct=None,
                    discountedUnitPrice=None,
                ))
            resp.rawText = text
            resp.parser = "warehouse_transfer_text"
            return resp
    except Exception:
        # Swallow and continue with generic invoice parsing
        pass
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
            desc, barcode = _extract_barcode_from_text(desc)
            unit = to_number(m.group(3)) or 0.0
            disc = float(m.group(4))
            disc_unit = to_number(m.group(5)) or None
            total = to_number(m.group(6)) or qty * unit
            resp.lines.append(Line(description=desc, item=desc, qty=qty, unitPrice=unit, unit=unit, lineTotal=total,
                                   barcode=barcode, discountPct=disc, discountedUnitPrice=disc_unit))
            continue
        m = re.match(r"^(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+([\d,.]+)$", cleaned)
        if m:
            qty = float(m.group(1))
            desc = m.group(2)
            desc, barcode = _extract_barcode_from_text(desc)
            unit = to_number(m.group(3)) or 0.0
            total = to_number(m.group(4)) or qty * unit
            resp.lines.append(Line(description=desc, item=desc, qty=qty, unitPrice=unit, unit=unit, lineTotal=total, barcode=barcode))
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
        desc, barcode = _extract_barcode_from_text(desc)
        if desc and unit is not None:
            resp.lines.append(Line(description=desc, item=desc, qty=qty, unitPrice=unit, unit=unit, lineTotal=round(total, 2), barcode=barcode))

    m = re.search(r"\b(total\s*amount|grand\s*total|amount\s*due|total)\b(.*)$", norm, re.I | re.M)
    if m:
        tail = m.group(2)
        # try last number in trailing text using more robust to_number
        cand = None
        for n in re.findall(r"[-()₦NGN\s0-9.,]+", tail):
            val = to_number(n)
            if val is not None:
                cand = val
        if cand is not None:
            resp.total = cand
    resp.rawText = text
    # If we reached here, generic invoice heuristics produced the result
    resp.parser = resp.parser or "invoice_heuristics"
    return resp


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
    data = b64_to_bytes(req.data)
    ct = (req.contentType or "").lower()
    text = ""
    text_source: Optional[str] = None
    if "pdf" in ct:
        # First, attempt the robust generic transfer parser using the PDF bytes
        gt = try_parse_with_generic_transfer_pdf_bytes(data)
        if gt and gt.lines:
            return gt
        text = extract_text_pdf(data)
        if text and len(text.strip()) >= 30:
            text_source = "pdf_text"
        # Fallback for scanned PDFs: OCRmyPDF first (adds text layer), then raster OCR
        if not text or len(text.strip()) < 30:
            text = ocr_via_ocrmypdf(data) or ""
            if text and len(text.strip()) >= 30:
                text_source = "ocrmypdf"
        if not text or len(text.strip()) < 30:
            try:
                dpi_env = int(os.getenv('OCR_RASTER_DPI', '300'))
            except Exception:
                dpi_env = 300
            ocr_text = ocr_pdf_raster(data, dpi=dpi_env)
            if (not ocr_text) or len(ocr_text.strip()) < 30:
                ocr_text = ocr_pdf_raster(data, dpi=400)
            if ocr_text:
                text = ocr_text
                # Infer which dpi was used
                text_source = f"ocr_raster_{dpi_env}" if len(ocr_text.strip()) >= 30 else "ocr_raster_400"
    elif ct.startswith("image/"):
        text = ocr_image(data)
        if text:
            text_source = "ocr_image"
    if not text:
        # Try OCR as ultimate fallback
        text = ocr_image(data)
        if text and not text_source:
            text_source = "ocr_image_fallback"
    resp = parse_text(text)
    if not resp.textSource:
        resp.textSource = text_source
    return resp


@app.get("/health")
def health():
    return {"ok": True, "hasCamelot": HAS_CAMELOT, "hasCV": HAS_CV, "hasGenericTransfer": HAS_GENERIC_TRANSFER}
