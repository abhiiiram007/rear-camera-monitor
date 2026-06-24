# 🚗 Rear Camera Monitor

A real-time rear camera monitoring system built using React, Node.js, Socket.IO, and WebRTC.

The project allows a mobile phone to act as a wireless rear camera while a laptop or another device receives the live video stream with very low latency.

## 🔗 Live Demo

https://rear-camera-monitor.vercel.app

## ✨ Features

- QR Code based device pairing
- Real-time video streaming using WebRTC
- Rear camera support on mobile devices
- Socket.IO signaling server
- Landscape video mode
- Full-screen viewing
- Mobile and desktop compatible
- Low latency communication
- Disconnect and reconnect support

## 🛠 Tech Stack

### Frontend
- React
- Vite
- React Router
- QRCode

### Backend
- Node.js
- Express
- Socket.IO

### Communication
- WebRTC
- STUN Server

## 📷 How It Works

1. Open Receiver on Laptop
2. Generate QR Code
3. Open Sender on Mobile
4. Scan QR Code
5. Grant Camera Permission
6. Live Stream Starts

## 📂 Project Structure

```
rear-camera-monitor/
│
├── backend/
│   ├── server.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│
└── README.md
```

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/abhiiiram007/rear-camera-monitor.git
```

### Frontend

```bash
cd rear-camera-monitor
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
node server.js
```

## 🔮 Future Improvements

- Camera Flip Button
- Better Connection Recovery
- Recording Support
- Multiple Receiver Support

## 👨‍💻 Author

Abhiram G

Mechanical Engineering
NIT Warangal

GitHub:
https://github.com/abhiiiram007
