// ============================================================================
// WORLD-GENERATOR.js - Генератор процедурного мира
// ============================================================================

class WorldGenerator {
    constructor() {
        this.seed = Math.random();
    }

    generateWorld() {
        const world = [];

        for (let y = 0; y < CONSTANTS.WORLD_SIZE; y++) {
            const row = [];
            for (let x = 0; x < CONSTANTS.WORLD_SIZE; x++) {
                const cell = this.generateCell(x, y);
                row.push(cell);
            }
            world.push(row);
        }

        return world;
    }

    generateCell(x, y) {
        // Используем Perlin-подобный шум для генерации биомов
        const noise = this.simpleNoise(x, y);

        let biome = CONSTANTS.BIOMES.FOREST;

        if (noise < 0.2) {
            biome = CONSTANTS.BIOMES.TUNDRA;
        } else if (noise < 0.35) {
            biome = CONSTANTS.BIOMES.MOUNTAIN;
        } else if (noise < 0.5) {
            biome = CONSTANTS.BIOMES.FOREST;
        } else if (noise < 0.65) {
            biome = CONSTANTS.BIOMES.SWAMP;
        } else if (noise < 0.75) {
            biome = CONSTANTS.BIOMES.JUNGLE;
        } else if (noise < 0.85) {
            biome = CONSTANTS.BIOMES.DESERT;
        } else if (noise < 0.95) {
            biome = CONSTANTS.BIOMES.VOLCANO;
        } else {
            biome = CONSTANTS.BIOMES.DEADLANDS;
        }

        const cell = {
            x: x,
            y: y,
            biome: biome,
            location: null,
            hazard: null,
            resources: 0
        };

        // Добавляем случайные локации
        if (Random.chance(5)) {
            cell.location = {
                type: Random.pick(['city', 'dungeon', 'ruin']),
                name: NameGenerator.generateWorldLocationName()
            };
        }

        // Добавляем ресурсы
        if (Random.chance(10)) {
            cell.resources = Random.range(1, 5);
        }

        return cell;
    }

    simpleNoise(x, y) {
        // Простой псевдо-случайный генератор для создания Перлина-подобного шума
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    generateEncounter(x, y) {
        const biome = CONSTANTS.BIOMES.FOREST; // Получить из мира
        const monsterCount = Random.range(1, 3);
        const monsters = [];

        for (let i = 0; i < monsterCount; i++) {
            const monster = this.generateMonster(biome);
            monster.x = Random.range(0, CONSTANTS.BATTLE_SIZE - 1);
            monster.y = Random.range(0, CONSTANTS.BATTLE_SIZE - 1);
            monsters.push(monster);
        }

        return { monsters };
    }

    generateMonster(biome) {
        const rarity = Random.weighted([40, 30, 20, 8, 2]); // Редкость: 0-4
        const type = Random.pick(CONSTANTS.ENEMY_TYPES);
        const baseName = `${CONSTANTS.BIOME_NAMES[biome]} ${type}`;

        const baseHp = [10, 15, 20, 30, 50][rarity];
        const monster = new Monster(baseName, baseHp, rarity, type);

        return monster;
    }

    getBiomeDescription(biome) {
        return CONSTANTS.BIOME_NAMES[biome] || 'Неизвестный биом';
    }

    getCellBiomeColor(biome) {
        return CONSTANTS.BIOME_COLORS[biome] || '#808080';
    }

    getBiomeHazard(biome) {
        const hazards = {
            [CONSTANTS.BIOMES.FOREST]: 'дикие звери',
            [CONSTANTS.BIOMES.SWAMP]: 'отравленный воздух',
            [CONSTANTS.BIOMES.MOUNTAIN]: 'обвалы',
            [CONSTANTS.BIOMES.DESERT]: 'песчаные бури',
            [CONSTANTS.BIOMES.TUNDRA]: 'леденящий холод',
            [CONSTANTS.BIOMES.JUNGLE]: 'мутанты',
            [CONSTANTS.BIOMES.DEADLANDS]: 'проклятие',
            [CONSTANTS.BIOMES.VOLCANO]: 'лава'
        };
        return hazards[biome] || 'неизвестная опасность';
    }

    getDistanceToNearestCity(world, x, y) {
        let minDistance = Infinity;

        for (let cy = 0; cy < CONSTANTS.WORLD_SIZE; cy++) {
            for (let cx = 0; cx < CONSTANTS.WORLD_SIZE; cx++) {
                if (world[cy][cx].location && world[cy][cx].location.type === 'city') {
                    const distance = Grid.distance(x, y, cx, cy);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }
        }

        return minDistance;
    }

    describeCell(cell) {
        let str = `Биом: ${this.getBiomeDescription(cell.biome)}\n`;

        if (cell.location) {
            str += `Локация: ${cell.location.name} (${cell.location.type})\n`;
        }

        if (cell.resources > 0) {
            str += `Ресурсы: ${cell.resources}\n`;
        }

        str += `Опасность: ${this.getBiomeHazard(cell.biome)}`;

        return str;
    }
}

Logger.log('World Generator загружена успешно!');
