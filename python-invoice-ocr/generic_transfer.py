#!/usr/bin/env python3
"""
Generic Warehouse Transfer PDF parser

- Works for any PDF that follows this logical structure across pages:
  * Top "header block" with fields like:
      - Date Transfer
      - Serie / Cash / Num
      - Source Warehouse
      - Destination location
      - Date/Hour Transport
  * One or more line-item tables with columns:
      - Description (free text, may include numbers and spaces)
      - Bar Code (8–14 digits typically)
      - Qty (integer)
      - Price (money)
      - Amount (money)
  * Optional TOTAL row: "TOTAL: <qty> <amount>"

- The parser is driven by a CONFIG (JSON/YAML-like dict), so you can adapt:
  * Header field regexes
  * Noise/header/footer patterns
  * Column heuristics (barcode length, qty pattern, money pattern)
  * Totals row pattern
  * Page header wording variants

Usage:
  python parse_transfer_generic.py /path/to/file.pdf \
      --out-prefix out/parsed \
      --config config.json

If no --config is supplied, a sensible default is used that should work
for typical “Warehouse transfer” PDFs similar to your example.

Outputs:
  - CSV of line items
  - JSON containing header, items, reported & computed totals
"""

import re
import json
import math
import argparse
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Any

import pdfplumber
import pandas as pd
from pydantic import BaseModel, Field, validator


# -------------------------
# Config model (editable)
# -------------------------

class GenericConfig(BaseModel):
    # Regex strings (compiled at runtime) for header fields
    header_patterns: Dict[str, List[str]] = Field(default_factory=lambda: {
        "date_transfer": [r"Date\s*Transfer\s*:\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{2,4})"],
        "serie_cash_num": [r"Serie\s*/\s*Cash\s*/\s*Num\s*:\s*(.+)"],
        "source_warehouse": [r"Source\s*Warehouse\s*:\s*(.+)"],
        "destination_location": [r"(?:Destination\s*(?:location|Location))\s*:\s*(.+)"],
        "date_hour_transport": [r"Date\s*/\s*Hour\s*Transport\s*:\s*(.+)"],
    })

    # Page header/footer noise that should be ignored entirely (full line match)
    noise_patterns: List[str] = Field(default_factory=lambda: [
        r"^\s*WAREHOUSE\s*:\s*Transfer between warehouses\s*$",
        r"^\s*BEAUTY\s*&\s*FRAGRANCE\s*$",
        r"^\s*\d{1,2}/\d{1,2}/\d{4}\s*Page\d+\s*$",
        r"^\s*Description\s+Bar\s*Code\s+Qty\.?\s+Price\s+Amount\s*$",
        r"^\s*Source\s*Warehouse\s*:\s*$",
        r"^\s*Destination\s*location\s*:\s*$",
    ])

    # Totals row
    total_pattern: str = r"TOTAL\s*:\s*(?P<qty>\d+)\s+(?P<amount>\d{1,3}(?:,\d{3})*(?:\.\d{2})?)"

    # Column heuristics
    barcode_regex: str = r"^\d{7,14}$"
    qty_regex: str = r"^\d+$"
    money_regex: str = r"^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$"

    # PDF text extraction tuning
    x_tolerance: float = 1.5
    y_tolerance: float = 2.0

    # If your PDFs use “,” as thousands separator and “.” as decimals, leave defaults.
    # If a locale uses different money format, adjust money_regex and normalize_money().
    @validator("header_patterns")
    def ensure_groups(cls, v):
        # All patterns should contain a capturing group
        for field, patterns in v.items():
            if not all("(" in p and ")" in p for p in patterns):
                raise ValueError(f"Header pattern for '{field}' must contain a capturing group: {patterns}")
        return v


# -------------------------
# Data structures
# -------------------------

@dataclass
class Header:
    # Store as strings to preserve original formatting
    date_transfer: Optional[str] = None
    serie_cash_num: Optional[str] = None
    source_warehouse: Optional[str] = None
    destination_location: Optional[str] = None
    date_hour_transport: Optional[str] = None


@dataclass
class LineItem:
    description: str
    barcode: str
    qty: int
    price: float
    amount: float
    page: int


# -------------------------
# Utilities
# -------------------------

def compile_patterns(cfg: GenericConfig):
    header_res: Dict[str, List[re.Pattern]] = {
        k: [re.compile(p, re.I) for p in v] for k, v in cfg.header_patterns.items()
    }
    noise_res: List[re.Pattern] = [re.compile(p, re.I) for p in cfg.noise_patterns]
    total_re = re.compile(cfg.total_pattern, re.I)
    money_re = re.compile(cfg.money_regex)
    qty_re = re.compile(cfg.qty_regex)
    barcode_re = re.compile(cfg.barcode_regex)
    return header_res, noise_res, total_re, money_re, qty_re, barcode_re


def clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def normalize_money(s: str) -> float:
    # Default: "1,234.56" -> 1234.56
    return float(s.replace(",", ""))


def is_noise(line: str, noise_res: List[re.Pattern]) -> bool:
    l = clean_spaces(line)
    for pat in noise_res:
        if pat.match(l):
            return True
    # Common table header variants
    if l.lower().startswith("description ") and " price " in l.lower():
        return True
    return False


def parse_row(
    line: str,
    money_re: re.Pattern,
    qty_re: re.Pattern,
    barcode_re: re.Pattern
) -> Optional[Tuple[str, str, int, float, float]]:
    """
    Right-to-left parse:
      [Description ...] [BARCODE] [QTY] [PRICE] [AMOUNT]
    """
    line = clean_spaces(line)
    if len(line) < 10:
        return None

    tokens = line.split(" ")
    i = len(tokens) - 1

    # AMOUNT
    if i < 0 or not money_re.match(tokens[i]):
        return None
    amount_s = tokens[i]; i -= 1

    # PRICE
    if i < 0 or not money_re.match(tokens[i]):
        return None
    price_s = tokens[i]; i -= 1

    # QTY
    if i < 0 or not qty_re.match(tokens[i]):
        return None
    qty_s = tokens[i]; i -= 1

    # BARCODE
    if i < 0 or not barcode_re.match(tokens[i]):
        return None
    barcode = tokens[i]; i -= 1

    # DESCRIPTION
    description = clean_spaces(" ".join(tokens[:i+1]))
    if not description:
        return None

    return (
        description,
        barcode,
        int(qty_s),
        normalize_money(price_s),
        normalize_money(amount_s),
    )


# -------------------------
# Core extraction
# -------------------------

def extract(pdf_path: str, cfg: GenericConfig):
    header_res, noise_res, total_re, money_re, qty_re, barcode_re = compile_patterns(cfg)
    header = Header()
    items: List[LineItem] = []
    reported_total_qty: Optional[int] = None
    reported_total_amount: Optional[float] = None

    def set_header_from_text(text: str):
        nonlocal header
        # Fill missing header fields once (first time they appear)
        for field, patterns in header_res.items():
            if getattr(header, field) is None:
                for pat in patterns:
                    m = pat.search(text)
                    if m:
                        setattr(header, field, clean_spaces(m.group(1)))
                        break

    with pdfplumber.open(pdf_path) as pdf:
        for pageno, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(
                x_tolerance=cfg.x_tolerance,
                y_tolerance=cfg.y_tolerance
            ) or ""

            set_header_from_text(text)

            for raw in text.splitlines():
                line = clean_spaces(raw)
                if not line or is_noise(line, noise_res):
                    continue
                if re.search(r"\bPage\s*\d+\b", line, re.I):
                    continue

                tm = total_re.search(line)
                if tm:
                    reported_total_qty = int(tm.group("qty"))
                    reported_total_amount = normalize_money(tm.group("amount"))
                    continue

                parsed = parse_row(line, money_re, qty_re, barcode_re)
                if parsed:
                    desc, code, qty, price, amount = parsed
                    items.append(LineItem(desc, code, qty, price, amount, pageno))

    return header, items, reported_total_qty, reported_total_amount


def to_frames(header: Header, items: List[LineItem]):
    hdr_df = pd.DataFrame([asdict(header)])
    items_df = pd.DataFrame([asdict(i) for i in items],
                            columns=["description", "barcode", "qty", "price", "amount", "page"])
    return hdr_df, items_df


# -------------------------
# CLI
# -------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", help="Path to PDF")
    ap.add_argument("--config", help="Path to JSON config (optional)")
    ap.add_argument("--out-prefix", default="output/transfer")
    args = ap.parse_args()

    if args.config:
        with open(args.config, "r", encoding="utf-8") as f:
            raw_cfg = json.load(f)
        cfg = GenericConfig(**raw_cfg)
    else:
        cfg = GenericConfig()  # defaults

    header, items, rep_qty, rep_amt = extract(args.pdf, cfg)
    hdr_df, items_df = to_frames(header, items)

    # Write outputs
    out_csv = f"{args.out_prefix}.csv"
    out_json = f"{args.out_prefix}.json"
    items_df.to_csv(out_csv, index=False, encoding="utf-8")

    computed_qty = int(items_df["qty"].sum()) if not items_df.empty else 0
    computed_amt = float(items_df["amount"].sum()) if not items_df.empty else 0.0

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({
            "header": asdict(header),
            "items": [asdict(it) for it in items],
            "reported_totals": {"qty": rep_qty, "amount": rep_amt},
            "computed_totals": {"qty": computed_qty, "amount": computed_amt},
        }, f, ensure_ascii=False, indent=2)

    # Console summary
    print("\n=== HEADER ===")
    for k, v in asdict(header).items():
        print(f"{k}: {v}")

    print("\n=== LINE ITEMS ===")
    print(f"rows: {len(items)}")

    print("\n=== TOTALS ===")
    print(f"reported_qty:   {rep_qty}")
    print(f"computed_qty:   {computed_qty}")
    print(f"reported_amount:{f'{rep_amt:,.2f}' if rep_amt is not None else None}")
    print(f"computed_amount:{computed_amt:,.2f}")

    # Sanity checks
    if rep_qty is not None and rep_qty != computed_qty:
        print(f"WARNING: reported qty != computed qty (diff {rep_qty - computed_qty})")
    if rep_amt is not None and not math.isclose(rep_amt, computed_amt, rel_tol=0, abs_tol=0.5):
        diff = rep_amt - computed_amt
        print(f"WARNING: reported amount != computed amount (diff {diff:,.2f})")

    print(f"\nSaved: {out_csv}\nSaved: {out_json}")


if __name__ == "__main__":
    main()
