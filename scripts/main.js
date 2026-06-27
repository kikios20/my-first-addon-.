import { world, system, EquipmentSlot } from '@minecraft/server';

const weaponState = new Map();

function getPlayerWeaponState(player) {
    const id = player.id;
    if (!weaponState.has(id)) {
        weaponState.set(id, {
            ammo: 30,
            maxAmmo: 30,
            isFiring: false,
            lastShotTime: 0
        });
    }
    return weaponState.get(id);
}

world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    weaponState.delete(player.id);
});

world.afterEvents.playerLeave.subscribe((event) => {
    weaponState.delete(event.playerId);
});

world.beforeEvents.playerAttackEntity.subscribe((event) => {
    const player = event.player;
    const item = player.getComponent('minecraft:equippable').getEquipment(EquipmentSlot.Mainhand);
    
    if (!item || item.typeId !== 'custom:assault_rifle') return;
    
    const state = getPlayerWeaponState(player);
    const now = Date.now();
    
    if (now - state.lastShotTime < 100) return;
    
    if (state.ammo <= 0) {
        player.tell('§c✗ Боеприпасы закончились!');
        return;
    }
    
    state.ammo--;
    state.lastShotTime = now;
    
    world.playSound('random.explode', player.location, {
        volume: 1.0,
        pitch: 1.2
    });
    
    player.dimension.spawnParticle('minecraft:basic_smoke_particle', player.getHeadLocation());
    player.dimension.spawnParticle('minecraft:crit', player.getHeadLocation());
    
    if (state.ammo % 10 === 0 || state.ammo < 5) {
        player.tell('§eБоеприпасы: ' + state.ammo + '/' + state.maxAmmo);
    }
});

world.afterEvents.itemUseOn.subscribe((event) => {
    const player = event.source;
    const item = player.getComponent('minecraft:equippable').getEquipment(EquipmentSlot.Mainhand);
    
    if (!item || item.typeId !== 'custom:ammunition_magazine') return;
    
    const inventory = player.getComponent('minecraft:inventory').container;
    
    for (let i = 0; i < inventory.size; i++) {
        const slotItem = inventory.getItem(i);
        if (slotItem && slotItem.typeId === 'custom:assault_rifle') {
            const state = getPlayerWeaponState(player);
            state.ammo = state.maxAmmo;
            player.tell('§a✓ Перезарядка завершена!');
            world.playSound('random.click', player.location);
            return;
        }
    }
});

console.warn('[Assault Rifle Mod] Loaded successfully!');