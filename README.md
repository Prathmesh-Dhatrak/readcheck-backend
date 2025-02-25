# ReadCheck Backend

Backend service for the ReadCheck application, which helps users manage their reading list and verify their understanding of content.

## Features

- User authentication (signup/login)
- Article management (save, retrieve, update, delete)
- Content analysis with OpenAI GPT for generating verification questions
- Answer verification to mark articles as read

## Tech Stack

- **Runtime**: Deno
- **Language**: TypeScript
- **Database**: PostgreSQL
- **External APIs**: OpenAI GPT

## Project Structure

```
/src
├── config.ts               # Configuration variables
├── deps.ts                 # Dependencies
├── main.ts                 # Application entry point
├── controllers/            # Request handlers
│   ├── auth.ts             # Authentication controllers
│   └── article.ts          # Article management controllers
├── db/                     # Database related files
│   ├── client.ts           # Database client
│   └── setup.ts            # Database setup
├── middleware/             # Middleware functions
│   ├── auth.ts             # Authentication middleware
│   └── error.ts            # Error handling middleware
├── models/                 # Data access layer
│   ├── user.ts             # User model
│   └── article.ts          # Article model
├── routes/                 # API routes
│   └── index.ts            # Route definitions
├── services/               # External service integrations
│   └── openai.ts           # OpenAI GPT service
├── types/                  # Type definitions
│   └── index.ts            # Shared types
└── utils/                  # Utility functions
    ├── jwt.ts              # JWT utility functions
    └── password.ts         # Password hashing utilities
```

## API Endpoints

This section provides a detailed guide for each API endpoint, including required headers, request body format, and example responses.

### Authentication

#### Create a new user account
- **URL**: `POST /api/auth/signup`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com"
      },
      "token": "your.jwt.token"
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Missing fields or invalid format)
  - 409 Conflict (Email already in use)

#### Authenticate a user and get a token
- **URL**: `POST /api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com"
      },
      "token": "your.jwt.token"
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Missing fields)
  - 401 Unauthorized (Invalid credentials)

### Article Management

#### Get all articles for the authenticated user
- **URL**: `GET /api/articles`
- **Headers**: `Authorization: Bearer your.jwt.token`
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "articles": [
        {
          "id": 1,
          "user_id": 1,
          "url": "https://example.com/article",
          "title": "Example Article",
          "question": "What is the main topic of this article?",
          "answer": "Example topic",
          "is_read": false,
          "created_at": "2023-10-15T12:00:00Z"
        }
      ]
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized (Missing or invalid token)

#### Get a specific article
- **URL**: `GET /api/articles/:id`
- **Headers**: `Authorization: Bearer your.jwt.token`
- **Parameters**: `:id` - The article ID
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "article": {
        "id": 1,
        "user_id": 1,
        "url": "https://example.com/article",
        "title": "Example Article",
        "question": "What is the main topic of this article?",
        "answer": "Example topic",
        "is_read": false,
        "created_at": "2023-10-15T12:00:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Invalid article ID)
  - 401 Unauthorized (Missing or invalid token)
  - 403 Forbidden (Article belongs to another user)
  - 404 Not Found (Article not found)

#### Save a new article
- **URL**: `POST /api/articles`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer your.jwt.token`
- **Request Body**:
  ```json
  {
    "url": "https://example.com/article",
    "title": "Example Article"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "status": "success",
    "data": {
      "article": {
        "id": 1,
        "user_id": 1,
        "url": "https://example.com/article",
        "title": "Example Article",
        "question": "What is the main topic of this article?",
        "answer": "Example topic",
        "is_read": false,
        "created_at": "2023-10-15T12:00:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Missing fields)
  - 401 Unauthorized (Missing or invalid token)
  - 500 Internal Server Error (Error fetching or analyzing content)

#### Update an article
- **URL**: `PATCH /api/articles/:id`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer your.jwt.token`
- **Parameters**: `:id` - The article ID
- **Request Body** (only fields to be updated):
  ```json
  {
    "title": "Updated Article Title",
    "is_read": true
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "article": {
        "id": 1,
        "user_id": 1,
        "url": "https://example.com/article",
        "title": "Updated Article Title",
        "question": "What is the main topic of this article?",
        "answer": "Example topic",
        "is_read": true,
        "created_at": "2023-10-15T12:00:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Invalid article ID or no valid fields to update)
  - 401 Unauthorized (Missing or invalid token)
  - 404 Not Found (Article not found or unauthorized)

#### Delete an article
- **URL**: `DELETE /api/articles/:id`
- **Headers**: `Authorization: Bearer your.jwt.token`
- **Parameters**: `:id` - The article ID
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "message": "Article deleted successfully"
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Invalid article ID)
  - 401 Unauthorized (Missing or invalid token)
  - 404 Not Found (Article not found or unauthorized)

#### Verify reading by answering a question
- **URL**: `POST /api/articles/:id/verify`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer your.jwt.token`
- **Parameters**: `:id` - The article ID
- **Request Body**:
  ```json
  {
    "answer": "Example topic"
  }
  ```
- **Success Response for Correct Answer** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "verified": true,
      "message": "Correct answer! Article marked as read.",
      "article": {
        "id": 1,
        "user_id": 1,
        "url": "https://example.com/article",
        "title": "Example Article",
        "question": "What is the main topic of this article?",
        "answer": "Example topic",
        "is_read": true,
        "created_at": "2023-10-15T12:00:00Z"
      }
    }
  }
  ```
- **Success Response for Incorrect Answer** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "verified": false,
      "message": "Incorrect answer. Try again.",
      "article": {
        "id": 1,
        "user_id": 1,
        "url": "https://example.com/article",
        "title": "Example Article",
        "question": "What is the main topic of this article?",
        "answer": "Example topic",
        "is_read": false,
        "created_at": "2023-10-15T12:00:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request (Invalid article ID or missing answer)
  - 401 Unauthorized (Missing or invalid token)
  - 403 Forbidden (Article belongs to another user)
  - 404 Not Found (Article not found)

### User Info

#### Get authenticated user information
- **URL**: `GET /api/user`
- **Headers**: `Authorization: Bearer your.jwt.token`
- **Success Response** (200 OK):
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com"
      }
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized (Missing or invalid token)

## Using the API with cURL

Here are examples of how to call these endpoints using cURL:

### Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Save Token
```bash
# Save the token from the login response
TOKEN="your.jwt.token"
```

### Get Articles
```bash
curl -X GET http://localhost:8000/api/articles \
  -H "Authorization: Bearer $TOKEN"
```

### Save New Article
```bash
curl -X POST http://localhost:8000/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://example.com/article", "title": "Example Article"}'
```

### Verify Article Reading
```bash
curl -X POST http://localhost:8000/api/articles/1/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"answer": "Example topic"}'
```

### Get User Info
```bash
curl -X GET http://localhost:8000/api/user \
  -H "Authorization: Bearer $TOKEN"
```

## Setup Instructions

### Prerequisites

1. Deno installed (version 1.35 or higher)
2. PostgreSQL database server
3. OpenAI API key

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
PORT=8000
DB_URL=postgres://user:password@localhost:5432/read-check-db
JWT_SECRET=your-secure-jwt-secret
OPENAI_API_KEY=your-openai-api-key
ENV=development
```

### Running the Application

1. Clone the repository
2. Install dependencies:
   ```
   deno cache src/deps.ts
   ```
3. Run the application:
   ```
   deno task dev
   ```