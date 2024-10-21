// Required modules from botbuilder-dialogs
const { ComponentDialog, WaterfallDialog, TextPrompt, Dialog } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');

// Services for airport, flight, and AI integration
const airportService = require('../services/airportService');
const flightService = require('../services/flightService');
const azureOpenAIService = require('../services/azureOpenAIService');

// Dialog identifiers
const FLIGHT_BOOKING_DIALOG = 'FLIGHT_BOOKING_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class FlightBookingDialog extends ComponentDialog {
    constructor() {
        super(FLIGHT_BOOKING_DIALOG);

        // Add text prompts with validators for user inputs
        this.addDialog(new TextPrompt('DESTINATION_PROMPT', this.destinationPromptValidator.bind(this)));
        this.addDialog(new TextPrompt('SOURCE_PROMPT', this.sourcePromptValidator.bind(this)));
        this.addDialog(new TextPrompt('DATE_PROMPT', this.datePromptValidator.bind(this)));
        this.addDialog(new TextPrompt('CONFIRM_PROMPT', this.processConfirmation.bind(this)));
        this.addDialog(new TextPrompt('SELECTION_PROMPT')); // Flight selection prompt

        // Waterfall dialog to manage the sequence of booking steps
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.promptForDestination.bind(this),       // Step 1: Get destination
            this.promptForDate.bind(this),              // Step 3: Get travel date
            this.promptForSource.bind(this),            // Step 5: Get departure airport
            this.confirmFlightDetails.bind(this),       // Step 7: Confirm details
            this.queryAvailableFlights.bind(this),      // Step 9: Query flights
            this.selectFlight.bind(this)                // Step 9 continued: Select flight
        ]));

        // Set the initial dialog to the Waterfall dialog
        this.initialDialogId = WATERFALL_DIALOG;
    }

    // Step 1: Ask user for destination airport
    async promptForDestination(step) {
        return await step.prompt('DESTINATION_PROMPT', { 
            prompt: 'Welcome, I will be your flight booking assistant. Where would you like to go?' 
        });
    }

    // Step 2: Destination validation handled in validator

    // Step 3: Ask for travel date
    async promptForDate(step) {
        // Store the destination airport
        step.values.dst = step.result; // Result from validator

        return await step.prompt('DATE_PROMPT', { 
            prompt: `When would you like to travel to ${step.values.dst.name}?`
        });
    }

    // Step 4: Date validation handled in validator

    // Step 5: Ask for source (departure) airport
    async promptForSource(step) {
        // Store the travel date
        const { startDate, endDate } = step.result;
        step.values.startDate = startDate;
        step.values.endDate = endDate;

        return await step.prompt('SOURCE_PROMPT', { 
            prompt: 'Where will you be departing from?' 
        });
    }

    // Step 6: Source validation handled in validator

    // Step 7: Confirm flight details with the user
    async confirmFlightDetails(step) {
        step.values.src = step.result; // Store the departure airport
        
        const message = this.getConfirmMessage(step.values);

        return await step.prompt('CONFIRM_PROMPT', {
            prompt: message,
            flightDetails: step.values // Pass flight details to confirmation step
        });
    }

    // Generate confirmation message
    getConfirmMessage(flightDetails) {
        const { src, dst, startDate, endDate } = flightDetails;
        return `You would like to fly from ${src.name} (${src.iata}) to ${dst.name} (${dst.iata}) from ${startDate} to ${endDate}. Is this correct? If not, tell me what to change.`;
    }

    // Step 8: Process user confirmation or request for corrections
    async processConfirmation(promptContext) {
        const userResponse = promptContext.recognized.value;
        const isAffirmative = await azureOpenAIService.isAffirmativeResponse(userResponse);

        if (isAffirmative) {
            promptContext.recognized.value = { flightDetails: promptContext.options.flightDetails };
            return true; // Proceed if confirmation is positive
        } else {
            // Process corrections if provided
            const extractedDetails = await azureOpenAIService.extractFlightDetails(userResponse);
            let updated = false;

            // Update source, destination, and dates if corrections were given
            if (extractedDetails.src) {
                const srcAirport = await airportService.verifyIataCode(extractedDetails.src);
                if (srcAirport) {
                    promptContext.options.flightDetails.src = srcAirport;
                    updated = true;
                }
            }

            if (extractedDetails.dst) {
                const dstAirport = await airportService.verifyIataCode(extractedDetails.dst);
                if (dstAirport) {
                    promptContext.options.flightDetails.dst = dstAirport;
                    updated = true;
                }
            }

            if (extractedDetails.startDate) {
                promptContext.options.flightDetails.startDate = extractedDetails.startDate;
                promptContext.options.flightDetails.endDate = extractedDetails.endDate || extractedDetails.startDate;
                updated = true;
            }

            promptContext.recognized.value = { flightDetails: promptContext.options.flightDetails };
            promptContext.options.prompt = this.getConfirmMessage(promptContext.recognized.value.flightDetails);

            return false; // Re-prompt after corrections
        }
    }

    // Step 9: Query available flights
    async queryAvailableFlights(step) {
        const { src, dst, startDate } = step.result.flightDetails;

        const availableFlights = await flightService.queryFlights(src, dst, startDate);
        step.values.availableFlights = availableFlights;

        if (!Object.keys(availableFlights).length) {
            await step.context.sendActivity("No flights available. Would you like to adjust your search?");
            return await step.replaceDialog(WATERFALL_DIALOG, { ...step.values });
        }

        // Limit results to 3 airlines
        let cards = [];
        let index = 1;
        let airlineCount = 0;

        for (const airline in availableFlights) {
            if (airlineCount >= 3) break;

            const flights = availableFlights[airline];

            // Generate cards for each flight
            ['cheap', 'middle', 'high'].forEach(tier => {
                if (flights[tier]) {
                    const flight = flights[tier];

                    const flightCard = {
                        type: 'AdaptiveCard',
                        version: '1.3',
                        body: [
                            { type: 'TextBlock', text: `${airline} - ${tier.charAt(0).toUpperCase() + tier.slice(1)} Option`, weight: 'bolder', size: 'medium' },
                            { type: 'TextBlock', text: `Flight Number: ${flight.flightNumber}`, wrap: true },
                            { type: 'TextBlock', text: `Departure: ${flight.departureTime}`, wrap: true },
                            { type: 'TextBlock', text: `Arrival: ${flight.arrivalTime}`, wrap: true },
                            { type: 'TextBlock', text: `Price: $${flight.price}`, wrap: true }
                        ],
                        actions: [{ type: 'Action.Submit', title: `Select Flight ${index}`, data: { selectedFlight: flight.flightNumber } }]
                    };

                    cards.push(CardFactory.adaptiveCard(flightCard));
                    index++;
                }
            });

            airlineCount++;
        }

        // Display available flights
        await step.context.sendActivity({ attachments: cards });

        return Dialog.EndOfTurn; // Wait for user selection
    }

    // Step 9 continued: Handle flight selection
    async selectFlight(step) {
        const selectedFlightData = step.context.activity.value.selectedFlight;

        if (!selectedFlightData) {
            await step.context.sendActivity('No flight was selected. Please try again.');
            return await step.replaceDialog(WATERFALL_DIALOG, { ...step.values });
        }

        const availableFlights = step.values.availableFlights;
        let selectedFlight;

        for (const airline in availableFlights) {
            const flights = availableFlights[airline];
            ['cheap', 'middle', 'high'].forEach(tier => {
                if (flights[tier] && flights[tier].flightNumber === selectedFlightData) {
                    selectedFlight = flights[tier];
                }
            });
        }

        if (selectedFlight) {
            step.values.selectedFlight = selectedFlight;

            await step.context.sendActivity(`Thank you for booking your flight to ${step.activeDialog.state.values.dst.name} from ${step.activeDialog.state.values.src.name} on ${selectedFlight.departureTime} for $${selectedFlight.price}.`);
            await step.context.sendActivity("The conversation will now be reset. Thank you!");

            await step.context.sendActivity({ type: 'endOfConversation' });
            return await step.cancelAllDialogs();
        } else {
            await step.context.sendActivity('Invalid selection. Please try again.');
            return await step.replaceDialog(WATERFALL_DIALOG, { ...step.values });
        }
    }

    // Validator for destination prompt
    async destinationPromptValidator(promptContext) {
        const userInput = promptContext.recognized.value;
        const extractedDetails = await azureOpenAIService.extractFlightDetails(`Destination: ${userInput}`);
        const dst = extractedDetails.dst;

        if (dst) {
            const dstAirport = await airportService.verifyIataCode(dst);
            if (dstAirport) {
                promptContext.recognized.value = dstAirport;
                return true;
            }
        }
        await promptContext.context.sendActivity('Please provide a valid destination airport.');
        return false; // Re-prompt if validation fails
    }

    // Validator for date prompt
    async datePromptValidator(promptContext) {
        const dateInput = promptContext.recognized.value;
        const extractedDetails = await azureOpenAIService.extractFlightDetails(`Date: ${dateInput}`);

        if (extractedDetails.startDate) {
            promptContext.recognized.value = {
                startDate: extractedDetails.startDate,
                endDate: extractedDetails.endDate || extractedDetails.startDate
            };
            return true;
        }

        await promptContext.context.sendActivity('Please provide a valid date or date range.');
        return false; // Re-prompt if validation fails
    }

    // Validator for source prompt
    async sourcePromptValidator(promptContext) {
        const userInput = promptContext.recognized.value;
        const extractedDetails = await azureOpenAIService.extractFlightDetails(`Source: ${userInput}`);
        const src = extractedDetails.src;

        if (src) {
            const srcAirport = await airportService.verifyIataCode(src);
            if (srcAirport) {
                promptContext.recognized.value = srcAirport;
                return true;
            }
        }
        await promptContext.context.sendActivity('Please provide a valid source airport.');
        return false; // Re-prompt if validation fails
    }
}

module.exports.FlightBookingDialog = FlightBookingDialog;
