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
    teamsContainer: document.getElementById('teamsContainer')
};

// Инициализация
async function init() {
    try {
        const response = await fetch('data/characters.json');
        characters = await response.json();
        
        loadFilters(); // Восстанавливаем фильтры перед отрисовкой
        renderRoster();
        updateSelectionCount();
        setupEventListeners();
    } catch (e) {
        dom.grid.innerHTML = '<p class="text-red">Ошибка загрузки данных. Если вы открыли файл локально на телефоне, браузер может блокировать загрузку JSON. Используйте локальный сервер или GitHub Pages.</p>';
    }
}

function saveState() {
    localStorage.setItem('ownedIds', JSON.stringify(ownedIds));
    localStorage.setItem('selectedIds', JSON.stringify(selectedIds));
}

// Сохранение значений фильтров в localStorage
function saveFilters() {
    const filters = {
        search: dom.searchInput.value,
        element: dom.elementFilter.value,
        role: dom.roleFilter.value
    };
    localStorage.setItem('filtersState', JSON.stringify(filters));
}

// Загрузка значений фильтров из localStorage при запуске
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
        
        card.innerHTML = `
            <div class="avatar bg-${char.element}">${char.name.charAt(0)}</div>
            <div class="name">${char.name}</div>
            <div class="status">${isSelected ? 'В команде' : isOwned ? 'В наличии' : 'Нет'}</div>
        `;

        // Клик по карточке переключает наличие
        card.onclick = () => toggleOwned(char.id);
        
        // Кнопка для выбора в команду
        if (isOwned) {
            const selBtn = document.createElement('button');
            selBtn.style.marginTop = '5px';
            selBtn.style.padding = '5px';
            selBtn.style.fontSize = '12px';
            selBtn.textContent = isSelected ? 'Убрать' : 'В команду';
            selBtn.onclick = (e) => {
                e.stopPropagation(); // Не вызывать toggleOwned
                toggleSelected(char.id);
            };
            card.appendChild(selBtn);
        }

        dom.grid.appendChild(card);
    });
}

function toggleOwned(id) {
    if (ownedIds.includes(id)) {
        ownedIds = ownedIds.filter(i => i !== id);
        selectedIds = selectedIds.filter(i => i !== id); // Убираем из выбранных
        updateSelectionCount(); // Обновляем счетчик при удалении
    } else {
        ownedIds.push(id);
    }
    saveState();
    renderRoster();
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

    // Роли (макс 30)
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

    // Элементы (макс 25)
    const elements = [...new Set(teamChars.map(c => c.element))];
    if (elements.length >= 3) { score += 15; additions.push('+15: Разнообразие элементов'); }
    else { score += 5; additions.push('+5: Элементальный резонанс'); }
    if (elements.includes('Hydro') && elements.includes('Pyro')) { score += 10; additions.push('+10: Сильная реакция Пар'); pros.push('Отличный урон от реакций.'); }

    // Энергия (макс 15)
    let energyNeed = 0, energyGen = 0;
    teamChars.forEach(c => { energyNeed += c.energyNeed; energyGen += c.energyGeneration; });
    if (energyGen >= energyNeed) { score += 15; additions.push('+15: Отличный баланс энергии'); pros.push('Ультимейты нажимаются по откату.'); }
    else { penalties.push('-5: Нехватка энергии'); cons.push('Могут быть проблемы с накоплением энергии.'); }

    // Защита и удобство (макс 30)
    let totalDif = 0;
    teamChars.forEach(c => {
        if (c.difficulty === 'High') totalDif += 3;
        if (c.difficulty === 'Medium') totalDif += 2;
        if (c.difficulty === 'Low') totalDif += 1;
    });
    
    if (totalDif <= 6) { score += 15; additions.push('+15: Простая ротация'); pros.push('Легко играть с телефона.'); }
    else { penalties.push('-5: Сложная ротация'); cons.push('Требует привыкания к таймингам.'); }

    score += 15; // Базовые очки за защиту для демо-версии
    additions.push('+15: Базовая защита');

    // Применение штрафов
    penalties.forEach(p => {
        const val = parseInt(p.split(':')[0]);
        score += val; // val отрицательное
    });

    if (score > 100) score = 100;
    if (score < 0) score = 0;

    return { score, additions, penalties, pros, cons, chars: teamChars };
}

function buildTeams() {
    if (ownedIds.length < 4) {
        alert('Отметьте хотя бы 4 персонажей "В наличии", чтобы собрать команду!');
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
    
    // Прокрутка вниз к результатам
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
        dom.results.classList.add('hidden');
    });

    dom.buildBtn.addEventListener('click', buildTeams);
}

// Запуск
init();
