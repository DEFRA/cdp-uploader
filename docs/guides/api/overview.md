---
title: API overview
description: End-to-end view of the CDP Uploader integration model.
---

The uploader is intended for backend or frontend services that need anti-virus scanning before accepting uploads as complete.

## End-to-end integration

1. **Initiate**
   - Create an upload session with `POST /initiate`.
   - You get `uploadId`, `uploadUrl` (for direct upload mode) and `statusUrl`.
2. **Upload**
   - Browser mode: multipart form upload.
   - API mode: binary payload with `Content-Type: application/octet-stream` and optional `x-filename`.
3. **Scan and status**
   - Uploader scans files asynchronously.
   - Service uses callback notifications or polls `GET /status/{uploadId}`.
4. **Outcome**
   - Status response includes file metadata, scan status and destination S3 details.

## API endpoints

- [Initiate upload](./initiate.md)
- [Upload and scan](./upload-and-scan.md)
- [Status polling](./status.md)
- [Callback model](./callback.md)
