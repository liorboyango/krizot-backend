# Krizot Backend API

Node.js/Express REST API for the Krizot Administrative Scheduler application.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js v4
- **Database**: PostgreSQL
- **ORM**: Prisma v5
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: Joi
- **Security**: Helmet, CORS, rate-limiter-flexible
- **Testing**: Jest + Supertest

## Project Structure

```
krizot-backend/
├── prisma/
│   ├── schema.prisma        # Database schema (User, Station, Schedule)
│   └── seed.js              # Database seeder
├── src/
│   ├── index.js             # App entry point
│   ├── config/
│   │   └── database.js      # Prisma client singleton
│   ├── models/              # Model utility helpers
│   │   ├── index.js
│   │   ├── userModel.js
│   │   ├── stationModel.js
│   │   ├── scheduleModel.js
│   │   └── refreshTokenModel.js
│   ├── middleware/          # Auth, validation, error handling
│   ├── routes/              # API route definitions
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic
│   └── utils/               # Helpers, error classes, logger
├── .env.example             # Environment variable template
├── package.json
└── README.md
```

## Database Schema

### Models

| Model | Description |
|-------|-------------|
| `User` | Shift managers and admins with RBAC roles |
| `Station` | Physical work stations/posts |
| `Schedule` | Shift assignments linking users to stations |
| `RefreshToken` | JWT refresh token management |

### Relationships

- `User` → `Schedule[]` (one-to-many)
- `Station` → `Schedule[]` (one-to-many)
- `User` → `RefreshToken[]` (one-to-many)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate:dev

# Seed the database (optional, for development)
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required environment variables.

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Access token signing secret | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | ✅ |
| `JWT_EXPIRES_IN` | Access token expiry (default: 15m) | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (default: 7d) | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins | ❌ |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | - | Health check |
| `/api/auth/login` | POST | - | Login → JWT |
| `/api/auth/refresh` | POST | - | Refresh access token |
| `/api/auth/logout` | POST | JWT | Logout (revoke token) |
| `/api/stations` | GET | JWT | List stations |
| `/api/stations` | POST | JWT | Create station |
| `/api/stations/:id` | GET | JWT | Get station |
| `/api/stations/:id` | PUT | JWT | Update station |
| `/api/stations/:id` | DELETE | JWT (Admin) | Delete station |
| `/api/schedules` | GET | JWT | List schedules |
| `/api/schedules` | POST | JWT | Create schedule |
| `/api/schedules/assign` | POST | JWT | Bulk assign shifts |
| `/api/schedules/:id` | GET | JWT | Get schedule |
| `/api/schedules/:id` | PUT | JWT | Update schedule |
| `/api/schedules/:id` | DELETE | JWT | Delete schedule |
| `/api/users` | GET | JWT (Admin) | List users |
| `/api/users/:id` | GET | JWT | Get user |
| `/api/users/:id` | PUT | JWT | Update user |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Security

- JWT access tokens expire in 15 minutes
- Refresh tokens expire in 7 days with rotation
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting: 100 requests/minute/IP
- Helmet.js for security headers
- Input validation with Joi on all endpoints
- CORS whitelist configuration
