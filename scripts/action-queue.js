/**
 * Action Queue - Data structure and management for automated turn actions
 */

import { MODULE_ID, debugLog } from './main.js';

/**
 * Action types supported by the queue
 */
export const ActionType = {
  MOVEMENT: 'movement',
  ATTACK: 'attack',
  SPELL: 'spell',
  ITEM: 'item',
  BONUS_ACTION: 'bonusAction',
  REACTION: 'reaction',
  END_TURN: 'endTurn'
};

/**
 * Condition types for conditional actions
 */
export const ConditionType = {
  ALWAYS: 'always',
  TARGET_IN_RANGE: 'targetInRange',
  RESOURCE_AVAILABLE: 'resourceAvailable',
  HP_THRESHOLD: 'hpThreshold',
  ATTACK_HIT: 'attackHit',
  ATTACK_MISS: 'attackMiss',
  SAVE_SUCCESS: 'saveSuccess',
  SAVE_FAILURE: 'saveFailure',
  HAS_ADVANTAGE: 'hasAdvantage',
  HAS_DISADVANTAGE: 'hasDisadvantage'
};

/**
 * Action Queue Item
 */
export class ActionQueueItem {
  constructor(data = {}) {
    this.id = data.id || foundry.utils.randomID();
    this.type = data.type || ActionType.MOVEMENT;
    this.order = data.order ?? 0;
    this.enabled = data.enabled !== false;
    this.name = data.name || 'Untitled Action';
    this.description = data.description || '';
    
    // Conditions for execution
    this.conditions = data.conditions || {
      type: ConditionType.ALWAYS,
      value: null
    };
    
    // Action-specific data
    this.data = data.data || {};
    
    // Conditional branching
    this.onSuccess = data.onSuccess || null; // Action ID to execute on success
    this.onFailure = data.onFailure || null; // Action ID to execute on failure
  }
  
  /**
   * Convert to plain object for storage
   */
  toObject() {
    return {
      id: this.id,
      type: this.type,
      order: this.order,
      enabled: this.enabled,
      name: this.name,
      description: this.description,
      conditions: this.conditions,
      data: this.data,
      onSuccess: this.onSuccess,
      onFailure: this.onFailure
    };
  }
  
  /**
   * Create from plain object
   */
  static fromObject(obj) {
    return new ActionQueueItem(obj);
  }
}

/**
 * Movement Action Data
 */
export class MovementActionData {
  constructor(data = {}) {
    this.waypoints = data.waypoints || []; // Array of {x, y} coordinates
    this.maxDistance = data.maxDistance || null;
    this.avoidOpportunityAttacks = data.avoidOpportunityAttacks !== false;
    this.targetType = data.targetType || 'waypoint'; // waypoint, nearestEnemy, furthest, etc.
    this.targetId = data.targetId || null;
  }
}

/**
 * Attack Action Data
 */
export class AttackActionData {
  constructor(data = {}) {
    this.itemUuid = data.itemUuid || null;
    this.targetPriority = data.targetPriority || ['nearest']; // nearest, lowestHP, highestHP, etc.
    this.targetId = data.targetId || null; // Specific target
    this.advantageOverride = data.advantageOverride || null; // true, false, null (auto)
    this.consumeResource = data.consumeResource !== false;
  }
}

/**
 * Action Queue Manager
 */
export class ActionQueueManager {
  constructor() {
    this.FLAG_KEY = 'actionQueue';
  }
  
  /**
   * Get action queue for a token
   */
  getQueue(token) {
    try {
      const queueData = token.document.getFlag(MODULE_ID, this.FLAG_KEY);
      if (!queueData) return [];
      
      return queueData.actions?.map(a => ActionQueueItem.fromObject(a)) || [];
    } catch (error) {
      console.error('Token Automation Manager | Error getting action queue:', error);
      return [];
    }
  }
  
  /**
   * Set action queue for a token
   */
  async setQueue(token, actions) {
    try {
      const queueData = {
        version: '1.0.0',
        enabled: true,
        actions: actions.map(a => a.toObject())
      };
      
      await token.document.setFlag(MODULE_ID, this.FLAG_KEY, queueData);
      debugLog(`Action queue updated for ${token.name}:`, queueData);
      
      return true;
    } catch (error) {
      console.error('Token Automation Manager | Error setting action queue:', error);
      return false;
    }
  }
  
  /**
   * Add action to queue
   */
  async addAction(token, action) {
    const queue = this.getQueue(token);
    
    // Set order to be last
    action.order = queue.length;
    
    queue.push(action);
    return await this.setQueue(token, queue);
  }
  
  /**
   * Remove action from queue
   */
  async removeAction(token, actionId) {
    const queue = this.getQueue(token);
    const filtered = queue.filter(a => a.id !== actionId);
    
    // Reorder remaining actions
    filtered.forEach((a, idx) => a.order = idx);
    
    return await this.setQueue(token, filtered);
  }
  
  /**
   * Update action in queue
   */
  async updateAction(token, actionId, updates) {
    const queue = this.getQueue(token);
    const action = queue.find(a => a.id === actionId);
    
    if (!action) return false;
    
    Object.assign(action, updates);
    return await this.setQueue(token, queue);
  }
  
  /**
   * Reorder actions in queue
   */
  async reorderActions(token, actionIds) {
    const queue = this.getQueue(token);
    const reordered = [];
    
    // Build new order based on provided IDs
    actionIds.forEach((id, idx) => {
      const action = queue.find(a => a.id === id);
      if (action) {
        action.order = idx;
        reordered.push(action);
      }
    });
    
    return await this.setQueue(token, reordered);
  }
  
  /**
   * Clear all actions from queue
   */
  async clearQueue(token) {
    return await this.setQueue(token, []);
  }
  
  /**
   * Check if queue is enabled for a token
   */
  isQueueEnabled(token) {
    try {
      const queueData = token.document.getFlag(MODULE_ID, this.FLAG_KEY);
      return queueData?.enabled === true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Enable/disable queue for a token
   */
  async setQueueEnabled(token, enabled) {
    try {
      const queueData = token.document.getFlag(MODULE_ID, this.FLAG_KEY) || {
        version: '1.0.0',
        actions: []
      };
      
      queueData.enabled = enabled;
      await token.document.setFlag(MODULE_ID, this.FLAG_KEY, queueData);
      
      return true;
    } catch (error) {
      console.error('Token Automation Manager | Error toggling queue:', error);
      return false;
    }
  }
  
  /**
   * Get sorted actions (by order)
   */
  getSortedActions(token) {
    const queue = this.getQueue(token);
    return queue.sort((a, b) => a.order - b.order);
  }
  
  /**
   * Get enabled actions only
   */
  getEnabledActions(token) {
    return this.getSortedActions(token).filter(a => a.enabled);
  }
  
  /**
   * Duplicate an action
   */
  async duplicateAction(token, actionId) {
    const queue = this.getQueue(token);
    const action = queue.find(a => a.id === actionId);
    
    if (!action) return false;
    
    // Create duplicate with new ID
    const duplicate = ActionQueueItem.fromObject(action.toObject());
    duplicate.id = foundry.utils.randomID();
    duplicate.name = `${action.name} (Copy)`;
    duplicate.order = queue.length;
    
    queue.push(duplicate);
    return await this.setQueue(token, queue);
  }
  
  /**
   * Export queue to JSON
   */
  exportQueue(token) {
    const queue = this.getQueue(token);
    return JSON.stringify({
      version: '1.0.0',
      tokenName: token.name,
      actions: queue.map(a => a.toObject())
    }, null, 2);
  }
  
  /**
   * Import queue from JSON
   */
  async importQueue(token, jsonString, append = false) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.actions || !Array.isArray(data.actions)) {
        throw new Error('Invalid queue data');
      }
      
      const imported = data.actions.map(a => ActionQueueItem.fromObject(a));
      
      let queue;
      if (append) {
        queue = this.getQueue(token);
        const startOrder = queue.length;
        imported.forEach((a, idx) => {
          a.id = foundry.utils.randomID(); // New IDs
          a.order = startOrder + idx;
        });
        queue.push(...imported);
      } else {
        queue = imported;
        queue.forEach((a, idx) => {
          a.id = foundry.utils.randomID(); // New IDs
          a.order = idx;
        });
      }
      
      return await this.setQueue(token, queue);
    } catch (error) {
      console.error('Token Automation Manager | Error importing queue:', error);
      return false;
    }
  }
}
