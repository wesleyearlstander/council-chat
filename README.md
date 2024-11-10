# AI Agent Collaboration Platform

A React-based platform for managing and orchestrating conversations between multiple AI agents. This application allows you to create, manage, and observe collaborative discussions between AI agents with different roles and perspectives.

## Features

- **Project Management**: Create and manage multiple projects
- **Topic-based Discussions**: Create topics within projects for focused conversations
- **Agent Management**:
  - Create custom AI agents with specific roles
  - Auto-generate specialized agent teams
  - Configure system prompts
  - Upload knowledge base documents
  - Persistent memory for agents
- **Conversation Features**:
  - Priority-based agent responses
  - Auto-play conversations
  - View detailed agent thinking processes
  - Track agent response priorities
  - Group and organize agent responses
- **Dark Mode UI**: Modern, clean interface with dark mode design

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file and add your OpenAI API key:
```env
REACT_APP_OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm start
```

## Dependencies

```json
{
  "dependencies": {
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "@types/jest": "^27.5.2",
    "@types/node": "^16.18.46",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "canvas-confetti": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.5",
    "web-vitals": "^2.1.4"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.6.0"
  }
}
```

## Usage

1. Configure your OpenAI API key in the Settings
2. Create a new project
3. Create or generate agents with specific roles
4. Start a new topic
5. Begin the conversation and watch the agents collaborate

## Project Structure

- `/src/components`: React components
- `/src/types`: TypeScript type definitions
- `/src/App.tsx`: Main application component
- `/src/App.css`: Application styles

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your chosen license]

## Acknowledgments

- Built with React and TypeScript
- Uses OpenAI's GPT-4 API
- Canvas Confetti for animations
```

This README now:
1. Describes the project's purpose and features
2. Lists all dependencies
3. Provides installation and usage instructions
4. Explains the project structure
5. Includes contribution guidelines
6. Provides proper formatting and sections

Would you like me to make any adjustments to this README?
