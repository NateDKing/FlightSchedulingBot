// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');

// Constant for the main waterfall dialog
const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

class MainDialog extends ComponentDialog {
    constructor(flightBookingDialog) {
        super('MainDialog'); // Initialize the MainDialog component

        // Ensure flightBookingDialog is passed in
        if (!flightBookingDialog) throw new Error('[MainDialog]: Missing parameter \'flightBookingDialog\' is required');

        // Add flight booking dialog to the component and create a simple waterfall dialog
        this.addDialog(flightBookingDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.startFlightBookingDialog.bind(this) // First and only step: start the flight booking dialog
            ]));

        // Set the initial dialog ID to the waterfall dialog
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * Runs the dialog system with the incoming activity.
     * If no dialog is active, it starts the MainDialog.
     * @param {*} turnContext - Context for the current turn of conversation with the user
     * @param {*} accessor - State accessor for dialog state
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor); // Create a new DialogSet with the state accessor
        dialogSet.add(this); // Add the MainDialog to the set

        // Create the dialog context
        const dialogContext = await dialogSet.createContext(turnContext);
        
        // Continue the dialog if it's already started, otherwise begin a new dialog
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id); // Start MainDialog if no active dialog
        }
    }

    /**
     * Start the flight booking dialog from the waterfall step.
     * @param {*} stepContext - Context for the current dialog step
     */
    async startFlightBookingDialog(stepContext) {
        // Start the flight booking dialog
        return await stepContext.beginDialog('FLIGHT_BOOKING_DIALOG');
    }
}

module.exports.MainDialog = MainDialog;
