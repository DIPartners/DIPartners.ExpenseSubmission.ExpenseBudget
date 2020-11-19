( function( $, undefined ) {

	// mfiles.lookupcontrol.
	$.widget( "mfiles.mflookupcontrol", {

		// options.
		options: {
			isdeletable: true,
			editmode: false,
			readonly: false,
			multiselect: false,
			isclassselector: false,
			ispropertyselector: false,
			openwithoutmodifierkey: true,	// If true, menu opens by arrow keys, otherwise with Ctrl or Alt + arrow keys.
			arrowkeyhandler: null,
			requesteditmode: null,
			removevalue: null,
			removeproperty: null,
			itemselected: null,
			localization: null,
			metadatacard: null,
			lookupcontrolcontainer: null,
			isCtrlPressed: false,		// Bool value which implies ctrl button is pressed or not.			
		},

		// _create.
		_create: function() {

			var self = this;
			var element = this.element;
			 
			// Maximum number of characters.
			this.maxLength = 100;

			this.lookupIndex = 0;
			this.searching = false;

			this.listIsOpen = false;
			this.updateInfo();
			if( this.options.lookupcontrolcontainer )
				this.options.lookupcontrolcontainer.controlWithList = null;

			this.openClicked = false;
			this.model = null;
			this.selectionListHandler = null;

			this.lookupText = null;
			this.lookupValue = null;
			this.isDisabled = false;

			this.focusChangeAllowed = false;

			// Used to prevent unwanted opening of dropdown list in case of certain key presses.
			this.preventOpening = null;

			// Append container for controls.
			var upperContainer = $( '<div class="mf-lookup-item-container"></div>' );
			var container = $( '<div class="mf-lookup-item-row"></div>' );

			element.append( upperContainer );
			upperContainer.append( container );

			element.data( "container", container );
			element.data( "upperContainer", upperContainer );

			// Create lookup control.
			this._createControl( container );

			// Get current class.
			var classId = null;
		/*	var classSelector = self.options.metadatacard.controller.getClassSelector();
			if( classSelector.value && typeof classSelector.value.item !== 'undefined' ) {
				classId = classSelector.value.item;
			}
			// Constants for assignment states and classes.
			this.ASSIGNEE_STATE_ASSIGNED = 0;
			this.ASSIGNEE_STATE_COMPLETED_OR_APPROVED = 1;
			this.ASSIGNEE_STATE_REJECTED = 2;
			this.COMPLETED_OR_APPROVED_ITEM_ID = 1;
			this.REJECTED_ITEM_ID = 2;

			// By default the action items do not exist.
			this.isCompletedItemFound = false;
			this.isRejectedItemFound = false;
*/
		},

		// Use the _setOption method to respond to changes to options.
		_setOption: function( key, value ) {

			switch( key ) {

				// Handle changes to readonly-option.                                                                                                                                                                                                                                                                                                                                                  
				case "readonly":

					// Set value of readonly-option.
					this.options.readonly = value;
					break;
			}
			// In jQuery UI 1.9 and above, use the _super method to call base widget.
			this._super( "_setOption", key, value );
		},

		// Clean up any modifications your widget has made to the DOM.
		destroy: function() {

			var element = this.element;

			// If we have selection list handler, unregister selection list events now.
			if( this.selectionListHandler ) {
				this.selectionListHandler.unregisterEvents();
			}

			// Unbind events. TODO: Use own namespace here.
			element.unbind( "click" );

			// Remove Container and its childs. Unbinds also all events.
			// TODO: upperContainer
			//element.data( 'container' ).remove();
			element.data( "upperContainer" ).remove();
		},

		// _createControl.
		_createControl: function( container ) {

			var self = this;
			var element = this.element;

			// Detect right-to-left layout.
			var rtl = ( $( "html.mf-rtl" ).length > 0 ) ? true : false;

			container.find( ".mf-lookup-item-cell-content" ).remove();
			container.find( ".mf-lookup-item-cell-image" ).remove();

			if( !this.options.editmode ) {
				var textFieldControl = $( '<div class="mf-lookup-item-cell-content"><span class="mf-internal-text"></span></div>');
				container.append( textFieldControl );

				// Set assignee state and link.
				this.setAssigneeState( this.lookupValue );
				this.setLink( this.lookupValue );

				// Update the identifier class.
				this.updateIdentifier();

				return;
			}

			// Edit mode.
			var textFieldControl = $( '<input class="mf-internal-text" type="text"></input>' );

			// Notify metadata card and lookup control container about focused control.
			textFieldControl.focus( function() {

				// Ensure sure that ".mf-metadatacard" & .metadatacard is found.
				if( $( ".mf-metadatacard" ) && $( ".mf-metadatacard" ).metadatacard )
					$( ".mf-metadatacard" ).metadatacard( "setFocusedElement", textFieldControl );
				self.options.lookupcontrolcontainer.setFocusedControl( self );
			} );

			// Append input field to container element.
			var controlContainer = $( '<div class="mf-lookup-item-cell-content"></div>' );
			container.append( controlContainer );
			controlContainer.append( textFieldControl );

			// Artificial Click for input control in firefox and edge browser.
			// Because click event will not be triggered in firefox and edge browser. 
			// This artificial click needed for for editing feature. When (varies) value displayed in text control,
			// on first click to start edit, the control made disabled and its kind of a warning to the user
			// to indicate that he is trying to edit a (varies) value.
			/*if( ( utilities.isFireFoxBrowser() || utilities.isEdgeBrowser() ) && self.model &&
				utilities.isMultiValue( self.lookupValue ) && this.options.editmode ) {

				utilities.bindClickOnDisabledInputControl( controlContainer );
			}*/
			
			// Restrict the maximum number of characters user can enter by keyboard.
			textFieldControl.keypress( function() {

				var length = $( this ).val().length;
				return ( length < self.maxLength );
			} );

			// Restrict the maximum number of characters user can enter by pasting.			
			textFieldControl.bind( 'paste', function( e ) {

				// MFDesktop use window.clipboardData & for Web bowser we need to use event.originalEvent.clipboardData
				var clipboardData = window.clipboardData ? window.clipboardData : e.originalEvent.clipboardData;

				var length = $( this ).val().length;
				var clipboardLength = clipboardData.getData( 'Text' ).length;
				return ( ( length + clipboardLength ) <= self.maxLength );
			} );

			// If control has ambiguous values, set handler to change it to actual edit mode.
			/*if( utilities.isMultiValue( self.lookupValue ) ) {

				// Set click handler to change disabled control to actual edit mode.
				controlContainer.click( function( event ) {

					// Unbind this event.
					controlContainer.unbind( "click" );

					// Enable control.
					textFieldControl.prop( "disabled", false );
					self.isDisabled = false;

					// Get current value.
					var value = self.controlValue();

					// Update control with the empty value.
					self.updateControl( "", null );

					// Remove current value from the model.
					self.options.removevalue( value, null, false, false );

					// Set focus to enabled control.
					textFieldControl.focus();
					
					// In case of single-click-control, open the menu.
					if( self.options.issingleclick )
						self.openList();
				} );
			}*/

			// Create button to open dropdown list.
			var openButton = $( '<span class="mf-internal-openlink"></span>' );
			var openButtonList = $( '<li class="ui-state-default ui-corner-all"><span class="ui-icon ui-icon-triangle-1-s"></span></li>' );
			openButton.append( $( '<ul id="icons" class="ui-widget ui-helper-clearfix"></ul>' ).append( openButtonList ) );

			// When user clicks button to open dropdown list, the list will be opened if it closed
			// and closed if it was open. Note that click-handler can not be used, because it is called with mouseup-event and in this phase
			// list is already closed automatically.
			openButton.mousedown( function( evt ) {

				// Prevent the default click event whcih breaks the UI in latest browser.
				//if( utilities.isChromeBrowser() ) evt.preventDefault();

				// If control is disabled, enable it here.
				if( self.isDisabled ) {
				
					// Enable control.
					textFieldControl.prop( "disabled", false );
					self.isDisabled = false;
					
					// Get current value.
					var value = self.controlValue();

					// Update control with the empty value.
					self.updateControl( "", null );

					// Remove current value from the model.
					self.options.removevalue( value, null, false, false );

					// Set focus to enabled control.
					textFieldControl.focus();
				}
				
				// Open or close the list.
				if( !self.listIsOpen ) {
					self.openClicked = true;
					setTimeout( function() {
						try {
							textFieldControl.autocomplete( "search", "" );
						} catch( e ) { }
					}, 0 );
				}
				else {
					setTimeout( function() {
						try {
							textFieldControl.autocomplete( "close" );
						} catch( e ) { }
					}, 0 );
					}
				
			} );
			var openButtonContainer = $( '<div class="mf-lookup-item-cell-image"></div>' );
			container.append( openButtonContainer );
			openButtonContainer.append( openButton );

			// If case of single-click lookup, hide the button. 
			if( self.options.issingleclick )
				openButton.hide();

			// Set assignee state and link.
			this.setAssigneeState( this.lookupValue );
			this.setLink( this.lookupValue );

			// Update the identifier class.
			this.updateIdentifier();

			// Register events from autocomplete control. They are used to update state whether list is open or not. 
			textFieldControl.bind( "autocompleteopen", function( event, ui ) {

				self.listIsOpen = true;
				self.updateInfo();
				if( self.options.lookupcontrolcontainer )
					self.options.lookupcontrolcontainer.controlWithList = self;

				self.element.find( "input" ).focus();
			} );
			textFieldControl.bind( "autocompleteclose", function( event, ui ) {

				self.listIsOpen = false;
				self.updateInfo();
				if( self.options.lookupcontrolcontainer )
					self.options.lookupcontrolcontainer.controlWithList = null;
			} );

			// Register keydown event.
			// Todo : self.options.isCtrlPressed
			textFieldControl.keydown( function( event ) {

				self.openClicked = false;
				var isShiftPressed = false
				if( event.keyCode == 16 ) {
					isShiftPressed = true;

					// Maintain the Checkbox as enabled state while shift selection.
					self.model.isMultiSelectEnable = true;
				}
				var isCtrlPressed = event.ctrlKey;
				var autocomplete = $( this ).data( "uiAutocomplete" );

				var menu = autocomplete.menu;
				var item = menu.element.find( "li > a" );

				// Execute when ctrl button is pressed.
				if( isCtrlPressed ) {

					// Toggle between enable/ disable when ctrl button pressed.
					self.model.isMultiSelectEnable = ! self.model.isMultiSelectEnable;
				}

				// Execute when multiselect mode is enable.
				if( self.model.isMultiSelectEnable ) {

					// Fetch all checkbox item in the lookup property.
					var menuItem = item.find( ".checkbox" ),
						isExistingObject,
						itemId,
						lookup = self.options.getLookupValue();

					// Iterate all menu items and perform toogle operations based on 
					// the mutiselect is enable or not.
					for( var i = 0; i < menuItem.length; i++ ) {

						// Get the id of the item.
						itemId = $( menuItem[ i ] ).closest( "li" ).data( "ui-autocomplete-item" ).object.Value.Id;

						// Execute when item is in disable and not present in the model.
						if( $( menuItem[ i ] ).closest( "li" ).hasClass( "disable-item" ) ||
							self.model.value.FindByLookupItem( itemId ) !== -1 ) {

							// Enable the item by adding ui-state-focus class.
							$( menuItem[ i ] ).closest( "li" ).removeClass( "disable-item" );
							$( menuItem[ i ] ).closest( "li" ).addClass( "ui-state-focus" );

							// Check the checkbox of the current item.
							$( menuItem[ i ] ).prop( "checked", true );
						}
					}
		
					// Add replace class when lookup is not empty and
					// It is present in the model.
					if( lookup && ( self.model.filteredResult ||
						( lookup.name !== "" && self.model.value.FindByLookupItem( lookup.Item ) !== -1 ) ) )
						$( event.target ).addClass( "multiselectReplace" );

					// Show checkbox if ctrl key.
					menuItem.show();

					// When enter key is pressed then stop event.
					if( event.keyCode === $.ui.keyCode.ENTER ) {

						// Prevent default action.
						event.preventDefault();

						// Stop event propagation.
						event.stopImmediatePropagation();
						return;
					}
				}
				else {
					var autocomplete = $( this ).data( "uiAutocomplete" ),
						menu = autocomplete.menu,
						item = menu.element.find( "li > a" );

					// Loop through all item present in the dropdown list.
					for( var i = 0; i < item.length; i++ ) {

						// Excute when item is in enable.
						if( $( item[ i ] ).closest( "li" ).hasClass( "ui-state-focus" ) ) {

							// Disable the item by adding disable-item class.
							$( item[ i ] ).closest( "li" ).removeClass( "ui-state-focus" );
							$( item[ i ] ).closest( "li" ).addClass( "disable-item" );
						}
					}

					// Hide all checkbox when turn into normal mode.
					item.find( ".checkbox" ).hide();
				}
				var checkboxDisplay = $( menu.element ).find( "li a" ).find( ".checkbox" ).css( "display" );

				// Handle space key event.
				if( checkboxDisplay && checkboxDisplay !== "none" && event.keyCode === $.ui.keyCode.SPACE ) {

					// Execute when active menu is present.
					if( menu.active ) {

						// Fetching lookup value of selected item.
						var newLookup = $( menu.active ).closest( ".ui-menu-item" ).data( "ui-autocomplete-item" ).object.Value;

						// Excute when item is in focus.
						if( !( $( menu.active ).closest( ".ui-menu-item" ).hasClass( "ui-state-focus" ) ) ) {

							setTimeout( function () {

								// Set the affecteditem value.
								self.model.lastAffectedItem = newLookup.item;

								// Insert the selected item in the model.
								self.options.insertItem( newLookup );
								
								// Check the checkbox and add the focus to current selected item.
								$( menu.active ).closest( ".ui-menu-item" ).find( ".checkbox" ).prop( "checked", true );
								$( menu.active ).closest( ".ui-menu-item" ).addClass( "ui-state-focus" );

							}, 10 );
						}
						else {

							// Set the affected item value.
							self.model.lastAffectedItem = newLookup.item;

							// Remove the selected item from the model.
							self.options.removeItem( newLookup );

							// Uncheck and remove the focus for unselect item.
							$( menu.active ).closest( ".ui-menu-item" ).find( ".checkbox" ).prop( "checked", false );
							$( menu.active ).closest( ".ui-menu-item" ).removeClass( "ui-state-focus" );
						}
							
						// Empty the current lookup if mutiselect enable.
						if( self.model.isMultiSelectEnable && !( $( event.target ).hasClass( "multiselectReplace" ) ) ) {

							// Clear the current lookup control.
							$( event.target ).val( "" );
						}

						// Prevent default action.
						event.preventDefault();

						// Stop event propagation.
						event.stopImmediatePropagation();
						return;
					}
				}

				// Prevent Ctrl or Alt from opening list in lookup controls.
				// with the following keys:
				// 68=D, 73=I, 78=N, 37-40 =Left, Right, 187=+(plus)
				if( $.inArray( event.which, [68, 73, 78, 37, 39, 187] ) !== -1 && ( event.ctrlKey || event.altKey ) ) {

					// Prevent default action.
					event.preventDefault();

					// Stop event propagation.
					event.stopImmediatePropagation();
					return;
				}
				
				// Tab pressed in autocomplete control. Focus will be moved to next control.
				// If searching was in progress or was not started yet, complete it as background operation in the model when we will move to view mode.
				if( event.which === $.ui.keyCode.TAB ) {
		
					// Handle background searching.
					var result = self.handleBackgroundSearch( self, textFieldControl );
					if( result.cancel ) {
					
						// Prevent default action.
						event.preventDefault();

						// Stop event propagation.
						event.stopImmediatePropagation();
						return;
					}
				} 

				// Enter pressed in autocomplete control.
				if( event.which === $.ui.keyCode.ENTER ) {

					self.focusChangeAllowed = true;

					// If list was open when Enter was pressed, prevent the move to view-mode.
					if( self.listIsOpen ) {

						// Close the list.
						setTimeout( function() {
							try {
								textFieldControl.autocomplete( "close" );
							} catch( e ) { }
						}, 0 );

						// Set focus back to input field and select it.
						setTimeout( function() {
							textFieldControl.focus();
							textFieldControl.select();
						}, 0 );

						// Prevent the event from bubbling up the DOM tree,
						// preventing any parent handlers from being notified of the event.
						event.stopPropagation();
					}
				}
				else
					self.focusChangeAllowed = false;

				// Prevent prohibited keys from opening list. In practice the list in "raw" jQuery autocomplete control
				// can be opened by almost all keys. 	
				if( self._prohibitedKeyToOpenList( event ) ||

					// Prevent also arrow up/down keys from moving focus or opening dropdown list INTERNALLY VIA AUTOCOMPLETE CONTROL.
					// In case of arrow up or down, the required operation (opening or closing the list explicitly)
					// is done here outside autocomplete control (and before default action is prevented).
					( ( event.which === $.ui.keyCode.UP || event.which === $.ui.keyCode.DOWN ) ) ) {

					// If dropdown list of lookup control is closed it will be opened by
					// pressing arrow down or arrow up.
					if( ( event.which === $.ui.keyCode.UP || event.which === $.ui.keyCode.DOWN ) ) {

						// Handle event if control is not disabled.
						if( !self.isDisabled ) {

							// List is open.
							if( self.listIsOpen ) {

								// If user pressed arrow keys with Ctrl or Alt when list was open, close it.
								if( event.ctrlKey || event.altKey ) {

									// Close the list.
									setTimeout( function() {
										try {
											textFieldControl.autocomplete( "close" );
										} catch( e ) { }
									}, 0 );
								}
								else {

									// Otherwise return here and forward event for autocomplete control which handles it.
									// This is case for example when list is open and user writes text to autosuggest field or moves
									// highlight in the list by arrow keys.

									// Note: If list has ONLY non-selectable items, we can't forward key-events (arrow up or down)
									// to autocomplete control. Otherwise event handling fails, because there is nothing to focus/select.
									var autocomplete = $( this ).data( "uiAutocomplete" );
									if( autocomplete ) {
										var menu = autocomplete.menu;
										var item = menu.element.find( "li > a" );
										if( item.length > 0 )
											return;
									}
									else {

										// Autocomplete not available.
									}
								}

							} else {

								// List is closed, open it by arrow keys.
								// Note that if requested, list opens only with Ctrl or Alt key.
								if( self.options.openwithoutmodifierkey || event.ctrlKey || event.altKey ) {

									self.openClicked = true;
									setTimeout( function() {
										try {
											textFieldControl.autocomplete( "search", "" );
										} catch( e ) { }
									}, 0 );

								}
								else {
									// Special handling for "eaten" arrow keys.
									if( self.options.arrowkeyhandler )
										self.options.arrowkeyhandler( event );
								}
							}
						}
					}

					// Prevent default action.
					event.preventDefault();

					// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
					event.stopImmediatePropagation();
				}

				// If case of some key presses which are needed to navigate cursor,
				// don't allow unwanted opening of the dropdown list.
				// For some reason, autocomplete control tries to open the list internally by these key presses
				// at the first time (and only if there is already a value in the text field).
				// Keys are: End, Home, Arrow to the left, Arrow to the right.
				var key = event.which;
				if( key === 35 || key === 36 || key === 37 || key === 39 )
					self.preventOpening = true;

			} );

			// Register keyup event.
			textFieldControl.keyup( function( event ) {

				var menu, item, data;

				// Ctrl + I or Alt + I creates a new row to multiselect-lookup.
				if( self.options.multiselect && event.which === 73 && ( event.ctrlKey || event.altKey ) ) {

					// Prevent default action.
					event.preventDefault();

					// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
					event.stopImmediatePropagation();

					// Add new lookup to multi-selection lookup control.
					setTimeout( function() {
						if( !self.addLookupThrottle || ( new Date ).getTime() - self.addLookupThrottle > 500 ) {
							self.options.insert();
							self.addLookupThrottle = ( new Date ).getTime();
						}
					}, 0 );
				}

				// Ctrl + D or Alt + D deletes the current row from multiselect-lookup.
				if( event.which === 68 && ( event.ctrlKey || event.altKey ) ) {

					// Branch by lookup type, MSLU/SSLU.
					if( self.options.multiselect ) {

						// Prevent default action.
						event.preventDefault();

						// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
						event.stopImmediatePropagation();

						// Delete row.
						setTimeout( function() {

							// Delete row and move keyboard focus from deleted control to next control.
							self._removeControl( true );
						}, 0 );
					}
					else {

						if( !self.model.MustExist ) {

							// In case of SSLU, remove whole control.
							self.options.removeproperty();

						}
					}
				}

				// Ctrl + N or Alt + N tries to add a new value to the value list.
				if( event.which === 78 && ( event.ctrlKey || event.altKey ) ) {

					// Prevent default action.
					event.preventDefault();

					// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
					event.stopImmediatePropagation();

					// Try to add a new value to the value list.
					setTimeout( function() {
						if( !self.inProgress ) {

							self.inProgress = true;

							if( self.options.lookupcontrolcontainer )
								self.options.lookupcontrolcontainer.addNewItem();

							self.inProgress = false;
						}
					}, 0 );

				}

				if( ( event.ctrlKey || event.altKey ) && $.inArray( event.which, [37, 39] ) !== -1 && self.model.Hierarchical ) {

					// Prevent default action.
					event.preventDefault();

					// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
					event.stopImmediatePropagation();

					var autocomplete = $( this ).data( "uiAutocomplete" );
					if( autocomplete ) {

						menu = autocomplete.menu.element;
						item = menu.find( ".ui-state-focus" ).closest( "li" );
						if( item.length ) {
							self.toggleItemCollapse( item, event.which < 39 );
						}
					}
					else {

						// Autocomplete not available.
					}
				}

				// Ctrl + '+' or Alt + '+' creates a new sub item for the currently selected value
				if( self.options.multiselect && self.model.Hierarchical && event.which === 187 && ( event.ctrlKey || event.altKey ) ) {

					// Prevent default action.
					event.preventDefault();

					// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
					event.stopImmediatePropagation();

					// find parent item
					var autocomplete = $( this ).data( "uiAutocomplete" );
					if( autocomplete ) {
						menu = autocomplete.menu.element;
						item = menu.find( ".ui-state-focus" ).closest( "li" );
						data = item.data( "ui-autocomplete-item" );
						if( data && data.object ) {

							// Add new sub item.
							self.addNewSubItem( data.object.value );
						}
					}
					else {

						// Autocomplete not available.
					}
				}

				// In case of property selector, Enter moves control to view mode.
				if( self.options.ispropertyselector && event.which === $.ui.keyCode.ENTER &&
						self.options.requesteditmode )
					self.options.requesteditmode( null );
			} );

			// Attach autocomplete.  
			textFieldControl.autocomplete( {

				// Use extended selection logic.
				// NOTE: This is custom implementation in autocomplete control.
				extselection: true,

				// TEST: Set this to 1000 (= 1s) for testing.
				delay: 0,
				minLength: 0,
				autoFocus: false, // Can not be set to true. Fails probably because _renderItem may add <li>-elements without <a>-elements.
				position: {
					my: ( rtl ? "right top" : "left top" ),
					at: ( rtl ? "right bottom" : "left bottom" ),
					collision: "flip",
					// within: ".mf-metadatacard"
					
				},

				// Define callback to format results.
				source: function( request, response ) {

					// always include an empty item to select for workflow & state
					var addEmptyItem = false;
					if( self.model.PropertyDef == 38 || self.model.PropertyDef == 39 )
						addEmptyItem = true;

					// If user clicked a button to open list or this is single-click control, all items are searched.
					if( self.openClicked || self.options.issingleclick ) {
						self.model.filteredResult = false;
						self.updateInfo( true );
						self.selectionListHandler.requestSearch( "", response, addEmptyItem, self.openClicked );
					}
					// If search text is not empty, start searching. Otherwise don't show the list at all.
					else if( request.term.length > 0 ) {
						self.updateInfo( true );


						// TEST: Set this to 1000 (= 1s) for testing.						
						//setTimeout( function() {

							self.model.filteredResult = true;
							self.selectionListHandler.requestSearch( request.term, response, addEmptyItem, self.openClicked );
							self.expandedItemCache = {}
						//}, 1000 );

					} else {
						self.updateInfo();
						response( [] );
					}

				},

				// Mutiselect event which will insert the item.
				multiSelect: function ( event, ui ) {

					self.model.initialIndex = ui.item.initialIndex;
					self.model.currentindex = ui.item.currentindex;
					// To initialize current and initial index in the respective controls.
					if( event.shiftKey ) {
						
						var bigIndex = self.model.initialIndex, smallIndex = self.model.currentindex;
						if( self.model.currentindex > self.model.initialIndex ) {
							bigIndex = self.model.currentindex;
							smallIndex = self.model.initialIndex;
						}

						// Loop through all index position and remove the control from selection.
						for( var i = smallIndex; i <= bigIndex; i++ )
							self.options.checkboxCheck( i );
					}
					// Get lookupValue from selected item.
					var newLookupValue = ui.item.object.Value;
					var autocomplete = $( this ).data( "uiAutocomplete" );

					// Set the lastAffected item id.
					self.model.lastAffectedItem = newLookupValue.item;
					var duplicate = false;
					var unValidatedValue = false;
					var unValidatedValuePosition ;

					// To retrict duplicate value in the lookup
					for( var i = 0; i < self.model.value.length; i++ ) {
						if( self.model.value[ i ] && self.model.value[ i ].IsUnvalidated )
						{
							if( self.model.value[i].name != "" ) {
								unValidatedValue = true;
								unValidatedValuePosition = i;
							}
							duplicate = true;
						}
					}

					// If the unvalidated lookup model has value no need to do anything if the selected item
					// and previous item have same value else will insert item.
					if( unValidatedValue ) {
						if( newLookupValue.Name == self.model.value[ unValidatedValuePosition ].name ) {

						}
						else
							self.options.insertItem( newLookupValue );
					}

					// If the unvalidated lookup model dont have any value replace the existing value with selected value.
					else if( duplicate )					
						self.select( event, ui, self )

					// Insert new control and add the value.
					else
						self.options.insertItem( newLookupValue );
				},

				// Mutiunselect event which will remove the item.
				multiUnselect: function( event, ui ) {

					// To initialize current and initial index in the respective controls.
					if( event.shiftKey ) {
						self.model.initialIndex = self.model.currentindex
						self.model.currentindex = ui.item.currentindex;
						var bigIndex = self.model.initialIndex, smallIndex = self.model.currentindex;
						if( self.model.currentindex > self.model.initialIndex ) {
							bigIndex = self.model.currentindex;
							smallIndex = self.model.initialIndex;
						}

						// Loop through all index position and remove the control from selection.
						for( var i = smallIndex; i <= bigIndex; i++ )
							self.options.checkboxUnchecked( i );
					}

					// Get lookupValue from selected item and get the item from model.
					var lookupValue = ui.item.object.Value;

					// Set the lastAffected item id.
					self.model.lastAffectedItem = lookupValue.item;

					// Remove the unselected lookup v alue in the list.
					self.options.removeItem( lookupValue );
				},

				select: function( event, ui ) {
					/// <summary>
					///     Triggered when an item is selected from the menu.
					///     Canceling this event prevents the value from being updated, but does not prevent the menu from closing.
					/// </summary>
					/// <param name="event" type="jQuery.Event">
					///     The jQuery event object.
					/// </param>
					/// <param name="ui" type="object">
					///     The the object that is represents the  with the autocontrol item. Members:
					///      - item: The jQuery item selected from the menu, if any. Otherwise the property is null.
					/// </param>

					self.select( event, ui, self );

				},

				change: function( event, ui ) {
					/// <summary>
					///     Triggered by jQuery when the field is blurred, if the value has changed.
					/// </summary>
					/// <param name="event" type="jQuery.Event">
					///     The jQuery event object.
					/// </param>
					/// <param name="ui" type="object">
					///     The the object that is represents the  with the autocontrol item. Members:
					///      - item: The jQuery item selected from the menu, if any. Otherwise the property is null.
					/// </param>

					// Branch depending on the type of the change event.
					if( ui.item !== null && ui.item.object !== null ) {

						// The change event specifies an item from the list.

						//alert( "changed to item: " + ui.item.label );


						// Ensure that the item gets selected. If we don't call selectItem here,
						// exiting edit mode will treat the item as a new item in some cases because
						// the select event somehow arrives late.
						// Do not overwrite any text in the control except to append to it,
						// ui.item may originate from an outdated search. See issue #20397.
						var control_txt = self.controlText();
						if( ui.item.value.indexOf( control_txt ) == 0 )
							self.selectItem( ui.item, false, false );  // No need to update control text.

					} else {

						// The change event specifies free text only.
						// It is nevertheless possible that the text matches an item in the list.

						// Check if the free text actually changes.
						var oldValue = self.lookupText;
						var newValue = $( this ).val();
						if( oldValue != newValue ) {
							// Check if the typed value matches a value in the selection list.
							var selected = false;
							if( newValue !== "" ) {

								// Check if the current list has a perfectly matching item as its first item.
								// If yes, we make that item the selected item.
								//
								// NOTE: This check looks only in the currently available search results, so the
								//       check is not perfect. For example, the server might have not yet returned
								//       the results. In such a case the control will think that the item does not
								//       exist, until validation during exiting of the edit mode finds the actual item.
								//       Still, this imperfect check here is useful as an optimization because it
								//       helps us avoid the synchronous FindItem call later in 99% of cases.
								for( var i in self.selectionListHandler.selectionList.Items ) {

									// Process this item.
									var thisItem = self.selectionListHandler.selectionList.Items[i];
									if( thisItem.Selectable &&
									    newValue.toLowerCase() == thisItem.Value.Name.toLowerCase() ) {

										// Case-insensitive perfect match was found.
										// Select the item.
										var item = {
											label: thisItem.Value.Name,
											object: thisItem,
											selectable: thisItem.Selectable
										};
										self.selectItem( item, true, false );  // Update control text because casing might be different.
										selected = true;
									}

									// Stop the search after the first selectable item has been processed,
									// regardless if a match was found or not.
									if( thisItem.Selectable )
										break;
								}

							}  // end if ( non-empty string )

							// If we did not select any item, clear the current item selection from the control
							// but leave the new free text. When exiting edit mode, this will trigger the adding
							// of a new item, unless validating the item succeeds before that.
							if( selected === false ) {

								// Clear the item selection but keep the new text.
								var item = {
									label: newValue,
									object: null,
									selectable: true
								};
								self.selectItem( item, false, false );  // No need to update control text.

							}  // end if

						}  // end if ( free-text value changed )

					}  // end if

					//alert( "end change" );
				},

				open: function( event, ui ) {

					// Prevent unwanted opening of dropdown list if requested.
					if( self.preventOpening ) {

						try {
							textFieldControl.autocomplete( "close" );
						} catch( e ) { }

						self.preventOpening = false;
						return false;
					}

					// Get a handle on the list menu. If not available, prevent opening of dropdown list.
					var autocomplete = $( this ).data( "uiAutocomplete" );
					if( !autocomplete ) {
						return false;
					}
					var menu = autocomplete.menu;

					menu.element.toggleClass( "no-icons", !self.showIcons );
					self.showIcons = false;

					// handle hierarchical behavior
					if( self.model.Hierarchical ) {

						self.expandedItemCache = {}; //self.expandedItemCache || {};

						var toToggle = menu.element.find( "li>span>.ui-icon" );

						if( !toToggle.length ) {

							// nothing to toggle despite being hierarchical - we can remove any indenters
							menu.element.find( "li>span.indenter" ).remove();

						} else {

							// update the collapse state / load necessary children
							toToggle.each( function() {
								self.toggleItemCollapse( $( this ).closest( "li" ), undefined, true );
							} );

							// add collapse/expand behavior to toggle button
							menu.element.on( "click", "li>span>.ui-icon", function( event ) {
								menu.mouseHandled = true;
								event.preventDefault();
								event.stopImmediatePropagation();
								self.toggleItemCollapse( $( this ).closest( "li" ) );

								setTimeout( function() {
									menu.mouseHandled = false;
								}, 500 );
							} );

						}

						// add new sub-value button functionality 
						menu.element.on( "click", ".mf-autocomplete-addSubItem", function( event ) {
							menu.mouseHandled = true;
							event.preventDefault();
							event.stopImmediatePropagation();
							self.addNewSubItem( $( this ).closest( "li" ).data( "ui-autocomplete-item" ).object.Value );

							setTimeout( function() {
								menu.mouseHandled = false;
							}, 500 );
						} );

					}

					// ignore disabled item clicks!
					menu.element.on( "click", ".ui-state-disabled", function( event ) {
						menu.mouseHandled = true;
						event.preventDefault();
						event.stopImmediatePropagation();

						setTimeout( function() {
							menu.mouseHandled = false;
						}, 500 );
					} );


					// make sure something is selected in the list
					var path, toSelect;
					if( self.openClicked ) {

						// focus the first item
						toSelect = menu.element.find( "li:first" );

						// If the first item is empty (has string "") and there is second item, focus the second item.
						// except if this is a workflow,state or state transition input
						if( self.model.PropertyDef != 38 && self.model.PropertyDef != 39 && self.model.PropertyDef != 99 ) {
							var firstItem = menu.element.find( "a > span" ).first();
							if( firstItem.text() == "" && menu.element.find( "a > span" ).length > 1 ) {
								toSelect = menu.element.find( "li" ).eq( 1 );
							}
						}

						// if the control has a specific value, try and hilight that
						if( self.lookupValue ) {

							if( self.model.Hierarchical ) {
								self.expandToItem( menu, self.lookupValue );
								toSelect = null;
							} else
								toSelect = menu.element.find( "#_" + self.lookupValue.item );
						}

						// Check the last inserted item 
						// And turn the focus next to the last item
						if( self.model.lastAffectedItem ) {

							// Get the next item of currently focused item.
							var toSelect = $( menu.element.find( "#_" + self.model.lastAffectedItem ));

							// Reset the lastAffectedItem.
							self.model.lastAffectedItem = null;
						}

						if( $( event.target ).val() != "" )
							self.model.isMultiselectReplace = true;
						else
							self.model.isMultiselectReplace = false;

						if( toSelect && toSelect.length )
							menu.focus( null, toSelect );

					} else {

						// try to hilight the term's best match in the list
						var term = self.element.find( ".mf-internal-text" ).first().val().toLowerCase();
						if( term ) {
							var found = null;
							menu.element.find( "a > span" ).each( function() {
								found = false;
								if( $( this ).text().toLowerCase().indexOf( term ) === 0 ) {

									// Get the parent node of the element.
									var parentNode = $( self.element[0].parentElement.parentElement ), isMultiSelectLookup = false;

									// Flag shows the element is multiselect lookup or not.
									isMultiSelectLookup = $( parentNode ).hasClass( 'mf-multiselectlookup' );

									// Focus the item if it is not multi-select lookup.
									if( !isMultiSelectLookup )
										menu.focus( null, $( this ).closest( "li" ) );
									found = true;
									return false;
								}
							} );
							// If any item doesn't match, but there are results, hilight the first item in the list.
							// If the first item is empty (has string "") and there is second item, hilight the second item.
							if( found === false ) {
								var firstItem = menu.element.find( "a > span" ).first();

								if( firstItem.text() == "" && menu.element.find( "a > span" ).length > 1 )
									menu.focus( null, menu.element.find( "a > span" ).eq( 1 ).closest( "li" ) );
								else
									menu.focus( null, firstItem.closest( "li" ) );
							}
						}
					}


					// reset method of how list was opened
					self.openClicked = false;

					// update list info text that appears statically at the top of the list
					//self.updateInfo();

				},

				close: function( event, ui ) {

					// make double sure that the lookup info (searching, filter, not found, etc... ) doesn't outlast the listing
					$( ".mf-autocomplete-info" ).remove();
				},

				focus: function( event, ui ) {

					/*
					if( ui.item ) {
					if( !ui.item.selectable ) {
					if( event.originalEvent && event.originalEvent.originalEvent && /^key/.test( event.originalEvent.originalEvent.type ) ) {
					self.element.find( ".mf-internal-text" ).first().val( self.lookupText );
					}
					return false;
					}
					}
					*/

					// if an unselectable item receives focus, prevents text from changing
					// and if keyboard changed focus, we reset text to original value
					if( ui.item ) {
						if( !ui.item.selectable ) {
							if( ui.item.isLeaf ) {
								var direction = ( event.key == "Down" ) ? "next" : "previous";
								$( event.originalEvent.target ).menu( direction, event.originalEvent );
							} else if( event.originalEvent && event.originalEvent.originalEvent && /^key/.test( event.originalEvent.originalEvent.type ) ) {
								self.element.find( ".mf-internal-text" ).first().val( self.lookupText );
							}

							return false;
						}
					}


				}

			} )
            .data( "uiAutocomplete" )._renderItem = function( ul, item ) {

            	// delegate rendering to local function
            	// but attach the html returned to the passed ul object
            	return $( self.renderItem( item ) ).appendTo( ul );
            }

			return this;
		},

		// setToNormalMode.
		setToNormalMode: function() {

			var self = this;
			var element = this.element;

			// Set the list status explicitly to closed, because we don't get "autocompleteclose" event when control moves to view mode.
			this.listIsOpen = false;
			self.updateInfo();
			if( self.options.lookupcontrolcontainer )
				self.options.lookupcontrolcontainer.controlWithList = null;

			// Get current data.
			// We are still in edit-mode, so controlText returns text as is. 		
			var text = self.controlText();
			var value = self.controlValue();

			// TODO: Check that _createControl don't perform unnecessary/illegal tasks.
			// Re-create the control and bind it again to original property.
			this.options.editmode = false;
			var container = element.data( "container" );

			self._createControl( container );

			if( utilities.isMultiValue( value ) ) {
				text = this.options.localization.strings.IDS_METADATACARD_CONTENT_VARIES_TEXT;
			}
			self.updateControl( text, value );

			// If we have selection list handler, inform it that we have moved to view mode.
			if( this.selectionListHandler ) {
				this.selectionListHandler.viewModeReached();
			}
		},

		// setDeletable.
		setDeletable: function( deletable ) {

			this.options.isdeletable = deletable;
		},
		select: function ( event, ui, input ) {
			/// <summary>
			///     Triggered when an item is selected from the menu.
			///     Canceling this event prevents the value from being updated, but does not prevent the menu from closing.
			/// </summary>
			/// <param name="event" type="jQuery.Event">
			///     The jQuery event object.
			/// </param>
			/// <param name="ui" type="object">
			///     The the object that is represents the  with the autocontrol item. Members:
			///      - item: The jQuery item selected from the menu, if any. Otherwise the property is null.
			/// </param>
			$self =input
			if( ui.item && !ui.item.object && !$self.options.issingleclick ) {

				$self.addNewItem( $self.model, true, false );
				return false;
			}

			// If case of single-click lookup, check if focus change to parent element was allowed after move to view mode.
			// If selection was done by enter key or by clicking the item on the list, set focus to parent element after change to view mode.
			// If selection was done by tab, we don't move focus, because it was already moved to next or
			// previous control by Tab-key.
			var setFocusToParent = false;
			if( $self.options.issingleclick ) {

				if( $self.focusChangeAllowed ) {
					$self.focusChangeAllowed = false;
					setFocusToParent = true;
				}
			}

			// Do not overwrite the text field on keyboard events if we do not have search
			// results based on the latest user input. Otherwise we may end up
			// ignoring what the user wrote when they press tab or enter. See issue #20397.
			var controlText = $self.controlText();
			var isKeyboardEvent = event.originalEvent && event.originalEvent.originalEvent &&
					event.originalEvent.originalEvent.type == "keydown";

			// To check user typed letters are present at the beginning of any words in the value list item.
			var wordMatchRegex = new RegExp( '\\b' + controlText.toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, ''), 'gi' );
			var isMatchFound = wordMatchRegex.test( ui.item.value.toLowerCase() );
			var isOutOfSync = ( $self.selectionListHandler.selectionList.filter !== controlText ||
					$self.selectionListHandler.requestQueue.length > 0 );
			if( isKeyboardEvent && !isMatchFound && isOutOfSync ) {
				return false;
			}

			// Delegate.
			if( $self.selectItem( ui.item, false, setFocusToParent ) === false )
				return false;

			// Set focus back to input field and select it.
			setTimeout( function () {


				// If tab is pressed, then focus has already been set to the next control.
				if( ! utilities.tabDirection ) {
					$self.element.find( ".mf-internal-text" ).first().focus();
					$self.element.find( ".mf-internal-text" ).first().select();
				}
			}, 0 );

		},

		// openList.
		openList: function() {

			// Open the list if it is not open and not disabled.
			var self = this;
			if( !this.listIsOpen && !self.isDisabled ) {
				this.openClicked = true;
				setTimeout( function() {
					try {
						self.element.find( ".mf-internal-text" ).first().autocomplete( "search", "" );
					} catch( e ) { }
				}, 0 );
			}
		},

		// setToEditMode.
		setToEditMode: function( focusRequested, callback ) {

			if( this.options.readonly )
				return;

			this.focusChangeAllowed = false;

			// Get current text and value.	
			var text = this.controlText();
			var value = this.controlValue();

			// Re-create the control in edit mode and add it to the container.
			this.options.editmode = true;
			var container = this.element.data( "container" );
			this._createControl( container );

			if( utilities.isMultiValue( this.lookupValue ) ) {
				text = this.options.localization.strings.IDS_METADATACARD_CONTENT_VARIES_TEXT;
			}

			// Update re-created control.
			this.updateControl( text, value );

			// Disable lookup control if it has ambiguous values.
			if( utilities.isMultiValue( this.lookupValue ) ) {

				// Disable control.
				this.element.find( ".mf-internal-text" ).prop( "disabled", true );
				this.isDisabled = true;
			}

			// Set focus back to input field if requested and call callback function to inform caller.
			if( focusRequested ) {

				var self = this;
				setTimeout( function() {
					self.element.find( ".mf-internal-text" ).first().focus();
					self.element.find( ".mf-internal-text" ).first().select();
					callback();
				}, 0 );
			}
		},

		// Updates the control to show the text that corresponds to the current value.
		resetControlText: function() {

			if( this.lookupValue === null ) {

				// Empty value.
				this.updateControl( "", null );

			} else if( utilities.isMultiValue( this.lookupValue ) ) {

				// VARIES.
				this.updateControl( this.options.localization.strings.IDS_METADATACARD_CONTENT_VARIES_TEXT, this.lookupValue );

			} else {

				// Normal value.
				this.updateControl( this.lookupValue.Name, this.lookupValue );
			}
		},

		// updateControl.
		updateControl: function( text, value ) {

			// Update control. 
			var element = this.element;
			if( !this.options.editmode ) {

				// This is view mode. Set text and icon.
				this.setTextAndIconInViewMode( text, value );

			} else {

				// This is edit mode. Just use text without any icon.
				// Set text
				element.find( ".mf-internal-text" ).first().val( text );
			}

			this.lookupText = text;
			this.lookupValue = value;
		},

		// createSelectionListHandler.
		createSelectionListHandler: function() {

			// Create selection list handler.
			if( this.selectionListHandler === null )
				this.selectionListHandler = utilities.createSelectionListHandler( this );
			else
				throw Error( "SelectionList already exists" );

			// Register selection list events.
			// Note: there is no need to unregister selection list events, it is done by model.
			//utilities.registerSelectionListEvents( this, this.model, this.options.metadatacard );
		},

		// setValue.
		setValue: function( lookupValue ) {

			// Get text.
			var text = ( utilities.isMultiValue( lookupValue ) ) ? this.options.localization.strings.IDS_METADATACARD_CONTENT_VARIES_TEXT : "" + lookupValue.Name;

			// Set text and icon.
			this.setTextAndIconInViewMode( text, lookupValue );

			// Set assignee state and link.
			this.setAssigneeState( lookupValue );
			this.setLink( lookupValue );

			// Set the value.
			this.lookupText = text;
			this.lookupValue = lookupValue;

			// Ensure that the control text is up-to-date, too.
			this.resetControlText();
		},

		setTextAndIconInViewMode: function( text, value ) {

			// Allowed in view mode only.
			if( this.options.editmode )
				return;

			// Set text for the control.
			if( value && this.model && this.model.PropertyDef == 99 ) {

				// Width calculation by reducing icons width.
				var width = ( this.element.width() - 61 ) / 2;
				var widthInPixels = width + "px";

				// Holds state transition div.
				var stateTransitionTextElement = this.element.find( ".mf-internal-text" );

				// *** This is state transition combined control.

				// Prepare variables. 
				var isRealState =
					this.options.metadatacard.stateProperty &&
					this.options.metadatacard.stateProperty.property.value &&
					this.options.metadatacard.stateProperty.property.value.item > 0;
				var isRealTransition = ( value.item != -1 );
				var isNewObject = this.options.metadatacard.controller.editor.DataModel.UncreatedObject;

				// If this is not a valid transition, clear text.
				if( ! isRealTransition )
					text = "";

				// Convert to JavaScript string and sanitize possible HTML.
				text = "" + text;
				var sanitizedHtml = utilities.htmlencode( text, true );
				this.element.find( ".mf-internal-text" ).first().html( sanitizedHtml );

				// Checks state transition text is present.
				if( text.length > 0 ) {
					var elementWidth = stateTransitionTextElement.first().width();

					// Adjusts state transition text based on the control width.
					if( width < elementWidth ) {
						$( stateTransitionTextElement.first()[ 0 ] ).css( "width", widthInPixels );
						stateTransitionTextElement.css( "text-overflow", "ellipsis" );
						stateTransitionTextElement.css( "display", "inline" );
					}
				}

				// Remove existing state property.
				this.element.find( ".mf-internal-text-state-prop" ).remove();
				this.element.find( ".mf-internal-empty-state-prop" ).remove();

				// Add state property value as text
				var stateText = "";
				if( isRealState ) {

					// This is real state. Get the state property text.
					stateText = this.options.metadatacard.stateProperty.property.value.name;
					stateText = "" + stateText;

				} else if( isRealTransition ) {

					// This is no-state and there is a transition, set state text to "no state".
					stateText = this.options.localization.strings.IDS_STR_NO_STATE;
				}

				// Set state text to html element.

				// If the "no state" is alone in the line, put "---" instead.
				// Otherwise, set state text to html element.
				if( ! isRealTransition && ! isRealState ) {
					var emptyText = "---";
					var control = $( '<span class="mf-internal-empty-state-prop ">' + 
							utilities.htmlencode( emptyText ) + '</span>' );

					// Set state "---" to html element.
					this.element.find( ".mf-internal-text" ).before( control );

				} else if( isRealState || ! isNewObject ) {

					// Set state text to html element.
					var stateSanitizedHtml = utilities.htmlencode( stateText, true );
					this.element.find( ".mf-internal-text" )
						.before( '<div class="mf-internal-text-state-prop mf-property-99-text-0-2">'
						+ stateSanitizedHtml + '</div>' );

					// Checks state transition text is present.
					if( text.length > 0 ) {

						// Calculates state text width.
						var stateTextElement = this.element.find( ".mf-property-99-text-0-2" );
						var elementWidth = stateTextElement.width();

						// Adjusts the state text in same line.
						stateTextElement.css( "float", "left" );

						// Adjusts state transition text based on the control width.
						if( width < elementWidth ) {

							// Sets state text width and fit text within.
							$( stateTextElement[ 0 ] ).css( "width", widthInPixels );
						}
					}
				}

			}
			else {

				// *** Normal control.

				// Convert to JavaScript string and sanitize possible HTML.
				text = "" + text;
				var sanitizedHtml = utilities.htmlencode( text, true );
				this.element.find( ".mf-internal-text" ).first().html( sanitizedHtml );
			}

			// Set icon, if any.
			this.setIconInViewMode( value );


		},

		setIconInViewMode: function( value ) {

			// Remove any pre-existing image.
			this.element.find( ".mf-internal-image" ).remove();
			this.element.find( ".mf-internal-image-trans-prop" ).remove();
			this.element.find( ".mf-internal-image-state-prop" ).remove();

			// Allowed in view mode only.
			if( this.options.editmode )
				return;

			// Determine control icon URL. Get the custom icon or use the default icon.
			var iconURL = "";
			if( value && value.HasIcon ) {

				// If the valuelist already contains Icon url, set it directly.
				if( value.IconURL ) {
					iconURL = value.IconURL;
				}

				// If the value does not contain Icon url but if HasIcon is true, 
				// get the valuelist icon url based on the valuelist id and valuelist item id.
				else if( this.model && this.model.host ) {
					iconURL = this.model.host.getValueListIconURL( value.ValueListID, value.ID );
				}
			} else if( value && this.model && this.model.PropertyDef == 38 ) {
				iconURL = "UIControlLibrary/images/workflow-icon.png";  // default workflow icon
			} else if( value && this.model && this.model.PropertyDef == 39 ) {  
				iconURL = "UIControlLibrary/images/state_yellow.png";  // default state icon
			} else if( value && this.model && this.model.PropertyDef == 99 ) {  
				iconURL = "UIControlLibrary/images/transition.png";  // default transition icon
			} else if( value && this.model.ValueList == 4 /* VALUELIST_TRADITIONALFOLDERS */ )
				iconURL = "UIControlLibrary/images/folder-16.png";

			// If this is a state transition control set the icons in a special way
			// Otherwise, set the icon if it exists.
			if( value && this.model && this.model.PropertyDef == 99 ) {

				// *** This is state transition combined control.

				// Prepare variables. 
				var stateProperty = this.options.metadatacard.stateProperty;
				var isRealState = stateProperty && stateProperty.property.value &&
						stateProperty.property.value.item > 0; 
				var isRealTransition = ( value.item != -1 ); 
				var isNewObject = this.options.metadatacard.controller.editor.DataModel.UncreatedObject;
				var stateIconURL = "";

				// *** Resolve state icon URL.

				// Get either a custom icon or the default icon for the state.
				if( stateProperty && stateProperty.property.value && stateProperty.property.value.HasIcon ) {

					// Use the custom icon for the state.
					stateIconURL = stateProperty.property.value.IconURL;
				} else {

					// Use the no-state icon or the default state icon.
					if( ! isRealState )
						stateIconURL = "UIControlLibrary/images/state_grey.png";
					else
						stateIconURL = "UIControlLibrary/images/state_yellow.png";
				}

				// *** Finally, add icons for: state, arrow, and transition.

				// If the state is a real state, or there is a valid transition and we are not
				// creating a new object, add the state icon.
				if( isRealState || ( isRealTransition && ! isNewObject ) )
					this.element.find( ".mf-internal-text-state-prop" ).before( '<img class="mf-internal-image-state-prop" style="float:left" src="' + utilities.removeQuotes( stateIconURL ) + '" />' );

				// If this is valid transition and we are not creating a new object, add arrow icon.
				if( isRealTransition  && ! isNewObject )
					this.element.find( ".mf-internal-text" ).before( '<img class="mf-internal-image-trans-prop" src="' + utilities.removeQuotes( "UIControlLibrary/images/transition_arrow.png" ) + '" />' );

				// If this is valid transition add transition icon.
				if( isRealTransition )
					this.element.find( ".mf-internal-text" ).before( '<img class="mf-internal-image" src="' + utilities.removeQuotes( iconURL ) + '" />' );

			}
			else if( iconURL != "" ) {

				// For other controls, Set the icon if it exists.
				this.element.find( ".mf-internal-text" ).before( '<img class="mf-internal-image" style="float:left" src="' + utilities.removeQuotes( iconURL ) + '" />' );
			}

		},

		updateIcon: function() {

			// Update icon based on the current value of this control.
			this.setIconInViewMode( this.lookupValue );
		},

		setAssigneeState: function( value ) {


			// Assignee state buttons are not visible in edit mode. Remove them.
			var container = this.element.find( ".mf-lookup-item-row" ).first();
			if( this.options.editmode ) {
				container.find( ".mf-assignee-state-completed" ).first().remove();
				container.find( ".mf-assignee-state-uncompleted" ).first().remove();
				container.find( ".mf-assignee-state-approved" ).first().remove();
				container.find( ".mf-assignee-state-rejected" ).first().remove();
				container.find( ".mf-assignee-state-test" ).first().remove();
				container.find( ".mf-assignee-state-varies" ).first().remove();
				return;
			}

			// Update assignee state (if any) based on the current value of this control.
			var self = this;
			var state = -1;
			/*if( utilities.isMultiValue( value ) ) {
				if( typeof value.State != "undefined" ) {
					state = value.State;
				}
			}
			if( state == -1 )
				state = utilities.assigneeState( value );*/

			if( state !== -1 ) {

				var completedButtonContainer = null;
				var uncompletedButtonContainer = null;
				var approvedButtonContainer = null;
				var rejectedButtonContainer = null;
				var notApprovedNorRejectedButtonContainer = null;
				var variesButtonContainer = null;

				// Create buttons to show if they don't exist. Change assignee state.
				if( !container.find( ".mf-assignee-state" ).length ) {

					// Completed icon.
					var completedButton = $( '<img src="UIControlLibrary/images/approved.png" />' );
					completedButtonContainer = $( '<div class="mf-lookup-item-cell-image mf-assignee-state mf-assignee-state-completed"></div>' ).hide();
					container.append( completedButtonContainer );
					completedButtonContainer.append( completedButton );
					completedButton.bind( "click", function( event ) {

						// Mark assignees state to uncompleted.
						self.updateAssigneeState( 0 );

						// Stop event propagation.
						event.stopPropagation();
					} );

					// Uncompleted icon.
					var uncompletedButton = $( '<img src="UIControlLibrary/images/not-approved.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKCOMPLETE_TOOLTIP + '"/>' );
					uncompletedButtonContainer = $( '<div class="mf-lookup-item-cell-image-assignedto mf-assignee-state mf-assignee-state-uncompleted"></div>' );
					container.append( uncompletedButtonContainer );
					uncompletedButtonContainer.append( uncompletedButton );
					uncompletedButton.bind( "click", function( event ) {

						// Mark assignees state to completed.
						self.updateAssigneeState( 1 );

						// Stop event propagation.
						event.stopPropagation();
					} );

					// "Not approved nor rejected" icon.
					var notApprovedButton1 = $( '<img src="UIControlLibrary/images/not-approved.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKAPPROVED_TOOLTIP + '"/>' );
					var notRejectedButton1 = $( '<img src="UIControlLibrary/images/not-rejected.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKREJECTED_TOOLTIP + '"/>' );
					notApprovedNorRejectedButtonContainer = $( '<div class="mf-lookup-item-cell-image-assignedto mf-assignee-state mf-assignee-state-test"></div>' );
					container.append( notApprovedNorRejectedButtonContainer );
					notApprovedNorRejectedButtonContainer.append( notApprovedButton1 );
					notApprovedNorRejectedButtonContainer.append( notRejectedButton1 );
					notApprovedButton1.bind( "click", function( event ) {
						// Mark assignees state to completed.
						self.updateAssigneeState( 1 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					notRejectedButton1.bind( "click", function( event ) {
						// Mark assignees state to completed.
						self.updateAssigneeState( 2 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					// Approved icon.
					var approvedButton = $( '<img src="UIControlLibrary/images/approved.png" />' );
					var notRejectedButton2 = $( '<img src="UIControlLibrary/images/not-rejected.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKREJECTED_TOOLTIP + '"/>' );
					approvedButtonContainer = $( '<div class="mf-lookup-item-cell-image mf-assignee-state mf-assignee-state-approved"></div>' ).hide();
					container.append( approvedButtonContainer );
					approvedButtonContainer.append( approvedButton );
					approvedButtonContainer.append( notRejectedButton2 );
					approvedButton.bind( "click", function( event ) {
						// Mark assignees state to notApproved.
						self.updateAssigneeState( 0 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					notRejectedButton2.bind( "click", function( event ) {
						// Mark assignees state to completed.
						self.updateAssigneeState( 2 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					// Rejected icon.
					var rejectedButton = $( '<img src="UIControlLibrary/images/rejected.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKCOMPLETE_TOOLTIP + '" />' );
					var notApprovedButton2 = $( '<img src="UIControlLibrary/images/not-approved.png" title="'
						+ this.options.localization.strings.IDS_METADATACARD_ASSIGNEDTO_BUTTON_MARKAPPROVED_TOOLTIP + '"/>' );
					rejectedButtonContainer = $( '<div class="mf-lookup-item-cell-image mf-assignee-state mf-assignee-state-rejected"></div>' ).hide();
					container.append( rejectedButtonContainer );
					rejectedButtonContainer.append( notApprovedButton2 );
					rejectedButtonContainer.append( rejectedButton );
					notApprovedButton2.bind( "click", function( event ) {
						// Mark assignees state to completed.
						self.updateAssigneeState( 1 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					rejectedButton.bind( "click", function( event ) {
						// Mark assignees state to not rejected.
						self.updateAssigneeState( 0 );
						// Stop event propagation.
						event.stopPropagation();
					} );
					// Varies icon.
					var variesButton = $( '<img src="UIControlLibrary/images/status_blue.png" />' );
					variesButtonContainer = $( '<div class="mf-lookup-item-cell-image mf-assignee-state mf-assignee-state-varies"></div>' );
					container.append( variesButtonContainer );
					variesButtonContainer.append( variesButton );
					variesButton.bind( "click", function( event ) {

						// Mark assignees state to completed.
						self.updateAssigneeState( 1 );

						// Stop event propagation.
						event.stopPropagation();
					} );
				}
				else {
					completedButtonContainer = container.find( ".mf-assignee-state-completed" ).first();
					uncompletedButtonContainer = container.find( ".mf-assignee-state-uncompleted" ).first();
					approvedButtonContainer = container.find( ".mf-assignee-state-approved" ).first();
					rejectedButtonContainer = container.find( ".mf-assignee-state-rejected" ).first();
					notApprovedNorRejectedButtonContainer = container.find( ".mf-assignee-state-test" ).first();
					variesButtonContainer = container.find( ".mf-assignee-state-varies" ).first();
				}

				// Set visibility of icon buttons. The control can be on of the following:
				//
				// 1) Approval type control, which has 'Approved' and 'Rejected' buttons, or
				// 2) Task type control, which has only 'Completed' button, or
				// 3) Varies type control, which has 'Varies' icon.
				//
				// The Approval type control is used if this.isRejectedItemFound is true.

				if( completedButtonContainer && uncompletedButtonContainer &&
					approvedButtonContainer && rejectedButtonContainer &&
					notApprovedNorRejectedButtonContainer && variesButtonContainer ) {

					if( state == this.ASSIGNEE_STATE_ASSIGNED ) {
						// state: none (assigned to). 
						variesButtonContainer.hide();
						if( this.isRejectedItemFound ) {
							completedButtonContainer.hide();
							uncompletedButtonContainer.hide();
							approvedButtonContainer.hide();
							rejectedButtonContainer.hide();
							notApprovedNorRejectedButtonContainer.show();
						}
						else {
							completedButtonContainer.hide();
							uncompletedButtonContainer.show();
							approvedButtonContainer.hide();
							rejectedButtonContainer.hide();
							notApprovedNorRejectedButtonContainer.hide();
						}
					}
					else if( state == this.ASSIGNEE_STATE_COMPLETED_OR_APPROVED ) {
						// state: completed by or approved by
						variesButtonContainer.hide();
						if( this.isRejectedItemFound ) {
							completedButtonContainer.hide();
							uncompletedButtonContainer.hide();
							approvedButtonContainer.show();
							rejectedButtonContainer.hide();
							notApprovedNorRejectedButtonContainer.hide();
						}
						else {
							completedButtonContainer.show();
							uncompletedButtonContainer.hide();
							approvedButtonContainer.hide();
							rejectedButtonContainer.hide();
							notApprovedNorRejectedButtonContainer.hide();
						}
					}
					else if( state == this.ASSIGNEE_STATE_REJECTED ) {
						// state: rejected by
						variesButtonContainer.hide();
						if( this.isRejectedItemFound ) {
							completedButtonContainer.hide();
							uncompletedButtonContainer.hide();
							approvedButtonContainer.hide();
							rejectedButtonContainer.show();
							notApprovedNorRejectedButtonContainer.hide();
						}
						else { // should not happen
							completedButtonContainer.hide();
							uncompletedButtonContainer.hide();
							approvedButtonContainer.hide();
							rejectedButtonContainer.hide();
							notApprovedNorRejectedButtonContainer.hide();
						}
					}
					else {
						// state: ambiguous
						completedButtonContainer.hide();
						uncompletedButtonContainer.hide();
						approvedButtonContainer.hide();
						rejectedButtonContainer.hide();
						notApprovedNorRejectedButtonContainer.hide();
						variesButtonContainer.show();
					}
				}
			}
		},

		updateAssigneeState: function( state ) {

			// Update assignees state. In practice mark it to completed or uncompleted.
			if( this.lookupValue && this.model ) {
				this.model.SetValueItemState( this.lookupValue.Id, state );
			}
		},

		setLink: function( value ) {

			// Icons are not visible in edit mode. Remove them.
			var container = this.element.find( ".mf-lookup-item-row" ).first();
			if( this.options.editmode ) {
				container.find( ".mf-object-link" ).first().remove();
				return;
			}

			// Check if we can show the link.
			var showLink = false;
			if( this.model && typeof this.model.CanActivateLink != "undefined" ) {

				if( this.model.Linked && this.model.CanActivateLink( value ) ) {

					// Check if configuration allows us to show the linkButton.
					if( this.options.metadatacard &&
						this.options.metadatacard.configurationManager.isNot( "MetadataCard.Theme.Properties.RelatedObjectLink.IsHidden", true ) ) {
						showLink = true;
					}
				}
			}

			// Create link icon if it doesn't exist.
			var self = this;
			var objectLinkContainer = null;
			if( !container.find( ".mf-object-link" ).length ) {

				// Link button.
				var linkButton = $( '<img src="UIControlLibrary/images/openlink_16.png" />' );
				objectLinkContainer = $( '<div class="mf-lookup-item-cell-image mf-object-link"></div>' ).hide();
				container.append( objectLinkContainer );
				objectLinkContainer.append( linkButton );
				linkButton.bind( "click", function( event ) {

					var lookupValue = self.lookupValue;

					// Frames the lookup object.
					var lookup = {};
					lookup.DisplayValue = lookupValue.name || lookupValue.Name;
					lookup.Item = lookupValue.item || lookupValue.Item;
					lookup.ObjectType = self.model.ValueList;
					lookup.ObjectFlags = lookupValue.ObjectFlags;

					// Generate the navigation link. and open the object in new tab.
					self.options.metadatacard.controller.editor.DataModel.GetObjectLink( lookup,
						function( url ) {
							if( url ) {
								var tabOrWindow = window.open( url );
								tabOrWindow.focus();
							}
						} );

					// Stop event propagation.
					event.stopPropagation();

				} );
			}
			else
				objectLinkContainer = container.find( ".mf-object-link" ).first();

			// Set visibility of icon.
			if( objectLinkContainer ) {

				if( showLink == true )
					objectLinkContainer.show();
				else if( showLink == false )
					objectLinkContainer.hide();
			}

		},

		selectItem: function( item, updateEditControlText, setFocusToParent ) {
			/// <summary>
			///     Selects an item.
			/// </summary>
			/// <param name="item" type="Object (todo: is the type specified somewhere?)">
			///     The item to select. Members:
			///     - selectable: true if the item can be selected.
			///     - object: if non-null, the item value as MetadataCardSelectionListItem object.
			///     - value: if the item object is not present, contains the value as a text. (todo: clarify when this is present).
			///     - label: contains the item label (todo: when this is present?).
			/// </param>
			/// <param name="updateEditControlText" type="Boolean">
			///     True to request the item selection to update the UI Control label, too.
			/// </param>
			/// <param name="setFocusToParent" type="Boolean">
			///     True to request the control to cease the edit mode after the selection is completed.
			/// </param>
			/// <returns type="Boolean">
			///     True if the selection succeeded. False if the selection was not completed.
			/// </returns>

			var self = this;

			// Prevent selection if the provided item is not selectable.
			if( item.selectable === false ) {
				return false;
			}

			// Change the UI control state. Preserve old values to be used in a case the model operation fails.
			var oldLookupValue = self.lookupValue;
			var oldLookupText = self.lookupText;
			var newLookupValue = item.object ? item.object.Value : null;
			var newLookupText = !item.object ? item.value : null;
			if( !newLookupText )
				newLookupText = item.label;
			if( newLookupValue === null &&
				( self.options.isclassselector || self.options.ispropertyselector ) ) {

				// Prevent the selection of a null item in class selector and property selector.
				// This check must happen before lookupText and lookupValue are updated to the new value.
				return false;
			}

			try {

				// Inform lookup control container about selection change.
				// Set focus to parent element if requested.
				var lookupValueFromModel = ( self.model && self.model.getValue() ) ? self.model.getValue() : null;

				// If the property is modified by the user, assign the propety value to the variable.
				if( self.model && Number( self.model.propertyDef ) && self.options.metadatacard &&
					self.options.metadatacard.configurationManager )
					self.options.metadatacard.configurationManager.propertyModifiedByUser = self.model.propertyDef;
				self.options.itemselected( oldLookupValue, newLookupValue, lookupValueFromModel, newLookupText, setFocusToParent );
			}
			catch( ex ) {

				//alert( "restored to " + oldLookupText );

				// Restore the previous situation.
				self.lookupText = oldLookupText;
				self.lookupValue = oldLookupValue;

				// We should detect and filter and hide only certain errors here (such as 'Already exists, 0x80040031'), and let others either 
				// propagate to the caller or show up here. However since we do not (yet) have a way to extract the error details from the exception,
				// we just filter out all errors here.
				var showError = true;
				if( showError )
					MFiles.ReportException( ex );

				// Reset the control to show the current item's text instead of the entered text that failed.
				self.resetControlText();

				return false;
			}

			// Update the text in the edit control.
			if( updateEditControlText === true )
				self.updateControl( self.lookupText, self.lookupValue );

			return true;
		},

		validateItem: function( model ) {

			var self = this;

			// Get the entered text.
			var found = false;
			var value = $.trim( self.controlText() );
			if( value != "" ) {

				// Try to find the item with this name.
				var foundItem = model.FindItem( value );
				if( foundItem !== null ) {

					// Select the new item.
					var item = {
						value: foundItem.Value.Name,
						object: foundItem,
						selectable: foundItem.Selectable
					};
					self.selectItem( item, true, false );  // Need to update control text because the casing might be different.
					found = true;

					//alert( "found: " + foundItem.Value.Item );

				}  // end if

			} else if( self.model.PropertyDef != 38 && self.model.PropertyDef != 39 && self.model.PropertyDef != 99 ) {

				// update the control status so it knows the value has been cleared
				self.lookupText = "";
				self.lookupValue = null;
			}

			// If we did not select any item, clear the current item selection from the control
			// but leave the new free text.
			if( found === false ) {

				// if this is the state transition, keep the previous selection.
				// Otherwise, Clear the item selection but keep the new text.
				if( self.model.PropertyDef != 99 ) {

					// Clear the item selection but keep the new text.
					var item = {
						value: value,
						object: null,
						selectable: true
					};
					self.selectItem( item, false, false );  // No need to update control text.

				}  // end if

			}  // end if

			return found;
		},

		addNewItem: function( model, skipPrompt, useEmptyValue ) {

			var self = this;

			// Get the entered text.
			var completed = false;
			var value = self.controlText();
			if( useEmptyValue )
				value = "";

			// Reset variable that stores focus rotation direction.
			// This is normally done when any key is released, but in case of native dialog keyup-event is eaten.
			utilities.tabDirection = null;

			if( value == "" && !useEmptyValue )
				return false;  // Don't suggest adding an empty value.	

			// Is adding to the list allowed?
			// HACKHACK: Take this commented piece of code in use when preventValueAdding has correct values.	
			if( model.AllowAdding /* && self.selectionListHandler && !self.selectionListHandler.preventValueAdding */ ) {

				if( !skipPrompt ) {
					// Ask the user to confirm the adding of a new value.
					// should only be used if the user hasn't explicitly triggered the action (loss of focus)
					var basemsg = self.options.localization.strings.IDS_MSG_VALUE_X_NOT_IN_LIST_BOX_DO_YOU_WANT_TO_ADD_NEW_VALUE;
					var msg = self.options.localization.replacePlaceholder( basemsg, $.trim( value ) );
					var result = self.options.metadatacard.controller.showMessage( {
						message: msg,
						icon: "question",
						button1_title: self.options.localization.strings.IDS_STRING_YES,
						button2_title: self.options.localization.strings.IDS_STRING_NO,
						cancelButton: 2
					} );
				}

				if( skipPrompt || result === 1 ) {

					var selectItem = function( selectedItem ) {
						if( selectedItem ) {

							if( selectedItem.asynchOperation === true ) {
								completed = true;
							}
							else {

								// Select the new item.
								var item = {
									value: selectedItem.Value.Name,
									object: selectedItem,
									selectable: selectedItem.Selectable
								};
								self.selectItem( item, true, false );

								// Set focus to the edit control.
								// This improves behavior after adding in some respects, e.g., if the user moved
								// out of the control with tab.
								self.element.find( ".mf-internal-text" ).first().focus();
								self.element.find( ".mf-internal-text" ).first().select();

								// Ready.
								completed = true;
							}
						}  // end if
					}

					// Perform the actual adding of the new item.
					var addedItem = null;
					try {

						// For web access, we need async callback.
						addedItem = model.AddNewItem( value, selectItem );
					} catch( ex ) {
						MFiles.ReportException( ex );
					}

					selectItem( addedItem );

					/*
					// New item created?
					if( addedItem ) {

						// Select the new item.
						var item = {
							value: addedItem.Value.Name,
							object: addedItem,
							selectable: addedItem.Selectable
						};
						self.selectItem( item, true, false );

						// Set focus to the edit control.
						// This improves behavior after adding in some respects, e.g., if the user moved
						// out of the control with tab.
						this.element.find( ".mf-internal-text" ).first().focus();
						this.element.find( ".mf-internal-text" ).first().select();

						// Ready.
						completed = true;

					}  // end if */

				}  // end if

			}  // end if

			// If adding was not completed, clear the entered value to avoid leaving a non-existing value
			// in the edit control. If the value already exists, it is not cleared.
			if( completed === false ) {

				if( this.options.ispropertyselector ) {

					this.element.find( ".mf-internal-text" ).first().val( "" );
				}
				else {

					// Clear the edit control if value doesn't exist.
					if( !this.validateItem( self.model ) ) {
						this.element.find( ".mf-internal-text" ).first().val( "" );
					}
					this.element.find( ".mf-internal-text" ).first().focus();
					this.element.find( ".mf-internal-text" ).first().select();
				}
			}
			return completed;
		},

		addNewSubItem: function( parentLookupValue ) {

			var self = this;

			// Get the parent value.
			var completed = false;

			// try to lookup the currently selected parent item if none was passed
			if( !parentLookupValue )
				parentLookupValue = self.controlValue();

			// check if we succeeded in looking up the parent
			if( parentLookupValue === null )
				return false;  // No parent value available.

			// Is adding to the list allowed?
			if( self.model.AllowAdding ) {


				var selectAddedValue = function( addedItem ) {
					var newLookupValue = addedItem.Value;

					// Select the new item.
					var item = {
						value: newLookupValue.Name,
						object: addedItem,
						selectable: addedItem.Selectable
					};
					self.selectItem( item, true, false );

					// Set focus to the edit control.
					// This improves behavior after adding in some respects, e.g., if the user moved
					// out of the control with tab.
					self.element.find( ".mf-internal-text" ).first().focus();
					self.element.find( ".mf-internal-text" ).first().select();

					// Ready.
					completed = true;
				}

				// Perform the actual adding of the new item.
				var addedItem = null;
				try {

					// For web access, we need async callback.
					addedItem = self.model.addNewSubItem( "", parentLookupValue, selectAddedValue );
				} catch( ex ) {
					MFiles.ReportException( ex );
				}

				if( !addedItem && addedItem.asynchOperation == true ) {
					return false;
				}
				else {
					selectAddedValue( addedItem );
				}

				/*
				var newLookupValue = addedItem.Value;

				// Select the new item.
				var item = {
					value: newLookupValue.Name,
					object: addedItem,
					selectable: addedItem.Selectable
				};
				self.selectItem( item, true, false );

				// Set focus to the edit control.
				// This improves behavior after adding in some respects, e.g., if the user moved
				// out of the control with tab.
				this.element.find( ".mf-internal-text" ).first().focus();
				this.element.find( ".mf-internal-text" ).first().select();

				// Ready.
				completed = true;*/

			}  // end if

			return completed;
		},

		editItem: function( lookupValue ) {

			var self = this;

			// Get the parent value.
			var completed = false;

			// Try to look up the currently selected parent item if none was passed.
			if( !lookupValue )
				lookupValue = self.controlValue();

			// Check if we succeeded in looking up the parent.
			if( lookupValue === null )
				return false;  // No value available.

			// Check if the value is valid.
			if( lookupValue.Item === undefined ) {
				return false;  // No value available.
			}

			var selectAddedValue = function( editedItem ) {
				if( editedItem ) {
					var newLookupValue = editedItem.Value;

					// Select the new item.
					var item = {
						value: newLookupValue.Name,
						object: editedItem,
						selectable: editedItem.Selectable
					};
					self.selectItem( item, true, false );

					// Set focus to the edit control.
					// This improves behavior after editing in some respects, e.g., if the user moved
					// out of the control with tab.
					this.element.find( ".mf-internal-text" ).first().focus();
					this.element.find( ".mf-internal-text" ).first().select();

					// Ready.
					completed = true;
				}
			}

			// Launch editing.
			var editedItem = null;

			try {

				// For web access, we need async callback.
				editedItem = self.model.editItem( lookupValue, selectAddedValue );
			} catch( ex ) {
				MFiles.ReportException( ex );
			}

			if( editedItem && editedItem.asynchOperation === true ) {
				return false;
			}
			else {
				selectAddedValue( editedItem );
			}

			return completed;
		},

		refreshList: function( model ) {

			model.RefreshList();
		},

		setInactiveText: function( text ) {

			// If control is in edit mode, update it with the empty value.
			var self = this;
			if( this.options.editmode ) {
				this.updateControl( "", null );

				// The following code is commented out, because indicator for inactive
				// class selector is no longer used in template dialog.
				// Currently this function only clears the class selector.

				// Create indicator for inactive control if it doesn't exist.
				/*
				var indicator = self.element.find( ".mf-lookup-inactive-text" );
				if( !indicator.length ) {
					indicator = $( '<div class="mf-lookup-inactive-text">Testing</div>' );
					var input = self.element.find( ".mf-internal-text" ).first();
					input.before( indicator );
					
					// Change container's position to relative. This is needed to locate indicator correctly.
					indicator.closest( ".mf-lookup-item-cell-content" ).css( "position", "relative" );
					
					// If user clicks to indicator, focus is moved to input field.
					indicator.click( function() {
						input.focus();
					} );
					
					// Hide/show indicator when input field focus moves.
					input.focus( function() {

						// Hide the indicator.
						indicator.hide();

					} ).blur( function() {
						
						// Show the indicator if class selector is empty.
						if( !input.val() )
							indicator.show();
					} );
					
				}
				// Set inactive text for indicator and show it.
				indicator.text( text );
				indicator.show();
				*/
			}
		},

		// controlText.
		controlText: function() {

			if( this.options.editmode )
				return this.element.find( ".mf-internal-text" ).first().val();
			else
				return this.lookupText;
		},

		// controlValue.
		// Note: This function is called also by lookup container control.
		controlValue: function() {
			return this.lookupValue;
		},

		// isEmpty.
		isEmpty: function() {

			if( this.options.editmode ) {

				var value = this.element.find( ".mf-internal-text" ).first().val();
				return ( !value || value.length === 0 )
			}
			else
				return ( !this.lookupText || this.lookupText.length === 0 );
		},

		// inEditMode.
		inEditMode: function() {
			return this.options.editmode;
		},

		// _removeControl.
		//
		// It is possible to remove embedded lookup controls from multiselection lookup control.
		// This function is called to remove these controls.
		_removeControl: function( moveFocus ) {

			// Request lookup container to remove field.
			// Last parameter tells if focus should be moved to next field after deletion.
			// If this was latest field, focus is moved to previous field.
			this.options.removevalue( this.lookupValue, this.element, true, moveFocus );
		},

		// _prohibitedKeyToOpenList.
		_prohibitedKeyToOpenList: function( event ) {

			// If key is prohibited, return true.
			var key = event.which;
			if( key === 16 || // Shift
				 key === 17 || // Ctrl
				 key === 18 || // Alt
				 key === 19 || // Pause
				 key === 20 || // Caps lock
				 key === 33 || // Page up
				 key === 34 || // Page down

				// We must not prohibit the following keys. They are needed for navigating.
				//key === 35 ||	// End
				//key === 36 ||	// Home
				//key === 37 ||	// Arrow to left
				//key === 39 ||	// Arrow to right

				 key === 45 || // Insert 
				 key === 91 || // Windows key
				 key === 93 || // Menu key
				 key === 144 || // Num lock
				 key === 145 || // Scroll lock
				 ( key >= 112 && key <= 123 ) ) // F1 - F12
				return true;

			// If key is not prohibited, return false.	
			return false;
		},

		// captureFocus.
		captureFocus: function() {

			// Set focus back to input field of this control and select the text.
			var textField = this.element.find( ".mf-internal-text" ).first();
			textField.focus();
			textField.select();
		},

		// closeList.
		closeList: function() {

			if( this.listIsOpen ) {
				var textField = this.element.find( ".mf-internal-text" );
				setTimeout( function() {
					try {
						textField.autocomplete( "close" );
					} catch( e ) { }
				}, 0 );
			}
		},

		renderItem: function( item ) {

				var className = "ui-menu-item",
					isChecked,
					existingLookupItem = ( this.model && this.model.getValue() ) ? this.model.getValue() : null,
					lookupName,
					lookupId;

				// Fetch the all existing item and check with current item to insert focus.
				if( ( existingLookupItem ) && ( item.object != null ) ) {

					// Loopthrough all exiting item and check if any item is already selected.
					for( var i = 0; i < existingLookupItem.length; i++ ) {

						// Check if the current object is of Lookup type or object type
						if( existingLookupItem[i].name ) {
							lookupName = existingLookupItem[i].name;
							lookupId = existingLookupItem[i].item;
						}
						else {
							lookupName = existingLookupItem[i].Name;
							lookupId = existingLookupItem[i].Item;
						}

						// Checks if item is already checked if it is add focus on selected item.
						if( ( item.object.Value.Id == lookupId ) ) {

							// If multiselect is enable add focus class and check by default.
							if( ( this.model.isMultiSelectEnable ) ) {
								className = "ui-menu-item ui-state-focus";
								isChecked = "checked";
							}
							else {

								// If item is already selected then disable the item.
								if( this.lookupValue.item !== item.object.Value.Item ) {
									className = "disable-item";
									isChecked = "checked";
								}
							}
						}
					}
				}

				// In some situations the item.value can be undefined and item can not be rendered.
				// Return null to prevent rendering of this kind of item. This fixes the tracker issue 19185.
				// Note that item.value can be also empty string, but in that case item should be rendered, because it represents empty value e.g. for workflow and state controls.
				if( item.value === undefined )
					return null;

				// to keep this fast and flexible as possible we create the element as an html string
				// so there are no DOM calls to slow it down.  Calling methods should attach the html
				// to the DOM themselves.

				var label,
					indent = "",
				classes = [className],
				title = '',
				displayStatus;


				if( this.model.isMultiSelectEnable ) {
					displayStatus = 'inline';
				}
				else {
					displayStatus = 'none';
				}

				// Check if it is multiselect lookup or the value is not empty
				if( ( $( $( this.element[0] ).closest( '.mf-multiselectlookup' ) ).length > 0 ) && ( item.value != "" ) ) {
					label = "<input type='checkbox'  class='checkbox' name=" + utilities.htmlencode( item.value, true ) + "" +
								"vaule=" + utilities.htmlencode( item.value, true ) + " " + isChecked + "  style='display:" + displayStatus + "'></input>" +
								utilities.htmlencode( item.value, true );
				}
				else
					label = "<span>" + utilities.htmlencode( item.value, true ) + "</span>";


				if( item.object ) {

					// Add list item icon, if any. If the custom icon is found, use it. Otherwise use the default icon.
					var iconURL = "UIControlLibrary/blank16.png";
					if( item.object.Value && item.object.Value.HasIcon ) {
						iconURL = item.object.Value.IconURL;
						this.showIcons = true;
					} else if( this.model.ValueList == 4 /* VALUELIST_TRADITIONALFOLDERS */ ) {
						iconURL = "UIControlLibrary/images/folder-16.png";
						this.showIcons = true;
					} else if( this.model.ValueList == 17 /* VALUELIST_STATETRANSITIONS */ ) {

						// Set the default icon for state trransition item.
						if( item.object.Value && item.object.Value.item == -1 ) {

							// Set own default icon for the no-transition item.
							iconURL = "UIControlLibrary/images/no_transition.png";
							this.showIcons = true;
						} else {

							// Set the default icon for normal transition icon.
							iconURL = "UIControlLibrary/images/transition.png";
							this.showIcons = true;
						}
					}

					label = '<img src="' + utilities.removeQuotes( iconURL ) + '" />' + label;

					// Get last section of item path as value list item id.
					var valueListItemId = item.path.split( '_' ).pop();

					// Get tooltip for value list item.
					if( this.model.ValueList === 1 && !item.isLeaf ) {

						// Special case for Class selector with Class Groups
						// Item is from Class Group value list.
						title = this.getTooltipForLookup( 2, valueListItemId );
					}
					else {

						// Get tooltip for Value List Item.
						title = this.getTooltipForLookup( this.model.ValueList, valueListItemId );
					}

					// handle hierarchical behavior
					if( this.model.Hierarchical ) {

						// add an indentation for each level of depth this item is in the tree
						for( var i = 0; i < item.depth; i++ ) {
							indent += '<span class="indenter"></span>';
						}

						// add collapse/expand button or extra space
						if( item.isLeaf )
							indent += '<span class="indenter"></span>';
						else
							indent += '<span class="indenter"><span class="ui-icon"></span></span>';

						// add NewSubValue button to item
						if( item.selectable && this.model.AllowAdding && !item.action ) {
							label += '<span class="mf-autocomplete-addSubItem ui-state-default ui-corner-all" title="Add sub-item" ><span class="ui-icon ui-icon-plus"></span></span>';
						}
					}
				}

				if( item.action ) {
					classes.push( "mf-autocomplete-item-action" );
					label = utilities.htmlencode( item.action, true );
				}

				// wrap label in <a> tag if it's selectable
				if( item.selectable )
					label = '<a>' + label + '</a>';
				else
					label = '<a class="ui-state-disabled">' + label + '</a>';

				return '<li id="' + item.path + '" class="' + classes.join( " " ) + '" title="' + title + '">' +
					indent + label + '</li>';
			
		},

		// Find tooltip for value list by value list item.
		getTooltipForLookup: function( valueListId, valueListItemId ) {

			// Check that new function exists. Retrive tooltip for value list item.
			var title = '';
			if( typeof this.options.metadatacard.getValueListTooltip === 'function' ) {
				title = this.options.metadatacard.getValueListTooltip( valueListId, valueListItemId );
			}

			// Return found tooltip.
			if( title !== null )
				return title;
			else
				return '';
		},

		// collapse/expand a parent value list item
		toggleItemCollapse: function( li, collapse, justOpened ) {

			// Detect right-to-left layout.
			var rtl = ( $( "html.mf-rtl" ).length > 0 ) ? true : false;

			// resolve parent item data
			var item = li.data( "ui-autocomplete-item" ),
				child, last;

			if( item ) {

				// if no collapsed state was passed, toggle current state
				if( collapse === undefined ) {
					if( item.collapsed === undefined )
						if( justOpened )
							collapse = this.openClicked;
						else
							collapse = !this.expandedItemCache[item.path];
					else
						collapse = !item.collapsed;

				} else if( item.collapsed == collapse ) {

					// call to put the item in it's current state
					// we can safely ignore
					return;

				}

				// update state in item data
				item.collapsed = collapse;

				// update visual appearance with classes
				li.toggleClass( "mf-autocomplete-item-collapsed", collapse );
				li.find( ".indenter  .ui-icon" )
					.toggleClass( rtl ? "ui-icon-triangle-1-sw" : "ui-icon-triangle-1-se", !collapse )
					.toggleClass( rtl ? "ui-icon-triangle-1-w" : "ui-icon-triangle-1-e", collapse )

				// add/remove child elements based on whether the item is collapsed
				if( collapse ) {

					delete this.expandedItemCache[item.path];

					// remove all child elements
					li.nextAll().each( function() {
						var id = $( this ).attr( "id" );

						// Added + "_" to item path to prevent going through items that have similar path, but are actually on
						// the same level as the item (such as "_6" and "_66"). This fixes the tracker issue: 40821.
						if( id.indexOf( item.path + "_" ) === 0 )
							$( this ).remove();
						else
							return false; // breaks the loop
					} );

				} else {

					this.expandedItemCache[item.path] = true;

					last = li;

					// Load children.
					if( item && item.object )
						for( var i in item.object.ChildItems ) {
							child = utilities.createLookupValue( item.object.ChildItems[i], item );
							last = $( this.renderItem( child ) ).insertAfter( last ).data( "ui-autocomplete-item", child );
							last = this.toggleItemCollapse( last, undefined, justOpened ) || last;
						}

					// make sure we accomodate icons if the children introduce them
					if( this.showIcons )
						li.closest( "ul" ).removeClass( "no-icons" );
					this.showIcons = false;
				}

			}

			return last;

		},


		// for hierarchical value lists...
		// makes sure an item's parents are all expanded so it's visible in the list
		expandToItem: function( menu, val ) {

			// resolve item data
			var item,
				parents = [],
				path = "",
				parent, toSelect, i, j;

			if( this.model.PropertyDef == 100 ) {

				// resolve class group parent for class value
				for( i in this.selectionListHandler.selectionList.Items ) {
					parent = this.selectionListHandler.selectionList.Items[i];

					// see if top level item is the class in question
					if( parent.Selectable && parent.Value.Item == val.Item ) {
						item = parent;
						break;
					}

					// check if top level item has our class as one of its children
					for( j in parent.ChildItems ) {
						item = parent.ChildItems[j];
						if( item.Value.Item == val.Item ) {
							parents.unshift( parent );
							break;
						}
					}

					// if we've found a parent stop our search
					if( parents.length )
						break;
				}

			} else {

				// If this is not unvalidated (empty) value, resolve all parents.
				if( !( typeof val.IsUnvalidated != "undefined" && val.IsUnvalidated ) ) {

					// Resolve all parents.
					item = this.model.FindItemByID( val.Item )

					while( item && item.HasParent ) {
						item = this.model.FindItemByID( item.ParentID );
						parents.unshift( item );
					};
				}
			}

			// from the top, walk down the parents list making sure they're expanded
			for( i = 0; i < parents.length; i++ ) {
				path += "_" + parents[i].Value.Item;
				parent = menu.element.find( "#" + path );
				if( parent.length )
					this.toggleItemCollapse( parent, false );
				else
					break;
			}

			// after expanding all parents, try to select the original value
			path += "_" + val.Item
			toSelect = menu.element.find( "#" + path );

			if( toSelect.length )
				menu.focus( null, toSelect );

		},

		// allows lookupcontrolcontainer to pass model reference to this control
		setModel: function( model ) {
			this.model = model;

			// Update the identifier class.
			this.updateIdentifier();

			// Mark all tems as not found.
			this.isCompletedItemFound = false;
			this.isRejectedItemFound = false;

			// Add action items if the model supports them.
			if( this.model ) {

				// Get action items.
				/*var items = this.model.GetSelectableValueItemStates();

				// Enable each item if it is found from the array. 
				for( var index in items ) {
					if( items[index] == this.COMPLETED_OR_APPROVED_ITEM_ID )
						this.isCompletedItemFound = true;
					else if( items[index] == this.REJECTED_ITEM_ID )
						this.isRejectedItemFound = true;
				}*/
			}
		},

		// updateIdentifier.
		updateIdentifier: function() {

			if( this.model ) {

				// Update identifier of the actual control.
				var element = this.element.find( ".mf-internal-text" ).first();
				var prefix = this.options.ispropertyselector ? "selector" : this.model.PropertyDef;
				utilities.setIdentifierClass( element, this.options.editmode, prefix, this.lookupIndex );

				// Update identifier of the button which is used to open the dropdown list.
				var openButton = this.element.find( ".mf-internal-openlink" );
				if( openButton.length ) {

					// Remove possible old identifier class.
					var classList = openButton.attr( "class" ).split( /\s+/ );
					$.each( classList, function( index, item ) {

						// Check if this is old identifier class.
						if( item.indexOf( "mf-property-" + prefix + "-openbutton-" ) == 0 ) {

							// Remove the class.
							openButton.removeClass( item );
						}
					} );

					// Add a new class to identify the element.
					openButton.addClass( "mf-property-" + prefix + "-openbutton-" + this.lookupIndex );
				}
			}
		},

		// updateLookupIndex.
		updateLookupIndex: function( lookupIndex ) {

			this.lookupIndex = lookupIndex;
			this.updateIdentifier();
		},

		updateInfo: function( searching ) {

			this.searching = searching ? true : false;

			if( !this.selectionListHandler )
				return;

			var list = this.selectionListHandler.selectionList,
				loc = this.options.localization,
				info = $( ".mf-autocomplete-info" ),
				input = this.element.find( ".mf-internal-text" ),
				visible = searching,
				baseMsg = "",
				html = "",
				data;

			// create info panel if it doesn't exist
			if( !info.length )
				info = $( '<div class="mf-autocomplete-info ui-widget ui-widget-content ui-corner-all" ></div>' ).appendTo( "body" ).bind( "click mousedown mouseup", function( event ) {
					event.preventDefault();
					event.stopImmediatePropagation();
				} );

			// check if we're searching
			if( searching ) {

				// show searching info
//HKo			html = utilities.htmlencode( loc.strings.IDS_CONTROLHELPER_DROPDOWN_SEARCHING_INDICATOR );
				html = utilities.htmlencode( "Searching...");

			} else if( this.listIsOpen ) {

				// we're not searching, but the list is open, let's resolve what should be displayed

				// show message if we're filtering the list based on another property's value
				if( list.FilteringValue.length > 0 ) {
					visible = true;

					if( list.FilteringValue.length > 100 ) {

						// Truncate too long text.
						html += "<div class='ui-corner-all'>" + utilities.htmlencode( list.FilteringValue.slice( 0, 100 ) + "..." ) + "</div>";
					}
					else {
						// Show text.
						html += "<div class='ui-corner-all'>" + utilities.htmlencode( list.FilteringValue ) + "</div>";
					}
				}

				// show a message if the results have been limited
				if( list.MoreResults ) {
					visible = true;

					if( list.Filter )
						baseMsg = loc.strings.IDS_CONTROLHELPER_DROPDOWN_SEARCHING_FIRST_X_SUGGESTIONS;
					else
						baseMsg = loc.strings.IDS_CONTROLHELPER_DROPDOWN_FIRST_X_VALUES;

					html += "<div class='ui-corner-all'>" + utilities.htmlencode( loc.replacePlaceholder( baseMsg, list.Items.length ) ) + "</div>";
				}

				// Shows the  message to user "the result has more record and try with minimum filter limit",
				// if result has more record then system can be processed. 
				if( this.model.IsHasMoreRecordWithFilter ) {
					visible = true;
					baseMsg = loc.strings.IDS_VALUELIST_FILTER_MINIMUM_LIMIT_MESSAGE;
					msg = loc.replacePlaceholder( baseMsg, this.model.MinimumFilterLimitForVaultList );
					html += "<div class='ui-corner-all'>" + utilities.htmlencode( msg ) + "</div>";
				} else if( !this.openClicked && utilities.comArrayEmpty( list.Items ) ) {
					visible = true;
					html += "<div class='ui-corner-all'>" + utilities.htmlencode( loc.strings.IDS_CONTROLHELPER_DROPDOWN_NO_MATCHES_FOUND ) + "</div>";
				}
			}


			// layout the info panel if it should be visible
			if( visible ) {

				// default position, on the bottom
				info.html( html )

				var offset = input.offset();
				var inputHeight = input.outerHeight()
				var infoHeight = info.outerHeight();
				var infoPos = {
					"top": offset.top + input.outerHeight(),
					"left": offset.left,
					"bottom": "",
					"minWidth": this.element.find( ".mf-internal-text" ).outerWidth() - ( info.outerWidth() - info.width() )
				}

				// adjust the option list layout if necessary
				if( this.listIsOpen ) {

					var autocomplete = input.data( "uiAutocomplete" );
					if( autocomplete ) {

						var menu = autocomplete.menu.element;
						if( searching ) {

							// don't show the menu if we're searching
							menu.hide();

						} else {

							var menuPos = {
								maxHeight: parseInt( menu.css( "maxHeight" ) ) - infoHeight
							}
							var top = parseInt( menu.css( "top" ) );


							if( top ) {
								menuPos.top = top + infoHeight;

							} else {
								infoPos.bottom = parseInt( menu.css( "bottom" ) );
								infoPos.top = "";
								menuPos.bottom = infoPos.bottom + infoHeight - 2;
							}

							menu.show().css( menuPos );
							//infoPos.width = menu.outerWidth() - ( info.outerWidth() - info.width() );

						}

					}

				}
				info.css( infoPos );

			} else {

				$( ".mf-autocomplete-info" ).remove();
			}

		},

		// Returns true if searching is in progress.
		isSearching: function() {

			return this.searching;
		},

		// Resets searching info.
		resetSearchingInfo: function( update ) {

			// Remove searching info.
			this.updateInfo();

			// Ensure that the control text and value is up-to-date, too.
			if( update ) {

				if( !this.options.multiselect ) {

					// SSLU.
					this.lookupText = "";
					this.lookupValue = null;
					this.model.setValue( null );
				}
				else {
					// In case of MSLU, there is no need to reset values.
				}
			}
		},

		// Handles searching in background when focus has already moved to another control.
		handleBackgroundSearch: function( self, textFieldControl ) {

			// Result to return to caller.
			var result = { cancel: false };

			// TODO: This should work at least for SSLU/MSLU.
			// TODO: Check if this should work also for single click, property selector, and class selector controls.

			// Ensure that autocomplete menu is not open.
			if( !self.listIsOpen ) {

				// Get current value from the text field.				
				var val = textFieldControl.val();
				var equal = false;
				if( val != "" ) {

					//	If text equals to the value in the model, no need to do anything.
					if( !self.options.multiselect && self.model && self.model.getValue() && self.model.getValue().Name === val )
						equal = true;
					else if( self.options.multiselect && self.lookupValue && !utilities.isMultiValue( self.lookupValue ) && self.lookupValue.Name == val )
						equal = true;

					// If text has been changed, start auto select. 		
					if( !equal ) {

						// Start auto select.		
						if( self.selectionListHandler )
							self.selectionListHandler.startAutoSelect( val );

						// TODO:
						// Ensure that new items are not added to the list.
					}
				}
			}

			// Return result. If result.cancel is true, caller should cancel default operation,
			// e.g. moving current control to view mode.
			return result;
		},

	} );  // end of lookupcontrol widget.

} )( jQuery );
