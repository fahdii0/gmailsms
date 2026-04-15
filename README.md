# GmailSMS – Temporary Gmail Service

A full-stack web panel for purchasing temporary Gmail addresses using the SMSBower API. Built with **Next.js 14+**, **TypeScript**, **MongoDB**, and **Tailwind CSS**.

## Features

### Admin Panel
- View all registered clients and their balances
- Grant/add balance to any client (in PKR)
- View all purchase history across clients
- Set the fixed price for Gmail purchases

### Client Panel
- View current balance in PKR
- One-click Gmail purchase (balance deducted automatically)
- View purchased Gmail address and Mail ID
- Get verification code for active Gmail
- Mark purchases as complete or cancel them
- Full purchase history

### Security
- JWT-based authentication (cookie + bearer token)
- API key stored server-side only (never exposed to frontend)
- Bcrypt password hashing
- Role-based access control (admin vs client)

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **UI**: Tailwind CSS
- **API**: SMSBower (server-side only)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- SMSBower API key

### 1. Clone the repository
```bash
git clone https://github.com/fahdii0/gmailsms.git
cd gmailsms
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gmailsms
JWT_SECRET=your-super-secret-jwt-key-change-this
SMSBOWER_API_KEY=your-smsbower-api-key-here
```

### 4. Seed the admin user
```bash
MONGODB_URI="your-mongodb-uri" node scripts/seed-admin.mjs
```

Default admin credentials:
- **Email**: admin@gmailsms.com
- **Password**: admin123456

> ⚠️ Change the admin password after first login.

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

1. Push the repository to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `SMSBOWER_API_KEY`
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, register, me
│   │   ├── admin/         # Clients, balance, settings, purchases
│   │   └── client/        # Buy Gmail, get code, set status, balance, purchases
│   ├── admin/             # Admin panel pages
│   ├── dashboard/         # Client dashboard page
│   ├── login/             # Login/register page
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Home redirect
├── components/
│   ├── AuthProvider.tsx   # Auth context + JWT management
│   └── Navbar.tsx         # Navigation bar
├── lib/
│   ├── auth.ts            # JWT sign/verify helpers
│   ├── db.ts              # MongoDB connection (cached)
│   └── smsbower.ts        # SMSBower API client (server-side)
├── models/
│   ├── User.ts            # User schema (admin/client)
│   ├── Purchase.ts        # Purchase schema
│   └── Settings.ts        # Key-value settings
└── ...
scripts/
└── seed-admin.mjs         # Admin user seed script
```

## API Endpoints

### Auth
- `POST /api/auth/login` – Login
- `POST /api/auth/register` – Register new client
- `GET /api/auth/me` – Get current user

### Admin (requires admin role)
- `GET /api/admin/clients` – List all clients
- `POST /api/admin/balance` – Grant balance to client
- `GET /api/admin/settings` – Get pricing settings
- `POST /api/admin/settings` – Update pricing
- `GET /api/admin/purchases` – List all purchases

### Client (requires authentication)
- `GET /api/client/balance` – Get balance
- `POST /api/client/buy-gmail` – Purchase Gmail
- `POST /api/client/get-code` – Get verification code
- `POST /api/client/set-status` – Cancel/complete purchase
- `GET /api/client/purchases` – Purchase history

## Workflow

1. **Client registers** → Lands on dashboard with 0 PKR balance
2. **Admin grants balance** → Admin adds PKR to client's account
3. **Client buys Gmail** → Clicks "Buy Gmail", balance deducted, email shown
4. **Client gets code** → Clicks "Get Code", verification code displayed
5. **Client completes/cancels** → Marks purchase as done or cancelled

## License
MIT
