# Invoice Import – Session Notes

Date: 2025-09-11

## What’s Implemented

- Backend (NestJS GraphQL)
  - Invoice Imports
    - Query: `invoiceImports`, `invoiceImport(id)`
    - Mutations: `adminCreateInvoiceImport`, `adminReprocessInvoiceImport`, `adminApproveInvoiceImport`
      - Options: `useParsedTotal`, `overrideLines` (editable lines from UI)
    - Mutation: `adminUpdateInvoiceImport` (updates `url`, `supplierName`, `storeId`)
  - Ingestion
    - `InvoiceIngestService`: pdf-parse + optional PDF.js fallback; Tesseract OCR for images; deep sanitization
    - Provider orchestration: `INVOICE_OCR_PROVIDER=auto|python|textract` with retry/backoff for Python OCR
  - Background processing
    - `InvoiceImportQueue` (BullMQ optional via Redis) + in-process fallback
  - Vendor normalization
    - `normalizeParsedByVendor` (Seinde Signature rule) – consistent totals/discounts
  - Uploads
    - `POST /uploads/invoices` with absolute URL response; static `/uploads` serving

- Python OCR Microservice
  - FastAPI `/parse` + `/health`, pdfplumber + (optional) camelot + OpenCV/Tesseract
  - Dockerfile + docker-compose with healthcheck
  - README with setup instructions

- Admin UI
  - Pages: `/invoice-imports`, `/invoice-imports/:id`
  - List: GraphQL-backed, auto-refresh while processing
  - Detail: 
    - URL editable + Save
    - Edit Lines mode (inline edit cells, add/delete row, recalc, discard edits)
    - Totals summary (Parsed vs Lines) + diff warning
    - Use Parsed Total toggle; Approve confirmation dialog (shows edited lines count)
    - Reprocess; toasts on save/reprocess/approve
    - User pickers (Received/Confirmed) using email search
    - Find/View PO; auto-navigate to PO after approval if found
    - RBAC gating for actions (role or MANAGE_PRODUCTS/VIEW_REPORTS permission)

## Env & Running

- Backend `.env` (see `.env.example`)
  - `INVOICE_OCR_PROVIDER=auto` (tries python → textract → built-in)
  - `INVOICE_OCR_URL=http://localhost:8000/parse` (for python)
  - Optional Redis: `REDIS_URL=redis://localhost:6379` (for durable queue)
- Python OCR
  - `docker compose up -d` (builds `python-invoice-ocr` and exposes `:8000`)
  - Health: `GET http://localhost:8000/health`

## Design Notes

- Approve totals
  - `finalTotal` is consistent for both PO and Supplier Payment based on:
    - `useParsedTotal` ⇒ use header total if present
    - else prefer summed line totals; else fallback to items sum
- Unit cost fallback
  - If only `lineTotal` provided, `unitCost := lineTotal / qty`
- Sanitization
  - Deep strips control chars to prevent Postgres `22P05` errors

## Open TODOs / Next Steps

- UI polish
  - [x] Add compact diff of edited rows in the confirmation dialog (sample of first 5 changes)
  - [x] Persist supplier/store edits inline (added Save Details button)
  - [x] Add inline PDF/image preview on detail page
  - [x] Add status chips and quick actions on `/invoice-imports`
  - [ ] Convert ad-hoc types to GraphQL codegen hooks/types (admin-ui)
  - [ ] Global toasts for more flows (errors, successes) + central handling
- Backend
  - [x] Return created PO id from `adminApproveInvoiceImport` (extend payload) to avoid searching by invoice #
  - [ ] Add more vendor rules (normalization) as needed
  - [ ] Optional: switch background queue to BullMQ only (remove in-process) with a dashboard
- OCR
  - [ ] Add vendor-specific parsing helpers informed by raw text debug samples
  - [ ] Optional: enable Textract path fully with minimal IAM policy docs
- Tests & Docs
  - [ ] Add component tests for import pages
  - [ ] Extend README with admin UI steps and screenshots

## Quick Commands

- Start Python OCR: `docker compose up -d`
- Backend dev: `npm run start:dev`
- Prisma studio: `npm run prisma:studio`

---
These notes capture where we stopped and what remains. Ping me tomorrow to pick up the top TODOs.
