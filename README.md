# cdp-uploader

Core delivery platform Node.js Frontend Template.

- [cdp-uploader](#cdp-uploader)
  - [Requirements](#requirements)
    - [Node.js](#nodejs)
  - [Local development](#local-development)
    - [Setup](#setup)
    - [Development](#development)
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

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd cdp-uploader
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### AWS CLI

- Install the AWS CLI https://aws.amazon.com/cli/

### AWS Local

- _awslocal_ is a wrapper around the _AWS CLI_ that talks to your local _localstack_
- You can install a PIP https://github.com/localstack/awscli-local
  But note it only works with the older v1 of _AWS CLI_

#### AWS local alias

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

### LocalStack

Either run _localstack_ directly via _docker_ and _AWS CLI_, or via the _localstack CLI_.

#### Docker

- Run AWS LocalStack Docker container:

```bash
docker run --pull=always -d -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack:latest
```

Note the exposed endpoint is `http://localhost:4566`

### Localstack CLI

- Install [LocalStack CLI](https://docs.localstack.cloud/getting-started/installation/#localstack-cli)
- Run the CLI

```
localstack start
```

Note the exposed endpoint is `https://localhost:4566`

#### Setup local S3 buckets

You need local buckets setup in localstack

```bash
awslocal s3 mb s3://cdp-uploader-quarantine --endpoint-url http://localhost:4566
awslocal s3 mb s3://my-bucket --endpoint-url http://localhost:4566
```

The `--endpoint-url http://localhost:4566` may not be needed depending on how your `awslocal` is set up.
Also note depending on how your _localstack_ is running the endpoint may be `http` or `https`.

#### List local buckets

```bash
awslocal s3 list-buckets
```

#### View bucket contents

```bash
awslocal s3 ls s3://cdp-uploader-quarantine
awslocal s3 ls s3://my-bucket
```

Of view in your browser:

```
http://localhost:4566/cdp-uploader-quarantine/
http://localhost:4566/my-bucket/
```

#### Empty bucket contents

```bash
awslocal s3 rm s3://cdp-uploader-quarantine --recursive
awslocal s3 rm s3://my-bucket --recursive
```

#### Setup local queues

```bash
awslocal sqs create-queue --queue-name cdp-clamav-results
awslocal sqs create-queue --queue-name cdp-uploader-scan-results-callback.fifo --attributes "{\"FifoQueue\":\"true\",\"ContentBasedDeduplication\": \"true\"}"
```

#### Purge local queues

```bash
awslocal sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-clamav-results
awslocal sqs purge-queue --region eu-west-2 --queue-url http://localhost:4566/000000000000/cdp-uploader-scan-results-callback.fifo
```

#### Setup local test harness

When running locally there is a built-in test harness to simulate scan results. This requires an extra setup step

```bash
awslocal sqs create-queue --region eu-west-2 --queue-name mock-clamav
awslocal s3api put-bucket-notification-configuration\
    --bucket cdp-uploader-quarantine\
    --notification-configuration '{
                                      "QueueConfigurations": [
                                         {
                                           "QueueArn": "arn:aws:sqs:eu-west-2:000000000000:mock-clamav",
                                           "Events": ["s3:ObjectCreated:*"]
                                         }
                                       ]
	                                }'
```

When running from the IDE the test harness is enabled by default. It can be enabled/disabled via the `MOCK_VIRUS_SCAN_ENABLED` environment variable.
The test harness will listen for files being uploaded to the quarantine bucket.
When a file arrives, it checks if the original filename matches the regex set in `MOCK_VIRUS_REGEX` (defaults to checking if the file has 'virus' in the name).
There is a short delay (set via `MOCK_VIRUS_RESULT_DELAY`) to simulate scan time before the response is sent.

### Local JSON API

Whilst the APIs are being developed this app uses a local JSON mock API. To start this locally run:

```bash
npm run mockApi
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag cdp-uploader:development .
```

Run:

```bash
docker run -p 3000:3000 cdp-uploader:development
```

### Production image

Build:

```bash
docker build --no-cache --tag cdp-uploader .
```

Run:

```bash
docker run -p 3000:3000 cdp-uploader
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
