(() => {
  "use strict";

  // --- DOM helpers
  const $ = (id) => document.getElementById(id);

  const elMonth = $("month");
  const elYear = $("year");
  const elPlan = $("monthPlan");
  const elDone = $("monthDone");
  const elIncludeWeekends = $("includeWeekends");
  const elMonthMeta = $("monthMeta");

  const elKPlan = $("kPlan");
  const elKDone = $("kDone");
  const elKLeft = $("kLeft");
  const elKDaysLeft = $("kDaysLeft");
  const elKPerDay = $("kPerDay");
  const elStatusBadge = $("statusBadge");
  const elCalcNote = $("calcNote");

  const elTeamsTable = $("teamsTable");
  const elTeamsSum = $("teamsSum");
  const elTeamsDiff = $("teamsDiff");

  const btnSavePlan = $("btnSavePlan");
  const btnSaveDone = $("btnSaveDone");
  const btnSaveTeams = $("btnSaveTeams");
  const btnAutoSplit = $("btnAutoSplit");

  const btnAddTeam = $("btnAddTeam");
  const btnExport = $("btnExport");
  const importFile = $("importFile");

  // modal
  const modal = $("modal");
  const modalClose = $("modalClose");
  const modalCancel = $("modalCancel");
  const modalOk = $("modalOk");
  const newTeamCode = $("newTeamCode");

  // --- storage keys
  const KEY_TEAMS = "mvpMonthPlan.teams"; // array of team codes
  const KEY_PREFS = "mvpMonthPlan.prefs"; // { includeWeekends: boolean }
  const KEY_MONTH = (ym) => `mvpMonthPlan.month.${ym}`; // { plan, done, teams: {code: number}}

  // --- defaults
  const DEFAULT_TEAMS = ["CZ", "PL", "DE", "RO", "IT"];

  // --- utils
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymKey = (y, m0) => `${y}-${pad2(m0 + 1)}`; // m0: 0-11
  const clamp0 = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeTeamCode(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
  }

  function daysInMonth(year, month0) {
    // month0 0..11
    return new Date(year, month0 + 1, 0).getDate();
  }

  function isWeekend(d) {
    const day = d.getDay(); // 0 Sun .. 6 Sat
    return day === 0 || day === 6;
  }

  function countWorkdaysInMonth(year, month0, includeWeekends) {
    const dim = daysInMonth(year, month0);
    let c = 0;
    for (let day = 1; day <= dim; day++) {
      const dt = new Date(year, month0, day);
      if (includeWeekends || !isWeekend(dt)) c++;
    }
    return c;
  }

  function countRemainingWorkdaysFromToday(year, month0, includeWeekends) {
    const now = new Date();
    // normalize time
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const first = new Date(year, month0, 1);
    const last = new Date(year, month0, daysInMonth(year, month0));

    // If selected month is in the past -> 0
    if (last < today) return 0;

    // If selected month is in the future -> all workdays
    if (first > today) return countWorkdaysInMonth(year, month0, includeWeekends);

    // Same month -> from today to end (including today)
    let c = 0;
    for (let d = today.getDate(); d <= last.getDate(); d++) {
      const dt = new Date(year, month0, d);
      if (includeWeekends || !isWeekend(dt)) c++;
    }
    return c;
  }

  function fmtInt(n) {
    const x = Math.round(Number(n) || 0);
    return x.toLocaleString("ru-RU");
  }

  function setBadge(text, type) {
    elStatusBadge.textContent = text;
    const base = "badge";
    elStatusBadge.className = base;
    if (type === "ok") {
      elStatusBadge.style.borderColor = "rgba(55,224,140,.35)";
      elStatusBadge.style.background = "rgba(55,224,140,.08)";
      elStatusBadge.style.color = "#d7ffe9";
    } else if (type === "warn") {
      elStatusBadge.style.borderColor = "rgba(255,200,87,.35)";
      elStatusBadge.style.background = "rgba(255,200,87,.08)";
      elStatusBadge.style.color = "#ffe9b8";
    } else if (type === "bad") {
      elStatusBadge.style.borderColor = "rgba(255,92,122,.35)";
      elStatusBadge.style.background = "rgba(255,92,122,.08)";
      elStatusBadge.style.color = "#ffd6de";
    } else {
      elStatusBadge.style.borderColor = "var(--line)";
      elStatusBadge.style.background = "rgba(0,0,0,.2)";
      elStatusBadge.style.color = "var(--muted)";
    }
  }

  // --- teams
  function getTeams() {
    const teams = loadJson(KEY_TEAMS, null);
    if (Array.isArray(teams) && teams.length) return teams;
    saveJson(KEY_TEAMS, DEFAULT_TEAMS);
    return [...DEFAULT_TEAMS];
  }
  function setTeams(list) {
    const cleaned = Array.from(new Set(list.map(normalizeTeamCode))).filter(Boolean);
    saveJson(KEY_TEAMS, cleaned.length ? cleaned : DEFAULT_TEAMS);
  }

  // --- month data
  function getMonthData(ym, teams) {
    const d = loadJson(KEY_MONTH(ym), null);
    const base = {
      plan: 0,
      done: 0,
      teams: {},
    };
    const out = Object.assign(base, d || {});
    if (!out.teams || typeof out.teams !== "object") out.teams = {};
    // ensure all teams exist in map
    for (const t of teams) {
      if (typeof out.teams[t] !== "number") out.teams[t] = 0;
    }
    // also remove unknown teams from map? keep them (for import safety)
    return out;
  }
  function saveMonthData(ym, data) {
    saveJson(KEY_MONTH(ym), data);
  }

  function getPrefs() {
    const p = loadJson(KEY_PREFS, { includeWeekends: false });
    if (typeof p.includeWeekends !== "boolean") p.includeWeekends = false;
    return p;
  }
  function savePrefs(p) {
    saveJson(KEY_PREFS, p);
  }

  // --- UI build
  function fillMonthYearPickers() {
    const months = [
      "Январь","Февраль","Март","Апрель","Май","Июнь",
      "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
    ];
    elMonth.innerHTML = months.map((m, i) => `<option value="${i}">${m}</option>`).join("");

    const now = new Date();
    const yNow = now.getFullYear();
    const years = [];
    for (let y = yNow - 3; y <= yNow + 4; y++) years.push(y);
    elYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");

    elMonth.value = String(now.getMonth());
    elYear.value = String(yNow);
  }

  function renderTeamsTable(teams, monthData) {
    elTeamsTable.innerHTML = "";

    const head = document.createElement("div");
    head.className = "tr head";
    head.innerHTML = `<div>Команда</div><div>План команды</div><div></div>`;
    elTeamsTable.appendChild(head);

    for (const code of teams) {
      const tr = document.createElement("div");
      tr.className = "tr";

      const left = document.createElement("div");
      left.className = "code";
      left.textContent = code;

      const mid = document.createElement("div");
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      inp.step = "1";
      inp.value = String(Math.round(monthData.teams[code] || 0));
      inp.dataset.team = code;
      inp.addEventListener("input", () => {
        monthData.teams[code] = clamp0(Number(inp.value));
        updateTeamsSumAndDiff(monthData);
      });
      mid.appendChild(inp);

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn del";
      del.textContent = "Удалить";
      del.addEventListener("click", () => {
        const curr = getTeams();
        const next = curr.filter(t => t !== code);
        if (!next.length) {
          alert("Нельзя удалить последнюю команду.");
          return;
        }
        if (!confirm(`Удалить команду ${code}?`)) return;

        setTeams(next);

        // also remove from current monthData map
        delete monthData.teams[code];

        refreshAll();
      });
      right.appendChild(del);

      tr.appendChild(left);
      tr.appendChild(mid);
      tr.appendChild(right);
      elTeamsTable.appendChild(tr);
    }
  }

  function updateTeamsSumAndDiff(monthData) {
    const sum = Object.values(monthData.teams || {}).reduce((a, b) => a + clamp0(Number(b)), 0);
    elTeamsSum.textContent = fmtInt(sum);

    const plan = clamp0(Number(monthData.plan));
    const diff = sum - plan;
    elTeamsDiff.textContent = (diff >= 0 ? "+" : "") + fmtInt(diff);

    // badge hint for diff
    if (plan === 0 && sum === 0) {
      // no badge change
      return;
    }
  }

  function renderMeta(year, month0, includeWeekends) {
    const dim = daysInMonth(year, month0);
    const workdays = countWorkdaysInMonth(year, month0, includeWeekends);

    // weekends count (real Sat+Sun)
    let weekends = 0;
    for (let d = 1; d <= dim; d++) {
      if (isWeekend(new Date(year, month0, d))) weekends++;
    }

    elMonthMeta.textContent = `Дней в месяце: ${dim} · Выходных (Сб/Вс): ${weekends} · Рабочих дней: ${workdays}${includeWeekends ? " (выходные включены)" : ""}`;
  }

  function computeAndRenderTotals(year, month0, monthData, includeWeekends) {
    const plan = clamp0(Number(monthData.plan));
    const done = clamp0(Number(monthData.done));
    const left = Math.max(plan - done, 0);

    const daysLeft = countRemainingWorkdaysFromToday(year, month0, includeWeekends);
    const perDay = daysLeft > 0 ? left / daysLeft : (left > 0 ? Infinity : 0);

    elKPlan.textContent = fmtInt(plan);
    elKDone.textContent = fmtInt(done);
    elKLeft.textContent = fmtInt(left);
    elKDaysLeft.textContent = fmtInt(daysLeft);

    if (!Number.isFinite(perDay)) {
      elKPerDay.textContent = "∞";
    } else {
      elKPerDay.textContent = fmtInt(perDay);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const first = new Date(year, month0, 1);
    const last = new Date(year, month0, daysInMonth(year, month0));

    // status
    if (plan === 0) {
      setBadge("Укажи план", "warn");
      elCalcNote.textContent = "Задай план месяца — тогда появится точная дневная норма.";
    } else if (left === 0) {
      setBadge("План закрыт", "ok");
      elCalcNote.textContent = "Остаток 0 — можно фиксировать новые цели или вести команды.";
    } else if (last < today) {
      setBadge("Месяц завершён", "bad");
      elCalcNote.textContent = "Выбранный месяц уже прошёл. Остаток показан, но рабочих дней осталось 0.";
    } else if (daysLeft === 0) {
      setBadge("Нет рабочих дней", "bad");
      elCalcNote.textContent = "В выбранном периоде не осталось рабочих дней (по текущим настройкам).";
    } else {
      setBadge("В работе", "ok");
      const per = Number.isFinite(perDay) ? Math.round(perDay) : null;
      elCalcNote.textContent = `Чтобы закрыть план, нужно делать примерно ${per !== null ? per.toLocaleString("ru-RU") : "—"} в рабочий день до конца месяца.`;
    }
  }

  function currentSelection() {
    const year = Number(elYear.value);
    const month0 = Number(elMonth.value);
    return { year, month0, ym: ymKey(year, month0) };
  }

  function refreshAll() {
    const teams = getTeams();
    const prefs = getPrefs();

    elIncludeWeekends.checked = !!prefs.includeWeekends;

    const { year, month0, ym } = currentSelection();
    const monthData = getMonthData(ym, teams);

    elPlan.value = String(Math.round(monthData.plan || 0));
    elDone.value = String(Math.round(monthData.done || 0));

    renderMeta(year, month0, prefs.includeWeekends);
    computeAndRenderTotals(year, month0, monthData, prefs.includeWeekends);

    renderTeamsTable(teams, monthData);
    updateTeamsSumAndDiff(monthData);

    // store current working dataset in window for button handlers
    window.__MVP__ = { teams, prefs, year, month0, ym, monthData };
  }

  function openModal() {
    newTeamCode.value = "";
    modal.classList.add("show");
    newTeamCode.focus();
  }
  function closeModal() {
    modal.classList.remove("show");
  }

  // --- events
  elMonth.addEventListener("change", refreshAll);
  elYear.addEventListener("change", refreshAll);

  elIncludeWeekends.addEventListener("change", () => {
    const prefs = getPrefs();
    prefs.includeWeekends = !!elIncludeWeekends.checked;
    savePrefs(prefs);
    refreshAll();
  });

  btnSavePlan.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    st.monthData.plan = clamp0(Number(elPlan.value));
    saveMonthData(st.ym, st.monthData);
    refreshAll();
  });

  btnSaveDone.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    st.monthData.done = clamp0(Number(elDone.value));
    saveMonthData(st.ym, st.monthData);
    refreshAll();
  });

  btnSaveTeams.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    // already live-updated in monthData; just persist
    saveMonthData(st.ym, st.monthData);
    alert("Распределение сохранено.");
    refreshAll();
  });

  btnAutoSplit.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    const plan = clamp0(Number(st.monthData.plan));
    if (plan <= 0) {
      alert("Сначала укажи план месяца.");
      return;
    }
    const teams = st.teams;
    const base = Math.floor(plan / teams.length);
    let rem = plan - base * teams.length;
    for (const t of teams) {
      st.monthData.teams[t] = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
    }
    saveMonthData(st.ym, st.monthData);
    refreshAll();
  });

  btnAddTeam.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modalOk.addEventListener("click", () => {
    const code = normalizeTeamCode(newTeamCode.value);
    if (!code) {
      alert("Введите код команды.");
      return;
    }
    const teams = getTeams();
    if (teams.includes(code)) {
      alert("Такая команда уже есть.");
      return;
    }
    teams.push(code);
    setTeams(teams);

    // add to current month map too
    const st = window.__MVP__;
    if (st) {
      st.monthData.teams[code] = 0;
      saveMonthData(st.ym, st.monthData);
    }

    closeModal();
    refreshAll();
  });

  // export/import
  btnExport.addEventListener("click", () => {
    const teams = getTeams();
    const prefs = getPrefs();

    // export all months stored under prefix
    const all = { teams, prefs, months: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("mvpMonthPlan.month.")) {
        const ym = k.replace("mvpMonthPlan.month.", "");
        all.months[ym] = loadJson(k, {});
      }
    }

    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "month-plan-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data && typeof data === "object") {
        if (Array.isArray(data.teams)) setTeams(data.teams);
        if (data.prefs && typeof data.prefs === "object") savePrefs({
          includeWeekends: !!data.prefs.includeWeekends
        });

        if (data.months && typeof data.months === "object") {
          for (const [ym, val] of Object.entries(data.months)) {
            saveJson(KEY_MONTH(ym), val);
          }
        }
        alert("Импорт выполнен.");
        refreshAll();
      } else {
        alert("Неверный формат JSON.");
      }
    } catch (e) {
      alert("Не удалось импортировать: " + (e?.message || "ошибка"));
    } finally {
      importFile.value = "";
    }
  });

  // init pickers
  function init() {
    fillMonthYearPickers();

    // ensure defaults in storage
    getTeams();
    getPrefs();

    refreshAll();
  }

  init();
})();
