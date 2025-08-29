# AI Model Comparison Website

A Next.js application that allows users to compare responses from multiple AI models simultaneously. Users can select from GPT-5, Claude 3.5 Sonnet, Gemini 2.5 Pro, and DeepSeek R1 models, send a single message, and receive responses from all selected models in parallel.

## Features

- **Multi-Model Selection**: Choose from 4 different AI models
- **Parallel Processing**: Send one message, get responses from all selected models simultaneously
- **Response Comparison**: View all responses side-by-side for easy comparison
- **Best Response Selection**: Mark the best response with a star
- **Copy Functionality**: Copy any response to clipboard
- **Real-time Updates**: See responses as they come in
- **OpenRouter Integration**: Uses OpenRouter API for accessing multiple AI models

## Supported Models

- **GPT-5** (OpenAI) - Latest GPT model with advanced reasoning
- **Claude 3.5 Sonnet** (Anthropic) - Fast and efficient reasoning model
- **Gemini 2.5 Pro** (Google) - Multimodal reasoning capabilities
- **DeepSeek R1** (DeepSeek) - Advanced reasoning and coding

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd aiflista
npm install
```

### 2. Get OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy the API key

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Replace `your_openrouter_api_key_here` with your actual OpenRouter API key.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Select Models**: Choose which AI models you want to compare (minimum 1, maximum 4)
2. **Type Message**: Enter your question or prompt in the message box
3. **Send**: Click "Send" or press Enter to send the message to all selected models
4. **Compare**: View responses from all models side-by-side
5. **Mark Best**: Click the star icon to mark the best response
6. **Copy**: Use the copy button to copy any response to clipboard

## API Integration

The application uses OpenRouter's API to access multiple AI models through a single interface. The backend makes parallel requests to all selected models and returns the responses simultaneously.

### API Endpoints

- `POST /api/chat` - Sends message to selected AI models and returns responses

### Request Format

```json
{
  "message": "Your question here",
  "models": ["openai/gpt-5", "anthropic/claude-3.5-sonnet"]
}
```

### Response Format

```json
{
  "responses": [
    {
      "modelId": "openai/gpt-5",
      "content": "Response from GPT-5",
      "usage": { "total_tokens": 150 }
    },
    {
      "modelId": "anthropic/claude-3.5-sonnet",
      "content": "Response from Claude 3.5 Sonnet",
      "usage": { "total_tokens": 120 }
    }
  ]
}
```

## Project Structure

```
aiflista/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API endpoint for chat
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main application page
├── lib/
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── .env.local.example            # Environment variables template
└── README.md                     # This file
```

## Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **API**: OpenRouter for AI model access
- **Utilities**: clsx, tailwind-merge

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Models

To add new AI models:

1. Update the `AI_MODELS` array in `app/page.tsx`
2. Add the model mapping in `app/api/chat/route.ts`
3. Update the interface types if needed

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

1. Build the application: `npm run build`
2. Set environment variables
3. Deploy the `out` directory

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Your application URL | No (defaults to localhost) |

## Troubleshooting

### Common Issues

1. **"OpenRouter API key not configured"**
   - Ensure `.env.local` file exists and contains `OPENROUTER_API_KEY`
   - Restart the development server after adding environment variables

2. **"Model not supported"**
   - Check that the model ID exists in the `MODEL_MAPPING` object
   - Verify the model is available on OpenRouter

3. **API request failures**
   - Check your OpenRouter API key is valid
   - Ensure you have sufficient credits on OpenRouter
   - Check the OpenRouter status page for any service issues

### Getting Help

- Check the [OpenRouter documentation](https://openrouter.ai/docs)
- Review the [Next.js documentation](https://nextjs.org/docs)
- Open an issue in this repository

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
