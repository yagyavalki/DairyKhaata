# 🐄 Dairy Khata — Farm Ledger & Herd Tracker

A mobile-first, bilingual (**Telugu / English**) web app for tracking daily dairy farm operations—herd milk production, water adjustments, milk sales, expenses, medicines, vet visits, insemination/pregnancy checkups, and owner financials—with offline `localStorage` support and **Google Sheets** sync.

---

## 📱 Daily User Guide (Workers & Admin)

### 1. Select Your Name & Language
* Tap your name under **Author** (`Ramu`, `Ravi`, `Suresh`, etc.) before logging any entry.
* Tap **`EN` / `తె`** in the top-right header anytime to switch the entire app between **Telugu (తెలుగు)** and **English**.
* Selecting **🔒 Owner** requires the **4-digit Owner PIN** (default: `1234`, changeable in **⚙️ Settings**). Switching back to a worker automatically re-locks Owner mode.

### 2. 🐃 Buffaloes Tab (Herd & Milk Production)
* **Filter & Browse:** See one herd card at a time; use the pills (**Buffaloes Only**, **Cows**, **With Heirs**), **◀ / ▶** arrows, or swipe left/right to move through the herd.
* **Milking vs. Dry Status:** Tap the **🥛 Milking / ⏸️ Dry** badge on any card to update an animal's milking status. The top KPI counts the exact number of cards shown.
* **Log Daily Milk:** The shift defaults to morning before 2:00 PM and evening from 2:00 PM; tap **☀️ Morning** or **🌙 Evening** to override it. Enter liters (decimals supported, e.g., `11.5`) and tap **Save & Next** to save and advance. Unsubmitted liters and shift choices are retained while swiping between cards.
* **Admin Backdating:** When **Owner** is unlocked, a **Past Date** picker appears inside each buffalo's milk box so missed worker entries can be backdated.
* **💧 Adjusted / Water Added (L):** Log extra water/volume added to meet customer demand using the **☀️ Morning / 🌙 Evening** tabs and **Save 💧**.
* **🧬 Insemination & Checkup Reminders:**
  * The top strip on each card shows upcoming **60-day pregnancy checkup dates**, turning **amber** (within 7 days) or **red** when due.
  * When a checkup is due, an **unclosable Morning/Evening reminder pop-up** appears until you select either **✅ 1. Okay / Doctor Checked (Done)** or **📞 2. Contacted Doctor — Not Yet Come** (with doctor availability).

### 3. ➕ Add Entry Tab (Expenses & Milk Sales)
* **Expenses:** Tap **Expense**, choose a category (**Feed**, **Fodder**, **Labour**, **Electricity**, **Medicines**, **Doctor**, **Misc**), enter the ₹ amount, and confirm in the pop-up.
  * For **💊 Medicines** or **🩺 Doctor**, use the **🐃 Which Animal?** dropdown so costs map directly to that animal in Admin reports.
* **🥛 Milk Sale (Liters Only):** Under **Income → Milk Sale**, enter **Liters sold** (decimals supported via `.`). The app multiplies liters by the Admin's **₹/L selling rate** automatically.

### 4. 🩺 Meds & Vet Tab
* Dedicated logging for **Medicines** and **Doctor Visits** with quick-fill presets, animal selection (**🐃 Which Animal?**), and cost history.

### 5. 👑 Admin Tab (PIN-Protected)
* **Period Filters:** Switch between **Today**, **7 Days**, **Monthly**, **Yearly**, and **All**.
* **🥛 Milk Rate & Collection:** Set your **₹/L selling rate** and view **Pure Produced**, **💧 Adjusted**, **Sold**, **To Collect (`Sold L × ₹/L`)**, and any volume mismatch.
* **🐃 Buffalo-Wise Status:** View each animal's **Milk Produced (`L` & `₹`)**, **Medicines**, **Vet**, **Feed Share**, and net contribution. Click any animal's name (**`↗`**) to open its full log modal.
* **Exports & Backup:** Download **Excel (`.xlsx`)**, share a **WhatsApp** daily summary, or **Clear All** logs.

---

## 🚀 Hosting & Google Sheets Setup

### Folder Structure
```text
├── index.html          # Clean semantic HTML shell
├── css/
│   └── styles.css      # Custom styles & responsive animations
├── js/
│   ├── config.js       # Keys, categories, Telugu/English dictionary & seed data
│   ├── storage.js      # localStorage, formatting & Google Sheets sync
│   ├── state.js        # App state, language switcher & Add Entry renderers
│   ├── herd.js         # Herd cards, Milk, Adjusted/Water & Health views
│   ├── admin.js        # Admin reports, Milk Rate, Buffalo-Wise Status & charts
│   └── events.js       # Event listeners, modals, reminders & app boot
└── README.md           # User & deployment guide
```

### Deploy
1. Push all files to your GitHub `master` branch (Private or Public).
2. Connect the repository to **Cloudflare Pages** (Framework preset: `None`, Build output: `/`).
3. *(Optional)* Open **⚙️ Sync & Settings** in the app (Owner PIN) and paste your **Google Apps Script Web App URL** to sync entries and milk logs to Google Sheets.


---

## ✦ Fieldwork UI refresh

The refreshed interface uses a warm, low-glare paper palette, deep harvest-green navigation,
stronger type hierarchy, clearer action surfaces, and a more spacious desktop layout.
The existing HTML IDs, JavaScript modules, localStorage keys, and workflows are retained;
`css/redesign.css` is an additive visual layer loaded after the original stylesheet.
