---
title: Upload and scan
sidebar_position: 4
tags:
  - endpoints
---

Use `POST /upload-and-scan/{uploadId}` to submit files for scanning.

## Supported upload types

- **Browser upload**: `multipart/form-data`.
- **API upload**: binary payload with an optional `x-filename` header.

## Behaviour

- Upload must use a valid `uploadId` from `/initiate`.
- Uploading to an unknown or already-used upload session returns an error.
- Once accepted, scanning runs asynchronously.
- API clients should disable automatic redirect following and use callback or status polling.

## Binary upload example

```bash
curl -X POST "https://example.gov.uk/upload-and-scan/<uploadId>" \
  -H "Content-Type: application/octet-stream" \
  -H "x-filename: report.pdf" \
  --data-binary "@report.pdf"
```
