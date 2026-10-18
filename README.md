# Users REST API - DecodeLabs Project 2

## Project Description

A small, clean backend API built with **Node.js and Express** that manages a collection of **users**. It accepts JSON from a client, validates it on the server, applies simple business logic, and answers with consistent JSON and meaningful HTTP status codes. Data is kept in memory (no database), so it resets whenever the server restarts.

## Project Goal

Demonstrate the fundamentals of backend API development from the DecodeLabs Project 2 kit:

- Create API endpoints (GET / POST, plus PUT / DELETE)
- Handle user input and responses (the Input -> Process -> Output model)
- Validate data on the server ("Never trust the client")
- Exchange data as JSON
- Communicate state with semantic HTTP status codes
- Separate authentication (who are you?) from authorization (what can you do?)
- Build resilience: central error handling, JSON size limit, rate limiting
- Document everything so another developer can run it

## Technologies Used

- Node.js 18+ (20 or newer recommended)
- Express.js 4
- dotenv (loads environment variables)
- nodemon (development only, auto-restart)
- Built-in `node:test` for automated tests (no extra test library)

## Installation

```bash
cd decodelabs-users-api
npm install
```

The `.env` file is already included with **development-only** values so the project runs immediately. It is git-ignored. For your own setup, copy `.env.example` to `.env` and choose your own keys.

## How to Run

```bash
npm start        # production-style start
npm run dev      # auto-restarts on file changes (nodemon)
npm test         # runs the automated test suite
```

The server starts on `http://localhost:5000` (configurable with `PORT`). Quick check: open `http://localhost:5000/api/health`.

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `ADMIN_API_KEY` | API key that gets the **admin** role | none (must be set) |
| `USER_API_KEY` | API key that gets the **user** role | none (must be set) |
| `JSON_LIMIT` | Max JSON body size | `10kb` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms | `60000` |
| `RATE_LIMIT_MAX` | Max requests per IP per window | `100` |

Generate a strong key: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`

## Folder Structure

```
decodelabs-users-api/
├── server.js                       # starts the server, graceful shutdown
├── app.js                          # builds the Express app (middleware + routes)
├── config.js                       # reads environment variables
├── package.json
├── .env                            # local values (git-ignored)
├── .env.example                    # template without real secrets
├── .gitignore
├── README.md
├── routes/
│   ├── health.routes.js            # GET /api/health
│   └── users.routes.js             # /api/users routes + access rules
├── controllers/
│   └── users.controller.js         # business logic for each endpoint
├── middleware/
│   ├── validation.middleware.js    # server-side validation
│   ├── auth.middleware.js          # authentication (401) + authorization (403)
│   ├── rateLimit.middleware.js     # rate limiting (429)
│   └── error.middleware.js         # logger, 404, 405, central error handler (500)
├── data/
│   └── users.data.js               # in-memory storage
├── utils/
│   ├── response.js                 # consistent JSON response helpers
│   └── AppError.js                 # error class with status code
└── tests/
    └── api.test.js                 # automated tests
```

How a request flows: **rate limiter -> JSON parser -> route -> (authenticate -> authorize -> validate) -> controller -> response helper**. Any error goes to the one central error handler.

## API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Purpose | Access | Success |
|---|---|---|---|---|
| GET | `/api/health` | Check the API is running | Public | 200 |
| GET | `/api/users` | List all users | Public | 200 |
| GET | `/api/users/:id` | Get one user | Public | 200 |
| POST | `/api/users` | Create a user | admin or user key | 201 |
| PUT | `/api/users/:id` | Replace a user's name and email | admin or user key | 200 |
| DELETE | `/api/users/:id` | Delete a user | **admin key only** | 204 |

## HTTP Methods

- **GET** retrieves data. It is safe (changes nothing) and idempotent.
- **POST** creates a new resource, so it is not idempotent: sending it twice would create two users (the duplicate-email check returns 409 the second time).
- **PUT** replaces an existing resource. It is idempotent: the same request repeated gives the same result. It never creates (unknown id -> 404), and both `name` and `email` are required because PUT is a full replacement.
- **DELETE** removes a resource and returns 204 with no body.
- Any other method on a known route returns **405** with an `Allow` header.

## Authentication & Authorization

- **Authentication (AuthN) - "Who are you?"** The client sends an API key in the `x-api-key` header. Missing or unknown key -> **401 Unauthorized**.
- **Authorization (AuthZ) - "What can you do?"** The key maps to a role. A known role that is not allowed to perform the action -> **403 Forbidden**.

| Key | Role | Can do |
|---|---|---|
| none | anonymous | GET endpoints |
| `USER_API_KEY` | user | GET, POST, PUT |
| `ADMIN_API_KEY` | admin | GET, POST, PUT, DELETE |

This is a deliberately simple demonstration. A real system would use accounts, hashed passwords and tokens (such as JWT). Keys live in environment variables, never in the source code. The `role` field inside a user record is just profile data and is unrelated to the API-key role; clients cannot set it.

## Request & Response Format

All responses are JSON with a consistent shape.

Success:
```json
{ "success": true, "data": { "id": 101, "name": "John Doe", "email": "john@example.com", "role": "user" } }
```

Error:
```json
{ "success": false, "error": { "message": "Validation failed", "details": ["email is required"] } }
```
(`details` appears only when there is more to say, such as validation messages.)

## Endpoint Documentation and Examples

The examples use curl. In **Postman / Thunder Client**, set the method and URL, add the header `x-api-key` (and `Content-Type: application/json` for POST/PUT), and paste the JSON into Body -> raw -> JSON.

### GET /api/health

Returns **200 OK**
```bash
curl -i http://localhost:5000/api/health
```
```json
{ "success": true, "message": "API is running" }
```

### GET /api/users

Description: returns all users. Returns **200 OK**
```bash
curl -i http://localhost:5000/api/users
```
```json
{
  "success": true,
  "count": 3,
  "data": [
    { "id": 101, "name": "John Doe", "email": "john@example.com", "role": "user" },
    { "id": 102, "name": "Jane Smith", "email": "jane@example.com", "role": "user" },
    { "id": 103, "name": "Admin User", "email": "admin@example.com", "role": "admin" }
  ]
}
```

### GET /api/users/:id

Description: returns one user. **200 OK**, **400** if the id is not a positive integer, **404** if it does not exist.
```bash
curl -i http://localhost:5000/api/users/101
curl -i http://localhost:5000/api/users/999
```
404 body:
```json
{ "success": false, "error": { "message": "User with id 999 not found" } }
```

### POST /api/users

- URL: `http://localhost:5000/api/users`
- Method: `POST`
- Headers: `Content-Type: application/json`, `x-api-key: <USER_API_KEY or ADMIN_API_KEY>`
- Body:
```json
{ "name": "Sam Lee", "email": "sam@example.com" }
```
```bash
curl -i -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-user-key-change-me" \
  -d '{"name":"Sam Lee","email":"sam@example.com"}'
```
Success **201 Created** (plus a `Location: /api/users/104` header):
```json
{ "success": true, "data": { "id": 104, "name": "Sam Lee", "email": "sam@example.com", "role": "user" } }
```
Validation error **400 Bad Request** (body `{"name": 42, "email": "not-an-email"}`):
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": ["name must be a string", "Invalid email address"]
  }
}
```
Other errors: **401** missing/invalid key, **409** email already used, **413** body too large.

### PUT /api/users/:id

- URL: `http://localhost:5000/api/users/104`
- Headers: `Content-Type: application/json`, `x-api-key: <key>`
- Body (full replacement, both fields required):
```json
{ "name": "Samuel Lee", "email": "samuel@example.com" }
```
```bash
curl -i -X PUT http://localhost:5000/api/users/104 \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-user-key-change-me" \
  -d '{"name":"Samuel Lee","email":"samuel@example.com"}'
```
Success **200 OK**:
```json
{ "success": true, "data": { "id": 104, "name": "Samuel Lee", "email": "samuel@example.com", "role": "user" } }
```
Errors: **400** invalid data, **401** no/invalid key, **404** user does not exist, **409** email used by someone else.

### DELETE /api/users/:id

- Headers: `x-api-key: <ADMIN_API_KEY>`
```bash
curl -i -X DELETE http://localhost:5000/api/users/104 -H "x-api-key: dev-admin-key-change-me"
```
Success **204 No Content** (empty body). Errors: **401** no/invalid key, **403** user key (not admin), **404** user does not exist.

403 body:
```json
{ "success": false, "error": { "message": "Role \"user\" is not allowed to perform this action" } }
```

## Validation Rules

Validation runs on the server, whatever the frontend does.

| Field | Rules |
|---|---|
| `id` (URL) | Must be a positive integer |
| `name` | Required, string, not empty after trimming, 2-100 characters |
| `email` | Required, string, not empty, valid format (`text@domain.tld`), max 254 characters; stored lowercase and must be unique |
| other fields | Rejected (for example `role` or `id` in the body) |
| body | Must be a JSON object; size limited by `JSON_LIMIT` |

Values are trimmed before being stored.

## HTTP Status Codes

| Code | Meaning | Used when |
|---|---|---|
| 200 | OK | Successful GET / PUT, health check |
| 201 | Created | POST created a user |
| 204 | No Content | DELETE succeeded |
| 400 | Bad Request | Invalid JSON, invalid id, failed validation |
| 401 | Unauthorized | API key missing or invalid |
| 403 | Forbidden | Valid key, but the role is not allowed (DELETE with user key) |
| 404 | Not Found | Unknown user id or unknown route |
| 405 | Method Not Allowed | Unsupported method on an existing route |
| 409 | Conflict | Email already belongs to another user |
| 413 | Payload Too Large | Body bigger than `JSON_LIMIT` |
| 429 | Too Many Requests | Rate limit exceeded (includes `Retry-After` header) |
| 500 | Internal Server Error | Unexpected failure (generic message only) |

## Error Handling

- One central error handler (`middleware/error.middleware.js`) builds every error response, so the format never changes.
- Known problems are raised as `AppError(statusCode, message, details)`.
- Malformed JSON and oversized bodies are caught and converted into clean 400 / 413 responses.
- Unknown routes hit a catch-all 404; wrong methods on known routes get 405.
- Unexpected errors return `{"success": false, "error": {"message": "Internal server error"}}`. The stack trace is **logged on the server only**, never sent to the client.
- Invalid input never crashes the server.

## Security Notes

- Server-side validation of body and URL parameters ("Never trust the client")
- API keys come from environment variables; `.env` is git-ignored; comparison is constant-time
- JSON body size limit; `x-powered-by` header disabled; `X-Content-Type-Options: nosniff`
- Rate limiting per IP (default 100 requests/minute)
- The client cannot set the server-controlled `role` or `id`
- CORS is not enabled. If your Project 1 frontend runs on another origin and calls this API from the browser, add the `cors` package for that origin.

## Testing Instructions

### Automated

```bash
npm test
```
Runs 25 tests covering every endpoint, validation, 401/403/404/405/409/413/429/500 and idempotent PUT.

### Manual with Postman or Thunder Client

Create these requests (use `x-api-key` values from your `.env`):

| # | Test | Request | Expected |
|---|---|---|---|
| 1 | GET all | `GET /api/users` | 200 |
| 2 | GET one | `GET /api/users/101` | 200 |
| 3 | POST valid | `POST /api/users` + user key + valid body | 201 |
| 4 | POST invalid | same, body `{"name":"","email":"bad"}` | 400 |
| 5 | PUT valid | `PUT /api/users/104` + key + valid body | 200 |
| 6 | PUT nonexistent | `PUT /api/users/999` | 404 |
| 7 | DELETE existing | `DELETE /api/users/104` + admin key | 204 |
| 8 | DELETE nonexistent | `DELETE /api/users/999` + admin key | 404 |
| 9 | Invalid route | `GET /api/nothing` | 404 |
| 10 | Authentication failure | `POST /api/users` with no key | 401 |
| 11 | Authorization failure | `DELETE /api/users/101` with **user** key | 403 |
| 12 | Invalid JSON | POST with body `{"name": "x",` | 400 |
| 13 | Wrong method | `PATCH /api/users/101` | 405 |
| 14 | Rate limit | start with `RATE_LIMIT_MAX=5` and call `GET /api/health` 6 times | 6th is 429 |

The server error (500) path is verified by the automated test, which adds a route that deliberately throws.

To try the rate limit from the terminal (Windows PowerShell: `$env:RATE_LIMIT_MAX=5; npm start`):
```bash
RATE_LIMIT_MAX=5 npm start
# in another terminal:
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health; done
```

## License

MIT
