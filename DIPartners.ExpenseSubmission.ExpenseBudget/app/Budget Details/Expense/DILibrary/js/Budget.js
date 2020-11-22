//const { error } = require("jquery");
var gVault;
var gDashboard;
var gUtil;

// Entry point of the dashboard.
function OnNewDashboard(dashboard) {
    gVault = dashboard.Vault;
    gDashboard = dashboard.CustomData;
    var tab = dashboard.Parent;
    //$('#message_placeholder').text("Budgets Dashboard");

    if (null != dashboard.CustomData && null != dashboard.CustomData.ObjectVersions) {
        if (dashboard.CustomData.ObjectVersions.Count == 0) {
            return;
        }
        // Initialize console.
        console.initialize(tab.ShellFrame.ShellUI, "Budget");

        // Some things are ready only after the dashboard has started.
        dashboard.Events.Register(MFiles.Event.Started, OnStarted);
        function OnStarted() {
            SetDetails(dashboard);
        }
    }
}

function SetDetails(dashboard) {
    var Vault = dashboard.Vault;
    var ObjectVersionProperties = Vault.ObjectPropertyOperations.GetProperties(dashboard.CustomData.ObjectVersions.Item(1).ObjVer);

    var classID = ObjectVersionProperties.SearchForProperty(MFBuiltInPropertyDefClass).TypedValue.getvalueaslookup().Item;
    var assocPropDefs = Vault.ClassOperations.GetObjectClass(classID).AssociatedPropertyDefs;

    gUtil = new APUtil();

    var OExpTotalResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseTotal', "", "", "", "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);
    var ctr;
    var Campuses = [];
    var ExpenseYears = [];
    var Cam = "<option selected>select...</option>";
    var ExpYears = "<option selected>select...</option>";
    for (ctr in TotalProperties) {
        var Campus = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.Campus", true).Value.DisplayValue;
        if (jQuery.inArray(Campus, Campuses) == -1) {
            Campuses.push(Campus);
            Cam += '<option value="' + Campus + '">' + Campus + '</option>';
        }
        var ExpenseYear = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.ExpenseYear", true).Value.DisplayValue;
        if (jQuery.inArray(ExpenseYear, ExpenseYears) == -1) {
            ExpenseYears.push(ExpenseYear);
            ExpYears += '<option value="' + ExpenseYear + '">' + ExpenseYear + '</option>';
        }
    }

    $(
        '<div class="row"><div class="col-md-12">' +
        '<h4 style="padding-top:30px; padding-bottom:30px">Budgets Dashboard</h4></div>' +
        '    <div class="col-md-5 mb-3">' +
        '        <label for="Campuses">Campus:</label>' +
        '        <select class="form-control form-control-sm" id="Campuses" onchange=ChangeCampusList(1)>' + Cam +
        '       </select>' +
        '    </div>' +
        '    <div class="col-md-5 mb-3">' +
        '       <label for="ExpYears">Expense Year:</label>' +
        '       <select class="form-control form-control-sm" id="ExpYears" onchange=ChangeCampusList(2)>' + ExpYears +
        '       </select>' +
        '    </div>' +
        '       <button class="align-self-end btn btn-outline-secondary btn-sm m-3" style="width: 125px;" type="button" onclick="Reset()">Reset</button>' +
        '</div>'
    ).appendTo(".container");

    $(
        /*'<div class="row"><div class="col-md-12">' +
        '<h4 style="padding-top:50px">Budgets Dashboard</h4>' +
        '   <table class="table" id="pt-select" cellspacing="0">' +
        '       <thead>' +
        '          <tr style="border-top:none" class="mf-dynamic-row">' +
        '           <td>' +
        '               <label for="Campuses">Campus:</label></td>' +
        '           <td><select class="form-control form-control-sm" id="Campuses" onchange=ChangeCampusList(1)>' + Cam +
        '               </select>' +
        '	        </td>' +
        '           <td>' +
        '               <label for="ExpYears">Expense Year:</label></td><td>' +
        '               <select class="form-control form-control-sm" id="ExpYears" onchange=ChangeCampusList(2)>' + ExpYears +
        '           </select>' +
        '	        </td>' +
        '           </tr>' +
        '       </thead>' +
        '       </tbody>' +
        '   </table>' +
        '</div></div>' +*/

        '<div class="row"><div class="col-md-12"><div>' +
        '   <table class="table table-striped table-bordered table-hover table-md" id="budget_details_table" style="font-size: 13px;"> ' +
        '       <thead style="background-color:#318CCC; color:#FFFFFF; font-weight:100px">' +
        '          <tr><th width="25%">Expense Type</th>' +
        '               <th width="25%">Campus Budget</th>' +
        '               <th width="25%">Total</th>' +
        '               <th width="25%">Remainder</th></thead></tr>' +
        '       </thead>' +
        '   </table>' +
        '</div></div></div>'
    ).appendTo(".container");

}
function Reset() {
    $("#Campuses")[0].selectedIndex = 0;
    $("#ExpYears")[0].selectedIndex = 0;
    $("#budget_details_table tbody").empty()
}

function ChangeCampusList(val) {

    //alert(val);
    $("#budget_details_table tbody").empty()

    var cam = $("#Campuses")[0];
    var year = $("#ExpYears")[0];
    if (cam.selectedIndex == 0 || year.selectedIndex == 0) return;
    var ArrayVal = [];
    cam = cam.value;
    year = year.value;

    var TableBody = $('#budget_details_table');
    TableBody.append("<tbody>");

    var ObjectVersionProperties = gVault.ObjectPropertyOperations.GetProperties(gDashboard.ObjectVersions[0].ObjVer);
    var CampusName = ObjectVersionProperties.SearchForPropertyByAlias(gVault, "vProperty.campus", true); // current campus name

    var OEXTypeResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseType', 'vProperty.ExpenseName', "", "", "", "", "", "", MFDatatypeText), MFSearchFlagNone, true);
    var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();
    var TypeProperties = gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TypeResultsObjVers);

    var OBudgetResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseBudget', 'vProperty.CampusBudget', MFDatatypeText, cam, 'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
    var BudgetResultsObjVers = OBudgetResults.GetAsObjectVersions().GetAsObjVers();

    var OExpTotalResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseTotal', 'vProperty.CampusExpenses', MFDatatypeText, cam,
            'vProperty.ExpenseYear', MFDatatypeInteger, year), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();


    if (OEXTypeResults.Count > 0) {
        var TypeProperties = gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TypeResultsObjVers);
        var BudgetProperties = (OBudgetResults.Count > 0) ?
            gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(BudgetResultsObjVers) : "";
        var TotalProperties = (OExpTotalResults.Count > 0) ?
            gVault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers) : "";

        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });

        for (var i = 0; i < TypeResultsObjVers.Count; i++) {
            var TypeProps = TypeProperties[i][0].Value.DisplayValue.replace(/[ , '/']/g, '');
            var CampusBudget = (BudgetProperties == "") ? "NaN" : BudgetProperties[0].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
            if (CampusBudget == null) {
                CampusBudget = "unlimited";
            }

            var CampusTotal;
            if (TotalProperties != "") {
                CampusTotal = 0;
                for (var j = 0; j < TotalProperties.Count; j++) {
                    CampusTotal += TotalProperties[j].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
                }
            }
            var Remainder = "NaN";
            if (CampusBudget != "unlimited") {
                Remainder = formatter.format(CampusBudget - CampusTotal);
                CampusBudget = formatter.format(CampusBudget);
            }
            CampusTotal = (CampusTotal == "") ? "" : formatter.format(CampusTotal);

            var htmlStr =
                '<tr>' +
                '<td>' + TypeProps + '</td >' +
                '<td><span style="float: right;">' + CampusBudget + '</span></td>' +
                '<td><span style="float: right;">' + CampusTotal + '</span></td>' +
                '<td><span style="float: right;">' + Remainder + '</span></td>' +
                // '<td class="text-center"><a class="btn btn-info btn - xs" href="#"><span class="glyphicon glyphicon-edit"></span> Edit</a> <a href="#" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove"></span> Del</a></td>' +
                '</tr>';
            ArrayVal[i] = TypeResultsObjVers[i].ID + ", " + htmlStr;
        }
        var SortedList = gUtil.SortLineNo(ArrayVal).join();
        TableBody.append(SortedList);
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
        // Search condition that defines that the object must refer to the given object.
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

