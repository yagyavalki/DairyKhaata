// Dairy Khata — Storage, Formatting, Azure & Google Sheets Sync
function safeGet(key, fallback) {
        try {
          const val = localStorage.getItem(key);
          return val !== null ? val : fallback;
        } catch (e) {
          return fallback;
        }
      }

      function safeSet(key, val) {
        try {
          localStorage.setItem(key, val);
        } catch (e) { /* sandbox fallback */ }
      }

      function loadJson(key, fallbackFn) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (e) { /* sandbox fallback */ }
        return fallbackFn();
      }

      function loadAuthors() {
        return loadJson(AUTHORS_LIST_KEY, () => ['Ramu', 'Ravi', 'Suresh', 'Owner']);
      }

      function saveEntries(list) {
        safeSet(STORAGE_KEY, JSON.stringify(list));
      }
