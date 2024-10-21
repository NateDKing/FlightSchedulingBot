const fetch = require('node-fetch'); // Import the fetch module for HTTP requests

class OpenAIService {
    constructor(apiKey) {
        this.apiKey = apiKey; // Store the API key for authorization
        this.endpoint = "https://api.openai.com/v1/chat/completions"; // OpenAI API endpoint for GPT-4 Turbo chat completions
    }

    /**
     * Extract flight details such as source airport (src), destination airport (dst),
     * start date, and end date from user input using OpenAI's GPT-4 Turbo model.
     * The dates are validated to ensure they are not before today's date.
     * @param {string} userInput - User's input containing flight details
     * @returns {Object} - Extracted flight details (src, dst, startDate, endDate)
     */
    async extractFlightDetails(userInput) {
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0]; // Format current date as YYYY-MM-DD

        // Construct the message for GPT-4 Turbo
        const messages = [
            {
                role: "system",
                content: "You are an assistant that extracts flight information from user input. If the user specifies a city or common name of an airport, return the corresponding IATA airport code."
            },
            {
                role: "user",
                content: `Extract any available flight details (source airport, destination airport, start date, end date) from the following input: "${userInput}". Return the information in JSON format with any of "src", "dst", "startDate", and "endDate" that are present. If there is only one date, set the same value for "startDate" and "endDate". Ensure the dates are not before today's date (${currentDate}).`
            }
        ];

        // Make API call to OpenAI
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`, // Add API key for authentication
                "Content-Type": "application/json" // Specify request type as JSON
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: messages,
                max_tokens: 200 // Limit the token count
            })
        });

        const data = await response.json(); // Parse response data
        const completionText = data.choices[0].message.content.trim(); // Extract the returned completion text

        let extractedDetails = { src: null, dst: null, startDate: null, endDate: null }; // Default structure for extracted details

        try {
            // Try to locate and parse JSON from the completion text
            const jsonStart = completionText.indexOf('{');
            const jsonEnd = completionText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonString = completionText.substring(jsonStart, jsonEnd + 1); // Extract the JSON string
                extractedDetails = JSON.parse(jsonString); // Parse JSON
            } else {
                console.warn("Error: No valid JSON found in the response:", completionText);
            }
        } catch (error) {
            console.warn("Error parsing OpenAI response:", completionText); // Catch and log parsing errors
        }

        return extractedDetails; // Return the extracted flight details
    }

    /**
     * Determine if the user's input is affirmative (yes) or negative (no)
     * using OpenAI's GPT-4 Turbo model.
     * @param {string} userInput - User's input to check
     * @returns {boolean} - Returns true if affirmative, otherwise false
     */
    async isAffirmativeResponse(userInput) {
        const messages = [
            {
                role: "system",
                content: "You are an assistant that determines if the user's response is affirmative (yes) or negative (no). Respond with 'yes' or 'no'."
            },
            {
                role: "user",
                content: `Is the following response affirmative or negative? "${userInput}"`
            }
        ];

        // Make API call to OpenAI
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`, // Add API key for authentication
                "Content-Type": "application/json" // Specify request type as JSON
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: messages,
                max_tokens: 10 // Limit token count to just get 'yes' or 'no'
            })
        });

        const data = await response.json(); // Parse response data
        const completionText = data.choices[0].message.content.trim().toLowerCase(); // Get and lowercase response

        return completionText.includes('yes'); // Return true if response includes 'yes'
    }
}

// Export the OpenAIService class with a provided API key for easy usage
module.exports = new OpenAIService('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');
