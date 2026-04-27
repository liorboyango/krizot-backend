# Krizot Backend API

RESTful API for the Krizot Administrative Scheduler application. Built with Node.js, Express, PostgreSQL, and Prisma ORM.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 9

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed

# Start development server
npm run dev
```

### Production

```bash
# Run migrations
npm run prisma:migrate:prod

# Start server
npm start
```

## 📁 Project Structure

```
krizot-backend/
├── src/
│   ├── index.js              # Server entry point
│   ├── config/
│   │   ├── database.js       # Prisma client singleton
│   │   ├── cors.js           # CORS configuration
│   │   └── jwt.js            # JWT utilities
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication & RBAC
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── validation.js     # Joi validation middleware
│   │   ├── errorHandler.js   # Global error handler
│   │   └── notFoundHandler.js
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── users.js          # /api/users/*
│   │   ├── stations.js       # /api/stations/*
│   │   └── schedules.js      # /api/schedules/*
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── validators/           # Joi schemas
│   └── utils/
│       ├── logger.js         # Winston logger
│       ├── errors.js         # Custom error classes
│       └── response.js       # Response helpers
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.js               # Seed data
├── tests/                    # Jest tests
├── .env.example
├── .gitignore
└── package.json
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | - | Login with email/password |
| POST | `/api/auth/refresh` | - | Refresh access token |
| POST | `/api/auth/logout` | JWT | Logout (invalidate token) |
| GET | `/api/auth/me` | JWT | Get current user profile |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | JWT (admin) | List all users |
| POST | `/api/users` | JWT (admin) | Create user |
| GET | `/api/users/:id` | JWT | Get user by ID |
| PUT | `/api/users/:id` | JWT | Update user |
| DELETE | `/api/users/:id` | JWT (admin) | Delete user |

### Stations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stations` | JWT | List all stations |
| POST | `/api/stations` | JWT (admin) | Create station |
| GET | `/api/stations/:id` | JWT | Get station by ID |
| PUT | `/api/stations/:id` | JWT (admin) | Update station |
| DELETE | `/api/stations/:id` | JWT (admin) | Delete station |

### Schedules
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/schedules` | JWT | List schedules |
| POST | `/api/schedules` | JWT (admin/manager) | Create schedule |
| POST | `/api/schedules/assign` | JWT (admin/manager) | Bulk assign shifts |
| GET | `/api/schedules/:id` | JWT | Get schedule by ID |
| PUT | `/api/schedules/:id` | JWT (admin/manager) | Update schedule |
| DELETE | `/api/schedules/:id` | JWT (admin) | Delete schedule |

## 🔒 Authentication

All protected endpoints require a JWT Bearer token:
```
Authorization: Bearer <access_token>
```

Tokens expire after 15 minutes. Use `/api/auth/refresh` with your refresh token to get a new access token.

## 📊 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated List
```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required"
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## 🌱 Default Credentials (Development)

After running `npm run prisma:seed`:
- **Admin**: `admin@krizot.com` / `Admin@123456`
- **Manager**: `manager@krizot.com` / `Manager@123456`

## 🔧 Environment Variables

See `.env.example` for all required environment variables.

| Variable | Description | Default |
|----------|-------------|--------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL URL | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `localhost:3000` |
| `RATE_LIMIT_MAX` | Requests/min per IP | `100` |
| `RATE_LIMIT_AUTH_MAX` | Auth requests/min | `10` |
