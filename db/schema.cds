namespace approval.inbox;

using { cuid, managed } from '@sap/cds/common';

entity Employee : cuid {
  employeeNumber : String(20);
  fullName       : String(120) not null;
  position       : String(80);
  department     : String(80);
  email          : String(120);
  managerName    : String(120);
}

entity LeaveRequest : cuid, managed {
  employee  : Association to Employee not null;
  type      : String(40) not null;
  startDate : Date not null;
  endDate   : Date not null;
  days      : Integer not null;
  reason    : String(500);
  status    : String(20) default 'PENDING';
}

entity WorkflowTask : cuid, managed {
  title           : String(160) not null;
  employee        : Association to Employee not null;
  leaveRequest    : Association to LeaveRequest not null;
  status          : String(20) default 'READY';
  completedAt     : Timestamp;
  completedBy     : String(120);
  decisionComment : String(1000);
}

entity ApprovalHistory : cuid {
  workflowTask : Association to WorkflowTask not null;
  leaveRequest : Association to LeaveRequest not null;
  step         : Integer not null;
  approverName : String(120) not null;
  decision     : String(20) not null;
  comment      : String(1000);
  createdAt    : Timestamp;
}
