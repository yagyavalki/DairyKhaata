// Dairy Khata — Admin Reports, Milk Rate, Buffalo Status & Charts
function renderHistory() {
        const list = getFilteredEntries();
        const container = document.getElementById('entries-list');
        const t = TEXT[state.lang];

        if (list.length === 0) {
          container.innerHTML = `<div class="text-center py-8 text-xs font-semibold text-slate-400">${t.noEntries}</div>`;
        } else {
          container.innerHTML = list.map(e => {
            const cat = findCat(e.type, e.catId);
            const label = state.lang === 'te' ? cat.te : cat.en;
            const timeStr = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = isToday(e.ts) ? getTodayFull() : new Date(e.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const isExp = e.type === 'expense';
            const authorName = escapeHtml(e.author || 'Worker');
            const syncIcon = state.webhookUrl ? (e.synced ? '☁️' : '⏳') : '';
            return `
              <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center text-lg shrink-0">${cat.icon}</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-xs text-slate-900 truncate">${label}</span>
                      <span class="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold shrink-0">${authorName}</span>
                    </div>
                    <div class="text-[11px] text-slate-500 truncate">${dateStr} • ${timeStr} ${syncIcon}${e.note ? ' • ' + escapeHtml(e.note) : ''}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 ml-2">
                  <span class="font-extrabold text-xs tabular-nums ${isExp ? 'text-rose-600' : 'text-emerald-600'}">${isExp ? '-' : '+'}${formatINR(e.amount)}</span>
                  <button type="button" data-del="${e.id}" class="del-btn tap-btn w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete (Owner PIN)"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </div>
            `;
          }).join('');
        }

        const rateInp = document.getElementById('input-admin-milk-rate');
        if (rateInp && document.activeElement !== rateInp) rateInp.value = String(state.milkRate);
        const prodL = state.milkLogs.filter(m => isInFilter(m.ts)).reduce((sum, m) => sum + Number(m.liters || 0), 0);
        const waterL = state.waterLogs.filter(w => isInFilter(w.ts)).reduce((sum, w) => sum + Number(w.liters || 0), 0);
        const soldL = list.filter(e => e.type === 'income' && e.catId === 'milk' && e.liters > 0).reduce((sum, e) => sum + Number(e.liters || 0), 0);
        const toCollect = Math.round(soldL * state.milkRate);
        const diffPure = Math.round((soldL - prodL) * 100) / 100;
        const diffWithAdj = Math.round((soldL - (prodL + waterL)) * 100) / 100;
        document.getElementById('val-admin-milk-prod').textContent = `${prodL} L`;
        document.getElementById('val-admin-milk-water').textContent = `+${waterL} L`;
        document.getElementById('val-admin-milk-sold').textContent = `${soldL} L`;
        document.getElementById('val-admin-milk-collect').textContent = formatINR(toCollect);
        const mmEl = document.getElementById('val-admin-milk-mismatch');
        if (mmEl) {
          mmEl.textContent = `Sold vs Pure Produced: ${diffPure >= 0 ? '+' : ''}${diffPure} L • After Adjusted (+${waterL}L): ${diffWithAdj >= 0 ? '+' : ''}${diffWithAdj} L`;
          mmEl.className = Math.abs(diffWithAdj) > 0.01
            ? 'text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200'
            : 'text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200';
        }
        let hExp = 0, hInc = 0;
        list.forEach(e => { if (e.type === 'expense') hExp += e.amount; else hInc += e.amount; });
        const hNet = hInc - hExp;
        const tNetEl = document.getElementById('val-totals-net');
        tNetEl.textContent = (hNet < 0 ? '-' : '') + formatINR(Math.abs(hNet));
        tNetEl.className = 'text-2xl font-extrabold mt-0.5 tabular-nums ' + (hNet >= 0 ? 'text-emerald-400' : 'text-rose-400');
        document.getElementById('val-totals-inc').textContent = formatINR(hInc);
        document.getElementById('val-totals-exp').textContent = formatINR(hExp);
        // Render Per-Buffalo Status (Milk Produced vs Medicines, Vet & Feed Share)
        const statusPeriodLabels = { today: getTodayFull(), week: 'Last 7 Days', month: 'This Month', year: 'This Year', all: 'All Time' };
        const stPeriodEl = document.getElementById('val-admin-status-period');
        if (stPeriodEl) stPeriodEl.textContent = statusPeriodLabels[state.filter] || 'All';
        const statusListEl = document.getElementById('admin-buffalo-status-list');
        if (statusListEl) {
          const totalFeed = list.filter(e => e.type === 'expense' && (e.catId === 'feed' || e.catId === 'fodder')).reduce((sum, e) => sum + e.amount, 0);
          const feedPerAnimal = state.buffaloes.length > 0 ? Math.round(totalFeed / state.buffaloes.length) : 0;
          if (state.buffaloes.length === 0) {
            statusListEl.innerHTML = '<div class="text-center py-4 text-xs font-semibold text-slate-400">No animals in herd</div>';
          } else {
            statusListEl.innerHTML = state.buffaloes.map(b => {
              const bMilk = state.milkLogs.filter(m => m.buffalo === b.name && isInFilter(m.ts)).reduce((sum, m) => sum + Number(m.liters || 0), 0);
              const entryMeds = list.filter(e => e.type === 'expense' && e.catId === 'medicines');
              const entryDocs = list.filter(e => e.type === 'expense' && e.catId === 'doctor');
              const sharedMed = state.buffaloes.length > 0 ? Math.round((state.medLogs.filter(m => (!m.buffalo || m.buffalo === 'All Herd') && isInFilter(m.ts)).reduce((sum, m) => sum + Number(m.cost || 0), 0) + entryMeds.filter(e => !e.buffalo || e.buffalo === 'All Herd').reduce((sum, e) => sum + e.amount, 0)) / state.buffaloes.length) : 0;
              const sharedDoc = state.buffaloes.length > 0 ? Math.round((state.docLogs.filter(d => (!d.buffalo || d.buffalo === 'All Herd') && isInFilter(d.ts)).reduce((sum, d) => sum + Number(d.cost || 0), 0) + entryDocs.filter(e => !e.buffalo || e.buffalo === 'All Herd').reduce((sum, e) => sum + e.amount, 0)) / state.buffaloes.length) : 0;
              const bMed = state.medLogs.filter(m => m.buffalo === b.name && isInFilter(m.ts)).reduce((sum, m) => sum + Number(m.cost || 0), 0) + entryMeds.filter(e => e.buffalo === b.name).reduce((sum, e) => sum + e.amount, 0) + sharedMed;
              const bDoc = state.docLogs.filter(d => d.buffalo === b.name && isInFilter(d.ts)).reduce((sum, d) => sum + Number(d.cost || 0), 0) + entryDocs.filter(e => e.buffalo === b.name).reduce((sum, e) => sum + e.amount, 0) + sharedDoc;
              const bTotalExp = bMed + bDoc + feedPerAnimal;
              const bMilkVal = Math.round(bMilk * state.milkRate);
              const bNet = bMilkVal - bTotalExp;
              return `
                <div class="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <button type="button" data-bdetail="${escapeHtml(b.name)}" class="btn-buf-detail-link text-left font-extrabold text-xs text-blue-700 hover:text-blue-900 underline decoration-blue-400 underline-offset-2">${b.species === 'Cow' ? '🐄' : '🐃'} ${escapeHtml(b.name)} <span class="text-[10px] font-semibold text-slate-500 no-underline">(${escapeHtml(b.breed)}) ↗</span></button>
                    <span class="text-xs font-extrabold tabular-nums ${bNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${bNet >= 0 ? '+' : '-'}${formatINR(Math.abs(bNet))}</span>
                  </div>
                  <div class="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div class="p-1.5 rounded-lg bg-blue-50 text-blue-800 font-bold">🥛 ${bMilk} L<div class="text-[9px] text-blue-600">${formatINR(bMilkVal)}</div></div>
                    <div class="p-1.5 rounded-lg bg-rose-50 text-rose-800 font-bold">💊 Meds<div class="text-[9px]">${formatINR(bMed)}</div></div>
                    <div class="p-1.5 rounded-lg bg-indigo-50 text-indigo-800 font-bold">🩺 Vet<div class="text-[9px]">${formatINR(bDoc)}</div></div>
                    <div class="p-1.5 rounded-lg bg-amber-50 text-amber-800 font-bold">🌾 Food<div class="text-[9px]">${formatINR(feedPerAnimal)}</div></div>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
        renderChart(list);
        renderSyncStatus();
      }

      function renderChart(list) {
        const bType = state.breakdownType || 'expense';
        const items = list.filter(e => e.type === bType);
        const canvas = document.getElementById('expense-chart');
        const emptyEl = document.getElementById('chart-empty');
        const bdListEl = document.getElementById('category-breakdown-list');

        if (items.length === 0) {
          canvas.parentElement.classList.add('hidden');
          emptyEl.classList.remove('hidden');
          bdListEl.innerHTML = '';
          if (state.chartInstance) {
            state.chartInstance.destroy();
            state.chartInstance = null;
          }
          return;
        }

        canvas.parentElement.classList.remove('hidden');
        emptyEl.classList.add('hidden');

        const totalsByCat = {};
        let grandTotal = 0;
        items.forEach(e => {
          totalsByCat[e.catId] = (totalsByCat[e.catId] || 0) + e.amount;
          grandTotal += e.amount;
        });

        const sortedCats = Object.keys(totalsByCat).sort((a, b) => totalsByCat[b] - totalsByCat[a]);
        const labels = [];
        const data = [];
        const colors = [];
        const rowsHtml = [];

        sortedCats.forEach(catId => {
          const cat = findCat(bType, catId);
          const amt = totalsByCat[catId];
          const pct = grandTotal > 0 ? Math.round((amt / grandTotal) * 100) : 0;
          const catName = state.lang === 'te' ? cat.te : cat.en;
          labels.push(`${cat.icon} ${catName}`);
          data.push(amt);
          colors.push(cat.color);

          rowsHtml.push(`
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800">${cat.icon} ${catName}</span>
                <span class="font-extrabold ${bType === 'expense' ? 'text-rose-600' : 'text-emerald-600'} tabular-nums">${formatINR(amt)} <span class="text-[10px] font-semibold text-slate-400">(${pct}%)</span></span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style="width:${pct}%;background-color:${cat.color}" class="h-full rounded-full"></div>
              </div>
            </div>
          `);
        });

        bdListEl.innerHTML = rowsHtml.join('');

        if (state.chartInstance) {
          state.chartInstance.destroy();
        }
        if (typeof Chart === 'undefined') return;
        state.chartInstance = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11, weight: '600' } } }
            }
          }
        });
      }

      function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
      }

      function renderHealthView() {
        const bufOptions = `<option value="All Herd">🐃 All Herd (మొత్తం గేదెలు)</option>` +
          state.buffaloes.map(b => `<option value="${escapeHtml(b.name)}">🐃 ${escapeHtml(b.name)}</option>`).join('');
        const medSel = document.getElementById('select-med-buffalo');
        const docSel = document.getElementById('select-doc-buffalo');
        const prevMed = medSel.value;
        const prevDoc = docSel.value;
        medSel.innerHTML = bufOptions;
        docSel.innerHTML = bufOptions;
        if (prevMed && [...medSel.options].some(o => o.value === prevMed)) medSel.value = prevMed;
        if (prevDoc && [...docSel.options].some(o => o.value === prevDoc)) docSel.value = prevDoc;

        const medTotal = state.medLogs.reduce((s, x) => s + Number(x.cost || 0), 0);
        const docTotal = state.docLogs.reduce((s, x) => s + Number(x.cost || 0), 0);
        document.getElementById('val-med-total').textContent = formatINR(medTotal);
        document.getElementById('val-doc-total').textContent = formatINR(docTotal);

        const medList = document.getElementById('med-log-list');
        if (state.medLogs.length === 0) {
          medList.innerHTML = `<div class="text-center py-5 text-xs font-semibold text-slate-400">No medicine entries yet</div>`;
        } else {
          medList.innerHTML = [...state.medLogs].sort((a, b) => b.ts - a.ts).map(m => `
            <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-base shrink-0">💊</div>
                <div class="min-w-0">
                  <div class="font-bold text-xs text-slate-900 truncate">${escapeHtml(m.name)} • ${escapeHtml(m.buffalo)}</div>
                  <div class="text-[11px] text-slate-500">${new Date(m.ts).toLocaleDateString('en-IN')} • ${escapeHtml(m.author || 'Worker')}</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="font-extrabold text-xs text-rose-600">${formatINR(m.cost)}</span>
                <button type="button" data-delmed="${m.id}" class="del-med-btn tap-btn w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
              </div>
            </div>
          `).join('');
        }

        const docList = document.getElementById('doc-log-list');
        if (state.docLogs.length === 0) {
          docList.innerHTML = `<div class="text-center py-5 text-xs font-semibold text-slate-400">No doctor visits logged yet</div>`;
        } else {
          docList.innerHTML = [...state.docLogs].sort((a, b) => b.ts - a.ts).map(d => `
            <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-base shrink-0">🩺</div>
                <div class="min-w-0">
                  <div class="font-bold text-xs text-slate-900 truncate">${escapeHtml(d.doctor)} (${escapeHtml(d.reason)})</div>
                  <div class="text-[11px] text-slate-500">${escapeHtml(d.buffalo)} • ${new Date(d.ts).toLocaleDateString('en-IN')} • ${escapeHtml(d.author || 'Worker')}</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="font-extrabold text-xs text-indigo-600">${formatINR(d.cost)}</span>
                <button type="button" data-deldoc="${d.id}" class="del-doc-btn tap-btn w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center shrink-0" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
              </div>
            </div>
          `).join('');
        }
      }

      function switchTab(tab) {
        state.tab = tab;
        const views = {
          add: document.getElementById('view-add'),
          buffalo: document.getElementById('view-buffalo'),
          health: document.getElementById('view-health'),
          history: document.getElementById('view-history')
        };
        const navs = {
          add: document.getElementById('nav-add'),
          buffalo: document.getElementById('nav-buffalo'),
          health: document.getElementById('nav-health'),
          history: document.getElementById('nav-history')
        };
        const dnavs = {
          add: document.getElementById('dnav-add'),
          buffalo: document.getElementById('dnav-buffalo'),
          health: document.getElementById('dnav-health'),
          history: document.getElementById('dnav-history')
        };

        Object.keys(views).forEach(k => {
          if (k === tab) {
            views[k].classList.remove('hidden');
            navs[k].className = 'py-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-emerald-700 bg-emerald-50 font-bold';
            dnavs[k].className = 'tap-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 shadow-xs';
          } else {
            views[k].classList.add('hidden');
            navs[k].className = 'py-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-slate-500 font-semibold';
            dnavs[k].className = 'tap-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900';
          }
        });

        if (tab === 'buffalo') renderBuffaloView();
        if (tab === 'health') renderHealthView();
        if (tab === 'history') renderHistory();
      }

      function renderAll() {
        applyLanguage();
        renderOwnerLockBadge();
        renderAuthors();
        renderEntryDateField();
        renderSyncStatus();
        renderTodaySummary();
        renderTypeButtons();
        renderCategories();
        updateCalcSelectedBadge();
        renderAmount();
        renderBuffaloView();
        renderHealthView();
        renderHistory();
      }
