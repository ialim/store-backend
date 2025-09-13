import os, sys
sys.path.append(os.path.dirname(__file__))
from app import extract_text_pdf, ocr_pdf_raster, parse_text

files = [
    os.path.join('..','store-backend', 'uploads', 'invoices', '1757669776476_ALHAJA_ELEMO_INVOICE.pdf'),
    os.path.join('..','store-backend', 'uploads', 'invoices', '1757669678322_72328_ELEMOH.PDF'),
]
for f in files:
    f = os.path.abspath(f)
    if not os.path.exists(f):
        print('File missing:', f)
        continue
    with open(f, 'rb') as fh:
        data = fh.read()
    txt = extract_text_pdf(data)
    print('---', os.path.basename(f), 'text_len=', len(txt))
    if len(txt.strip()) < 50:
        ocr = ocr_pdf_raster(data)
        print('   raster_ocr_len=', len(ocr))
        txt = ocr
    parsed = parse_text(txt)
    print(parsed)
    print('   parsed_lines=', len(parsed.lines), 'total=', parsed.total, 'inv=', parsed.invoiceNumber)
    print('   sample:', '\n      '.join(txt.splitlines()[:5]))

