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

  function setBadge(text, type) {
    elStatusBadge.textContent = text;
    elStatusBadge.className = "badge";

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

  // teams list
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

  // prefs
  function getPrefs() {
    const p = loadJson(KEY_PREFS, {
      includeWeekends: false,
      doneFromCalendar: true,
      calendarCollapsed: false
    });
    if (typeof p.includeWeekends !== "boolean") p.includeWeekends = false;
    if (typeof p.doneFromCalendar !== "boolean") p.doneFromCalendar = true;
    if (typeof p.calendarCollapsed !== "boolean") p.calendarCollapsed = false;
    return p;
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
    const workdays = countWorkdaysInMonth(year, month0, includeWeekends);

    let weekends = 0;
    for (let d = 1; d <= dim; d++) {
      if (isWeekend(new Date(year, month0, d))) weekends++;
    }

    elMonthMeta.textContent =
      `Дней: ${dim} · Выходных (Сб/Вс): ${weekends} · Рабочих: ${workdays}${includeWeekends ? " (выходные включены)" : ""}`;
  }

  function computeAndRenderTotals(year, month0, monthData, includeWeekends) {
    const plan = clamp0(Number(monthData.plan));
    const done = clamp0(Number(monthData.done));
    const left = Math.max(plan - done, 0);

    // remaining workdays from TODAY
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const first = new Date(year, month0, 1);
    const last = new Date(year, month0, daysInMonth(year, month0));
    let daysLeft = 0;

    if (last < today) daysLeft = 0;
    else if (first > today) daysLeft = countWorkdaysInMonth(year, month0, includeWeekends);
    else daysLeft = countRemainingWorkdaysFromDate(year, month0, today.getDate(), includeWeekends);

    const perDay = daysLeft > 0 ? left / daysLeft : (left > 0 ? Infinity : 0);

    elKPlan.textContent = fmtInt(plan);
    elKDone.textContent = fmtInt(done);
    elKLeft.textContent = fmtInt(left);
    elKDaysLeft.textContent = fmtInt(daysLeft);
    elKPerDay.textContent = Number.isFinite(perDay) ? fmtInt(perDay) : (left > 0 ? "∞" : "0");

    if (plan === 0) {
      setBadge("Укажи план", "warn");
      elCalcNote.textContent = "Задай план месяца — календарь покажет дневную норму.";
    } else if (left === 0) {
      setBadge("План закрыт", "ok");
      elCalcNote.textContent = "Остаток 0 — всё закрыто.";
    } else if (last < today) {
      setBadge("Месяц завершён", "bad");
      elCalcNote.textContent = "Месяц в прошлом. Рабочих дней осталось 0.";
    } else if (daysLeft === 0) {
      setBadge("Нет рабочих дней", "bad");
      elCalcNote.textContent = "По настройкам не осталось рабочих дней.";
    } else {
      setBadge("В работе", "ok");
      elCalcNote.textContent =
        `Чтобы закрыть план, нужно ~ ${Math.round(perDay).toLocaleString("ru-RU")} в рабочий день до конца месяца.`;
    }

    return { daysLeft };
  }

  function sumDailyForMonth(monthData, y, m0) {
    const dim = daysInMonth(y, m0);
    let s = 0;
    for (let d = 1; d <= dim; d++) {
      const k = ymdKey(y, m0, d);
      const v = monthData.daily?.[k];
      s += clamp0(Number(v));
    }
    return s;
  }

  // Calendar: "Нужно сегодня" рассчитываем так:
  // leftAtStart = plan - sum(done for days < current day)
  // remWork = workdays from day..end
  // needToday = ceil(leftAtStart / remWork) для рабочих дней, иначе 0 (если выходные не рабочие)
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
    elTeamsDiff.textContent = (diff >= 0 ? "+" : "") + fmtInt(diff);
  }

  function pillEl() {
    const el = document.createElement("div");
    el.className = "pill";
    el.textContent = "0";
    return el;
  }
  function setPill(el, value, kind = "") {
    el.className = "pill" + (kind ? ` ${kind}` : "");
    el.textContent = value;
  }

  function renderTeamsTable(teams, monthData, daysLeft) {
    elTeamsTable.innerHTML = "";

    const head = document.createElement("div");
    head.className = "tr head";
    head.innerHTML = `
      <div>Команда</div>
      <div>План</div>
      <div>Сделано</div>
      <div>Осталось</div>
      <div>Нужно/день</div>
      <div></div>
    `;
    elTeamsTable.appendChild(head);

    for (const code of teams) {
      const tr = document.createElement("div");
      tr.className = "tr";
      const rec = monthData.teams[code] || (monthData.teams[code] = { plan: 0, done: 0 });

      const c = document.createElement("div");
      c.className = "code";
      c.textContent = code;

      const planBox = document.createElement("div");
      const inpPlan = document.createElement("input");
      inpPlan.type = "number";
      inpPlan.min = "0";
      inpPlan.step = "1";
      inpPlan.value = String(Math.round(clamp0(Number(rec.plan))));
      planBox.appendChild(inpPlan);

      const doneBox = document.createElement("div");
      const inpDone = document.createElement("input");
      inpDone.type = "number";
      inpDone.min = "0";
      inpDone.step = "1";
      inpDone.value = String(Math.round(clamp0(Number(rec.done))));
      doneBox.appendChild(inpDone);

      const leftBox = document.createElement("div");
      const leftP = pillEl();
      leftBox.appendChild(leftP);

      const perDayBox = document.createElement("div");
      const perP = pillEl();
      perDayBox.appendChild(perP);

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn del";
      del.textContent = "Удалить";
      right.appendChild(del);

      tr.appendChild(c);
      tr.appendChild(planBox);
      tr.appendChild(doneBox);
      tr.appendChild(leftBox);
      tr.appendChild(perDayBox);
      tr.appendChild(right);
      elTeamsTable.appendChild(tr);

      const recalcRow = () => {
        const plan = clamp0(Number(monthData.teams[code].plan));
        const done = clamp0(Number(monthData.teams[code].done));
        const left = Math.max(plan - done, 0);
        const per = daysLeft > 0 ? (left / daysLeft) : (left > 0 ? Infinity : 0);

        setPill(leftP, fmtInt(left), left === 0 ? "ok" : "");
        if (!Number.isFinite(per)) setPill(perP, "∞", "bad");
        else setPill(perP, fmtInt(per), "");
      };

      inpPlan.addEventListener("input", () => {
        monthData.teams[code].plan = clamp0(Number(inpPlan.value));
        recalcRow();
        updateTeamsSums(monthData);
        saveMonthData(window.__MVP__.ym, monthData);
      });

      inpDone.addEventListener("input", () => {
        monthData.teams[code].done = clamp0(Number(inpDone.value));
        recalcRow();
        updateTeamsSums(monthData);
        saveMonthData(window.__MVP__.ym, monthData);
      });

      del.addEventListener("click", () => {
        const curr = getTeams();
        const next = curr.filter(t => t !== code);
        if (!next.length) { alert("Нельзя удалить последнюю команду."); return; }
        if (!confirm(`Удалить команду ${code}?`)) return;

        setTeams(next);
        delete monthData.teams[code];
        saveMonthData(window.__MVP__.ym, monthData);
        refreshAll(true);
      });

      recalcRow();
    }

    updateTeamsSums(monthData);
  }

  function currentSelection() {
    const year = Number(elYear.value);
    const month0 = Number(elMonth.value);
    return { year, month0, ym: ymKey(year, month0) };
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

        if (data.prefs && typeof data.prefs === "object") {
          savePrefs({
            includeWeekends: !!data.prefs.includeWeekends,
            doneFromCalendar: (typeof data.prefs.doneFromCalendar === "boolean") ? data.prefs.doneFromCalendar : true,
            calendarCollapsed: (typeof data.prefs.calendarCollapsed === "boolean") ? data.prefs.calendarCollapsed : false
          });
        }

        if (data.months && typeof data.months === "object") {
          for (const [ym, val] of Object.entries(data.months)) {
            saveJson(KEY_MONTH(ym), val);
          }
        }

        alert("Импорт выполнен.");
        refreshAll(true);
      } else {
        alert("Неверный формат JSON.");
      }
    } catch (e) {
      alert("Не удалось импортировать: " + (e?.message || "ошибка"));
    } finally {
      importFile.value = "";
    }
  });

  function init() {
    fillMonthYearPickers();
    getTeams();
    getPrefs();
    refreshAll(true);
  }

  init();
})();
