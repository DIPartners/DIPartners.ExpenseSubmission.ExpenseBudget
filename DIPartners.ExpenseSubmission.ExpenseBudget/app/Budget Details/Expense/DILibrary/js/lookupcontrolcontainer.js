(function( $, undefined ) {

	// TODO: Change the name of this widget to lookupcontrolcontainer,
	// because this widget is used as container for both normal lookup control and multiselect lookup control.

	// mfiles.mfmultiselectlookupcontrol
	$.widget( "mfiles.lookupcontrolcontainer", {

		// options.
		options: {
			editmode: false,
			readonly: false,
			isclassselector: false,
			issingleclick: true,
			ispropertyselector: false,
			setviewmodeafterselection: false,
			requesteditmode: null,
			setfocustoparent: null,
			metadatacard: null,
			propertyline: null,
			localization: null
		},

		// _create.
		_create: function() {

			var self = this;
			var element = this.element;

			this.model = null;

			this.editModeTimeout = null;

			// Lookup control, which has dropdown list open.
			this.controlWithList = null;
			
			this.skipModelEvents = false;

			// Lookup control, which currently has focus.
			this.focusedControl = null;
			
			// Index of latest lookup control inside MSLU, which has or had focus or -1 if not set.
			// This value is still valid when control has moved to view mode.
			this.latestFocusedControlId = -1;

			// Tells whether toolbar should be visible.
			this.toolbarVisible = false;

			// Tells whether selection of SSLU control is in progress.
			this.ssluSelectionInProgress = false;

			// Get localization strings.
			this.specifyMoreValuesText = "test";// this.options.localization.strings.IDS_MENUSTR_SPECIFY_MORE_VALUES;

			// Check whether this is SSLU or MSLU control.
			this.multiSelect = element.hasClass( "mf-multiselectlookup" );

			// Get original content and hide help text.
			var originalContent = element.html();
			element.find( ".mf-helptext" ).hide();

			// Append container for embedded lookup controls.
			var lookupContainer = this._getLookupContainer();
			element.append( lookupContainer );

			// Append hidden text to lookup container to represent empty list of lookup controls.
			// This is first element added to the container. It is shown and hidden based on number of actual lookup controls inside this container.
			var emptyList = $( '<div class="mf-internal-empty-lookup-list">' + originalContent + '&nbsp;</div>' );

			emptyList.hide();
			lookupContainer.append( emptyList );

			// Bind click event to this element with 'lookupcontainer' namespace.
			// Click event sets the control to edit mode when user clicks the control.
			// Moving to edit mode changes the state of embedded lookups controls also to edit mode.
			element.bind( "click.lookupcontainer", function( event ) {

				// Request change to edit mode from metadatacard control.
				var rowToFocus = undefined;
				if( !self.options.editmode ) {
				
					// In case of MSLU, check that event is original event created by mouse click, not simulated by metadata card itself.
					if( self.multiSelect && event && event.originalEvent ) {
					
						// Try to find actual lookup control which was clicked and index of it to set focus to correct lookup control when MSLU moves to edit mode.  
						rowToFocus = $( event.target ).closest( ".mf-internal-lookup" ).first().index();
						if( rowToFocus == -1 )
							rowToFocus = undefined;
						else
							rowToFocus--;
				    }
					self.options.requesteditmode( self, rowToFocus );
				}

				// Don't forward events to parent.
				// Events are allowed for surrounding metadatacard control only if we click to outside of controls rect.
				// This is because clicking out of controls changes all controls to view mode.				
				event.stopPropagation();
			} );

			// Bind custom stopEditing events sent by metadata card.
			element.bind( "stopEditing.lookupcontainer", function( event, param ) {
				if( self.options.editmode )
					self.setToNormalMode( param.isCancel, param.setFocusToParent );
			} );
		},

		// _getLookupContainer.
		_getLookupContainer: function() {

			var lookupContainer = this.element.data( "lookupContainer" );
			if( lookupContainer === undefined ) {

				// Append container for controls.
				lookupContainer = $( '<div class="mf-internal-lookups mf-internal-lookups-extended"></div>' );
				this.element.data( "lookupContainer", lookupContainer );
			}
			return lookupContainer;
		},

		// Use the _setOption method to respond to changes to options.
		_setOption: function( key, value ) {

			switch( key ) {

				// Handle changes to readonly-option.        
				case "readonly":

					// Set value of readonly-option.
					this.options.readonly = value;

					// Set value of readonly-option also in all lookup controls.
					var lookupContainer = this._getLookupContainer();
					var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
					lookupControls.each( 
						function() {
							$( this ).mflookupcontrol( "option", key, value );
						}
					);
					break;

				case "isclassselector":

					// Set value of isclassselector-option.
					this.options.isclassselector = value;
					break;

				case "ispropertyselector":

					// Set value of ispropertyselector-option.
					this.options.ispropertyselector = value;
					break;

				case "setviewmodeafterselection":

					// Set value of setviewmodeafterselection-option.
					this.options.setviewmodeafterselection = value;
					break;

			}
			// In jQuery UI 1.9 and above, use the _super method to call base widget.
			this._super( "_setOption", key, value );
		},

		// Clean up any modifications your widget has made to the DOM.
		_destroy: function() {

			// Hide toolbar.
			this._hideToolbar();

			// Unregister lookup control events.
			utilities.unregisterLookupControlEvents( this, this.model );

			var element = this.element;

			// Unbind click and stopEditing events.
			this.element.unbind( "click.lookupcontainer" );
			this.element.unbind( "stopEditing.lookupcontainer" );

			// Clear timers if they are still running.
			this._clearTimers();

			// Remove lookupContainer and its childs. Unbinds also all events.
			var lookupContainer = this._getLookupContainer();
			lookupContainer.remove();

			// Put original content visible again.			
			element.find( ".mf-helptext" ).show();
		},

		// setToNormalMode
		setToNormalMode: function( isCancel, setFocusToParent )  {

			var self = this;
			
			// No focused control in view mode. 
			this.focusedControl = null;

			// Hide toolbar.
			this._hideToolbar();

			// User cancels the editing of lookup by pressing Escape key.
			if( isCancel ) {
			
				// Skip events from the model.
				// This is done because removing of unvalidated values triggers unwanted events.
				this.skipModelEvents = true;
					
				// Remove unvalidated values from the model.
				this._removeUnvalidatedValues();
			
				// If searching was in progress when user moved from edit mode to view mode by pressing Esc,
				// clear the information related to this.
				var lookupContainer = this._getLookupContainer();
				var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
				lookupControls.each( function() {
				
					// Check if searching is still in progress.
					var isSearching = $( this ).mflookupcontrol( "isSearching" );
					if( isSearching ) {
					
						// Reset information related to ongoing searching.
						$( this ).mflookupcontrol( "resetSearchingInfo", false );
						
						// Continue with next lookup control.
						return true;
					}
				} );
				
				// Don't skip events anymore from the model.
				this.skipModelEvents = false;
			
				// Set to view mode.
				this.options.editmode = false;

				// Check if the element is a property selector.
				if( self.options.ispropertyselector )
				{
					// Change the style of label text.
					var element = self.element.closest( "tr.mf-dynamic-row" ).find( ".mf-dynamic-namefield" ).find( "div" );
					element.addClass( "mf-addproperty" );
					this.options.metadatacard.configurationManager.get( "MetadataCard.Theme.AddPropertyLink.Color", function( color ) {
						element.css( "color", color );
					} );
				}

				// Set container layout to match view mode.
				self.element.find( ".mf-internal-lookups" ).addClass( "mf-internal-lookups-extended" );

				// Remove old lookup controls and create new controls in view mode.
				this._setLookupValuesToView();

				// Set focus to parent element if requested.
				if( setFocusToParent && this.options.setfocustoparent )
					this.options.setfocustoparent();
				
				// Inform propertyline about changed state.	
				if( this.options.propertyline )
					this.options.propertyline.stateChanged( { editmode: false } );
				
				return;
			}

			// Validate items and process item adding if necessary.
			if( self.options.ispropertyselector === false ) {
				var lookupContainer = this._getLookupContainer();
				var lookupControls = lookupContainer.find( ".mf-internal-lookup" );

				// Process each lookup control.
				lookupControls.each( function() {
				
					// Check if searching is still in progress.
					var isSearching = $( this ).mflookupcontrol( "isSearching" );

					// Checks if the current property is State transition. 
					// If so do not reset search info.
					if( isSearching && self.model.propertyDef != 99 ) {

						// If searching was in progress when we are moving to view mode, reset information related to ongoing searching.
						$( this ).mflookupcontrol( "resetSearchingInfo", true );
						
						// Continue with next lookup control.
						return true;
					}
					
					// Get current entered text and selected item from this control.
					var lookupText = $( this ).mflookupcontrol( "controlText" );
					var lookupValue = $( this ).mflookupcontrol( "controlValue" );

					// Validation is applied to normal lookup values only.
					// We skip the <VARIES> value.
					if( utilities.isMultiValue( lookupValue ) === false ) {

						// Normal lookup value.

						// Attempt to validate the item if the control's text and the
						// underlying selected item's display name don't match.
						// This can happen especially in the class selector where setting
						// to a null item does not happen even if the entered text is not recognized.
						// While checking duplicate, case sensitive should not be considered.
						if( lookupValue !== null &&
							$.trim( lookupText ).toLowerCase() !== $.trim( lookupValue.Name).toLowerCase() )  {

							// Attempt to validate the item.
							$( this ).mflookupcontrol( "validateItem", self.model );
							lookupText = $.trim( $( this ).mflookupcontrol( "controlText" ) );
							lookupValue = $( this ).mflookupcontrol( "controlValue" ) ;
						}

						// If the underlying selected item is null but the control has text,
						// we need to validate the item and potentially prompt for adding it as a new item.
						if( ( lookupValue === null || ( typeof lookupValue.IsUnvalidated != "undefined" && lookupValue.IsUnvalidated ) ) &&
							lookupText != "" ) {

							// Attempt to validate the item.
							if( $( this ).mflookupcontrol( "validateItem", self.model ) === false ) {

								// Validation did not result in selecting any item.

								// Prompt the user for item adding if allowed.
								// This may or may not result in actually adding the item, but in either case
								// the control gets updated to show the correct information:
								// the new value or empty.
								$( this ).mflookupcontrol( "addNewItem", self.model, false, false );

							}  // end if

						}  // end if
						
						// Prevent setting of empty values to class selector if class has already been selected.
						if( self.options.isclassselector ) {
						
							// Get current text and value.
							lookupText = $( this ).mflookupcontrol( "controlText" );
							lookupValue = $( this ).mflookupcontrol( "controlValue" );
							
							// Check if class selector is empty.
							if( lookupText === "" && lookupValue == null ) {
							
								// Class selector is empty.
								// This is ok if we are creating new object and class for the new object is not yet selected.
								// However, if class has been already selected (and stored to the model), we set the earlier selected value to empty field. 
								if( self.model && self.model.getValue() ) {
									$( this ).mflookupcontrol( "setValue", self.model.getValue() );
								}
							}
						}
						
						// Make sure that the displayed text corresponds to the lookupValue of the control.
						$( this ).mflookupcontrol( "resetControlText" );

					}  // end if

				} );  // end for-each

			}  // end if

			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );

			// Remove empty lookup controls.
			var singleSelectIsEmpty = false;
			lookupControls.each( function( index ) {

				// Remove empty control. Remove all control lines that do not represent a valid value.
				var lookupValue = $( this ).mflookupcontrol( "controlValue" );
				if( $( this ).mflookupcontrol( "isEmpty" ) ||
                    lookupValue == null ||
                    ( typeof lookupValue.IsUnvalidated != "undefined" && lookupValue.IsUnvalidated ) ) {
				
					// Get lookup value from the empty control.
					// If there is one, it needs to be removed from the model.
					// Removing from the model should have occurred earlier already.					
					if( lookupValue !== null ) {

						// Lookup value is not null.
						// Remove the empty value from model.
						if( self.multiSelect ) {

							// In case of MSLU, try to find index of removed value and remove the value from the model based on that index. 
							var removeIndex = self.model.getValue().Find( lookupValue );
							if( removeIndex != -1 ) {
								self.model.Value.RemoveAt( removeIndex, null );
							}
						} else {

							// In case of SSLU, set the value to null.
							self.model.setValue( null );
						}

					}
					else {
					
						// Lookup value is null.
						// In case of MSLU, remove the unvalidated value from the model.
						if( self.multiSelect ) {
						
							// Remove unvalidated value.
							self.model.getValue().RemoveAt( index, null );
						}
						else {

							// If lookup value was empty (=null) and this is SSLU, set info about that. 
							singleSelectIsEmpty = true;
						}
							
					}  // end if

				}  // end if

			} );  // end for-each

			// Get lookup controls again now that empty controls have been removed.
			lookupControls = lookupContainer.find( ".mf-internal-lookup" );

			// Set container layout to match view mode.
			self.element.find( ".mf-internal-lookups" ).addClass( "mf-internal-lookups-extended" );

			// Set all embedded lookup controls to normal mode.
			lookupControls.mflookupcontrol( "setToNormalMode" );

			// If there are no embedded lookup controls, show text that represents empty list of lookup controls.
			if( lookupControls.length === 0 || singleSelectIsEmpty ) {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).show();
				lookupContainer.find( ".mf-internal-lookup" ).hide();
			} else {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
				lookupContainer.find( ".mf-internal-lookup" ).show();

				// Shows assingnee name and state icon in same row if access from chrome browser.
				if( utilities.isChromeBrowser ) {
					lookupContainer.parent().parent().css( "overflow", "hidden" );
				}
			}

			// Set to view mode.	
			this.options.editmode = false;

			// Check if the element is a property selector.
			if( self.options.ispropertyselector )
			{
				// Change the style of label text.
				var element = self.element.closest( "tr.mf-dynamic-row" ).find( ".mf-dynamic-namefield" ).find( "div" );
				element.addClass( "mf-addproperty" );
				this.options.metadatacard.configurationManager.get( "MetadataCard.Theme.AddPropertyLink.Color", function( color ) {
					element.css( "color", color );
				} );
			}

			// Set focus to parent element if requested.
			if( setFocusToParent && this.options.setfocustoparent )
				this.options.setfocustoparent();
			
			// Inform propertyline about changed state.	
			if( this.options.propertyline )
				this.options.propertyline.stateChanged( { editmode: false } );
			
			utilities.resumeEvents();
		},

		// addNewItem.
		addNewItem: function() {

			// Ensure that we have focused control.
			if( this.focusedControl ) {

				var value = this.focusedControl.controlText();
				if( value == "" ) {
					// No value in the field.
					// Suggest creation of new value with the empty field.
					this.focusedControl.addNewItem( this.model, true, true );
				}
				else {
				
					// Get current lookup value.
					var lookupValue = this.focusedControl.controlValue();
					
					// If current lookup value is hidden or deleted, handle it as an empty value.
					var isHiddenSupported = lookupValue && ( typeof lookupValue.IsHidden != "undefined" );
					var isDeletedSupported = lookupValue && ( typeof lookupValue.IsDeleted != "undefined" );
					if ( lookupValue && ( ( isHiddenSupported && lookupValue.IsHidden() ) || ( isDeletedSupported && lookupValue.IsDeleted() ) ) ) {
							
						// Suggest creation of new value with the empty field.
						this.focusedControl.addNewItem( this.model, true, true );
					}
					else {
					
						// Attempt to validate the item.
						var validated = this.focusedControl.validateItem( this.model );
						if( validated ) {

							// There was already existing value in the field.
							// Suggest creation of new value with the empty field.
							this.focusedControl.addNewItem( this.model, true, true );
						}
						else {
						
							// There was a new value in the field.
							// Suggest creation of new value with the field filled by the value.
							this.focusedControl.addNewItem( this.model, true, false );
						}
					
					}

				}

			}  // end if	

		},

		// setToEditMode.
		setToEditMode: function( rowToFocus, focusToLatest ) {

			// Clear timers if they are still running.
			this._clearTimers();

			// Set to edit mode.
			var self = this;
			self.editModeTimeout = setTimeout( function() {
				self._setToEditMode( rowToFocus, focusToLatest );
			}, 0 );
		},

		// _setToEditMode.
		_setToEditMode: function( rowToFocus, focusToLatest ) {
			var focusedout;

			// Set the row to focus in focused out.
			focusedout = rowToFocus;

			// change the focus to last element.
			if( this.model.getValue() != null && rowToFocus === undefined ) {

				// Set the focus to last item.
				rowToFocus = this.model.getValue().Count - 1;

			}
			if( this.options.readonly )
				return;

			var self = this;
			if( !self.editModeTimeout )
				return;

			// Function to send completed event to metadata card.
			var eventSent = false;
			var sendCompletedEvent = function() {

				// Send completed event to metadata card.
				setTimeout( function() {
					self.element.closest( ".mf-metadatacard" ).trigger( "completed" );

					// Inform propertyline about changed state.
					if( self.options.propertyline )
						self.options.propertyline.stateChanged( { editmode: true } );

				}, 0 );
			}

			// Set container layout to match edit mode.
			this.element.find( ".mf-internal-lookups" ).removeClass( "mf-internal-lookups-extended" );

			// Set all embedded lookup controls to edit mode.
			// Note that embedded lookupcontrols are not allowed to move to edit mode itself.
			// Their state is controlled by "parent" multiselectlookupcontrol.
			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			var length = lookupControls.length;
			if( length < 1 ) {

				// No existing lookup controls.
				// Add empty lookup control.
				var lookupInfo = this._addNewLookupControl();

				// Handle SSLU and singleclick controls (workflow or state) when there is nothing selected.
				if( !self.multiSelect || self.options.issingleclick ) {

					lookupControls = lookupContainer.find( ".mf-internal-lookup" );
					lookupControls.mflookupcontrol( "setToEditMode", true, function() {

						// Open the list immediately if requested.
						if( self.options.issingleclick )
							$( lookupControls[ 0 ] ).mflookupcontrol( "openList" );

						// Notify the completion.
						sendCompletedEvent();
						eventSent = true;
					} );
				}
				// Handle empty MSLU.
				else if( self.multiSelect ) {

					// Create actual UI control with unvalidated value.
					var key = 0;
					lookupContainer = this._getLookupContainer();
					this._createLookupControl( lookupContainer, key, lookupInfo.lookup );

					// Relocate the toolbar.
					this._relocateToolbar( false );

					// Update lookup indexes.
					this.updateLookupIndexes();

					// Set control to edit mode.
					var lookupControl = lookupContainer.find( ".mf-internal-lookup" ).first();
					lookupControl.mflookupcontrol( "setToEditMode", true, function() {

						// Notify the completion.
						sendCompletedEvent();
						eventSent = true;
					} );
				}

			} else if( length === 1 ) {

				// One existing lookup control. MSLU or SSLU.
				// Note that in case of SSLU there is always lookup control available and this branch is called,
				// even with empty SSLU.

				// Set it to edit mode with focus and mark to non-deletable.
				lookupControls.mflookupcontrol( "setToEditMode", true, function() {
					var index = 0 ;

					// When user click focusout is not defined add empty lookup.
					if( focusedout === undefined ) {
						if( self.model.getValue() != null && self.model.dataType === 10) {
							self._addEmptyLookupControl( null );
							index = self.model.getValue().length;
						}
					}
					else
						index = 0;

					// Open the list immediately if requested.
					if( self.options.issingleclick )
						$( lookupControls[ index ] ).mflookupcontrol( "openList" );
					sendCompletedEvent();
					eventSent = true;
				} );

			} else {

				// Several lookup controls. MSLU.
				// Set all controls to edit mode. Normally only first control gets focus.
				// If controls are moving to edit-mode due to Shit+Tab-key combination, the latest control gets focus.
				// If rowToFocus is defined, it tells exactly which row should be focused (row index is calculated based on mouse event in lookupcontrolcontainer). 		
				var focusedControlId = 0;
				if( rowToFocus !== undefined )
					focusedControlId = rowToFocus;
				else
					focusedControlId = ( focusToLatest ) ? length - 1 : 0;

				// When user click focusout is not defined add empty lookup.
				if( focusedout === undefined ) {

					// Set focused controll as null to add empty
					// Lookup at end of the lookup control.
					self.focusedControl = null;

					// add empty lookup .
					self._addEmptyLookupControl( null );
					lookupContainer = this._getLookupContainer();
					lookupControls = lookupContainer.find( ".mf-internal-lookup" );

				}

				// If focus id is heigher than total items then focus last element.
				if( self.model.getValue() != null && focusedControlId > self.model.getValue().length - 1 )
					focusedControlId = self.model.getValue().length - 1;

				lookupControls.each(
					function( index ) {

						// Set control to edit mode and set focus for requested control.
						if( index !== focusedControlId ) {

							$( this ).mflookupcontrol( "setToEditMode", true, function() {

								var focusIndex;

								// When focusout is valid then asign the focus id. 
								if( focusedout !== undefined )
									focusIndex = rowToFocus;
								else
									focusIndex = lookupControls.length - 1;

								// Focus the given item.
								$( lookupContainer ).find( ".mf-internal-lookup" ).eq( focusIndex ).mflookupcontrol( "captureFocus" );
								sendCompletedEvent();
								eventSent = true;
							} );
						}
						else
							$( this ).mflookupcontrol( "setToEditMode", false );
					}

				); // End of each-loop.

			}

			// Show toolbar.
			this._showToolbar();

			// Hide text that represents empty list of lookup controls.
			lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
			lookupContainer.find( ".mf-internal-lookup" ).show();

			// Shows assingnee name dropdown in entire row if access from chrome browser.
			if( utilities.isChromeBrowser ) {
				lookupContainer.parent().parent().css( "overflow", "visible" );
			}

			// Set this control to edit mode.
			this.options.editmode = true;

			// In case of property selector, change the style of label text.
			if( self.options.ispropertyselector ) {

				// The UI control is a property selector.

				// Get element of the property selector.
				var element = self.element.closest( "tr.mf-dynamic-row" ).find( ".mf-dynamic-namefield" ).find( "div" );

				// Remove the property selector style. The lookup style is used instead.
				element.removeClass( "mf-addproperty" )
				element.css( "color", "" );
			}

			// Call function to send completed event to metadata card.
			if( !eventSent )
				sendCompletedEvent();
		},

		// setModel.
		setModel: function( model, metadatacard ) {

			var self = this;
			this.metadatacard = metadatacard;

			// Set model.
			this.model = model;

			// Register lookup control events.
			utilities.registerLookupControlEvents( this, this.model, this.metadatacard, this.multiSelect, {
				added: function( key, item, isInitiatedByAutoFill ) {
				
					// Skip events which are caused by UI itself.
					if( self.skipModelEvents )
						return;
				
					// Events related to unvalidated lookup values are skipped.
					// When new, empty UI control is created with unvalidated value, this is done completely in calling UI code which manipulates model and without help from events from model.
					if( item && !item.IsUnvalidated ) {
					
						// Inform metadata card about added item.
						self.options.metadatacard.lookupValueChanged(
							"added", null, item, self.model.PropertyDef );
					
						// Add new value.
						self._addLookupValue( key, item, isInitiatedByAutoFill );
					}
				},
				removed: function( item ) {
				
					// Single value list item removed from MSLU control.
				
					// Skip events which are caused by UI itself.
					if( self.skipModelEvents )
						return;
						
					// Inform metadata card about removed item.
					self.options.metadatacard.lookupValueChanged(
						"removed", item, null, self.model.PropertyDef );
				
					self._removeLookupValue( item );
				},
				replaced: function( oldItem, newItem ) {
				
					// Value of single field in MSLU control changed. 

					// Skip events which are caused by UI itself.
					if( self.skipModelEvents )
						return;
						
					// Inform metadata card about replaced item.
					self.options.metadatacard.lookupValueChanged( 
						"replaced", oldItem, newItem, self.model.PropertyDef ); 

					self._replaceLookupValue( oldItem, newItem );
				},
				itemsCleared: function() {
				
					// Skip events which are caused by UI itself.
					if( self.skipModelEvents )
						return;

					self._clearLookupValues();
				},
				valueChanged: function( oldValue, newValue ) {
				
					// Value of SSLU control changed.

					// Skip events which are caused by UI itself.
					if( self.skipModelEvents )
						return;
						
					// Inform metadata card about changed item.
					self.options.metadatacard.lookupValueChanged(
						"changed", oldValue, newValue, self.model.PropertyDef );

					self._setLookupValuesToView();
				},
				iconChanged: function() {
					self.updateIcons();
				}
			} );
			this._setLookupValuesToView();
		},

		// _addLookupValue.
		_addLookupValue: function( key, lookupValue, isInitiatedByAutoFill ) {

			// Create the control.
			var lookupContainer = this._getLookupContainer();
			this._createLookupControl( lookupContainer, key, lookupValue );
			lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
			lookupContainer.find( ".mf-internal-lookup" ).show();

			// Relocate the toolbar if the control is not initiated by autofill.
			if( ! isInitiatedByAutoFill )
				this._relocateToolbar( false );

			// Update lookup indexes.
			this.updateLookupIndexes();
		},

		// _removeLookupValue.
		_removeLookupValue: function( lookupValue ) {

			// Get container for lookup controls.
			var lookupContainer = this._getLookupContainer();

			// Remove lookup.
			lookupContainer.find( "#" + lookupValue.Id ).remove();

			// Show or hide empty list indicator.
			var lookupCount = this.model.getValue().Count;
			if( lookupCount === 0 ) {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).show();
				lookupContainer.find( ".mf-internal-lookup" ).hide();
			} else {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
				lookupContainer.find( ".mf-internal-lookup" ).show();
			}

			// Relocate the toolbar.
			this._relocateToolbar( false );

			// Update lookup indexes.
			this.updateLookupIndexes();
		},

		// _replaceLookupValue.
		_replaceLookupValue: function( oldLookupValue, newLookupValue ) {

			// Get container for lookup controls.
			var lookupContainer = this._getLookupContainer();

			// Find correct element of lookup control based on id of old lookup value.
			var element = lookupContainer.find( "#" + oldLookupValue.Id ).first();

			// Change id of element to id of new lookup value.
			element.attr( "id", newLookupValue.Id )

			// Set new value for control.
			element.mflookupcontrol( "setValue", newLookupValue );
		},

		// _clearLookupValues.
		_clearLookupValues: function() {

			// Remove all existing lookup controls.
			this._getLookupContainer().find( ".mf-internal-lookup" ).remove();

			// Get container for lookup controls and show empty list indicator.
			this._getLookupContainer().find( ".mf-internal-empty-lookup-list" ).show();
		},

		// _setLookupValuesToView.
		_setLookupValuesToView: function() {

			// Get container for lookup controls.
			var lookupContainer = this._getLookupContainer();

			var lookupCount = 0;
			if( this.multiSelect ) {

				// MSLU.

				// Remove existing lookup controls.
				lookupContainer.find( ".mf-internal-lookup" ).remove();

				// If there are lookup values in the model, get the count of them.
				if( this.model && this.model.getValue() && this.model.getValue().Count && this.model.getValue().Count > 0 ) {
					lookupCount = this.model.getValue().Count;
				} else {

					// otherwise, show indicator for empty list and return.
					lookupContainer.find( ".mf-internal-empty-lookup-list" ).show();
					this._getLookupContainer().find( ".mf-internal-lookup" ).hide();
					return;
				}

				// Get lookup values.
				var lookupValues = this.model.getValue();

				// Add embedded lookup control for each lookup value.
				for( var i = 0; i < lookupCount; i++ ) {
					var lookupValue = lookupValues[i];
					this._createLookupControl( lookupContainer, i, lookupValue );
				}

			} else {

				// SSLU.

				// Remove existing lookup control ( for example in case of class selector and other special lookups).
				// In case of normal SSLU old control is not removed, only its value is changed.
				if( !this.ssluSelectionInProgress ) {

					// Remove existing lookup control.
					// jQuery's .remove() function breaks in IE-8 so use outerHTML property to remove node.
					// Also, IE-8 in compatibility mode returns version as 7, so check that too.

					if ( utilities.getIEVersion() === "7" || utilities.getIEVersion() === "8" ) {
						var lookup = lookupContainer.find( ".mf-internal-lookup" )[ 0 ];
						if( lookup )
							lookup.outerHTML = '';
					} else {
						lookupContainer.find( ".mf-internal-lookup" ).remove();
					}
				}

				// SSLU.
				if( this.model /*&& this.model.getValue()*/ ) {

					// In case of normal SSLU, replace its value.
					if( this.ssluSelectionInProgress) {

						// Get the first (and only) lookup control.
						var element = lookupContainer.find( ".mf-internal-lookup" ).first();

						// Change the id of element to id of new lookup value.
						element.attr("id", "GLAccount");//this.model.getValue().Id );

						// Set the new value for the control.
						element.mflookupcontrol("setValue", "100000 - test"); //this.model.getValue() );
					}
					else {
						// In other cases, create totally new lookup control.
						this._createLookupControl( lookupContainer, 0, this.model/*.getValue()*/ );
					}

					// Set number of lookup controls.
					lookupCount = 1;
				}

			}

			// Show or hide empty list indicator based on number of lookup controls..
			if( lookupCount === 0 ) {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).show();
				lookupContainer.find( ".mf-internal-lookup" ).hide();
			} else {
				lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
				lookupContainer.find( ".mf-internal-lookup" ).show();

				// Shows assingnee name and state icon in same row if access from chrome browser.
				if( utilities.isChromeBrowser ) {
					lookupContainer.parent().parent().css( "overflow", "hidden" );
				}
			}

			// Update lookup indexes.
			this.updateLookupIndexes();
		},

		// updateModel.
		updateModel: function() {

			// In case of lookup controls, all changes are saved to model immediately when selection changes.
			// So, there is no need to save them again here.
			return true;

		},

		// setFocusedControl.
		setFocusedControl: function( focusedControl ) {

			// Handle MSLU.
			if( this.multiSelect && focusedControl ) {
			
				// If focused lookup control row has changed inside MSLU, handle ongoing valuelist searches. 
				if( this.focusedControl && focusedControl != this.focusedControl ) {
					
					// If searching is in progress with previously focused lookup control, clear the information related to this and
					// mark that lookup control so that it will be handled later when search results will be arrived from the model. 
					if( this.focusedControl.isSearching() ) {
						this.focusedControl.resetSearchingInfo();
					}
				}
				
				// Set index of latest lookup control inside this MSLU which has or had focus.
				// This value is needed if control moves to view mode, but value list search is not yet completed and it must be handled in view mode.
				this.latestFocusedControlId = focusedControl.lookupIndex;
			}
			
			// Set focused control.
			this.focusedControl = focusedControl;

			// Relocate the toolbar.
			this._relocateToolbar( false );
		},

		// _addNewLookupControl.
		// Adds new lookup control.
		_addNewLookupControl: function() {

			var unvalidatedLookup = null;
		
			// Get lookup container.
			var lookupContainer = this._getLookupContainer();
			var index = 0;
			if( this.focusedControl ) {

				// Get index of the control if needed.
				index = lookupContainer.find( ".mf-internal-lookup" ).index( this.focusedControl.element ) + 1;

			} else {

				// Get index of the control if needed.
				index = lookupContainer.find( ".mf-internal-lookup" ).length;
			}

			// Append the value to the metadata model if the model can represent the value.
			if( this.model.getValue() && !this.model.getValue().IsUnvalidated ) {

				// Insert an empty metadata value field to the metadata model.
				unvalidatedLookup = this.model.CreateUnvalidatedValue( "" );
				this.model.getValue().PutTo( index, false, unvalidatedLookup, null );

			} else {
			
				// The metadata model does not provide a value out. Just add a pseudo-representation in UI.
				this._createLookupControl( lookupContainer, index, null );

				// Relocate the toolbar.
				this._relocateToolbar( false );

				// Update lookup indexes.
				this.updateLookupIndexes();
			}

			// Hide text that represents empty list of lookup controls.
			lookupContainer.find( ".mf-internal-empty-lookup-list" ).hide();
			lookupContainer.find( ".mf-internal-lookup" ).show();
			
			//Return info about new control.
			return { lookup: unvalidatedLookup, index: index };
		},

		// _clearTimers.
		_clearTimers: function() {

			// Clear timer for edit mode if it is still running.
			if( this.editModeTimeout ) {
				clearTimeout( this.editModeTimeout );
				this.editModeTimeout = null;
			}
		},

		// _createLookupControl. 
		_createLookupControl: function( lookupContainer, key, lookupValue ) {

			var self = this;
			var lookupValueId = lookupValue ? lookupValue.Id : -1;

			// Create div-tag and append it to container.
			var divTag = null;
			if( lookupValue )
				divTag = $( '<div class="mf-internal-lookup" id="' + lookupValueId + '"></div>' );
			else
				divTag = $( '<div class="mf-internal-lookup"></div>' );
			var lookups = lookupContainer.find( ".mf-internal-lookup" );
			if( key < lookups.length )
				lookups.eq( key ).before( divTag );
			else if( key == lookups.length )
				lookupContainer.append( divTag );
			else
				throw MFiles.ThrowError( "Internal error: MFLookup content overindexing" );

			// Create lookupcontrol as child control for div-tag.
			var deletable = ( this.multiSelect ) ? true : false;
			divTag.mflookupcontrol( {
				isdeletable: deletable,
				editmode: self.options.editmode,
				readonly: self.options.readonly,
				multiselect: self.multiSelect,
				isclassselector: self.options.isclassselector,
				ispropertyselector: self.options.ispropertyselector,
				issingleclick: self.options.issingleclick,
				requesteditmode: self.options.requesteditmode,
				localization: self.options.localization,
				metadatacard: self.options.metadatacard,
				lookupcontrolcontainer: self,
				insert: function() {

					// User pressed Ctrl + I, add empty lookup control.
					self._addEmptyLookupControl( null );
				},
				removevalue: function( lookupValue, element, deleteControl, moveFocus ) {

					// Called when lookup control (individual filed) is removed by user.

					// Remove control if requested.
					if( deleteControl ) {

						// Get index of removed control if needed.
						var index = moveFocus ? self._getLookupContainer().find( ".mf-internal-lookup" ).index( element ) : -1;

						// Remove control.
						element.remove();

						// In case of multi-choice, set focus to next (or previous) control if requested.
						if( self.multiSelect && moveFocus ) {

							// Adjust index of control to receive focus.	
							var lastIndex = self._getLookupContainer().find( ".mf-internal-lookup" ).length;
							if( index >= lastIndex )
								index--;

							// Set focus.
							self._getLookupContainer().find( ".mf-internal-lookup" ).eq( index ).mflookupcontrol( "captureFocus" );
						}
					}

					// In case of multi-choice, remove individual value from model.
					if( self.multiSelect ) {

						// If removed lookup control had a value, remove the value also from model.
						if( lookupValue ) {

							// Try to find index of removed value and remove the value based on that index. 
							var index = self.model.getValue().Find( lookupValue );
							if( index != -1 ) {

								// If the control gets deleted, remove the model value, too.
								if( deleteControl ) {
									// Remove the model value.
									self.model.getValue().RemoveAt( index, null );
								}
								else {
									// Replace the model value with empty content.
									var lookup = self.model.CreateUnvalidatedValue( "" );
									self.model.getValue().PutTo( index, true, lookup, null );
								}
							}
						}
					}

					// If the focused control was removed, set reference to it to null.
					if( deleteControl && self.multiSelect && self.focusedControl && ( element == self.focusedControl.element ) ) {
						self.focusedControl = null;
					}

					// If there are not lookup controls left, set the whole control to view mode.
					var lookupControls = self._getLookupContainer().find( ".mf-internal-lookup" );
					if( lookupControls.length < 1 && self.options.editmode ) {

						setTimeout( function() {
							// set whole control to view mode.
							self.options.requesteditmode( null );
						}, 0 );
					}

					// Relocate the toolbar and update lookup indexes if control was deleted.
					if( deleteControl ) {

						// Relocate the toolbar.
						self._relocateToolbar( false );

						// Update lookup indexes.
						self.updateLookupIndexes();
					}
				},

				removeproperty: function() {

					// Called when user tries to remove whole control (property).
					// Remove control from model. Actual UI control is removed by event which is sent when model changes.
					self.metadatacard.removeProperty( self.model, true );
				},

				/*
				* Get the Lookup Value of the container.
				*
				* @return {Object} - Lookup value - Get the lookup Value of the current container .
				*
				*/
				getLookupValue: function () {

					// Fetch the lookup value of the focused control item.
					var lookupValue = this.lookupcontrolcontainer.focusedControl.lookupValue;
					return lookupValue;
				},

				/*
				* Adjust the position of the dropdown list..
				*
				* @param {Object} - autoComplete- Auto complete which insert operation was occured.
				* @param {Interger} - listItemDefHeight - height of the conatiner.
				*
				*/
				adjustDropdown: function ( autoComplete, listItemDefHeight ) {
					var autoCompleteTop = autoComplete.position().top,
						focusedElement = $( self.focusedControl.element ),
						uiScroll = $( ".ui-scrollable" ),
						infoMenu = $( ".mf-autocomplete-info" );

					// Checks the dropdown is display on top or bottom.
					if( autoComplete.position().top > $( self.focusedControl.element ).position().top ) {

						// Scroll the property windows for focus the current item.
						if( autoCompleteTop + ( autoComplete.height() / 2 ) > $( ".mf-property-footer" ).position().top ) {
							var top = uiScroll.scrollTop();
							uiScroll.scrollTop( top + listItemDefHeight );
						}

						// Find the Top of the dropdown.
						var top = focusedElement.offset().top + focusedElement.height(),
							infoHeight = 0,
							left = focusedElement.offset().left;

						// Find the style properties of the info ribbon if present.
						if( infoMenu.length > 0 ) {
							infoMenu.css( {
								top: top + "px",
								left: left + "px"
							} );
							top += infoMenu.height();
						}
	
						// Apply the css property after insert
						autoComplete.css( {
							top: top + "px",
							left: left + "px"
						} );
	
					}
					else if( autoCompleteTop < focusedElement.offset().top ) {

						// Excute when dropdown open at the bottom
						if( ( focusedElement.offset().top + focusedElement.height() ) > $( ".mf-property-footer" ).offset().top ) {
							var topScroll = uiScroll.scrollTop();
							uiScroll.scrollTop( topScroll + listItemDefHeight );
						}
					}
				},

				// For multiselect lookup control while shift selection based on index select an element.
				checkboxCheck: function ( index ) {
					if( !$( $( ".ui-menu-item" )[ index ] ).hasClass( "ui-state-focus" ) )
						$( $( ".ui-menu-item" )[ index ] ).find( ".checkbox" ).prop( "checked", false ).trigger( 'click' );

				},

				// For multiselect lookup control while shift selection based on index unselect an element.
				checkboxUnchecked: function ( index ) {
					if( $( $( ".ui-menu-item" )[ index ] ).hasClass( "ui-state-focus" ) )
						$( $( ".ui-menu-item" )[ index ] ).find( ".checkbox" ).prop( "checked", true ).trigger( 'click' )
				},
				/*
				* Insert the newlookup into the model when user is in multiselect mode.
				*
				* @param {Object} - newLookupValue- lookup value need to add into the model.
				*
				*/
				insertItem: function ( newLookupValue ) {

					var lookupContainer,
						autoComplete = $( ".ui-menu-item" ).closest( ".ui-autocomplete" ),
						listItemDefHeight = $( ".mf-internal-text" ).height(),
						adjustIndex = 0;

					// Check insert or replace request.
					if( ! self.model.isMultiselectReplace )
						adjustIndex = 1;

					// Insert the new lookup at the end of the model items.
					self.model.getValue().PutTo( self.model.getValue().Count - adjustIndex, false, newLookupValue, null );

					// Adjust the dropdown list.
					this.adjustDropdown( autoComplete, listItemDefHeight );

				},

				/*
				* Insert the newlookup into the model when user is in multiselect mode.
				*
				* @param {Object} - lookupValue- lookup value need to remove from the model.
				*
				*/
				removeItem: function ( lookupValue ) {

					var lookupContainer,
						lookupControls,
						modelLookupValues = self.model.getValue(),
						index;

					for( var i = 0; i < modelLookupValues.length; i++ ) {
						var tempItem;
						// If the item is found take for remove purpose.
						if( modelLookupValues.item )
							tempItem = modelLookupValues[ i ].item;
						else
							tempItem = modelLookupValues[ i ].Item;

						// Check if unselected item is in model and find its index.
						if( lookupValue.Item === tempItem ) {
							index = i;
							break;
						}
					}

					// Remove the unselected item from model.
					self.model.getValue().RemoveAt( index, null );					
					setTimeout( function () {
						lookupContainer = self._getLookupContainer();
						lookupControls = lookupContainer.find( ".mf-internal-lookup" );

						// Open the dropdown list of focused lookup control.
						$( lookupControls[ self.model.getValue().length - 1 ] ).mflookupcontrol( "openList" );

						// Focus the given lookup control.
						$( lookupContainer ).find( ".mf-internal-lookup" ).eq( self.model.getValue().length - 1 ).mflookupcontrol( "captureFocus" );
					}, 100 );

					// Find the autocomplete lookup and its top position.
					var autoComplete = $( '.ui-menu-item' ).closest( ".ui-autocomplete" ),
					listItemDefHeight = $( '.mf-internal-text ' ),
					autoCompleteTop = autoComplete.position().top,
					focusedElement = $( self.focusedControl.element ),
					infoMenu = $( '.mf-autocomplete-info' );

					// Execute when dropdown list is in down position.
					if( autoCompleteTop > focusedElement.position().top &&
						( autoCompleteTop - focusedElement.position().top ) > focusedElement.height() ) {

						var top = focusedElement.offset().top,
							left = focusedElement.offset().left;

						// Increase the top of the dropdown list by adjusting with lookup height.
						top += focusedElement.height();

						// Find the style properties of the info ribbon if present.
						if( infoMenu.length > 0 ) {
							infoMenu.css( {
								top: top + "px",
								left: left + "px"
							} );
							top += infoMenu.height();
						}

						// Apply the css property after insert.					
						autoComplete.css( {
							top: top + "px",
							left: left + "px"
						} );
					} else {
						var topScroll = $( ".ui-scrollable" ).scrollTop(),
							lookupContainer = self._getLookupContainer(),
							lookupControls = lookupContainer.find( ".mf-internal-lookup" );

						if( topScroll != 0 ) {

							// Excute when dropdown open at the top.
							$( ".ui-scrollable" ).scrollTop( topScroll - listItemDefHeight );
						} else if( self.controlWithList ) {
						
							// Close the current list.
							self.controlWithList.closeList();

							// Open the list for the curently focused lookup control.
							$( lookupControls[self.model.getValue().length - 1] ).mflookupcontrol( "openList" );
						}						
					}				
				},

				// User has selected a new item in a lookup control.
				itemselected: function( oldLookupValue, newLookupValue, lookupValueFromModel, newLookupText, setFocusToParent ) {
					/// <summary>
					///     Finalizes the item selection in a lookup control. Performs the metadata model modifications.
					/// </summary>
					/// <param name="oldLookupValue" type="IMetadataCardValue, IMetadataCardMultiValue or IMetadataCardUnvalidatedValue">
					///     The currently selected lookup item value, as IMetadataCardValue type or compatible type, such as
					///     IMetadataCardMultiValue or IMetadataCardUnvalidatedValue. 
					///     In a case of multiselect lookup, the existing value to replace is located with the existing value.
					///     Can be null if the existing value is not replaced, or it is not significant.
					/// </param>
					/// <param name="newLookupValue" type="IMetadataCardValue, IMetadataCardMultiValue or IMetadataCardUnvalidatedValue">
					///     The new lookup item value, as IMetadataCardValue type or compatible type, such as
					///     IMetadataCardMultiValue or IMetadataCardUnvalidatedValue. 
					///     Pass a null value to replace the existing value with an empty value.
					/// </param>
					/// <param name="lookupValueFromModel" type="IMetadataCardValue, IMetadataCardMultiValue or IMetadataCardUnvalidatedValue">
					///     The lookup item value currently in the model, as IMetadataCardValue type or compatible type, such as
					///     IMetadataCardMultiValue or IMetadataCardUnvalidatedValue.
					/// </param>
					/// <param name="newLookupText" type="String">
					///     The test representation for the new selection.
					/// </param>
					/// <param name="setFocusToParent" type="Boolean">
					///     True to request the control to cease the edit mode after the selection is completed.
					/// </param>
					/// <returns type="Boolean or undefined">
					///     False if the selection did not make any effect. 
					///     Todo: the meaning of the return value should be specified.
					/// </returns>

					// If the old and new value are the same item, avoid processing the change.
					// This helps us avoid situations like double triggering of Add Property in cases
					// where we first receive a change event with a valid value, and then the select event.
					// However, if old and new value are the same item and requested, set the control to view mode without processing.
					if( oldLookupValue === null && newLookupValue === null ) {

						var skipProcessing = true;
					
						// If requested, set control to view mode after selection. 
						if( self.options.setviewmodeafterselection && self.options.issingleclick ) {
						
							// Note that in varies-case we must continue the selection of the item even when old and new value are both null.
							if( lookupValueFromModel && utilities.isMultiValue( lookupValueFromModel ) ) {
							
								// Continue the selection.
								skipProcessing = false;
							}
							else {
							
								// Skip processing.
							
								// Set control to view mode.
								setTimeout( function() {

									// Set control to view mode. 
									// If selection was done by enter key or by clicking the item on the list, set focus to parent element.
									// If selection was done by tab, we don't move focus, because it was already moved to next or
									// previous control by Tab-key.
									self.setToNormalMode( true, setFocusToParent );
									self.element.closest( "tr" ).removeClass( "mf-accept-viewmode" );

								}, 0 );
							}
						}
						
						// Skip processing if requested.
						if( skipProcessing )
							return false;
					}

					if( oldLookupValue !== null &&
						newLookupValue !== null &&
						oldLookupValue.Item === newLookupValue.Item &&
						oldLookupValue.Name === newLookupValue.Name ) {

						// Note that in case of single-click control we must continue so that
						// control is set to view mode after selection.
						if( !self.options.issingleclick )
							return false;
					}

					// In case of MSLU, put the changed value to the list. 
					if( self.multiSelect ) {

						// MSLU.

						// Try to find index of old lookup value.
						var index = -1;
						if( oldLookupValue !== null ) {
							index = self.model.getValue().Find( oldLookupValue );
						}
						if( index === -1 ) {

							// Old value was not found.

							if( newLookupValue !== null ) {

								// Add the new value to the end of list.
								self.model.getValue().PutTo( self.model.getValue().Count, false, newLookupValue, null );

							} else {

								// No old value, no new value.
							}

						} else {

							// Old value was found.

							if( newLookupValue !== null ) {

								// Replace the old value in the list with the new value.
								self.model.getValue().PutTo( index, true, newLookupValue, null );

							} else {

								// Replace the old value in the list with the new value.
								var lookup = self.model.CreateUnvalidatedValue( newLookupText );
								self.model.getValue().PutTo( index, true, lookup, null );
							}

						}  // end if

					} else {

						// SSLU.

						// In case of property selector, inform metadatacard about new control.
						if( self.options.ispropertyselector )
							self.element.closest( ".mf-metadatacard" ).trigger( "controlAdded" );

						// Set the flag to indicate that selection with SSLU is in progress.
						self.ssluSelectionInProgress = true;

						// Replace the old value in the model.
						// Note: This causes synchronous call to valueChanged function in this same file. 
						// The variable ssluSelectionInProgress is true during the execution of all code called from valueChanged function.
						// If lookup value is null, we are selecting non-existing value written by user to the lookup control. In this case actual text should be used.
						if( newLookupValue !== null ) 
							self.model.setValue( newLookupValue );
						else {
							// Replace the old value in the list with the new value.
							var lookup = self.model.CreateUnvalidatedValue( newLookupText );
							self.model.setValue( lookup );
						}

						// Reset the flag.
						self.ssluSelectionInProgress = false;

						// If requested, set control to view mode after selection. 
						if( self.options.setviewmodeafterselection ) {

							setTimeout( function() {

								// Set control to view mode. 
								// If selection was done by enter key or by clicking the item on the list, set focus to parent element.
								// If selection was done by tab, we don't move focus, because it was already moved to next or
								// previous control by Tab-key.
								self.setToNormalMode( true, setFocusToParent );
								self.element.closest( "tr" ).removeClass( "mf-accept-viewmode" );

							}, 0 );
						}
						else if( self.options.isclassselector ) {

							// Set focus back to class selector when class has changed. 
							self.captureFocus();
						}

					}  // end if

				}  // end function

			} );

			// Set model
			divTag.mflookupcontrol( "setModel", self.model );

			// Create selection list handler.
			divTag.mflookupcontrol( "createSelectionListHandler" );

			// Set value.
			if( lookupValue != null )
				divTag.mflookupcontrol( "setValue", lookupValue );
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

		// updateLookupIndexes.
		updateLookupIndexes: function() {

			// Loop through all embedded lookup controls and update their lookup indexes (running numbers in the list).
			var lookupContainer = this._getLookupContainer();
			var lookupControls = lookupContainer.find( ".mf-internal-lookup" );
			lookupControls.each( 

				function( index ) {
					$( this ).mflookupcontrol( "updateLookupIndex", index );
				}

			); // End of each-loop.			

		},

		// viewScrolled.
		viewScrolled: function() {

			// Close drop-down list if it is open.
			if( this.controlWithList )
				this.controlWithList.closeList();
		},

		// viewResized.
		viewResized: function() {

			// Close drop-down list if it is open.
			if( this.controlWithList )
				this.controlWithList.closeList();

			// Relocate toolbar only in edit mode.
			if( this.options.editmode )
				this._relocateToolbar( false );
		},

		// getId.
		getId: function() {

			// Returns distinguished id of this control.
			return ( this.model ) ? this.model.Id : null;
		},

		showToolbar: function() {

			if( this.toolbarVisible )
				$( ".mf-toolbar" ).show();
		},

		hideToolbarTemporarily: function() {

			if( this.toolbarVisible )
				$( ".mf-toolbar" ).hide();
		},

		// _showToolbar.
		_showToolbar: function() {

			// Do not show toolbar in special cases.
			if( this.options.isclassselector || this.options.ispropertyselector || this.options.issingleclick )
				return;

			var self = this;
			var popupContainer = $( ".mf-toolbar" );

			// Add new, empty lookup field.
			var addLookup = popupContainer.find( ".mf-toolbar-add-lookup" );
			addLookup.find( "img" ).attr( "title", this.options.localization.strings.IDS_METADATACARD_TOOLBAR_TOOLTIP_ADDFIELD );
			addLookup.click( function( event ) {
			
				// Add empty lookup control.
				self._addEmptyLookupControl( null );

				// Prevent default action.
				event.preventDefault();
				event.stopImmediatePropagation();
			} );

			addLookup.toggleClass( "ui-state-enabled", this.multiSelect );

			// Remove lookup field.
			var removeLookup = popupContainer.find( ".mf-toolbar-remove-lookup" );
			removeLookup.find( "img" ).attr( "title", this.options.localization.strings.IDS_METADATACARD_TOOLBAR_TOOLTIP_REMOVEFIELD );
			removeLookup.click( function( event ) {

				// Remove focused lookup control.
				if( self.focusedControl && !self.focusedControl.isDisabled ) {

					// Inform metadata card that an user is going to remove an item from the lookup control.
					if( self.metadatacard )
						self.metadatacard.beforeItemRemovedByUser();

					// Remove actual control.
					self.focusedControl._removeControl( true );
				}

				// Prevent default action.
				event.preventDefault();
				event.stopImmediatePropagation();
			} );

			removeLookup.toggleClass( "ui-state-enabled", this.multiSelect );


			// Refresh the list.
			var refresh = popupContainer.find( ".mf-toolbar-refresh" );
			refresh.find( "img" ).attr( "title", this.options.localization.strings.IDS_METADATACARD_TOOLBAR_TOOLTIP_REFRESH );
			refresh.click( function( event ) {

				// Ensure that we have focused control.
				if( self.focusedControl ) {

					self.focusedControl.refreshList( self.model );

				}  // end if	

				// Prevent default action.
				event.preventDefault();
				event.stopImmediatePropagation();
			} );

			refresh.toggleClass( "ui-state-enabled", this.model && this.model.IsExternal() );


			// Add a new value to the value list.
			var addValue = popupContainer.find( ".mf-toolbar-add-value" );
			addValue.find( "img" ).attr( "title", this.options.localization.strings.IDS_METADATACARD_TOOLBAR_TOOLTIP_ADDVALUE );
			addValue.click( function( event ) {

				// Add a new value to the value list.
				self.addNewItem();

				// Prevent default action.
				event.preventDefault();
				event.stopImmediatePropagation();
			} );

			addValue.toggleClass( "ui-state-enabled", this.model && this.model.AllowAdding );


			// Edit the object.
			var edit = popupContainer.find( ".mf-toolbar-edit" );
			edit.find( "img" ).attr( "title", this.options.localization.strings.IDS_METADATACARD_TOOLBAR_TOOLTIP_EDIT );
			edit.click( function( event ) {

				// Ensure that we have a focused control.
				if( self.focusedControl ) {

					self.focusedControl.editItem( null );

				}  // end if

				// Prevent default action.
				event.preventDefault();
				event.stopImmediatePropagation();
			} );

			edit.toggleClass( "ui-state-enabled", this.model && this.model.RealObjectType );

			// If toolbar has items, relocate and show it. Otherwise hide it.
			if( $( ".mf-toolbar" ).children( ".ui-state-enabled" ).length )
				self._relocateToolbar( true );
			else
				$( ".mf-toolbar" ).hide();
		},

		// _hideToolbar.
		_hideToolbar: function() {

			// Do not hide toolbar in special cases.
			if( this.options.isclassselector || this.options.ispropertyselector || this.options.issingleclick )
				return;

			// Unbind click events from toolbar buttons and destroy tooltips.
			$( ".mf-toolbar" ).find( ".mf-toolbar-add-lookup" ).unbind( "click" );
			$( ".mf-toolbar" ).find( ".mf-toolbar-remove-lookup" ).unbind( "click" );
			$( ".mf-toolbar" ).find( ".mf-toolbar-add-value" ).unbind( "click" );
			$( ".mf-toolbar" ).find( ".mf-toolbar-refresh" ).unbind( "click" );
			$( ".mf-toolbar" ).find( ".mf-toolbar-edit" ).unbind( "click" );

			// Hide toolbar.
			$( ".mf-toolbar" ).hide();
			this.toolbarVisible = false;
		},

		// _relocateToolbar.
		_relocateToolbar: function( show ) {

			// Do not relocate toolbar in special cases.
			if( this.options.isclassselector || this.options.ispropertyselector || this.options.issingleclick )
				return;

			var toolbar = $( ".mf-toolbar" );

			// Detect right-to-left layout.
			var rtl = ( $( "html.mf-rtl" ).length > 0 ) ? true : false;

			// Show the toolbar if requested.
			if( show ) {
				var borderAttr = rtl ? "border-left-width" : "border-right-width";
				toolbar.show()
					.children().css( borderAttr, "" )
					.filter( ":visible:last" ).css( borderAttr, "0px" );
				this.toolbarVisible = true;
			}

			// If we have focused control, use it. If not, get the actual element of the latest lookup control.
			var last = null;
			if( this.focusedControl )
				last = this.focusedControl.element;
			else
				last = this._getLookupContainer().find( ".mf-internal-lookup" ).last();

			// Relocate the toolbar below focused or latest lookup control.
			if( last && last.length ) {

				var offsetParent = toolbar.offsetParent();
				var parentOffset = offsetParent.offset();
				var scrollTop = offsetParent.scrollTop();
				var offset = last.offset();
				var toolbarWidth = toolbar.width();
				var lastWidth = last.width();

				// Calculate left positioning depending on the layout type.
				var leftVal = rtl ? offset.left : ( offset.left - parentOffset.left ) + ( lastWidth - toolbarWidth - 4 );

				toolbar.css( {
					"top": offset.top + scrollTop - parentOffset.top - toolbar.outerHeight(),
					"left": leftVal
				} );
				
				// Adjust right margin of the possible description field.
				// TODO: Description fields are used only in vertical layout.
				if( true ) {
				
					// Get main element of the UI control.
					var propertyLine = this.element.closest( ".mf-dynamic-row" ).first();
					if( propertyLine && propertyLine.length > 0 ) {
					
						// Get possible description field.
						var descriptionLine = propertyLine.prev();
						if( descriptionLine.is( ".mf-description-row" ) ) {
						
							// TODO: Ensure that RTL layout is OK.
						
							// Adjust right margin of the description field.
							var width = toolbarWidth + 6 + "px";
							var descriptionField = descriptionLine.find( ".mf-property-description" );
							descriptionField.css( "margin-right", width );
						}
					}
				}
			}
		},

		// _createTooltip.
		_createTooltip: function( element, text ) {

			element.tooltip( {
				items: ".mf-toolbar-button",
				position: {
					my: "left bottom",
					at: "center top"
				},
				content: function() {
					return '<div><p>' + text + '</p></div>';
				}
			} );
		},
		
		// _removeUnvalidatedValues.
		_removeUnvalidatedValues: function() {
		
			var self = this;
			if( this.multiSelect ) {

				// Remove unvalidated values from the MSLU.
			
				// If there are lookup values in the model, continue with it.
				if( this.model && this.model.getValue() && this.model.getValue().Count && this.model.getValue().Count > 0 ) {
					
					// Get lookup values.
					var lookupValues = this.model.getValue();
					var lookupCount = this.model.getValue().Count;
						
					// Go through all items.
					var index = 0;
					while( index < lookupCount ) {
						
						var lookupValue = lookupValues[ index ];
							
						// If this is unvalidated value, remove it.
						if( typeof lookupValue.IsUnvalidated != "undefined" && lookupValue.IsUnvalidated ) {
						
							// Remove unvalidated value.
							self.model.getValue().RemoveAt( index, null );
							lookupCount--;
						}
						else index++;		
					}
				}
			}
			else if( this.model && this.model.getValue() && this.model.getValue().IsUnvalidated != "undefined" && this.model.getValue().IsUnvalidated ) {
			
				// Remove unvalidated value from the SSLU.
				this.model.setValue( null );
			}	
		},
		
		// _addEmptyLookupControl.
		_addEmptyLookupControl: function( callback ) {
		
			// Add a new lookup control.
			var lookupInfo = this._addNewLookupControl();
				
			// Create actual UI control with unvalidated value.
			var key = 0;
			lookupContainer = this._getLookupContainer();
			this._createLookupControl( lookupContainer, lookupInfo.index, lookupInfo.lookup );
			
			// Relocate the toolbar.
			this._relocateToolbar( false );

			// Update lookup indexes.
			this.updateLookupIndexes();
			
			// Set control to edit mode.
			var lookupControl = lookupContainer.find( ".mf-internal-lookup" ).eq( lookupInfo.index );
			lookupControl.mflookupcontrol( "setToEditMode", true, function() {
						
				// Notify the completion.
				if( callback )
					callback();
			} );
	
		},

		/**
		 * Appends the given suggestion value to the control.
		 *
		 * @param { Object } suggestion - The value suggestion to be added to the control.
		 * @return {boolean} - true - set true/false when the valueis appended or not.
		*/
		appendValue: function( suggestion ) {

			// Set the edit mode if needed.
			if( !this.inEditMode() ) {

				// Get the containers.
				var lookupContainer = this._getLookupContainer();
				var lookupControls = lookupContainer.find( ".mf-internal-lookup" );

				// Request the edit mode to the last control.
				var options = lookupControls.length - 1;
				this.metadatacard.editManager.requestEditMode( this, options );
				callback();
			} else {

				// No need to go to edit mode. Call the callback straight way.
				callback();
			}

			// Callback function after we are in edit mode.
			var self = this;
			function callback() {

				// Run asynchronously. Otherwise the focused control may not be set yet.
				setTimeout( function() {

					// Add the value to the control if we still have the focus. We might not have a focus,
					// in which case continuing would cause an error message.
					var control = self.focusedControl;
					if( !control ) {

						// Get the last control from the container. This makes sure that
						// the value clicked shall be added to the control correctly.
						var lookupContainer = self._getLookupContainer();
						var newFocusedControl = lookupContainer.find( ".mf-internal-lookup" ).last();
						control = newFocusedControl.data( "mfilesMflookupcontrol" );
					}

					// If the focused control is multi-select and it already has a value,
					// we need to create a new lookup for the new value.
					// For single-select, we keep the focus on the same control for overwriting.
					if( self.multiSelect && !control.isEmpty() ) {

						// Add a new lookup control.
						var lookupInfo = self._addNewLookupControl();

						// Create actual UI control with unvalidated value.
						var lookupContainer = self._getLookupContainer();
						self._createLookupControl( lookupContainer, lookupInfo.index, lookupInfo.lookup );

						// Relocate the toolbar.
						self._relocateToolbar( false );

						// Update lookup indexes.
						self.updateLookupIndexes();

						// Set the lookup control.
						var lookupControl = lookupContainer.find( ".mf-internal-lookup" ).eq( lookupInfo.index );
						control = lookupControl.data( "mfilesMflookupcontrol" );
						self.setFocusedControl( control );
					}

					// Focus on the control.
					control.captureFocus();

					// Add the value to the control. Branch the logic based on whether we need
					// to create a new value or not.
					var existingValue = !suggestion.IsNewValue;
					if( existingValue ) {

						// Set the value by using the item id.
						self.model.setSuggestionById( suggestion.Value.Item, function( foundItem ) {

							if( foundItem && foundItem.Value ) {

								// Select the item.
								var item = {
									value: foundItem.Value.Name,
									object: foundItem,
									selectable: foundItem.selectable
								};
								control.selectItem( item, true, false );
							}
						} );

					} else {

						// Add the value to the control. This will not actually create it yet.
						// Use the existing (unvalidated) lookup value.
						// If not, an additional item would be added unnecessarily.
						control.updateControl( suggestion.Name, control.lookupValue );

						// Prompt the user for item adding if allowed.
						// This may or may not result in actually adding the item, but in either case
						// the control gets updated to show the correct information:
						// the new value or empty.
						control.addNewItem( self.model, false, false );

					}  // end if

				}, 0 );
			}

			// The value could be added.
			return true;
		}

	} );  // end of multiselectlookupcontrol widget.

} )( jQuery );
