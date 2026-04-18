# MyFlow — Digital Life Dashboard

## วิธีติดตั้งและรัน

### ขั้นตอนที่ 1 — ติดตั้ง Node.js
ดาวน์โหลด Node.js v18+ LTS จาก https://nodejs.org

### ขั้นตอนที่ 2 — ติดตั้ง dependencies
```bash
cd myflow
npm install
```

### ขั้นตอนที่ 3 — รันในโหมด Development
```bash
# Terminal 1: รัน React
npm start

# Terminal 2: รัน Electron (รอให้ React ขึ้นก่อน)
npm run electron
```

หรือรันพร้อมกันด้วย:
```bash
npm run electron-dev
```

### ขั้นตอนที่ 4 — Build เป็นไฟล์ติดตั้ง
```bash
npm run package
# ไฟล์จะอยู่ใน dist/
```

---

## API Keys ที่ต้องใช้

| Service | ใช้สำหรับ | สมัครที่ |
|---|---|---|
| OpenWeatherMap | สภาพอากาศ | openweathermap.org (ฟรี) |
| Google Gemini | AI วิเคราะห์ | aistudio.google.com (ฟรี) |

ใส่ API Key ในหน้า **ตั้งค่า** ของแอป

---

## โครงสร้างไฟล์

```
myflow/
├── public/
│   ├── electron.js      ← Electron main process
│   ├── preload.js       ← IPC bridge
│   └── index.html       ← HTML entry
├── src/
│   ├── pages/
│   │   ├── Home.jsx/css         ← Dashboard + Clock + Weather
│   │   ├── Finance.jsx/css      ← บันทึกรายรับ-รายจ่าย
│   │   ├── Study.jsx/css        ← การเรียน + Timer + Todo
│   │   ├── Calendar.jsx/css     ← ปฏิทิน + Timeline
│   │   ├── Settings.jsx/css     ← ตั้งค่าทั้งหมด
│   │   └── AISummary.jsx/css    ← AI วิเคราะห์รายสัปดาห์
│   ├── components/
│   │   ├── TitleBar.jsx/css     ← Custom window chrome
│   │   └── Sidebar.jsx/css      ← Navigation sidebar
│   ├── utils/
│   │   ├── storage.js           ← localStorage helpers
│   │   └── notifications.js     ← ระบบแจ้งเตือน 5 ประเภท
│   ├── styles/
│   │   └── global.css           ← Design system + variables
│   ├── App.jsx                  ← Root component + Router
│   └── index.js                 ← React entry point
└── package.json
```

---

## Features ครบถ้วน

- ✅ **การเงิน** — ปุ่มลัด + Custom + Dashboard + History
- ✅ **การเรียน** — หัวข้อ + หัวข้อย่อย + Todo + Timer จับเวลา
- ✅ **ปฏิทิน** — Calendar Grid + Timeline + เพิ่มกิจกรรม
- ✅ **แจ้งเตือน** — 5 ประเภท (เปิดแอป / boot delay / ตั้งเวลา / ปฏิทิน / พฤติกรรม)
- ✅ **นาฬิกา** — Real-time + Timezone
- ✅ **สภาพอากาศ** — OpenWeatherMap API + Cache 30 นาที
- ✅ **พื้นหลัง** — สี / รูปภาพ / วิดีโอ loop
- ✅ **ตั้งค่า** — Theme / Font / Color / Animation / Budget
- ✅ **AI** — Google Gemini วิเคราะห์ 7 วัน + Bar chart
- ✅ **Electron** — Desktop app, custom titlebar, native notifications