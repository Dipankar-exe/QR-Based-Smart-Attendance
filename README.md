# QR-Based Smart Attendance System

A full-stack smart attendance platform using dynamic QR-based attendance, HMAC signature verification, geolocation proximity checking, and role-based access control.

---

## 🌟 Overview

The **QR-Based Smart Attendance System** automates classroom attendance tracking while preventing proxy scans and attendance fraud. Teachers launch dynamic attendance sessions that cycle auto-rotating QR codes every 15 seconds. Students scan the QR code using their device camera, while their device GPS location is verified against the designated classroom coordinates using the Haversine formula.

---

## ✨ Features

- **Dynamic 15-Second QR Rotation**: HMAC SHA-256 signed QR codes rotate automatically to prevent screenshot sharing or replay attacks.
- **Geolocation Proximity Check**: Validates student coordinates against configurable campus/classroom geofence boundaries.
- **Student Registration Number Authentication**: Role-tailored login requiring Student Registration Number and Password.
- **Teacher & Admin Portals**:
  - **Admin**: Manage departments, classes, subjects, faculty accounts, student enrollments, and global system configurations.
  - **Teacher**: Launch active attendance sessions, view live auto-updating student rosters, and apply manual attendance overrides with mandatory audit logs.
  - **Student**: View personal attendance percentages, subject summaries, and scan dynamic QR codes to mark attendance.
- **Security & Session Controls**: Single-use QR token verification, JWT authentication with HttpOnly cookies, refresh token rotation, and rate-limiting.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Logic**: React 19, TypeScript
- **Styling**: Vanilla CSS, Tailwind CSS
- **QR Display & Scanning**: `qrcode.react` & `html5-qrcode`

### Backend
- **Runtime**: Node.js, TypeScript, `tsx`
- **API Framework**: Express.js
- **Database ORM**: [Prisma ORM (v6)](https://www.prisma.io/)
- **Database Engine**: MySQL 8.0
- **Validation**: Zod
- **Authentication**: JWT (JSON Web Tokens) with HttpOnly Cookies & Refresh Token rotation
- **Security**: `helmet`, `cors`, `bcrypt`, `express-rate-limit`

---

## 📁 Project Structure

```
qr-based-smart-attendance-system/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database models & relationships
│   ├── scripts/
│   │   ├── seed-admin.ts       # Initial Admin account bootstrap script
│   │   └── clean-and-seed-demo-data.ts # Development demo seeding script
│   ├── src/
│   │   ├── controllers/        # Express request controllers
│   │   ├── middleware/         # Auth, validation & rate limiting
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic & database operations
│   │   ├── utils/              # Crypto, JWT & distance utilities
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # Server entry point
│   ├── .env.example            # Environment variable template
│   └── package.json
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components & layouts
│   ├── context/                # AuthContext & global state
│   ├── lib/                    # API fetch wrappers & helper utilities
│   ├── .env.example            # Frontend environment variable template
│   └── package.json
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL**: v8.0 or higher
- **npm** or **yarn**

---

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd qr-based-smart-attendance-system
```

---

### Step 2: Configure Environment Variables

Create `.env` files for both backend and frontend using the provided templates:

#### Backend Environment Setup

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Configure your local database credentials and secrets in `backend/.env`:

```env
PORT=5000
FRONTEND_URL="http://localhost:3000"
DATABASE_URL="mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/qr_smart_attendance"
BCRYPT_SALT_ROUNDS=12

JWT_ACCESS_SECRET="your-secure-access-token-secret-min-32-chars"
JWT_REFRESH_SECRET="your-secure-refresh-token-secret-min-32-chars"

INITIAL_ADMIN_EMAIL="admin@yourinstitution.edu"
INITIAL_ADMIN_PASSWORD="YourStrongAdminPassword123!"
INITIAL_ADMIN_NAME="System Administrator"

SEED_STUDENT_PASSWORD="YourStrongStudentPassword123!"
SEED_TEACHER_PASSWORD="YourStrongTeacherPassword123!"

QR_ROTATION_SECONDS=15
QR_SECRET_KEY="your-secure-qr-hmac-secret-min-32-chars"

COLLEGE_LATITUDE=28.6139
COLLEGE_LONGITUDE=77.2090
COLLEGE_MAX_RADIUS_METERS=100
GEOLOCATION_MAX_ACCURACY_METERS=50
GEOLOCATION_MAX_AGE_SECONDS=30
```

#### Frontend Environment Setup

Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

Configure your backend URL in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_CLOUDFLARE_API_URL=""
```

---

### Step 3: Install Backend Dependencies & Run Database Migrations

```bash
cd backend
npm install

# Run Prisma migrations to set up MySQL database schema
npx prisma migrate dev --name init

# Bootstrap initial Admin user account
npm run seed:admin
```

To seed sample development data (departments, subjects, demo student, demo teacher):

```bash
npx tsx scripts/clean-and-seed-demo-data.ts
```

---

### Step 4: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

### Step 5: Start Development Servers

In the `backend` directory:
```bash
npm run dev
```

In the `frontend` directory:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Credentials Notice

> **No real Student, Teacher, or Admin credentials are included in this repository. Configure your own development credentials through environment variables.**

---

## 🧪 Production Build & Validation

To test TypeScript compilation and Next.js production builds:

```bash
# Validate Prisma Schema
cd backend && npx prisma validate

# Build Backend
npm run build

# Build Frontend
cd ../frontend && npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
