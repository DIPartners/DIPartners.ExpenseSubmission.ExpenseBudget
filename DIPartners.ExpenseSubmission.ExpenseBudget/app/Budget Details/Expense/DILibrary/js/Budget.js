//const { error } = require("jquery");
var gVault;
var gDashboard;

// Entry point of the dashboard.
function OnNewDashboard(dashboard) {
    gVault = dashboard.Vault;
    gDashboard = dashboard.CustomData;
    var tab = dashboard.Parent;

    if (null != dashboard.CustomData && null != dashboard.CustomData.ObjectVersions) {
        if (dashboard.CustomData.ObjectVersions.Count == 0) {
            return;
        }

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
    var CurrentCampus = ObjectVersionProperties.SearchForPropertyByAlias(Vault, "vProperty.Campus", true).TypedValue.DisplayValue;
    var CurrentYear = new Date().getFullYear();
    var OExpTotalResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseTotal', "", "", "", "", "", ""), MFSearchFlagNone, true);
    var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    var TotalProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);

    var ctr, selected, Campuses = [], ExpenseYears = [];
    var Cam = "<option selected>select...</option>";
    var ExpYears = "<option selected>select...</option>";
    for (ctr in TotalProperties) {
        var Campus = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.Campus", true).Value.DisplayValue;
        if (jQuery.inArray(Campus, Campuses) == -1) {
            Campuses.push(Campus);
            selected = (CurrentCampus == Campus) ? "selected" : "";
            Cam += '<option value="' + Campus + '" ' + selected + '>' + Campus + '</option>';
        }
        var ExpenseYear = TotalProperties[ctr].SearchForPropertyByAlias(Vault, "vProperty.ExpenseYear", true).Value.DisplayValue;
        if (jQuery.inArray(ExpenseYear, ExpenseYears) == -1) {
            ExpenseYears.push(ExpenseYear);
            selected = (CurrentYear == ExpenseYear) ? "selected" : "";
            ExpYears += '<option value="' + ExpenseYear + '" ' + selected + '>' + ExpenseYear + '</option>';
        }
    }

    $('<div class="row ml-3">' +
        '<div class="col-md-12"><h4 style="padding-top:30px; padding-bottom:30px">Budgets Dashboard</h4></div>' +
        '<div class="form-group pr-5">' +
        '   <label class="d-inline-block pr-2" for="Campuses">Campus:</label>' +
        '   <select class="form-control form-control-sm d-inline-block" style="width: auto;" id="Campuses" onchange="ChangeList()">' + Cam +
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
        '           <th>Total</th>' +
        '           <th>Remainder</th>' +
        '       </thead ></tr> ' +
        '   </table>' +
        '</div></div>'
    ).appendTo(".container-fluid");
    ChangeList();
    //    foreach var
    //SetBudgetDetails(controller);
}

function ChangeList(val) {
    $("#budget_details_table tbody").empty();

    var cam = $("#Campuses")[0];
    var year = $("#ExpYears")[0];
    if (cam.selectedIndex == 0 || year.selectedIndex == 0) return;

    cam = cam.value;
    year = year.value;
    var ArrayVal = [];

    var TableBody = $('#budget_details_table');
    TableBody.append("<tbody>");

    var ObjectVersionProperties = gVault.ObjectPropertyOperations.GetProperties(gDashboard.ObjectVersions[0].ObjVer);
    var CampusName = ObjectVersionProperties.SearchForPropertyByAlias(gVault, "vProperty.campus", true); // current campus name


    var OEXTypeResults = gVault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(gVault, 'vObject.ExpenseType', 'vProperty.ExpenseName', "", "", "", "", "", "", MFDatatypeText), MFSearchFlagNone, true);
    var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();

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
        var CampusBudget, CampusTotal, Remainder = "NaN";
        for (var i = 0; i < TypeResultsObjVers.Count; i++) {
            var TypeProps = TypeProperties[i][0].Value.DisplayValue.replace(/[ , '/']/g, '');
            var CampusBudget = (BudgetProperties == "") ? "NaN" : BudgetProperties[0].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
            if (CampusBudget == null) { CampusBudget = Remainder = "unlimited"; }

            if (TotalProperties != "") {
                CampusTotal = 0;
                for (var j = 0; j < TotalProperties.Count; j++) {
                    CampusTotal += TotalProperties[j].SearchForPropertyByAlias(gVault, "vProperty." + TypeProps, true).TypedValue.Value;
                }
            }

            if (CampusBudget != "unlimited") {
                Remainder = formatter.format(CampusBudget - CampusTotal);
                CampusBudget = formatter.format(CampusBudget);
            }
            CampusTotal = (CampusTotal === 0) ? "" : formatter.format(CampusTotal);

            var htmlStr =
                '<tr>' +
                '<td>' + TypeProps + '</td >' +
                '<td><span id="budget' + i + '" style="float: right;">' + CampusBudget + '</span></td >' +
                '<td><span id="total' + i + '" style="float: right;">' + CampusTotal + '</span></td >' +
                '<td><span id="remainder' + i + '" style="float: right;">' + Remainder + '</span></td >' +
                '</tr>';
            ArrayVal[i] = TypeResultsObjVers[i].ID + ", " + htmlStr;
        }
        var SortedList = SortLineNo(ArrayVal).join();
        TableBody.append(SortedList);

        for (var j = 0; j < TypeResultsObjVers.Count; j++) {
            var num = $("#remainder" + j).text();
            if (num.indexOf('(') == 0) // found
                $("#remainder" + j).css('color', '#f00');
            if ($("#budget" + j).text() == "NaN") $("#budget" + j).css('color', '#cad2f3');
            if ($("#total" + j).text() == "NaN") $("#total" + j).css('color', '#cad2f3');
            if ($("#remainder" + j).text() == "NaN") $("#remainder" + j).css('color', '#cad2f3');
        }
    }

}

function SetBudgetDetails(controller) {
    var Vault = controller.Vault;

    //CreateMetadataCard(controller, editor);

    /*    var OExpYearResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
            FindObjects(Vault, 'vObject.ExpenseTotal', 'vProperty.ExpenseYear', MFDatatypeInteger, "", "", "", ""), MFSearchFlagNone, true);
        var OExpYearResultsObjVers = OExpYearResults.GetAsObjectVersions().GetAsObjVers();
    */
    //    generate_row(editor.table, Vault, editor.ObjectVersionProperties, 'vProperty.Campus',"");

    //$('<div class="mf-metadatacard mf-mode-properties" id="' + editor.cardname + '"></div>').appendTo(".panel-container");

    /*
            '</tbody>' +
            '<tbody><tr class="mf-propertygroup-separator" id="propertygroup-title-2-separator-top"><td colSpan="4"></td></tr></tbody>'+
            '<tbody class= "mf-dynamic-tbody" id = "mf-property-group-2" > ' +
            '   <tr class="mf-propertygroup-title" id="propertygroup-title-2"><th style="padding-top: 9px; padding-bottom: 9px;" colspan="2">Expense Distribution</th></tr> ' +
            '   <tr class="mf-propertygroup-separator" id="propertygroup-title-2-separator-bottom"><td colSpan="3"></td></tr> ' +
            '   <tr><td colspan="2" align="center">' +
            '   <div class="search-box">' +
            '   <div class="row">' +
            '       <div class="col-md-3" style="text-align:right">' +
            '           <span class="mf-property-0000-label">Search Expense type</span>' +
            '       </div>' +
            '       <div class="col-md-9">' +
            '           <input type="text" id="searchType" class="mf-internal-text mf-property-0000-text-0">' +
            '           <script>' +
            '              $(document).ready(function () {' +
            '               $("#searchType").on("keyup", function () {' +
            '                   var value = $(this).val().toLowerCase();' +
            '                   $("#budget_details_table tr").filter(function () {' +
            '                       $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)' +
            '                   });' +
            '               });' +
            '              });' +
            '           </script>' +
            '       </div>' +
            '   </div>' +
            '   <br>' +
    */
    /*
        var Total = 0;
        var ArrayVal = [];
        var TableBody = editor.table.find('#budget_details_table');
    
        var OEXTypeResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
            FindObjects(Vault, 'vObject.ExpenseType', 'vProperty.ExpenseName', MFDatatypeText), MFSearchFlagNone, true);
        var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();
    
        var OBudgetResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
            FindObjects(Vault, 'vObject.ExpenseBudget', 'vProperty.Campus', MFDatatypeLookup, editor.ObjectVersion[0].ObjVer.ID,
                                                    'vProperty.ExpenseYear', MFDatatypeInteger, '2020'), MFSearchFlagNone, true);
        var BudgetResultsObjVers = OBudgetResults.GetAsObjectVersions().GetAsObjVers();
    
        var OExpTotalResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
            FindObjects(Vault, 'vObject.ExpenseTotal', 'vProperty.Campus', MFDatatypeLookup, editor.ObjectVersion[0].ObjVer.ID,
                                                    'vProperty.ExpenseYear', MFDatatypeInteger, '2020'), MFSearchFlagNone, true);
        var TotalResultsObjVers = OExpTotalResults.GetAsObjectVersions().GetAsObjVers();
    
    
        if (OEXTypeResults.Count > 0) {
            var TypeProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TypeResultsObjVers);
            var BudgetProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(BudgetResultsObjVers);
            var TotalProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TotalResultsObjVers);
            var formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            });
    
            for (var i = 0; i < TypeResultsObjVers.Count; i++) {           
                var TypeProps = TypeProperties[i][0].Value.DisplayValue.replace(/[ , '/']/g, '');
                var CampusBudget = BudgetProperties[0].SearchForPropertyByAlias(Vault, "vProperty." +TypeProps, true).Value.DisplayValue;
                var CampusTotal = editor.ObjectVersionProperties.SearchForPropertyByAlias(Vault, "vProperty." +TypeProps, true).Value.DisplayValue;
                var Remainder = formatter.format(CampusBudget - CampusTotal);
    
                CampusBudget = formatter.format(CampusBudget);
                CampusTotal = (CampusTotal == "")? "" : formatter.format(CampusTotal);
    
                var htmlStr =
                    '<tr>' +
                    '<td>' + TypeProps + '</td >' +
                    '<td>' + CampusBudget + '</td >' +
                    '<td>' + CampusTotal + '</td >' +
                    '<td>' + Remainder + '</td >' +
                   // '<td class="text-center"><a class="btn btn-info btn - xs" href="#"><span class="glyphicon glyphicon-edit"></span> Edit</a> <a href="#" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove"></span> Del</a></td>' +
                    '</tr>';
                ArrayVal[i] = TypeResultsObjVers[i].ID + ", " + htmlStr;
            }
            var SortedList = gUtil.SortLineNo(ArrayVal).join();
            TableBody.append(SortedList);
        }
        */
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


function generate_row(tableID, Vault, ObjVerProperties, propertyAlias, type) {
    var propertyNumber;
    var propertyName;

    if (type == 105) {
        propertyName = "Campus";
        propertyValue = ObjVerProperties[0].typedValue.DisplayValue;
    }
    else {
        propertyNumber = ObjVerProperties.SearchForPropertyByAlias(Vault, propertyAlias, true).PropertyDef;
        PropertyDef = Vault.PropertyDefOperations.GetPropertyDef(propertyNumber);
        var propertyName = PropertyDef.Name;
        var propertyType = PropertyDef.DataType;
        var propertyValue = ObjVerProperties.SearchForPropertyByAlias(Vault, propertyAlias, true).Value.DisplayValue;
        var propertyEditable = (PropertyDef.AutomaticValueType == 0 ? 1 : 0);
        var classID = ObjVerProperties.SearchForProperty(MFBuiltInPropertyDefClass).TypedValue.getvalueaslookup().Item;
        var assocPropDefs = Vault.ClassOperations.GetObjectClass(classID).AssociatedPropertyDefs;
        var propertyRequired = gUtil.isRequired(assocPropDefs, propertyNumber);
        if (propertyType == 8)
            propertyValue = ((propertyValue == 'Yes') ? 'Yes' : 'No');
        if (propertyType == 3)
            propertyValue = '$' + propertyValue;
    }
    // Create container element
    var propertyLine = $('<tr>');
    propertyLine.addClass('mf-dynamic-row mf-property-' + propertyNumber);
    propertyLine.attr('id', propertyNumber)
    // Check if field is editable. If it is, add class 'mf-editable'
    if (propertyEditable)
        propertyLine.addClass('mf-editable');
    //	$(tableID).append(propertyLine);
    tableID.append(propertyLine);

    // Add hover handler (IE 10 css pseudo selector :hover is not detecting mouse leave events)
    propertyLine.hover(
        function () {

            // Set the hover theme. The special theme is set for workflow and workstates properties.
            $(this).addClass("ui-state-hover");
            if (propertyNumber == 38 || propertyNumber == 99)
                $(this).addClass("ui-footer-hover");
        },
        function () {

            // Remove the hover theme, as well as the special theme workflow and workstate properties.
            $(this).removeClass("ui-state-hover");
            if (propertyNumber == 38 || propertyNumber == 99)
                $(this).removeClass("ui-footer-hover");
        }
    );



    propertyLine.append(
        '        <td class="mf-dynamic-namefield">' +
        '            <div>' +
        '                <span class="mf-property-' + propertyNumber + '-label">' + propertyName + '</span>' +
        '                <span class="mf-required-indicator">*</span>' +
        '            </div>' +
        '        </td>' +
        '        <td class="mf-dynamic-controlfield">' +
        '            <div class="mf-control mf-dynamic-control mf-text">' +
        '                <div class="mf-internal-container">' +
        '                    <div class="mf-internal-text mf-property-' + propertyNumber + '-text-0">' + propertyValue + '</div>' +
        '                </div>' +
        '            </div>' +
        '        </td>'
    );


    if (!propertyRequired)
        requiredspan = propertyLine.find('.mf-required-indicator').hide();
}

function CreateMetadataCard(controller, editor) {
    controller.editor = editor;
    var cardid = (typeof controller.cards === 'undefined') ? 0 : controller.cards + 1;
    controller.cards = cardid;
    editor.cardname = 'metadatacard-' + cardid;


    $('<div class="mf-metadatacard mf-mode-properties" id="' + editor.cardname + '"></div>').appendTo(".container");

    var MetaCard = $('div #' + editor.cardname);
    MetaCard.addClass("mf-card-docked");

    var mfcontentDiv = $('<div>');
    mfcontentDiv.addClass('mf-content');
    mfcontentDiv.css('height', '100%');
    MetaCard.append(mfcontentDiv);

    var mfpropertiesviewDiv = $('<div>');
    mfpropertiesviewDiv.attr('id', 'mf-properties-view')
    mfcontentDiv.append(mfpropertiesviewDiv);

    var mfdynamiccontrolsDiv = $('<div>');
    mfdynamiccontrolsDiv.addClass('mf-dynamic-controls');
    mfpropertiesviewDiv.append(mfdynamiccontrolsDiv);

    var mfinternaldynamiccontrolsDiv = $('<div>');
    mfinternaldynamiccontrolsDiv.addClass('mf-internal-dynamic-controls');
    mfdynamiccontrolsDiv.append(mfinternaldynamiccontrolsDiv);

    var scroll = $(window).outerHeight() - $("#mf-footer").outerHeight() - $("#titleLabel").height() - 20;
    var mfsectionDiv = $('<div>');
    mfsectionDiv.addClass('mf-section mf-section-properties');
    mfinternaldynamiccontrolsDiv.append(mfsectionDiv);

    var mfscrollableDiv = $('<div>');
    mfscrollableDiv.addClass('ui-scrollable');
    mfscrollableDiv.css('height', scroll + 'px');
    mfsectionDiv.append(mfscrollableDiv);

    var mfsectioncontentDiv = $('<div>');
    mfsectioncontentDiv.addClass('mf-section-content mf-dynamic-properties');
    mfsectioncontentDiv.attr('id', 'a' + cardid);
    //mfsectioncontentDiv.attr('style', 'padding:10px 30px 50px 30px');
    mfscrollableDiv.append(mfsectioncontentDiv);

    var mfdynamicTab = $('<table>');
    mfdynamicTab.addClass('mf-dynamic-table');
    mfdynamicTab.attr('id', 'mf-property-table');
    mfsectioncontentDiv.append(mfdynamicTab);

    var mfdynamicTabBody = $('<tbody>');
    mfdynamicTabBody.addClass('mf-dynamic-tbody mf-propertygroup-no-header');
    mfdynamicTabBody.attr('id', 'mf-property-group-1');
    mfdynamicTab.append(mfdynamicTabBody);

    editor.metadatacard = MetaCard;
    editor.table = $('div #' + editor.cardname + ' #mf-property-table');
}


function Refresh() {
    $("#Campuses")[0].selectedIndex = 0;
    $("#ExpYears")[0].selectedIndex = 0;
    $("#budget_details_table tbody").empty()
}


function SortLineNo(ArrayVal) {
    ArrayVal.sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return ArrayVal;
};