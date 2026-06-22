# Moozik - Collaborative Music Streaming Platform

A real-time collaborative music streaming application that allows users to listen to music together in virtual rooms. Built with Node.js, Express.js, Socket.io, and Supabase, Moozik enables synchronized music playback, chat functionality, and YouTube music integration.

## 🎵 Project Overview

Moozik is a web-based platform where users can:
- Create and join virtual music rooms
- Stream YouTube music in real-time with friends
- Chat while listening together
- Vote to skip tracks
- Manage music queues
- Search and add songs from YouTube

## 🏗️ Architecture

### Technology Stack

**Backend:**
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **Supabase** - PostgreSQL database and authentication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **yt-search** - YouTube search API
- **yt-dlp** - YouTube audio streaming

**Frontend:**
- **HTML5** - Structure
- **CSS3** - Styling with parallax effects
- **Vanilla JavaScript** - Client-side logic
- **Socket.io Client** - Real-time client communication
- **Ionicons** - Icon library

### Project Structure

```
moozik/
├── app.js                      # Main application entry point
├── package.json                # Project dependencies and scripts
├── .env                        # Environment variables (not in repo)
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── modules/                    # Core backend modules
│   ├── auth.js                # Authentication utilities
│   ├── playback.js            # Music playback control
│   ├── rooms.js               # Room management logic
│   ├── search.js              # YouTube search integration
│   ├── stream.js              # Audio streaming functionality
│   └── supabase.js            # Database connection
├── routes/                     # Express route handlers
│   ├── auth.js                # Authentication endpoints
│   ├── chat.js                # Chat and room endpoints
│   ├── home.js                # Home page route
│   ├── about.js               # About page route
│   └── contact.js             # Contact page route
├── views/                      # HTML templates
│   ├── index.html             # Landing page
│   ├── auth.html              # Authentication page
│   ├── lobby.html             # Room lobby
│   ├── chat.html              # Chat/music room
│   ├── about.html             # About page
│   └── contact.html           # Contact page
├── public/                     # Static assets
│   ├── css/                   # Stylesheets
│   │   ├── style.css          # Main styles
│   │   ├── auth.css           # Authentication styles
│   │   ├── chat.css           # Chat room styles
│   │   ├── lobby.css          # Lobby styles
│   │   ├── about.css          # About page styles
│   │   ├── contact.css        # Contact page styles
│   │   └── music.css          # Music player styles
│   ├── js/                    # Client-side JavaScript
│   │   ├── main.js            # Main client logic
│   │   ├── auth.js            # Authentication client logic
│   │   ├── chat.js            # Chat room client logic
│   │   ├── lobby.js           # Lobby client logic
│   │   ├── about.js           # About page logic
│   │   ├── contact.js         # Contact page logic
│   │   ├── index.js           # Landing page logic
│   │   └── corosal.js         # Carousel logic
│   └── img/                   # Images and assets
└── supabase/                   # Database configuration
    └── schema.sql             # Database schema
```

## 🔧 Core Components

### 1. Authentication Module (`modules/auth.js`)
Handles user authentication and authorization:
- JWT token generation and verification
- Cookie parsing and management
- Route protection middleware
- User session management

**Key Functions:**
- `verifyTokenFromCookie()` - Validates JWT from cookies
- `requireAuth()` - Middleware for protected routes
- `requireAuthApi()` - Middleware for protected API endpoints
- `safeRedirectPath()` - Validates redirect URLs

### 2. Rooms Module (`modules/rooms.js`)
Manages virtual music rooms:
- Room creation with unique 6-character codes
- Member management (max 5 users per room)
- Queue management
- Skip voting system
- Current song tracking

**Key Functions:**
- `createRoom()` - Creates new room with unique code
- `getRoom()` - Retrieves room by code
- `addMember()` - Adds user to room
- `addToQueue()` - Adds song to queue
- `addSkipVote()` - Handles skip voting

**Room Structure:**
```javascript
{
  code: "ABC123",           // Unique room code
  host: "username",         // Room creator
  members: Map(),           // Connected users
  currentSong: {},          // Currently playing song
  queue: [],                // Song queue
  skipVotes: Set(),         // Skip votes
  createdAt: timestamp      // Creation time
}
```

### 3. Playback Module (`modules/playback.js`)
Controls music playback synchronization:
- Song emission to all room members
- Queue state broadcasting
- Automatic next song playback
- Skip vote handling

**Key Functions:**
- `emitSong()` - Sends song to all room members
- `playSongInRoom()` - Starts playing song in room
- `playNextInRoom()` - Plays next song in queue
- `broadcastQueueState()` - Updates all clients on queue state

### 4. Search Module (`modules/search.js`)
Integrates with YouTube for music search:
- YouTube video search
- Video metadata resolution
- Search result formatting

**Key Functions:**
- `searchYouTube()` - Searches YouTube for songs
- `resolveVideo()` - Gets video details by ID

### 5. Stream Module (`modules/stream.js`)
Handles audio streaming from YouTube:
- Uses yt-dlp for audio extraction
- Streams audio in real-time
- Error handling and cleanup

**Key Functions:**
- `streamYouTubeAudio()` - Streams YouTube audio as webm

### 6. Supabase Module (`modules/supabase.js`)
Database connection and configuration:
- Supabase client initialization
- Environment variable validation
- Error handling for missing credentials

## 🌐 API Routes

### Authentication Routes (`/auth`)
- `GET /auth` - Serves authentication page
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `GET /auth/signout` - User logout

### Chat Routes (`/chat`)
- `GET /chat` - Redirects to lobby
- `GET /chat/lobby` - Serves lobby page (protected)
- `GET /chat/room/:code` - Serves chat room page (protected)
- `GET /chat/stream/:videoId` - Streams YouTube audio
- `GET /chat/me` - Returns current user info
- `POST /chat/rooms` - Creates new room (protected)
- `POST /chat/rooms/:code/join` - Joins existing room (protected)

### Static Routes
- `GET /` - Serves landing page
- `GET /about` - Serves about page
- `GET /contact` - Serves contact page

## 🔌 Socket.io Events

### Client → Server Events
- `joinRoom` - User joins a room
- `message` - Sends chat message
- `searchSongs` - Searches for songs
- `addToQueue` - Adds song to queue
- `removeFromQueue` - Removes song from queue (host only)
- `voteSkip` - Votes to skip current song
- `hostSkip` - Host force-skips current song
- `leaveRoom` - User leaves room

### Server → Client Events
- `you` - Sends username to client
- `roomJoined` - Room join confirmation with state
- `roomError` - Room-related errors
- `updateOnlineUsers` - Updates online users list
- `message` - Chat message broadcast
- `searchResults` - YouTube search results
- `queueUpdate` - Queue state update
- `skipVoteUpdate` - Skip vote state update
- `nowPlaying` - Current playing song info
- `song` - Song stream URL and metadata
- `skipTrack` - Notification to skip current track

## 🗄️ Database Schema

### User Table
```sql
CREATE TABLE public."user" (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,  -- bcrypt hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Contact Table
```sql
CREATE TABLE public.contact (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Security Policies
- Row Level Security (RLS) enabled on all tables
- Anonymous access allowed for signup/signin
- Contact form submissions allowed for anonymous users

## 🔄 Data Flow

### 1. User Authentication Flow
```
User → Signup/Login Form → POST /auth/signup or /auth/signin
→ Server validates credentials → Hashes password (bcrypt)
→ Stores in Supabase → Generates JWT token → Sets HTTP-only cookie
→ Redirects to lobby
```

### 2. Room Creation Flow
```
User → Clicks "Create Room" → POST /chat/rooms
→ Server generates room code → Creates room in memory
→ Returns room code → User redirects to /chat/room/:code
→ Socket.io connection → Joins room → Receives room state
```

### 3. Music Playback Flow
```
User → Searches song → Socket: searchSongs
→ Server searches YouTube → Returns results
→ User selects song → Socket: addToQueue
→ Server adds to queue → If first song, starts playback
→ Emits song stream URL to all users → All clients sync playback
```

### 4. Skip Voting Flow
```
User → Clicks skip → Socket: voteSkip
→ Server adds vote → Checks threshold (majority)
→ If threshold reached → Plays next song → Broadcasts update
→ Otherwise → Updates vote count → Continues playback
```

## 🎨 Features

### Core Features
1. **User Authentication**
   - Email/password registration
   - Secure login with JWT tokens
   - Session management with HTTP-only cookies

2. **Virtual Music Rooms**
   - Create rooms with unique 6-character codes
   - Share room codes with friends
   - Maximum 5 users per room
   - Host controls for room management

3. **Real-time Chat**
   - Text chat within rooms
   - System messages for join/leave/events
   - User presence indicators

4. **Music Streaming**
   - YouTube audio streaming via yt-dlp
   - Synchronized playback across all users
   - Real-time progress tracking
   - Automatic next song playback

5. **Queue Management**
   - Add songs to queue
   - View queue order
   - Host can remove songs
   - Queue persistence during session

6. **Skip Voting System**
   - Democratic skip voting
   - Majority threshold (50% + 1)
   - Host can force-skip
   - Real-time vote tracking

7. **Search Integration**
   - YouTube search integration
   - Video metadata display
   - Thumbnail previews
   - Duration information

### UI/UX Features
- **Parallax landing page** with animated elements
- **Responsive design** for mobile and desktop
- **Real-time updates** via Socket.io
- **Visual feedback** for all interactions
- **Social media integration** (links)
- **Contact form** for user feedback

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- yt-dlp installed system-wide

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd moozik
```

2. **Install dependencies**
```bash
npm install
```

3. **Install yt-dlp** (for audio streaming)
```bash
# Windows (using pip)
pip install yt-dlp

# Or download from: https://github.com/yt-dlp/yt-dlp/releases
```

4. **Configure Supabase**
   - Create a Supabase project at https://supabase.com
   - Go to Project Settings → API
   - Copy Project URL and anon public key

5. **Setup database**
   - Open Supabase SQL Editor
   - Run the schema from `supabase/schema.sql`

6. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-secret-key
PORT=3000
```

7. **Start the application**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

8. **Access the application**
```
http://localhost:3000
```

## 🔒 Security Considerations

- **Password Security**: Passwords are hashed using bcrypt before storage
- **JWT Tokens**: HTTP-only cookies prevent XSS attacks
- **CSRF Protection**: SameSite cookie policy
- **SQL Injection**: Supabase parameterized queries
- **Input Validation**: Server-side validation on all inputs
- **Rate Limiting**: Consider implementing for production
- **Environment Variables**: Sensitive data in `.env` (not in repo)

## 🧪 Testing

Currently, the project does not include automated tests. Manual testing steps:

1. **Authentication Testing**
   - Test signup with duplicate email
   - Test login with invalid credentials
   - Test session persistence

2. **Room Testing**
   - Create multiple rooms
   - Test room code uniqueness
   - Test maximum member limit

3. **Music Testing**
   - Search for various songs
   - Test queue management
   - Test skip voting
   - Test synchronized playback

## 🛠️ Development

### Running in Development
```bash
npm run dev
```
Uses nodemon for auto-reload on file changes.

### Project Scripts
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon -L app.js"
}
```

### Adding New Features
1. Backend logic in `modules/`
2. API endpoints in `routes/`
3. Frontend logic in `public/js/`
4. Styles in `public/css/`
5. Templates in `views/`

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `PORT` | Server port | `3000` |

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify `.env` credentials
   - Check Supabase project is active
   - Ensure RLS policies are correctly set

2. **Audio Streaming Not Working**
   - Install yt-dlp: `pip install -U yt-dlp`
   - Check yt-dlp is in system PATH
   - Verify YouTube video is accessible

3. **Socket.io Connection Issues**
   - Check CORS settings
   - Verify firewall rules
   - Ensure Socket.io versions match client/server

4. **Room Code Not Working**
   - Ensure code is 6 characters
   - Check if room still exists (in-memory)
   - Verify user is authenticated

## 🚀 Deployment

### Production Deployment Considerations

1. **Environment Setup**
   - Use production Supabase credentials
   - Set secure JWT_SECRET
   - Configure production PORT

2. **Process Management**
   - Use PM2 for process management
   - Enable clustering for scaling
   - Set up logging

3. **Reverse Proxy**
   - Use Nginx or Apache
   - Configure SSL/TLS
   - Set up proper headers

4. **Performance**
   - Enable gzip compression
   - Implement caching strategies
   - Consider CDN for static assets

5. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor server metrics
   - Log analytics

## 📄 License

ISC License

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Use the contact form on the website
- Check existing documentation

## 🎯 Future Enhancements

Potential features for future versions:
- Spotify/Apple Music integration
- Room persistence (database storage)
- User profiles and preferences
- Playlist management
- Mobile app development
- Voice chat integration
- Song recommendations
- Listening history
- Social features (friends, followers)

## 📊 Technical Details

### Dependencies Version Information
- express: ^4.19.2
- socket.io: ^4.7.5
- @supabase/supabase-js: ^1.35.7
- jsonwebtoken: ^9.0.3
- bcryptjs: ^3.0.3
- yt-search: ^2.13.1

### Browser Requirements
- Modern browser with ES6+ support
- WebSocket support
- HTML5 audio/video support

### Server Requirements
- Node.js v14+
- 512MB RAM minimum
- yt-dlp installed

---

**Moozik** - Where Music Connects Us All 🎵
