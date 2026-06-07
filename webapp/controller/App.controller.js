sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/Dialog",
  "sap/m/TextArea",
  "sap/m/Button",
  "sap/m/Label",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/ValueState",
  "sap/ui/core/format/DateFormat"
], function (
  Controller,
  Filter,
  FilterOperator,
  Sorter,
  Dialog,
  TextArea,
  Button,
  Label,
  MessageBox,
  MessageToast,
  ValueState,
  DateFormat
) {
  "use strict";

  const READY_STATUS = "READY";
  const COMPLETED_STATUS = "COMPLETED";

  return Controller.extend("approval.inbox.controller.App", {
    onInit: function () {
      this._dateFormatter = DateFormat.getDateInstance({ style: "medium" });
      this._shortDateFormatter = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
      this._shortDateTimeFormatter = DateFormat.getDateTimeInstance({ pattern: "dd/MM/yyyy HH:mm" });
    },

    onStatusFilterChange: function (event) {
      this.getView().getModel("view").setProperty("/filters/status", event.getParameter("item").getKey());
      this._applyTaskFilters();
    },

    onCreatedDateChange: function (event) {
      const viewModel = this.getView().getModel("view");
      const source = event.getSource();

      if (!event.getParameter("valid")) {
        viewModel.setProperty("/filters/createdFrom", null);
        viewModel.setProperty("/filters/createdTo", null);
        return;
      }

      viewModel.setProperty("/filters/createdFrom", source.getDateValue() || null);
      viewModel.setProperty("/filters/createdTo", source.getSecondDateValue() || null);
    },

    onStatusSelectChange: function (event) {
      this.getView().getModel("view").setProperty("/filters/status", event.getParameter("selectedItem").getKey());
    },

    onApplyFilters: function () {
      this._applyTaskFilters();
    },

    onSearch: function (event) {
      this.getView().getModel("view").setProperty("/filters/search", (event.getParameter("query") || "").trim());
    },

    onSearchLiveChange: function (event) {
      this.getView().getModel("view").setProperty("/filters/search", (event.getParameter("newValue") || "").trim());
    },

    onClearFilters: function () {
      const viewModel = this.getView().getModel("view");
      viewModel.setProperty("/filters/status", "ALL");
      viewModel.setProperty("/filters/search", "");
      viewModel.setProperty("/filters/createdFrom", null);
      viewModel.setProperty("/filters/createdTo", null);
      this.byId("taskSearch").setValue("");
      this.byId("createdDateRange").setValue("");
      this._applyTaskFilters();
    },

    onRefresh: async function () {
      await this._refreshAll();
    },

    onTaskPress: function (event) {
      this._selectTask(event.getSource());
    },

    onTaskSelect: function (event) {
      this._selectTask(event.getParameter("listItem"));
    },

    onTaskListUpdateFinished: function () {
      this._updateTaskCounts();

      if (!this.getView().getModel("view").getProperty("/selectedTask")) {
        const taskList = this._getTaskList();
        const firstItem = taskList && taskList.getItems()[0];
        if (firstItem) {
          taskList.setSelectedItem(firstItem);
          this._selectTask(firstItem);
        }
      }
    },

    onNavBack: function () {},

    onApprove: async function () {
      const task = this.getView().getModel("view").getProperty("/selectedTask");
      if (!this._canAction(task)) {
        this._showCompletedMessage();
        return;
      }

      await this._executeTaskAction("approveTask", {
        taskId: this._getTaskId(task),
        comment: ""
      }, "taskApproved");
    },

    onReject: function () {
      const task = this.getView().getModel("view").getProperty("/selectedTask");
      if (!this._canAction(task)) {
        this._showCompletedMessage();
        return;
      }

      const commentInput = new TextArea({
        width: "100%",
        rows: 5,
        required: true,
        liveChange: function () {
          commentInput.setValueState(commentInput.getValue().trim() ? ValueState.None : ValueState.Error);
        }
      });

      const dialog = new Dialog({
        title: this._text("rejectTitle"),
        contentWidth: "30rem",
        content: [
          new Label({ text: this._text("comment"), required: true, labelFor: commentInput }),
          commentInput
        ],
        beginButton: new Button({
          type: "Reject",
          text: this._text("reject"),
          press: async function () {
            const comment = commentInput.getValue().trim();
            if (!comment) {
              commentInput.setValueState(ValueState.Error);
              commentInput.setValueStateText(this._text("rejectCommentRequired"));
              MessageToast.show(this._text("rejectCommentRequired"));
              return;
            }

            dialog.setBusy(true);
            await this._executeTaskAction("rejectTask", {
              taskId: this._getTaskId(task),
              comment: comment
            }, "taskRejected");
            dialog.setBusy(false);
            dialog.close();
          }.bind(this)
        }),
        endButton: new Button({
          text: this._text("cancel"),
          press: function () {
            dialog.close();
          }
        }),
        afterClose: function () {
          dialog.destroy();
        }
      });

      this.getView().addDependent(dialog);
      dialog.open();
    },

    formatStatusState: function (status) {
      switch ((status || "").toUpperCase()) {
        case READY_STATUS:
        case "PENDING":
        case "IN_PROGRESS":
          return "Success";
        case COMPLETED_STATUS:
        case "DONE":
          return "Information";
        case "REJECTED":
          return "Error";
        default:
          return "None";
      }
    },

    formatDecisionState: function (decision) {
      switch ((decision || "").toUpperCase()) {
        case "APPROVED":
          return "Success";
        case "REJECTED":
          return "Error";
        default:
          return "None";
      }
    },

    formatDateRange: function (startDate, endDate) {
      const start = this._formatDate(startDate);
      const end = this._formatDate(endDate);

      if (start && end && start !== end) {
        return `${start} - ${end}`;
      }

      return start || end || "";
    },

    formatRequestTitle: function (leaveType) {
      if (!leaveType) {
        return this._text("noTaskSelected");
      }

      return `${leaveType} Request`;
    },

    formatShortDate: function (value) {
      return this._formatWithFormatter(value, this._shortDateFormatter);
    },

    formatShortDateTime: function (value) {
      return this._formatWithFormatter(value, this._shortDateTimeFormatter);
    },

    formatCreatedDateLabel: function (value) {
      const date = this.formatShortDate(value);
      return date ? `Created: ${date}` : "Created:";
    },

    formatSubmittedBy: function (employeeName, createdAt) {
      const date = this.formatShortDate(createdAt);
      return `Submitted by ${employeeName || "-"}${date ? ` on ${date}` : ""}`;
    },

    formatInitials: function (name) {
      return (name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (part) {
          return part[0].toUpperCase();
        })
        .join("") || "NA";
    },

    _applyTaskFilters: function () {
      const viewModel = this.getView().getModel("view");
      const filtersState = viewModel.getProperty("/filters");
      const filters = [];

      if (filtersState.status && filtersState.status !== "ALL") {
        filters.push(new Filter("status", FilterOperator.EQ, filtersState.status));
      }

      if (filtersState.createdFrom) {
        filters.push(new Filter("createdAt", FilterOperator.GE, filtersState.createdFrom));
      }

      if (filtersState.createdFrom && filtersState.createdTo) {
        const createdTo = new Date(filtersState.createdTo);
        createdTo.setHours(23, 59, 59, 999);
        filters.push(new Filter("createdAt", FilterOperator.LE, createdTo));
      }

      if ((filtersState.search || "").trim()) {
        const search = filtersState.search.trim();
        filters.push(new Filter({
          filters: [
            new Filter("title", FilterOperator.Contains, search),
            new Filter("employeeName", FilterOperator.Contains, search),
            new Filter("leaveType", FilterOperator.Contains, search)
          ],
          and: false
        }));
      }

      const taskBinding = this._getTaskListBinding();
      if (!taskBinding) {
        return;
      }

      this._clearSelection();
      taskBinding.filter(filters);
    },

    _selectTask: async function (listItem) {
      if (!listItem) {
        return;
      }

      const context = listItem.getBindingContext();
      if (!context) {
        return;
      }

      const viewModel = this.getView().getModel("view");
      viewModel.setProperty("/busy", true);

      try {
        const task = await context.requestObject();
        viewModel.setProperty("/selectedTaskPath", context.getPath());
        viewModel.setProperty("/selectedTask", task);

        await Promise.all([
          this._loadLeaveRequest(task),
          this._loadEmployee(task),
          this._loadApprovalHistory(task)
        ]);
      } catch (error) {
        this._showError(error);
      } finally {
        viewModel.setProperty("/busy", false);
      }
    },

    _loadLeaveRequest: async function (task) {
      const viewModel = this.getView().getModel("view");
      const leaveId = this._firstValue(task, ["leaveRequest_ID", "leaveRequestId", "LeaveRequest_ID", "leaveRequest"]);
      const fallback = {
        ID: leaveId,
        type: task.leaveType || task.requestType || "Leave Request",
        startDate: task.leaveStartDate || task.startDate,
        endDate: task.leaveEndDate || task.endDate,
        days: task.days || task.duration,
        reason: task.reason || task.description
      };

      if (!leaveId) {
        viewModel.setProperty("/leaveRequest", fallback);
        return;
      }

      try {
        viewModel.setProperty("/leaveRequest", await this._readEntityById("/LeaveRequest", leaveId));
      } catch (error) {
        viewModel.setProperty("/leaveRequest", fallback);
      }
    },

    _loadEmployee: async function (task) {
      const viewModel = this.getView().getModel("view");
      const leaveRequest = viewModel.getProperty("/leaveRequest") || {};
      const employeeId = this._firstValue(task, ["employee_ID", "employeeId", "Employee_ID"]) ||
        this._firstValue(leaveRequest, ["employee_ID", "employeeId", "Employee_ID"]);
      const fallback = {
        ID: employeeId,
        fullName: task.employeeName || leaveRequest.employeeName || "",
        position: task.employeePosition || "",
        department: task.department || "",
        email: task.employeeEmail || "",
        managerName: task.managerName || ""
      };

      if (!employeeId) {
        viewModel.setProperty("/employee", fallback);
        return;
      }

      try {
        viewModel.setProperty("/employee", await this._readEntityById("/Employee", employeeId));
      } catch (error) {
        viewModel.setProperty("/employee", fallback);
      }
    },

    _loadApprovalHistory: async function (task) {
      const viewModel = this.getView().getModel("view");
      const taskId = this._getTaskId(task);

      if (!taskId) {
        viewModel.setProperty("/approvalHistory", []);
        return;
      }

      try {
        viewModel.setProperty("/approvalHistory", await this._readHistoryBy("taskId", taskId));
      } catch (error) {
        try {
          viewModel.setProperty("/approvalHistory", await this._readHistoryBy("workflowTask_ID", taskId));
        } catch (fallbackError) {
          viewModel.setProperty("/approvalHistory", []);
        }
      }
    },

    _readHistoryBy: async function (fieldName, taskId) {
      const listBinding = this.getView().getModel().bindList(
        "/ApprovalHistory",
        null,
        [new Sorter("createdAt", false)],
        [new Filter(fieldName, FilterOperator.EQ, taskId)]
      );
      const contexts = await listBinding.requestContexts(0, 100);
      return Promise.all(contexts.map(function (context) {
        return context.requestObject();
      }));
    },

    _readEntityById: async function (entitySet, id) {
      const model = this.getView().getModel();
      const key = String(id).replace(/'/g, "''");
      const context = model.bindContext(`${entitySet}('${key}')`);
      return context.requestObject();
    },

    _executeTaskAction: async function (actionName, parameters, successTextKey) {
      const viewModel = this.getView().getModel("view");
      viewModel.setProperty("/actionBusy", true);
      viewModel.setProperty("/busy", true);

      try {
        const action = this.getView().getModel().bindContext(`/${actionName}(...)`);
        Object.keys(parameters).forEach(function (name) {
          action.setParameter(name, parameters[name]);
        });

        await action.execute();
        MessageToast.show(this._text(successTextKey));
        await this._refreshAll();
      } catch (error) {
        this._showError(error, this._text("actionFailed"));
      } finally {
        viewModel.setProperty("/actionBusy", false);
        viewModel.setProperty("/busy", false);
      }
    },

    _refreshAll: async function () {
      const model = this.getView().getModel();
      const viewModel = this.getView().getModel("view");
      const selectedTaskPath = viewModel.getProperty("/selectedTaskPath");

      model.refresh();

      if (selectedTaskPath) {
        try {
          const task = await model.bindContext(selectedTaskPath).requestObject();
          viewModel.setProperty("/selectedTask", task);
          await Promise.all([
            this._loadLeaveRequest(task),
            this._loadEmployee(task),
            this._loadApprovalHistory(task)
          ]);
        } catch (error) {
          viewModel.setProperty("/selectedTask", null);
        }
      }
    },

    _updateTaskCounts: function () {
      const taskList = this._getTaskList();
      const items = taskList ? taskList.getItems() : [];
      const counts = items.reduce(function (result, item) {
        const status = item.getBindingContext() && item.getBindingContext().getProperty("status");
        result.all += 1;

        if (status === READY_STATUS) {
          result.ready += 1;
        }

        if (status === COMPLETED_STATUS) {
          result.completed += 1;
        }

        return result;
      }, { all: 0, ready: 0, completed: 0 });

      this.getView().getModel("view").setProperty("/counts", counts);
    },

    _clearSelection: function () {
      const viewModel = this.getView().getModel("view");
      const taskList = this._getTaskList();

      if (taskList) {
        taskList.removeSelections(true);
      }

      viewModel.setProperty("/selectedTaskPath", "");
      viewModel.setProperty("/selectedTask", null);
      viewModel.setProperty("/leaveRequest", null);
      viewModel.setProperty("/employee", null);
      viewModel.setProperty("/approvalHistory", []);
    },

    _getTaskList: function () {
      return this.byId("taskList");
    },

    _getTaskListBinding: function () {
      const taskList = this._getTaskList();
      return taskList && taskList.getBinding("items");
    },

    _canAction: function (task) {
      return task && task.status === READY_STATUS;
    },

    _showCompletedMessage: function () {
      MessageToast.show(this._text("taskCompleted"));
    },

    _showError: function (error, fallbackMessage) {
      const message = error && error.message ? error.message : fallbackMessage;
      MessageBox.error(message || this._text("actionFailed"));
    },

    _getTaskId: function (task) {
      return this._firstValue(task || {}, ["ID", "taskId", "TaskID", "workflowTaskId"]);
    },

    _firstValue: function (source, keys) {
      for (let i = 0; i < keys.length; i += 1) {
        if (source[keys[i]] !== undefined && source[keys[i]] !== null && source[keys[i]] !== "") {
          return source[keys[i]];
        }
      }
      return null;
    },

    _formatDate: function (value) {
      return this._formatWithFormatter(value, this._dateFormatter);
    },

    _formatWithFormatter: function (value, formatter) {
      if (!value) {
        return "";
      }

      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return formatter.format(date);
    },

    _text: function (key) {
      return this.getView().getModel("i18n").getResourceBundle().getText(key);
    }
  });
});
