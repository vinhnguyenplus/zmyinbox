using { approval.inbox as db } from '../db/schema';

@path: '/odata/v4/approval'
service ApprovalService {
  entity Employee as projection on db.Employee;

  entity LeaveRequest as projection on db.LeaveRequest;

  entity WorkflowTask as projection on db.WorkflowTask {
    *,
    employee.fullName as employeeName,
    employee.department as department,
    employee.email as employeeEmail,
    leaveRequest.type as leaveType,
    leaveRequest.startDate as leaveStartDate,
    leaveRequest.endDate as leaveEndDate,
    leaveRequest.days as days,
    leaveRequest.reason as reason
  };

  entity ApprovalHistory as projection on db.ApprovalHistory;

  action approveTask(taskId: UUID, comment: String) returns WorkflowTask;
  action rejectTask(taskId: UUID, comment: String) returns WorkflowTask;
}
