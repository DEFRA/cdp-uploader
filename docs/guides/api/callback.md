---
title: Callback model
sidebar_position: 6
tags:
  - integration
---

If `callback` is provided at initiate time, uploader sends an asynchronous callback when scan results are ready.

## Callback usage

- Use callback for push-based completion notifications.
- Keep polling as a fallback if callback delivery fails.
- Validate callback payload and map file-level statuses to your service workflow.

## Suggested handling

1. Treat the callback as a notification only: it is not signed, so fetch `GET /status/{uploadId}` before acting on it.
2. Persist the result with `uploadId` as the correlation key.
3. Respond with a 2xx status. Any other response, or none, means the callback is retried.
