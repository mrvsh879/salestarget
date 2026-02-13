(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // top controls
  const elMonth = $("month");
  const elYear = $("year");
  const elPlan = $("monthPlan");
  const elDone = $("monthDone");
  const elIncludeWeekends = $("includeWeekends");
  const elDoneFromCalendar = $("doneFromCalendar");
  const elMonthMeta = $("monthMeta");

  // totals
  const elKPlan = $("kPlan");
  const elKDone = $("kDone");
  const elKLeft = $("kLeft");
  const elKDaysLeft = $("kDaysLeft");
  const elKPerDay = $("kPerDay");
  const elStatusBadge = $("statusBadge");
  const elCalcNote = $("calcNote");

  // calendar
  const elCalendar = $("calendar");
  const btnClearCalendar = $("btnClearCalendar");

  // ✅ calendar toggle
  const btnToggleCalendar = $("btnToggleCalendar");
  const elCalendarPanel = $("calendarPanel");

  // teams
  const elTeamsTable = $("teamsTable");
  const elTeamsPlanSum = $("teamsPlanSum");
  const elTeamsDoneSum = $("teamsDoneSum");
  const elTeamsDiff = $("teamsDiff");

  // buttons
  const btnSavePlan = $("btnSavePlan");
  const btnSaveDone = $("btnSaveDone");
  const btnSaveTeams = $("btnSaveTeams");
  const btnAutoSplit = $("btnAutoSplit");
  const btnAddTeam = $("btnAddTeam");
  const btnExport = $("btnExport");
  const importFile = $("importFile");

  // modal add team
  const modal = $("modal");
  const modalClose = $("modalClose");
  const modalCancel = $("modalCancel");
  const modalOk = $("modalOk");
  const newTeamCode = $("newTeamCode");

  // modal day input
  const dayModal = $("dayModal");
  const dayModalTitle = $("dayModalTitle");
  const dayModalClose = $("dayModalClose");
  const dayModalCancel = $("dayModalCancel");
  const dayModalSave = $("dayModalSave");
  const dayModalDelete = $("dayModalDelete");
  const dayValue = $("dayValue");
  const dayHint = $("dayHint");

  // storage
  const KEY_TEAMS = "mvpMonthPlan.teams";
  const KEY_PREFS = "mvpMonthPlan.prefs";
  const KEY_MONTH = (ym) => `mvpMonthPlan.month.${ym}`;

  const DEFAULT_TEAMS = ["CZ", "PL", "DE", "RO", "IT"];

  const pad2 = (n) => String(n).padStart(2, "0");
  const ymKey = (y, m0) => `${y}-${pad2(m0 + 1)}`;
  const ymdKey = (y, m0, d) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
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

  function countRemainingWorkdaysFromDate(year, month0, startDay, includeWeekends) {
    const dim = daysInMonth(year, month0);
    let c = 0;
    for (let d = startDay; d <= dim; d++) {
      const dt = new Date(year, month0, d);
      if (includeWeekends || !isWeekend(dt)) c++;
    }
    return c;
  }

  function fmtInt(n) {
    const x = Math.round(Number(n) || 0);
    return x.toLocaleString("ru-RU");
  }

  function sumDailyForMonth(monthData, year, month0) {
    const dim = daysInMonth(year, month0);
    let s = 0;
    for (let d = 1; d <= dim; d++) {
      const k = ymdKey(year, month0, d);
      s += clamp0(Number(monthData.daily?.[k]));
    }
    return s;
  }

  function getTeams() {
    const t = loadJson(KEY_TEAMS, null);
    if (Array.isArray(t) && t.length) return t.map(normalizeTeamCode).filter(Boolean);
    return DEFAULT_TEAMS.slice();
  }
  function setTeams(teams) {
    saveJson(KEY_TEAMS, teams);
  }

  function getPrefs() {
    const p = loadJson(KEY_PREFS, null);
    const out = {
      includeWeekends: false,
      doneFromCalendar: true,
      calendarCollapsed: false
    };
    if (p && typeof p === "object") {
      if (typeof p.includeWeekends === "boolean") out.includeWeekends = p.includeWeekends;
      if (typeof p.doneFromCalendar === "boolean") out.doneFromCalendar = p.doneFromCalendar;
      if (typeof p.calendarCollapsed === "boolean") out.calendarCollapsed = p.calendarCollapsed;
    }
    return out;
  }
  function savePrefs(p) {
    saveJson(KEY_PREFS, p);
  }

  // month data (with migration)
  // monthData.teams[CODE] = { plan: number, done: number }
  // monthData.daily[YYYY-MM-DD] = number
  function getMonthData(ym, teams) {
    const raw = loadJson(KEY_MONTH(ym), null);
    const out = { plan: 0, done: 0, teams: {}, daily: {} };

    if (raw && typeof raw === "object") {
      out.plan = clamp0(Number(raw.plan));
      out.done = clamp0(Number(raw.done));
      out.teams = (raw.teams && typeof raw.teams === "object") ? raw.teams : {};
      out.daily = (raw.daily && typeof raw.daily === "object") ? raw.daily : {};
    }

    // MIGRATION: old teams[code] number => {plan, done}
    for (const t of teams) {
      const v = out.teams[t];
      if (typeof v === "number") {
        out.teams[t] = { plan: clamp0(v), done: 0 };
      } else if (v && typeof v === "object") {
        out.teams[t] = {
          plan: clamp0(Number(v.plan)),
          done: clamp0(Number(v.done))
        };
      } else {
        out.teams[t] = { plan: 0, done: 0 };
      }
    }

    saveJson(KEY_MONTH(ym), out);
    return out;
  }

  function saveMonthData(ym, data) {
    saveJson(KEY_MONTH(ym), data);
  }

  // UI pickers
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

  function renderMeta(year, month0, includeWeekends) {
    const dim = daysInMonth(year, month0);
    const wd = countWorkdaysInMonth(year, month0, includeWeekends);
    const name = elMonth.options[month0]?.textContent || "";
    elMonthMeta.textContent = `${name} ${year}: дней ${dim}, рабочих (по настройкам) ${wd}.`;
  }

  function currentSelection() {
    const year = Number(elYear.value);
    const month0 = Number(elMonth.value);
    const ym = ymKey(year, month0);
    return { year, month0, ym };
  }

  function computeAndRenderTotals(year, month0, monthData, includeWeekends) {
    const now = new Date();
    const isThisMonth = (now.getFullYear() === year && now.getMonth() === month0);
    const today = isThisMonth ? now.getDate() : 1;

    const plan = clamp0(Number(monthData.plan));
    const done = clamp0(Number(monthData.done));
    const left = Math.max(plan - done, 0);

    const startDay = isThisMonth ? today : 1;
    const daysLeft = countRemainingWorkdaysFromDate(year, month0, startDay, includeWeekends);
    const perDay = (left > 0 && daysLeft > 0) ? Math.ceil(left / daysLeft) : 0;

    elKPlan.textContent = fmtInt(plan);
    elKDone.textContent = fmtInt(done);
    elKLeft.textContent = fmtInt(left);
    elKDaysLeft.textContent = fmtInt(daysLeft);
    elKPerDay.textContent = plan === 0 ? "—" : fmtInt(perDay);

    // status
    let badge = "—";
    if (plan === 0) badge = "Нет плана";
    else if (left === 0) badge = "План закрыт ✅";
    else badge = "В процессе";

    elStatusBadge.textContent = badge;

    // note
    if (plan === 0) {
      elCalcNote.textContent = "Укажи “План на месяц”, чтобы посчитать дневную норму.";
    } else if (left === 0) {
      elCalcNote.textContent = "План выполнен. Можно начать следующий месяц или поднять план.";
    } else {
      elCalcNote.textContent = `Остаток ${fmtInt(left)}. До конца месяца осталось рабочих дней: ${fmtInt(daysLeft)}. Норма: ~${fmtInt(perDay)}/день.`;
    }

    return { daysLeft, perDay };
  }

  function renderCalendar(year, month0, monthData, includeWeekends) {
    elCalendar.innerHTML = "";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dim = daysInMonth(year, month0);

    // weekday header (Mon..Sun)
    const headers = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
    for (const h of headers) {
      const head = document.createElement("div");
      head.className = "calCell disabled";
      head.style.minHeight = "44px";
      head.style.cursor = "default";
      head.innerHTML = `<div class="calTop"><div class="calDay">${h}</div><div class="calTag">—</div></div>`;
      elCalendar.appendChild(head);
    }

    // offset
    const firstDay = new Date(year, month0, 1);
    const js = firstDay.getDay(); // 0..6 Sun..Sat
    const mondayBased = js === 0 ? 7 : js; // 1..7 Mon..Sun
    const offset = mondayBased - 1; // 0..6

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("div");
      blank.className = "calCell disabled";
      blank.style.cursor = "default";
      blank.innerHTML = `<div class="calTop"><div class="calDay"></div><div class="calTag"> </div></div>`;
      elCalendar.appendChild(blank);
    }

    // cumulative sums
    const doneBefore = new Array(dim + 2).fill(0);
    for (let d = 1; d <= dim; d++) {
      const k = ymdKey(year, month0, d);
      const v = clamp0(Number(monthData.daily?.[k]));
      doneBefore[d] = doneBefore[d - 1] + v;
    }

    const plan = clamp0(Number(monthData.plan));

    for (let d = 1; d <= dim; d++) {
      const dateObj = new Date(year, month0, d);
      const weekend = isWeekend(dateObj);
      const isWorkDay = includeWeekends ? true : !weekend;

      const isToday = dateObj.getTime() === today.getTime();
      const k = ymdKey(year, month0, d);
      const doneVal = clamp0(Number(monthData.daily?.[k]));

      const leftAtStart = Math.max(plan - doneBefore[d - 1], 0);
      const remWork = countRemainingWorkdaysFromDate(year, month0, d, includeWeekends);

      let needToday = 0;
      if (plan > 0 && leftAtStart > 0) {
        if (isWorkDay) {
          if (remWork > 0) needToday = Math.ceil(leftAtStart / remWork);
          else needToday = leftAtStart;
        } else {
          needToday = 0;
        }
      }

      const tagClasses = ["calTag", (isWorkDay ? "wk" : "we")];
      if (isToday) tagClasses.push("today");
      const tagText = isToday ? "Сегодня" : (isWorkDay ? "Раб" : "Вых");

      const cell = document.createElement("div");
      cell.className = "calCell";
      cell.innerHTML = `
        <div class="calTop">
          <div class="calDay">${d}</div>
          <div class="${tagClasses.join(" ")}">${tagText}</div>
        </div>
      `;

      const lines = document.createElement("div");
      lines.className = "calLines";

      const l1 = document.createElement("div");
      l1.className = "calLine";
      l1.innerHTML = `<span>Сделано</span><b>${fmtInt(doneVal)}</b>`;
      lines.appendChild(l1);

      const l2 = document.createElement("div");
      l2.className = "calLine";
      l2.innerHTML = `<span>Нужно</span><b>${plan === 0 ? "—" : fmtInt(needToday)}</b>`;
      lines.appendChild(l2);

      const l3 = document.createElement("div");
      l3.className = "calLine";
      l3.innerHTML = `<span>Остаток (с утра)</span><b>${plan === 0 ? "—" : fmtInt(leftAtStart)}</b>`;
      lines.appendChild(l3);

      cell.appendChild(lines);

      cell.addEventListener("click", () => openDayModal(year, month0, d));

      elCalendar.appendChild(cell);
    }
  }

  // Teams sums
  function updateTeamsSums(monthData) {
    let planSum = 0;
    let doneSum = 0;

    for (const v of Object.values(monthData.teams || {})) {
      if (v && typeof v === "object") {
        planSum += clamp0(Number(v.plan));
        doneSum += clamp0(Number(v.done));
      }
    }

    elTeamsPlanSum.textContent = fmtInt(planSum);
    elTeamsDoneSum.textContent = fmtInt(doneSum);

    const diff = planSum - clamp0(Number(monthData.plan));
    elTeamsDiff.textContent = fmtInt(diff);
  }

  function renderTeamsTable(teams, monthData, daysLeft) {
    elTeamsTable.innerHTML = "";

    const head = document.createElement("div");
    head.className = "tr head";
    head.innerHTML = `
      <div>Команда</div>
      <div>План</div>
      <div>Факт</div>
      <div>Осталось</div>
      <div>Нужно/день</div>
      <div></div>
    `;
    elTeamsTable.appendChild(head);

    for (const code of teams) {
      if (!monthData.teams[code]) monthData.teams[code] = { plan: 0, done: 0 };

      const row = document.createElement("div");
      row.className = "tr";

      const plan = clamp0(Number(monthData.teams[code].plan));
      const done = clamp0(Number(monthData.teams[code].done));
      const left = Math.max(plan - done, 0);
      const perDay = (left > 0 && daysLeft > 0) ? Math.ceil(left / daysLeft) : 0;

      const pill = left === 0 && plan > 0 ? "pill ok" : (plan === 0 ? "pill" : "pill bad");

      row.innerHTML = `
        <div class="code">${code}</div>
        <div><input type="number" min="0" step="1" value="${Math.round(plan)}" data-code="${code}" data-field="plan" /></div>
        <div><input type="number" min="0" step="1" value="${Math.round(done)}" data-code="${code}" data-field="done" /></div>
        <div><div class="${pill}">${fmtInt(left)}</div></div>
        <div><div class="pill">${plan === 0 ? "—" : fmtInt(perDay)}</div></div>
        <div><button class="btn del" data-del="${code}">Удалить</button></div>
      `;

      elTeamsTable.appendChild(row);
    }

    // input listeners
    elTeamsTable.querySelectorAll('input[type="number"]').forEach(inp => {
      inp.addEventListener("input", () => {
        const st = window.__MVP__;
        if (!st) return;
        const code = inp.getAttribute("data-code");
        const field = inp.getAttribute("data-field");
        if (!code || !field) return;
        const v = clamp0(Number(inp.value));
        st.monthData.teams[code][field] = v;
        updateTeamsSums(st.monthData);
      });
    });

    // delete listeners
    elTeamsTable.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-del");
        if (!code) return;
        if (!confirm(`Удалить команду ${code}?`)) return;

        const teams = getTeams().filter(t => t !== code);
        setTeams(teams);

        const st = window.__MVP__;
        if (st) {
          delete st.monthData.teams[code];
          saveMonthData(st.ym, st.monthData);
        }

        refreshAll(true);
      });
    });

    updateTeamsSums(monthData);
  }

  function refreshAll(resetFromStorage = true) {
    const teams = getTeams();
    const prefs = getPrefs();

    elIncludeWeekends.checked = !!prefs.includeWeekends;
    elDoneFromCalendar.checked = !!prefs.doneFromCalendar;

    // ✅ apply calendar collapsed state
    if (prefs.calendarCollapsed) {
      elCalendarPanel.classList.add("hidden");
      btnToggleCalendar.textContent = "Показать календарь";
    } else {
      elCalendarPanel.classList.remove("hidden");
      btnToggleCalendar.textContent = "Скрыть календарь";
    }

    const { year, month0, ym } = currentSelection();

    let monthData;
    if (resetFromStorage || !window.__MVP__ || window.__MVP__.ym !== ym) {
      monthData = getMonthData(ym, teams);
    } else {
      monthData = window.__MVP__.monthData;
    }

    // sync top inputs
    if (resetFromStorage) {
      elPlan.value = String(Math.round(monthData.plan || 0));
      elDone.value = String(Math.round(monthData.done || 0));
    } else {
      monthData.plan = clamp0(Number(elPlan.value));
      if (!prefs.doneFromCalendar) monthData.done = clamp0(Number(elDone.value));
    }

    // if doneFromCalendar -> overwrite monthData.done from daily sum
    if (prefs.doneFromCalendar) {
      const s = sumDailyForMonth(monthData, year, month0);
      monthData.done = s;
      elDone.value = String(Math.round(s));
      elDone.setAttribute("readonly", "readonly");
    } else {
      elDone.removeAttribute("readonly");
    }

    // save in case toggled
    saveMonthData(ym, monthData);

    renderMeta(year, month0, prefs.includeWeekends);

    const { daysLeft } = computeAndRenderTotals(year, month0, monthData, prefs.includeWeekends);

    // only render calendar UI if not collapsed (optimization not required, but ok)
    // IMPORTANT: even if collapsed, calendar data still exists; we just hide panel.
    renderCalendar(year, month0, monthData, prefs.includeWeekends);

    renderTeamsTable(teams, monthData, daysLeft);

    window.__MVP__ = { teams, prefs, year, month0, ym, monthData };
  }

  // Modals
  function openModal() {
    newTeamCode.value = "";
    modal.classList.add("show");
    newTeamCode.focus();
  }
  function closeModal() { modal.classList.remove("show"); }

  let __dayEditing = null; // {y,m0,d,key}

  function openDayModal(y, m0, d) {
    const st = window.__MVP__;
    if (!st) return;

    const k = ymdKey(y, m0, d);
    __dayEditing = { y, m0, d, key: k };

    const dateObj = new Date(y, m0, d);
    const w = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][dateObj.getDay()];
    dayModalTitle.textContent = `${k} (${w})`;

    const v = clamp0(Number(st.monthData.daily?.[k]));
    dayValue.value = String(Math.round(v));

    const weekend = isWeekend(dateObj);
    const isWorkDay = st.prefs.includeWeekends ? true : !weekend;

    dayHint.textContent = isWorkDay
      ? "Это рабочий день по настройкам. Значение повлияет на дневную норму дальше."
      : "Это выходной по настройкам. Можно записать факт, но “нужно/день” на выходные = 0 (если выходные не рабочие).";

    dayModal.classList.add("show");
    dayValue.focus();
    dayValue.select();
  }
  function closeDayModal() {
    dayModal.classList.remove("show");
    __dayEditing = null;
  }

  // events
  elMonth.addEventListener("change", () => refreshAll(true));
  elYear.addEventListener("change", () => refreshAll(true));

  elIncludeWeekends.addEventListener("change", () => {
    const prefs = getPrefs();
    prefs.includeWeekends = !!elIncludeWeekends.checked;
    savePrefs(prefs);
    refreshAll(true);
  });

  elDoneFromCalendar.addEventListener("change", () => {
    const prefs = getPrefs();
    prefs.doneFromCalendar = !!elDoneFromCalendar.checked;
    savePrefs(prefs);
    refreshAll(true);
  });

  // ✅ toggle calendar
  btnToggleCalendar.addEventListener("click", () => {
    const prefs = getPrefs();
    prefs.calendarCollapsed = !prefs.calendarCollapsed;
    savePrefs(prefs);
    refreshAll(true);
  });

  btnSavePlan.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    st.monthData.plan = clamp0(Number(elPlan.value));
    saveMonthData(st.ym, st.monthData);
    refreshAll(true);
  });

  btnSaveDone.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    if (st.prefs.doneFromCalendar) {
      alert("Факт считается из календаря. Выключи “Факт из календаря”, если хочешь вводить вручную.");
      return;
    }
    st.monthData.done = clamp0(Number(elDone.value));
    saveMonthData(st.ym, st.monthData);
    refreshAll(true);
  });

  btnSaveTeams.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    saveMonthData(st.ym, st.monthData);
    alert("Команды сохранены.");
    refreshAll(true);
  });

  btnAutoSplit.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;

    const plan = clamp0(Number(st.monthData.plan));
    if (plan <= 0) { alert("Сначала укажи план месяца."); return; }

    const t = st.teams;
    const base = Math.floor(plan / t.length);
    let rem = plan - base * t.length;

    for (const code of t) {
      const add = rem > 0 ? 1 : 0;
      st.monthData.teams[code].plan = base + add;
      if (rem > 0) rem--;
    }

    saveMonthData(st.ym, st.monthData);
    refreshAll(true);
  });

  // clear calendar for current month
  btnClearCalendar.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st) return;
    if (!confirm("Очистить все дневные значения за этот месяц?")) return;
    st.monthData.daily = {};
    saveMonthData(st.ym, st.monthData);
    refreshAll(true);
  });

  // team modal
  btnAddTeam.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  modalOk.addEventListener("click", () => {
    const code = normalizeTeamCode(newTeamCode.value);
    if (!code) { alert("Введите код команды."); return; }

    const teams = getTeams();
    if (teams.includes(code)) { alert("Такая команда уже есть."); return; }

    teams.push(code);
    setTeams(teams);

    const st = window.__MVP__;
    if (st) {
      st.monthData.teams[code] = { plan: 0, done: 0 };
      saveMonthData(st.ym, st.monthData);
    }

    closeModal();
    refreshAll(true);
  });

  // day modal events
  dayModalClose.addEventListener("click", closeDayModal);
  dayModalCancel.addEventListener("click", closeDayModal);
  dayModal.addEventListener("click", (e) => { if (e.target === dayModal) closeDayModal(); });

  dayModalSave.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st || !__dayEditing) return;

    const v = clamp0(Number(dayValue.value));
    st.monthData.daily[__dayEditing.key] = v;

    saveMonthData(st.ym, st.monthData);
    closeDayModal();
    refreshAll(true);
  });

  dayModalDelete.addEventListener("click", () => {
    const st = window.__MVP__;
    if (!st || !__dayEditing) return;

    delete st.monthData.daily[__dayEditing.key];

    saveMonthData(st.ym, st.monthData);
    closeDayModal();
    refreshAll(true);
  });

  // export/import
  btnExport.addEventListener("click", () => {
    const teams = getTeams();
    const prefs = getPrefs();

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
    a.download = `month-plan-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object") throw new Error("Неверный JSON");

      if (Array.isArray(data.teams)) setTeams(data.teams.map(normalizeTeamCode).filter(Boolean));
      if (data.prefs && typeof data.prefs === "object") savePrefs(data.prefs);

      if (data.months && typeof data.months === "object") {
        for (const [ym, md] of Object.entries(data.months)) {
          if (typeof ym === "string" && md && typeof md === "object") {
            saveJson(KEY_MONTH(ym), md);
          }
        }
      }

      alert("Импорт выполнен.");
      refreshAll(true);
    } catch (e) {
      alert("Ошибка импорта: " + (e && e.message ? e.message : String(e)));
    } finally {
      importFile.value = "";
    }
  });

  // init
  fillMonthYearPickers();
  refreshAll(true);

})();
