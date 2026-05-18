# 🩸 Rakta-Vahini — Rural Blood Donor Network


> **"A privacy-focused, filtered blood donor network that connects the right donor to the right patient in the right location — eliminating noise and saving lives in rural India."**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Data Schema](#-data-schema)
- [User Flow](#-user-flow)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Milestones](#-milestones)
- [Out of Scope (MVP)](#-out-of-scope-mvp)
- [Contributing](#-contributing)
- [Developer](#-developer)

---

## 🌟 Overview

**Rakta-Vahini** (literally *"Blood Carrier"* in Sanskrit) is a privacy-first Android application built to solve a critical last-mile healthcare problem in rural India.

When someone urgently needs blood at a rural taluka-level hospital, the current approach of broadcasting mass forwards on WhatsApp fails — there is no intelligent filter to find donors by specific blood group and current eligibility. Rakta-Vahini solves this with a **Filtered Blood Donor Network** that surfaces only the right donors, at the right time, in the right location.

Built as part of the **MindMatrix VTU Internship — Project #7**, this app demonstrates how GenAI can solve real-world civic healthcare problems at the grassroots level.

---

## 🚨 Problem Statement

Rural hospitals frequently face blood emergencies with no structured, real-time directory of eligible voluntary donors. The current reality:

| Affected Group | Problem |
|---|---|
| Rural hospital patients | Cannot find correct blood group donors in time for emergency surgery |
| Voluntary blood donors | No structured platform to register availability and eligibility |
| Family members in crisis | Resort to unfiltered broadcast messages, losing critical time |
| Medical staff | Must manually coordinate donor outreach without any digital tool |

**Core pain points:**
- Mass WhatsApp forwards reach everyone regardless of blood group — causing noise and no action.
- Eligible donors (not donated in 90 days) cannot be distinguished from ineligible ones.
- No filter to find donors by specific blood group and current geographic availability.
- No mechanism for donors to mark themselves as "Ready to Donate" vs "Unavailable."
- No record of personal donation history, making it hard to track eligibility.

---

## ✨ Features

### Core Features

| ID | Feature | Description |
|---|---|---|
| FR-01 | **Donor Profile Registration** | Register with blood group (all 8 ABO-Rh types), location, and last donation date |
| FR-02 | **Emergency Donor Search** | Instantly find eligible donors filtered by blood group and 90-day rule |
| FR-03 | **"I Am Eligible" Toggle** | Real-time toggle for donors to mark themselves ready or unavailable |
| FR-04 | **Donation Log** | Personal history of every donation with auto-calculated next eligibility date |
| FR-05 | **Privacy-Safe Calling** | Contact donors via Android `ACTION_DIAL` Intent — phone numbers never shown publicly |
| FR-06 | **Thank You Notification** | In-app congratulatory notification after a donation is logged |

### Bonus Feature (GenAI)
- **Gemini AI Guidance** — Auto-generated donor eligibility explanations and health tips powered by the Google Gemini API.

---

## 📸 Screenshots

<img width="444" height="807" alt="Screenshot 2026-05-18 143002" src="https://github.com/user-attachments/assets/d68157b5-0820-4a84-bbbb-a1e49822bda5" />
<img width="457" height="819" alt="Screenshot 2026-05-18 140628" src="https://github.com/user-attachments/assets/c1747e7c-7116-4c52-9e41-dd562977f3f3" />
<img width="454" height="824" alt="Screenshot 2026-05-18 140638" src="https://github.com/user-attachments/assets/4388087f-47b8-4031-bee0-2d88bf0e8830" />
<img width="458" height="814" alt="Screenshot 2026-05-18 140647" src="https://github.com/user-attachments/assets/167e2084-1d60-4a1d-8faf-01cac7c37be8" />


---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| Platform | Android (Min API Level 24 — Android 7.0 Nougat) |
| Language | Kotlin |
| IDE | Android Studio (Latest Stable — Ladybug / Meerkat) |
| UI | XML Layouts with ConstraintLayout & RecyclerView |
| Database | Room DB (local, offline-first) |
| Eligibility Logic | Kotlin date calculation (`lastDonationDate + 90 days ≤ today`) |
| Location Filter | Text-based area matching; optional GPS (10–20 km radius) |
| Privacy (Calling) | Android Intent `ACTION_DIAL` |
| Notifications | Android Notification Channel (`NotificationManager`) |
| GenAI | Google Gemini API (optional, for donor eligibility summaries) |
| Build Tool | Gradle (via Android Studio) |
| Min. Device | Android phone with 2 GB RAM, API 24+ |

---

## 🏗 Architecture

```
Rakta-Vahini (Offline-First Android App)
│
├── UI Layer
│   ├── Dashboard / Home Screen
│   ├── Donor Registration Screen
│   ├── Donor Home (Toggle + Log)
│   ├── Search / Results Screen
│   └── Donation Log Screen
│
├── Logic Layer
│   ├── 90-Day Eligibility Engine
│   ├── Location Filter (text-based / GPS)
│   └── Gemini AI Integration (optional)
│
└── Data Layer
    └── Room DB (local, offline)
        ├── Donor Entity
        └── DonationLog Entity
```

**No backend server.** All donor data is stored locally on-device using Room DB. Privacy is enforced at the application layer — donor phone numbers are never rendered on any public screen.

---

## 🗄 Data Schema

### Donor Entity

```json
{
  "id": 1,
  "name": "Ramesh",
  "bloodGroup": "B+",
  "location": "Dharwad",
  "phone": "9XXXXXXXX0",
  "lastDonationDate": "2024-12-15",
  "isReadyToDonate": true,
  "isEligible": true
}
```

### DonationLog Entity

```json
{
  "logId": 1,
  "donorId": 1,
  "donationDate": "2024-12-15",
  "hospital": "District Hospital Dharwad",
  "units": 1
}
```

**Eligibility logic:**
```kotlin
val eligible = (currentDate - lastDonationDate) > 90 // days
```

---

## 🔄 User Flow

### Donor Flow
```
Open App
  └── Register as Donor (blood group + location + last donation date)
        └── Donor Home Screen
              ├── View eligibility status
              ├── Toggle "I Am Ready" on/off
              └── Add Donation
                    └── "Thank You" notification with next eligibility date
```

### Emergency Requester Flow
```
Open App
  └── Find a Donor
        └── Select required blood group
              └── View filtered list (eligible donors only — name + area)
                    └── Tap "Contact Donor"
                          └── Android dialer opens (number not shown publicly)
```

---

## 🚀 Getting Started

### Prerequisites

- Android Studio (Ladybug / Meerkat or latest stable)
- Android SDK — API Level 24+
- Kotlin plugin (bundled with Android Studio)
- A physical Android device or emulator (2 GB RAM+)
- *(Optional)* Google Gemini API key for the AI guidance feature

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/rakta-vahini.git

# 2. Open the project in Android Studio
#    File → Open → select the cloned folder

# 3. Sync Gradle dependencies
#    Android Studio will prompt — click "Sync Now"

# 4. (Optional) Add your Gemini API key
#    In local.properties, add:
#    GEMINI_API_KEY=your_api_key_here

# 5. Build and run
#    Run → Run 'app' (Shift + F10)
```

### Build Requirements

```
minSdkVersion     24
targetSdkVersion  34
compileSdkVersion 34
```

---

## 📁 Project Structure

```
rakta-vahini/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/raktavahini/
│   │       │   ├── data/
│   │       │   │   ├── db/          # Room DB setup
│   │       │   │   ├── dao/         # DAO interfaces
│   │       │   │   └── entity/      # Donor + DonationLog entities
│   │       │   ├── ui/
│   │       │   │   ├── dashboard/   # Home screen
│   │       │   │   ├── donor/       # Donor registration + home
│   │       │   │   ├── search/      # Donor search + results
│   │       │   │   └── log/         # Donation log
│   │       │   ├── util/
│   │       │   │   └── EligibilityHelper.kt
│   │       │   └── gemini/          # Gemini AI integration (optional)
│   │       └── res/
│   │           ├── layout/          # XML layouts
│   │           ├── drawable/        # Icons + assets
│   │           └── values/          # Colors, strings, themes
│   └── build.gradle
├── README.md
└── PRD.pdf
```

---

## 📅 Milestones

| Week | Deliverable |
|---|---|
| Week 1 | Project setup + Room DB schema design (Donor and DonationLog entities) |
| Week 2 | Donor registration screen + profile storage (Room DAO insert/read) |
| Week 3 | Eligibility logic + donor search / filter UI (90-day calc + RecyclerView) |
| Week 4 | "I Am Ready" toggle + Privacy-safe calling (Intent `ACTION_DIAL`) |
| Week 5 | Donation log + "Thank You" notification + GenAI integration (optional) |
| Week 6 | Testing, polish, and demo preparation |

---

## 🎯 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Performance | Search results load in < 2 seconds on a mid-range Android device |
| Offline | 100% offline capability for donor search — no internet required |
| Privacy | Zero phone number exposure on any public search screen |
| Eligibility Accuracy | Zero false positives — ineligible donors never appear in results |
| Reliability | Graceful "No donors found" message on empty results |
| Usability | First-time user finds a donor in < 45 seconds |
| Accessibility | High-contrast Red/White UI; min. 16sp body text |

---

## 🚫 Out of Scope (MVP)

- Real-time push notifications to all donors in an area (requires backend / FCM)
- User account authentication / login system
- Payment or compensation features for donors
- Integration with hospital blood bank management systems
- Multi-language support beyond Kannada and English
- Tablet-optimised layout
- Admin panel for managing donor records remotely
- SMS or WhatsApp integration for donor outreach

---

## 🎨 UI/UX Design Principles

- **Emergency-First** — `#C62828` (red) for emergency alerts; `#2E7D32` (green) for "Ready to Donate" status
- **Large Text** — Minimum 16sp body copy; 24sp+ for blood group labels
- **Minimal Taps** — Finding eligible donors achievable in 2 taps maximum
- **Privacy Prominent** — No phone number visible without an explicit "Contact Donor" tap
- **Trust Indicators** — Donor name, area, and eligibility clearly shown on each card

---

## 🤝 Contributing

This project is part of the **MindMatrix VTU Internship Program**. Contributions from fellow interns and reviewers are welcome.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 👩‍💻 Developer

**Sinchana N**
USN: `1JB22AI052`
SJB Institute of Technology, Bengaluru

**Program:** MindMatrix VTU Internship — Project #7
**Version:** 1.0 
**Date:** April 2026

