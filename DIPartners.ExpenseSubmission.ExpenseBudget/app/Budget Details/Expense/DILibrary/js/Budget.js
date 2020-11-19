//const { error } = require("jquery");
var gDashboard;
var gUtil;

// Entry point of the dashboard.
function OnNewDashboard(dashboard) {

    isPopup = dashboard.IsPopupDashboard;
    // Parent is a shell pane container (tab), when dashboard is shown in right pane.
    var tab = dashboard.Parent;

    // Initialize console.
    console.initialize(tab.ShellFrame.ShellUI, "Budget");

    gDashboard = dashboard;

    // Some things are ready only after the dashboard has started.
    dashboard.Events.Register(MFiles.Event.Started, OnStarted);
    function OnStarted() {
        SetDetails(dashboard);
    }
}

function SetDetails(dashboard) {
    var Vault = dashboard.Vault;
    var controller = dashboard.CustomData;
    controller.Vault = Vault;
    var editor = controller.Invoice;

    // Apply vertical layout.
    $("body").addClass("mf-layout-vertical");

    // Show some information of the document.
    $('#message_placeholder').text(controller.ObjectVersion.Title + ' (' + controller.ObjectVersion.ObjVer.ID + ')');
    var ObjectVersionProperties = Vault.ObjectPropertyOperations.GetProperties(controller.ObjectVersion.ObjVer);
    gUtil = new APUtil(Vault, controller, editor);

    controller.Budget = {
        ObjectVersion: controller.ObjectVersion,
        ObjectVersionProperties: ObjectVersionProperties,
        Events: dashboard.Events
    };

    SetBudgetDetails(controller);

}


function SetBudgetDetails(controller) {
    var editor = controller.Budget;
    var Vault = controller.Vault;

    CreateMetadataCard(controller, editor);
    generate_row(editor.table, Vault, editor.ObjectVersionProperties, 'vProperty.Campus');
    generate_row(editor.table, Vault, editor.ObjectVersionProperties, 'vProperty.ExpenseDate');
    generate_row(editor.table, Vault, editor.ObjectVersionProperties, 'vProperty.ExpenseTotal');

    editor.table.append(
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
        '   <div class="search-list">' +
        '       <table width="100%" id="budget_details_table" class="details">' +
        '           <thead><tr><th>Expense Type</th><th>Campus Budget</th><th>Total</th>' +
        '           <th>Remainder</th></thead></tr>' +
        '       </table>' +
        '   </div></td></tr></tbody>' + 
        '');

    var Total = 0;
    var ArrayVal = [];
    var TableBody = editor.table.find('#budget_details_table');


    var OEXTypeResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseType', 'vProperty.ExpenseName', MFDatatypeText,""), MFSearchFlagNone, true);
    var TypeResultsObjVers = OEXTypeResults.GetAsObjectVersions().GetAsObjVers();

    var OBudgetResults = Vault.ObjectSearchOperations.SearchForObjectsByConditions(
        FindObjects(Vault, 'vObject.ExpenseBudget', 'vProperty.Campus', MFDatatypeLookup, editor.ObjectVersion.ObjVer.ID), MFSearchFlagNone, true);
    var BudgetResultsObjVers = OBudgetResults.GetAsObjectVersions().GetAsObjVers();

    if (OEXTypeResults.Count > 0) {
        var TypeProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(TypeResultsObjVers);
        var BudgetProperties = Vault.ObjectPropertyOperations.GetPropertiesOfMultipleObjects(BudgetResultsObjVers);
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
                //'   <td><input type="text" id="ExpenseType' + i + '" value="' + TypeProps + '" title="' + TypeProps + '"></td > ' +
                //'   <td><input type="text" id="CampusBudget' + i + '" value="' + CampusBudget + '" title="' + CampusBudget + '"></td > ' +
                //'   <td><input type="text" id="CampusTotal' + i + '" value="' + CampusTotal + '" title="' + CampusTotal + '"></td > ' +
                //'   <td><input type="text" id="Remainder' + i + '" value="' + Remainder + '" title="' + Remainder + '"></td > ' +
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
}

// A helper function to compile the search conditions needed for running the search in the
// vault using M-Files API.
function FindObjects(Vault, OTAlias, PDAlias, PDType, Value) {
    // We need a few IDs based on aliases defined in the M-Files Admin tool for object types, properties, etc.
    // Note that all these methods could be run asynchronously as well, if it seems they take a long time and block the UI.
    var OT = Vault.ObjectTypeOperations.GetObjectTypeIDByAlias(OTAlias);
    var PD = Vault.PropertyDefOperations.GetPropertyDefIDByAlias(PDAlias);

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

    if (Value != "") {
        // Search condition that defines that the object must refer to the given object.
        oSC.ConditionType = MFConditionTypeEqual;
        oSC.Expression.DataPropertyValuePropertyDef = PD;
        oSC.TypedValue.SetValue(PDType, Value);
        oSCs.Add(-1, oSC);
    }

    return oSCs;
}


function generate_row(tableID, Vault, ObjVerProperties, propertyAlias) {
    var propertyNumber = ObjVerProperties.SearchForPropertyByAlias(Vault, propertyAlias, true).PropertyDef;
    var PropertyDef = Vault.PropertyDefOperations.GetPropertyDef(propertyNumber);
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


    $('<div class="mf-metadatacard mf-mode-properties" id="' + editor.cardname + '"></div>').appendTo(".panel-container");

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
