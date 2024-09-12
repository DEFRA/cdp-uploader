# cdp-uploader

Core delivery platform Node.js Frontend Template.

* [Requirements](#requirements)
  * [Node.js](#nodejs)
* [API](#api)
  * [POST /initiate](#post-initiate)
    * [HTTP Headers:](#http-headers)
    * [Body parameters:](#body-parameters)
    * [Example response](#example-response)
  * [POST /upload-and-scan/{uploadId}](#post-upload-and-scanuploadid)
    * [Path Parameters](#path-parameters)
    * [Response](#response)
  * [GET /status/{uploadId}](#get-statusuploadid)
    * [Path Parameters](#path-parameters-1)
    * [Query Parameters](#query-parameters)
    * [Response Payload with Debug](#response-payload-with-debug)
    * [Response Payload without Debug](#response-payload-without-debug)
    * [File field in form](#file-field-in-form)
    * [Error Handling](#error-handling)
  * [Callback](#callback)
    * [Intended use](#intended-use)
* [Configuration](#configuration)
  * [App config](#app-config)
  * [Secrets](#secrets)
  * [Docker compose](#docker-compose)
  * [Local dev env var](#local-dev-env-var)
  * [Configuration names](#configuration-names)
* [Local development](#local-development)
  * [Developing services that use the CDP-Uploader](#developing-services-that-use-the-cdp-uploader)
    * [Docker Compose](#docker-compose-1)
    * [Relative vs Absolute URLs](#relative-vs-absolute-urls)
    * [Test Harness (mock scanning)](#test-harness-mock-scanning)
    * [EICAR files and local development](#eicar-files-and-local-development)
  * [Setup for developing CDP-Uploader](#setup-for-developing-cdp-uploader)
  * [Development](#development)
    * [Updating dependencies](#updating-dependencies)
    * [Tests](#tests)
      * [Unit tests](#unit-tests)
      * [End-to-end tests](#end-to-end-tests)
      * [Smoke tests](#smoke-tests)
  * [AWS CLI](#aws-cli)
  * [AWS Local](#aws-local)
    * [AWS local alias](#aws-local-alias)
  * [LocalStack](#localstack)
    * [Docker](#docker)
  * [Localstack CLI](#localstack-cli)
    * [Setup local S3 buckets](#setup-local-s3-buckets)
    * [List local buckets](#list-local-buckets)
    * [View bucket contents](#view-bucket-contents)
    * [Empty bucket contents](#empty-bucket-contents)
    * [Setup local queues](#setup-local-queues)
    * [Purge local queues](#purge-local-queues)
    * [Setup local test harness](#setup-local-test-harness)
  * [Local JSON API](#local-json-api)
  * [Production](#production)
  * [Npm scripts](#npm-scripts)
* [Docker](#docker-1)
  * [Development image](#development-image)
  * [Production image](#production-image)
* [Licence](#licence)
  * [About the licence](#about-the-licence)

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
  "callback": "https://myservice.com/callback",
  "s3Bucket": "myservice",
  "s3Path": "scanned",
  "metadata": {
    "customerId": "1234",
    "accountId": "1234"
  }
}
```

#### HTTP Headers:

| Header name | Description                                       | Required |
|-------------|---------------------------------------------------|----------|
| User-Agent  | Identifier of the service that calls cdp-uploader | TBD      |

#### Body parameters:

| Parameter name | Description                                                         | Required |
|----------------|---------------------------------------------------------------------|----------|
| redirect       | Url to redirect to after file has been successfully uploaded.       | yes      |
| s3Bucket       | S3 bucket that file will be moved to once the scanning is complete  | yes      |
| s3Path         | 'Folder' in bucket where scanned files will be placed               | no       |
| callback       | Url that will be called once all files in upload have been scanned  | no       |
| metadata       | Map of additional information related to upload                     | no       |
| mimeTypes      | List of accepted mimeTypes                                          | no       |
| maxFileSize    | Maximum size in bytes that a file can be (10MB is 10 _ 1000 _ 1000) | no       |

> [!NOTE]
> We will generate an uploadId for the upload and fileIds for files in the upload request. Files (objects) will be moved
> to destination bucket under the path uploadId/fileId which will be prefixed with the bucket path if it has been
> provided.

#### Example response

```json
{
  "uploadId": "b18ceadb-afb1-4955-a70b-256bf94444d5",
  "uploadUrl": "/upload-and-scan/b18ceadb-afb1-4955-a70b-256bf94444d5",
  "statusUrl": "https://cdp-uploader/status/b18ceadb-afb1-4955-a70b-256bf94444d5"
}
```

| Parameter name | Description                                      | Required |
|----------------|--------------------------------------------------|----------|
| uploadId       | Identifier used for the upload                   | yes      |
| uploadUrl      | Url which must be used for the upload            | yes      |
| statusUrl      | Endpoint that can be polled for status of upload | yes      |

## POST /upload-and-scan/{uploadId}

#### Path Parameters

| Parameter Name | Description                                                              |
|----------------|--------------------------------------------------------------------------|
| uploadId       | Unique id for that upload. UploadId is provided via the `/initiate` call |

This will be a `multipart/form-data` request to the `uploadAndScanUrl` url provided in the initiate response. This
request should happen directly from the users browser to the cdp-uploader.

Example `/upload-and-scan/${uploadId}` request:

```javascript
<form
  action="/upload-and-scan/b18ceadb-afb1-4955-a70b-256bf94444d5"
  method="post"
  enctype="multipart/form-data"
>
  <label for="file">File</label>
  <input id="file" name="file" type="file"/>
  <button>Upload</button>
</form>
```

#### Response

Once the upload has been successful, the user will be redirected to the `redirect` url provided in the initiate request.

## GET /status/{uploadId}

The status API provides information about uploaded files, virus scan status and S3 location.
The API is intended to be polled by the frontend services, it is not public and cannot be called direct from the
browser.

#### Path Parameters

| Parameter Name | Description                                                              |
|----------------|--------------------------------------------------------------------------|
| uploadId       | Unique id for that upload. UploadId is provided via the `/initiate` call |

#### Query Parameters

| Parameter Name | Description                                                                     |
|----------------|---------------------------------------------------------------------------------|
| debug          | set to 'true' to debug information. Currently contains initiate request payload |

> [!NOTE]
> Debug should not be used in production

#### Response Payload with Debug

```json
{
  "debug": {
    "request": {
      "redirect": "http://localhost:3000/creatures/e90fee47-ead0-45c7-8319-4388cca9ebbc/upload-status-poller?uploadId=ba477d67-0005-4c26-a673-fa5139a2adf5",
      "s3Bucket": "cdp-example-bucket",
      "metadata": {
        "example-id": "id"
      }
    }
  },
  "uploadStatus": "ready",
  "metadata": {
    "example-id": "id"
  },
  "form": {
    "a-form-field": "some value",
    "a-file-upload-field": {
      "fileId": "9fcaabe5-77ec-44db-8356-3a6e8dc51b13",
      "filename": "dragon-b.jpeg",
      "contentType": "image/jpeg",
      "fileStatus": "complete",
      "contentLength": 11264,
      "checksumSha256": "bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=",
      "detectedContentType": "image/jpeg",
      "s3Key": "3b0b2a02-a669-44ba-9b78-bd5cb8460253/9fcaabe5-77ec-44db-8356-3a6e8dc51b13",
      "s3Bucket": "cdp-example-node-frontend"
    },
    "another-form-field": "foobazbar"
  },
  "numberOfRejectedFiles": 0
}
```

#### Response Payload without Debug

```json
{
  "uploadStatus": "ready",
  "metadata": {
    "example-id": "id"
  },
  "form": {
    "a-form-field": "some value",
    "a-file-upload-field": {
      "fileId": "9fcaabe5-77ec-44db-8356-3a6e8dc51b13",
      "filename": "dragon-b.jpeg",
      "contentType": "image/jpeg",
      "fileStatus": "complete",
      "contentLength": 11264,
      "checksumSha256": "bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=",
      "detectedContentType": "image/jpeg",
      "s3Key": "3b0b2a02-a669-44ba-9b78-bd5cb8460253/9fcaabe5-77ec-44db-8356-3a6e8dc51b13",
      "s3Bucket": "cdp-example-node-frontend"
    },
    "another-form-field": "foobazbar"
  },
  "numberOfRejectedFiles": 0
}
```

| Parameter Name        | Description                                                                                                                                                  |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| uploaderStatus        | Have all scans completed, can be `initiated`, `pending` or `ready`                                                                                           |
| metadata              | Extra data and identified set by the requesting service in the /initialize call. Returned exactly as they were presented                                     |
| form                  | An object representing each field in the multipart request. Text fields are preserved exactly as they were sent, file fields contain details about the file. |
| numberOfRejectedFiles | Total number of files that have been rejected by the uploader                                                                                                |
| debug.request         | When set to true, the initiate request payload received by cdp-uploader                                                                                      |

#### File field in form

| Parameter Name      | Description                                                                                                                        |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------|
| fileId              | uuid of the file.                                                                                                                  |
| filename            | filename of file uploaded, if present                                                                                              |
| contentType         | The mime type as declared in the multipart upload                                                                                  |
| fileStatus          | `complete` or `rejected` if the virus scan has completed, `pending` if its still in progress                                       |
| contentLength       | Size of file in bytes                                                                                                              |
| checksumSha256      | SHA256 check sum of file recieved by cdp-uploader before uploading to S3 bucket                                                    |
| detectedContentType | The mime type as detected by the CDP-Uploader                                                                                      |
| s3Bucket            | S3 bucket where scanned file is moved. Only set if file status is `complete`                                                       |
| s3Key               | S3 Path where scanned file is moved. Includes path prefix if set. Only set when fileStatus is `complete`                           |
| hasError            | `true/false` Only set to true if the file has been rejected or could not be delivered. Reason is supplied in `errorMessage` field. |
| errorMessage        | Reason why file was rejected. Error message is based on GDS design guidelines and can be show directly to the end-user.            |

#### Error Handling

A file can be rejected by uploader for a number of reasons. When this happens no file will be delivered to the
destination S3 bucket.
A rejected file has the following data set:

- fileStatus: rejected
- hasError: true
- errorMessage: string

The `errorMessage` field is a test description of why the file was rejected.

| Cause                                                                                       | errorMessage                                          |
|---------------------------------------------------------------------------------------------|-------------------------------------------------------|
| Virus detected                                                                              | `The selected file contains a virus`                  |
| File is empty                                                                               | `The selected file is empty`                          |
| File size exceeds max size (either set in the /init call or the uploaders max default 100M) | `The selected file must be smaller than $MAXSIZE`     |
| File doesn't match the mime types set in the init call                                      | `The selected file must be a $MIMETYPES`              |
| Any server side error in CDP-Uploader                                                       | `The selected file could not be uploaded – try again` |
|                                                                                             |                                                       |

The messages are based on the [GDS File Upload guidelines](https://design-system.service.gov.uk/components/file-upload/)

The intention of the `errorMessage` field is that the content can be displayed directly to the end user.

## Callback

If a callback url has been provided in the initiate request, we will POST a callback to your service once scanning is
complete and files have been moved to your services bucket. The payload is exactly the same as the response from
the [Status](#get-statusuploadid) endpoint (without debug enabled).

#### Intended use

Frontend services will poll the /status endpoint after a user has uploaded a file.

The payload contains all of the fields submitted in the HTML form with the values preserved with the exception of any
fields that contained files. These fields are replaced with an object showing if they passed the scan and where in S3
they can be accessed.

Frontend services are expected to validate the content of the payload and present any errors back to the user.
Any files uploaded by a user will never be sent directly to the frontend service.

# Configuration

Runtime environment variables required or optional.

Add these where relevant to:

### App config

For configurations that are not sensitive and per staging and prod environments.
https://github.com/DEFRA/cdp-app-config

### Secrets

For sensitive config for staging and prod environments
this can be self-serviced in your portal service page's **secrets** tab.

https://portal.cdp-int.defra.cloud/services/YOURSERVICE/secrets

### Docker compose

For local docker compose setups add these to your setup,
e.g. modify locally your `compose/aws.env` or similar.

### Local dev env var

Set as environment variables locally.
E.g. as `export` commands if using **bash**, or `.envrc` if using [**direnv**](https://direnv.net/)

## Configuration names

| Config name            | ENV_VAR                 | Default | Required | Purpose                                                                               |
|------------------------|-------------------------|---------|----------|---------------------------------------------------------------------------------------|
| `bucketsAllowlist`     | CONSUMER_BUCKETS        | []      | [x]      | A comma separated list of buckets uploader can write to. Can not be empty if not in development mode. |
| `mockVirusScanEnabled` | MOCK_VIRUS_SCAN_ENABLED | false   |          | Boolean. Useful in local development                                                  |

There are several other configs, such as AWS details, SQS queue names, polling times etc.
For more details and other service configuration look in `src/config/index.js`

# Local development

### Developing services that use the CDP-Uploader

If your service is going to use the CDP-Uploader to receive files you may want to start by running the uploader locally.
The easiest way to do this is using `docker compose`.

#### Docker Compose

The CDP-Uploader project provide as base [compose.yml](compose.yml) file to get you started.

Copy [compose.yml](compose.yml) as well as the [./compose](./compose) folder into your own project and running
`docker compose pull` and then `docker compose up`.

This will start:

- redis
- localstack (a local AWS emulator)
- cdp-uploader

It will also inject a [start-up script](./compose/start-localstack.sh) into the localstack container that automatically
creates the queues and buckets needed by the uploader as well as a test bucket named 'my-bucket'.
If your service requires its own bucket you can add a line to [start-localstack.sh](./compose/start-localstack.sh)
script to create one.

```yaml
aws --endpoint-url=http://localhost:4566 s3 mb s3://cdp-uploader-quarantine
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket

  ## Insert your bucket here, e.g.
aws --endpoint-url=http://localhost:4566 s3 mb s3://your-service-bucket
```

> [!NOTE]
> The script sets the mock AWS region to be `eu-west-2`. See [aws.env](./compose/aws.env) for the other localstack
> environment variables.
> If your service is also talking to S3 then it will need to use the same region and credentials when talking to
> localstack.
> The can be done by simply setting environment variables before running your sevices locally:
>
> ```bash
> export AWS_REGION=eu-west-2
> export AWS_ACCESS_KEY_ID=test
> export AWS_SECRET_ACCESS_KEY=test
> ```

If everything has worked as expected the CDP-Uploader will be available on `localhost` port `7337`.

Any other supporting services can be added to the compose file as required.

#### Relative vs Absolute URLs

In a real environment relative urls work fine since all the services are behind the same host, however locally they're
going to be running on different ports so relative redirect URLs won't work!

When run in `development` mode the cdp-uploader will convert relative redirect urls into absolute urls using the '
referer' header. This should make uploader behave more or less the same locally as it would in a real environment.

#### Test Harness (mock scanning)

When running locally the CDP-Uploader will be running with its mock virus scanner enabled.

This _does not_ actually virus scan files, rather it simulates a response based on filename. If you submit a file with
the word `virus` in the name it will be flagged as infected.

#### EICAR files and local development

The test harness does not support [EICAR](https://www.eicar.org/download-anti-malware-testfile/) virus test files yet,
so if you are submitting one and getting a `CLEAN` response back from the uploader's test harness, this is expected. In
the real environments EICAR files will work.

## Setup for developing CDP-Uploader

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

### Tests

#### Unit tests

To run unit tests:

```bash
npm test
```

#### End-to-end tests

To run end-to-end tests, you will need to have a few docker compose services running locally:

```bash
docker compose pull
docker compose up -d localstack redis
npm run test:e2e
```

#### Smoke tests

To run smoke tests start up the `cdp-uploader` via docker compose:

```bash
cd cdp-uploader
docker compose pull
docker compose up
```

Then clone https://github.com/DEFRA/cdp-uploader-smoke-tests and run it:

```bash
cd cdp-uploader-smoke-tests
ENVIRONMENT=local npm run test
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

aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://cdp-uploader-quarantine
```

The `--endpoint-url http://localhost:4566` may not be needed depending on how your `awslocal` is set up.
Also note depending on how your _localstack_ is running the endpoint may be `http` or `https`.

### List local buckets

```bash
aws --endpoint-url=http://localhost:4566 s3 list-buckets
```

### View bucket contents

```bash
aws --endpoint-url=http://localhost:4566 s3 ls s3://cdp-uploader-quarantine
aws --endpoint-url=http://localhost:4566 s3 ls s3://my-bucket
```

Of view in your browser:

```
http://localhost:4566/cdp-uploader-quarantine/
http://localhost:4566/my-bucket/
```

### Empty bucket contents

```bash
aws --endpoint-url=http://localhost:4566 s3 rm s3://cdp-uploader-quarantine --recursive
aws --endpoint-url=http://localhost:4566 s3 rm s3://my-bucket --recursive
```

### Setup local queues

```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name cdp-clamav-results
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name cdp-uploader-scan-results-callback.fifo --attributes "{\"FifoQueue\":\"true\",\"ContentBasedDeduplication\": \"true\"}"
```

### Purge local queues

```bash
aws --endpoint-url=http://localhost:4566 sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-clamav-results
aws --endpoint-url=http://localhost:4566 sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-uploader-scan-results-callback.fifo
```

### Setup local test harness

When running locally there is a built-in test harness to simulate scan results. This requires an extra setup step

```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name mock-clamav
aws --endpoint-url=http://localhost:4566 s3api put-bucket-notification-configuration\
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
