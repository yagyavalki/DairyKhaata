// Dairy Khata — App State, Language & Add-Entry Renderers
safeRemove(PIN_KEY);

let state = {
        lang: safeGet(LANG_KEY, 'te') === 'en' ? 'en' : 'te',
        tab: 'buffalo',
        entryType: 'expense',
        selectedCat: 'feed',
        authors: loadAuthors(),
        currentAuthor: safeGet(AUTHOR_KEY, 'Ramu'),
        ownerUnlocked: false,
        pinBuffer: '',
        pinVerifying: false,
        pendingProtectedAction: null,
        webhookUrl: safeGet(WEBHOOK_KEY, ''),
        amountStr: '0',
        filter: 'today',
        herdFilter: 'Buffalo',
        herdCardIndex: 0,
        milkDrafts: {},
        breakdownType: 'expense',
        soundOn: true,
        entries: loadJson(STORAGE_KEY, getDefaultEntries),
        buffaloes: loadJson(BUFFALO_KEY, getDefaultBuffaloes),
        milkLogs: loadJson(MILK_KEY, getDefaultMilkLogs),
        medLogs: loadJson(MED_KEY, () => [
          { id: 'med1', buffalo: 'B-01 Lakshmi', name: 'Calcium Tonic', cost: 450, author: 'Ravi', ts: Date.now() - 3600 * 1000 * 2 }
        ]),
        aiLogs: loadJson(AI_KEY, () => [
          { id: 'ai1', animal: 'B-01 Lakshmi', species: 'Buffalo', aiDate: new Date(Date.now() - 86400000 * 45).toISOString().slice(0, 10), bull: 'Murrah #402', status: 'Waiting Check', note: 'Dr. Raju', author: 'Ramu', ts: Date.now() - 86400000 * 45 }
        ]),
        docLogs: loadJson(DOC_KEY, () => [
          { id: 'doc1', buffalo: 'B-02 Ganga', doctor: 'Dr. Raju', reason: 'Routine Checkup', cost: 500, author: 'Ramu', ts: Date.now() - 86400 * 1000 }
        ]),
        healthSubTab: 'meds',
        selectedMedPreset: 'Calcium Tonic',
        selectedDocReason: 'Routine Checkup',
        milkLiters: 0,
        milkFat: '7.0',
        waterLogs: loadJson(WATER_KEY, () => []),
        reminderSnooze: loadJson(REMINDER_KEY, () => ({})),
        milkRate: parseFloat(safeGet(MILK_RATE_KEY, '65')) || 65,
        pendingDeleteAction: null,
        chartInstance: null
      };

      if (state.currentAuthor === 'Owner' && !state.ownerUnlocked) {
        state.currentAuthor = state.authors.find(a => a !== 'Owner') || 'Ramu';
      }

      let audioCtx = null;
      function playTone(freq, duration) {
        if (!state.soundOn) return;
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        } catch (e) { /* ignore audio block */ }
      }

      function formatINR(num) {
        return '₹' + Number(num || 0).toLocaleString('en-IN');
      }

      function getTodayShort() {
        return new Date().toLocaleDateString(state.lang === 'te' ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'short' });
      }
      function getTodayFull() {
        return new Date().toLocaleDateString(state.lang === 'te' ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      function getTodayDateInputValue() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${now.getFullYear()}-${month}-${day}`;
      }

      function renderEntryDateField() {
        const wrapper = document.getElementById('entry-date-wrap');
        const input = document.getElementById('input-entry-date');
        if (!wrapper || !input) return;

        const today = getTodayDateInputValue();
        input.max = today;
        if (!state.ownerUnlocked || !input.value || input.value > today) input.value = today;
        wrapper.classList.toggle('hidden', !state.ownerUnlocked);
      }

      function isToday(ts) {
        const d = new Date(ts);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
      }

      function isThisWeek(ts) {
        return (Date.now() - ts) <= 7 * 24 * 3600 * 1000;
      }

      function findCat(type, catId) {
        const list = CATEGORIES[type] || [];
        return list.find(c => c.id === catId) || list[0];
      }

      function showToast(msg, icon = '✅') {
        const toast = document.getElementById('toast');
        document.getElementById('toast-icon').textContent = icon;
        document.getElementById('toast-msg').textContent = msg;
        toast.classList.remove('hidden');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.add('hidden'), 2400);
      }

      function requireOwnerPin(onSuccess) {
        if (state.ownerUnlocked) {
          onSuccess();
          return;
        }
        state.pendingProtectedAction = onSuccess;
        state.pinBuffer = '';
        renderPinDots();
        document.getElementById('pin-modal').classList.remove('hidden');
      }

      function renderPinDots() {
        const dots = document.querySelectorAll('#pin-dots span');
        dots.forEach((dot, idx) => {
          dot.className = idx < state.pinBuffer.length
            ? 'w-3.5 h-3.5 rounded-full bg-emerald-600 transition-colors'
            : 'w-3.5 h-3.5 rounded-full bg-slate-200 transition-colors';
        });
      }

      function renderOwnerLockBadge() {
        const btn = document.getElementById('btn-owner-lock');
        const icon = document.getElementById('lock-icon');
        if (!btn || !icon) return;
        if (state.ownerUnlocked) {
          icon.textContent = '🔓';
          btn.className = 'tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors bg-amber-50 text-amber-800 border-amber-200';
        } else {
          icon.textContent = '🔒';
          btn.className = 'tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors bg-slate-100 text-slate-600 border-slate-200';
        }
      }

      function applyLanguage() {
        const t = TEXT[state.lang];
        document.documentElement.lang = state.lang;
        const tdShort = getTodayShort();
        const tdFull = getTodayFull();
        const todayFilterBtn = document.querySelector('.filter-btn[data-filter="today"]');
        if (todayFilterBtn) todayFilterBtn.textContent = tdFull;
        document.getElementById('app-title').textContent = t.title;
        const spSel = document.getElementById('input-buf-species');
        if (spSel && spSel.options) {
          const spMap = { Buffalo: `🐃 ${TEXT[state.lang].dairyBuffalo}`, Cow: `🐄 ${TEXT[state.lang].dairyCow}` };
          Array.from(spSel.options).forEach(opt => { if (spMap[opt.value]) opt.textContent = spMap[opt.value]; });
        }
        const brSel = document.getElementById('input-buf-breed');
        if (brSel && brSel.options) {
          const brMap = state.lang === 'te'
            ? { Murrah: 'ముర్రా', Grade: 'స్థానిక సంకరం', Jaffarabadi: 'జాఫరాబాది', 'HF / Jersey': 'హెచ్‌ఎఫ్ / జెర్సీ', 'Gir / Ongole': 'గిర్ / ఒంగోలు', Other: 'ఇతరాలు' }
            : { Murrah: 'Murrah', Grade: 'Grade', Jaffarabadi: 'Jaffarabadi', 'HF / Jersey': 'HF / Jersey', 'Gir / Ongole': 'Gir / Ongole', Other: 'Other' };
          Array.from(brSel.options).forEach(opt => { if (brMap[opt.value]) opt.textContent = brMap[opt.value]; });
        }

        document.getElementById('app-subtitle').textContent = t.subtitle;
        document.getElementById('lbl-mini-exp').textContent = state.lang === 'te' ? `${tdFull} ఖర్చు` : `${tdFull} Spent`;
                document.getElementById('lbl-mini-net').textContent = t.miniNet;
        document.getElementById('lbl-author').textContent = t.authorLbl;
        document.getElementById('lbl-add-name').textContent = t.addName;
        document.getElementById('lbl-type-exp').textContent = t.typeExp;
        document.getElementById('lbl-type-inc').textContent = t.typeInc;
        document.getElementById('lbl-step-cat').textContent = t.stepCat;
        document.getElementById('lbl-step-amt').textContent = t.stepAmt;
        document.getElementById('lbl-clear').textContent = t.clear;
        document.getElementById('input-note').placeholder = t.notePlaceholder;
        document.getElementById('lbl-entry-date').textContent = t.entryDateLabel;
        document.getElementById('lbl-save').textContent = t.save;
        document.getElementById('lbl-wa').textContent = t.wa;
        document.getElementById('lbl-csv').textContent = t.csv;
        document.getElementById('lbl-chart-title').textContent = t.chartTitle;
        document.getElementById('lbl-list-title').textContent = t.listTitle;
        document.getElementById('lbl-reset').textContent = t.reset;
        document.getElementById('lbl-nav-add').textContent = t.navAdd;
        document.getElementById('lbl-nav-buf').textContent = t.navBuf;
        document.getElementById('lbl-nav-health').textContent = t.navHealth;
        document.getElementById('lbl-sub-meds').textContent = t.subMeds;
        document.getElementById('lbl-sub-doc').textContent = t.subDoc;
        document.getElementById('lbl-nav-hist').textContent = t.navHist;
        document.getElementById('lbl-milk-today-kpi').textContent = state.lang === 'te' ? `${tdFull} పాలు` : `${tdFull} Milk`;
        document.getElementById('lbl-herd-kpi').textContent = t.herdKpi;
        document.getElementById('lbl-milk-log-title').textContent = state.lang === 'te' ? `${tdFull} పాల వివరాలు` : `${tdFull} Milk Log`;
        document.getElementById('lbl-herd-title').textContent = t.herdTitle;
        document.getElementById('lbl-new-buffalo').textContent = t.newBuf;
        document.getElementById('lbl-lock-status').textContent = t.adminToggle;
        document.getElementById('btn-lang').textContent = state.lang === 'te' ? 'EN' : 'తె';
        const isTe = state.lang === 'te';
        const setTxt = (id, te, en) => { const el = document.getElementById(id); if (el) el.textContent = isTe ? te : en; };
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const value = t[el.dataset.i18n];
          if (value) el.textContent = value;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
          const value = t[el.dataset.i18nPlaceholder];
          if (value) el.placeholder = value;
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
          const value = t[el.dataset.i18nTitle];
          if (value) el.title = value;
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
          const value = t[el.dataset.i18nAriaLabel];
          if (value) el.setAttribute('aria-label', value);
        });
        setTxt('lbl-settings', t.settings, t.settings);
        setTxt('lbl-total-income', t.totalIncome, t.totalIncome);
        setTxt('lbl-total-spent', t.totalSpent, t.totalSpent);
        setTxt('lbl-med-form-title', t.medicineTitle, t.medicineTitle);
        setTxt('lbl-med-list-title', t.medicineHistory, t.medicineHistory);
        setTxt('lbl-doc-form-title', t.doctorTitle, t.doctorTitle);
        setTxt('lbl-doc-list-title', t.doctorHistory, t.doctorHistory);
        setTxt('lbl-reminder-title', t.reminderTitle, t.reminderTitle);
        setTxt('lbl-rem-okay', t.reminderOkay, t.reminderOkay);
        setTxt('lbl-rem-contacted', t.reminderContacted, t.reminderContacted);
        setTxt('lbl-rem-availability', t.doctorAvailability, t.doctorAvailability);
        setTxt('lbl-rem-save', t.reminderSave, t.reminderSave);
        setTxt('pin-title', t.pinTitle, t.pinTitle);
        setTxt('btn-sync-pending', t.pendingSyncButton, t.pendingSyncButton);
        setTxt('lbl-pull', t.syncFromSheetButton, t.syncFromSheetButton);
        setTxt('dnav-buffalo', '🐃 పశువులు', '🐃 Herd');
        setTxt('dnav-add', '➕ నమోదు చేయండి', '➕ Add Entry');
        setTxt('dnav-health', '🩺 మందులు & వైద్యం', '🩺 Medicines & Vet');
        setTxt('dnav-history', '👑 యజమాని', '👑 Owner');
        const hMap = { Buffalo: `🐃 ${t.buffaloesOnly}`, Cow: `🐄 ${t.cows}`, heirs: `👶 ${t.withCalves}` };
        document.querySelectorAll('.herd-filter-btn').forEach(b => { if (hMap[b.dataset.hfilter]) b.textContent = hMap[b.dataset.hfilter]; });
        setTxt('lbl-water-title', '💧 నీరు / అదనపు సర్దుబాటు (L)', '💧 Adjusted / Water Added (L)');
        setTxt('lbl-water-sub', 'డిమాండ్ కోసం కలిపిన అదనపు నీరు', 'Log extra water/adjustment added to meet demand');
        setTxt('btn-save-water', 'సేవ్ 💧', 'Save 💧');
        document.querySelectorAll('.water-shift-tab').forEach(b => {
          b.textContent = b.dataset.watershift === 'morning' ? `☀️ ${t.shiftMorn}` : `🌙 ${t.shiftEve}`;
        });
        const fMap = { week: t.sevenDays, month: t.thisMonth, year: t.thisYear, all: t.all };
        document.querySelectorAll('.filter-btn').forEach(b => { if (fMap[b.dataset.filter]) b.textContent = fMap[b.dataset.filter]; });
        setTxt('lbl-rate-title', '🥛 పాల ధర & వసూలు', '🥛 Milk Rate & Collection');
        setTxt('lbl-rate-sub', 'ధర × అమ్మిన లీటర్లు = రావాల్సిన మొత్తం', 'Rate × Sold Liters = Amount to Collect');
        setTxt('btn-save-milk-rate', isTe ? 'పెట్టు' : 'Set', 'Set');
        setTxt('lbl-admin-prod', 'మొత్తం పాలు', 'Pure Produced');
        setTxt('lbl-admin-adj', '💧 నీరు', '💧 Adjusted');
        setTxt('lbl-admin-sold', 'అమ్మినవి', 'Sold');
        setTxt('lbl-admin-collect', 'రావాల్సినవి', 'To Collect');
        setTxt('lbl-buf-status-title', '🐃 గేదెల వారీగా వివరాలు', '🐃 Buffalo-Wise Status');
        setTxt('lbl-buf-status-sub', 'పాల ఉత్పత్తి, మందులు, వైద్యం మరియు దాణా ఖర్చు', 'Milk produced vs. Medicines, Vet & Feed share');
        setTxt('save-modal-cancel', 'రద్దు', 'Cancel');
        setTxt('save-modal-ok', 'నిర్ధారించి సేవ్', 'Confirm & Save');
      }

      function renderAuthors() {
        const container = document.getElementById('author-pills');
        container.innerHTML = state.authors.map(name => {
          const isOwner = name === 'Owner';
          const active = name === state.currentAuthor;
          const lockBadge = isOwner && !state.ownerUnlocked ? '🔒 ' : (isOwner ? '👑 ' : '');
          const delSpan = !isOwner
            ? `<span data-delauthor="${escapeHtml(name)}" class="del-author-btn ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full ${active ? 'bg-white/20 text-white hover:bg-rose-500' : 'bg-slate-200 text-slate-600 hover:bg-rose-500 hover:text-white'} text-[10px] font-extrabold" title="Delete Author">×</span>`
            : '';
          return `
            <button type="button" data-author="${escapeHtml(name)}" class="author-pill tap-btn inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}">
              <span>${lockBadge}${escapeHtml(name)}</span>${delSpan}
            </button>
          `;
        }).join('');
      }

      function renderSyncStatus() {
        const dot = document.getElementById('sync-dot');
        const bannerText = document.getElementById('sync-banner-text');
        const syncPendingBtn = document.getElementById('btn-sync-pending');
        if (!dot || !bannerText || !syncPendingBtn) return;
        const pendingCount = state.entries.filter(e => !e.synced).length;

        if (!state.webhookUrl) {
          dot.textContent = '⚪';
          bannerText.textContent = TEXT[state.lang].notConnected;
          syncPendingBtn.classList.add('hidden');
        } else if (pendingCount > 0) {
          dot.textContent = '🟡';
          bannerText.textContent = TEXT[state.lang].waitingSync.replace('{count}', String(pendingCount));
          syncPendingBtn.classList.remove('hidden');
        } else {
          dot.textContent = '🟢';
          bannerText.textContent = TEXT[state.lang].synced;
          syncPendingBtn.classList.add('hidden');
        }
      }

      async function postToAzure(kind, payload) {
        if (!state.azureApiUrl) return;
        try {
          const hdrs = { 'Content-Type': 'application/json' };
          await fetch(state.azureApiUrl, {
            method: 'POST',
            headers: hdrs,
            body: JSON.stringify({ kind, ...payload })
          });
        } catch (err) { /* offline fallback kept in localStorage */ }
      }

      async function postToSheet(payload, onSynced) {
        if (!state.webhookUrl || !state.webhookUrl.startsWith('https://script.google.com/')) {
          return false;
        }
        try {
          await fetch(state.webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          if (onSynced) onSynced();
          return true;
        } catch (err) {
          return false;
        }
      }

      async function syncEntryToSheet(entry) {
        const d = new Date(entry.ts);
        const cat = findCat(entry.type, entry.catId);
        return postToSheet({
          sheetTab: 'Entries',
          id: entry.id,
          date: d.toLocaleDateString('en-IN'),
          time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          author: entry.author || 'Worker',
          type: entry.type === 'expense' ? 'Expense' : 'Income',
          category: cat.en,
          amount: entry.amount,
          note: entry.note || '',
          row: [
            d.toLocaleDateString('en-IN'),
            d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            entry.author || 'Worker',
            entry.type === 'expense' ? 'Expense' : 'Income',
            cat.en,
            entry.amount,
            entry.note || '',
            entry.id
          ]
        }, () => {
          entry.synced = true;
          saveEntries(state.entries);
          renderSyncStatus();
          if (state.tab === 'history') renderHistory();
        });
      }

      function renderTodaySummary() {
        const expEl = document.getElementById('val-today-exp');
        let exp = 0, inc = 0;
        state.entries.forEach(e => {
          if (isToday(e.ts)) {
            if (e.type === 'expense') exp += e.amount;
            else inc += e.amount;
          }
        });
        expEl.textContent = formatINR(exp);
      }

      function renderTypeButtons() {
        const expBtn = document.getElementById('type-expense');
        const incBtn = document.getElementById('type-income');
        if (state.entryType === 'expense') {
          expBtn.className = 'tap-btn py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 bg-white text-rose-600 shadow-sm';
          incBtn.className = 'tap-btn py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 text-slate-600';
        } else {
          incBtn.className = 'tap-btn py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 bg-white text-emerald-700 shadow-sm';
          expBtn.className = 'tap-btn py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 text-slate-600';
        }
      }

      function renderCategories() {
        const grid = document.getElementById('category-grid');
        const cats = CATEGORIES[state.entryType];
        if (!cats.some(c => c.id === state.selectedCat)) {
          state.selectedCat = cats[0].id;
        }
        grid.innerHTML = cats.map(c => {
          const isSel = c.id === state.selectedCat;
          const borderCls = isSel
            ? (state.entryType === 'expense' ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' : 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20')
            : 'border-slate-200/80 bg-white hover:bg-slate-50';
          const label = state.lang === 'te' ? c.te : c.en;
          return `
            <button type="button" data-cat="${c.id}" class="cat-btn tap-btn flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center min-h-[96px] p-3 ${borderCls}">
              <div class="w-12 h-12 rounded-full ${c.bg} flex items-center justify-center text-2xl mb-1.5">${c.icon}</div>
              <span class="text-xs font-extrabold text-slate-800 leading-tight">${label}</span>
            </button>
          `;
        }).join('');
      }

      function renderAmount() {
        if (state.amountStr.endsWith('.')) {
          const whole = parseInt(state.amountStr.slice(0, -1), 10) || 0;
          document.getElementById('amount-display').textContent = whole.toLocaleString('en-IN') + '.';
          return;
        }
        const num = parseFloat(state.amountStr) || 0;
        document.getElementById('amount-display').textContent = num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      }

      // Buffalo & Milk View Renderers
