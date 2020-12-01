//const { error } = require("jquery");
var gVault;
var gDashboard;

// Entry point of the dashboard.
function OnNewDashboard(dashboard) {
    gVault = dashboard.Vault;
    gDashboard = dashboard;

    dashboard.Events.Register(MFiles.Event.Started, OnStarted);
    function OnStarted() {
        SetDetails(dashboard);
    }
}

function SetDetails(dashboard) {

    var Vault = dashboard.Vault;
    var OExpTotalResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseTotal', "", "", "", "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);

    var ctr, Campuses = [];
    var Cam = "";
    for (ctr in TotalProperties) {
        var Campus = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.Campus", true).Value.DisplayValue;
        if (jQuery.inArray(Campus, Campuses) == -1) {
            Campuses.push(Campus);
            Cam += '<option value="' + Campus + '">' + Campus + '</option>';
        }
    }

    $('<div class="row">' +
        '   <div class="col-md-12"><h4 style="padding-top:30px; padding-bottom:30px">Budgets Dashboard</h4></div>' +
        '   <div class="form-group form-inline col-md-4 mb-3 d-flex">' +
        '      <label class="d-inline-block pr-2" for="Campuses">Campus:</label>' +
        '      <select class="form-control form-control-sm" id="Campuses" onchange=GetExpenseYear()>' + Cam +
        '      </select>' +
        '   </div>' +
        '   <div class="form-group form-inline col-md-3 mb-3 d-flex">' +
        '      <label class="d-inline-block pr-2" for="ExpYears">Expense Year:</label>' +
        '      <select class="form-control form-control-sm" id="ExpYears" onchange=ChangeList()></select>' +
        '   </div>' +
        '</div> ' +

        '<div class="table-responsive">' +
        '   <table id="budget_details_table" class="table table-striped table-hover table-bordered">' +
        '       <thead><tr>' +
        '           <th>Expense Type</th>' +
        '           <th>Campus Budget</th>' +
        '           <th>Current Spend</th>' +
        '           <th>Remaining</th>' +
        '       </thead></tr>' +
        '       <tbody>' +
        '       </tdoby>' +
        '       <tfoot>' +
        '       </tfoot>' +
        '   </table>' +
        '</div>'
    ).appendTo(".container-fluid");
    GetExpenseYear();
    
    var f_type = 1;
    var f_budget = 1;
    var f_spend = 1;
    var f_remain = 1;
    $("#thType").click(function () {
        f_type *= -1;
        var n = $(this).prevAll().length;
        sortTable(f_type, n);
    });
    $("#thBudget").click(function () {
        f_budget *= -1;
        var n = $(this).prevAll().length;
        sortTable(f_budget, n);
    });
    $("#thSpend").click(function () {
        f_spend *= -1;
        var n = $(this).prevAll().length;
        sortTable(f_spend, n);
    });
    $("#thRemain").click(function () {
        f_remain *= -1;
        var n = $(this).prevAll().length;
        sortTable(f_remain, n);
    });
}

function sortTable(f, n) {
    var rows = $('#budget_details_table tbody  tr').get();

    rows.sort(function (a, b) {

        var A = getVal(a);
        var B = getVal(b);

     //   if (A.substring(0, 1) == "$") { A = Number(A.substring(1).replace(/[^0-9.-]+/g, "")); }
     //   if (B.substring(0, 1) == "$") { B = Number(B.substring(1).replace(/[^0-9.-]+/g, "")); }

        //if (A == "UNLIMITED" || B == "UNLIMITED") return -1;
        if (A < B) {
            return -1 * f;
        }
        if (A > B) {
            return 1 * f;
        }
        return 0;
    });

    function getVal(elm) {
        var v = $(elm).children('td').eq(n).text().toUpperCase();
        if (v.substring(0, 1) == "$")
        if ($.isNumeric(v)) {
        //if ($.isNumeric(v.replace(/[^0-9.-]+/g, ""))) {
            v = parseInt(v, 10);
        }

        if (v.substring(0, 1) == "$") { v = Number(v.substring(1).replace(/[^0-9.-]+/g, "")); }
        return v;
    }

    $.each(rows, function (index, row) {
        $('#budget_details_table').children('tbody').append(row);
    });
}

function GetExpenseYear() {
    $("#ExpYears").empty();
    var cam = $("#Campuses")[0].value;

    var OExpTotalResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseTotal', "vProperty.Campus", MFDatatypeText, cam, "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);

    var ctr, ExpenseYears = [];
    var ExpYears = "";
    for (ctr in TotalProperties) {
        var ExpenseYear = TotalProperties[ctr].SearchForPropertyByAlias(gVault, "vProperty.ExpenseYear", true).Value.DisplayValue;
        if (jQuery.inArray(ExpenseYear, ExpenseYears) == -1) {
            ExpenseYears.push(ExpenseYear);
            ExpYears += '<option value="' + ExpenseYear + '">' + ExpenseYear + '</option>';
        }
    }

    var SelectBody = $('#ExpYears');
    SelectBody.append(ExpYears);

    ChangeList();
}

function ChangeList(val) {
    $("#budget_details_table tbody").empty();
    $("#budget_details_table tfoot").empty();
    var TableBody = $('#budget_details_table tbody');
    var TableFooter = $('#budget_details_table tfoot');

    var ArrayVal = [];

    var campus = $("#Campuses")[0].value;
    var year = $("#ExpYears")[0].value;

    var OEXTypeResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseType', 'vProperty.ExpenseName', "", "", "", "", "", "", MFDatatypeText), MFSearchFlagNone, true);
    var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();

    var OBudgetResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseBudget', 'vProperty.Campus', MFDatatypeText, campus, 'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
    var BudgetResultsObjVers = OBudgetResults.GetAsObjectVersions().GetAsObjVers();

    var OExpTotalResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseTotal', 'vProperty.Campus', MFDatatypeText, campus, 'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();

    var sumBudget = 0, sumSpend = 0, sumRemaining = 0;

    if (OEXTypeResults.Count > 0) {
        var TypeProperties = gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TypeResultsObjVers);
        var BudgetProperties = (OBudgetResults.Count > 0) ? gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(BudgetResultsObjVers) : "";
        var TotalProperties = (OExpTotalResults.Count > 0) ? gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers) : "";
        var CampusBudget, CampusTotal, Remaining = "unlimited";
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'CAD',
        });

        for (var i = 0; i < TypeResultsObjVers.Count; i++) {
            var TypeProps = TypeProperties[i][0].Value.DisplayValue.replace(/[ , '/']/g, '');
            CampusBudget = (BudgetProperties == "") ? "unlimited" : BudgetProperties[0].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
            if (CampusBudget == null) { CampusBudget = Remaining = "unlimited"; }

            if (TotalProperties != "") {
                CampusTotal = 0;
                for (var j = 0; j < TotalProperties.Count; j++) {
                    CampusTotal += TotalProperties[j].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
                    sumSpend += CampusTotal;
                }
            }

            if (CampusBudget != "unlimited") {
                sumBudget += CampusBudget;
                sumRemaining += CampusBudget - CampusTotal;
                Remaining = formatter.format(CampusBudget - CampusTotal);
                CampusBudget = formatter.format(CampusBudget);
            }
            CampusTotal = (CampusTotal === 0) ? "$0.00" : formatter.format(CampusTotal);

            var bodyStr =
                '<tr>' +
                '<td>' + TypeProps + '</td >' +
                '<td><span id="budget' + i + '" style="float: right;">' + CampusBudget + '</span></td >' +
                '<td><span id="total' + i + '" style="float: right;">' + CampusTotal + '</span></td >' +
                '<td><span id="Remaining' + i + '" style="float: right;">' + Remaining + '</span></td >' +
                '</tr>';
            ArrayVal[i] = TypeResultsObjVers[i].ID + ", " + bodyStr;
        }
        var SortedList = SortLineNo(ArrayVal).join();
        TableBody.append(SortedList);

        var footerStr =
            '<tr>' +
            '   <td><span style="float: right;">Grand Total</span></td >' +
            '   <td><span id="sumBudget" style="float: right;">' + formatter.format(sumBudget) + '</span></td >' +
            '   <td><span id="sumSpend" style="float: right;">' + formatter.format(sumSpend) + '</span></td >' +
            '   <td><span id="sumRemaining" style="float: right;">' + formatter.format(sumRemaining) + '</span></td >' +
            '</tr>'
        TableFooter.append(footerStr);

        var bAllBudgetUnlimited = true, bAllRemainingUnlimited = true;
        for (var j = 0; j < TypeResultsObjVers.Count; j++) {
            if ($("#Remaining" + j).text().indexOf('(') == 0) $("#Remaining" + j).css('color', '#f00');
            if ($("#budget" + j).text() != "unlimited") bAllBudgetUnlimited = false;
            if ($("#Remaining" + j).text() != "unlimited") bAllRemainingUnlimited = false;
        }
        if (bAllBudgetUnlimited == true) $("#sumBudget").text("unlimited");
        if (bAllRemainingUnlimited == true) $("#sumRemaining").text("unlimited");
    }
}

// A helper function to compile the search conditions needed for running the search in the
// vault using M-Files API.
function FindObjects(Vault, OTAlias, PDAlias1, PDType1, Value1, PDAlias2, PDType2, Value2) {
    // We need a few IDs based on aliases defined in the M-Files Admin tool for object types, properties, etc.
    // Note that all these methods could be run asynchronously as well, if it seems they take a long time and block the UI.
    var OT = Vault.ObjectTypeOperations.GetObjectTypeIDByAlias(OTAlias);
    var PD1 = Vault.PropertyDefOperations.GetPropertyDefIDByAlias(PDAlias1);
    if (PDAlias2 != "") var PD2 = Vault.PropertyDefOperations.GetPropertyDefIDByAlias(PDAlias2);

    var oSC = new MFiles.SearchCondition();
    var oSCs = new MFiles.SearchConditions();

    // Search condition that defines the object is not marked as deleted.
    oSC.ConditionType = MFConditionTypeEqual;
    oSC.Expression.SetStatusValueExpression(MFStatusTypeDeleted, new MFiles.DataFunctionCall());
    oSC.TypedValue.SetValue(MFDatatypeBoolean, false);
    oSCs.Add(-1, oSC);

    // Search condition that defines the object type 
    oSC.ConditionType = MFConditionTypeEqual;
    oSC.Expression.SetStatusValueExpression(MFStatusTypeObjectTypeID, new MFiles.DataFunctionCall());
    oSC.TypedValue.SetValue(MFDatatypeLookup, OT);
    oSCs.Add(-1, oSC);

    if (Value1 != "") {
        oSC.ConditionType = MFConditionTypeContains;
        oSC.Expression.DataPropertyValuePropertyDef = PD1;
        oSC.TypedValue.SetValue(PDType1, Value1);
        oSCs.Add(-1, oSC);
    }
    if (Value2 != "") {
        oSC.ConditionType = MFConditionTypeEqual;
        oSC.Expression.DataPropertyValuePropertyDef = PD2;
        oSC.TypedValue.SetValue(PDType2, Value2);
        oSCs.Add(-1, oSC);
    }

    return oSCs;
}

function SortLineNo(ArrayVal) {
    ArrayVal.sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return ArrayVal;
};