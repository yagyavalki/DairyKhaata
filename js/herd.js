// Dairy Khata — Herd Cards, Milk, Water & Health Views
function getAutoMilkShift() {
        return new Date().getHours() < 14 ? 'morning' : 'evening';
      }

      function getFilteredBuffaloes() {
        return state.buffaloes.filter(b => {
          if (state.herdFilter === 'Buffalo') return (b.species || 'Buffalo') === 'Buffalo';
          if (state.herdFilter === 'Cow') return b.species === 'Cow';
          if (state.herdFilter === 'heirs') return state.buffaloes.some(x => x.motherId === b.id);
          return true;
        });
      }

function renderBuffaloView() {
        const todayMilkTotal = state.milkLogs
          .filter(m => isToday(m.ts))
          .reduce((sum, m) => sum + Number(m.liters || 0), 0);
        const todayWaterTotal = state.waterLogs.filter(w => isToday(w.ts)).reduce((sum, w) => sum + Number(w.liters || 0), 0);
        const waterTodayEl = document.getElementById('val-water-today');
        if (waterTodayEl) waterTodayEl.textContent = `+${todayWaterTotal} L`;
        document.getElementById('val-milk-today').textContent = `${todayMilkTotal} L`;



        // Render Today's Milk Logs
        const milkContainer = document.getElementById('milk-log-list');
        const todayLogs = state.milkLogs.filter(m => isToday(m.ts)).sort((a, b) => b.ts - a.ts);
        if (todayLogs.length === 0) {
          milkContainer.innerHTML = `<div class="text-center py-5 text-xs font-semibold text-slate-400">${TEXT[state.lang].noMilkLogs}</div>`;
        } else {
          milkContainer.innerHTML = todayLogs.map(m => {
            const shiftIcon = m.shift === 'morning' ? '☀️' : '🌙';
            const shiftLbl = m.shift === 'morning' ? TEXT[state.lang].shiftMorn : TEXT[state.lang].shiftEve;
            const timeStr = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-base shrink-0">${shiftIcon}</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-xs text-slate-900 truncate">${escapeHtml(m.buffalo)} (${shiftLbl})</span>
                      <span class="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold">${escapeHtml(m.author || 'Worker')}</span>
                    </div>
                    <div class="text-[11px] text-slate-500">${timeStr} • Fat ${escapeHtml(m.fat || '7.0')}%</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="font-extrabold text-sm text-blue-700 tabular-nums">${m.liters} L</span>
                  <button type="button" data-delmilk="${m.id}" class="del-milk-btn tap-btn w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </div>
            `;
          }).join('');
        }

        // Populate Mother dropdown in Add Animal form
        const motherSel = document.getElementById('select-buf-mother');
        const curMother = motherSel.value;
        motherSel.innerHTML = `<option value="">None (Purchased / Founder)</option>` +
          state.buffaloes.map(b => {
            const spIcon = b.species === 'Cow' ? '🐄' : '🐃';
            return `<option value="${escapeHtml(b.id)}">${spIcon} ${escapeHtml(b.name)}</option>`;
          }).join('');
        if (curMother && [...motherSel.options].some(o => o.value === curMother)) motherSel.value = curMother;

        // Populate Insemination animal dropdown & default date
        const aiSel = document.getElementById('select-ai-animal');
        const curAi = aiSel.value;
        aiSel.innerHTML = state.buffaloes.map(b => {
          const spIcon = b.species === 'Cow' ? '🐄' : '🐃';
          return `<option value="${escapeHtml(b.name)}">${spIcon} ${escapeHtml(b.name)} (${escapeHtml(b.breed)})</option>`;
        }).join('');
        if (curAi && [...aiSel.options].some(o => o.value === curAi)) aiSel.value = curAi;
        const aiDateInp = document.getElementById('input-ai-date');
        if (!aiDateInp.value) aiDateInp.value = new Date().toISOString().slice(0, 10);

        // Helper to add days to YYYY-MM-DD
        function addDaysStr(dateStr, days) {
          const d = new Date(dateStr + 'T00:00:00');
          if (isNaN(d.getTime())) return '';
          d.setDate(d.getDate() + days);
          return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Render Herd Horizontal Slide Cards (FreeUp-style Unit Card Layout)
        const herdContainer = document.getElementById('buffalo-herd-list');
        const filteredAnimals = getFilteredBuffaloes();
        if (state.herdCardIndex >= filteredAnimals.length) state.herdCardIndex = 0;
        const visibleAnimals = filteredAnimals.slice(state.herdCardIndex, state.herdCardIndex + 1);

        document.getElementById('val-herd-count').textContent = String(filteredAnimals.length);
        document.getElementById('herd-card-position').textContent = filteredAnimals.length
          ? `${state.herdCardIndex + 1} / ${filteredAnimals.length}`
          : '0 / 0';

        if (filteredAnimals.length === 0) {
          herdContainer.innerHTML = `<div class="w-full text-center py-6 text-xs font-semibold text-slate-400">No animals match this filter</div>`;
        } else {
          herdContainer.innerHTML = visibleAnimals.map(b => {
            const spIcon = b.species === 'Cow' ? '🐄' : '🐃';
            const bufLogs = state.milkLogs.filter(m => m.buffalo === b.name);
            const todayLogsBuf = bufLogs.filter(m => isToday(m.ts));
            const todayMorn = todayLogsBuf.filter(m => m.shift === 'morning').reduce((sum, m) => sum + Number(m.liters || 0), 0);
            const todayEve = todayLogsBuf.filter(m => m.shift === 'evening').reduce((sum, m) => sum + Number(m.liters || 0), 0);
            const todayTotal = todayMorn + todayEve;
            const allTimeTotal = bufLogs.reduce((sum, m) => sum + Number(m.liters || 0), 0);
            const motherObj = state.buffaloes.find(x => x.id === b.motherId);
            const isTe = state.lang === 'te';
            const draft = state.milkDrafts[b.name] || {};
            const cardShift = draft.shift || getAutoMilkShift();
            const morningSelected = cardShift === 'morning';
            const shiftBoxClass = morningSelected
              ? 'bg-amber-50/70 border-amber-200/80'
              : 'bg-slate-200/80 border-slate-300';

            return `
              <div data-herd-animal="${escapeHtml(b.name)}" class="snap-start shrink-0 w-full max-w-[360px] min-h-[390px] rounded-2xl border border-orange-300/70 bg-orange-100/60 shadow-lg shadow-orange-900/15 overflow-hidden flex flex-col justify-between">
                <div>
                  <div class="p-4 space-y-3.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="flex items-center gap-1">
                          <div class="text-sm font-extrabold text-slate-900 truncate">${spIcon} ${escapeHtml(b.name)}</div>
                          <button type="button" data-delbuf="${b.id}" class="del-buf-btn tap-btn w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                        <div class="text-[11px] font-semibold text-slate-500">${escapeHtml(b.species || 'Buffalo')} • ${escapeHtml(b.breed)}</div>
                      </div>
                      ${b.price ? `<span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">${formatINR(b.price)}</span>` : ''}
                    </div>

                    <div class="flex flex-wrap gap-1">
                      <span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">☀️ ${todayMorn}L / 🌙 ${todayEve}L</span>
                      <button type="button" data-togglemilk="${b.id}" class="toggle-milking-btn tap-btn px-2 py-0.5 rounded-md text-[10px] font-bold ${b.milking !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">${b.milking !== false ? (state.lang === 'te' ? '🥛 పాలిచ్చేది' : '🥛 Milking') : (state.lang === 'te' ? '⏸️ ఎండినది' : '⏸️ Dry')}</button>
                      <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">${motherObj ? '👩 ' + escapeHtml(motherObj.name) : (isTe ? '🌱 మొదటిది' : '🌱 Founder')}</span>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-baseline justify-between">
                      <div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase">${getTodayFull()} Milk</div>
                        <div class="text-lg font-extrabold text-blue-700 tabular-nums">${todayTotal} L</div>
                      </div>
                      <div class="text-right">
                        <div class="text-[10px] font-bold text-slate-400 uppercase">All-Time</div>
                        <div class="text-xs font-extrabold text-slate-700 tabular-nums">${allTimeTotal} L</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="px-4 pb-4 space-y-2.5">
                  <div class="card-milk-box ${shiftBoxClass} border p-2 rounded-xl space-y-1.5 transition-colors" data-shift="${cardShift}">
                    <div class="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-xl border border-slate-200/60">
                      <button type="button" data-cardshift="morning" class="card-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs ${morningSelected ? 'font-extrabold bg-amber-400 text-slate-900 shadow-xs' : 'font-bold text-slate-600'}">☀️ ${TEXT[state.lang].shiftMorn}</button>
                      <button type="button" data-cardshift="evening" class="card-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs ${!morningSelected ? 'font-extrabold bg-slate-800 text-white shadow-xs' : 'font-bold text-slate-600'}">🌙 ${TEXT[state.lang].shiftEve}</button>
                    </div>
                    <p class="text-[10px] font-semibold text-slate-500 text-center">${TEXT[state.lang].shiftAuto}</p>
                    ${state.ownerUnlocked ? `<label class="block text-[10px] font-bold text-slate-500">${TEXT[state.lang].milkDateLabel}<input type="date" max="${getTodayDateInputValue()}" value="${escapeHtml(draft.date || getTodayDateInputValue())}" class="card-milk-date mt-1 w-full px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-[11px] font-extrabold text-slate-700" /></label>` : ''}
                    <div class="flex items-center gap-1.5">
                      <input type="number" step="0.5" min="0" max="999" value="${escapeHtml(draft.liters || '')}" placeholder="${isTe ? 'లీటర్లు' : 'Liters'}" class="card-milk-input flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white border border-blue-200 text-base font-extrabold text-blue-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" data-savemilkbuf="${escapeHtml(b.name)}" class="card-save-milk-btn tap-btn px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shrink-0">${TEXT[state.lang].saveMilkNext}</button>
                    </div>
                  </div>
                  <button type="button" data-aibuf="${escapeHtml(b.name)}" class="ai-buf-btn tap-btn w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-extrabold text-xs">${state.ownerUnlocked ? (state.lang === 'te' ? '+ 🧬 ఎద/గర్భం (AI)' : '+ 🧬 Log Insemination (AI)') : (state.lang === 'te' ? '🔒 🧬 ఎద/గర్భం (అడ్మిన్)' : '🔒 🧬 Log Insemination (Admin)')}</button>
                </div>
              </div>
            `;
          }).join('');
        }

        // Helper: compute all checkup intervals for an AI record
        function getCheckupSchedule(a) {
          const isCow = a.species === 'Cow';
          const gest = isCow ? 283 : 310;
          const dryDay = gest - 60;
          const prepDay = gest - 15;
          const steps = [
            { day: 21, te: '1వ ఎద తనిఖీ', en: '1st Heat Check' },
            { day: 42, te: '2వ ఎద తనిఖీ', en: '2nd Heat Check' },
            { day: 60, te: 'గర్భ పరీక్ష (PD)', en: 'Pregnancy Check (PD)' },
            { day: dryDay, te: 'పాలు ఆపడం (Dry-Off)', en: 'Dry-Off & Mineral Boost' },
            { day: prepDay, te: 'ఈత దగ్గర (Calving Pen)', en: 'Calving Pen Prep' },
            { day: gest, te: 'అంచనా ఈత తేదీ', en: 'Expected Calving' }
          ];
          const base = new Date(a.aiDate + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return steps.map(st => {
            const dt = new Date(base);
            dt.setDate(dt.getDate() + st.day);
            const diffDays = Math.round((dt - today) / 86400000);
            return {
              ...st,
              dateLabel: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              diffDays
            };
          });
        }

        // Render Upcoming Checkup Alerts
        const upcomingBox = document.getElementById('ai-upcoming-box');
        const activeAis = state.aiLogs.filter(a => a.status === 'Waiting Check' || a.status === 'Pregnant (PD+)');
        const alerts = [];
        activeAis.forEach(a => {
          const sched = getCheckupSchedule(a);
          const next = sched.find(st => st.diffDays >= -3) || sched[sched.length - 1];
          if (next) alerts.push({ animal: a.animal, ...next });
        });
        alerts.sort((x, y) => x.diffDays - y.diffDays);

        if (alerts.length > 0) {
          const hdr = state.lang === 'te' ? '📅 తదుపరి తనిఖీలు (Next Checkups)' : '📅 Upcoming Checkup Alerts';
          upcomingBox.innerHTML = `<div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">${hdr}</div>` +
            alerts.slice(0, 4).map(al => {
              const badgeCls = al.diffDays <= 0
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : (al.diffDays <= 7 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800');
              const whenTxt = al.diffDays === 0 ? 'Today!' : (al.diffDays < 0 ? `${Math.abs(al.diffDays)}d overdue` : `in ${al.diffDays}d`);
              const lbl = state.lang === 'te' ? al.te : al.en;
              return `
                <div class="flex items-center justify-between px-2.5 py-2 rounded-xl border text-[11px] font-bold ${badgeCls}">
                  <span class="truncate">🔔 ${escapeHtml(al.animal)}: ${lbl} (Day ${al.day})</span>
                  <span class="shrink-0 ml-2">${al.dateLabel} • ${whenTxt}</span>
                </div>
              `;
            }).join('');
        } else {
          upcomingBox.innerHTML = '';
        }

        // Render Recursive Family & Heir Tree
        const treeEl = document.getElementById('buffalo-heir-tree');
        const childrenMap = {};
        state.buffaloes.forEach(b => {
          const pid = b.motherId && state.buffaloes.some(x => x.id === b.motherId) ? b.motherId : '__ROOT__';
          if (!childrenMap[pid]) childrenMap[pid] = [];
          childrenMap[pid].push(b);
        });

        function renderTreeNode(animal, depth) {
          const spIcon = animal.species === 'Cow' ? '🐄' : '🐃';
          const kids = childrenMap[animal.id] || [];
          const indentPx = depth * 16;
          const prefix = depth === 0 ? '' : '└─ ';
          const kidsBadge = kids.length > 0 ? `<span class="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">${kids.length} heir${kids.length > 1 ? 's' : ''}</span>` : '';
          const nodeHtml = `
            <div style="margin-left:${indentPx}px" class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${depth === 0 ? 'bg-emerald-50/50 border-emerald-200/70' : 'bg-slate-50 border-slate-200/70'} text-xs">
              <span class="font-bold text-slate-800 truncate">${prefix}${spIcon} ${escapeHtml(animal.name)} <span class="text-[10px] font-medium text-slate-500">(${escapeHtml(animal.breed)})</span></span>
              ${kidsBadge}
            </div>
          `;
          return nodeHtml + kids.map(k => renderTreeNode(k, depth + 1)).join('');
        }

        const roots = childrenMap['__ROOT__'] || [];
        document.getElementById('val-tree-families').textContent = `${roots.length} lineage${roots.length === 1 ? '' : 's'}`;
        if (roots.length === 0) {
          treeEl.innerHTML = `<div class="text-center py-4 text-xs font-semibold text-slate-400">No animals in herd yet</div>`;
        } else {
          treeEl.innerHTML = roots.map(r => `<div class="space-y-1">${renderTreeNode(r, 0)}</div>`).join('');
        }

        // Render Insemination Log List
        const aiListEl = document.getElementById('ai-log-list');
        if (state.aiLogs.length === 0) {
          aiListEl.innerHTML = `<div class="text-center py-4 text-xs font-semibold text-slate-400">No insemination records yet</div>`;
        } else {
          aiListEl.innerHTML = [...state.aiLogs].sort((a, b) => b.ts - a.ts).map(a => {
            const sched = getCheckupSchedule(a);
            const rowsHtml = sched.map(st => {
              const lbl = state.lang === 'te' ? st.te : st.en;
              const statusDot = st.diffDays < 0 ? '✅' : (st.diffDays <= 7 ? '🔔' : '🗓️');
              return `
                <div class="flex items-center justify-between text-[10px] py-0.5 border-b border-purple-100/80 last:border-0">
                  <span class="font-bold text-slate-700">${statusDot} Day ${st.day}: ${lbl}</span>
                  <span class="font-semibold text-purple-700">${st.dateLabel}</span>
                </div>
              `;
            }).join('');

            return `
              <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-slate-900 truncate">${escapeHtml(a.animal)} • ${escapeHtml(a.status)}</div>
                    <div class="text-[11px] text-slate-500">AI: ${escapeHtml(a.aiDate)}${a.bull ? ' • ' + escapeHtml(a.bull) : ''}${a.note ? ' • ' + escapeHtml(a.note) : ''}</div>
                  </div>
                  <button type="button" data-delai="${a.id}" class="del-ai-btn tap-btn w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
                <div class="bg-purple-50/70 border border-purple-200/60 px-2.5 py-1.5 rounded-xl">
                  ${rowsHtml}
                </div>
              </div>
            `;
          }).join('');
        }
      }

      function isThisMonth(ts) {
        const d = new Date(ts), now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      function isThisYear(ts) {
        return new Date(ts).getFullYear() === new Date().getFullYear();
      }
      function isInFilter(ts) {
        if (state.filter === 'today') return isToday(ts);
        if (state.filter === 'week') return isThisWeek(ts);
        if (state.filter === 'month') return isThisMonth(ts);
        if (state.filter === 'year') return isThisYear(ts);
        return true;
      }
      function getFilteredEntries() {
        return state.entries
          .filter(e => isInFilter(e.ts))
          .sort((a, b) => b.ts - a.ts);
      }
