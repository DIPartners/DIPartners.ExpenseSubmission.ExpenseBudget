//const { error } = require("jquery");
var gVault;
var gDashboard;

// Entry point of the dashboard.
function OnNewDashboard(dashboard) {
    gVault = dashboard.Vault;
    gDashboard = dashboard;
    var tab = dashboard.Parent;

    /*
     *if (null != dashboard.CustomData && null != dashboard.CustomData.ObjectVersions) {
            if (dashboard.CustomData.ObjectVersions.Count == 0) {
                return;
            }
    */
    // Some things are ready only after the dashboard has started.
    dashboard.Events.Register(MFiles.Event.Started, OnStarted);
    function OnStarted() {
        SetDetails(dashboard, "", "");
    }
    /*
        }
    */
}

function SetDetails(dashboard, selectedCampus, selectedYear) {

    var Vault = dashboard.Vault;
    /*
        var ObjectVersionProperties = Vault.ObjectPropertyOperations.GetProperties(dashboard.CustomData.ObjectVersions.Item(1).ObjVer);
        var CurrentObject = ObjectVersionProperties.SearchForPropertyByAlias(Vault, "vProperty.Campus", true);
        
        var CurrentCampus = (CurrentObject == null)?
                            ObjectVersionProperties[0].TypedValue.DisplayValue : CurrentObject.TypedValue.DisplayValue;
        var CurrentYear = new Date().getFullYear();
        CurrentCampus = (selectedCampus == "") ? CurrentCampus : selectedCampus ;
        CurrentYear = (selectedYear == "") ? CurrentYear : selectedYear;
    */
    var OExpTotalResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseTotal', "", "", "", "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);

    var ctr, selected = "", Campuses = [], ExpenseYears = [];
    var Cam = "", ExpYears = "";
    for (ctr in TotalProperties) {
        var Campus = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.Campus", true).Value.DisplayValue;
        if (jQuery.inArray(Campus, Campuses) == -1) {
            Campuses.push(Campus);
            //            selected = (CurrentCampus == Campus) ? "selected" : "";
            Cam += '<option value="' + Campus + '" ' + selected + '>' + Campus + '</option>';
        }
        /*var ExpenseYear = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.ExpenseYear", true).Value.DisplayValue;
        if (jQuery.inArray(ExpenseYear, ExpenseYears) == -1) {
            ExpenseYears.push(ExpenseYear);
//            selected = (CurrentYear == ExpenseYear) ? "selected" : "";
            ExpYears += '<option value="' + ExpenseYear + '" ' + selected + '>' + ExpenseYear + '</option>';
        }*/
    }

    $('<div class="row ml-3">' +
        '<div class="col-md-12"><h4 style="padding-top:30px; padding-bottom:30px">Budgets Dashboard</h4></div>' +
        '<div class="form-group pr-5">' +
        '   <label class="d-inline-block pr-2" for="Campuses">Campus:</label>' +
        '   <select class="form-control form-control-sm d-inline-block" style="width: auto;" id="Campuses" onchange="GetExpenseYear()">' + Cam +
        '   </select>' +
        '</div>' +
        '<div  class="form-group pr-5">' +
        '   <label class="d-inline-block pr-2" for="Campuses">Expense Year:</label>' +
        '   <select class="form-control form-control-sm d-inline-block" style="width: auto;" id="ExpYears" onchange="ChangeList()">' + ExpYears +
        '   </select>' +
        '</div>' +
        '<div class="d-inline-block">' +
        '   <button type="button" class="btn btn-sm btn-outline-secondary mb-4" onclick="Refresh()">Refresh</button>' +
        '</div></div>' +

        '<div class="row"><div class="col-lg-12">' +
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
        '</div></div>'
    ).appendTo(".container-fluid");
    GetExpenseYear();
}

function GetExpenseYear() {
    $("#ExpYears").empty();
    var cam = $("#Campuses")[0].value;

    var OExpTotalResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseTotal', "vProperty.Campus", MFDatatypeText, cam, "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);

    var ctr, selected = "", Campuses = [], ExpenseYears = [];
    var Cam = "", ExpYears = "";
    for (ctr in TotalProperties) {
        var ExpenseYear = TotalProperties[ctr].SearchForPropertyByAlias(gVault, "vProperty.ExpenseYear", true).Value.DisplayValue;
        if (jQuery.inArray(ExpenseYear, ExpenseYears) == -1) {
            ExpenseYears.push(ExpenseYear);
            ExpYears += '<option value="' + ExpenseYear + '" ' + selected + '>' + ExpenseYear + '</option>';
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

    var cam = $("#Campuses")[0].value;
    var year = $("#ExpYears")[0].value;

    var OEXTypeResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseType', 'vProperty.ExpenseName', "", "", "", "", "", "", MFDatatypeText), MFSearchFlagNone, true);
    var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();

    var OBudgetResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseBudget', 'vProperty.Campus', MFDatatypeText, cam, 'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
    var BudgetResultsObjVers = OBudgetResults.GetAsObjectVersions().GetAsObjVers();

    var OExpTotalResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseTotal', 'vProperty.Campus', MFDatatypeText, cam, 'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
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
            var num = $("#Remaining" + j).text();
            if (num.indexOf('(') == 0) // found
                $("#Remaining" + j).css('color', '#f00');
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

function Refresh() {
    var SelectedCampus = $("#Campuses")[0].value;
    var SelectedYear = $("#ExpYears")[0].value;
    $(".container-fluid").empty();
    SetDetails(gDashboard, SelectedCampus, SelectedYear);
}

function Refresh1() {
    $("#Campuses")[0].selectedIndex = 0;
    $("#ExpYears")[0].selectedIndex = 0;
    $("#budget_details_table tbody").empty();
}

function SortLineNo(ArrayVal) {
    ArrayVal.sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return ArrayVal;
};