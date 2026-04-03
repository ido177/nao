# nao iOS

Native iOS client for the nao analytics agent platform.

## Requirements

- Xcode 15.4+
- iOS 17.0+
- Swift 5.9+

## Getting Started

1. Open `nao.xcodeproj` in Xcode
2. Select a simulator or device target
3. Build and run (Cmd+R)

## Configuration

On the login screen, tap **Server** to configure the backend URL. By default it points to `http://localhost:5005`.

For local development with the iOS Simulator, set the server URL to `http://localhost:5005` (the Simulator shares the Mac's network). For a physical device on the same network, use your Mac's local IP (e.g. `http://192.168.1.x:5005`).

## Architecture

```
ios/nao/
├── App/                  # App entry point, root navigation
├── Models/               # Data models (Chat, Message, User)
├── Networking/           # API client, tRPC client, auth/chat services, stream parser
├── ViewModels/           # MVVM view models (Auth, ChatList, ChatDetail)
├── Views/
│   ├── Auth/             # Login, SignUp screens
│   ├── Chat/             # Chat list, detail, new chat, messages, input
│   └── Components/       # Reusable UI components
├── Theme/                # Design system (colors, spacing, radii)
└── Resources/            # Asset catalogs, Info.plist
```

### Key Features

- **Authentication**: Email/password login and signup via Better Auth
- **Chat List**: Browse, search, star, and delete conversations
- **New Chat**: Start conversations with streaming AI responses
- **Chat Detail**: View and continue existing conversations
- **Streaming**: Real-time message streaming with typing indicators
- **Tool Calls**: Visual indicators for agent tool usage (SQL, Python, etc.)
- **Reasoning**: Expandable thinking/reasoning sections
- **Markdown**: Inline markdown rendering in assistant messages
- **Dark Mode**: Automatic light/dark theme support

### Networking

The app communicates with the nao backend via:

- **Better Auth** (`/api/auth/*`) for authentication (session cookies)
- **tRPC** (`/api/trpc`) for data queries and mutations (SuperJSON batch format)
- **Agent API** (`/api/agent`) for streaming chat messages (Vercel AI SDK UI message stream format)

## What's Not Included Yet

- Settings / project configuration
- Image uploads
- Voice input / transcription
- Stories
- Shared chats
- Social auth (Google, GitHub)
