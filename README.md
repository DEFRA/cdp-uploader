# cdp-uploader

Core delivery platform Node.js Frontend Template.

- [cdp-uploader](#cdp-uploader)
  - [Requirements](#requirements)
    - [Node.js](#nodejs)
  - [API](#api)
  - [Local development](#local-development)
    - [Setup](#setup)
    - [Development](#development)
      - [Updating dependencies](#updating-dependencies)
    - [AWS CLI](#aws-cli)
    - [AWS Local](#aws-local)
      - [AWS local alias](#aws-local-alias)
    - [LocalStack](#localstack)
      - [Docker](#docker)
    - [Localstack CLI](#localstack-cli)
      - [Setup local S3 buckets](#setup-local-s3-buckets)
      - [List local buckets](#list-local-buckets)
      - [View bucket contents](#view-bucket-contents)
      - [Empty bucket contents](#empty-bucket-contents)
      - [Setup local queues](#setup-local-queues)
      - [Purge local queues](#purge-local-queues)
    - [Local JSON API](#local-json-api)
    - [Production](#production)
    - [Npm scripts](#npm-scripts)
  - [Docker](#docker-1)
    - [Development image](#development-image)
    - [Production image](#production-image)
  - [Licence](#licence)
    - [About the licence](#about-the-licence)

# Requirements

## Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd cdp-uploader
nvm use
```

# API

## POST /initiate

Example `/initiate` request:

```json
{
  "redirect": "https://myservice.com/nextPage",
  "scanResultCallbackUrl": "https://myservice.com/callback",
  "destinationBucket": "myservice",
  "destinationPath": "scanned",
  "metadata": {
    "customerId": "1234",
    "accountId": "1234"
  }
}
```

#### HTTP Headers:

| Header name | Description                                       | Required |
| ----------- | ------------------------------------------------- | -------- |
| User-Agent  | Identifier of the service that calls cdp-uploader | TBD      |

#### Body parameters:

| Parameter name        | Description                                                        | Required |
| --------------------- | ------------------------------------------------------------------ | -------- |
| redirect              | Url to redirect to after file has been successfully uploaded.      | yes      |
| destinationBucket     | S3 bucket that file will be moved to once the scanning is complete | yes      |
| destinationPath       | 'Folder' in bucket where scanned files will be placed              | no       |
| scanResultCallbackUrl | Url that will be called once all files in upload have been scanned | no       |
| metadata              | Map of additional information related to upload                    | no       |

> [!NOTE]
> We will generate an uploadId for the upload and fileIds for files in the upload request. Files (objects) will be moved to destination bucket under the path uploadId/fileId which will be prefixed with the bucket path if it has been provided.

#### Example response

```json
{
  "uploadId": "b18ceadb-afb1-4955-a70b-256bf94444d5",
  "uploadAndScanUrl": "https://cdp-uploader/upload-and-scan/b18ceadb-afb1-4955-a70b-256bf94444d5",
  "statusUrl": "https://cdp-uploader/status/b18ceadb-afb1-4955-a70b-256bf94444d5"
}
```

| Parameter name   | Description                                      | Required |
| ---------------- | ------------------------------------------------ | -------- |
| uploadId         | Identifier used for the upload                   | yes      |
| uploadAndScanUrl | Url which must be used for the upload            | yes      |
| statusUrl        | Endpoint that can be polled for status of upload | yes      |

## POST /upload-and-scan/${uploadId}

This will be a `multipart/form-data` request to the `uploadAndScanUrl` url provided in the initiate response. This request should happen directly from the users browser to the cdp-uploader.

Example `/upload-and-scan/${uploadId}` request:

```javascript
<form
  action="/upload-and-scan/b18ceadb-afb1-4955-a70b-256bf94444d5"
  method="post"
  enctype="multipart/form-data"
>
  <label for="file">File</label>
  <input id="file" name="file" type="file" />
  <button>Upload</button>
</form>
```

#### Response

Once the upload has been successful, the user will be redirected to the `redirect` url provided in the initate request.

## GET /status/{upload-id}

The status API provides information about uploaded files, virus scan status and S3 location.
The API is intended to be polled by the frontend services, it is not public and cannot be called direct from the browser.

#### Request Parameters

| Parameter Name | Description                                                          |
| -------------- | -------------------------------------------------------------------- |
| upload-id      | Unique id for that upload. ID is provided via the `/initialize` call |

#### Response Payload

```json
{
  "uploadStatus": "ready",
  "numberOfRejectedFiles": 0,
  "redirect": "http://localhost:3000/creatures/e90fee47-ead0-45c7-8319-4388cca9ebbc/upload-status-poller?uploadId=ba477d67-0005-4c26-a673-fa5139a2adf5",
  "destinationBucket": "cdp-example-bucket",
  "destinationPath": "",
  "files": [
    {
      "uploadId": "ba477d67-0005-4c26-a673-fa5139a2adf5",
      "fileId": "07aca302-fe02-4650-adf3-f1cdd8bc3988",
      "fileStatus": "complete",
      "contentType": "image/jpeg",
      "contentLength": 82330,
      "checksumSha256": "S/W84Awhf0KWN2aBkk+up52srTpiOCUHs/r1nHdJlB0=",
      "filename": "unicorn.jpg",
      "s3Bucket": "cdp-example-node-frontend",
      "s3Key": "ba477d67-0005-4c26-a673-fa5139a2adf5/07aca302-fe02-4650-adf3-f1cdd8bc3988"
    }
  ],
  "fields": {
    "a-form-field": "some value",
    "file-upload": {
      "fileId": "07aca302-fe02-4650-adf3-f1cdd8bc3988",
      "actualContentType": "image/jpeg",
      "filename": "unicorn.jpg",
      "contentType": "image/jpeg",
      "s3Key": "ba477d67-0005-4c26-a673-fa5139a2adf5/07aca302-fe02-4650-adf3-f1cdd8bc3988",
      "s3Bucket": "cdp-example-node-frontend",
      "fileStatus": "complete",
      "contentLength": 82330
    },
    "another-form-field": "foobazbar"
  },
  "metadata": {}
}
```

| Parameter Name        | Description                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| uploaderStatus        | Have all scans completed, can be `pending` or `ready`                                                                                                        |
| numberOfRejectedFiles | Total number of files that have been rejected by the uploader                                                                                                |
| redirect              | The URL the user who uploade the file was redirected to                                                                                                      |
| destinationBucket     | Which bucket the safe files will be put in, set via the /initialize call                                                                                     |
| destinationPath       | As above but for S3 path                                                                                                                                     |
| files                 | An array of files that were uploaded                                                                                                                         |
| fields                | An object representing each field in the multipart request. Text fields are preserved exactly as they were sent, file fields contain details about the file. |
| metadata              | Extra data and identified set by the requesting service in the /initialize call. Returned exactly as they were presented                                     |

#### File field

| Parameter Name    | Description                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- |
| fileId            | uuid of the file.                                                                            |
| actualContentType | The mime type as detected by the CDP-Uploader                                                |
| contentType       | The mime type as declared in the multipart upload                                            |
| s3Bucket          | S3 bucket name where the file can be accessed. Only set if file is Clean                     |
| s3Key             | S3 Path where the file can be accessed. Includes path prefix if set                          |
| fileStatus        | `complete` or `rejected` if the virus scan has completed, `pending` if its still in progress |
| hasError          | Set to true if the file had an error (e.g. infected, unable to be saved etc)                 |
| errorMessage      | Reason why the file was rejected. Not set if file is clean.                                  |
|                   |                                                                                              |

#### Intended use

Frontend services will poll the /status endpoint after a user has uploaded a file.

The payload contains all of the fields submitted in the HTML form with the values preserved with the exception of any fields that contained files. These fields are replaced with an object showing if they passed the scan and where in S3 they can be accessed.

Frontend services are expected to validate the content of the payload and present any errors back to the user.
Any files uploaded by a user will never be sent directly to the frontend service.

# Local development

## Setup

Install application dependencies:

```bash
npm install
```

## Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Updating dependencies

To update dependencies, globally install https://www.npmjs.com/package/npm-check-updates. Then run the below script,
run tests, test the application and commit the altered `package.json` and `package-lock.json` files. For more
options around updates check the package docs.

```bash
ncu -i
```

## AWS CLI

- Install the AWS CLI https://aws.amazon.com/cli/

## AWS Local

- _awslocal_ is a wrapper around the _AWS CLI_ that talks to your local _localstack_
- You can install a PIP https://github.com/localstack/awscli-local
  But note it only works with the older v1 of _AWS CLI_

### AWS local alias

- Alternatively just alias it locally:
  - E.g in _fish_

```fish
function awslocal
  aws --profile localstack $argv --endpoint-url http://localhost:4566
end

```

- And add to your `.aws/credentials`

```
[localstack]
aws_access_key_id = test
aws_secret_access_key = test
```

## LocalStack

Either run _localstack_ directly via _docker_ and _AWS CLI_, or via the _localstack CLI_.

### Docker

- Run AWS LocalStack Docker container:

```bash
docker run --pull=always -d -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack:latest
```

Note the exposed endpoint is `http://localhost:4566`

## Localstack CLI

- Install [LocalStack CLI](https://docs.localstack.cloud/getting-started/installation/#localstack-cli)
- Run the CLI

```
localstack start
```

Note the exposed endpoint is `https://localhost:4566`

### Setup local S3 buckets

You need local buckets setup in localstack

```bash
awslocal s3 mb s3://cdp-uploader-quarantine --endpoint-url http://localhost:4566
awslocal s3 mb s3://my-bucket --endpoint-url http://localhost:4566
```

The `--endpoint-url http://localhost:4566` may not be needed depending on how your `awslocal` is set up.
Also note depending on how your _localstack_ is running the endpoint may be `http` or `https`.

### List local buckets

```bash
awslocal s3 list-buckets
```

### View bucket contents

```bash
awslocal s3 ls s3://cdp-uploader-quarantine
awslocal s3 ls s3://my-bucket
```

Of view in your browser:

```
http://localhost:4566/cdp-uploader-quarantine/
http://localhost:4566/my-bucket/
```

### Empty bucket contents

```bash
awslocal s3 rm s3://cdp-uploader-quarantine --recursive
awslocal s3 rm s3://my-bucket --recursive
```

### Setup local queues

```bash
awslocal sqs create-queue --queue-name cdp-clamav-results
awslocal sqs create-queue --queue-name cdp-uploader-scan-results-callback.fifo --attributes "{\"FifoQueue\":\"true\",\"ContentBasedDeduplication\": \"true\"}"
```

### Purge local queues

```bash
awslocal sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-clamav-results
awslocal sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-uploader-scan-results-callback.fifo
```

### Setup local test harness

When running locally there is a built-in test harness to simulate scan results. This requires an extra setup step

```bash
awslocal sqs create-queue --queue-name mock-clamav
awslocal s3api put-bucket-notification-configuration\
    --bucket $BUCKET_NAME\
    --notification-configuration '{
                                      "QueueConfigurations": [
                                         {
                                           "QueueArn": "arn:aws:sqs:eu-west-2:000000000000:mock-clamav",
                                           "Events": ["s3:ObjectCreated:*"]
                                         }
                                       ]
	                                }'
```

When running from the IDE the test harness is enabled by default. It can be enabled/disabled via
the `MOCK_VIRUS_SCAN_ENABLED` environment variable.
The test harness will listen for files being uploaded to the quarantine bucket.
When a file arrives, it checks if the original filename matches the regex set in `MOCK_VIRUS_REGEX` (defaults to
checking if the file has 'virus' in the name).
There is a short delay (set via `MOCK_VIRUS_RESULT_DELAY`) to simulate scan time before the response is sent.

## Local JSON API

Whilst the APIs are being developed this app uses a local JSON mock API. To start this locally run:

```bash
npm run mockApi
```

## Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

## Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

# Docker

## Development image

Build:

```bash
docker build --target development --no-cache --tag cdp-uploader:development .
```

Run:

```bash
docker run -p 3000:3000 cdp-uploader:development
```

## Production image

Build:

```bash
docker build --no-cache --tag cdp-uploader .
```

Run:

```bash
docker run -p 3000:3000 cdp-uploader
```

# Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

## About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
