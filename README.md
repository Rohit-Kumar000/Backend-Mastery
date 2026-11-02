<div align="center">

# Backend Mastery

### Video Sharing & Social Media REST API

A Node.js backend for a video-sharing platform with social features.
Build and explore user authentication, video uploads, comments, likes,
tweets, playlists, subscriptions and channel analytics through a
structured REST API.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-9-880000?logo=mongoose&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Storage-3448C5?logo=cloudinary&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)

</div>

------------------------------------------------------------------------

## About

**Backend Mastery** is a REST API built with Node.js, Express 5, MongoDB
and Mongoose. It combines video-platform functionality with a
micro-blogging layer, allowing authenticated users to manage their
accounts, publish videos, interact through comments and likes, create
tweets and playlists, and subscribe to channels.

The application uses a layered backend structure with dedicated routes,
controllers, models, middleware and utility modules. MongoDB aggregation
pipelines are used for channel profiles, video details, watch history,
playlists and dashboard statistics.

## Features

### User Accounts & Authentication

- Register with an avatar and optional cover image.
- Log in with username or email.
- Log out and refresh authentication tokens.
- Change password and update account details.
- Update avatar and cover image.
- View channel profiles, subscriber counts and subscription status.
- View personal watch history.

### Video Management

- Upload videos with thumbnails.
- Browse videos with search, sorting and pagination.
- Filter videos by channel/user.
- View video details, view counts and like information.
- Publish or unpublish videos.
- Update video title, description and thumbnail.
- Delete videos with related comments, likes, playlist references,
  watch-history references and Cloudinary assets cleanup.

### Social Features

- Add, view, edit and delete video comments.
- Like and unlike videos, comments and tweets.
- View liked videos.
- Create, view, edit and delete tweets.
- Create and manage playlists.
- Add videos to and remove videos from playlists.
- Subscribe and unsubscribe to channels.
- View channel subscribers and subscribed channels.

### Channel Dashboard

- View total videos, views, subscribers and video likes.
- View channel videos with their like counts.

### API & Infrastructure

- Health-check endpoint with server status, uptime and timestamp.
- Consistent JSON response and error formats.
- Startup validation for required environment variables.
- Centralized error handling and temporary upload cleanup.

## Tech Stack

| Technology                     | Usage                                              |
|--------------------------------|----------------------------------------------------|
| Node.js                        | JavaScript runtime                                 |
| Express 5                      | REST API framework and routing                     |
| MongoDB Atlas                  | Database                                           |
| Mongoose                       | Schemas, validation, model methods and aggregation |
| mongoose-aggregate-paginate-v2 | Aggregation pagination                             |
| JSON Web Token                 | Access and refresh token authentication            |
| bcrypt                         | Password hashing                                   |
| Multer                         | Multipart file uploads and temporary disk storage  |
| Cloudinary                     | Image and video hosting                            |
| cookie-parser                  | Reading authentication cookies                     |
| cors                           | Cross-origin request configuration                 |
| dotenv                         | Environment variable loading                       |
| nodemon                        | Development server restart                         |
| Prettier                       | Code formatting                                    |

## Project Architecture

``` text
Client
  |
  v
Express Application
  |
  +---- CORS / JSON & URL-encoded Parsers / Cookie Parser
  |
  v
Routes
  |
  +---- Authentication Middleware
  |
  +---- Multer Upload Middleware (upload routes)
  |
  v
Controllers
  |
  +---- Mongoose Models --------> MongoDB
  |
  +---- Utility Modules --------> Cloudinary / File Cleanup
  |
  v
Not Found Handler
  |
  v
Global Error Handler
  |
  v
JSON Response
```

The project separates responsibilities across the following layers:

- **Routes** map API paths and HTTP methods to controllers and
  middleware.
- **Middleware** handles JWT verification, multipart uploads and errors.
- **Controllers** validate requests, execute application logic and
  create responses.
- **Models** define MongoDB schemas, validation rules, indexes and model
  methods.
- **Utilities** provide shared response/error helpers, Cloudinary
  operations and file cleanup.

## Project Structure

``` text
Backend-Mastery/
├── public/
│   └── temp/
├── src/
│   ├── app.js
│   ├── index.js
│   ├── loadEnv.js
│   ├── constants.js
│   ├── databases/
│   │   └── index.js
│   ├── controllers/
│   │   ├── user.controllers.js
│   │   ├── video.controllers.js
│   │   ├── comment.controllers.js
│   │   ├── like.controllers.js
│   │   ├── tweet.controllers.js
│   │   ├── playlist.controllers.js
│   │   ├── subscription.controllers.js
│   │   ├── dashboard.controllers.js
│   │   └── healthcheck.controllers.js
│   ├── models/
│   │   ├── user.models.js
│   │   ├── video.models.js
│   │   ├── comment.models.js
│   │   ├── like.models.js
│   │   ├── tweet.models.js
│   │   ├── playlist.models.js
│   │   └── subscription.models.js
│   ├── routes/
│   │   ├── user.routes.js
│   │   ├── video.routes.js
│   │   ├── comment.routes.js
│   │   ├── like.routes.js
│   │   ├── tweet.routes.js
│   │   ├── playlist.routes.js
│   │   ├── subscription.routes.js
│   │   ├── dashboard.routes.js
│   │   └── healthcheck.routes.js
│   ├── middlewares/
│   │   ├── auth.middlewares.js
│   │   ├── multer.middlewares.js
│   │   └── error.middlewares.js
│   └── utils/
│       ├── apiError.js
│       ├── apiResponse.js
│       ├── asyncHandler.js
│       ├── cloudinary.js
│       ├── files.js
│       ├── findAccessibleVideo.js
│       ├── trimString.js
│       └── validateEnv.js
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── package.json
└── package-lock.json
```

## Data Models

The repository defines seven Mongoose models:

| Model        | Responsibility                                                     |
|--------------|--------------------------------------------------------------------|
| User         | Account details, credentials, profile images and watch history     |
| Video        | Video metadata, Cloudinary URLs, views, publishing state and owner |
| Comment      | Comment content, related video and owner                           |
| Like         | User likes for videos, comments or tweets                          |
| Tweet        | Short text posts and their owner                                   |
| Playlist     | Playlist details, video references and owner                       |
| Subscription | Relationship between a subscriber and a channel                    |

The data model uses MongoDB ObjectId references to connect related
documents. Unique indexes are used to prevent duplicate subscriptions
and duplicate likes for the same target. The Like schema validates that
a like targets one supported resource type.

## Authentication & Session Flow

The API uses JWT-based authentication with access and refresh tokens.

- **Access token:** sent in the `Authorization: Bearer <token>` header
  or read from the `accessToken` cookie.
- **Refresh token:** accepted from the request body or `refreshToken`
  cookie and checked against the token stored for the user.
- **Token refresh:** issues a new access/refresh token pair and replaces
  the stored refresh token.
- **Logout:** removes the stored refresh token and clears both
  authentication cookies.
- **Password security:** passwords are hashed with bcrypt through the
  User model's save hook.
- **Protected routes:** `verifyJWT` validates the access token and
  attaches the authenticated user to `req.user`.

The authentication cookies are configured as `httpOnly`; the `secure`
flag is enabled when `NODE_ENV=production`.

## File Uploads & Cloudinary

Multer handles incoming multipart form-data and stores files temporarily
in `public/temp/`. The controller then uploads the files to Cloudinary.

The current upload middleware specifies:

- `videoFile` must use a `video/` MIME type.
- Other uploaded file fields must use an `image/` MIME type.
- A maximum file size of 100 MB.
- A maximum of two files per request.
- Generated temporary filenames rather than user-provided filenames.

The Cloudinary utility uploads with `resource_type: "auto"` and removes
the temporary local file in a `finally` block. Separate helpers parse
Cloudinary delivery URLs and perform best-effort asset deletion.

## Error Handling & Validation

The application uses shared utilities for predictable API behaviour:

- `ApiResponse` standardizes successful JSON responses.
- `ApiError` represents application errors with an HTTP status code and
  message.
- `asyncHandler` forwards rejected asynchronous controller operations to
  Express error handling.
- The not-found handler creates a 404 response for unmatched routes.
- The global error handler maps known Multer, Mongoose, JWT and
  request-body errors to JSON responses.

Environment variables are validated before the server starts. The
validator checks required configuration, rejects a MongoDB URI that
still contains placeholders, and warns about short token secrets in
development (or rejects them in production).

## API Reference

All API routes are mounted under:

``` text
/api/v1
```

### Health Check

| Method | Endpoint       | Access | Description                          |
|--------|----------------|--------|--------------------------------------|
| GET    | `/healthcheck` | Public | Returns status, uptime and timestamp |

### Users

| Method | Endpoint                 | Access    | Description                                 |
|--------|--------------------------|-----------|---------------------------------------------|
| POST   | `/users/register`        | Public    | Register with profile image uploads         |
| POST   | `/users/login`           | Public    | Log in with username/email and password     |
| POST   | `/users/logout`          | Protected | Log out and clear refresh session           |
| POST   | `/users/refresh-token`   | Public    | Refresh the token pair                      |
| POST   | `/users/change-password` | Protected | Change current password                     |
| GET    | `/users/current-user`    | Protected | Get authenticated user                      |
| PATCH  | `/users/update-account`  | Protected | Update full name and/or email               |
| PATCH  | `/users/avatar`          | Protected | Replace avatar                              |
| PATCH  | `/users/cover-image`     | Protected | Replace cover image                         |
| GET    | `/users/c/:username`     | Protected | Get channel profile and subscription counts |
| GET    | `/users/history`         | Protected | Get watch history                           |

### Videos

| Method | Endpoint                          | Access            | Description                                |
|--------|-----------------------------------|-------------------|--------------------------------------------|
| GET    | `/videos`                         | Protected         | List, search, sort and paginate videos     |
| POST   | `/videos`                         | Protected         | Upload a video and thumbnail               |
| GET    | `/videos/:videoId`                | Protected         | Get video details and record a view        |
| PATCH  | `/videos/:videoId`                | Protected         | Update title, description and/or thumbnail |
| DELETE | `/videos/:videoId`                | Protected (owner) | Delete video and associated data           |
| PATCH  | `/videos/toggle/publish/:videoId` | Protected (owner) | Toggle publish status                      |

Video listing supports `page`, `limit`, `query`, `sortBy`, `sortType`
and `userId`. Sorting is limited to `createdAt`, `views`, `duration` and
`title`; page size is capped at 50.

### Comments

| Method | Endpoint                 | Access            | Description                    |
|--------|--------------------------|-------------------|--------------------------------|
| GET    | `/comments/:videoId`     | Protected         | List paginated comments        |
| POST   | `/comments/:videoId`     | Protected         | Add a comment                  |
| PATCH  | `/comments/c/:commentId` | Protected (owner) | Update a comment               |
| DELETE | `/comments/c/:commentId` | Protected (owner) | Delete a comment and its likes |

### Likes

| Method | Endpoint                     | Access    | Description           |
|--------|------------------------------|-----------|-----------------------|
| POST   | `/likes/toggle/v/:videoId`   | Protected | Toggle a video like   |
| POST   | `/likes/toggle/c/:commentId` | Protected | Toggle a comment like |
| POST   | `/likes/toggle/t/:tweetId`   | Protected | Toggle a tweet like   |
| GET    | `/likes/videos`              | Protected | Get liked videos      |

### Tweets

| Method | Endpoint               | Access            | Description                  |
|--------|------------------------|-------------------|------------------------------|
| POST   | `/tweets`              | Protected         | Create a tweet               |
| GET    | `/tweets/user/:userId` | Protected         | Get a user's tweets          |
| PATCH  | `/tweets/:tweetId`     | Protected (owner) | Update a tweet               |
| DELETE | `/tweets/:tweetId`     | Protected (owner) | Delete a tweet and its likes |

### Playlists

| Method | Endpoint                                | Access            | Description                                |
|--------|-----------------------------------------|-------------------|--------------------------------------------|
| POST   | `/playlist`                             | Protected         | Create a playlist                          |
| GET    | `/playlist/:playlistId`                 | Protected         | Get playlist details and accessible videos |
| PATCH  | `/playlist/:playlistId`                 | Protected (owner) | Update a playlist                          |
| DELETE | `/playlist/:playlistId`                 | Protected (owner) | Delete a playlist                          |
| PATCH  | `/playlist/add/:videoId/:playlistId`    | Protected (owner) | Add a video                                |
| PATCH  | `/playlist/remove/:videoId/:playlistId` | Protected (owner) | Remove a video                             |
| GET    | `/playlist/user/:userId`                | Protected         | Get a user's playlists                     |

### Subscriptions

| Method | Endpoint                         | Access    | Description                        |
|--------|----------------------------------|-----------|------------------------------------|
| POST   | `/subscriptions/c/:channelId`    | Protected | Subscribe/unsubscribe to a channel |
| GET    | `/subscriptions/c/:channelId`    | Protected | Get channel subscribers            |
| GET    | `/subscriptions/u/:subscriberId` | Protected | Get subscribed channels            |

### Dashboard

| Method | Endpoint            | Access    | Description                        |
|--------|---------------------|-----------|------------------------------------|
| GET    | `/dashboard/stats`  | Protected | Get channel statistics             |
| GET    | `/dashboard/videos` | Protected | Get channel videos and like counts |

## Getting Started

### Prerequisites

- Node.js 20 or newer.
- MongoDB Atlas account and database user.
- Cloudinary account.
- npm.

### 1. Clone the Repository

``` bash
git clone https://github.com/Rohit-Kumar000/Backend-Mastery.git
cd Backend-Mastery
```

### 2. Install Dependencies

``` bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file from the example:

**PowerShell**

``` powershell
Copy-Item .env.example .env
```

**Windows Command Prompt**

``` bat
copy .env.example .env
```

**macOS / Linux**

``` bash
cp .env.example .env
```

Configure the values in `.env`:

| Variable                | Description                             |
|-------------------------|-----------------------------------------|
| `PORT`                  | Server port (default: `8000`)           |
| `NODE_ENV`              | Runtime environment                     |
| `MONGODB_URI`           | MongoDB Atlas connection string         |
| `CORS_ORIGIN`           | Comma-separated allowed origins, or `*` |
| `ACCESS_TOKEN_SECRET`   | Access-token signing secret             |
| `ACCESS_TOKEN_EXPIRY`   | Access-token lifetime (example: `1d`)   |
| `REFRESH_TOKEN_SECRET`  | Refresh-token signing secret            |
| `REFRESH_TOKEN_EXPIRY`  | Refresh-token lifetime (example: `10d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                   |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                      |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                   |

Use different, strong values for the access and refresh token secrets.
Do not commit `.env` or share secret values.

### 4. Start the Server

Development mode with Nodemon:

``` bash
npm run dev
```

Standard start:

``` bash
npm start
```

The default port is `8000`; set `PORT` in `.env` to use a different
port.

## NPM Scripts

The scripts currently defined in `package.json` are:

| Command          | Description                         |
|------------------|-------------------------------------|
| `npm run dev`    | Starts the server with Nodemon      |
| `npm start`      | Starts the server with Node.js      |
| `npm run format` | Formats project files with Prettier |

**There is currently no `npm test` script in this repository's
`package.json`.** Running `npm run test` will therefore produce npm's
`Missing script: "test"` message. The repository tree also does not
contain a Postman collection or automated test directory, so this README
does not claim that a test suite or Postman test collection is included.

## Future Improvements

The following are not represented as implemented features in the current
repository and would be separate additions:

- Automated unit and integration tests.
- Rate limiting for authentication and other sensitive endpoints.
- Additional security headers.
- Email verification and password recovery.
- Pagination for tweet, playlist and subscription list endpoints.
- Multi-device session management.
- OpenAPI/Swagger API documentation.
- Docker-based deployment and CI workflows.
- Structured logging and request tracing.

------------------------------------------------------------------------

<div align="center">

**Backend Mastery**  
A backend project focused on REST API development, authentication,
database modelling and media handling.

</div>
