// Dairy Khata — Constants, Categories, Translations & Seed Data
      const STORAGE_KEY = 'dairy_khata_entries_v1';
      const MILK_RATE_KEY = 'dairy_khata_milk_rate_v1';
      const WATER_KEY = 'dairy_khata_water_v1';
      const REMINDER_KEY = 'dairy_khata_reminders_v1';
      const AUTHOR_KEY = 'dairy_khata_author_v1';
      const AUTHORS_LIST_KEY = 'dairy_khata_authors_list_v1';
      const WEBHOOK_KEY = 'dairy_khata_webhook_v1';
      const PIN_KEY = 'dairy_khata_owner_pin_v1';
      const BUFFALO_KEY = 'dairy_khata_buffaloes_v1';
      const MILK_KEY = 'dairy_khata_milk_logs_v1';
      const MED_KEY = 'dairy_khata_med_logs_v1';
      const DOC_KEY = 'dairy_khata_doc_logs_v1';
      const AI_KEY = 'dairy_khata_ai_logs_v1';

      const CATEGORIES = {
        expense: [
          { id: 'feed', icon: '🌾', bg: 'bg-amber-50', te: 'దాణా / గడ్డి', en: 'Feed & Fodder', color: '#d97706' },
          { id: 'medicines', icon: '💊', bg: 'bg-rose-50', te: 'మందులు', en: 'Medicines', color: '#dc2626' },
          { id: 'doctor', icon: '🩺', bg: 'bg-indigo-50', te: 'డాక్టర్', en: 'Doctor / Vet', color: '#4f46e5' },
          { id: 'labour', icon: '👷', bg: 'bg-blue-50', te: 'కూలీలు', en: 'Labour / Wages', color: '#2563eb' },
          { id: 'power', icon: '⚡', bg: 'bg-violet-50', te: 'కరెంటు / డీజిల్', en: 'Power & Diesel', color: '#7c3aed' },
          { id: 'repair', icon: '🔧', bg: 'bg-cyan-50', te: 'రిపేర్లు', en: 'Repairs', color: '#0891b2' },
          { id: 'other_exp', icon: '📦', bg: 'bg-slate-100', te: 'ఇతర / Misc', en: 'Other / Misc', color: '#64748b' }
        ],
        income: [
          { id: 'milk', icon: '🥛', bg: 'bg-emerald-50', te: 'పాల అమ్మకం', en: 'Milk Sale', color: '#16a34a' },
          { id: 'dairy_prod', icon: '🧈', bg: 'bg-yellow-50', te: 'నెయ్యి / పెరుగు', en: 'Ghee / Curd', color: '#eab308' },
          { id: 'vermicompost', icon: '🪱', bg: 'bg-lime-50', te: 'వర్మీ కంపోస్ట్', en: 'Vermicompost', color: '#65a30d' },
          { id: 'other_inc', icon: '🐄', bg: 'bg-teal-50', te: 'ఇతర / Misc', en: 'Other / Misc', color: '#0d9488' }
        ]
      };

      const TEXT = {
        te: {
          title: 'డైరీ ఖాతా',
          subtitle: 'సులభమైన ఖర్చుల లెక్క',
          miniExp: 'నేటి ఖర్చు',
          miniInc: 'నేటి ఆదాయం',
          miniNet: 'మిగులు',
          adminToggle: 'అడ్మిన్',
          authorLbl: 'ఎవరు రాస్తున్నారు? (Author)',
          addName: 'కొత్త పేరు',
          typeExp: 'ఖర్చు (Spent)',
          typeInc: 'ఆదాయం (Milk)',
          stepCat: '1. ఏమిటి? (బొమ్మ నొక్కండి)',
          listen: 'వినండి',
          stepAmt: '2. ఎంత డబ్బు? (₹)',
          clear: 'చెరిపివేయి',
          notePlaceholder: 'చిన్న వివరం (ఐచ్ఛికం)',
          save: 'సేవ్ చేయి (SAVE)',
          entryDateLabel: 'ఎంట్రీ తేదీ (అడ్మిన్)',
          milkDateLabel: 'పాల నమోదు తేదీ',
          futureDateToast: 'భవిష్యత్తు తేదీ ఎంచుకోలేరు!',
          wa: 'WhatsApp రిపోర్ట్',
          csv: 'Excel / CSV',
          chartTitle: 'ఖర్చుల వివరాలు (Breakdown)',
          listTitle: 'నమోదు చేసినవి (Entries)',
          reset: 'అన్నీ చెరిపివేయి',
          navAdd: 'కొత్తది రాయి',
          navBuf: 'గేదెలు',
          navHealth: 'మందులు/డాక్టర్',
          subMeds: 'మందులు (Medicines)',
          subDoc: 'డాక్టర్ (Doctor)',
          navHist: 'లెక్కలు చూడు',
          milkTodayKpi: 'నేటి పాలు',
          herdKpi: 'పాలిచ్చేవి (Milking)',
          milkTitle: '🥛 రోజువారీ పాల సేకరణ (Milk Log)',
          shiftMorn: 'ఉదయం',
          shiftEve: 'సాయంత్రం',
          shiftAuto: 'సమయం ప్రకారం షిఫ్ట్',
          saveMilkNext: 'సేవ్ చేసి తదుపరిది',
          milkSavedToast: 'పాల నమోదు సేవ్ అయింది!',
          whichBuf: 'ఏ గేదె? (Buffalo / Herd)',
          saveMilk: 'పాలు సేవ్ చేయి (Save Milk)',
          milkLogTitle: 'నేటి పాల వివరాలు (Milk Log)',
          herdTitle: '🐃 గేదెల వివరాలు (Herd)',
          newBuf: 'కొత్త గేదె',
          savedToast: 'సేవ్ అయింది!',
          selectCatToast: 'ముందు బొమ్మను ఎంచుకోండి!',
          enterAmtToast: 'డబ్బు ఎంత అనేది నొక్కండి!',
          enterLitersToast: 'దయచేసి పాల లీటర్లు నమోదు చేయండి!',
          copiedWa: 'WhatsApp రిపోర్ట్ కాపీ అయింది!',
          copiedScript: 'Apps Script కోడ్ కాపీ అయింది!',
          noEntries: 'ఇంకా ఎంట్రీలు లేవు',
          noMilkLogs: 'ఈరోజు ఇంకా పాల వివరాలు లేవు',
          reportBuffaloes: 'గేదెలు',
          reportTodayMilk: 'నేటి పాలు',
          reportIncome: 'ఆదాయం',
          reportExpense: 'ఖర్చు',
          reportNet: 'మిగులు',
          delTitle: 'తొలగించాలా?',
          delOneDesc: 'ఈ ఎంట్రీని తొలగించాలా?',
          delAllDesc: 'మొత్తం లెక్కలన్నీ చెరిపివేయాలా?'
        },
        en: {
          title: 'Dairy Khata',
          subtitle: 'Easy Farm Expense Tracker',
          miniExp: 'Today Spent',
          miniInc: 'Today Income',
          miniNet: 'Net Balance',
          adminToggle: 'Admin',
          authorLbl: 'Who is entering? (Author)',
          addName: 'Add Name',
          typeExp: 'Expense (Spent)',
          typeInc: 'Income (Milk)',
          stepCat: '1. What for? (Tap Icon)',
          listen: 'Speak',
          stepAmt: '2. How much? (₹)',
          clear: 'Clear',
          notePlaceholder: 'Short note (optional)',
          save: 'SAVE ENTRY',
          entryDateLabel: 'Entry date (Admin)',
          milkDateLabel: 'Milk log date',
          futureDateToast: 'Future dates are not allowed!',
          wa: 'WhatsApp Report',
          csv: 'Excel / CSV',
          chartTitle: 'Expense Breakdown',
          listTitle: 'Recent Entries',
          reset: 'Clear All',
          navAdd: 'Add Entry',
          navBuf: 'Buffaloes',
          navHealth: 'Meds & Vet',
          subMeds: 'Medicines',
          subDoc: 'Doctor Visits',
          navHist: 'Admin',
          milkTodayKpi: 'Today Milk',
          herdKpi: 'Total Buffaloes',
          milkTitle: '🥛 Daily Milk Collection',
          shiftMorn: 'Morning',
          shiftEve: 'Evening',
          shiftAuto: 'Shift selected by current time',
          saveMilkNext: 'Save & Next',
          milkSavedToast: 'Milk log saved!',
          whichBuf: 'Which Buffalo / Herd?',
          saveMilk: 'Save Milk Log',
          milkLogTitle: "Today's Milk Logs",
          herdTitle: '🐃 Buffalo Herd',
          newBuf: 'New Buffalo',
          savedToast: 'Saved successfully!',
          selectCatToast: 'Please tap a category icon!',
          enterAmtToast: 'Please enter an amount!',
          enterLitersToast: 'Please enter milk liters!',
          copiedWa: 'WhatsApp summary copied!',
          copiedScript: 'Apps Script code copied!',
          noEntries: 'No entries yet for this period',
          noMilkLogs: 'No milk logged today',
          reportBuffaloes: 'Buffaloes',
          reportTodayMilk: 'Today Milk',
          reportIncome: 'Income',
          reportExpense: 'Expense',
          reportNet: 'Net',
          delTitle: 'Delete Entry?',
          delOneDesc: 'Remove this entry permanently?',
          delAllDesc: 'Clear all recorded entries?'
        }
      };

      function getDefaultEntries() {
        const now = Date.now();
        return [
          { id: 's1', type: 'expense', catId: 'feed', amount: 1450, author: 'Ramu', note: '2 bags cattle feed', ts: now - 3600 * 1000 * 4, synced: false },
          { id: 's2', type: 'expense', catId: 'vet', amount: 450, author: 'Ravi', note: 'Calcium tonic', ts: now - 3600 * 1000 * 2, synced: false },
          { id: 's3', type: 'income', catId: 'milk', amount: 2850, author: 'Owner', note: 'Morning 48L milk', ts: now - 3600 * 1000 * 3, synced: false }
        ];
      }

      function getDefaultBuffaloes() {
        const now = Date.now();
        return [
          { id: 'b1', name: 'B-01 Lakshmi', species: 'Buffalo', breed: 'Murrah', price: 85000, motherId: '', addedAt: now - 86400000 * 40 },
          { id: 'b2', name: 'B-02 Ganga', species: 'Buffalo', breed: 'Murrah', price: 90000, motherId: '', addedAt: now - 86400000 * 25 },
          { id: 'b3', name: 'C-01 Radha', species: 'Cow', breed: 'HF / Jersey', price: 65000, motherId: '', addedAt: now - 86400000 * 10 },
          { id: 'b4', name: 'B-04 Tara (Calf)', species: 'Buffalo', breed: 'Murrah', price: 0, motherId: 'b1', addedAt: now - 86400000 * 5 }
        ];
      }

      function getDefaultMilkLogs() {
        const now = Date.now();
        return [
          { id: 'm1', shift: 'morning', buffalo: 'B-01 Lakshmi', liters: 11, fat: '7.0', author: 'Ramu', ts: now - 3600 * 1000 * 4 },
          { id: 'm2', shift: 'morning', buffalo: 'B-02 Ganga', liters: 13, fat: '7.5', author: 'Ramu', ts: now - 3600 * 1000 * 4 },
          { id: 'm3', shift: 'morning', buffalo: 'B-03 Radha', liters: 9, fat: '7.0', author: 'Ravi', ts: now - 3600 * 1000 * 3 }
        ];
      }
