---
title: Status polling
sidebar_position: 5
---

Use `GET /status/{uploadId}` to fetch upload and scan state.

## Query options

- `debug=true` includes the original initiate payload for troubleshooting.

## Key response fields

- `uploadStatus`: `initiated`, `pending`, `ready`.
- `metadata`: tenant metadata from initiate request.
- `form`: per-file details including status and S3 key/bucket.
- `numberOfRejectedFiles`: present when processing is complete.

## Typical polling pattern

1. Call status endpoint after upload.
2. Repeat until `uploadStatus` is `ready`.
3. Read accepted/rejected file entries.
