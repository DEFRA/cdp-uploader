# cdp-uploader

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Aws localstack](#aws-localstack)
    - [Install and run LocalStack AWS](#install-and-run-localstack-aws)
    - [Setup local buckets](#setup-local-buckets)
    - [List local buckets](#list-local-buckets)
  - [Local JSON API](#local-json-api)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
- [Docker](#docker)
  - [Development Image](#development-image)
  - [Production Image](#production-image)
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

### Aws localstack

#### Install and run LocalStack AWS

- Install [LocalStack AWS CLI](https://docs.localstack.cloud/getting-started/installation/#localstack-cli)
- Run AWS LocalStack Docker container:

```bash
docker run --pull=always -d -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack:latest
```

#### Setup local buckets

You need local buckets setup in localstack

```bash
awslocal s3 mb s3://cdp-uploader-quarantine --endpoint-url http://localhost:4566
awslocal s3 mb s3://my-bucket --endpoint-url http://localhost:4566
```

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
