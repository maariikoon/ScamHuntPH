# ScamHuntPH

## 📱 Mobile-Based Education and Reporting Platform for SMS Scam and Phishing Awareness in the Philippines

ScamHuntPH is a mobile application and web-based administration platform designed to help Filipinos recognize, report, and learn about SMS scams, phishing attacks, and other online fraud.

The platform combines cybersecurity awareness, educational modules, scam reporting, and administrative monitoring into a single ecosystem.

---

# Features

### Mobile Application
- User Registration & Login
- Cybersecurity Learning Modules
- SMS Scam Reporting
- Phishing Awareness
- Scam Alerts & Notifications
- User Profile Management
- Report Status Tracking

### Web Administration
- Dashboard Analytics
- User Management
- Scam Report Management
- Lesson Management
- Public Scam Reports
- Alert Management
- Audit Logs
- NLP-assisted Report Classification

### Backend
- Firebase Authentication
- Cloud Firestore Database
- Firebase Cloud Functions
- Firebase Storage
- Firebase Cloud Messaging

---

# Tech Stack

## Mobile
- React Native
- Expo
- TypeScript

## Web Admin
- React
- Vite
- TypeScript

## Backend
- Firebase
- Cloud Functions
- Firestore
- Firebase Authentication
- Firebase Storage

---

# Project Structure

```
ScamHuntPH
│
├── mobile/
│   ├── assets/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   └── services/
│
├── webadmin/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── backend/
│   └── functions/
│
├── firestore.rules
├── firebase.json
└── README.md
```

---

# Project Setup

## Requirements

Install the following before running the project:

- Node.js (LTS version recommended)
- npm (comes with Node.js)
- Firebase CLI

```bash
npm install -g firebase-tools
```

- Expo CLI

```bash
npm install -g expo-cli
```

---

# Installation

Clone the repository.

```bash
git clone <[repository-url](https://github.com/maariikoon/ScamHuntPH.git)>
```

Navigate to the project directory.

```bash
cd ScamHuntPH
```

---

# Running the Project

## A. Mobile Application

Navigate to the mobile folder.

```bash
cd mobile
```

Install dependencies.

```bash
npm install
```

Start the Expo development server.

```bash
npm run start
```

---

## B. Web Admin

Navigate to the web admin folder.

```bash
cd webadmin
```

Install dependencies.

```bash
npm install
```

Run the development server.

```bash
npm run dev
```

---

## C. Firebase Cloud Functions (Backend/API)

Navigate to the functions directory.

```bash
cd backend/functions
```

Install dependencies.

```bash
npm install
```

### Deploy Functions

```bash
firebase deploy --only functions
```

### List Deployed Functions

```bash
firebase functions:list
```

---

# Firebase Configuration

Before running the project, configure Firebase by:

- Creating a Firebase project
- Enabling Authentication
- Creating a Firestore Database
- Configuring Firebase Storage
- Enabling Cloud Functions
- Adding your Firebase configuration to the project

---

# Troubleshooting

## White Screen (Web Admin)

If the Web Admin displays a blank or white screen after running the project, refer to the troubleshooting guide below.

**Documentation**

https://docs.google.com/document/d/1syI7KKRt4iEg4IQkI-ZPmxlnwBGDVKGv71fDUT1tmI4/edit?usp=sharing

---

## Web Admin Deployment

For deployment instructions, refer to the deployment guide.

**Documentation**

https://docs.google.com/document/d/1h-vwe-UXwpH-b499EOl7RNbF7UWZMwUDCkvk-kZs7bM/edit?usp=sharing

---

# Architecture

```
                +----------------------+
                |     Mobile App       |
                +----------+-----------+
                           |
                           |
                    Firebase Auth
                           |
                           |
+--------------------------+---------------------------+
|                     Firebase                         |
|------------------------------------------------------|
| Authentication                                       |
| Firestore Database                                   |
| Storage                                              |
| Cloud Functions                                      |
| Cloud Messaging                                      |
+--------------------------+---------------------------+
                           |
                           |
                +----------+-----------+
                |    Web Admin Panel   |
                +----------------------+
```

---

# Security Features

- Firebase Authentication
- Role-Based Access Control (RBAC)
- Cloud Functions Validation
- Firestore Security Rules
- Audit Logging
- NLP-assisted Scam Classification
- Input Validation
- Secure API Endpoints

---

# Contributors
Maricon Caluya,
Abegail Clemente,
Jannine Claire Celocia,
Rhynne Gracelle Pontanilla

Developed as a Capstone Project May - November 2025 for the

**Bachelor of Science in Information Technology**
**Major in Network and Cybersecurity**

Mapúa Malayan Digital College

---

# License

This project is intended for academic purposes as part of a university capstone project.

All rights reserved.
