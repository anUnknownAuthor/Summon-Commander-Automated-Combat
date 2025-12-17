/**
 * Attack System - Handles automated attack execution
 */

import { MODULE_ID, debugLog } from './main.js';

export class AttackSystem {
  constructor() {
    this.lastAttackResult = null;
  }
  
  /**
   * Execute an attack action
   */
  async executeAttack(token, attackData) {
    const { itemUuid, targetPriority, targetId, advantageOverride, consumeResource } = attackData;
    
    if (!itemUuid) {
      return { success: false, error: 'No item specified' };
    }
    
    // Get the item
    const item = await fromUuid(itemUuid);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check if item can be used
    if (!this.canUseItem(item, token.actor)) {
      return { success: false, error: 'Item cannot be used (resources, charges, etc.)' };
    }
    
    // Select target
    let target;
    if (targetId) {
      target = canvas.tokens.get(targetId);
    } else if (targetPriority && targetPriority.length > 0) {
      target = await this.selectTarget(token, targetPriority);
    }
    
    if (!target) {
      return { success: false, error: 'No valid target found' };
    }
    
    // Target the token
    target.setTarget(true, { user: game.user, releaseOthers: true });
    
    try {
      let result;
      
      // Use MIDI QOL if available
      if (this.shouldUseMidiQOL()) {
        result = await this.executeMidiAttack(item, target, { advantageOverride, consumeResource });
      } else {
        result = await this.executeStandardAttack(item, target);
      }
      
      // Store result for conditional logic
      this.lastAttackResult = result;
      
      // Clear target
      target.setTarget(false, { user: game.user });
      
      return result;
    } catch (error) {
      console.error('Token Automation Manager | Attack execution error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if an item can be used
   */
  canUseItem(item, actor) {
    // Check if item has uses and they're depleted
    if (item.system.uses?.max && item.system.uses.value <= 0) {
      return false;
    }
    
    // Check spell slots for spells
    if (item.type === 'spell') {
      const spellLevel = item.system.level;
      if (spellLevel > 0) {
        const slots = actor.system.spells[`spell${spellLevel}`];
        if (!slots || slots.value <= 0) {
          return false;
        }
      }
    }
    
    // Check resource consumption
    if (item.system.consume?.type) {
      const consumeTarget = item.system.consume.target;
      if (consumeTarget) {
        // Check if resource is available
        const resourceValue = foundry.utils.getProperty(actor.system, consumeTarget);
        if (resourceValue === undefined || resourceValue <= 0) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Select target based on priority
   */
  async selectTarget(token, targetPriority) {
    const validTargets = this.getValidTargets(token);
    
    if (validTargets.length === 0) return null;
    
    for (const priority of targetPriority) {
      const target = this.selectByPriority(token, validTargets, priority);
      if (target) return target;
    }
    
    // Default to first valid target
    return validTargets[0];
  }
  
  /**
   * Get valid targets for an attack
   */
  getValidTargets(token) {
    const tokens = canvas.tokens.placeables;
    const hostile = token.document.disposition * -1;
    
    return tokens.filter(t => {
      // Skip self
      if (t === token) return false;
      
      // Check disposition (enemies only)
      if (t.document.disposition !== hostile) return false;
      
      // Check if alive
      if (t.actor?.system.attributes.hp.value <= 0) return false;
      
      // Check visibility
      if (t.document.hidden && !game.user.isGM) return false;
      
      return true;
    });
  }
  
  /**
   * Select target by priority
   */
  selectByPriority(token, targets, priority) {
    switch (priority) {
      case 'nearest':
        return this.getNearestTarget(token, targets);
        
      case 'furthest':
        return this.getFurthestTarget(token, targets);
        
      case 'lowestHP':
        return this.getLowestHPTarget(targets);
        
      case 'highestHP':
        return this.getHighestHPTarget(targets);
        
      case 'lowestAC':
        return this.getLowestACTarget(targets);
        
      case 'highestAC':
        return this.getHighestACTarget(targets);
        
      default:
        return null;
    }
  }
  
  /**
   * Get nearest target
   */
  getNearestTarget(token, targets) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const target of targets) {
      const distance = canvas.grid.measureDistance(token, target);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = target;
      }
    }
    
    return nearest;
  }
  
  /**
   * Get furthest target
   */
  getFurthestTarget(token, targets) {
    let furthest = null;
    let maxDistance = 0;
    
    for (const target of targets) {
      const distance = canvas.grid.measureDistance(token, target);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = target;
      }
    }
    
    return furthest;
  }
  
  /**
   * Get lowest HP target
   */
  getLowestHPTarget(targets) {
    return targets.reduce((lowest, target) => {
      const hp = target.actor?.system.attributes.hp.value || Infinity;
      const lowestHP = lowest?.actor?.system.attributes.hp.value || Infinity;
      return hp < lowestHP ? target : lowest;
    }, null);
  }
  
  /**
   * Get highest HP target
   */
  getHighestHPTarget(targets) {
    return targets.reduce((highest, target) => {
      const hp = target.actor?.system.attributes.hp.value || 0;
      const highestHP = highest?.actor?.system.attributes.hp.value || 0;
      return hp > highestHP ? target : highest;
    }, null);
  }
  
  /**
   * Get lowest AC target
   */
  getLowestACTarget(targets) {
    return targets.reduce((lowest, target) => {
      const ac = target.actor?.system.attributes.ac.value || Infinity;
      const lowestAC = lowest?.actor?.system.attributes.ac.value || Infinity;
      return ac < lowestAC ? target : lowest;
    }, null);
  }
  
  /**
   * Get highest AC target
   */
  getHighestACTarget(targets) {
    return targets.reduce((highest, target) => {
      const ac = target.actor?.system.attributes.ac.value || 0;
      const highestAC = highest?.actor?.system.attributes.ac.value || 0;
      return ac > highestAC ? target : highest;
    }, null);
  }
  
  /**
   * Check if MIDI QOL should be used
   */
  shouldUseMidiQOL() {
    return game.modules.get('midi-qol')?.active && window.MidiQOL;
  }
  
  /**
   * Execute attack using MIDI QOL
   */
  async executeMidiAttack(item, target, options = {}) {
    const { advantageOverride, consumeResource } = options;
    
    const workflowOptions = {
      showFullCard: false,
      createWorkflow: true,
      versatile: false,
      configureDialog: false,
      targetUuids: [target.document.uuid],
      workflowOptions: {
        autoRollAttack: true,
        autoFastAttack: true,
        autoRollDamage: 'always',
        autoFastDamage: true
      }
    };
    
    // Apply advantage override if specified
    if (advantageOverride !== null && advantageOverride !== undefined) {
      workflowOptions.workflowOptions.advantage = advantageOverride;
      workflowOptions.workflowOptions.disadvantage = !advantageOverride;
    }
    
    try {
      const workflow = await window.MidiQOL.completeItemUse(item, {}, workflowOptions);
      
      return {
        success: true,
        type: 'attack',
        hit: workflow?.hitTargets?.size > 0,
        damage: workflow?.damageTotal || 0,
        critical: workflow?.isCritical || false,
        message: `Attack with ${item.name}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute attack using standard Foundry methods
   */
  async executeStandardAttack(item, target) {
    try {
      // Roll attack if item has an attack
      if (item.hasAttack) {
        const attackRoll = await item.rollAttack();
        const targetAC = target.actor?.system.attributes.ac.value || 10;
        const hit = attackRoll.total >= targetAC;
        
        if (hit && item.hasDamage) {
          const damageRoll = await item.rollDamage();
          
          return {
            success: true,
            type: 'attack',
            hit: true,
            damage: damageRoll.total,
            critical: attackRoll.total >= (item.actor?.system.attributes.ac.value || 20),
            message: `Hit ${target.name} for ${damageRoll.total} damage`
          };
        }
        
        return {
          success: true,
          type: 'attack',
          hit: false,
          damage: 0,
          message: `Missed ${target.name}`
        };
      }
      
      // No attack roll, just use the item
      await item.use();
      return {
        success: true,
        type: 'item',
        message: `Used ${item.name}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get last attack result
   */
  getLastAttackResult() {
    return this.lastAttackResult;
  }
  
  /**
   * Clear last attack result
   */
  clearLastAttackResult() {
    this.lastAttackResult = null;
  }
}
