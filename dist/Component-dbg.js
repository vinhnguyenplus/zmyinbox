sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/BindingMode"
], function (UIComponent, Device, JSONModel, BindingMode) {
  "use strict";

  return UIComponent.extend("approval.inbox.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        selectedTaskPath: "",
        selectedTask: null,
        leaveRequest: null,
        employee: null,
        approvalHistory: [],
        filters: {
          status: "ALL",
          search: "",
          createdFrom: null,
          createdTo: null
        },
        counts: {
          all: 0,
          ready: 0,
          completed: 0
        },
        busy: false,
        actionBusy: false
      }), "view");

      const deviceModel = new JSONModel(Device);
      deviceModel.setDefaultBindingMode(BindingMode.OneWay);
      this.setModel(deviceModel, "device");
    }
  });
});
