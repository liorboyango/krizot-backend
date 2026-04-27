# Krizot Backend API

RESTful API for the Krizot Administrative Scheduler application. Built with Node.js, Express, PostgreSQL, and Prisma ORM.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/liorboyango/krizot-backend.git
cd krizot-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed

# Start the development server
npm run dev
```

### Production

```bash
# Run migrations
npm run prisma:migrate:prod

# Start the server
npm start
```

## 📁 Project Structure

```
krizot-backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Database seeder
├── src/
│   ├── index.js            # Server entry point
│   ├── config/
│   │   ├── database.js     # Prisma client singleton
│   │   └── jwt.js          # JWT configuration
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication & RBAC
│   │   ├── errorHandler.js # Global error handler
│   │   ├── rateLimiter.js  # Rate limiting
│   │   └── validation.js   # Joi validation helpers
│   ├── routes/
│   │   ├── auth.js         # /api/auth/*
│   │   ├── users.js        # /api/users/*
│   │   ├── stations.js     # /api/stations/*
│   │   └── schedules.js    # /api/schedules/*
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── models/             # Data models & utilities
│   └── utils/
│       ├── errors.js       # Custom error classes
│       ├── logger.js       # Winston logger
│       └── response.js     # Response helpers
├── .env.example
├── .gitignore
└── package.json
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Logout | Yes |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users | Admin |
| POST | `/api/users` | Create user | Admin |
| GET | `/api/users/:id` | Get user by ID | Yes |
| PUT | `/api/users/:id` | Update user | Yes |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Stations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stations` | List all stations | Yes |
| POST | `/api/stations` | Create station | Admin/Manager |
| GET | `/api/stations/:id` | Get station by ID | Yes |
| PUT | `/api/stations/:id` | Update station | Admin/Manager |
| DELETE | `/api/stations/:id` | Delete station | Admin |

### Schedules
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/schedules` | List schedules | Yes |
| POST | `/api/schedules` | Create schedule | Admin/Manager |
| GET | `/api/schedules/:id` | Get schedule by ID | Yes |
| PUT | `/api/schedules/:id` | Update schedule | Admin/Manager |
| DELETE | `/api/schedules/:id` | Delete schedule | Admin/Manager |
| POST | `/api/schedules/assign` | Bulk assign shifts | Admin/Manager |

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

Include the access token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## 🛡️ Security Features

- **Helmet**: HTTP security headers
- **CORS**: Configurable origin whitelist
- **Rate Limiting**: 100 req/min globally, 10 attempts/15min for auth
- **Input Validation**: Joi schema validation on all endpoints
- **Password Hashing**: bcrypt with salt rounds = 12
- **JWT Expiry**: Short-lived access tokens (15m)
- **RBAC**: Role-based access control (admin/manager)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## 📊 Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

## 🌍 Environment Variables

See `.env.example` for all available configuration options.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | - | JWT refresh signing secret |
| `ALLOWED_ORIGINS` | No | localhost | CORS allowed origins |

## 📝 License

MIT
