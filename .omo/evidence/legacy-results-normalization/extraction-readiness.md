# Legacy KAAF Result Extraction Readiness

- total files: 396

## By extension

- .xls: 329
- .hwp: 13
- .pdf: 17
- .xlsx: 37

## By readiness

- needs_xls_engine_or_conversion: 329
- needs_hwp_engine_or_conversion: 13
- parseable_pdf_text: 15
- parseable_xlsx: 37
- pdf_no_text_or_image: 2

## Immediate interpretation

- `.xlsx` files can be inspected with bundled openpyxl.
- `.pdf` files can be text-checked with bundled pypdf, but some may be image-only.
- `.xls` and `.hwp` need a conversion/parser lane before row-level athlete normalization.
