#!/bin/bash
export AWS_REGION=eu-west-2
awslocal s3 mb s3://cdp-uploader-quarantine --endpoint-url http://localhost:4566
awslocal sqs create-queue --queue-name cdp-clamav-results
awslocal sqs create-queue --queue-name cdp-uploader-scan-results-callback
