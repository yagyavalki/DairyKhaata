// Dairy Khata — Event Listeners, Modals, Reminders & Boot
// Event Listeners
      
      const btnLangTe = document.getElementById('btn-lang-te');
      const btnLangEn = document.getElementById('btn-lang-en');
      function syncLangToggleUI() {
        if (!btnLangTe || !btnLangEn) return;
        const te = state.lang === 'te';
        btnLangTe.className = te ? 'px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#174b36] text-white' : 'px-2.5 py-1 rounded-full text-[11px] font-bold text-[#646c66]';
        btnLangEn.className = !te ? 'px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#174b36] text-white' : 'px-2.5 py-1 rounded-full text-[11px] font-bold text-[#646c66]';
      }
      if (btnLangTe) btnLangTe.addEventListener('click', () => { state.lang = 'te'; syncLangToggleUI(); playTone(620, 0.06); renderAll(); });
      if (btnLangEn) btnLangEn.addEventListener('click', () => { state.lang = 'en'; syncLangToggleUI(); playTone(620, 0.06); renderAll(); });
      syncLangToggleUI();

      document.getElementById('btn-lang').addEventListener('click', () => {
        state.lang = state.lang === 'te' ? 'en' : 'te';
        playTone(620, 0.06);
        renderAll();
      });

      const soundButton = document.getElementById('btn-sound');
      if (soundButton) soundButton.addEventListener('click', () => {
        state.soundOn = !state.soundOn;
        document.getElementById('sound-icon').textContent = state.soundOn ? '🔊' : '🔇';
        if (state.soundOn) playTone(520, 0.06);
      });

      async function callAdminPinAction(payload) {
        if (!state.webhookUrl) throw new Error('Configure the Apps Script URL in Setup first.');
        if (!window.crypto || !window.crypto.getRandomValues) throw new Error('Secure browser support is required for PIN verification.');

        const requestId = Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
          .map(value => value.toString(16).padStart(2, '0')).join('');
        await fetch(state.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...payload, requestId })
        });

        const statusUrl = new URL(state.webhookUrl);
        statusUrl.searchParams.set('action', 'pinStatus');
        statusUrl.searchParams.set('requestId', requestId);
        for (let attempt = 0; attempt < 15; attempt++) {
          const response = await fetch(statusUrl.href);
          if (!response.ok) throw new Error('PIN verification endpoint returned HTTP ' + response.status);
          const result = await response.json();
          if (!result.pending) return result;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        throw new Error('PIN verification timed out. Check the Apps Script deployment.');
      }

      async function verifyOwnerPin(pin) {
        state.pinVerifying = true;
        try {
          const result = await callAdminPinAction({ action: 'verifyPin', pin });
          if (!result.authenticated) {
            const message = {
              locked: 'PIN temporarily locked. Try again later.',
              not_initialized: 'Admin PIN is not configured in Apps Script.'
            }[result.error] || 'Wrong PIN';
            throw new Error(message);
          }
          state.ownerUnlocked = true;
          document.getElementById('pin-modal').classList.add('hidden');
          renderOwnerLockBadge();
          renderAuthors();
          renderEntryDateField();
          renderBuffaloView();
          playTone(880, 0.1);
          if (state.pendingProtectedAction) {
            const fn = state.pendingProtectedAction;
            state.pendingProtectedAction = null;
            fn();
          }
        } catch (err) {
          playTone(220, 0.15);
          const card = document.getElementById('pin-card');
          card.classList.add('shake');
          setTimeout(() => card.classList.remove('shake'), 300);
          showToast(err.message || 'PIN verification failed', '⚠️');
        } finally {
          state.pinBuffer = '';
          state.pinVerifying = false;
          renderPinDots();
        }
      }

      const ownerLockButton = document.getElementById('btn-owner-lock');
      if (ownerLockButton) ownerLockButton.addEventListener('click', () => {
        if (state.ownerUnlocked) {
          state.ownerUnlocked = false;
          if (state.currentAuthor === 'Owner') {
            state.currentAuthor = state.authors.find(a => a !== 'Owner') || 'Ramu';
            safeSet(AUTHOR_KEY, state.currentAuthor);
          }
          if (state.tab === 'history') switchTab('buffalo');
          else if (state.tab === 'buffalo') renderBuffaloView();
          renderOwnerLockBadge();
          renderTodaySummary();
          renderAuthors();
          renderEntryDateField();
          showToast('Owner mode locked', '🔒');
        } else {
          requireOwnerPin(() => {
            renderOwnerLockBadge();
            renderAuthors();
            showToast('Owner unlocked', '🔓');
          });
        }
      });

      // PIN Keypad Logic
      document.querySelectorAll('.pin-key').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (state.pinVerifying || state.pinBuffer.length >= 4) return;
          state.pinBuffer += btn.dataset.pinkey;
          playTone(540, 0.03);
          renderPinDots();
          if (state.pinBuffer.length === 4) await verifyOwnerPin(state.pinBuffer);
        });
      });

      document.getElementById('pin-back').addEventListener('click', () => {
        state.pinBuffer = state.pinBuffer.slice(0, -1);
        renderPinDots();
      });

      document.getElementById('pin-cancel').addEventListener('click', () => {
        state.pinBuffer = '';
        state.pendingProtectedAction = null;
        document.getElementById('pin-subtitle').textContent = 'Enter 4-digit PIN';
        document.getElementById('pin-modal').classList.add('hidden');
      });

      document.getElementById('author-pills').addEventListener('click', (e) => {
        const delSpan = e.target.closest('.del-author-btn');
        if (delSpan) {
          e.stopPropagation();
          const targetName = delSpan.dataset.delauthor;
          requireOwnerPin(() => {
            state.pendingDeleteAction = () => {
              state.authors = state.authors.filter(a => a !== targetName);
              safeSet(AUTHORS_LIST_KEY, JSON.stringify(state.authors));
              if (state.currentAuthor === targetName) {
                state.currentAuthor = state.authors.find(a => a !== 'Owner') || 'Owner';
                safeSet(AUTHOR_KEY, state.currentAuthor);
              }
            };
            const t = TEXT[state.lang];
            document.getElementById('modal-title').textContent = t.delTitle;
            document.getElementById('modal-desc').textContent = `Delete author "${targetName}"?`;
            document.getElementById('confirm-modal').classList.remove('hidden');
          });
          return;
        }
        const btn = e.target.closest('.author-pill');
        if (!btn) return;
        const chosen = btn.dataset.author;
        if (chosen === 'Owner' && !state.ownerUnlocked) {
          requireOwnerPin(() => {
            state.currentAuthor = 'Owner';
            safeSet(AUTHOR_KEY, 'Owner');
            renderAuthors();
            showToast('Switched to Owner', '👑');
          });
          return;
        }
        if (chosen !== 'Owner' && state.ownerUnlocked) {
          state.ownerUnlocked = false;
          renderOwnerLockBadge();
          renderBuffaloView();
          renderEntryDateField();
        }
        state.currentAuthor = chosen;
        safeSet(AUTHOR_KEY, state.currentAuthor);
        playTone(600, 0.04);
        renderAuthors();
      });

      document.getElementById('btn-custom-author').addEventListener('click', () => {
        const box = document.getElementById('custom-author-box');
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) {
          document.getElementById('input-author-name').focus();
        }
      });

      document.getElementById('btn-save-author').addEventListener('click', () => {
        const inp = document.getElementById('input-author-name');
        const name = inp.value.trim();
        if (!name) return;
        if (!state.authors.includes(name)) {
          state.authors.push(name);
          safeSet(AUTHORS_LIST_KEY, JSON.stringify(state.authors));
        }
        state.currentAuthor = name;
        safeSet(AUTHOR_KEY, name);
        inp.value = '';
        document.getElementById('custom-author-box').classList.add('hidden');
        playTone(700, 0.06);
        renderAuthors();
      });

      document.getElementById('type-expense').addEventListener('click', () => {
        state.entryType = 'expense';
        playTone(440, 0.05);
        renderTypeButtons();
        renderCategories();
      });

      document.getElementById('type-income').addEventListener('click', () => {
        state.entryType = 'income';
        playTone(540, 0.05);
        renderTypeButtons();
        renderCategories();
      });

      function updateMiscNoteHighlight() {
        const noteInp = document.getElementById('input-note');
        const isMisc = state.selectedCat === 'other_exp' || state.selectedCat === 'other_inc';
        if (isMisc) {
          noteInp.className = 'w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3';
          noteInp.placeholder = state.lang === 'te' ? '📝 Misc నోట్: దేనికోసం? (ఇక్కడ రాయండి)' : '📝 Misc Note: What is this for?';
        } else {
          noteInp.className = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3';
          noteInp.placeholder = TEXT[state.lang].notePlaceholder;
        }
      }

      function isMilkSaleMode() {
        return state.entryType === 'income' && state.selectedCat === 'milk';
      }

      function updateCalcSelectedBadge() {
        const cat = findCat(state.entryType, state.selectedCat);
        const badge = document.getElementById('calc-selected-badge');
        if (badge && cat) {
          badge.textContent = `${cat.icon} ${state.lang === 'te' ? cat.te : cat.en}`;
        }
        const isMilk = isMilkSaleMode();
        const unitEl = document.getElementById('calc-unit-prefix');
        if (unitEl) unitEl.textContent = isMilk ? 'L (Liters)' : '₹';
        const amtLbl = document.getElementById('lbl-step-amt');
        if (amtLbl) amtLbl.classList.toggle('hidden', isMilk);
        const qAdds = document.querySelectorAll('.quick-add');
        const vals = isMilk ? [5, 10, 25, 50] : [50, 100, 500, 1000];
        qAdds.forEach((btn, i) => {
          btn.dataset.add = String(vals[i]);
          btn.textContent = isMilk ? `+${vals[i]}L` : `+₹${vals[i]}`;
        });
        const dotBtn = document.getElementById('btn-key-00-dot');
        if (dotBtn) {
          dotBtn.dataset.key = isMilk ? '.' : '00';
          dotBtn.textContent = isMilk ? '.' : '00';
        }
        const animalWrap = document.getElementById('calc-animal-wrap');
        const animalSel = document.getElementById('select-calc-animal');
        const needsAnimal = state.entryType === 'expense' && (state.selectedCat === 'medicines' || state.selectedCat === 'doctor');
        if (animalWrap && animalSel) {
          animalWrap.classList.toggle('hidden', !needsAnimal);
          if (needsAnimal) {
            const prev = animalSel.value;
            animalSel.innerHTML = `<option value="All Herd">🐃 All Herd (మొత్తం గేదెలు)</option>` +
              state.buffaloes.map(b => `<option value="${escapeHtml(b.name)}">${b.species === 'Cow' ? '🐄' : '🐃'} ${escapeHtml(b.name)}</option>`).join('');
            if (prev && [...animalSel.options].some(o => o.value === prev)) animalSel.value = prev;
          }
        }
      }

      document.getElementById('btn-close-calc').addEventListener('click', () => {
        document.getElementById('calc-overlay').classList.add('hidden');
      });

      document.getElementById('category-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-btn');
        if (!btn) return;
        state.selectedCat = btn.dataset.cat;
        playTone(580, 0.05);
        renderCategories();
        updateMiscNoteHighlight();
        updateCalcSelectedBadge();
        document.getElementById('calc-overlay').classList.remove('hidden');
      });

      document.querySelectorAll('.quick-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const add = parseInt(btn.dataset.add, 10);
          const cur = parseInt(state.amountStr, 10) || 0;
          const next = Math.min(cur + add, 9999999);
          state.amountStr = String(next);
          playTone(660, 0.04);
          renderAmount();
        });
      });

      document.querySelectorAll('.num-key').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.key;
          if (k === '.') {
            if (!state.amountStr.includes('.')) state.amountStr += '.';
          } else if (state.amountStr === '0') {
            state.amountStr = (k === '0' || k === '00') ? '0' : k;
          } else if (state.amountStr.length < 8) {
            state.amountStr += k;
          }
          playTone(500, 0.03);
          renderAmount();
        });
      });

      document.getElementById('btn-backspace').addEventListener('click', () => {
        state.amountStr = state.amountStr.length > 1 ? state.amountStr.slice(0, -1) : '0';
        playTone(380, 0.04);
        renderAmount();
      });

      document.getElementById('btn-clear-amt').addEventListener('click', () => {
        state.amountStr = '0';
        playTone(340, 0.05);
        renderAmount();
      });

      document.getElementById('btn-save').addEventListener('click', () => {
        const t = TEXT[state.lang];
        const isMilk = isMilkSaleMode();
        const amt = parseInt(state.amountStr, 10) || 0;
        if (!state.selectedCat) {
          showToast(t.selectCatToast, '⚠️');
          return;
        }
        if (amt <= 0) {
          showToast(isMilk ? t.enterLitersToast : t.enterAmtToast, '⚠️');
          playTone(280, 0.1);
          return;
        }
        const note = document.getElementById('input-note').value.trim();
        const cat = findCat(state.entryType, state.selectedCat);
        const catLabel = state.lang === 'te' ? cat.te : cat.en;
        const entryDateInput = document.getElementById('input-entry-date');
        const chosenDate = state.ownerUnlocked && entryDateInput ? entryDateInput.value : '';
        const todayDate = getTodayDateInputValue();
        if (chosenDate && chosenDate > todayDate) {
          showToast(t.futureDateToast, '⚠️');
          return;
        }
        const entryTimestamp = chosenDate && chosenDate !== todayDate
          ? new Date(`${chosenDate}T12:00:00`).getTime()
          : Date.now();
        const needsAnimal = state.entryType === 'expense' && (state.selectedCat === 'medicines' || state.selectedCat === 'doctor');
        const chosenAnimal = needsAnimal ? (document.getElementById('select-calc-animal').value || 'All Herd') : '';
        const valText = isMilk ? `${amt} L` : formatINR(amt);
        const descParts = [catLabel];
        if (chosenDate && chosenDate !== todayDate) descParts.push(chosenDate);
        if (chosenAnimal) descParts.push(chosenAnimal);
        if (note) descParts.push(note);
        confirmSavePrompt('Confirm Entry', valText, descParts.join(' • '), () => {
        const finalAmt = isMilk ? Math.round(amt * state.milkRate) : amt;
        const newEntry = {
          id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          type: state.entryType,
          catId: state.selectedCat,
          buffalo: chosenAnimal,
          liters: isMilk ? amt : 0,
          amount: finalAmt,
          author: state.currentAuthor || 'Worker',
          note: isMilk && !note ? `${amt} L Milk Sale` : (chosenAnimal ? `${chosenAnimal}${note ? ' • ' + note : ''}` : note),
          ts: entryTimestamp,
          synced: false
        };
        state.entries.push(newEntry);
        saveEntries(state.entries);
        if (entryDateInput) entryDateInput.value = todayDate;
        state.amountStr = '0';
        document.getElementById('input-note').value = '';
        playTone(880, 0.12);
        showToast(isMilk ? `Saved ${amt} L Milk!` : t.savedToast, '✅');
        document.getElementById('calc-overlay').classList.add('hidden');
        renderTodaySummary();
        renderAmount();
        renderSyncStatus();
        syncEntryToSheet(newEntry);
        });
      });

      document.getElementById('herd-filter-pills').addEventListener('click', (e) => {
        const btn = e.target.closest('.herd-filter-btn');
        if (!btn) return;
        state.herdFilter = btn.dataset.hfilter;
        state.herdCardIndex = 0;
        document.querySelectorAll('.herd-filter-btn').forEach(b => {
          b.className = b === btn
            ? 'herd-filter-btn tap-btn flex items-center justify-center text-center px-3 py-1 rounded-full text-[15px] font-bold bg-slate-900 text-white'
            : 'herd-filter-btn tap-btn flex items-center justify-center text-center px-3 py-1 rounded-full text-[15px] font-bold bg-slate-100 text-slate-700';
        });
        playTone(540, 0.04);
        renderBuffaloView();
      });

      function moveHerdCard(direction) {
        const animals = getFilteredBuffaloes();
        if (!animals.length) return;
        state.herdCardIndex = (state.herdCardIndex + direction + animals.length) % animals.length;
        renderBuffaloView();
      }

      document.getElementById('btn-herd-prev').addEventListener('click', () => {
        moveHerdCard(-1);
      });

      document.getElementById('btn-herd-next').addEventListener('click', () => {
        moveHerdCard(1);
      });

      const herdCardTrack = document.getElementById('buffalo-herd-list');
      herdCardTrack.addEventListener('input', (e) => {
        const input = e.target.closest('.card-milk-input, .card-milk-date');
        const card = input && input.closest('[data-herd-animal]');
        if (!card) return;

        const draft = state.milkDrafts[card.dataset.herdAnimal] || {};
        const updatedDraft = { ...draft, shift: card.querySelector('.card-milk-box').dataset.shift };
        if (input.matches('.card-milk-input')) updatedDraft.liters = input.value;
        if (input.matches('.card-milk-date')) updatedDraft.date = input.value;
        state.milkDrafts[card.dataset.herdAnimal] = updatedDraft;
      });

      let herdSwipeStartX = null;
      herdCardTrack.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) herdSwipeStartX = e.touches[0].clientX;
      }, { passive: true });
      herdCardTrack.addEventListener('touchend', (e) => {
        if (herdSwipeStartX === null) return;
        const swipeDistance = e.changedTouches[0].clientX - herdSwipeStartX;
        herdSwipeStartX = null;
        if (Math.abs(swipeDistance) >= 60) moveHerdCard(swipeDistance < 0 ? 1 : -1);
      }, { passive: true });
      herdCardTrack.addEventListener('touchcancel', () => {
        herdSwipeStartX = null;
      }, { passive: true });

      document.getElementById('btn-toggle-add-buffalo').addEventListener('click', () => {
        document.getElementById('add-buffalo-form').classList.toggle('hidden');
      });

      document.getElementById('btn-save-buffalo').addEventListener('click', () => {
        const name = document.getElementById('input-buf-name').value.trim();
        if (!name) {
          showToast('Enter buffalo name or tag #', '⚠️');
          return;
        }
        if (state.buffaloes.some(buffalo => buffalo.name.trim().toLowerCase() === name.toLowerCase())) {
          showToast('That animal name or tag already exists', '⚠️');
          return;
        }
        const species = document.getElementById('input-buf-species').value;
        const breed = document.getElementById('input-buf-breed').value;
        const price = parseInt(document.getElementById('input-buf-price').value, 10) || 0;
        const motherId = document.getElementById('select-buf-mother').value || '';
        const buf = {
          id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          name,
          species,
          breed,
          price,
          motherId,
          addedAt: Date.now()
        };
        state.buffaloes.push(buf);
        safeSet(BUFFALO_KEY, JSON.stringify(state.buffaloes));

        const d = new Date(buf.addedAt);
        const motherName = motherId ? ((state.buffaloes.find(x => x.id === motherId) || {}).name || 'Founder') : 'Founder';
        postToSheet({
          sheetTab: 'Herd_Tree',
          row: [buf.name, buf.species, buf.breed, motherName, buf.price, d.toLocaleDateString('en-IN'), state.currentAuthor || 'Worker', '', buf.id]
        });

        document.getElementById('input-buf-name').value = '';
        document.getElementById('input-buf-price').value = '';
        document.getElementById('add-buffalo-form').classList.add('hidden');
        playTone(880, 0.1);
        showToast('New buffalo added!', '🐃');
        renderBuffaloView();
      });

      document.getElementById('milk-log-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.del-milk-btn');
        if (!btn) return;
        const id = btn.dataset.delmilk;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.milkLogs = state.milkLogs.filter(m => m.id !== id);
            safeSet(MILK_KEY, JSON.stringify(state.milkLogs));
            safeSet(WATER_KEY, JSON.stringify(state.waterLogs));
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

      herdCardTrack.addEventListener('click', (e) => {
        const aiBtn = e.target.closest('.ai-buf-btn');
        if (aiBtn) {
          requireOwnerPin(() => {
            switchTab('history');
            document.getElementById('select-ai-animal').value = aiBtn.dataset.aibuf;
            setTimeout(() => document.getElementById('breeding-section').scrollIntoView({ behavior: 'smooth' }), 60);
            playTone(620, 0.05);
            showToast(`AI log for ${aiBtn.dataset.aibuf}`, '🧬');
          });
          return;
        }
        const shiftTab = e.target.closest('.card-shift-tab');
        if (shiftTab) {
          const box = shiftTab.closest('[data-shift]');
          const chosen = shiftTab.dataset.cardshift;
          const card = shiftTab.closest('[data-herd-animal]');
          const draft = state.milkDrafts[card.dataset.herdAnimal] || {};
          state.milkDrafts[card.dataset.herdAnimal] = { ...draft, shift: chosen };
          box.dataset.shift = chosen;
          box.className = chosen === 'morning'
            ? 'card-milk-box bg-amber-50/70 border border-amber-200/80 p-2 rounded-xl space-y-1.5 transition-colors'
            : 'card-milk-box bg-slate-200/80 border border-slate-300 p-2 rounded-xl space-y-1.5 transition-colors';
          box.querySelectorAll('.card-shift-tab').forEach(t => {
            if (t === shiftTab) {
              t.className = chosen === 'morning'
                ? 'card-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs font-extrabold bg-amber-400 text-slate-900 shadow-xs'
                : 'card-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs font-extrabold bg-slate-800 text-white shadow-xs';
            } else {
              t.className = 'card-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs font-bold text-slate-600';
            }
          });
          playTone(540, 0.04);
          return;
        }
        const saveMilkBtn = e.target.closest('.card-save-milk-btn');
        if (saveMilkBtn) {
          const card = saveMilkBtn.closest('.snap-start');
          const litersInp = card.querySelector('.card-milk-input');
          const box = saveMilkBtn.closest('[data-shift]');
          const liters = parseFloat(litersInp.value) || 0;
          if (liters <= 0) {
            showToast(TEXT[state.lang].enterLitersToast, '⚠️');
            litersInp.focus();
            return;
          }
          const bufName = saveMilkBtn.dataset.savemilkbuf;
          const shift = box.dataset.shift || 'morning';
          const dateInp = box.querySelector('.card-milk-date');
          const chosenDate = (state.ownerUnlocked && dateInp && dateInp.value) ? dateInp.value : '';
          const todayStr = getTodayDateInputValue();
          if (chosenDate > todayStr) {
            showToast(TEXT[state.lang].futureDateToast, '⚠️');
            return;
          }
          confirmSavePrompt(
            'Confirm Milk Log',
            `${liters} L`,
            `${bufName} • ${shift === 'morning' ? '☀️ Morning' : '🌙 Evening'}`,
            () => {
              const entryTs = (chosenDate && chosenDate !== todayStr)
                ? new Date(chosenDate + 'T12:00:00').getTime()
                : Date.now();
              const log = {
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                shift,
                buffalo: bufName,
                liters,
                fat: '7.0',
                author: state.currentAuthor || 'Worker',
                ts: entryTs
              };
              state.milkLogs.push(log);
              safeSet(MILK_KEY, JSON.stringify(state.milkLogs));
              const d = new Date(log.ts);
              postToSheet({
                sheetTab: 'Milk_Logs',
                row: [d.toLocaleDateString('en-IN'), d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), log.author, log.shift, log.buffalo, log.liters, log.fat + '%', '', log.id]
              });
              delete state.milkDrafts[bufName];
              playTone(880, 0.1);
              showToast(`${TEXT[state.lang].milkSavedToast} ${liters} L`, '🥛');
              const animals = getFilteredBuffaloes();
              if (animals.length) state.herdCardIndex = (state.herdCardIndex + 1) % animals.length;
              renderBuffaloView();
            }
          );
          return;
        }
        const milkToggle = e.target.closest('.toggle-milking-btn');
        if (milkToggle) {
          const target = state.buffaloes.find(b => b.id === milkToggle.dataset.togglemilk);
          if (target) {
            target.milking = target.milking === false ? true : false;
            safeSet(BUFFALO_KEY, JSON.stringify(state.buffaloes));
            renderBuffaloView();
          }
          return;
        }
        const btn = e.target.closest('.del-buf-btn');
        if (!btn) return;
        const id = btn.dataset.delbuf;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.buffaloes = state.buffaloes.filter(b => b.id !== id);
            safeSet(BUFFALO_KEY, JSON.stringify(state.buffaloes));
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

                  // Insemination Save & Delete Listeners
      document.getElementById('btn-save-ai').addEventListener('click', () => {
        const animal = document.getElementById('select-ai-animal').value;
        const aiDate = document.getElementById('input-ai-date').value;
        const status = document.getElementById('select-ai-status').value;
        const bull = document.getElementById('input-ai-bull').value.trim();
        const note = document.getElementById('input-ai-note').value.trim();
        if (!animal || !aiDate) {
          showToast('Select animal & AI date', '⚠️');
          return;
        }
        const bufObj = state.buffaloes.find(b => b.name === animal);
        const species = bufObj ? (bufObj.species || 'Buffalo') : 'Buffalo';
        const rec = {
          id: 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          animal,
          species,
          aiDate,
          bull,
          status,
          note,
          author: state.currentAuthor || 'Worker',
          ts: Date.now()
        };
        state.aiLogs.push(rec);
        safeSet(AI_KEY, JSON.stringify(state.aiLogs));

        postToSheet({
          sheetTab: 'Insemination_AI',
          row: [aiDate, animal, species, bull, status, rec.author, note, rec.id]
        });

        document.getElementById('input-ai-bull').value = '';
        document.getElementById('input-ai-note').value = '';
        playTone(880, 0.1);
        showToast('Insemination saved!', '🧬');
        renderBuffaloView();
      });

      document.getElementById('ai-log-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.del-ai-btn');
        if (!btn) return;
        const id = btn.dataset.delai;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.aiLogs = state.aiLogs.filter(a => a.id !== id);
            safeSet(AI_KEY, JSON.stringify(state.aiLogs));
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

      // Health Sub-tabs & Listeners (Medicines & Doctor)
      document.getElementById('nav-health').addEventListener('click', () => switchTab('health'));

      document.getElementById('subtab-meds').addEventListener('click', () => {
        state.healthSubTab = 'meds';
        document.getElementById('panel-meds').classList.remove('hidden');
        document.getElementById('panel-doc').classList.add('hidden');
        document.getElementById('subtab-meds').className = 'tap-btn py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-rose-700 shadow-sm';
        document.getElementById('subtab-doc').className = 'tap-btn py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-slate-600';
      });

      document.getElementById('subtab-doc').addEventListener('click', () => {
        state.healthSubTab = 'doc';
        document.getElementById('panel-doc').classList.remove('hidden');
        document.getElementById('panel-meds').classList.add('hidden');
        document.getElementById('subtab-doc').className = 'tap-btn py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-indigo-700 shadow-sm';
        document.getElementById('subtab-meds').className = 'tap-btn py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-slate-600';
      });

      document.getElementById('med-quick-pills').addEventListener('click', (e) => {
        const pill = e.target.closest('.med-pill');
        if (!pill) return;
        state.selectedMedPreset = pill.dataset.med;
        document.getElementById('input-med-name').value = pill.dataset.med;
        document.querySelectorAll('.med-pill').forEach(p => {
          p.className = p === pill
            ? 'med-pill tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold border bg-slate-900 text-white border-slate-900'
            : 'med-pill tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-700 border-slate-200';
        });
      });

      document.querySelectorAll('.med-cost-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const inp = document.getElementById('input-med-cost');
          inp.value = (parseInt(inp.value, 10) || 0) + parseInt(btn.dataset.medadd, 10);
        });
      });

      document.getElementById('btn-save-med').addEventListener('click', () => {
        const name = document.getElementById('input-med-name').value.trim() || state.selectedMedPreset;
        const cost = parseInt(document.getElementById('input-med-cost').value, 10) || 0;
        const buffalo = document.getElementById('select-med-buffalo').value || 'All Herd';
        if (cost <= 0) {
          showToast('Enter medicine cost (₹)', '⚠️');
          return;
        }
        confirmSavePrompt('Confirm Medicine', formatINR(cost), `${name} • ${buffalo}`, () => {
        const med = { id: 'med_' + Date.now(), buffalo, name, cost, author: state.currentAuthor || 'Worker', ts: Date.now() };
        state.medLogs.push(med);
        safeSet(MED_KEY, JSON.stringify(state.medLogs));

        // Also record as an expense entry & sync to Google Sheet
        const expEntry = { id: 'e_' + Date.now(), type: 'expense', catId: 'medicines', amount: cost, author: state.currentAuthor || 'Worker', note: `${name} (${buffalo})`, ts: Date.now(), synced: false };
        state.entries.push(expEntry);
        saveEntries(state.entries);
        syncEntryToSheet(expEntry);

        document.getElementById('input-med-cost').value = '';
        document.getElementById('input-med-name').value = '';
        playTone(880, 0.1);
        showToast('Medicine saved!', '💊');
        renderTodaySummary();
        renderHealthView();
        });
      });

      document.getElementById('doc-quick-pills').addEventListener('click', (e) => {
        const pill = e.target.closest('.doc-pill');
        if (!pill) return;
        state.selectedDocReason = pill.dataset.reason;
        document.querySelectorAll('.doc-pill').forEach(p => {
          p.className = p === pill
            ? 'doc-pill tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold border bg-slate-900 text-white border-slate-900'
            : 'doc-pill tap-btn px-2.5 py-1.5 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-700 border-slate-200';
        });
      });

      document.querySelectorAll('.doc-cost-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const inp = document.getElementById('input-doc-cost');
          inp.value = (parseInt(inp.value, 10) || 0) + parseInt(btn.dataset.docadd, 10);
        });
      });

      document.getElementById('btn-save-doc').addEventListener('click', () => {
        const doctor = document.getElementById('input-doc-name').value.trim() || 'Vet Doctor';
        const cost = parseInt(document.getElementById('input-doc-cost').value, 10) || 0;
        const buffalo = document.getElementById('select-doc-buffalo').value || 'All Herd';
        if (cost <= 0) {
          showToast('Enter doctor fee (₹)', '⚠️');
          return;
        }
        confirmSavePrompt('Confirm Doctor Visit', formatINR(cost), `${doctor} (${state.selectedDocReason}) • ${buffalo}`, () => {
        const doc = { id: 'doc_' + Date.now(), buffalo, doctor, reason: state.selectedDocReason, cost, author: state.currentAuthor || 'Worker', ts: Date.now() };
        state.docLogs.push(doc);
        safeSet(DOC_KEY, JSON.stringify(state.docLogs));

        // Also record as an expense entry & sync to Google Sheet
        const expEntry = { id: 'e_' + Date.now(), type: 'expense', catId: 'doctor', amount: cost, author: state.currentAuthor || 'Worker', note: `${doctor}: ${state.selectedDocReason} (${buffalo})`, ts: Date.now(), synced: false };
        state.entries.push(expEntry);
        saveEntries(state.entries);
        syncEntryToSheet(expEntry);

        document.getElementById('input-doc-cost').value = '';
        document.getElementById('input-doc-name').value = '';
        playTone(880, 0.1);
        showToast('Doctor visit saved!', '🩺');
        renderTodaySummary();
        renderHealthView();
        });
      });

      document.getElementById('med-log-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.del-med-btn');
        if (!btn) return;
        const id = btn.dataset.delmed;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.medLogs = state.medLogs.filter(m => m.id !== id);
            safeSet(MED_KEY, JSON.stringify(state.medLogs));
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

      document.getElementById('doc-log-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.del-doc-btn');
        if (!btn) return;
        const id = btn.dataset.deldoc;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.docLogs = state.docLogs.filter(d => d.id !== id);
            safeSet(DOC_KEY, JSON.stringify(state.docLogs));
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

            document.getElementById('dnav-add').addEventListener('click', () => switchTab('add'));
      document.getElementById('dnav-buffalo').addEventListener('click', () => switchTab('buffalo'));
      document.getElementById('dnav-health').addEventListener('click', () => switchTab('health'));
      document.getElementById('dnav-history').addEventListener('click', () => requireOwnerPin(() => switchTab('history')));
      document.getElementById('nav-add').addEventListener('click', () => switchTab('add'));
      document.getElementById('nav-buffalo').addEventListener('click', () => switchTab('buffalo'));
      document.getElementById('nav-history').addEventListener('click', () => requireOwnerPin(() => switchTab('history')));

            document.getElementById('bd-type-exp').addEventListener('click', () => {
        state.breakdownType = 'expense';
        document.getElementById('bd-type-exp').className = 'tap-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-600 shadow-xs';
        document.getElementById('bd-type-inc').className = 'tap-btn px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600';
        renderHistory();
      });

      document.getElementById('bd-type-inc').addEventListener('click', () => {
        state.breakdownType = 'income';
        document.getElementById('bd-type-inc').className = 'tap-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-emerald-700 shadow-xs';
        document.getElementById('bd-type-exp').className = 'tap-btn px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600';
        renderHistory();
      });

      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.filter = btn.dataset.filter;
          document.querySelectorAll('.filter-btn').forEach(b => {
            b.className = b === btn
              ? 'filter-btn tap-btn flex flex-none items-center justify-center text-center min-w-[5rem] px-3 py-1.5 rounded-lg font-bold text-[15px] bg-white text-slate-900 shadow-xs whitespace-nowrap'
              : 'filter-btn tap-btn flex flex-none items-center justify-center text-center min-w-[5rem] px-3 py-1.5 rounded-lg font-bold text-[15px] text-slate-600 whitespace-nowrap';
          });
          renderHistory();
        });
      });

      // PIN-Protected Delete Entry & Clear All
      document.getElementById('entries-list').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.del-btn');
        if (!delBtn) return;
        const targetId = delBtn.dataset.del;
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.entries = state.entries.filter(x => x.id !== targetId);
            saveEntries(state.entries);
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delOneDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

      document.getElementById('water-shift-box').addEventListener('click', (e) => {
        const tab = e.target.closest('.water-shift-tab');
        if (!tab) return;
        const box = document.getElementById('water-shift-box');
        const chosen = tab.dataset.watershift;
        box.dataset.shift = chosen;
        box.className = chosen === 'morning'
          ? 'bg-amber-50/70 border border-amber-200/80 p-2 rounded-xl space-y-2 transition-colors'
          : 'bg-slate-200/80 border border-slate-300 p-2 rounded-xl space-y-2 transition-colors';
        box.querySelectorAll('.water-shift-tab').forEach(t => {
          const selected = t === tab;
          t.setAttribute('aria-pressed', String(selected));
          t.className = `water-shift-tab tap-btn flex items-center justify-center text-center py-2 rounded-lg text-xs ${
            selected
              ? chosen === 'morning'
                ? 'font-extrabold bg-amber-400 text-slate-900 shadow-xs'
                : 'font-extrabold bg-slate-800 text-white shadow-xs'
              : 'font-bold text-slate-600'
          }`;
        });
        playTone(540, 0.04);
      });

      document.getElementById('btn-save-water').addEventListener('click', () => {
        const liters = parseFloat(document.getElementById('input-water-liters').value) || 0;
        if (liters <= 0) { showToast('Enter adjusted water liters!', '⚠️'); return; }
        const shift = document.getElementById('water-shift-box').dataset.shift || 'morning';
        confirmSavePrompt('Confirm Adjusted / Water', `+${liters} L`, `${shift === 'morning' ? '☀️ Morning' : '🌙 Evening'}`, () => {
        state.waterLogs.push({
          id: 'w_' + Date.now(),
          shift,
          liters,
          author: state.currentAuthor || 'Worker',
          ts: Date.now()
        });
        safeSet(WATER_KEY, JSON.stringify(state.waterLogs));
        document.getElementById('input-water-liters').value = '';
        playTone(760, 0.08);
        showToast(`Logged +${liters} L Adjusted/Water`, '💧');
        renderAll();
        });
      });

      document.getElementById('btn-save-milk-rate').addEventListener('click', () => {
        const newRate = parseFloat(document.getElementById('input-admin-milk-rate').value);
        if (!newRate || newRate <= 0) { showToast('Enter valid ₹/L rate', '⚠️'); return; }
        state.milkRate = newRate;
        safeSet(MILK_RATE_KEY, String(newRate));
        state.entries.forEach(e => {
          if (e.type === 'income' && e.catId === 'milk' && e.liters > 0) {
            e.amount = Math.round(e.liters * newRate);
          }
        });
        saveEntries(state.entries);
        playTone(720, 0.08);
        showToast(`Milk rate set to ₹${newRate}/L`, '🥛');
        renderAll();
      });

      document.getElementById('btn-clear-all').addEventListener('click', () => {
        requireOwnerPin(() => {
          state.pendingDeleteAction = () => {
            state.entries = [];
            state.milkLogs = [];
            state.waterLogs = [];
            state.aiLogs = [];
            state.medLogs = [];
            state.docLogs = [];
            saveEntries(state.entries);
            safeSet(MILK_KEY, JSON.stringify(state.milkLogs));
            safeSet(AI_KEY, JSON.stringify(state.aiLogs));
            safeSet(MED_KEY, JSON.stringify(state.medLogs));
            safeSet(DOC_KEY, JSON.stringify(state.docLogs));
            showToast('Cleared all data!', '🗑️');
          };
          const t = TEXT[state.lang];
          document.getElementById('modal-title').textContent = t.delTitle;
          document.getElementById('modal-desc').textContent = t.delAllDesc;
          document.getElementById('confirm-modal').classList.remove('hidden');
        });
      });

      let pendingSaveConfirm = null;
      function confirmSavePrompt(title, valueHighlight, desc, onConfirm) {
        pendingSaveConfirm = onConfirm;
        document.getElementById('save-modal-title').textContent = title;
        document.getElementById('save-modal-value').textContent = valueHighlight;
        document.getElementById('save-modal-desc').textContent = desc;
        document.getElementById('save-confirm-modal').classList.remove('hidden');
      }
      document.getElementById('save-modal-cancel').addEventListener('click', () => {
        pendingSaveConfirm = null;
        document.getElementById('save-confirm-modal').classList.add('hidden');
      });
      document.getElementById('save-modal-ok').addEventListener('click', () => {
        const fn = pendingSaveConfirm;
        pendingSaveConfirm = null;
        document.getElementById('save-confirm-modal').classList.add('hidden');
        if (fn) fn();
      });

      document.getElementById('modal-cancel').addEventListener('click', () => {
        state.pendingDeleteAction = null;
        document.getElementById('confirm-modal').classList.add('hidden');
      });

      document.getElementById('modal-confirm').addEventListener('click', () => {
        if (state.pendingDeleteAction) {
          state.pendingDeleteAction();
          state.pendingDeleteAction = null;
        }
        document.getElementById('confirm-modal').classList.add('hidden');
        playTone(400, 0.08);
        renderAll();
      });

      // Owner PIN management and Google Sheets sync settings
      function openSyncModal() {
        const webhookInput = document.getElementById('input-webhook-url');
        webhookInput.value = state.webhookUrl || '';
        webhookInput.disabled = Boolean(state.webhookUrl);
        document.getElementById('input-current-pin').value = '';
        document.getElementById('input-new-pin').value = '';
        document.getElementById('sync-modal').classList.remove('hidden');
      }

      const syncSetupButton = document.getElementById('btn-sync-setup');
      if (syncSetupButton) syncSetupButton.addEventListener('click', openSyncModal);
      document.getElementById('btn-open-sync-modal').addEventListener('click', openSyncModal);
      document.getElementById('btn-header-settings').addEventListener('click', openSyncModal);
      document.getElementById('sync-modal-close').addEventListener('click', () => {
        document.getElementById('sync-modal').classList.add('hidden');
        document.getElementById('input-current-pin').value = '';
        document.getElementById('input-new-pin').value = '';
      });

      async function fetchSheetTabs(url) {
        let response;
        try {
          response = await fetch(url);
        } catch (err) {
          throw new Error('Could not reach Apps Script. Check the /exec URL, network, and deployment access. ' + (err.message || ''));
        }
        if (!response.ok) throw new Error('Apps Script returned HTTP ' + response.status);
        let tabs;
        try {
          tabs = await response.json();
        } catch (err) {
          throw new Error('Apps Script did not return JSON. Redeploy it as a Web App and allow access to the app users.');
        }
        if (tabs && typeof tabs.error === 'string') {
          throw new Error('Apps Script doGet failed: ' + tabs.error);
        }
        const requiredTabs = ['Entries', 'Milk_Logs', 'Herd_Tree', 'Insemination_AI'];
        if (!tabs || requiredTabs.some(name => !Array.isArray(tabs[name]))) {
          throw new Error('Apps Script JSON is missing required tabs. Check SHEET_HEADERS and redeploy the latest script.');
        }
        return tabs;
      }

      async function syncWithSheet(url) {
        const tabsMap = await fetchSheetTabs(url);
        const counts = applyParsedTabs(tabsMap);
        const uploads = await syncLocalRecordsMissingFromSheet(tabsMap);
        renderSyncStatus();
        return { counts, uploads };
      }

      async function pullSheetOnStartup() {
        const url = state.webhookUrl.trim();
        if (!url.startsWith('https://script.google.com/')) return;
        try {
          const tabsMap = await fetchSheetTabs(url);
          applyParsedTabs(tabsMap, true);
          renderSyncStatus();
        } catch (err) {
          showToast('Could not load Google Sheet on startup: ' + (err.message || 'unknown error'), '⚠️');
        }
      }

      document.getElementById('btn-save-pin').addEventListener('click', async () => {
        const currentPin = document.getElementById('input-current-pin').value.trim();
        const newPin = document.getElementById('input-new-pin').value.trim();
        if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
          showToast('Enter the current PIN and a new 4-digit PIN', '⚠️');
          return;
        }
        try {
          const result = await callAdminPinAction({ action: 'changePin', currentPin, newPin });
          if (!result.updated) {
            const message = {
              locked: 'PIN temporarily locked. Try later.',
              not_initialized: 'Admin PIN is not configured in Apps Script.',
              invalid_new_pin: 'New PIN must be 4 digits.'
            }[result.error] || 'Current PIN is incorrect';
            showToast(message, '⚠️');
            return;
          }
          document.getElementById('input-current-pin').value = '';
          document.getElementById('input-new-pin').value = '';
          showToast('Owner PIN updated securely!', '🔐');
        } catch (err) {
          showToast(err.message || 'PIN update failed', '⚠️');
        }
      });

      document.getElementById('btn-save-webhook').addEventListener('click', async () => {
        const url = document.getElementById('input-webhook-url').value.trim();
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch (err) {
          showToast('Enter a valid Apps Script Web App URL', '⚠️');
          return;
        }
        if (parsedUrl.origin !== 'https://script.google.com' || !/^\/(?:a\/[^/]+\/)?macros\/s\/[^/]+\/exec$/.test(parsedUrl.pathname)) {
          showToast('Use the deployed Apps Script URL ending in /exec', '⚠️');
          return;
        }
        let tabsMap;
        try {
          tabsMap = await fetchSheetTabs(parsedUrl.href);
        } catch (err) {
          showToast('Apps Script check failed: ' + (err.message || 'unknown error'), '⚠️');
          return;
        }
        state.webhookUrl = url;
        safeSet(WEBHOOK_KEY, url);
        document.getElementById('input-webhook-url').disabled = true;
        document.getElementById('sync-modal').classList.add('hidden');
        renderSyncStatus();
        applyParsedTabs(tabsMap);
        const uploads = await syncLocalRecordsMissingFromSheet(tabsMap);
        showToast(`Sync complete: ${uploads.sent} uploaded, ${uploads.failed} failed`, uploads.failed ? '⚠️' : '☁️');
        renderSyncStatus();
      });

      document.getElementById('btn-clear-webhook').addEventListener('click', () => {
        if (!state.webhookUrl) {
          showToast('No Google Sheet is connected', '⚠️');
          return;
        }

        state.pinBuffer = '';
        renderPinDots();
        document.getElementById('pin-subtitle').textContent = 'Enter Owner PIN to confirm disconnect';
        state.pendingProtectedAction = () => {
          state.webhookUrl = '';
          safeSet(WEBHOOK_KEY, '');
          document.getElementById('input-webhook-url').value = '';
          document.getElementById('input-webhook-url').disabled = false;
          document.getElementById('sync-modal').classList.add('hidden');
          document.getElementById('pin-subtitle').textContent = 'Enter 4-digit PIN';
          renderSyncStatus();
          showToast('Disconnected from Google Sheet', '⚪');
        };
        document.getElementById('pin-modal').classList.remove('hidden');
        showToast('Enter Owner PIN to confirm disconnect', '🔐');
      });

      document.getElementById('btn-sync-pending').addEventListener('click', async () => {
        try {
          showToast('Syncing app and sheet...', '☁️');
          const result = await syncWithSheet(state.webhookUrl);
          showToast(`Sync complete: ${result.uploads.sent} uploaded, ${result.uploads.failed} failed`, result.uploads.failed ? '⚠️' : '☁️');
        } catch (err) {
          showToast('Sync failed: ' + (err.message || 'unknown error'), '⚠️');
        }
      });

      document.getElementById('btn-copy-sheet-url').addEventListener('click', () => {
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/1epmosQ4A23q-YlC5vrl3jBGZVsNo1gTN5LYwKPvktwg/edit';
        copyText(sheetUrl);
        showToast('Sheet link copied! Open in a new tab', '📋');
      });

      document.getElementById('btn-copy-script').addEventListener('click', () => {
        const code = document.getElementById('apps-script-code').textContent;
        copyText(code);
        showToast(TEXT[state.lang].copiedScript, '📋');
      });

      document.getElementById('btn-whatsapp').addEventListener('click', () => {
        const list = getFilteredEntries();
        let exp = 0, inc = 0;
        const lines = list.map(e => {
          if (e.type === 'expense') exp += e.amount; else inc += e.amount;
          const cat = findCat(e.type, e.catId);
          return `${cat.icon} ${state.lang === 'te' ? cat.te : cat.en} (${e.author || 'Worker'}): ${e.type === 'expense' ? '-' : '+'}₹${e.amount}`;
        });
        const todayMilk = state.milkLogs.filter(m => isToday(m.ts)).reduce((s, m) => s + Number(m.liters || 0), 0);
        const t = TEXT[state.lang];
        const summary = [
          `🐄 *${t.title} (${state.filter.toUpperCase()})*`,
          `🐃 ${t.reportBuffaloes}: ${state.buffaloes.length} | ${t.reportTodayMilk}: ${todayMilk} L`,
          `🟢 ${t.reportIncome}: ₹${inc}`,
          `🔴 ${t.reportExpense}: ₹${exp}`,
          `💰 ${t.reportNet}: ₹${inc - exp}`,
          '---',
          ...lines
        ].join('\n');

        copyText(summary);
        showToast(TEXT[state.lang].copiedWa, '📲');
      });

      function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
          fallbackCopy(text);
        }
      }

      function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
      }

            // Import / Upload Sheet (.xlsx or .csv)
      function parseDateToTs(dateVal, timeVal) {
        if (!dateVal) return Date.now();
        let date;
        if (typeof dateVal === 'number') {
          date = new Date((dateVal - 25569) * 86400 * 1000);
        } else {
          const dateText = String(dateVal).trim();
          const localDate = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          date = localDate
            ? new Date(Number(localDate[3]), Number(localDate[2]) - 1, Number(localDate[1]))
            : new Date(dateText);
        }
        if (isNaN(date.getTime())) return Date.now();
        if (timeVal !== undefined && timeVal !== null && timeVal !== '') {
          const time = String(timeVal).match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)?/i);
          if (time) {
            let hours = Number(time[1]) % 12;
            if (time[3] && time[3].toUpperCase() === 'PM') hours += 12;
            date.setHours(hours, Number(time[2]), 0, 0);
          }
        }
        return date.getTime();
      }

      function mapCategoryId(type, catStr) {
        const low = String(catStr || '').toLowerCase();
        const list = CATEGORIES[type] || [];
        const match = list.find(c => low.includes(c.en.toLowerCase()) || low.includes(c.id));
        if (match) return match.id;
        if (type === 'expense') {
          if (low.includes('feed') || low.includes('fodder')) return 'feed';
          if (low.includes('med')) return 'medicines';
          if (low.includes('doc') || low.includes('vet')) return 'doctor';
          if (low.includes('lab')) return 'labour';
          if (low.includes('pow') || low.includes('elec') || low.includes('dies')) return 'power';
          if (low.includes('rep') || low.includes('equip')) return 'repair';
          return 'other_exp';
        }
        if (low.includes('milk')) return 'milk';
        if (low.includes('vermi') || low.includes('compost')) return 'vermicompost';
        if (low.includes('ghee') || low.includes('curd') || low.includes('prod')) return 'dairy_prod';
        return 'other_inc';
      }

      function recordDateTimeKey(ts) {
        const date = new Date(ts);
        return [
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        ].join(':');
      }

      function mergeImportedRecords(currentRecords, importedRecords, getContentKey) {
        const merged = currentRecords.slice();
        const indexById = new Map();
        const usedIndexes = new Set();
        merged.forEach((record, index) => {
          if (record.id) indexById.set(String(record.id), index);
        });

        importedRecords.forEach(record => {
          const recordId = record.id ? String(record.id) : '';
          let index = recordId && indexById.has(recordId) ? indexById.get(recordId) : -1;
          if (index < 0 && getContentKey) {
            const contentKey = getContentKey(record);
            index = merged.findIndex((existing, i) =>
              !usedIndexes.has(i) && getContentKey(existing) === contentKey
            );
          }
          if (index >= 0) {
            merged[index] = { ...merged[index], ...record };
            usedIndexes.add(index);
            if (recordId) indexById.set(recordId, index);
          } else {
            index = merged.push(record) - 1;
            usedIndexes.add(index);
            if (recordId) indexById.set(recordId, index);
          }
        });
        return merged;
      }

      function entryContentKey(entry) {
        return JSON.stringify([
          recordDateTimeKey(entry.ts),
          entry.type,
          entry.catId,
          Number(entry.amount),
          entry.author || 'Worker',
          entry.note || ''
        ]);
      }

      function milkContentKey(log) {
        return JSON.stringify([
          recordDateTimeKey(log.ts),
          log.shift,
          log.buffalo,
          Number(log.liters),
          String(log.fat || ''),
          log.author || 'Worker'
        ]);
      }

      function aiContentKey(record) {
        return JSON.stringify([
          record.aiDate,
          record.animal,
          record.species || 'Buffalo',
          record.bull || '',
          record.status || '',
          record.author || 'Worker',
          record.note || ''
        ]);
      }

      function buffaloContentKey(buffalo) {
        return String(buffalo.name || '').trim().toLowerCase();
      }

      async function syncLocalRecordsMissingFromSheet(tabsMap) {
        const idSet = name => new Set((tabsMap[name] || []).map(row => String(row.ID || '')).filter(Boolean));
        const remoteEntries = idSet('Entries');
        const remoteMilk = idSet('Milk_Logs');
        const remoteHerd = idSet('Herd_Tree');
        const remoteAi = idSet('Insemination_AI');
        let sent = 0;
        let failed = 0;
        const send = async promise => {
          if (await promise) sent++;
          else failed++;
        };

        for (const entry of state.entries) {
          if (!remoteEntries.has(String(entry.id || ''))) await send(syncEntryToSheet(entry));
        }
        for (const log of state.milkLogs) {
          if (remoteMilk.has(String(log.id || ''))) continue;
          const date = new Date(log.ts);
          await send(postToSheet({
            sheetTab: 'Milk_Logs',
            row: [
              date.toLocaleDateString('en-IN'),
              date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              log.author || 'Worker',
              log.shift === 'evening' ? 'evening' : 'morning',
              log.buffalo,
              log.liters,
              String(log.fat || '7.0').replace('%', '') + '%',
              '',
              log.id
            ]
          }));
        }
        for (const buffalo of state.buffaloes) {
          if (remoteHerd.has(String(buffalo.id || ''))) continue;
          const mother = state.buffaloes.find(item => item.id === buffalo.motherId);
          await send(postToSheet({
            sheetTab: 'Herd_Tree',
            row: [
              buffalo.name,
              buffalo.species || 'Buffalo',
              buffalo.breed || '',
              mother ? mother.name : 'Founder',
              buffalo.price || 0,
              new Date(buffalo.addedAt).toLocaleDateString('en-IN'),
              state.currentAuthor || 'Worker',
              '',
              buffalo.id
            ]
          }));
        }
        for (const record of state.aiLogs) {
          if (remoteAi.has(String(record.id || ''))) continue;
          await send(postToSheet({
            sheetTab: 'Insemination_AI',
            row: [
              record.aiDate,
              record.animal,
              record.species || 'Buffalo',
              record.bull || '',
              record.status || '',
              record.author || 'Worker',
              record.note || '',
              record.id
            ]
          }));
        }
        return { sent, failed };
      }

      // Merge records by stable ID and use content matching for pre-ID sheet rows.
      function applyParsedTabs(tabsMap, silent = false) {
        let counts = { entries: 0, milk: 0, herd: 0, ai: 0 };

        if (Array.isArray(tabsMap.Entries)) {
          const importedEntries = [];
          tabsMap.Entries.forEach((r, idx) => {
            const amt = parseFloat(r['Amount (INR)'] || r['Amount_INR'] || r['Amount'] || 0);
            if (!amt || amt <= 0) return;
            const rawType = String(r['Type'] || 'Expense').toLowerCase();
            const type = rawType.includes('inc') ? 'income' : 'expense';
            importedEntries.push({
              id: String(r.ID || ('imp_e_' + Date.now() + '_' + idx)),
              type,
              catId: mapCategoryId(type, r['Category']),
              amount: amt,
              author: String(r['Author'] || 'Imported').trim() || 'Imported',
              note: String(r['Note'] || '').trim(),
              ts: parseDateToTs(r['Date'], r['Time']),
              synced: true
            });
          });
          if (importedEntries.length > 0) {
            state.entries = mergeImportedRecords(state.entries, importedEntries, entryContentKey);
            saveEntries(state.entries);
            counts.entries = importedEntries.length;
          }
        }

        if (Array.isArray(tabsMap.Herd_Tree)) {
          const rawAnimals = tabsMap.Herd_Tree.filter(r => String(r['Animal ID/Name'] || '').trim() !== '');
          if (rawAnimals.length > 0) {
            const built = rawAnimals.map((r, idx) => ({
              id: String(r.ID || ('imp_b_' + idx + '_' + Date.now())),
              name: String(r['Animal ID/Name']).trim(),
              species: String(r['Species'] || 'Buffalo').trim(),
              breed: String(r['Breed'] || 'Murrah').trim(),
              price: parseFloat(r['Price (INR)'] || 0) || 0,
              motherNameRaw: String(r['Mother / Parent'] || '').trim(),
              motherId: '',
              addedAt: parseDateToTs(r['Added Date'])
            }));
            built.forEach(a => {
              if (a.motherNameRaw && a.motherNameRaw.toLowerCase() !== 'founder' && a.motherNameRaw.toLowerCase() !== 'none') {
                const mom = built.find(m => m.name.toLowerCase() === a.motherNameRaw.toLowerCase());
                if (mom) a.motherId = mom.id;
              }
              delete a.motherNameRaw;
            });
            state.buffaloes = mergeImportedRecords(state.buffaloes, built, buffaloContentKey);
            safeSet(BUFFALO_KEY, JSON.stringify(state.buffaloes));
            counts.herd = built.length;
          }
        }

        if (Array.isArray(tabsMap.Milk_Logs)) {
          const importedMilk = [];
          tabsMap.Milk_Logs.forEach((r, idx) => {
            const liters = parseFloat(r['Liters'] || 0);
            if (!liters || liters <= 0) return;
            const shiftRaw = String(r['Shift'] || 'morning').toLowerCase();
            importedMilk.push({
              id: String(r.ID || ('imp_m_' + Date.now() + '_' + idx)),
              shift: shiftRaw.includes('eve') ? 'evening' : 'morning',
              buffalo: String(r['Animal'] || 'All Herd').trim() || 'All Herd',
              liters,
              fat: String(r['Fat %'] || '7.0').replace('%', '').trim() || '7.0',
              author: String(r['Author'] || 'Imported').trim() || 'Imported',
              ts: parseDateToTs(r['Date'], r['Time'])
            });
          });
          if (importedMilk.length > 0) {
            state.milkLogs = mergeImportedRecords(state.milkLogs, importedMilk, milkContentKey);
            safeSet(MILK_KEY, JSON.stringify(state.milkLogs));
            counts.milk = importedMilk.length;
          }
        }

        if (Array.isArray(tabsMap.Insemination_AI)) {
          const importedAi = [];
          tabsMap.Insemination_AI.forEach((r, idx) => {
            const animal = String(r['Animal'] || '').trim();
            const aiDateVal = r['AI Date'];
            if (!animal || !aiDateVal) return;
            let aiDateStr = String(aiDateVal).trim();
            if (typeof aiDateVal === 'number') {
              aiDateStr = new Date((aiDateVal - 25569) * 86400 * 1000).toISOString().slice(0, 10);
            } else if (aiDateStr.includes('T')) {
              aiDateStr = aiDateStr.slice(0, 10);
            }
            importedAi.push({
              id: String(r.ID || ('imp_ai_' + Date.now() + '_' + idx)),
              animal,
              species: String(r['Species'] || 'Buffalo').trim(),
              aiDate: aiDateStr,
              bull: String(r['Bull / Semen ID'] || '').trim(),
              status: String(r['Status'] || 'Waiting Check').trim(),
              note: String(r['Note'] || '').trim(),
              author: String(r['Author'] || 'Imported').trim() || 'Imported',
              ts: parseDateToTs(aiDateStr)
            });
          });
          if (importedAi.length > 0) {
            state.aiLogs = mergeImportedRecords(state.aiLogs, importedAi, aiContentKey);
            safeSet(AI_KEY, JSON.stringify(state.aiLogs));
            counts.ai = importedAi.length;
          }
        }

        renderAll();
        if (!silent) playTone(880, 0.12);
        return counts;
      }

      document.getElementById('btn-pull-sheet').addEventListener('click', async () => {
        if (!state.webhookUrl || !state.webhookUrl.startsWith('https://script.google.com/')) {
          showToast('Connect Google Sheet URL in Setup first!', '⚠️');
          openSyncModal();
          return;
        }
        try {
          showToast('Syncing from Google Sheet...', '⬇️');
          const result = await syncWithSheet(state.webhookUrl);
          const c = result.counts;
          showToast(`Synced ${c.entries} entries, ${c.herd} animals, ${c.milk} milk; uploaded ${result.uploads.sent}`, result.uploads.failed ? '⚠️' : '☁️');
        } catch (err) {
          showToast('Sync failed: ' + (err.message || 'unknown error'), '⚠️');
        }
      });

      document.getElementById('btn-import-sheet').addEventListener('click', () => {
        document.getElementById('input-import-file').click();
      });

      document.getElementById('input-import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            let counts = { entries: 0, milk: 0, herd: 0, ai: 0 };

            // 1. Parse Entries (or first sheet if CSV)
            const entriesSheetName = wb.SheetNames.includes('Entries') ? 'Entries' : wb.SheetNames[0];
            if (entriesSheetName) {
              const rows = XLSX.utils.sheet_to_json(wb.Sheets[entriesSheetName], { defval: '' });
              const importedEntries = [];
              rows.forEach((r, idx) => {
                const amt = parseFloat(r['Amount (INR)'] || r['Amount_INR'] || r['Amount'] || 0);
                if (!amt || amt <= 0) return;
                const rawType = String(r['Type'] || 'Expense').toLowerCase();
                const type = rawType.includes('inc') ? 'income' : 'expense';
                importedEntries.push({
                  id: 'imp_e_' + Date.now() + '_' + idx,
                  type,
                  catId: mapCategoryId(type, r['Category']),
                  amount: amt,
                  author: String(r['Author'] || 'Imported').trim() || 'Imported',
                  note: String(r['Note'] || '').trim(),
                  ts: parseDateToTs(r['Date'], r['Time']),
                  synced: true
                });
              });
              if (importedEntries.length > 0) {
                state.entries = importedEntries;
                saveEntries(state.entries);
                counts.entries = importedEntries.length;
              }
            }

            // 2. Parse Herd_Tree
            if (wb.SheetNames.includes('Herd_Tree')) {
              const rows = XLSX.utils.sheet_to_json(wb.Sheets['Herd_Tree'], { defval: '' });
              const rawAnimals = rows.filter(r => String(r['Animal ID/Name'] || '').trim() !== '');
              if (rawAnimals.length > 0) {
                const built = rawAnimals.map((r, idx) => ({
                  id: 'imp_b_' + idx + '_' + Date.now(),
                  name: String(r['Animal ID/Name']).trim(),
                  species: String(r['Species'] || 'Buffalo').trim(),
                  breed: String(r['Breed'] || 'Murrah').trim(),
                  price: parseFloat(r['Price (INR)'] || 0) || 0,
                  motherNameRaw: String(r['Mother / Parent'] || '').trim(),
                  motherId: '',
                  addedAt: parseDateToTs(r['Added Date'])
                }));
                built.forEach(a => {
                  if (a.motherNameRaw && a.motherNameRaw.toLowerCase() !== 'founder' && a.motherNameRaw.toLowerCase() !== 'none') {
                    const mom = built.find(m => m.name.toLowerCase() === a.motherNameRaw.toLowerCase());
                    if (mom) a.motherId = mom.id;
                  }
                  delete a.motherNameRaw;
                });
                state.buffaloes = built;
                safeSet(BUFFALO_KEY, JSON.stringify(state.buffaloes));
                counts.herd = built.length;
              }
            }

            // 3. Parse Milk_Logs
            if (wb.SheetNames.includes('Milk_Logs')) {
              const rows = XLSX.utils.sheet_to_json(wb.Sheets['Milk_Logs'], { defval: '' });
              const importedMilk = [];
              rows.forEach((r, idx) => {
                const liters = parseFloat(r['Liters'] || 0);
                if (!liters || liters <= 0) return;
                const shiftRaw = String(r['Shift'] || 'morning').toLowerCase();
                importedMilk.push({
                  id: 'imp_m_' + Date.now() + '_' + idx,
                  shift: shiftRaw.includes('eve') ? 'evening' : 'morning',
                  buffalo: String(r['Animal'] || 'All Herd').trim() || 'All Herd',
                  liters,
                  fat: String(r['Fat %'] || '7.0').replace('%', '').trim() || '7.0',
                  author: String(r['Author'] || 'Imported').trim() || 'Imported',
                  ts: parseDateToTs(r['Date'], r['Time'])
                });
              });
              if (importedMilk.length > 0) {
                state.milkLogs = importedMilk;
                safeSet(MILK_KEY, JSON.stringify(state.milkLogs));
                counts.milk = importedMilk.length;
              }
            }

            // 4. Parse Insemination_AI
            if (wb.SheetNames.includes('Insemination_AI')) {
              const rows = XLSX.utils.sheet_to_json(wb.Sheets['Insemination_AI'], { defval: '' });
              const importedAi = [];
              rows.forEach((r, idx) => {
                const animal = String(r['Animal'] || '').trim();
                const aiDateVal = r['AI Date'];
                if (!animal || !aiDateVal) return;
                let aiDateStr = String(aiDateVal).trim();
                if (typeof aiDateVal === 'number') {
                  aiDateStr = new Date((aiDateVal - 25569) * 86400 * 1000).toISOString().slice(0, 10);
                }
                importedAi.push({
                  id: 'imp_ai_' + Date.now() + '_' + idx,
                  animal,
                  species: String(r['Species'] || 'Buffalo').trim(),
                  aiDate: aiDateStr,
                  bull: String(r['Bull / Semen ID'] || '').trim(),
                  status: String(r['Status'] || 'Waiting Check').trim(),
                  note: String(r['Note'] || '').trim(),
                  author: String(r['Author'] || 'Imported').trim() || 'Imported',
                  ts: parseDateToTs(aiDateStr)
                });
              });
              if (importedAi.length > 0) {
                state.aiLogs = importedAi;
                safeSet(AI_KEY, JSON.stringify(state.aiLogs));
                counts.ai = importedAi.length;
              }
            }

            renderAll();
            playTone(880, 0.12);
            showToast(`Loaded: ${counts.entries} entries, ${counts.herd} animals, ${counts.milk} milk`, '📤');
          } catch (err) {
            showToast('Could not read file. Use .xlsx or .csv', '⚠️');
          }
          e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
      });

      document.getElementById('btn-csv').addEventListener('click', () => {
        try {
          if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const entriesRows = state.entries.map(e => {
              const d = new Date(e.ts);
              const cat = findCat(e.type, e.catId);
              return {
                Date: d.toLocaleDateString('en-IN'),
                Time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                Author: e.author || 'Worker',
                Type: e.type === 'expense' ? 'Expense' : 'Income',
                Category: cat.en,
                'Amount (INR)': e.amount,
                Note: e.note || ''
              };
            });
            const milkRows = state.milkLogs.map(m => {
              const d = new Date(m.ts);
              return {
                Date: d.toLocaleDateString('en-IN'),
                Time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                Author: m.author || 'Worker',
                Shift: m.shift === 'morning' ? 'Morning' : 'Evening',
                Animal: m.buffalo,
                Liters: m.liters,
                'Fat %': m.fat + '%',
                Note: ''
              };
            });
            const herdRows = state.buffaloes.map(b => {
              const mom = state.buffaloes.find(x => x.id === b.motherId);
              return {
                'Animal ID/Name': b.name,
                Species: b.species || 'Buffalo',
                Breed: b.breed,
                'Mother / Parent': mom ? mom.name : 'Founder',
                'Price (INR)': b.price || 0,
                'Added Date': new Date(b.addedAt).toLocaleDateString('en-IN')
              };
            });
            const aiRows = state.aiLogs.map(a => ({
              'AI Date': a.aiDate,
              Animal: a.animal,
              Species: a.species || 'Buffalo',
              'Bull / Semen ID': a.bull || '',
              Status: a.status,
              Author: a.author || 'Worker',
              Note: a.note || ''
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entriesRows.length ? entriesRows : [{ Date: '', Time: '', Author: '', Type: '', Category: '', 'Amount (INR)': '', Note: '' }]), 'Entries');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(milkRows.length ? milkRows : [{ Date: '', Time: '', Author: '', Shift: '', Animal: '', Liters: '', 'Fat %': '', Note: '' }]), 'Milk_Logs');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(herdRows.length ? herdRows : [{ 'Animal ID/Name': '', Species: '', Breed: '', 'Mother / Parent': '', 'Price (INR)': '', 'Added Date': '' }]), 'Herd_Tree');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aiRows.length ? aiRows : [{ 'AI Date': '', Animal: '', Species: '', 'Bull / Semen ID': '', Status: '', Author: '', Note: '' }]), 'Insemination_AI');
            XLSX.writeFile(wb, `Dairy_Khata_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast('Excel (.xlsx) downloaded!', '📥');
            return;
          }
        } catch (err) { /* fallback below */ }

        const list = getFilteredEntries();
        const header = 'Date,Time,Author,Type,Category,Amount_INR,Note\n';
        const rows = list.map(e => {
          const d = new Date(e.ts);
          const cat = findCat(e.type, e.catId);
          return `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${(e.author || 'Worker').replace(/"/g, '""')}","${e.type}","${cat.en}",${e.amount},"${(e.note || '').replace(/"/g, '""')}"`;
        }).join('\n');
        copyText(header + rows);
        showToast('CSV copied to clipboard (download blocked in preview)', '📋');
      });

      let activeReminderAiId = null;
      let selectedRemAvail = 'Today Evening';

      function getCurrentShiftKey() {
        const now = new Date();
        const ymd = now.toISOString().slice(0, 10);
        const shift = now.getHours() < 14 ? 'morning' : 'evening';
        return { key: `${ymd}_${shift}`, shift };
      }

      function checkDueTestReminder() {
        const { key: shiftKey, shift } = getCurrentShiftKey();
        const dueAi = state.aiLogs.find(a => {
          if (a.status !== 'Waiting Check' || a.checkDone) return false;
          const aiDt = new Date(a.aiDate + 'T00:00:00');
          if (isNaN(aiDt.getTime())) return false;
          const checkDt = new Date(aiDt.getTime() + 60 * 86400000);
          const daysLeft = Math.ceil((checkDt.getTime() - Date.now()) / 86400000);
          if (daysLeft > 7) return false;
          return state.reminderSnooze[a.id] !== shiftKey;
        });
        if (!dueAi) return;
        activeReminderAiId = dueAi.id;
        const aiDt = new Date(dueAi.aiDate + 'T00:00:00');
        const checkStr = new Date(aiDt.getTime() + 60 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        document.getElementById('rem-shift-badge').textContent = shift === 'morning' ? '☀️ Morning Reminder' : '🌙 Evening Reminder';
        document.getElementById('rem-details-box').innerHTML = `
          <div>🐃 Animal: <span class="text-emerald-700">${escapeHtml(dueAi.animal)}</span></div>
          <div>🩺 Pregnancy Test Date: <span class="text-rose-600">${checkStr}</span></div>
          ${dueAi.docAvailability ? `<div>📞 Last Doc Status: <span class="text-amber-700">${escapeHtml(dueAi.docAvailability)}</span></div>` : ''}
        `;
        document.getElementById('rem-doc-avail-box').classList.add('hidden');
        document.getElementById('input-rem-avail-custom').value = '';
        document.getElementById('reminder-modal').classList.remove('hidden');
      }

      document.getElementById('btn-rem-okay').addEventListener('click', () => {
        const target = state.aiLogs.find(a => a.id === activeReminderAiId);
        if (target) {
          target.checkDone = true;
          safeSet(AI_KEY, JSON.stringify(state.aiLogs));
        }
        document.getElementById('reminder-modal').classList.add('hidden');
        playTone(880, 0.1);
        showToast('Checkup marked Done!', '✅');
        renderAll();
      });

      document.getElementById('btn-rem-contacted-toggle').addEventListener('click', () => {
        document.getElementById('rem-doc-avail-box').classList.toggle('hidden');
      });

      document.getElementById('rem-avail-pills').addEventListener('click', (e) => {
        const pill = e.target.closest('.rem-avail-pill');
        if (!pill) return;
        selectedRemAvail = pill.dataset.avail;
        document.getElementById('input-rem-avail-custom').value = selectedRemAvail;
        document.querySelectorAll('.rem-avail-pill').forEach(p => {
          p.className = p === pill
            ? 'rem-avail-pill tap-btn py-2 px-2 rounded-xl bg-amber-500 text-slate-900 border border-amber-600 text-[11px] font-extrabold'
            : 'rem-avail-pill tap-btn py-2 px-2 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-slate-800';
        });
      });

      document.getElementById('btn-rem-save-snooze').addEventListener('click', () => {
        const avail = document.getElementById('input-rem-avail-custom').value.trim() || selectedRemAvail;
        const target = state.aiLogs.find(a => a.id === activeReminderAiId);
        if (target) {
          target.docAvailability = avail;
          safeSet(AI_KEY, JSON.stringify(state.aiLogs));
        }
        const { key: shiftKey } = getCurrentShiftKey();
        if (activeReminderAiId) {
          state.reminderSnooze[activeReminderAiId] = shiftKey;
          safeSet(REMINDER_KEY, JSON.stringify(state.reminderSnooze));
        }
        document.getElementById('reminder-modal').classList.add('hidden');
        playTone(640, 0.08);
        showToast(`Saved: ${avail}. Will remind next shift!`, '📞');
        renderAll();
      });

      document.getElementById('bdetail-close').addEventListener('click', () => {
        document.getElementById('buffalo-detail-modal').classList.add('hidden');
      });

      document.getElementById('admin-buffalo-status-list').addEventListener('click', (e) => {
        const link = e.target.closest('.btn-buf-detail-link');
        if (!link) return;
        const bName = link.dataset.bdetail;
        const buf = state.buffaloes.find(b => b.name === bName);
        if (!buf) return;
        const periodLabel = document.getElementById('val-admin-status-period')?.textContent || 'Filtered';
        document.getElementById('bdetail-title').textContent = `${buf.species === 'Cow' ? '🐄' : '🐃'} ${buf.name}`;
        document.getElementById('bdetail-subtitle').textContent = `${buf.breed} • ${buf.milking !== false ? '🥛 Milking' : '⏸️ Dry'} • Period: ${periodLabel}`;

        const mLogs = state.milkLogs.filter(m => m.buffalo === bName && isInFilter(m.ts)).sort((a, b) => b.ts - a.ts);
        const list = getFilteredEntries();
        const eMeds = list.filter(x => x.type === 'expense' && x.catId === 'medicines' && x.buffalo === bName);
        const eDocs = list.filter(x => x.type === 'expense' && x.catId === 'doctor' && x.buffalo === bName);
        const mMeds = state.medLogs.filter(m => m.buffalo === bName && isInFilter(m.ts));
        const dDocs = state.docLogs.filter(d => d.buffalo === bName && isInFilter(d.ts));
        const aiList = state.aiLogs.filter(a => a.animal === bName).sort((a, b) => b.ts - a.ts);

        const milkHtml = mLogs.length
          ? mLogs.map(m => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${new Date(m.ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} (${m.shift === 'morning' ? '☀️ Morn' : '🌙 Eve'})</span><span class="font-extrabold text-blue-700">${m.liters} L</span></div>`).join('')
          : '<div class="text-slate-400 italic">No milk logs in this period</div>';

        const medHtml = (mMeds.length + eMeds.length) > 0
          ? [...mMeds.map(m => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${escapeHtml(m.name)} (${new Date(m.ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })})</span><span class="font-extrabold text-rose-600">${formatINR(m.cost)}</span></div>`),
             ...eMeds.map(x => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${escapeHtml(x.note || 'Medicine')} (${new Date(x.ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })})</span><span class="font-extrabold text-rose-600">${formatINR(x.amount)}</span></div>`)].join('')
          : '<div class="text-slate-400 italic">No individual medicine logs in this period</div>';

        const docHtml = (dDocs.length + eDocs.length) > 0
          ? [...dDocs.map(d => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${escapeHtml(d.doctor)} • ${escapeHtml(d.reason)}</span><span class="font-extrabold text-indigo-600">${formatINR(d.cost)}</span></div>`),
             ...eDocs.map(x => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${escapeHtml(x.note || 'Vet Visit')}</span><span class="font-extrabold text-indigo-600">${formatINR(x.amount)}</span></div>`)].join('')
          : '<div class="text-slate-400 italic">No individual vet visits in this period</div>';

        const aiHtml = aiList.length
          ? aiList.map(a => `<div class="py-1 border-b border-slate-100"><div class="font-bold text-purple-800">${escapeHtml(a.status)} • AI: ${escapeHtml(a.aiDate)}</div>${a.docAvailability ? `<div class="text-[10px] text-amber-700">📞 Doc: ${escapeHtml(a.docAvailability)}</div>` : ''}</div>`).join('')
          : '<div class="text-slate-400 italic">No insemination records</div>';

        document.getElementById('bdetail-body').innerHTML = `
          <div class="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1"><div class="font-extrabold text-blue-800">🥛 Milk Logs</div>${milkHtml}</div>
          <div class="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-1"><div class="font-extrabold text-rose-800">💊 Medicines</div>${medHtml}</div>
          <div class="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1"><div class="font-extrabold text-indigo-800">🩺 Vet Visits</div>${docHtml}</div>
          <div class="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1"><div class="font-extrabold text-purple-800">🧬 Insemination / Breeding</div>${aiHtml}</div>
        `;
        document.getElementById('buffalo-detail-modal').classList.remove('hidden');
        playTone(620, 0.05);
      });

      switchTab('buffalo');
      renderAll();
      pullSheetOnStartup();
      setTimeout(checkDueTestReminder, 350);
