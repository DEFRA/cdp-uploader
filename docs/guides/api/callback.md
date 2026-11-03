---
title: Callback model
---

If `callback` is provided at initiate time, uploader sends an asynchronous callback when scan results are ready.

## Callback usage

- Use callback for push-based completion notifications.
- Keep polling as a fallback if callback delivery fails.
- Validate callback payload and map file-level statuses to your service workflow.

## Suggested handling

1. Verify callback authenticity in your service boundary.
2. Persist callback payload with `uploadId` as correlation key.
3. Reconcile with status endpoint if callback fields are incomplete.
