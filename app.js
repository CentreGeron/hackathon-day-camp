// ===== CATEGORY CONFIG =====
function micon(name) {
  return `<span class="material-symbols-rounded">${name}</span>`;
}

const CATEGORY_META = {
  character:    { label: 'Персонаж',   icon: 'person' },
  location:     { label: 'Локация',    icon: 'location_on' },
  artStyle:     { label: 'Стиль',      icon: 'palette' },
  colorPalette: { label: 'Палитра',    icon: 'colorize' },
  genre:        { label: 'Жанр',       icon: 'sports_esports' }
};
const CATEGORIES = Object.keys(CATEGORY_META);

const TEAM_COLORS = ['var(--team-1)', 'var(--team-2)', 'var(--team-3)', 'var(--team-4)'];
const TEAM_COLORS_RAW = ['#FF6B6B', '#4FC3F7', '#FFCA28', '#AB47BC'];
const BADGE_COLORS = {
  character:    { bg: '#FCE4EC', border: '#E91E63', text: '#AD1457' },
  location:     { bg: '#E1F5FE', border: '#03A9F4', text: '#0277BD' },
  artStyle:     { bg: '#F3E5F5', border: '#AB47BC', text: '#7B1FA2' },
  colorPalette: { bg: '#FFF8E1', border: '#FFC107', text: '#F57F17' },
  genre:        { bg: '#E8F5E9', border: '#66BB6A', text: '#2E7D32' }
};

// ===== DEFAULT CRITERIA =====
const DEFAULT_CRITERIA = {
  character:    ['Дракон','Робот','Рыцарь','Инопланетянин','Ниндзя','Пират','Волшебник','Кот','Призрак','Динозавр','Единорог','Обезьяна','Зомби','Супергерой','Вампир','Фея','Оборотень','Гном','Эльф','Русалка','Демон','Ангел','Циклоп','Йети','Киборг','Самурай','Джинн','Слайм','Пугало','Минотавр','Скелет','Медведь','Астронавт','Детектив','Алхимик'],
  location:     ['Космос','Подводный мир','Джунгли','Город','Подземелье','Небесный замок','Вулкан','Ледяная пещера','Пустыня','Дом с привидениями','Пиратский корабль','Заброшенная фабрика','Облачное королевство','Лабиринт','Болото','Космическая станция','Замок дракона','Школа магии','Средневековая деревня','Киберпанк-город','Древний Египет','Дикий Запад','Марсианская база','Летающий остров','Викторианский Лондон','Грибной лес','Музей древностей','Поезд-призрак','Храм майя','Остров сокровищ'],
  artStyle:     ['Пиксель-арт','Мультяшный','Реалистичный','Рисованный','Low-Poly','Воксельный','Ретро 8-бит','Неоновый','Акварель','Комикс','Аниме','Минималистичный','Стимпанк','Граффити','Оригами','Глиняный (Clay)','Вязаный (Knitted)','Меловой (Chalk)','Киберпанк','Масляные краски'],
  colorPalette: ['Тёплая','Холодная','Неоновая','Пастельная','Монохромная','Радужная','Земляная','Закатная','Ночная','Огненная','Ледяная','Лесная','Космическая','Ретро','Кислотная','Золотая','Металлическая','Сепия','Кибер-панк','Ядовитая'],
  genre:        ['Платформер','Раннер','Пазл','Аркада','RPG','Стратегия','Кликер','Tower Defense','Гонки','Шутер','Квест','Файтинг','Симулятор','Рогалик','Визуальная новелла','Ритм-игра','Стелс','Песочница','Хоррор','Выживание','Спортивный','Детектив']
};

function getActiveCategories() {
  return CATEGORIES.filter(cat => appState.enabledCategories[cat] !== false);
}

// ===== STATE =====
let appState;
const STORAGE_KEY = 'hackathon-day-camp';

function getDefaultState() {
  return {
    teams: [],
    unassigned: [],
    teamCount: 2,
    criteriaLists: JSON.parse(JSON.stringify(DEFAULT_CRITERIA)),
    enabledCategories: { character: true, location: true, artStyle: true, colorPalette: true, genre: true },
    rouletteResults: {},
    timer: { durationSeconds: 3600, startedAt: null, pausedRemaining: null },
    rouletteMode: 'all'
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const def = getDefaultState();
      for (const key in def) {
        if (!(key in parsed)) parsed[key] = def[key];
      }
      return parsed;
    }
  } catch (e) {}
  return getDefaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    msg.textContent = message;
    overlay.classList.add('active');

    const cleanup = (result) => {
      overlay.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      overlay.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };
    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
    document.addEventListener('keydown', onKey);
  });
}

async function resetAll() {
  const ok = await showConfirm('Сбросить все данные? Это удалит учеников, команды и результаты.');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  appState = getDefaultState();
  currentWizardStep = 1;
  renderWizard();
  renderRoulette();
  renderDashboard();
  showToast('Все данные сброшены');
}

// ===== SCREEN NAVIGATION =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('nav-active', b.dataset.screen === id));
  if (id === 'roulette') renderRoulette();
  if (id === 'dashboard') renderDashboard();
}

// ===== TOAST =====
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ===== WIZARD =====
let currentWizardStep = 1;

function wizardNext() {
  if (currentWizardStep < 3) {
    currentWizardStep++;
    renderWizard();
  } else {
    showScreen('roulette');
  }
}

function wizardPrev() {
  if (currentWizardStep > 1) {
    currentWizardStep--;
    renderWizard();
  }
}

function renderWizard() {
  document.querySelectorAll('.wizard-step').forEach(el => {
    const step = parseInt(el.dataset.step);
    el.classList.toggle('active', step === currentWizardStep);
    el.classList.toggle('done', step < currentWizardStep);
  });
  document.querySelectorAll('.wizard-step-line').forEach((line, i) => {
    line.classList.toggle('done', i + 1 < currentWizardStep);
  });

  document.getElementById('wizardStep1').style.display = currentWizardStep === 1 ? '' : 'none';
  document.getElementById('wizardStep2').style.display = currentWizardStep === 2 ? '' : 'none';
  document.getElementById('wizardStep3').style.display = currentWizardStep === 3 ? '' : 'none';

  const prevBtn = document.getElementById('wizardPrevBtn');
  const nextBtn = document.getElementById('wizardNextBtn');
  prevBtn.style.visibility = currentWizardStep === 1 ? 'hidden' : 'visible';
  if (currentWizardStep === 3) {
    nextBtn.innerHTML = micon('casino') + ' К рулетке!';
  } else {
    nextBtn.innerHTML = 'Далее ' + micon('arrow_forward');
  }

  renderSetup();
}

// ===== SETUP SCREEN =====
let selectedStudent = null;

function updateInputCounter() {
  const textarea = document.getElementById('studentsInput');
  const counter = document.getElementById('inputCounter');
  if (!textarea || !counter) return;
  const count = textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0).length;
  counter.textContent = count > 0 ? `— ${count} шт.` : '';
}

function addStudents() {
  const textarea = document.getElementById('studentsInput');
  const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
  if (names.length === 0) return;
  const existing = new Set([...appState.unassigned, ...appState.teams.flatMap(t => t.members)]);
  let added = 0;
  names.forEach(name => {
    if (!existing.has(name)) {
      appState.unassigned.push(name);
      existing.add(name);
      added++;
    }
  });
  textarea.value = '';
  updateInputCounter();
  saveState();
  renderSetup();
  if (added > 0) showToast(`Добавлено учеников: ${added}`);
}

function removeStudent(name) {
  appState.unassigned = appState.unassigned.filter(n => n !== name);
  appState.teams.forEach(t => { t.members = t.members.filter(n => n !== name); });
  selectedStudent = null;
  saveState();
  renderSetup();
}

function selectStudent(name) {
  selectedStudent = selectedStudent === name ? null : name;
  renderSetup();
}

function assignToTeam(teamIndex) {
  if (selectedStudent === null) return;
  appState.unassigned = appState.unassigned.filter(n => n !== selectedStudent);
  appState.teams.forEach(t => { t.members = t.members.filter(n => n !== selectedStudent); });
  appState.teams[teamIndex].members.push(selectedStudent);
  selectedStudent = null;
  saveState();
  renderSetup();
}

function moveToPool(name) {
  appState.teams.forEach(t => { t.members = t.members.filter(n => n !== name); });
  if (!appState.unassigned.includes(name)) appState.unassigned.push(name);
  saveState();
  renderSetup();
}

function setTeamCount(count) {
  appState.teamCount = count;
  while (appState.teams.length < count) {
    appState.teams.push({ id: appState.teams.length + 1, name: `Команда ${appState.teams.length + 1}`, members: [], prize: '' });
  }
  while (appState.teams.length > count) {
    const removed = appState.teams.pop();
    appState.unassigned.push(...removed.members);
  }
  saveState();
  renderSetup();
}

function autoDistribute() {
  const allStudents = [...appState.unassigned, ...appState.teams.flatMap(t => t.members)];
  if (allStudents.length === 0) return;
  for (let i = allStudents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allStudents[i], allStudents[j]] = [allStudents[j], allStudents[i]];
  }
  appState.teams.forEach(t => { t.members = []; });
  allStudents.forEach((s, i) => {
    appState.teams[i % appState.teams.length].members.push(s);
  });
  appState.unassigned = [];
  saveState();
  renderSetup();
  showToast('Ученики распределены по командам');
}

function renderStudentPool(containerId, showRemove) {
  const pool = document.getElementById(containerId);
  if (!pool) return;
  pool.innerHTML = '';
  const allStudents = [...appState.unassigned, ...appState.teams.flatMap(t => t.members)];
  const students = showRemove ? allStudents : appState.unassigned;

  if (!showRemove) {
    pool.addEventListener('dragover', e => { e.preventDefault(); pool.classList.add('drag-over'); });
    pool.addEventListener('dragleave', () => pool.classList.remove('drag-over'));
    pool.addEventListener('drop', e => {
      e.preventDefault();
      pool.classList.remove('drag-over');
      const name = e.dataTransfer.getData('text/plain');
      if (name) moveToPool(name);
    });
  }

  if (students.length === 0) {
    pool.innerHTML = `<span style="color:var(--text-secondary);font-size:14px;">${showRemove ? 'Пусто — добавьте учеников' : 'Все распределены!'}</span>`;
    return;
  }
  students.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'student-chip' + (selectedStudent === name ? ' selected' : '');
    if (showRemove) {
      chip.innerHTML = `<span>${name}</span><span class="remove-student" onclick="event.stopPropagation();removeStudent('${name.replace(/'/g, "\\'")}')">✕</span>`;
    } else {
      chip.draggable = true;
      chip.innerHTML = `<span>${name}</span>`;
      chip.onclick = () => selectStudent(name);
      chip.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', name);
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    }
    pool.appendChild(chip);
  });
}

function renderSetup() {
  // Team count selector
  const selector = document.getElementById('teamCountSelector');
  if (selector) {
    selector.innerHTML = '';
    [2, 3, 4].forEach(n => {
      const btn = document.createElement('button');
      btn.className = 'team-count-btn' + (appState.teamCount === n ? ' active' : '');
      btn.textContent = n;
      btn.onclick = () => setTeamCount(n);
      selector.appendChild(btn);
    });
  }

  while (appState.teams.length < appState.teamCount) {
    appState.teams.push({ id: appState.teams.length + 1, name: `Команда ${appState.teams.length + 1}`, members: [], prize: '' });
  }

  // Step 1: all students with remove buttons
  renderStudentPool('studentPool', true);
  const totalCount = document.getElementById('totalStudentCount');
  const allCount = appState.unassigned.length + appState.teams.reduce((s, t) => s + t.members.length, 0);
  if (totalCount) totalCount.textContent = allCount > 0 ? `— ${allCount} шт.` : '';

  // Step 2: unassigned only with selection
  renderStudentPool('studentPoolStep2', false);

  // Teams grid
  const grid = document.getElementById('teamsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  appState.teams.forEach((team, idx) => {
    const col = document.createElement('div');
    col.className = 'team-column';
    if (selectedStudent) col.style.borderColor = TEAM_COLORS_RAW[idx] + '60';
    col.onclick = () => assignToTeam(idx);

    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const name = e.dataTransfer.getData('text/plain');
      if (name) {
        appState.unassigned = appState.unassigned.filter(n => n !== name);
        appState.teams.forEach(t => { t.members = t.members.filter(n => n !== name); });
        appState.teams[idx].members.push(name);
        selectedStudent = null;
        saveState();
        renderSetup();
      }
    });

    const header = document.createElement('div');
    header.className = 'team-column-header';
    header.innerHTML = `<input class="team-name-input" value="${team.name}"
      style="color:${TEAM_COLORS_RAW[idx]}; border-color:${TEAM_COLORS_RAW[idx]}40;"
      onclick="event.stopPropagation()"
      onchange="updateTeamName(${idx}, this.value); this.blur();">
      <span class="team-member-count">${team.members.length}</span>`;
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'team-column-body';
    team.members.forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'student-chip';
      chip.style.borderColor = TEAM_COLORS_RAW[idx] + '40';
      chip.draggable = true;
      chip.innerHTML = `<span>${name}</span>`;
      chip.onclick = (e) => { e.stopPropagation(); moveToPool(name); };
      chip.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', name);
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      body.appendChild(chip);
    });
    col.appendChild(body);

    grid.appendChild(col);
  });

  renderCriteriaEditor();
}

// ===== CRITERIA EDITOR =====
function renderCriteriaEditor() {
  const body = document.getElementById('criteriaEditorBody');
  if (!body) return;
  body.innerHTML = '';
  const activeCount = getActiveCategories().length;
  body.innerHTML = `<div class="criteria-active-count">${micon('check_circle')} Активных критериев: <strong>${activeCount}</strong> из ${CATEGORIES.length}</div>`;
  CATEGORIES.forEach(cat => {
    const row = document.createElement('div');
    const enabled = appState.enabledCategories[cat] !== false;
    row.className = 'criteria-row' + (enabled ? '' : ' disabled');
    const meta = CATEGORY_META[cat];
    const items = appState.criteriaLists[cat] || [];

    let chipsHtml = items.map((item, i) =>
      `<span class="criteria-chip">${item}<span class="criteria-chip-remove" onclick="removeCriteriaItem('${cat}', ${i})">✕</span></span>`
    ).join('');

    row.innerHTML = `
      <div class="criteria-row-header">
        <label>${micon(meta.icon)} ${meta.label}</label>
        <label class="toggle-switch">
          <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleCategory('${cat}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="criteria-row-body">
        <div class="criteria-chips">${chipsHtml}</div>
        <div class="criteria-add-row">
          <input class="input" id="criteriaInput-${cat}" placeholder="Новый вариант..." onkeydown="if(event.key==='Enter'){addCriteriaItem('${cat}');event.preventDefault();}">
          <button class="btn btn-secondary btn-sm" onclick="addCriteriaItem('${cat}')">${micon('add')} Добавить</button>
        </div>
        <div class="criteria-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="restoreDefaultCriteria('${cat}')">${micon('restart_alt')} По умолч.</button>
        </div>
      </div>
    `;
    body.appendChild(row);
  });
}

function toggleCategory(cat, enabled) {
  appState.enabledCategories[cat] = enabled;
  saveState();
  renderCriteriaEditor();
}

function addCriteriaItem(cat) {
  const input = document.getElementById('criteriaInput-' + cat);
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  if (!appState.criteriaLists[cat]) appState.criteriaLists[cat] = [];
  if (appState.criteriaLists[cat].includes(value)) {
    showToast('Такой вариант уже есть');
    return;
  }
  appState.criteriaLists[cat].push(value);
  saveState();
  renderCriteriaEditor();
}

function removeCriteriaItem(cat, index) {
  appState.criteriaLists[cat].splice(index, 1);
  saveState();
  renderCriteriaEditor();
}

function restoreDefaultCriteria(cat) {
  appState.criteriaLists[cat] = [...DEFAULT_CRITERIA[cat]];
  saveState();
  renderCriteriaEditor();
  showToast(`Критерии "${CATEGORY_META[cat].label}" восстановлены`);
}

// ===== ROULETTE SCREEN =====
let currentRouletteTeam = 0;
let spinningInProgress = false;
let currentSpinCategory = 0;

function renderRoulette() {
  const content = document.getElementById('rouletteContent');
  if (appState.teams.length === 0) {
    content.innerHTML = '<div class="roulette-empty">Сначала создайте команды на экране Настройка</div>';
    return;
  }

  let html = '';

  html += '<div class="roulette-team-tabs">';
  appState.teams.forEach((team, idx) => {
    const results = appState.rouletteResults[idx];
    const active = getActiveCategories();
    const completed = results && active.every(c => results[c] && results[c].chosen);
    html += `<button class="roulette-team-tab${idx === currentRouletteTeam ? ' active' : ''}${completed ? ' completed' : ''}"
              onclick="switchRouletteTeam(${idx})">
              ${team.name}${completed ? ' ✓' : ''}</button>`;
  });
  html += '</div>';

  html += '<div class="roulette-mode-toggle">';
  html += `<button class="mode-btn${appState.rouletteMode === 'all' ? ' active' : ''}" onclick="setRouletteMode('all')">Все сразу</button>`;
  html += `<button class="mode-btn${appState.rouletteMode === 'oneByOne' ? ' active' : ''}" onclick="setRouletteMode('oneByOne')">По одному</button>`;
  html += '</div>';

  const results = appState.rouletteResults[currentRouletteTeam] || {};
  const activeCats = getActiveCategories();
  html += '<div class="reels-container" id="reelsContainer">';
  activeCats.forEach(cat => {
    const meta = CATEGORY_META[cat];
    const catResult = results[cat];
    const hasChosen = catResult && catResult.chosen;

    html += `<div class="reel-wrapper">
      <div class="reel-label">${micon(meta.icon)} ${meta.label}</div>
      <div class="reel-container${hasChosen ? ' done' : ''}" id="reel-${cat}">
        <div class="reel-strip" id="strip-${cat}">
          <div class="reel-item">${hasChosen ? catResult.chosen : '—'}</div>
        </div>
      </div>
      ${hasChosen ? `<button class="reel-respin-btn" onclick="spinOne('${cat}')">${micon('refresh')} </button>` : ''}
    </div>`;
  });
  html += '</div>';

  const allChosen = activeCats.every(c => results[c] && results[c].chosen);
  const nextUnspun = activeCats.find(c => !results[c] || !results[c].chosen);

  html += '<div class="spin-btn-container">';
  if (allChosen) {
    html += '<div style="color:var(--accent-green);font-size:24px;font-weight:600;margin-bottom:16px;">' + micon('check_circle') + ' Все критерии выбраны!</div>';
    html += `<button class="spin-btn respin" onclick="spinAll()">${micon('refresh')} Перекрутить все</button>`;
  } else if (appState.rouletteMode === 'all') {
    html += `<button class="spin-btn" id="spinBtn" onclick="spinAll()">${micon('casino')} КРУТИТЬ!</button>`;
  } else if (appState.rouletteMode === 'oneByOne' && nextUnspun) {
    const meta = CATEGORY_META[nextUnspun];
    html += `<button class="spin-btn" id="spinBtn" onclick="spinOne('${nextUnspun}')">${micon('casino')} ${micon(meta.icon)} ${meta.label}</button>`;
  }
  html += '</div>';

  content.innerHTML = html;
}

function switchRouletteTeam(idx) {
  currentRouletteTeam = idx;
  renderRoulette();
}

function setRouletteMode(mode) {
  appState.rouletteMode = mode;
  saveState();
  renderRoulette();
}

function getRandomOption(cat, teamIdx) {
  const pool = [...(appState.criteriaLists[cat] || [])];
  const chosenByOthers = new Set();
  Object.entries(appState.rouletteResults).forEach(([tid, res]) => {
    if (parseInt(tid) !== teamIdx && res[cat] && res[cat].chosen) {
      chosenByOthers.add(res[cat].chosen);
    }
  });
  const available = pool.filter(v => !chosenByOthers.has(v));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function animateReel(cat, finalText, duration) {
  return new Promise(resolve => {
    const container = document.getElementById('reel-' + cat);
    const strip = document.getElementById('strip-' + cat);
    if (!container || !strip) { resolve(); return; }

    container.classList.add('spinning');
    const items = appState.criteriaLists[cat] || [];
    const totalItems = 50;
    const pickRandom = () => items[Math.floor(Math.random() * items.length)];
    const pickDifferent = () => {
      if (items.length <= 1) return pickRandom();
      let v = pickRandom();
      let tries = 0;
      while (v === finalText && tries < 10) { v = pickRandom(); tries++; }
      return v;
    };
    let html = '';
    for (let i = 0; i < totalItems - 1; i++) {
      html += `<div class="reel-item">${pickDifferent()}</div>`;
    }
    html += `<div class="reel-item">${finalText}</div>`;
    strip.innerHTML = html;
    strip.style.transform = 'translateY(0)';
    strip.classList.remove('animating');
    strip.style.transitionTimingFunction = 'cubic-bezier(0.33, 0, 0.2, 1)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        strip.classList.add('animating');
        strip.style.transitionDuration = duration + 'ms';
        strip.style.transform = `translateY(-${(totalItems - 1) * 90}px)`;
      });
    });

    setTimeout(() => {
      container.classList.remove('spinning');
      container.classList.add('done');
      strip.classList.remove('animating');
      strip.style.transitionDuration = '';
      strip.style.transitionTimingFunction = '';
      strip.innerHTML = `<div class="reel-item">${finalText}</div>`;
      strip.style.transform = 'translateY(0)';
      resolve();
    }, duration + 50);
  });
}

async function spinAll() {
  if (spinningInProgress) return;
  spinningInProgress = true;

  if (!appState.rouletteResults[currentRouletteTeam]) {
    appState.rouletteResults[currentRouletteTeam] = {};
  }
  const results = appState.rouletteResults[currentRouletteTeam];

  const promises = getActiveCategories().map((cat, i) => {
    const chosen = getRandomOption(cat, currentRouletteTeam);
    results[cat] = { chosen };
    return animateReel(cat, chosen, 2500 + i * 300);
  });

  saveState();
  await Promise.all(promises);
  spinningInProgress = false;
  renderRoulette();

  if (getActiveCategories().every(c => results[c] && results[c].chosen)) {
    launchConfetti();
    showToast(`${appState.teams[currentRouletteTeam].name} — все критерии выбраны!`);
  }
}

async function spinOne(cat) {
  if (spinningInProgress) return;
  spinningInProgress = true;

  if (!appState.rouletteResults[currentRouletteTeam]) {
    appState.rouletteResults[currentRouletteTeam] = {};
  }

  const chosen = getRandomOption(cat, currentRouletteTeam);
  appState.rouletteResults[currentRouletteTeam][cat] = { chosen };
  saveState();

  await animateReel(cat, chosen, 2500);
  spinningInProgress = false;
  renderRoulette();

  const results = appState.rouletteResults[currentRouletteTeam];
  if (getActiveCategories().every(c => results[c] && results[c].chosen)) {
    launchConfetti();
    showToast(`${appState.teams[currentRouletteTeam].name} — все критерии выбраны!`);
  }
}

// ===== CONFETTI =====
function launchConfetti() {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#FF6B9D', '#00E5FF', '#69FF69', '#FFD700'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (6 + Math.random() * 10) + 'px';
    piece.style.height = (6 + Math.random() * 10) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    const duration = 1.5 + Math.random() * 2;
    const drift = (Math.random() - 0.5) * 200;
    piece.style.animation = `confettiFall ${duration}s ease-out forwards`;
    piece.style.setProperty('--drift', drift + 'px');
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), duration * 1000);
  }
}

// ===== DASHBOARD SCREEN =====
function renderDashboard() {
  const content = document.getElementById('dashboardContent');
  if (appState.teams.length === 0) {
    content.innerHTML = '<div class="dashboard-empty">Сначала создайте команды на экране Настройка</div>';
    return;
  }

  let html = '<div class="dashboard-grid">';
  appState.teams.forEach((team, idx) => {
    const results = appState.rouletteResults[idx] || {};
    const color = TEAM_COLORS_RAW[idx];

    html += `<div class="dashboard-card" style="border-left-color:${color};">`;
    html += `<div class="dashboard-card-name">
      <input class="input" value="${team.name}" onchange="updateTeamName(${idx}, this.value)"
             style="color:${color};">
    </div>`;

    html += '<div class="dashboard-members">';
    if (team.members.length === 0) {
      html += '<span style="color:var(--text-muted);font-size:13px;">Нет участников</span>';
    } else {
      team.members.forEach(m => {
        html += `<span class="dashboard-member">${m}</span>`;
      });
    }
    html += '</div>';

    html += '<div class="dashboard-criteria">';
    getActiveCategories().forEach(cat => {
      const catResult = results[cat];
      if (catResult && catResult.chosen) {
        const bc = BADGE_COLORS[cat];
        html += `<span class="criteria-badge" style="background:${bc.bg};border:2px solid ${bc.border};color:${bc.text};">
          ${micon(CATEGORY_META[cat].icon)} ${catResult.chosen}
        </span>`;
      }
    });
    if (!getActiveCategories().some(c => results[c] && results[c].chosen)) {
      html += '<span style="color:var(--text-muted);font-size:13px;">Критерии не выбраны</span>';
    }
    html += '</div>';

    html += `<div class="dashboard-prize-row">
      <label>${micon('redeem')} Приз:</label>
      <input class="input" value="${team.prize || ''}" placeholder="Введите приз..."
             onchange="updateTeamPrize(${idx}, this.value)">
    </div>`;

    html += `<button class="btn btn-ghost btn-sm dashboard-present-btn" onclick="showPresentation(${idx})">${micon('slideshow')} Презентация</button>`;

    html += '</div>';
  });
  html += '</div>';

  content.innerHTML = html;
}

function updateTeamName(idx, name) {
  appState.teams[idx].name = name;
  saveState();
}

function updateTeamPrize(idx, prize) {
  appState.teams[idx].prize = prize;
  saveState();
}

function showPresentation(idx) {
  const team = appState.teams[idx];
  const results = appState.rouletteResults[idx] || {};
  const color = TEAM_COLORS_RAW[idx];
  const overlay = document.getElementById('presentationOverlay');
  const contentEl = document.getElementById('presentationContent');

  let html = `<div class="presentation-team-name" style="color:${color};">${team.name}</div>`;
  html += `<div class="presentation-members">${team.members.join(' • ') || 'Нет участников'}</div>`;

  html += '<div class="presentation-criteria">';
  getActiveCategories().forEach(cat => {
    const catResult = results[cat];
    if (catResult && catResult.chosen) {
      html += `<div class="presentation-criteria-item">
        <div class="presentation-criteria-label">${micon(CATEGORY_META[cat].icon)} ${CATEGORY_META[cat].label}</div>
        <div class="presentation-criteria-value">${catResult.chosen}</div>
      </div>`;
    }
  });
  html += '</div>';

  if (team.prize) {
    html += `<div class="presentation-prize">${micon('redeem')} ${team.prize}</div>`;
  }

  contentEl.innerHTML = html;
  overlay.classList.add('active');
}

function closePresentation() {
  document.getElementById('presentationOverlay').classList.remove('active');
}

// ===== TIMER =====
let timerInterval = null;

function getTimerRemaining() {
  const t = appState.timer;
  if (t.pausedRemaining !== null) return t.pausedRemaining;
  if (t.startedAt === null) return t.durationSeconds;
  const elapsed = (Date.now() - t.startedAt) / 1000;
  return Math.max(0, t.durationSeconds - elapsed);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function adjustTimer(minutes) {
  if (appState.timer.startedAt !== null) return;
  appState.timer.durationSeconds = Math.max(60, Math.min(14400, appState.timer.durationSeconds + minutes * 60));
  appState.timer.pausedRemaining = null;
  saveState();
  updateTimerDisplay();
}

function startTimer() {
  const t = appState.timer;
  if (t.pausedRemaining !== null) {
    t.durationSeconds = t.pausedRemaining;
    t.pausedRemaining = null;
  }
  t.startedAt = Date.now();
  saveState();
  runTimerTick();
  document.getElementById('timerStartBtn').style.display = 'none';
  document.getElementById('timerPauseBtn').style.display = '';
  document.getElementById('timerSetup').style.opacity = '0.3';
  document.getElementById('timerSetup').style.pointerEvents = 'none';
}

function pauseTimer() {
  const remaining = getTimerRemaining();
  appState.timer.startedAt = null;
  appState.timer.pausedRemaining = remaining;
  saveState();
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById('timerStartBtn').style.display = '';
  document.getElementById('timerPauseBtn').style.display = 'none';
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  appState.timer.startedAt = null;
  appState.timer.pausedRemaining = null;
  saveState();
  document.getElementById('timerStartBtn').style.display = '';
  document.getElementById('timerPauseBtn').style.display = 'none';
  document.getElementById('timerSetup').style.opacity = '1';
  document.getElementById('timerSetup').style.pointerEvents = 'auto';
  updateTimerDisplay();
}

function runTimerTick() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const remaining = getTimerRemaining();
    updateTimerDisplay();
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerFinished();
    }
  }, 250);
}

function updateTimerDisplay() {
  const remaining = getTimerRemaining();
  const display = document.getElementById('timerDisplay');
  const badge = document.getElementById('navTimerBadge');
  const setupLabel = document.getElementById('timerSetupLabel');

  display.textContent = formatTime(remaining);
  setupLabel.textContent = Math.round(appState.timer.durationSeconds / 60) + ' мин';

  const total = appState.timer.durationSeconds;
  const pct = remaining / total;
  display.className = 'timer-display';
  if (remaining <= 60 && appState.timer.startedAt) {
    display.classList.add('red', 'flash');
  } else if (pct <= 0.25) {
    display.classList.add('red');
  } else if (pct <= 0.5) {
    display.classList.add('yellow');
  } else {
    display.classList.add('green');
  }

  if (appState.timer.startedAt !== null || appState.timer.pausedRemaining !== null) {
    badge.classList.add('visible');
    badge.innerHTML = micon('timer') + ' ' + formatTime(remaining);
    badge.classList.toggle('urgent', remaining <= 60);
  } else {
    badge.classList.remove('visible');
  }
}

function timerFinished() {
  appState.timer.startedAt = null;
  appState.timer.pausedRemaining = 0;
  saveState();
  document.getElementById('timerStartBtn').style.display = '';
  document.getElementById('timerPauseBtn').style.display = 'none';
  document.getElementById('timerSetup').style.opacity = '1';
  document.getElementById('timerSetup').style.pointerEvents = 'auto';

  playTimerSound();
  showToast('Время вышло!');
}

function playTimerSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6, 0.9].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = t < 0.9 ? 800 : 1200;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.15);
    });
  } catch (e) {}
}

// ===== INIT =====
appState = loadState();
renderWizard();
updateTimerDisplay();

if (appState.timer.startedAt !== null) {
  const remaining = getTimerRemaining();
  if (remaining > 0) {
    runTimerTick();
    document.getElementById('timerStartBtn').style.display = 'none';
    document.getElementById('timerPauseBtn').style.display = '';
    document.getElementById('timerSetup').style.opacity = '0.3';
    document.getElementById('timerSetup').style.pointerEvents = 'none';
  } else {
    timerFinished();
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePresentation();
});
