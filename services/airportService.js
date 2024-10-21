const fetch = require('node-fetch'); // Import the fetch module for HTTP requests

class AirportService {
    constructor() {
        this.airports = null; // To cache the airports data after loading
        this.airportDataUrl = 'https://raw.githubusercontent.com/mwgg/Airports/refs/heads/master/airports.json'; // URL to fetch airport data
    }

    /**
     * Load airports data from the specified URL if not already loaded.
     */
    async loadAirports() {
        if (!this.airports) {
            // Fetch airport data if it's not already loaded
            const response = await fetch(this.airportDataUrl);
            this.airports = await response.json(); // Cache the loaded data
        }
    }

    /**
     * Verify the IATA code by searching in the loaded airports data.
     * @param {string} iataCode - The IATA code to verify
     * @returns {Object|null} - Returns matching airport info or null if not found
     */
    async verifyIataCode(iataCode) {
        await this.loadAirports(); // Ensure airports data is loaded

        // Find airport with a matching IATA code (case-insensitive)
        const matchingAirport = Object.values(this.airports).find(airport => 
            airport.iata && airport.iata.toUpperCase() === iataCode.toUpperCase()
        );

        return matchingAirport || null; // Return the found airport or null if not found
    }
}

// Export an instance of the AirportService class
const airportService = new AirportService();
module.exports = airportService;