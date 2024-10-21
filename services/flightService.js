const fetch = require('node-fetch'); // Import fetch for HTTP requests
require('dotenv').config(); // Load environment variables from .env file

class FlightService {
    constructor() {
        // Load Amadeus API credentials from environment variables or set defaults
        this.clientId = process.env.AMADEUS_CLIENT_ID || 'Fd4JK3vp7DRAkfGdl58BnUeUnmH9tGA1'; // Amadeus Client ID
        this.clientSecret = process.env.AMADEUS_CLIENT_SECRET || 'DUdBYdqUNynZh8Sk'; // Amadeus Client Secret
        this.apiUrl = 'https://test.api.amadeus.com/v2/shopping/flight-offers'; // Amadeus test API endpoint for flight offers
        this.tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token'; // Endpoint for fetching access token
        this.accessToken = null; // Store the access token
        this.tokenExpiresAt = null; // Token expiration time

        // Map of airline codes to full names for readability
        this.airlineCodes = {
            'DL': 'Delta Airlines',
            'AA': 'American Airlines',
            'UA': 'United Airlines',
            // Add more airlines if needed
        };
    }

    /**
     * Obtain an access token using Client Credentials Grant.
     * This token is used for subsequent API requests.
     */
    async getAccessToken() {
        const currentTime = new Date().getTime();
        // Check if token exists and is still valid
        if (this.accessToken && currentTime < this.tokenExpiresAt) {
            return this.accessToken;
        }

        // Fetch a new token from Amadeus API
        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to obtain access token: ${response.status} ${response.statusText} - ${errorData}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token; // Save the token
        this.tokenExpiresAt = currentTime + data.expires_in * 1000; // Calculate the token's expiration time

        return this.accessToken;
    }

    /**
     * Query one-way flights based on source, destination, and departure date.
     * @param {Object} src - Source airport (e.g., { iata: 'JFK', name: 'John F. Kennedy International Airport' })
     * @param {Object} dst - Destination airport (e.g., { iata: 'LAX', name: 'Los Angeles International Airport' })
     * @param {string} departureDate - Departure date in 'YYYY-MM-DD' format
     * @returns {Object} - Grouped flight offers by airline with cheap, middle, and high prices
     */
    async queryFlights(src, dst, departureDate) {
        const token = await this.getAccessToken(); // Get a valid access token

        // Prepare query parameters for the API request
        const queryParams = new URLSearchParams({
            originLocationCode: src.iata, // Source airport IATA code
            destinationLocationCode: dst.iata, // Destination airport IATA code
            departureDate: departureDate, // Departure date in YYYY-MM-DD format
            adults: '1', // Number of passengers
            currencyCode: 'USD', // Currency code for pricing
            max: '50', // Maximum number of results
        });

        try {
            // Make API request to fetch flight offers
            const response = await fetch(`${this.apiUrl}?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`, // Add access token for authorization
                },
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to fetch flight offers: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const flights = await response.json(); // Parse the response as JSON

            // Process the flights data and group by airline, categorizing by price
            const airlines = {};

            flights.data.forEach(flight => {
                const airlineCodes = flight.validatingAirlineCodes; // Get the validating airline codes
                const primaryAirlineCode = airlineCodes[0]; // Use the first airline as the primary airline
                const airlineName = this.airlineCodes[primaryAirlineCode] || primaryAirlineCode; // Get full airline name if available

                if (!airlines[airlineName]) {
                    airlines[airlineName] = []; // Initialize array for this airline's flights
                }

                // Calculate total price for the flight
                const totalPrice = parseFloat(flight.price.total);

                // Add flight details to the airline's list of offers
                airlines[airlineName].push({
                    airline: airlineName,
                    flightNumber: flight.id, // Unique identifier for the flight offer
                    departureTime: flight.itineraries[0].segments[0].departure.at, // Departure time
                    arrivalTime: flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at, // Arrival time
                    price: totalPrice,
                    currency: flight.price.currency, // Currency of the price
                });
            });

            const result = {};

            // Sort and categorize flights by price for each airline
            for (const airline in airlines) {
                const airlineFlights = airlines[airline];

                // Sort the offers by price (ascending)
                airlineFlights.sort((a, b) => a.price - b.price);

                const numOffers = airlineFlights.length;
                if (numOffers === 0) continue; // Skip if no offers

                // Categorize flights into cheap, middle, and high-priced offers
                const cheapOffer = airlineFlights[0];
                const middleOffer = airlineFlights[Math.floor(numOffers / 2)] || cheapOffer;
                const highOffer = airlineFlights[numOffers - 1] || cheapOffer;

                result[airline] = {
                    cheap: cheapOffer,
                    middle: middleOffer,
                    high: highOffer,
                };
            }

            return result; // Return the grouped flight offers
        } catch (error) {
            console.error('Error querying flights:', error); // Log any errors
            return {}; // Return an empty object in case of error
        }
    }
}

// Export an instance of the FlightService class
module.exports = new FlightService();
