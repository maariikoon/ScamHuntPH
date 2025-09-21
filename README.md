# Project Setup

## Requirements
- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node.js)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (`npm install -g expo-cli`)

  
## To Run

### A. Mobile
```bash
cd mobile
npm install
npm run start
```

### B. Web Admin
```bash
cd webadmin
npm install
npm run dev
```

### C. Functions - If you want to deploy new or update function (API)
```bash
cd backend/functions
npm install
```
- #### To deploy:
```bash
firebase deploy --only functions
```

- #### List deployed functions:
```bash
firebase functions:list
```

