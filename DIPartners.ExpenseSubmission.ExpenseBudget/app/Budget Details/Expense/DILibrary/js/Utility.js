
function APUtil(Vault, controller, editor) {

	this.Vault = Vault;
	this.controller = controller;
	this.editor = editor;
	
	this.SortLineNo = function (ArrayVal) {
		ArrayVal.sort(function (a, b) {
			return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
		});
		return ArrayVal;
	};

	this.isRequired = function (assocPropDefs, propertyNumber) {
		for (var i = 0; i < assocPropDefs.Count; i++) {
			if (assocPropDefs[i].PropertyDef == propertyNumber)
				return assocPropDefs[i].Required;
		}
		return false;
	};	
}
