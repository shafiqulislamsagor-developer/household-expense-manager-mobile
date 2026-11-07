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

---

## Android APK Download

- **Application Name**: পারিবারিক ব্যয় ও হিসাব (Household & Family Expense Manager)
- **Package ID**: `com.householdexpense.app`
- **Version**: `1.0.1` (Build 2) — *Updated with 365-day offline session & zero-loading state*
- **File Size**: `96.06 MB` (Valid ZIP/APK signature `504b0304`)
- **Build Date**: 2026-11-07
- **Production API URL**: `https://household-expense-manager-backend.vercel.app/api/v1`
- **EAS Build ID**: `ae73a217-8707-46c2-bb34-745ae4f51f45`
- **EAS Build Logs**: [View on Expo Dashboard](https://expo.dev/accounts/shafiqulislamsagor/projects/household-expense-manager/builds/ae73a217-8707-46c2-bb34-745ae4f51f45)
- **Direct APK Download Link (Fast Cloud CDN)**: [Download Household Expense Manager APK (Direct CDN)](https://expo.dev/artifacts/eas/wUHnVFOxOdWn3vG8pCjZFu4BDmeiMg7o7IRgzYx-570.apk)
- **GitHub Direct Download Link**: [Download Household Expense Manager APK (GitHub)](https://github.com/shafiqulislamsagor-developer/household-expense-manager-mobile/raw/main/releases/household-expense-manager.apk)
- **Relative Download Link**: [Download Household Expense Manager APK](releases/household-expense-manager.apk)
- **Local File Path**: `releases/household-expense-manager.apk`

### New in Version 1.0.1 (Build 2):
- **৩৬৫ দিনের অফলাইন সেশন**: প্রথমবার অনলাইনে লগইন করার পর ফোনে ৩৬৫ দিনের জন্য সেশন সংরক্ষিত থাকবে। অফলাইনে থাকলেও সরাসরি অ্যাপ ব্যবহার করা যাবে।
- **ইনস্ট্যান্ট ০ms লোডিং**: কোনো স্ক্রিনেই স্কেলিটন বা লোডিং আটকে থাকবে না। অফলাইন স্টোরেজে ডাটা না থাকলে ডিফল্ট `৳০.০০` দেখাবে।
- **ফ্যামিলি অ্যাডমিন সদস্য তৈরি**: পরিবার অ্যাডমিন সরাসরি সদস্য প্রোফাইল স্ক্রিন থেকে নতুন মেম্বার (রোল ও রিলেশনশিপ সহ) যোগ করতে পারবেন।
- **পোস্ট-ক্লোজিং সমন্বয়**: মাস ক্লোজ থাকা অবস্থায় অফলাইনে যুক্ত খরচ অনলাইন হলে অ্যাডমিনের কাছে অনুমোদনের জন্য যাবে এবং মূল তালিকায় ব্যাজ সহ প্রদর্শিত হবে।

### Installation Instructions:
1. Tap the **[Download Household Expense Manager APK (Direct CDN)](https://expo.dev/artifacts/eas/wUHnVFOxOdWn3vG8pCjZFu4BDmeiMg7o7IRgzYx-570.apk)** link above on your Android phone.
2. Tap the downloaded `household-expense-manager.apk` file to start installation.
3. If Android prompts *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** $\rightarrow$ toggle on **"Allow from this source"**.
4. If Google Play Protect displays a prompt (*"Unrecognized app"*), tap **"More details"** $\rightarrow$ tap **"Install anyway"**.
5. Launch the application, log in with your credentials, and enjoy full Bengali accounting with offline SQLite sync!

---

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

