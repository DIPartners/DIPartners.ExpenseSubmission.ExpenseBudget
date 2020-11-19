﻿(function( utilities, $, undefined ) {

	// Default values.
	utilities.useLog = false;

	// log.
	utilities.log = function( message, showTimestamp ) {

		if( utilities.useLog ) {
		
			if( !utilities.currentTime || utilities.currentTime == 0 ) {

				if( showTimestamp )
					message += " 0 ms";
				utilities.currentTime = +new Date();
				utilities.startTime = utilities.currentTime;
			}
			else {

				var newDate = +new Date();
				var delta = newDate - utilities.currentTime;
				utilities.currentTime = newDate;
				if( showTimestamp )
					message += " " + delta + " ms";
			}
		
			var content = $( "#debug" ).html();
			content += message;
			
			if( showTimestamp )
				content += "<br>Total: " + ( utilities.currentTime - utilities.startTime ) + " ms";
			
			$( "#debug" ).html( content + "<br>" );
		}
	};

	/// <summary>
	/// Checks if chrome browser.
	/// </summary>
	/// <returns type="Boolean">
	///     True if chrome browser, False otherwise.
	/// </returns>
	utilities.isChromeBrowser = function() {
		return ( /chrom(e|ium)/ ).test( navigator.userAgent.toLowerCase() );
	};

	/**
	* Gets chrome browser version.
	*
	* @return {integer} - Chrome browser version.
	**/
	utilities.getChromeBrowserVersion = function() {

		// Holds the chrome browser version information in array which contains third parameter as version.
		// Third value in the array points to the version.
		var chromeBrowserVersion = navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ );

		// Checks chrome browser version is not null.
		if( chromeBrowserVersion )
			return parseInt( chromeBrowserVersion[ 2 ] );
		else
			return 0;
	}

	/// <summary>
	/// Checks if firefox browser.
	/// </summary>
	/// <returns type="Boolean">
	///     True if firefox browser, False otherwise.
	/// </returns>
	utilities.isFireFoxBrowser = function() {
		
		// Checks firefox's API to install add-ons: InstallTrigger and decides.
		return ( typeof InstallTrigger !== 'undefined' );
	};

	/// <summary>
	/// Checks it is edge browser browser.
	/// </summary>
	/// <returns type="Boolean">
	///		Returns true if edge browser else false. 
	/// </returns>
	utilities.isEdgeBrowser = function () {
		if( navigator.appVersion.indexOf( 'Trident' ) === -1 )
			return true;
		else
			return false;
	};

	/**
	 * Creates artificial click for InputText or TextArea control in case of FireFox browser.
	 * @param { Jquery Object } - container - A div contains either a Input-Text control or TextArea.
	 */
	utilities.bindClickOnDisabledInputControl = function( container ) {
		
		// The artificial click needed for Firefox and edge browser so checks for it.
		if( this.isFireFoxBrowser() || this.isEdgeBrowser() ) {

			var overlay = null;
			
			// Gets input control exist to set overlay.
			var inputControl = container.find( "input" );

			// Checks if the input control, otherwise looks for textarea.exist to set overlay.
			if( inputControl.length !== 1 )
				inputControl = container.find( "textarea" );

			// Either InputText or TextArea control identified to set overlay.
			if ( inputControl.length === 1 ) {

				// Constructs the overlay div to be set ontop of the control.
				var overlayString = '<div style="position:absolute;"></div>';
				overlay = $( overlayString );

				// Sets the position and height, width to exactly set on top of the control.
				function setOverlayPosition() {
					overlay.offset( inputControl.offset() );
					overlay.width ( inputControl.outerWidth() );
					overlay.height ( inputControl.outerHeight() );
				}

				// Removes the overlay and the events added for this artificial click.
				function removeOverlay() {
					overlay.remove();
					inputControl.unbind( "focus", removeOverlay );
					$( window ).unbind( "resize", resize );
				}

				// Resizes the overlay by refering the control.
				function resize() {
					setOverlayPosition();
				}

				// When ever the window / documentCard is resized, the control size and position
				// is changed. So overlay's position and width needs to be changed accordingly.
				$( window ).on( "resize", resize );

				// Removes overlay when it is no more needed.
				// When focus to the control is happend, that means artificial click is successful and
				// Overlay is not needed any more.
				inputControl.focus( removeOverlay );

				// Adds the overlay at the container where the control resides.
				container.append( overlay );

				// Sets exact location and size of the control to overlay so that it is resides on top of it.
				setOverlayPosition();
			}
		}
	};

	/// <summary>
	/// Checks is access from browser.
	/// </summary>
	/// <returns type="Boolean">
	/// 	True if browser, False otherwise.
	/// </returns>
	utilities.isBrowser = function () {
		return ( navigator.userAgent )? true: false;
	}
	utilities.logOn = function() {
		utilities.useLog = true;
	};

	utilities.logOff = function() {
		utilities.useLog = false;
	};
	
	utilities.clearLog = function() {
	
		if( utilities.useLog ) {
			utilities.currentTime = 0;		
			$( "#debug" ).html( "" );
		}
	};

	utilities.getSelection = function(){

		// rangy is a polyfill solution used to support IE-8.
		return window.parent.getSelection ? window.parent.getSelection() : rangy.getSelection();
	}
	
	utilities.setUpdatingState = function( state ) {
		utilities.updatingState = state;
	};
	
	utilities.isUpdatingAll = function() {
		return utilities.updatingState;
	};
	
	utilities.setEditor = function( editor ) {
		utilities.editor = editor;
	}
	
	utilities.resumeEvents = function() {
	
		// TODO: Use this when available.
		//if( utilities.editor )
		//	utilities.editor.ResumeEvents();
	};
	
	// createSelectionListHandler.
	utilities.createSelectionListHandler = function( lookupControl ) {
	
		var selectionListHandler = {
			selectionList: "test list",//lookupControl.model.CreateSelectionList(),
			requestQueue: [],
			nextToken: 1,
			preventValueAdding: false,
			lookupControl: lookupControl,
			requestSearch: function( term, response, addEmptyValue, openClicked ) {	
			
				// Put callback function to queue and start searching by setting filter.
				var token = this.nextToken++;
				this.requestQueue.push( {
					response: response,
					emptyvalue: addEmptyValue,
					token: token,
					openclicked: openClicked,
					term: term
				} );
				this.selectionList.SetFilter( term, token );
			},
			startAutoSelect: function( term ) {
				
				// If there are any pending items in the queue, remove them.
				while( this.requestQueue.length > 0 ) {

					// Complete request with an empty list.
					this.requestQueue.shift().response( [] );
				}
				
				// Set flag which prevents unwanted "add value"-dialogs when we move from edit mode to view mode.
				// Reset flag when we are in view mode.
				this.preventValueAdding = true;
				
				// TODO: Suspend events of this selection list.
				// this.selectionList.SuspendEvents();
				
				// TODO: Set filter to match to written text.
				// this.selectionList.setFilter( term, 0 );
				
				// TODO: Start autoselect
				// this.selectionList.AutoSelect( term, this.lookupControl.model.Id );
				
				// TODO: Ensure that we won't change model before auto-select is completed.
			},
			unregisterEvents: function() {
				
				if( this.lookupControl.eventHandle_selectionListItemsUpdated !== undefined ) {
				
					try {
						this.selectionList.Events.UnRegister( this.lookupControl.eventHandle_selectionListItemsUpdated );
					}
					catch( ex ) {}
					this.lookupControl.eventHandle_selectionListItemsUpdated = undefined;
				}
			},
			viewModeReached: function() {
				this.preventValueAdding = false;
			}					
		};
		return selectionListHandler;
	};

	// registerControlEvents.
	utilities.registerControlEvents = function( control, model, metadatacard, callbackFunction ) {

		if( control.eventHandle_valueChanged === undefined ) {

			// Register to listen ValueChanged events.
			control.eventHandle_valueChanged = model.Events.Register( MFiles.Event.ValueChanged, function() {
				callbackFunction();
			} );
		}
		else
			throw new Error( "Event ValueChanged already registered." );

		if( control.eventHandle_valueValidationError === undefined ) {

			// Register to listen ValueValidationError events.
			control.eventHandle_valueValidationError = model.Events.Register( MFiles.Event.ValueValidationError, function( errorMessage, requestAttention ) {
			
				// Show error to user.
				var isClassSelector = ( model.isClassSelector ) ? true : false;
				metadatacard.setError( errorMessage, model.Id, isClassSelector );

				// Set the focus if an attention is requested.
                if( requestAttention ) {

                    // Return focus back to control.
				    if( control.options.editmode ) {

					    control.element.basecontrol( "captureFocus", true, true );
				    }
				    else {

					    // Set control to edit mode.
					    control.options.requesteditmode( control );
                    }

				    // Change view if needed.
				    metadatacard.changeViewBasedOnProperty( model.PropertyDef );
				}

				// Returning true skips error propagation.
				return true;
			} );
		}
		else
			throw new Error( "Event ValueValidationError already registered." );
	};

	// unregisterControlEvents.
	utilities.unregisterControlEvents = function( control, model ) {

		// Unregister valueChanged event.
		if( control.eventHandle_valueChanged !== undefined ) {
			
			try {
				model.Events.UnRegister( control.eventHandle_valueChanged );
			}
			catch( ex ) {}
			control.eventHandle_valueChanged = undefined;
		}

		// Unregister ValueValidationError event.
		if( control.eventHandle_valueValidationError !== undefined ) {
		
			try {
				model.Events.UnRegister( control.eventHandle_valueValidationError );
				}
			catch( ex ) {}
			control.eventHandle_valueValidationError = undefined;
		}
	};

	// registerSelectionListEvents.
	utilities.registerSelectionListEvents = function( control, model, metadatacard ) {

		// Register selection list events.
		if( control.eventHandle_selectionListItemsUpdated === undefined )
			control.eventHandle_selectionListItemsUpdated = control.selectionListHandler.selectionList.Events.Register( MFiles.Event.SelectionListItemsUpdated, function( token, successful ) {

				// Call the callback handlers of all older requests with an empty list.
				// We don't want to process the results from those older requests if they complete after us.
				// However, we must not remove the handlers of newer requests.
				var values = [];
				var queue = control.selectionListHandler.requestQueue;
				while( queue.length >= 1 && queue[ 0 ].token < token ) {

					// The first item in the queue is an older request. Complete it with an empty list.
					queue.shift().response( [] );
				}

				// Now the queue can be empty, or may or may not contain our request and/or some newer requests.
				// If our request is in the queue, it is the first item.
				var request = undefined;
				var addEmptyItem = false;
				if( queue.length >= 1 && queue[ 0 ].token == token ) {
					addEmptyItem = queue[ 0 ].emptyvalue;
					request = queue.shift();
				}

				// Call the handler function to show returned values in the selection list.
				if( request !== undefined ) {

					// Was the request successful?
					if( successful ) {

						// The request was successful.
						
						// Get returned values.
						values = utilities.getValues( control.selectionListHandler.selectionList.Items );
						
						/* FOR TESTING */
						/*
						var value = {
									value: "testing...",
									object: item,
									selectable: true,
									depth: 0,
									isLeaf: true,
									path: "_"
								};
						values.push( value );
						values.push( value );
						*/

						// TODO: Check if we are in busy state and prevent operation if we are!!!
						
						// We are not in busy state.
						if( control.options.editmode ) {
							
							utilities.handleSelectionListEventInEditMode( values, model, control, addEmptyItem );
								
							// Call the response callback and provide it with the values that should be displayed to the user.
							request.response( values );
						}
						else {
							
							// Should not happen.	
						}
							
					}
					else {

						// The request failed.

						// Call the handler with empty values. TODO: Only if we are still in edit mode...
						// According to the documentation, the control expects the handler to be called in this case, too:
						//
						// "It's important when providing a custom source callback to handle errors during the request.
						// You must always call the response callback even if you encounter an error.
						// This ensures that the widget always has the correct state."
						request.response( [] );
					}
				}
				else {

					// We did not find our request in the queue. A newer request that has already completed
					// has probably removed it, which is fine.
				}

			} )
		else
			throw Error( "EventHandler already registered." );
	};
	
	utilities.handleSelectionListEventInEditMode = function( values, model, control, addEmptyItem ) {
	
		if( values.length < 1 ) {

			// Construct empty value if selectionList is empty because valuelist has more record.
			if( model.IsHasMoreRecordWithFilter ) {
				values.push( {
					object: null,
					selectable: false
				} );
			} else if( model.AllowAdding && control.selectionListHandler.selectionList.Filter ) {

				// Add option to add request if they've specified filter text
				var baseMsg = control.options.localization.strings.IDS_CONTROLHELPER_ADD_VALUE_COMMAND_TEXT;
				var msg = control.options.localization.replacePlaceholder( baseMsg, control.selectionListHandler.selectionList.Filter );
				values.push( {
					value: control.selectionListHandler.selectionList.Filter,
					object: null,
					selectable: true,
					action: msg
				} );

			} else {

				if( addEmptyItem )
					values.unshift( {
						value: "",
						object: null,
						selectable: true
					} );
				else
					values.push( {
						value: "",
						object: null,
						selectable: false
					} );
									
			}
		}
		else {
							
			if( addEmptyItem )
				values.unshift( {
					value: "",
					object: null,
					selectable: true
				} );
		}
	};
	
	// registerLookupControlEvents.
	utilities.registerLookupControlEvents = function( control, model, metadatacard, isMultiSelect, callbackFunctions ) {

		// Gets value from model. HKO
		var value = "";//model.getValue();

		// Branch by lookup control type.
		if( isMultiSelect ) {

			// In case of MSLU register events to listen changes of value collection.

			if( control.eventHandle_itemAdded === undefined ) {
				control.eventHandle_itemAdded = value.Events.Register( MFiles.Event.ItemAdded, function ( key, item, customData ) {
					callbackFunctions.added( key, item, customData );
				} );
			}
			if( control.eventHandle_itemRemoved === undefined ) {
				control.eventHandle_itemRemoved = value.Events.Register( MFiles.Event.ItemRemoved, function ( key, item, customData ) {
					callbackFunctions.removed( item );
				} );
			}
			if( control.eventHandle_itemReplaced === undefined ) {
				control.eventHandle_itemReplaced = value.Events.Register( MFiles.Event.ItemReplaced, function ( key, oldItem, newItem, customData ) {
					callbackFunctions.replaced( oldItem, newItem );
				} );
			}
			if( control.eventHandle_allItemsCleared === undefined ) {
				control.eventHandle_allItemsCleared = value.Events.Register( MFiles.Event.AllItemsCleared, function ( key, oldItem, newItem, customData ) {
					callbackFunctions.itemsCleared();
				} );
			}

		} else {

			// In case of SSLU register to listen valueChanged events.

			if( control.eventHandle_valueChanged === undefined ) {
				/*control.eventHandle_valueChanged = model.Events.Register( MFiles.Event.ValueChanged, function( oldValue, newValue ) {
					callbackFunctions.valueChanged( oldValue, newValue );
				} );*/
			}
		}

		// For both, register to listen to the iconChanged event.
		/*if( control.eventHandle_iconChanged === undefined ) {
			control.eventHandle_iconChanged = model.Events.Register( MFiles.Event.IconChanged, function() {
				callbackFunctions.iconChanged();
			} );
		}*/
		
		// For both, register to listen to the valueValidationError event.
		if (control.eventHandle_valueValidationError === undefined) {
			return true;

			// Register to listen ValueValidationError events.
			/*control.eventHandle_valueValidationError = model.Events.Register( MFiles.Event.ValueValidationError, function( errorMessage, requestAttention ) {
			
				// Validation error are not handled for workflow and state properties.
				if( model.PropertyDef == 38 || model.PropertyDef == 39 || model.PropertyDef == 99 )
					return false;

				// Show error to user.
				metadatacard.setError( errorMessage, model.Id );

				// Set the focus if an attention is requested.
                if( requestAttention ) {

				    // Return focus back to control.
				    if( control.options.editmode ) {

					    control.element.basecontrol( "captureFocus", true, true );
				    }
				    else {

					    // Set control to edit mode.
					    control.options.requesteditmode( control );
				    }

				    // Change view if needed.
				    metadatacard.changeViewBasedOnProperty( model.PropertyDef );
                }

				// Returning true skips error propagation.
				return true;
			} );*/
		}
	};

	// unregisterSelectionListEvents.
	utilities.unregisterSelectionListEvents = function( control ) {

		// Check that queue is empty.
		if( control.selectionListHandler.requestQueue.length !== 0 )
			alert( "ERROR: Queue not empty" );

		// Unregister events.
		if( control.eventHandle_selectionListItemsUpdated !== undefined )
			control.selectionListHandler.selectionList.Events.UnRegister( control.eventHandle_selectionListItemsUpdated );
	};

	// unregisterLookupControlEvents.
	utilities.unregisterLookupControlEvents = function( control, model ) {

		// Unregister events.

		if( control.eventHandle_itemAdded !== undefined )
			model.Events.UnRegister( control.eventHandle_itemAdded );

		if( control.eventHandle_itemRemoved !== undefined )
			model.Events.UnRegister( control.eventHandle_itemRemoved );

		if( control.eventHandle_itemReplaced !== undefined )
			model.Events.UnRegister( control.eventHandle_itemReplaced );

		if( control.eventHandle_allItemsCleared !== undefined )
			model.Events.UnRegister( control.eventHandle_allItemsCleared );

		if( control.eventHandle_valueChanged !== undefined )
			model.Events.UnRegister( control.eventHandle_valueChanged );

		if( control.eventHandle_iconChanged !== undefined )
			model.Events.UnRegister( control.eventHandle_iconChanged );
			
		if( control.eventHandle_valueValidationError !== undefined )
			model.Events.UnRegister( control.eventHandle_valueValidationError );
	};

	// Keyboard event handling code begins.

	// Variable to store information whether TAB-key was pressed and direction of focus (null, "forwards" or "backwards").
	utilities.tabDirection = null;

	// Reference to element without tabIndex.
	// Tab index should be added back to this element when previous control has received focus.
	utilities.elementWithoutTabIndex = null;

	// registerGlobalKeyboardHandler.
	utilities.registerGlobalKeyboardHandler = function( metadatacard ) {
	
		// Register keydown and keyup events.
		$( document ).keydown( function( event ) {

			// Handle tab-key.
			utilities.tabDirection = null;
			if( event.which === $.ui.keyCode.TAB ) {

				// Store focus direction. If SHIFT key is down, we are moving backwards, otherwise forwards.
				utilities.tabDirection = ( event.shiftKey ) ? "backwards" : "forwards";
			
				// Special handling for focus rotation is needed for popped out metadata card.
				// In popped out metadata card focus moves to native dialog from last focusable element if not handled otherwise.
				if( metadatacard.controller.editor.IsPoppedOut() ) {
			
					// If user has pressed Shift + Tab and focus is on first focus switcher, move focus to last focus switcher.
					// If user has pressed Tab and focus is on last focus switcher, move focus to first focus switcher.
					if( utilities.tabDirection === "backwards" && $( ".first-focus-switcher" ).is( ":focus" ) )
						$( ".last-focus-switcher" ).focus();
					else if( utilities.tabDirection === "forwards" && $( ".last-focus-switcher" ).is( ":focus" ) )
						$( ".first-focus-switcher" ).focus();
				}

				// If metadata card is busy (=all controls are not yet completely in edit-mode), prevent handling of tab key.
				if( metadatacard.isBusy ) {

					// Prevent default action.
					event.preventDefault();

					// Prevent the event from bubbling up the DOM tree,
					// preventing any parent handlers from being notified of the event. 
					event.stopPropagation();

				} else if( metadatacard.activeControl && utilities.getSelection().rangeCount ) {

					// if there is an active control (in editmode), but there is a text selection outside of it, just return focus to it 
					var range = utilities.getSelection().getRangeAt(0);
					if( !range.collapsed && $(range.startContainer).closest(metadatacard.activeControl.element).length == 0 ) {						
						event.preventDefault();
						event.stopPropagation();

						// add delay to support rendering in IE-8
						setTimeout( function() {
							metadatacard.activeControl.element.find("input, select, textarea").first().focus().select();
						}, 0 );
					}

				}

			}
			else if( event.which === 27 ) {
			
				// Handle escape key.
				
				// Handle escape only if metadata card is popped out.
				if( metadatacard.widgetName == "filetypeselector" || ( metadatacard.controller.editor.IsPoppedOut() && !metadatacard.anyControlInEditMode ) ) {
				
					// Discard metadata.
					metadatacard.discard();
				}
			}

		} ).keyup( function( event ) {

			// Stop focus rotation when any key is released.
			utilities.tabDirection = null;
		} );
		
	};

	// registerKeyboardEvents.
	utilities.registerKeyboardEvents = function( element, control, editManager, isPropertySelector, isLookupControl, isMultiSelectLookup, isMultilineText, metadatacard, model ) {

		// Register keydown event.
		element.keydown( function( event ) {

			if( event ) {

				// Check if key is Esc.
				// The source of key event can be any control inside single property line.
				// In case of Esc-key we ignore current value and cancel edit-mode.
				if( event.which === $.ui.keyCode.ESCAPE ) {

					// Handle Escape-key.
					// Ignore current value and cancel edit-mode.
					utilities.doEscape( event, element, control, metadatacard, model );
					return;
				}

				// Stop edit-mode by Enter-key and try to accept current value.
				// Enter-key is handled internally by property selector and multiline-text control and
				// should not be handled here. Note that if multiline-text control is disabled,
				// Enter-key should be handled here to make it possible to exit control by Enter.
				var acceptEnter = ( isPropertySelector || ( isMultilineText && !control.mfmultilinetextcontrol( "isDisabled" ) ) ) ? false : true;
				if( acceptEnter && event.which === $.ui.keyCode.ENTER ) {

					// Prevent default action.
					event.preventDefault();

					// Perform actual operation within another context.
					setTimeout( function() {

						// Try to accept current value and set the control to view-mode.
						editManager.requestEditMode( null );
					}, 0 );
				}

				// Ctrl + D or Alt + D deletes the current control if the property is not mandatory.
				if( event.which === 68 && ( event.ctrlKey || event.altKey ) && !model.MustExist ) {

					// In case of MSLU, Ctrl + D deletes whole control only if we are in view mode.
					// In edit mode Ctrl + D deletes individual fields in MSLU (this functionality
					// is implemented inside lookup control). When last individual fields is removed,
					// MSLU changes automatically to view mode and next Ctrl/Alt + D key presses
					// are handled here.
					if( isMultiSelectLookup ) {

						// Delete MSLU control only in view mode.
						if( !control.mfmultiselectlookupcontrol( "inEditMode" ) )
							utilities.doDelete( event, element, metadatacard, model );

					} else {

						// Delete control.
						utilities.doDelete( event, element, metadatacard, model );
					}
				}

				// Handle tab-key.
				if( event && event.which === $.ui.keyCode.TAB ) {

					// If user keeps shift-key down, focus is moving backwards. 
					if( event.shiftKey ) {

						// Remove tab index from parent control to prevent it receiving focus.
						// This way focus moves immediately to previous property's parent control.
						element.removeAttr( "tabindex" );

						// Store reference to element. Tabindex will be inserted again to this element when previous control has received focus.
						if( utilities.elementWithoutTabIndex === null )
							utilities.elementWithoutTabIndex = element;
						else if( utilities.elementWithoutTabIndex !== element ) {

							// Error: This should never happen!!
							// alert( "Duplicate elements without tab index: " + utilities.elementWithoutTabIndex.attr( "class" ) );
						}
					}
					
					// Inform configuration manager about pressed TAB key.
					metadatacard.configurationManager.onTabPressed( event, model.PropertyDef );
				}

			}

		} );

		// Register focus event.	
		element.focus( function() {

			// Check whether we got keyboard focus by Tab (or Shift + Tab) key.
			// If yes, user has pressed TAB-key and keyboard focus has been moved to container control of this property.
			// In this case we should move actual control inside property line to edit mode.
			// If not, focus has been received here because current control has stopped edit mode.
			// In this case we don't do anything.
			if( utilities.tabDirection !== null ) {

				try {

					// Check if we are in edit mode.
					var inEditMode = control.basecontrol( "inEditMode" );
					if( !inEditMode ) {
					
						// Set control to edit mode only if it is currently in view mode.
						// Normally control should always be in view mode before element gets focus.
						// Exception to this is e.g. that tabulator is pressed down to rotate focus and user clicks some control.
					
						// Set tabindex back to previous element.	
						if( utilities.elementWithoutTabIndex !== null ) {
							utilities.elementWithoutTabIndex.attr( "tabindex", "0" );
							utilities.elementWithoutTabIndex = null;
						}

						// Set metadatacard to busy.
						// This is done to prevent asynchronous execution of following Tab-key events (if user holds tab-key pressed down).
						// If we allow execution of these events before control is completely in edit-mode,
						// this might cause controls to stay in inconsistent state.
						metadatacard.isBusy = true;

						// Click actual control to set it to edit mode. This moves keyboard focus to actual control immediately.
						// Add delay to let IE-8 processing earlier events and delay control rendering 
						var ieVersion = utilities.getIEVersion();
						var delay =  ieVersion === "7" || ieVersion === "8" ? 500 : 0;
						setTimeout( function() {
								control.click();
							}, delay
						);
					}
				}
				catch( ex ) {}	
				
			}
			
		} );
	};

	// unregisterKeyboardEvents.
	utilities.unregisterKeyboardEvents = function( element ) {

		// Unbind keydown event.
		element.unbind( "keydown" );

		// Unbind focus event.	
		element.unbind( "focus" );
	};

	// doEscape.
	utilities.doEscape = function( event, element, control, metadatacard, model ) {
	
		// Prevent default action.
		event.preventDefault();

		// Start timeout to perform actual operation within another context.
		setTimeout( function() {

			// Remove focus from actual input control (if there is focused input control)
			// by setting focus for this property line.
			element.focus();

			// Start timeout to cancel edit-mode of current UI control.
			setTimeout( function() {

				// Cancel edit-mode of current UI control.
				control.trigger( "stopEditing", { isCancel: true, setFocusToParent: false } );

				// Remove busy-status from metadata card.
				metadatacard.isBusy = false;

				// Clear error message.
				var isClassSelector = ( model.isClassSelector ) ? true : false;
				metadatacard.setError( null, model.Id, isClassSelector );
				
				// Try to set metadata card to view mode. If model has modified values, the card stays in edit mode.
				metadatacard.setControlState( false, true, true );
				
				// Resume events which are generated by auto-select.
				utilities.resumeEvents();
				
				// Unselect previously selected description control.
				utilities.selectDescriptionControl( control, false );

			}, 0 );

		}, 0 );
	};

	// doDelete.
	utilities.doDelete = function( event, element, metadatacard, model ) {

		// Prevent default action.
		event.preventDefault();

		// Keep the rest of the handlers from being executed and prevent the event from bubbling up the DOM tree.
		event.stopPropagation();

		// Delete control.
		setTimeout( function() {

			// Remove focus from actual input control (if there is focused input control)
			// by setting focus for this property line.
			element.focus();

			// Remove control from model. Actual UI control is removed by event which is sent when model changes.
			metadatacard.removeProperty( model, true );

			// TODO: Set focus to next or previous control only if removed control had focus.

		}, 0 );

	};

	// Keyboard event handling code ends.
	
	// getValues.
	utilities.getValues = function( items, parentValue ) {

		var values = [];
		for( var i in items ) {
			values.push( utilities.createLookupValue( items[i], parentValue ) );
		}
		return values;
	};

	utilities.createLookupValue = function( item, parentValue ) {
		var value = {
			value: item.Value.Name,
			object: item,
			selectable: item.Selectable,
			depth: 0,
			isLeaf: !item.ChildItems.length,
			path: "_" + item.Value.Item
		};

		if( parentValue ) {
			value.depth = parentValue.depth + 1
			value.path = parentValue.path + value.path;
		}
		return value;

	};

	utilities.comArrayEmpty = function( a ) {
		for( var i in a ) {
			return false;
		}
		return true;
	}



	// getDatatypeByClass.
	utilities.getDatatypeByClass = function( element ) {

		var dataType = -1;
		if( $( element ).hasClass( "mf-text" ) )
			dataType = 1; //MFDatatypeText;
		else if( $( element ).hasClass( "mf-multilinetext" ) )
			dataType = 13; //MFDatatypeMultiLineText;
		else if( $( element ).hasClass( "mf-lookup" ) )
			dataType = 9; //MFDatatypeLookup;
		else if( $( element ).hasClass( "mf-multiselectlookup" ) )
			dataType = 10; //MFDatatypeMultiSelectLookup;
		else if( $( element ).hasClass( "mf-date" ) )
			dataType = 5; //MFDatatypeDate;
		else if( $( element ).hasClass( "mf-time" ) )
			dataType = 6; //MFDatatypeTime;
		else if( $( element ).hasClass( "mf-timestamp" ) )
			dataType = 7; //MFDatatypeTimestamp;
		else if( $( element ).hasClass( "mf-integer" ) )
			dataType = 2; //MFDatatypeInteger;
		else if( $( element ).hasClass( "mf-floating" ) )
			dataType = 3; //MFDatatypeFloating;
		else if( $( element ).hasClass( "mf-boolean" ) )
			dataType = 8; //MFDatatypeBoolean;
		else
			throw "utilities.getDatatypeByClass: Class not found";
		return dataType;
	};

	// getDatatypeByEditorType.
	utilities.getDatatypeByEditorType = function( editorType ) {

		var dataType = -1;
		if( editorType == "boolean" ) {
			dataType = 8;
		} else if( editorType == "text" ) {
			dataType = 1;
		} else if( editorType == "multiline-text" ) {
			dataType = 13;
		} else if( editorType == "date" ) {
			dataType = 5;
		} else if( editorType == "time" ) {
			dataType = 6;
		} else if( editorType == "timestamp" ) {
			dataType = 7;
		} else if( editorType == "integer" ) {
			dataType = 2;
		} else if( editorType == "floating-point" ) {
			dataType = 3;
		} else if( editorType == "choice" ) {
			dataType = 9;
		} else if( editorType == "multi-choice" ) {
			dataType = 10;
		} else {
			alert( "Invalid editorType: " + editorType );
		}
		return dataType;
	};

	// dataTypeToClass.
	utilities.dataTypeToClass = function( dataType ) {

		// Convert data type to class.
		var className = null;
		if( dataType == 1 ) // MFDatatypeText
			className = "mf-text";
		else if( dataType == 13 ) // MFDatatypeMultiLineText
			className = "mf-multilinetext";
		else if( dataType == 9 ) // MFDatatypeLookup
			className = "mf-lookup";
		else if( dataType == 10 ) // MFDatatypeMultiSelectLookup
			className = "mf-multiselectlookup";
		else if( dataType == 5 ) // MFDatatypeDate
			className = "mf-date";
		else if( dataType == 6 ) // MFDatatypeTime
			className = "mf-time";
		else if( dataType == 7 ) // MFDatatypeTimestamp
			className = "mf-timestamp";
		else if( dataType == 2 ) // MFDatatypeInteger
			className = "mf-integer";
		else if( dataType == 3 ) // MFDatatypeFloating
			className = "mf-floating";
		else if( dataType == 8 ) // MFDatatypeBoolean
			className = "mf-boolean";
		else
			throw "Unknown datatype: " + dataType;
		return className;
	};

	// uniqueArray.
	utilities.uniqueArray = function( arr ) {

		// Remove duplicate values and return new unique array.
		var self = utilities;
		var temp = [];
		for( var i = 0; i < arr.length; i++ ) {
			if( !self.contains( temp, arr[i] ) ) {
				temp.length += 1;
				temp[temp.length - 1] = arr[i];
			}
		}
		return temp;
	};

	// contains.
	utilities.contains = function( arr, value ) {

		// Check if array already contains the value.
		for( var i = 0; i < arr.length; i++ )
			if( arr[i] == value )
				return true;
		return false;
	};

	// isMultiValue.
	utilities.isMultiValue = function( value ) {

		if( value == null || value == undefined )
			return false;

		// Check if value is MultiValue.
		if( typeof value.IsMultiValue != "undefined" && value.IsMultiValue )
			return true;
		return false;
	};
	
	// assigneeState.
	utilities.assigneeState = function( value ) {

		if( value == null || value == undefined )
			return -1;
									
		// Check if value we have property for assignee state.
		if( typeof value.State != "undefined" ) {
			return value.State;
		}	
		return -1;
	};

	// htmlencode.
	utilities.htmlencode = function( text, convertNewLine ) {

		// Handle null and undefined values.
		if( text == null || text == undefined )
			return "";
	
		// Encode value.
		var result = text.replace( /[&<>"']/g, function( $0 ) {
			return "&" + { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39"}[$0] + ";";
		} );

		// Convert also "new line" if requested.	
		if( convertNewLine )
			result = result.replace( /\n/gi, "<br />" );

		// return encoded value;
		return result;
	};
	
	// setIdentifierClass.
	utilities.setIdentifierClass = function( element, inEditMode, propertyDef, index ) {

		// Remove possible old identifier classes.
		var classList = element.attr( "class" ).split(/\s+/);
		$.each( classList, function( index, item ){
		
			// Check if this is old identifier class.
			if( item.indexOf( "mf-property-" + propertyDef + "-input-" ) == 0  || item.indexOf( "mf-property-" + propertyDef + "-text-" ) == 0 ) {
			
				// Remove the class.
				element.removeClass( item );
			}
		} );
			
		// Add a new class to identify the element.
		if( inEditMode )
			element.addClass( "mf-property-" + propertyDef + "-input-" + index );
		else
			element.addClass( "mf-property-" + propertyDef + "-text-" + index );
	};
	
	// removeQuotes.
	utilities.removeQuotes = function( text ) {

		// Remove quotes.
		return text.replace( /["']/g, function( $0 ) {
			return { '"': "", "'": "" }[ $0 ];
		} );
	};

	utilities.escapeRegExp = function(str) {
	  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

	utilities.getHitRegExp = function(hits) {

		// return nothing if there is no hit text
		if(!hits)
			return;

		// turn hits text into a regexp
		hits = utilities.escapeRegExp( hits )
		hits = hits.split( /\n/gi );
		hits.sort( function(a,b) { return b.length - a.length;} );
		hits = hits.join("|" );				
		return new RegExp( hits, "i" );

	};
	
	// Returns IE version ( 7/8/9/10). With IE11 (or greater) returns -1.
	utilities.getIEVersion = function() {
	
		var userAgent = navigator.userAgent;
		var reg = /MSIE\s?(\d+)(?:\.(\d+))?/i;
		var matches = userAgent.match( reg );

		var iEVersion;
		if ( matches != null && matches.length > 0 ) {
			 iEVersion = matches[ 1 ];

			 // Incase of IE 9, confirms it by checking javascript version.
			 // Sometimes IE10 returns as IE9 version. So checks also javascript version and returns as ie10.
			 if( iEVersion === "9" && new Function( "/*@cc_on return @_jscript_version; @*/" )() === 10 )
				return "10";

			 return iEVersion;
		}
		return -1;
	};
	
	// Selects or unselects the description control.
	utilities.selectDescriptionControl = function( control, select ) {
	
		// Select or unselect the previously selected description control.
		var prev = control.closest( "tr" ).prev();
		if( prev.hasClass( "mf-description-row" ) )
			prev.descriptionline( "setSelected", select );
	}

	// Sets click handlers for executable links.
	utilities.setLinkHandlers = function( element ) {

		// Search all executable links and add click handler for them.
		element.find( ".mf-executable-url" ).click( function( event ){
					
			// Prevent default operation.
			event.preventDefault();

			// Get the URL and execute it.
			var url = $( this ).data( "target" );
			if( url && url.length > 0 ) {

				// Execute the URL.
				MFiles.ExecuteURL( url );
			}

		} );
	}

	/**
	* selection start and end. Support for IE-8 added.
	*
	* @param {Html Element} el - TextArea or TextInput to check selected text in.
	* @return {Object} Start and end positions of selected text.
	*/
	utilities.getInputSelection = function( el ) {
		var start = 0, end = 0, normalizedValue, range,
			textInputRange, len, endRange;

		if( typeof el.selectionStart === "number" && typeof el.selectionEnd === "number" ) {
			start = el.selectionStart;
			end = el.selectionEnd;
		} else {
			range = document.selection.createRange();

			if( range && range.parentElement() === el ) {
				len = el.value.length;
				normalizedValue = el.value.replace( /\r\n/g, "\n" );

				// Create a working TextRange that lives only in the input
				textInputRange = el.createTextRange();
				textInputRange.moveToBookmark( range.getBookmark() );

				// Check if the start and end of the selection are at the very end
				// of the input, since moveStart/moveEnd doesn't return what we want
				// in those cases
				endRange = el.createTextRange();
				endRange.collapse( false );

				if( textInputRange.compareEndPoints( "StartToEnd", endRange ) > -1 ) {
					start = end = len;
				} else {
					start = -textInputRange.moveStart( "character", -len );
					start += normalizedValue.slice( 0, start ).split( "\n" ).length - 1;

					if( textInputRange.compareEndPoints( "EndToEnd", endRange ) > -1 ) {
						end = len;
					} else {
						end = -textInputRange.moveEnd( "character", -len );
						end += normalizedValue.slice( 0, end ).split( "\n" ).length - 1;
					}
				}
			}
		}

		return {
			start: start,
			end: end
		};
	}

	/**
	* Creates a document element with class name and id.
	*
	* @param {Html Element} tag - Html tag.
	* @param {string} className - css class name.
	* @param {string} id - document element id.
	* @return {Html element} - document element with class name and id.
	*/
	utilities.createDocumentElement = function( tag, className, id ) {
		var element = document.createElement( tag );
		if( className !== undefined && typeof className === "string" ) {
			element.className = className;
		}
		if( id != undefined && typeof id === "string" ) {
			element.id = id;
		}
		return element;
	}

	// Add some functionality to jQuery beyond this point.
	// get references to original functions
	var outerWidth = $.fn.outerWidth,
		outerHeight = $.fn.outerHeight;

	$.extend( {
		outerWidth: function( value ) {
			if( typeof ( value ) != "undefined" && value === value * 1.0 ) {
				//return workerFunc.apply(this, [false, value]);					
				return this.width( value - ( this.outerWidth() - this.width() ) );
			} else {
				return outerWidth.apply( this, arguments );
			}
		},

		outerHeight: function( value ) {
			if( typeof ( value ) != "undefined" && value === value * 1.0 ) {
				//return workerFunc.apply(this, [true, value]);
				return this.height( value - ( this.outerHeight() - this.height() ) );
			} else {
				return outerHeight.apply( this, arguments );
			}
		}
	} );

	// Override the JQuery UI Button widgets reset button logic, to ensure the label text is html encoded before rendering.
	( function(
				$,
				undefined ) {

		// Required Type classes variable.
		var typeClasses = "ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon-primary ui-button-text-icon-secondary ui-button-text-only";

		// Override the jQuery.ui.button widget's _resetButton() globally.
		$.widget(
					"ui.button",
						 $.extend(
									{},
									$.ui.button.prototype,
									{
										_resetButton: function() {
											if( this.type === "input" ) {
												if( this.options.label ) {
													 this.element.val( this.options.label );
												}
											return;
										}
										var buttonElement = this.buttonElement.removeClass( typeClasses ),
										buttonText = $( "<span></span>", this.document[ 0 ] )
														.addClass( "ui-button-text" )
														// .html( this.options.label ), // Prefer .text(),
														.appendTo( buttonElement.empty() )
														.text( this.options.label ), // Use .text() to prevent xss injection.
											icons = this.options.icons,
											multipleIcons = icons.primary && icons.secondary,
										buttonClasses = [];

										// If the icon is primary or secondary set the class for the icon.
										if( icons.primary || icons.secondary ) {

											// Checks text is present.
											if( this.options.text ) {
												 buttonClasses.push(
													"ui-button-text-icon" +
													( multipleIcons ? "s" : ( icons.primary ? "-primary" : "-secondary" ) ) );
												}

											// If the icon is primary set the appropriate class for the button.
											if( icons.primary ) {
												buttonElement.prepend(
													"<span class='ui-button-icon-primary ui-icon " + icons.primary + "'></span>" );
											}

											// If the icon is secondary set the appropriate class for the button.
											if( icons.secondary ) {
												buttonElement.append(
													"<span class='ui-button-icon-secondary ui-icon " + icons.secondary + "'></span>" );
											}

											// If the text is not present then, remove the title of the button.
											if( !this.options.text ) {
												buttonClasses.push( multipleIcons ? "ui-button-icons-only" : "ui-button-icon-only" );
												if( !this.hasTitle ) {
													buttonElement.attr( "title", $.trim( buttonText ) );
												}
											}
										} else {

											// Add the new class for the button element.
											buttonClasses.push( "ui-button-text-only" );
										}
										buttonElement.addClass( buttonClasses.join( " " ) );
									}
								} )
		);
	} )( jQuery );

	// Functionality to set current date in date picker.
	$.datepicker._gotoToday = function( id ) {

		var target = $( id );
		var inst = this._getInst( target[0] );
		if( this._get( inst, 'gotoCurrent' ) && inst.currentDay ) {
			inst.selectedDay = inst.currentDay;
			inst.drawMonth = inst.selectedMonth = inst.currentMonth;
			inst.drawYear = inst.selectedYear = inst.currentYear;
		}
		else {
			var date = new Date();
			inst.selectedDay = date.getDate();
			inst.drawMonth = inst.selectedMonth = date.getMonth();
			inst.drawYear = inst.selectedYear = date.getFullYear();

			// The below two lines are new.
			this._setDateDatepicker( target, date );
			this._selectDate( id, this._getDateDatepicker( target ) );
		}
		this._notifyChange( inst );
		this._adjustDate( target );

		// TODO: Set focus to date picker after that.
	}


} ( window.utilities = window.utilities || {}, jQuery ) );