// ============================================================================
// LOOT-GENERATOR.js - Система генерации лута
// ============================================================================

class LootGenerator {
    constructor() {
        this.craftSystem = new CraftSystem();
    }

    generateMonsterLoot(monster) {
        const loot = {
            currency: {
                gold: this.generateGold(monster),
                experience: this.generateExperience(monster)
            },
            items: this.generateItems(monster),
            shapes: this.generateShapes(monster)
        };

        return loot;
    }

    generateGold(monster) {
        const baseGold = 10;
        const rarityMultiplier = [1, 1.5, 2, 3, 5];
        const multiplier = rarityMultiplier[monster.rarity] || 1;

        return Math.floor(Random.range(10, 50) * multiplier);
    }

    generateExperience(monster) {
        const baseExp = 20;
        const rarityMultiplier = [1, 1.5, 2, 3, 5];
        const multiplier = rarityMultiplier[monster.rarity] || 1;

        return Math.floor(Random.range(20, 100) * multiplier);
    }

    generateItems(monster) {
        const items = [];
        const dropChance = [0.3, 0.5, 0.7, 0.9, 1.0];
        const maxItems = [1, 1, 2, 2, 3];

        const itemChance = dropChance[monster.rarity] || 0.3;
        const count = maxItems[monster.rarity] || 1;

        if (Random.chance(itemChance * 100)) {
            for (let i = 0; i < Random.range(1, count); i++) {
                const item = this.generateRandomItem(monster.rarity);
                items.push(item);
            }
        }

        return items;
    }

    generateRandomItem(rarity) {
        const itemType = Random.pick(CONSTANTS.ITEM_TYPES);
        const finalRarity = Math.min(4, rarity + Random.range(-1, 1));

        return {
            id: `item_${Date.now()}_${Math.random()}`,
            name: NameGenerator.generateItemName(itemType, finalRarity),
            type: itemType,
            rarity: Math.max(0, finalRarity),
            stats: {
                damage: Random.range(5, 20) * (finalRarity + 1),
                defense: Random.range(2, 10) * (finalRarity + 1),
                magicResist: Random.range(0, 5) * (finalRarity + 1)
            },
            enchantments: this.generateEnchantments(finalRarity)
        };
    }

    generateShapes(monster) {
        const shapes = [];
        const shapeChance = [0.4, 0.6, 0.8, 1.0, 1.0];
        const maxShapes = [1, 1, 2, 2, 3];

        const chance = shapeChance[monster.rarity] || 0.3;
        const count = maxShapes[monster.rarity] || 1;

        if (Random.chance(chance * 100)) {
            for (let i = 0; i < Random.range(1, count); i++) {
                const shape = Random.pick(Object.values(CONSTANTS.SHAPES));
                shapes.push({
                    type: shape,
                    value: CONSTANTS.SHAPE_VALUES[shape]
                });
            }
        }

        return shapes;
    }

    generateEnchantments(rarity) {
        const enchantments = [];
        const enchantmentChance = [0.2, 0.4, 0.6, 0.8, 1.0];
        const maxEnchantments = [1, 1, 2, 2, 3];

        const chance = enchantmentChance[rarity] || 0.2;
        const max = maxEnchantments[rarity] || 1;

        if (Random.chance(chance * 100)) {
            for (let i = 0; i < Random.range(1, max); i++) {
                const enchantment = this.generateRandomEnchantment();
                enchantments.push(enchantment);
            }
        }

        return enchantments;
    }

    generateRandomEnchantment() {
        const enchantments = [
            { name: 'Пламя', effect: 'fire_damage', value: Random.range(2, 10) },
            { name: 'Холод', effect: 'ice_damage', value: Random.range(2, 10) },
            { name: 'Молния', effect: 'lightning_damage', value: Random.range(2, 10) },
            { name: 'Жизнь', effect: 'life_steal', value: Random.range(1, 5) },
            { name: 'Эхо', effect: 'echo', value: Random.range(1, 3) },
            { name: 'Свет', effect: 'light_damage', value: Random.range(2, 10) },
            { name: 'Тень', effect: 'shadow_damage', value: Random.range(2, 10) },
            { name: 'Острота', effect: 'pierce', value: Random.range(1, 5) },
            { name: 'Тяжесть', effect: 'weight', value: Random.range(1, 5) },
            { name: 'Ускорение', effect: 'haste', value: Random.range(1, 5) }
        ];

        return Random.pick(enchantments);
    }

    generateTreasure(rarity) {
        return {
            id: `treasure_${Date.now()}`,
            type: 'treasure',
            rarity,
            value: Random.range(100, 500) * (rarity + 1),
            description: `Сокровище редкости ${CONSTANTS.RARITY_NAMES[rarity]}`
        };
    }

    describeItem(item) {
        const rarityColor = CONSTANTS.RARITY_COLORS[item.rarity];
        const rarityName = CONSTANTS.RARITY_NAMES[item.rarity];

        let description = `${item.name} (${rarityName})\n`;
        description += `Тип: ${item.type}\n`;
        description += `Урон: +${item.stats.damage}\n`;
        description += `Защита: +${item.stats.defense}\n`;
        description += `Магическое сопротивление: +${item.stats.magicResist}\n`;

        if (item.enchantments && item.enchantments.length > 0) {
            description += `\nЧары:\n`;
            for (const ench of item.enchantments) {
                description += `  • ${ench.name}: +${ench.value}\n`;
            }
        }

        return description;
    }
}

Logger.log('Loot Generator загружена успешно!');
