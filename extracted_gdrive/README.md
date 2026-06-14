# Google Drive Resource Scan & Extraction Report

- **Date of Scan**: 2026-06-14T01:23:05.662351
- **Scope**: Evaluated all files recorded in Google Drive desktop sweep history.
- **Methodology**:
  - Imported and merged results from `/Users/m2ultra/NOIZYANTHROPIC/drive_audit/google_library_sweep.csv` and `/Users/m2ultra/NOIZYANTHROPIC/drive_audit/google_docs_manifest.csv`.
  - Classified files into Code, Text Docs, Binary Docs, and Images.
  - Mapped Google Drive paths to the local active workspace `/Users/m2ultra/NOIZYANTHROPIC`.
  - Verified local matching files using strict top-down `lstat` checks that bypass symlink parent directories to prevent FileProvider hangs.
  - Staged locally cached Code and Text Documents to Git.

## Extraction Statistics

| Metric | Value |
| :--- | :--- |
| **Total Files Cataloged** | 6,906 |
| **Code Files Found** | 4,932 |
| **Text Documents Found** | 952 |
| **Binary Documents Found** | 265 |
| **Images Found** | 43 |
| **Other Binaries Found** | 714 |
| **Mapped to Local Workspace** | 2,665 |
| **Unique Files Extracted to Git** | 2,193 |
| **Copy Errors** | 0 |

## Manifest Locations

- Git-committed CSV Manifest: [gdrive_scan_manifest.csv](file:///Users/m2ultra/NOIZYANTHROPIC/RSPNOIZY/extracted_gdrive/gdrive_scan_manifest.csv)
- Audit Folder CSV Manifest: [gdrive_scan_manifest.csv](file:///Users/m2ultra/NOIZYANTHROPIC/drive_audit/gdrive_scan_manifest.csv)
- Extracted Files Directory: [extracted_gdrive/](file:///Users/m2ultra/NOIZYANTHROPIC/RSPNOIZY/extracted_gdrive)

