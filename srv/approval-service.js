const cds = require("@sap/cds");

const READY = "READY";
const COMPLETED = "COMPLETED";
const APPROVED = "APPROVED";
const REJECTED = "REJECTED";

module.exports = class ApprovalService extends cds.ApplicationService {
  async init() {
    this.on("approveTask", req => this._completeTask(req, APPROVED));
    this.on("rejectTask", req => this._completeTask(req, REJECTED));

    return super.init();
  }

  async _completeTask(req, decision) {
    const { taskId } = req.data;
    const comment = (req.data.comment || "").trim();

    if (!taskId) {
      return req.reject(400, "taskId is required.");
    }

    if (decision === REJECTED && !comment) {
      return req.reject(400, "Reject comment is required.");
    }

    const { WorkflowTask, LeaveRequest, ApprovalHistory } = this._persistenceEntities();
    const task = await SELECT.one.from(WorkflowTask)
      .columns(
        "ID",
        "status",
        "title",
        "employee_ID",
        "leaveRequest_ID"
      )
      .where({ ID: taskId });

    if (!task) {
      return req.reject(404, `Workflow task ${taskId} was not found.`);
    }

    if (task.status !== READY) {
      return req.reject(409, `Workflow task ${taskId} is ${task.status} and cannot be actioned.`);
    }

    const now = new Date().toISOString();
    const actor = req.user && req.user.id ? req.user.id : "demo.approver";

    await UPDATE(WorkflowTask, taskId).set({
      status: COMPLETED,
      completedAt: now,
      completedBy: actor,
      decisionComment: comment
    });

    await UPDATE(LeaveRequest, task.leaveRequest_ID).set({
      status: decision
    });

    await INSERT.into(ApprovalHistory).entries({
      ID: cds.utils.uuid(),
      workflowTask_ID: task.ID,
      leaveRequest_ID: task.leaveRequest_ID,
      step: await this._nextHistoryStep(ApprovalHistory, task.ID),
      approverName: actor,
      decision,
      comment,
      createdAt: now
    });

    return SELECT.one.from(this.entities.WorkflowTask).where({ ID: taskId });
  }

  async _nextHistoryStep(ApprovalHistory, taskId) {
    const rows = await SELECT.from(ApprovalHistory)
      .columns("step")
      .where({ workflowTask_ID: taskId })
      .orderBy("step desc")
      .limit(1);

    return rows.length ? rows[0].step + 1 : 1;
  }

  _persistenceEntities() {
    const definitions = this.model.definitions;

    return {
      WorkflowTask: definitions["approval.inbox.WorkflowTask"],
      LeaveRequest: definitions["approval.inbox.LeaveRequest"],
      ApprovalHistory: definitions["approval.inbox.ApprovalHistory"]
    };
  }
};
