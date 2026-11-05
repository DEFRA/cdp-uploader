---
slug: /
title: CDP Uploader API docs
sidebar_label: Overview
sidebar_position: 1
description: Overview of the uploader flow and links to API reference pages.
site_title: CDP Uploader API Docs
site_tagline: Upload and virus scan files for CDP services
phase: live
---

import Link from '@docusaurus/Link'

<div className="govuk-width-container govuk-main-wrapper">

CDP Uploader provides an upload-and-scan flow for services that need virus scanning before storing files in tenant S3 buckets.

## What this site contains

- A quick integration overview for `/initiate`, `/upload-and-scan/{uploadId}` and `/status/{uploadId}`.
- Practical guidance for callbacks and status polling.
- An OpenAPI reference generated from the service route definitions.

## Main flow

1. Call `POST /initiate` to create an upload session.
2. Upload file content with `POST /upload-and-scan/{uploadId}`.
3. Poll `GET /status/{uploadId}` or use callback delivery.
4. Read file status and S3 location details once processing is complete.

## Next steps

- Start with [API overview](./api/overview.md).
- Use <Link to="/api/reference/">OpenAPI reference</Link> for schema and parameter details.

</div>
