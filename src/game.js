// ============================================================================
// GAME.JS - Главный движок игры
// ============================================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.gameState = 'world'; // 'world', 'battle', 'menu'
        this.worldGenerator = new WorldGenerator();
        this.lootGenerator = new LootGenerator();
        this.craftSystem = new CraftSystem();

        this.player = null;
        this.world = null;
        this.currentBattle = null;
        this.currentMonsters = [];

        this.selectedCell = null;
        this.gameLog = [];

        this.init();
    }

    init() {
        Logger.log('=== Инициализация игры ===');

        // Создаем игрока
        this.player = new Player('Путник', 10, 10);

        // Генерируем мир
        this.world = this.worldGenerator.generateWorld();
        this.player.explore(this.player.x, this.player.y);

        // Устанавливаем обработчики ввода
        this.setupInput();

        // Стартовый лог
        this.addLog('Добро пожаловать в Memory World!', 'status');
        this.addLog('Исследуйте мир, сражайтесь с врагами и крафтьте предметы!', 'status');
        this.addLog('', 'status');
        this.addLog(`Начальная позиция: (${this.player.x}, ${this.player.y})`, 'info');
        this.addLog(`Текущий биом: ${this.worldGenerator.getBiomeDescription(this.world[this.player.y][this.player.x].biome)}`, 'info');

        Logger.log('Игра готова!');
    }

    setupInput() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    handleCanvasClick(event) {
        if (this.gameState === 'world') {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / CONSTANTS.CELL_SIZE);
            const y = Math.floor((event.clientY - rect.top) / CONSTANTS.CELL_SIZE);

            this.movePlayer(x, y);
        }
    }

    handleKeyPress(event) {
        switch (event.code) {
            case 'Space':
                if (this.gameState === 'world') {
                    this.addLog('Пауза', 'status');
                }
                break;

            case 'KeyS':
                this.player.save();
                this.addLog('Игра сохранена!', 'info');
                break;

            case 'KeyL':
                const saveData = Storage.load('player_save');
                if (saveData) {
                    this.player.load(saveData);
                    this.addLog('Игра загружена!', 'info');
                } else {
                    this.addLog('Сохранений не найдено!', 'error');
                }
                break;

            case 'KeyI':
                console.log(this.player.getInventoryString());
                break;

            case 'Escape':
                if (this.gameState === 'battle') {
                    this.endBattle();
                }
                break;
        }
    }

    movePlayer(targetX, targetY) {
        // Проверяем границы мира
        if (targetX < 0 || targetX >= CONSTANTS.WORLD_SIZE || 
            targetY < 0 || targetY >= CONSTANTS.WORLD_SIZE) {
            return;
        }

        // Рассчитываем расстояние
        const distance = Grid.distance(this.player.x, this.player.y, targetX, targetY);

        // Ограничиваем движение одной клеткой за раз
        if (distance <= 1) {
            this.player.x = targetX;
            this.player.y = targetY;
            this.player.explore(targetX, targetY);

            const biome = this.world[targetY][targetX];
            this.addLog(`Переместились в (${targetX}, ${targetY}) - ${this.worldGenerator.getBiomeDescription(biome.biome)}`, 'info');

            // Проверяем встречу с врагами
            this.checkEncounter(targetX, targetY);
        }
    }

    checkEncounter(x, y) {
        if (Random.chance(30)) { // 30% шанс встречи
            const encounter = this.worldGenerator.generateEncounter(x, y);
            if (encounter && encounter.monsters.length > 0) {
                this.addLog('Враги появились!', 'warning');
                this.startBattle(encounter.monsters);
            }
        }
    }

    startBattle(monsters) {
        Logger.log(`Начало боя с ${monsters.length} врагами!`);

        this.gameState = 'battle';
        this.currentMonsters = monsters;

        // Создаем боевую систему
        this.currentBattle = new BattleSystem(this.player, monsters);
        this.currentBattle.initializeBattle();

        this.addLog(`Бой начался! Враги:`, 'battle');
        for (const monster of monsters) {
            this.addLog(`  - ${monster.name} (HP: ${monster.hp}/${monster.maxHp}, Стратегия: ${monster.describeStrategy()})`, 'battle');
        }
    }

    endBattle() {
        const winner = this.currentBattle.battlefield.getWinner();

        if (winner === 'player') {
            this.addLog('🎉 Победа! Враги побеждены!', 'success');

            // Генерируем лут
            let totalGold = 0;
            let totalExperience = 0;

            for (const monster of this.currentMonsters) {
                const loot = this.lootGenerator.generateMonsterLoot(monster);
                totalGold += loot.currency.gold;
                totalExperience += loot.currency.experience;

                // Добавляем предметы
                for (const item of loot.items) {
                    this.player.addItem(item);
                }

                // Добавляем фигуры
                for (const shape of loot.shapes) {
                    this.player.addShape(shape);
                }
            }

            this.player.addGold(totalGold);
            this.player.addExperience(totalExperience);

            this.addLog(`Получено золото: ${totalGold}`, 'success');
            this.addLog(`Получен опыт: ${totalExperience}`, 'success');

            this.player.stats.battlesWon++;
        } else {
            this.addLog('💀 Поражение! Вы были побеждены!', 'error');
            this.player.stats.deaths++;
        }

        this.gameState = 'world';
        this.currentBattle = null;
        this.currentMonsters = [];
    }

    update() {
        if (this.gameState === 'battle' && this.currentBattle && this.currentBattle.isActive) {
            // Боевой цикл
            const entity = this.currentBattle.nextRound();

            if (entity && entity instanceof Monster) {
                // ИИ монстра
                const ai = new MonsterAI(entity);
                const enemies = this.currentBattle.battlefield.getAliveMonsters();
                const action = ai.decideAction(this.player, enemies, enemies);

                if (action.target) {
                    this.currentBattle.executeAction(entity, action.action, action.target);
                }
            }

            if (!this.currentBattle.isActive) {
                this.endBattle();
            }
        }
    }

    render() {
        this.ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'world') {
            this.renderWorld();
        } else if (this.gameState === 'battle') {
            this.renderBattle();
        }

        this.updateUI();
    }

    renderWorld() {
        // Рисуем карту
        for (let y = 0; y < CONSTANTS.WORLD_SIZE; y++) {
            for (let x = 0; x < CONSTANTS.WORLD_SIZE; x++) {
                const cell = this.world[y][x];
                const explored = this.player.isExplored(x, y);

                // Цвет клетки
                this.ctx.fillStyle = explored 
                    ? this.worldGenerator.getCellBiomeColor(cell.biome)
                    : '#0a0a0a';

                this.ctx.fillRect(x * CONSTANTS.CELL_SIZE, y * CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE);

                // Сетка
                this.ctx.strokeStyle = CONSTANTS.COLORS.GRID;
                this.ctx.strokeRect(x * CONSTANTS.CELL_SIZE, y * CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE);

                // Локации
                if (cell.location) {
                    this.ctx.fillStyle = '#ffaa00';
                    this.ctx.fillRect(
                        x * CONSTANTS.CELL_SIZE + 5,
                        y * CONSTANTS.CELL_SIZE + 5,
                        CONSTANTS.CELL_SIZE - 10,
                        CONSTANTS.CELL_SIZE - 10
                    );
                }
            }
        }

        // Рисуем игрока
        this.ctx.fillStyle = CONSTANTS.COLORS.PLAYER;
        this.ctx.fillRect(
            this.player.x * CONSTANTS.CELL_SIZE + 5,
            this.player.y * CONSTANTS.CELL_SIZE + 5,
            CONSTANTS.CELL_SIZE - 10,
            CONSTANTS.CELL_SIZE - 10
        );

        // Информация
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Позиция: (${this.player.x}, ${this.player.y})`, 20, this.canvas.height - 20);
        this.ctx.fillText(`Биом: ${this.worldGenerator.getBiomeDescription(this.world[this.player.y][this.player.x].biome)}`, 20, this.canvas.height - 5);
    }

    renderBattle() {
        if (!this.currentBattle) return;

        const state = this.currentBattle.getStateForRender();
        const cellSize = CONSTANTS.BATTLE_CELL_SIZE;

        // Фон боя
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, CONSTANTS.BATTLE_SIZE * cellSize, CONSTANTS.BATTLE_SIZE * cellSize);

        // Сетка боя
        this.ctx.strokeStyle = CONSTANTS.COLORS.GRID;
        for (let x = 0; x <= CONSTANTS.BATTLE_SIZE; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * cellSize, 0);
            this.ctx.lineTo(x * cellSize, CONSTANTS.BATTLE_SIZE * cellSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= CONSTANTS.BATTLE_SIZE; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * cellSize);
            this.ctx.lineTo(CONSTANTS.BATTLE_SIZE * cellSize, y * cellSize);
            this.ctx.stroke();
        }

        // Рисуем существ
        for (const entity of state.entities) {
            if (!entity.isAlive) continue;

            const x = entity.x * cellSize;
            const y = entity.y * cellSize;

            // Цвет существа
            if (entity === this.player) {
                this.ctx.fillStyle = CONSTANTS.COLORS.PLAYER;
            } else if (entity instanceof Monster) {
                this.ctx.fillStyle = CONSTANTS.COLORS.ENEMY;
            }

            // Рисуем квадрат
            this.ctx.fillRect(x + 5, y + 5, cellSize - 10, cellSize - 10);

            // HP бар
            const hpPercent = entity.hp / entity.maxHp;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(x + 5, y + cellSize - 8, (cellSize - 10) * hpPercent, 3);

            // Имя
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(entity.name, x + 10, y + 20);
        }

        // Информация боя
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Раунд: ${state.round}`, 20, CONSTANTS.BATTLE_SIZE * cellSize + 20);
        this.ctx.fillText(`Текущий ход: ${state.currentEntity?.name || 'None'}`, 20, CONSTANTS.BATTLE_SIZE * cellSize + 40);
    }

    updateUI() {
        const info = document.getElementById('game-info');
        const playerStats = document.getElementById('player-stats');

        info.innerHTML = `
            <h3>🌍 МИР</h3>
            <div class="stat-row">
                <span class="stat-label">Позиция:</span>
                <span class="stat-value">(${this.player.x}, ${this.player.y})</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Исследовано:</span>
                <span class="stat-value">${this.player.exploredCells.size}</span>
            </div>
        `;

        playerStats.innerHTML = `
            <h3>👤 ИГРОК</h3>
            <div class="stat-row">
                <span class="stat-label">Имя:</span>
                <span class="stat-value">${this.player.name}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Уровень:</span>
                <span class="stat-value">${this.player.level}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Опыт:</span>
                <span class="stat-value">${this.player.experience}/${this.player.experienceToLevel}</span>
            </div>
            <div class="hp-bar">
                <div class="hp-fill" style="width: ${(this.player.hp / this.player.maxHp) * 100}%"></div>
            </div>
            <div class="stat-row">
                <span class="stat-label">HP:</span>
                <span class="stat-value">${this.player.hp}/${this.player.maxHp}</span>
            </div>
            <div class="memory-bar">
                <div class="memory-fill" style="width: ${this.player.memory.getPercent()}%"></div>
            </div>
            <div class="stat-row">
                <span class="stat-label">Память:</span>
                <span class="stat-value">${this.player.memory.current}/${this.player.memory.capacity}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Золото:</span>
                <span class="stat-value">${this.player.gold}</span>
            </div>
        `;

        // Боевая информация
        if (this.currentBattle && this.currentBattle.isActive) {
            const battleInfo = document.getElementById('battle-info');
            let battleHtml = '<h3>⚔️ БОЙ</h3>';

            for (const monster of this.currentMonsters) {
                if (monster.isAlive) {
                    battleHtml += `
                        <div class="stat-row">
                            <span class="stat-label">${monster.name}:</span>
                            <span class="stat-value">${monster.hp}/${monster.maxHp}</span>
                        </div>
                    `;
                }
            }

            battleInfo.innerHTML = battleHtml;
        }
    }

    addLog(message, type = 'info') {
        this.gameLog.push({ message, type });
        if (this.gameLog.length > 50) {
            this.gameLog.shift();
        }
        Logger.log(`[${type.toUpperCase()}] ${message}`);
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        Logger.log('Запуск игрового цикла...');
        this.gameLoop();
    }
}

// Инициализируем игру при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    window.game.start();
    Logger.log('Игра запущена! Добро пожаловать в Memory World!');
});

Logger.log('Game Engine загружен успешно!');
