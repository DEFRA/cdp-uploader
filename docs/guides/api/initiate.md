---
title: Initiate upload
sidebar_position: 3
---

Use `POST /initiate` to create a new upload session.

## Request modes

- **Redirect mode**: provide `redirect`, a relative URL on CDP.
- **Download mode**: provide `downloadUrls`, https URLs only on CDP.
- Do not send both `redirect` and `downloadUrls` in one request.

## Core request fields

- `s3Bucket` (required): destination bucket for clean files.
- `s3Path` (optional): destination key prefix.
- `callback` (optional): callback URL for asynchronous completion, on the `cdp-int.defra.cloud` domain on CDP.
- `metadata` (optional): tenant metadata echoed in status/callback.
- `mimeTypes` and `maxFileSize` (optional constraints).

## Response

Returns HTTP `201` with:

- `uploadId`
- `uploadUrl` (for direct uploads)
- `statusUrl`

## Example

```json
{
  "redirect": "/next",
  "callback": "https://myservice.cdp-int.defra.cloud/callback",
  "s3Bucket": "myservice",
  "s3Path": "scanned",
  "metadata": {
    "customerId": "1234"
  }
}
```
