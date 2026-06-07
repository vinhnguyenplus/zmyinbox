# CAP Approval Inbox

CAP-backed SAP Fiori freestyle Approval Inbox, similar to SAP My Inbox.

The backend is the main implementation. It exposes OData entities and task actions from CAP, while the SAPUI5 freestyle app consumes that service through a master-detail inbox layout.

## Backend Scope

- CAP domain model in `db/schema.cds`
- OData V4 service in `srv/approval-service.cds`
- Backend business logic in `srv/approval-service.js`
- Seed data for pending and completed tasks in `db/data`
- No external or mocked OData provider required

## OData Service

Service root:

```txt
http://localhost:4004/odata/v4/approval/
```

Exposed entity sets:

- `LeaveRequest`
- `WorkflowTask`
- `ApprovalHistory`
- `Employee`

Actions:

- `approveTask(taskId, comment)`
- `rejectTask(taskId, comment)`

## Backend Business Rules

- Reject requires a non-empty comment.
- Only `READY` workflow tasks can be approved or rejected.
- Completed tasks cannot be actioned.
- Approve sets the workflow task to `COMPLETED`, sets leave request status to `APPROVED`, and writes approval history.
- Reject sets the workflow task to `COMPLETED`, sets leave request status to `REJECTED`, and writes approval history.

## Run Backend

```sh
npm install
npm start
```

`npm start` runs `cds watch`. CAP uses SQLite at `db.sqlite` for local development and loads CSV seed data from `db/data`.

## Run Frontend

In another terminal:

```sh
npm run start:ui
```

The UI5 proxy in `ui5.yaml` forwards:

```txt
/odata/v4/approval -> http://localhost:4004/odata/v4/approval
```

The OData model is configured in `webapp/manifest.json`.

## Deploy To SAP BTP

Deployment is configured for Cloud Foundry trial:

- API endpoint: `https://api.cf.ap21.hana.ondemand.com`
- Org: `733d95cctrial`
- Space: `dev`
- Existing HDI instance: `zsale-db`
- CAP app: `approval-inbox-srv`
- HDI deployer: `approval-inbox-db-deployer`

See [deployment.md](deployment.md).

## Test Steps

1. Start CAP with `npm start`.
2. Open `http://localhost:4004/odata/v4/approval/WorkflowTask` and confirm pending and completed tasks are returned.
3. Start UI5 with `npm run start:ui`.
4. Confirm the left task list shows task title, employee name, leave date, status, and created date.
5. Filter tasks by status and created date.
6. Select a `READY` task and confirm leave request, employee, and approval history load in the detail page.
7. Confirm Approve and Reject buttons are visible only for `READY` tasks.
8. Click Approve and confirm the task refreshes as completed and a history row is created.
9. Click Reject on another `READY` task, submit without comment, and confirm the UI blocks it.
10. Enter a reject comment and confirm the backend completes the task, rejects the leave request, and writes history.
11. Try actioning a `COMPLETED` task through the backend action and confirm CAP returns a conflict error.

## Implementation Levels

- Level 1: My Inbox layout with `sap.m.SplitApp`
- Level 2: OData model, entity projections, list/detail binding
- Level 3: CAP approve/reject action handlers
- Level 4: Busy indicator, message toast, refresh, validation, and backend error handling
"# zmyinbox" 
