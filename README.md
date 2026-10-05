# ShelfLife API

ShelfLife is a REST API for a college or university library. It manages books, members, librarian accounts, and borrowing records.

## Tech stack

Node.js, Express 5, MongoDB, Mongoose, Joi, bcryptjs, JSON Web Tokens, dotenv, and CORS.

## Requirements and installation

- Node.js 20.19 or newer
- MongoDB 6.0 or newer configured as a replica set (a single-node replica set is fine for local development)

```sh
npm install
cp .env.example .env
```

Set `MONGODB_URI` to your replica-set connection string and use different random values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Keep `.env` private. Transactions used by issuing, returning, and rotating refresh tokens are not supported by standalone MongoDB servers.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `5000` |
| `MONGODB_URI` | MongoDB connection string; required |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens; required and distinct from the refresh secret |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime; defaults to `15m` |
| `JWT_REFRESH_SECRET` | Separate secret used to sign refresh tokens; required |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime; defaults to `7d` |
| `LIBRARIAN_REGISTRATION_KEY` | Required in production as the `X-Librarian-Registration-Key` header for librarian registration |
| `CLIENT_URL` | Allowed browser origin for CORS |
| `NODE_ENV` | Set to `production` to hide unexpected error details |

## Run locally

```sh
npm run dev
```

For a normal start, run `npm start`. The API listens at `http://localhost:5000` by default. MongoDB must be reachable before the server starts.

Run the automated backend tests with `npm test`.

## Project structure

```text
server/
  config/db.js
  controllers/
  middlewares/
  models/
  routes/
  validators/
  app.js
  server.js
```

## Authentication

Login returns a 15-minute access token and a 7-day refresh token. Send only the access token to protected routes as `Authorization: Bearer <accessToken>`; refresh tokens are never accepted by authorization middleware. Refresh tokens use a separate signing secret and are persisted only as a random `jti`, user reference, expiration, and revocation date. Refresh rotates the token atomically, making the previous token unusable. Logout revokes its refresh token. Passwords are bcrypt-hashed and never returned.

Registration is open in development. In production, configure `LIBRARIAN_REGISTRATION_KEY` and send it as `X-Librarian-Registration-Key` when registering a librarian; requests without the key are rejected.

## API endpoints

Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

Example paginated response:

```json
{
  "success": true,
  "data": [{ "title": "Harry Potter", "availableCopies": 4 }],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Example error response:

```json
{ "success": false, "message": "Book is currently unavailable" }
```

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Development; registration key in production | Register a librarian |
| `POST` | `/api/auth/login` | Public | Log in |
| `POST` | `/api/auth/refresh` | Refresh token in request body | Rotate both tokens |
| `POST` | `/api/auth/logout` | Refresh token in request body | Revoke a refresh token |
| `POST` | `/api/books` | Librarian | Create a book |
| `GET` | `/api/books` | Public | List, paginate, filter by genre, or search title |
| `GET` | `/api/books/:id` | Public | Get a book |
| `PATCH` | `/api/books/:id` | Librarian | Update book details or copy count |
| `DELETE` | `/api/books/:id` | Librarian | Delete a book with no active loans |
| `POST` | `/api/members` | Librarian | Register a member |
| `GET` | `/api/members` | Public | List and search members |
| `GET` | `/api/members/:id` | Public | Get a member |
| `GET` | `/api/members/:id/history` | Public | Get newest-first borrowing history |
| `POST` | `/api/borrow` | Librarian | Issue an available book |
| `POST` | `/api/borrow/return/:borrowId` | Librarian | Return an issued or overdue book |

Book and member lists accept `page` and `limit` (defaults `1` and `10`, maximum limit `100`). Book lists also accept `genre` and `search`; member lists accept `search`. List responses include `pagination` with page, limit, total, and totalPages. Member history updates expired issued records to `overdue` when read.

## Example requests

Register and log in:

```sh
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Library Admin","email":"librarian@example.edu","password":"change-this-password"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"librarian@example.edu","password":"change-this-password"}'

curl -X POST http://localhost:5000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"paste-refresh-token-here"}'

curl -X POST http://localhost:5000/api/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"paste-current-refresh-token-here"}'
```

Use the returned token for librarian operations:

```sh
TOKEN='paste-access-token-here'

curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Harry Potter","author":"J. K. Rowling","ISBN":"9780747532699","genre":"Fantasy","totalCopies":5}'

curl 'http://localhost:5000/api/books?page=1&limit=10&genre=Fantasy&search=harry'

curl -X POST http://localhost:5000/api/members \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Hamza Khan","email":"hamza@example.edu","membershipId":"STU-1001"}'

curl -X POST http://localhost:5000/api/borrow \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"bookId":"BOOK_OBJECT_ID","memberId":"MEMBER_OBJECT_ID"}'

curl -X POST http://localhost:5000/api/borrow/return/BORROW_RECORD_ID \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:5000/api/members/MEMBER_OBJECT_ID/history
```

## Concurrency and inventory

Issuing uses a MongoDB conditional `findOneAndUpdate` that decrements only when `availableCopies` is greater than zero. Concurrent requests therefore cannot issue the final copy twice. The decrement and borrow record creation share a transaction. Returning atomically claims an unreturned borrow record, then increments inventory only when it is below `totalCopies`; the claim and increment share a transaction, so repeated returns cannot increment it twice. Book count edits use a conditional update so they cannot overwrite a simultaneous issue.