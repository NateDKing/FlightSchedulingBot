
# FlightSchedulingBot


**FlightSchedulingBot** is a chatbot built using the Microsoft Bot Framework. It is designed to assist users with various tasks, including flight booking, answering questions, making reservations, and handling other customer inquiries. The bot integrates with OpenAI's GPT-4 Turbo model to extract flight details from user input and validate information against services like airport IATA codes and airline data.

## Features

- **Flight Booking:** The bot guides users through booking a flight by asking for destination, source, travel dates, and confirming selections.
- **Flight Details Extraction:** Uses OpenAI's GPT-4 Turbo to extract flight information such as airports, dates, and preferences from natural language inputs.
- **IATA Code Validation:** Verifies if the entered IATA codes for airports are correct using airport data.
- **Airline Pricing Comparison:** Queries flights and categorizes offers by price (cheap, middle, high) for better user decision-making.
- **Integration with External Services:** Supports integration with APIs like Amadeus for flight offers.

## Project Structure

```bash
.
├── bot
│   ├── dialogs
│   │   ├── flightBookingDialog.js  # Handles flight booking conversations
│   └── index.js                    # Main bot file
├── services
│   ├── airportService.js           # Service to handle airport-related tasks (IATA code verification)
│   ├── flightService.js            # Service to query flight offers and group them by price
│   └── openAIService.js            # Integration with OpenAI GPT for processing natural language input
├── .env                            # Environment file for storing API keys and credentials
├── package.json                    # Node.js dependencies and scripts
└── README.md                       # Project documentation
```

## Getting Started

### Prerequisites

- **Node.js**: Ensure that you have Node.js (v12.x or higher) installed on your machine.
- **npm**: Comes with Node.js, required to install dependencies.
- **Amadeus API**: Register at [Amadeus](https://developers.amadeus.com/) to get your API credentials for flight offers.
- **OpenAI API**: Sign up for an API key at [OpenAI](https://beta.openai.com/signup/).
- **Microsoft Bot Framework**: Familiarity with Microsoft Bot Framework is useful but not required.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NateDKing/FlightSchedulingBot.git
   cd FlightSchedulingBot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root of the project and add your credentials:
   ```bash
   AMADEUS_CLIENT_ID=your_amadeus_client_id
   AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Bot

To start the bot:

```bash
npm start
```

### Testing the Bot

1. Install the [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator/releases) to test locally.
2. Open the emulator and connect to the bot by entering the bot URL (usually `http://localhost:3978/api/messages`).

### API Integration

- **Amadeus API**: The bot uses Amadeus API for querying flight offers. Ensure your credentials are correct in the `.env` file. The bot will fetch flight offers, categorize them, and present options to the user.
  
- **OpenAI API**: The bot uses OpenAI's GPT-4 Turbo for natural language understanding, extracting flight details, and determining user confirmations.

## Usage

### Example Conversations

1. **Flight Booking**:
   - User: "I want to book a flight to Los Angeles."
   - Bot: "Where will you be departing from?"
   - User: "New York City."
   - Bot: "When would you like to fly?"
   - User: "Next Monday."
   - Bot: "Do you want to confirm this flight from JFK to LAX on [date]?"

2. **Flight Options**:
   - Bot: "Here are the available flights sorted by price: [Delta Airlines - $350, United Airlines - $400, etc.]. Please select a flight."

### Commands

- **Book Flight**: Initiates the flight booking process.
- **Cancel**: Ends the current conversation with the bot.
- **Help**: Provides a list of available commands.

## Configuration

### Environment Variables

The following environment variables should be set in your `.env` file:

- `AMADEUS_CLIENT_ID`: Amadeus API Client ID.
- `AMADEUS_CLIENT_SECRET`: Amadeus API Client Secret.
- `OPENAI_API_KEY`: OpenAI API key.

### Customization

To extend the bot's functionality, you can modify or add new dialogs in the `dialogs` folder, integrate additional APIs in the `services` folder, and manage the main conversation flow in `index.js`.

## Contributing

Contributions are welcome! Please fork this repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## Acknowledgments

- [Amadeus API](https://developers.amadeus.com/) for flight offers.
- [OpenAI](https://beta.openai.com/) for natural language processing.
- [Microsoft Bot Framework](https://dev.botframework.com/) for bot development tools.

