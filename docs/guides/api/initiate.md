---
title: Initiate upload
---

Use `POST /initiate` to create a new upload session.

## Request modes

- **Redirect mode**: provide `redirect`.
- **Download mode**: provide `downloadUrls`.
- Do not send both `redirect` and `downloadUrls` in one request.

## Core request fields

- `s3Bucket` (required): destination bucket for clean files.
- `s3Path` (optional): destination key prefix.
- `callback` (optional): callback URL for asynchronous completion.
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
  "redirect": "https://myservice.example/next",
  "callback": "https://myservice.example/callback",
  "s3Bucket": "myservice",
  "s3Path": "scanned",
  "metadata": {
    "customerId": "1234"
  }
}
```
