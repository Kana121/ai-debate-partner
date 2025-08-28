# AI Debate Partner

A real-time debate analysis application that provides feedback on your debate performance using AI. The application records audio, transcribes speech, and provides analysis on various debate metrics.

## Prerequisites

- Python 3.8 or higher
- Node.js 16.x or higher
- npm 8.x or higher
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Kana121/ai-debate-partner.git
cd ai-debate-partner
```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd ai-debate-partner-backend
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the `ai-debate-partner-backend` directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../ai-debate-partner-ui
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

## Running the Application

### 1. Start the Backend Server

From the `ai-debate-partner-backend` directory:

```bash
# Windows
.\venv\Scripts\activate
uvicorn app.main:app --reload

# macOS/Linux
source venv/bin/activate
uvicorn app.main:app --reload
```

The backend server will start on `http://localhost:8000`

### 2. Start the Frontend Development Server

From the `ai-debate-partner-ui` directory:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Using the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Click on "Start New Session"
3. Grant microphone permissions when prompted
4. Click the "Start Recording" button to begin your debate
5. Speak clearly into your microphone
6. View real-time feedback and analysis as you speak
7. Click "Stop Recording" when finished
8. Review your session summary and analysis

## Troubleshooting

### Common Issues

1. **Microphone Access**
   - Ensure your browser has permission to access the microphone
   - Try refreshing the page if prompted for permissions

2. **Backend Connection**
   - Verify the backend server is running on port 8000
   - Check the browser's developer console for WebSocket connection errors

3. **Environment Variables**
   - Ensure all required environment variables are set in the `.env` file
   - The backend server must be restarted after changing environment variables

## Project Structure

```
ai-debate-partner/
├── ai-debate-partner-backend/  # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── core/              # Core configurations
│   │   ├── models/            # Database models
│   │   └── services/          # Business logic
│   └── requirements.txt       # Python dependencies
│
└── ai-debate-partner-ui/      # React frontend
    ├── public/               # Static files
    └── src/                  # Source code
        ├── components/       # React components
        └── App.jsx           # Main application component
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
