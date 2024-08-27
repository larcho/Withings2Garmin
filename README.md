# Withings2Garmin

This project is heavily inspired by [Jarek Hartman's withings-sync](https://github.com/jaroslawhartman/withings-sync) but with a slighly different approach. This application relies on AWS SAM for cron automation instead of Docker.

[Garth](https://github.com/matin/garth) has also been rewritten to Typescript for the most part.

## Setup

### Prerequisites

In order to deploy you'll need **AWS SAM** and **AWS CLI** installed on your machine. For easier setup, make sure you set the default region for AWS CLI to be the same as the one where you deploy the app.

### Install dependencies

```bash
yarn Install
```

### Build SAM App

```bash
sam build
```

### Deploy SAM App

```bash
sam deploy --guided
```

### Setup credentials

This needs to be done after the app has been deployed, since SAM will create the required secrets.

```bash
yarn setup
```
