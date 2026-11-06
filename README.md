# Household & Family Expense Manager — Mobile App (বাংলা)

A production-oriented React Native Expo mobile application with 100% Bengali interface, offline-first SQLite database, automatic bidirectional synchronization with the backend, integer Paisa arithmetic, and multi-tier role support.

## Features

- **100% Bengali User Interface**: Every label, metric, button, and report in polished Bengali (বাংলা).
- **Offline-First Architecture**:
  - Uses `expo-sqlite` as the local primary database.
  - Full local CRUD with instant UI feedback when offline.
  - Sync queue records changes and auto-syncs when internet becomes reachable via `NetInfo`.
  - Idempotent updates with client UUIDs prevent duplicate financial transactions.
- **Three-Tier Role Architecture**:
  - `SUPER_ADMIN`: Household creation, household admin account setup, system account control.
  - `HOME_ADMIN`: Household member management, approved household expenses, member expense request reviews, monthly closing & carry-forward.
  - `HOME_USER`: Personal expenses, personal incomes, contributions, household expense requests.
- **Financial Settlement Engine**:
  - Automatic split calculation (Equal, Percentage, Exact) in integer Paisa.
  - Realtime member receivables and payables calculation.
  - Cash flow debt minimization algorithm matching debtors to creditors.
- **Security**:
  - `expo-secure-store` for JWT access and refresh token storage.
  - Custom App Lock with 4-digit PIN unlock keypad.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

**Network Configuration for Android & Physical Devices:**
- **iOS Simulator / Web**: `http://localhost:5000/api/v1`
- **Android Emulator**: `http://10.0.2.2:5000/api/v1` (10.0.2.2 points to host computer)
- **Physical Device**: `http://<YOUR_LAN_IP>:5000/api/v1` (e.g. `http://192.168.0.105:5000/api/v1`)
- **Vercel Cloud**: `https://<your-project>.vercel.app/api/v1`

### 3. Run Development Server
```bash
npm start
```
- Press `a` for Android Emulator
- Press `i` for iOS Simulator
- Press `w` for Web preview

### 4. Code Quality & Typecheck
```bash
npm run typecheck
npm run lint
```

## Android APK / AAB Build Instructions (EAS)

To produce production APK/AAB files:

1. Install EAS CLI:
```bash
npm install -g eas-cli
```
2. Log in to Expo:
```bash
eas login
```
3. Configure build profile in `eas.json`:
```bash
eas build:configure
```
4. Build APK for Android testing:
```bash
eas build -p android --profile preview
```
5. Build production AAB for Google Play Store:
```bash
eas build -p android --profile production
```

