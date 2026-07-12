// Состояние приложения
let characters = [];
let ownedIds = JSON.parse(localStorage.getItem('ownedIds')) || [];
let selectedIds = JSON.parse(localStorage.getItem('selectedIds')) || [];

// DOM элементы
const dom = {
    grid: document.getElementById('characterGrid'),
    searchInput: document.getElementById('searchInput'),
    elementFilter: document.getElementById('elementFilter'),
    roleFilter: document.getElementById('roleFilter'),
    selectedCount: document.getElementById('selectedCount'),
    buildBtn: document.getElementById('buildTeamBtn'),
    clearSelBtn: document.getElementById('clearSelectionBtn'),
    clearFltBtn: document.getElementById('clearFiltersBtn'),
    results: document.getElementById('results'),
    teamsContainer: document.getElementById('teamsContainer'),
    selectedTeamSlots: document.getElementById('selectedTeamSlots'),
    teamHint: document.getElementById('teamHint')
};

// Инициализация
async function init() {
    try {
        const response = await fetch('data/characters.json');
        characters = await response.json();
        
        loadFilters();
        renderRoster();
        updateSelectionCount();
        renderSelectedTeam(); // Отрисовываем слоты команды при загрузке
        setupEventListeners();
    } catch (e) {
        dom.grid.innerHTML = '<p class="text-red">Ошибка загрузки данных. Убедитесь, что сайт открыт через GitHub Pages или локальный сервер.</p>';
    }
}

function saveState() {
    localStorage.setItem('ownedIds', JSON.stringify(ownedIds));
    localStorage.setItem('selectedIds', JSON.stringify(selectedIds));
}

// Сохранение значений фильтров
function saveFilters() {
    const filters = {
        search: dom.searchInput.value,
        element: dom.elementFilter.value,
        role: dom.roleFilter.value
    };
    localStorage.setItem('filtersState', JSON.stringify(filters));
}

// Загрузка значений фильтров
function loadFilters() {
    const saved = JSON.parse(localStorage.getItem('filtersState'));
    if (saved) {
        dom.searchInput.value = saved.search || '';
        dom.elementFilter.value = saved.element || 'all';
        dom.roleFilter.value = saved.role || 'all';
    } else {
        dom.searchInput.value = '';
        dom.elementFilter.value = 'all';
        dom.roleFilter.value = 'all';
    }
}

// НОВАЯ ФУНКЦИЯ: Отрисовка слотов команды
function renderSelectedTeam() {
    dom.selectedTeamSlots.innerHTML = '';
    
    // Создаем 4 слота
    for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        const charId = selectedIds[i];
        
        if (charId) {
            const char = characters.find(c => c.id === charId);
            slot.className = `team-slot`;
            // Используем цвет элемента для рамки слота, чтобы было красиво
            slot.style.borderColor = `var(--${char.element.toLowerCase()})`;
            
            slot.innerHTML = `
                <div class="team-slot-name">${char.name}</div>
                <div class="team-slot-actions">
                    <button class="small-btn">Убрать</button>
                </div>
            `;
            // Привязываем функцию удаления к кнопке
            slot.querySelector('.small-btn').onclick = () => toggleSelected(char.id);
        } else {
            slot.className = 'team-slot empty';
            slot.innerHTML = `<div class="team-slot-name">Пусто</div>`;
        }
        
        dom.selectedTeamSlots.appendChild(slot);
    }
    
    // Обновляем подсказку
    updateTeamHint();
}

// НОВАЯ ФУНКЦИЯ: Обновление подсказки
function updateTeamHint() {
    const owned = ownedIds.length;
    const selected = selectedIds.length;
    let text = '';
    
    if (owned < 4) {
        text = 'Отметьте минимум 4 персонажей в наличии, чтобы подбор работал.';
    } else if (selected === 0) {
        text = 'Можно выбрать любимого персонажа или сразу нажать подбор.';
    } else if (selected > 0 && selected < 4) {
        text = 'Оставшиеся слоты будут заполнены автоматически.';
    } else if (selected === 4) {
        text = 'Команда заполнена. Можно оценить выбранный состав.';
    }
    
    dom.teamHint.textContent = text;
}

// Отрисовка сетки персонажей
function renderRoster() {
    const search = dom.searchInput.value.toLowerCase();
    const elem = dom.elementFilter.value;
    const role = dom.roleFilter.value;

    dom.grid.innerHTML = '';
    characters.forEach(char => {
        if (search && !char.name.toLowerCase().includes(search)) return;
        if (elem !== 'all' && char.element !== elem) return;
        if (role !== 'all' && !char.roles.includes(role)) return;

        const isOwned = ownedIds.includes(char.id);
        const isSelected = selectedIds.includes(char.id);

        const card = document.createElement('div');
        card.className = `char-card ${isOwned ? 'owned' : ''} ${isSelected ? 'selected' : ''}`;
        
        // Формируем HTML карточки
        card.innerHTML = `
            <div class="avatar bg-${char.element}">${char.name.charAt(0)}</div>
            <div class="name">${char.name}</div>
            <div class="char-roles">${char.roles.join(', ')}</div>
            <div class="status">${isSelected ? 'В команде' : isOwned ? 'Есть на аккаунте' : 'Нет на аккаунте'}</div>
            <div class="card-actions"></div>
        `;

        const actionsContainer = card.querySelector('.card-actions');

        // Кнопка переключения наличия
        const btnOwned = document.createElement('button');
        btnOwned.className = `btn owned-toggle ${isOwned ? 'remove' : ''}`;
        btnOwned.textContent = isOwned ? 'Убрать с аккаунта' : 'Есть на аккаунте';
        btnOwned.onclick = () => toggleOwned(char.id);
        actionsContainer.appendChild(btnOwned);

        // Кнопка выбора в команду (только если персонаж есть на аккаунте)
        if (isOwned) {
            const btnTeam = document.createElement('button');
            btnTeam.className = `btn team-toggle ${isSelected ? 'remove' : ''}`;
            btnTeam.textContent = isSelected ? 'Убрать из команды' : 'В команду';
            btnTeam.onclick = () => toggleSelected(char.id);
            actionsContainer.appendChild(btnTeam);
        }

        dom.grid.appendChild(card);
    });
}

function toggleOwned(id) {
    if (ownedIds.includes(id)) {
        ownedIds = ownedIds.filter(i => i !== id);
        selectedIds = selectedIds.filter(i => i !== id);
        updateSelectionCount();
    } else {
        ownedIds.push(id);
    }
    saveState();
    renderRoster();
    renderSelectedTeam(); // Обновляем слоты команды
}

function toggleSelected(id) {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(i => i !== id);
    } else {
        if (selectedIds.length >= 4) {
            alert('Максимум 4 персонажа в команде!');
            return;
        }
        selectedIds.push(id);
    }
    saveState();
    updateSelectionCount();
    renderRoster();
    renderSelectedTeam(); // Обновляем слоты команды
}

function updateSelectionCount() {
    dom.selectedCount.textContent = selectedIds.length;
}

// Логика подбора
function getCombinations(array, size) {
    const result = [];
    function p(t, i) {
        if (t.length === size) { result.push(t); return; }
        if (i + 1 <= array.length) { p(t.concat(array[i]), i + 1); p(t, i + 1); }
    }
    p([], 0);
    return result;
}

function evaluateTeam(teamChars) {
    let score = 0;
    const additions = [];
    const penalties = [];
    const pros = [];
    const cons = [];

    let hasMain = false;
    let subCount = 0;
    let hasHealerShield = false;

    teamChars.forEach(c => {
        if (c.roles.includes('Main DPS')) hasMain = true;
        if (c.roles.includes('Sub DPS') || c.roles.includes('Support')) subCount++;
        if (c.roles.includes('Healer') || c.roles.includes('Shielder')) hasHealerShield = true;
    });

    if (hasMain) { score += 10; additions.push('+10: Есть основа (Main DPS)'); pros.push('Хороший источник постоянного урона.'); }
    else { penalties.push('-10: Нет Main DPS'); cons.push('Команде может не хватать урона.'); }

    if (subCount > 0) { score += 10; additions.push('+10: Есть поддержка/Sub DPS'); }
    
    if (hasHealerShield) { score += 10; additions.push('+10: Есть защита (Хил/Щит)'); pros.push('Высокая выживаемость.'); }
    else { penalties.push('-10: Нет лекаря или щитовика'); cons.push('Низкая выживаемость, уязвимы к урону.'); }

    const elements = [...new Set(teamChars.map(c => c.element))];
    if (elements.length >= 3) { score += 15; additions.push('+15: Разнообразие элементов'); }
    else { score += 5; additions.push('+5: Элементальный резонанс'); }
    if (elements.includes('Hydro') && elements.includes('Pyro')) { score += 10; additions.push('+10: Сильная реакция Пар'); pros.push('Отличный урон от реакций.'); }

    let energyNeed = 0, energyGen = 0;
    teamChars.forEach(c => { energyNeed += c.energyNeed; energyGen += c.energyGeneration; });
    if (energyGen >= energyNeed) { score += 15; additions.push('+15: Отличный баланс энергии'); pros.push('Ультимейты нажимаются по откату.'); }
    else { penalties.push('-5: Нехватка энергии'); cons.push('Могут быть проблемы с накоплением энергии.'); }

    let totalDif = 0;
    teamChars.forEach(c => {
        if (c.difficulty === 'High') totalDif += 3;
        if (c.difficulty === 'Medium') totalDif += 2;
        if (c.difficulty === 'Low') totalDif += 1;
    });
    
    if (totalDif <= 6) { score += 15; additions.push('+15: Простая ротация'); pros.push('Легко играть с телефона.'); }
    else { penalties.push('-5: Сложная ротация'); cons.push('Требует привыкания к таймингам.'); }

    score += 15;
    additions.push('+15: Базовая защита');

    penalties.forEach(p => {
        const val = parseInt(p.split(':')[0]);
        score += val;
    });

    if (score > 100) score = 100;
    if (score < 0) score = 0;

    return { score, additions, penalties, pros, cons, chars: teamChars };
}

function buildTeams() {
    if (ownedIds.length < 4) {
        alert('Отметьте хотя бы 4 персонажей "Есть на аккаунте", чтобы собрать команду!');
        return;
    }

    const availableChars = characters.filter(c => ownedIds.includes(c.id));
    const fixedChars = characters.filter(c => selectedIds.includes(c.id));
    const slotsToFill = 4 - fixedChars.length;
    
    let possibleTeams = [];

    if (slotsToFill === 0) {
        possibleTeams.push(fixedChars);
    } else {
        const pool = availableChars.filter(c => !selectedIds.includes(c.id));
        const combs = getCombinations(pool, slotsToFill);
        combs.forEach(comb => {
            possibleTeams.push([...fixedChars, ...comb]);
        });
    }

    const evaluated = possibleTeams.map(evaluateTeam);
    evaluated.sort((a, b) => b.score - a.score);
    
    displayResults(evaluated.slice(0, 3));
}

function displayResults(topTeams) {
    dom.results.classList.remove('hidden');
    dom.teamsContainer.innerHTML = '';

    topTeams.forEach((team, idx) => {
        const div = document.createElement('div');
        div.className = 'team-result';
        
        let charsHtml = team.chars.map(c => `
            <div class="team-char-mini">
                <div class="avatar bg-${c.element}">${c.name.charAt(0)}</div>
                ${c.name}
            </div>
        `).join('');

        div.innerHTML = `
            <h3>Команда ${idx + 1}</h3>
            <div class="team-score">Оценка: ${team.score}/100</div>
            <div class="team-chars">${charsHtml}</div>
            <div class="team-details">
                <strong>Плюсы:</strong>
                <ul class="text-green">${team.pros.map(p => `<li>${p}</li>`).join('') || '<li>Нет явных</li>'}</ul>
                <strong>Минусы:</strong>
                <ul class="text-red">${team.cons.map(c => `<li>${c}</li>`).join('') || '<li>Нет явных</li>'}</ul>
                <strong>Как считали плюсы:</strong>
                <ul>${team.additions.map(a => `<li>${a}</li>`).join('')}</ul>
                <strong>Штрафы:</strong>
                <ul>${team.penalties.map(p => `<li>${p}</li>`).join('') || '<li>Нет штрафов</li>'}</ul>
            </div>
        `;
        dom.teamsContainer.appendChild(div);
    });
    
    dom.results.scrollIntoView({ behavior: 'smooth' });
}

// Обработчики
function setupEventListeners() {
    dom.searchInput.addEventListener('input', () => {
        saveFilters();
        renderRoster();
    });
    
    dom.elementFilter.addEventListener('change', () => {
        saveFilters();
        renderRoster();
    });
    
    dom.roleFilter.addEventListener('change', () => {
        saveFilters();
        renderRoster();
    });
    
    dom.clearFltBtn.addEventListener('click', () => {
        dom.searchInput.value = '';
        dom.elementFilter.value = 'all';
        dom.roleFilter.value = 'all';
        saveFilters();
        renderRoster();
    });

    dom.clearSelBtn.addEventListener('click', () => {
        selectedIds = [];
        saveState();
        updateSelectionCount();
        renderRoster();
        renderSelectedTeam(); // Очищаем слоты
        dom.results.classList.add('hidden');
    });

    dom.buildBtn.addEventListener('click', buildTeams);
}

// Запуск
init();
