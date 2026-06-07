# Deployment Setup

This project is configured for SAP BTP Cloud Foundry using the trial subaccount shown in the screenshots.

## Target

- API Endpoint: `https://api.cf.ap21.hana.ondemand.com`
- Org: `733d95cctrial`
- Space: `dev`
- Region: Singapore - Azure
- Existing HDI service instance: `zsale-db`
- Service: SAP HANA Schemas & HDI Containers
- Plan: `hdi-shared`
- Runtime: Cloud Foundry

## MTA Modules

- `approval-inbox-srv`: CAP Node.js service
- `approval-inbox-db-deployer`: HDI deployer
- `zsale-db`: existing HDI container service

## Build And Deploy

Login and target the trial space:

```sh
cf api https://api.cf.ap21.hana.ondemand.com
cf login
cf target -o 733d95cctrial -s dev
```

Build the CAP deployment output:

```sh
npm run build:cap
```

Build the MTAR:

```sh
npm run build:mta
```

Deploy:

```sh
npm run deploy:cf
```

## Verify

After deployment, check that the existing HDI service `zsale-db` is bound to:

- `approval-inbox-srv`
- `approval-inbox-db-deployer`

Then open:

```txt
https://approval-inbox-srv.cfapps.ap21.hana.ondemand.com/odata/v4/approval/WorkflowTask
```
