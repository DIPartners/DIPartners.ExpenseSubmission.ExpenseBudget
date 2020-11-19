(function( $, undefined ) {

	// TODO: Change the name of this widget to lookupcontrolcontainer,
	// because this widget is used as container for both normal lookup control and multiselect lookup control.

	// mfiles.mfmultiselectlookupcontrol
	$.widget( "mfiles.mfmultiselectlookupcontrol", {

		// options.
		options: {
			editmode: false,
			readonly: false,
			requesteditmode: null,
			setfocustoparent: null,
			localization: null,
			metadatacard: null,
			itemselected: null,
			arrowkeyhandler: null
		},

		// _create.
		_create: function() {

			// Initialize model.	
			this.model = null;

			// Append container for embedded lookup controls.
			var lookupContainer = $( '<div class="mf-internal-lookups mf-internal-lookups-extended"></div>' );
			this.element.data( "lookupContainer", lookupContainer );
			this.element.append(lookupContainer);

// HKo
			var originalContent = this.element.html();
			this.element.find(".mf-helptext").show();

			var emptyList = $('<div class="mf-internal-empty-lookup-list">' + originalContent + '&nbsp;</div>');

			emptyList.hide();
			lookupContainer.append(emptyList);
		},

		// _getLookupContainer.
		_getLookupContainer: function() {
			return this.element.data( "lookupContainer" );
		},

		// Use the _setOption method to respond to changes to options.
		_setOption: function( key, value ) {

			
			// In jQuery UI 1.9 and above, use the _super method to call base widget.
			this._super( "_setOption", key, value );
		},

		// Clean up any modifications your widget has made to the DOM.
		_destroy: function() {

			// Remove lookupContainer and its childs. Unbinds also all events.
			var lookupContainer = this._getLookupContainer();
			lookupContainer.remove();
		},
		
		// setModel.
		setModel: function( model, metadatacard ) {

			var self = this;
			this.metadatacard = metadatacard;
			this.model = model;
			
			this.element.find( ".mf-internal-lookups" ).removeClass( "mf-internal-lookups-extended" );

			var lookupContainer = this._getLookupContainer();
			this._createLookupControl( lookupContainer, 0, null );
			
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			lookupControls.mflookupcontrol( "setToEditMode", true, function() {} );
			
			// Prefill class if provided by model.
			/*if( model.getValue() )
				lookupControls.mflookupcontrol( "updateControl", model.getValue().Name, model );*/
		},


		// setFocusedControl.
		// Called by lookupcontrol.js. 
		setFocusedControl: function( focusedControl ) { 
		},


		// _createLookupControl. 
		_createLookupControl: function( lookupContainer, key, lookupValue ) {

			var self = this;
			var lookupValueId = -1;

			// Create div-tag and append it to container.
			var divTag = $( '<div class="mf-internal-lookup"></div>' );
			var lookups = lookupContainer.find( ".mf-internal-lookup" );
			
			lookupContainer.append( divTag );
			
			// Create lookupcontrol as child control for div-tag.
			divTag.mflookupcontrol( {
				isdeletable: false,
				editmode: self.options.editmode,
				readonly: self.options.readonly,
				multiselect: false,
				isclassselector: true,
				ispropertyselector: false,
				issingleclick: false,
				openwithoutmodifierkey: false, // Ctrl or Alt + arrow key is needed to open dropdown menu.
				arrowkeyhandler: self.options.arrowkeyhandler,
				requesteditmode: self.options.requesteditmode,
				localization: self.options.localization,
				metadatacard: self.options.metadatacard,
				lookupcontrolcontainer: self,
				insert: function() {

					// User pressed Ctrl + I, add empty lookup control.
				},
				removevalue: function( lookupValue, element, deleteControl, moveFocus ) {

					// Called when lookup control (individual filed) is removed by user.
				},

				removeproperty: function() {

					// Called when user tries to remove whole control (property).
					// Remove control from model. Actual UI control is removed by event which is sent when model changes.
					//self.metadatacard.removeProperty( self.model, true );
				},

				// User has selected a new item in a lookup control.
				itemselected: function( oldLookupValue, newLookupValue ) {

					// Delegate to parent control.
					self.options.itemselected( newLookupValue );
					return false;	
				}

			} );

			// Set model
			divTag.mflookupcontrol( "setModel", self.model );

			// Create selection list handler.
			divTag.mflookupcontrol( "createSelectionListHandler" );
		},
		
		setInactiveText: function( text ) {
			
			// Get first and only lookup control.
			var lookupContainer = this._getLookupContainer();
			var lookupControl = lookupContainer.find( ".mf-internal-lookup" ).first();
			
			// Delegate.
			lookupControl.mflookupcontrol( "setInactiveText", text );
		},

		// updateIcons.
		updateIcons: function() {

			// Tell each lookup control to update its icon.
			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			lookupControls.each( 
				function() {
					$( this ).mflookupcontrol( "updateIcon" );
				}
			);
		},

		// inEditMode.
		inEditMode: function() {
			return this.options.editmode;
		},

		// captureFocus.
		captureFocus: function( select, sendCompletedEvent ) {

			// Set focus to first lookup control.
			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			lookupControls.first().mflookupcontrol( "captureFocus", select, sendCompletedEvent );
		},

		// isEmpty.
		isEmpty: function() {

			// Return true if control is totally empty (=doesn't have any lookup controls, even empty ones).
			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			return ( lookupControls.length === 0 ) ? true : false;
		},

		// getId.
		getId: function() {

			// Returns distinguished id of this control.
			return ( this.model ) ? this.model.Id : null;
		}
		
	} );  // end of multiselectlookupcontrol widget.

} )( jQuery );
