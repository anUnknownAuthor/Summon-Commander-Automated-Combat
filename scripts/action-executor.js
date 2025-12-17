/**
 * Action Executor - Executes queued actions during combat turns
 */

import { MODULE_ID, debugLog } from './main.js';
import { ActionType, ConditionType } from './action-queue.js';

export class ActionExecutor {
  constructor() {
    this.executing = false;
    this.currentWorkflow = null;
  }
  
  /**
   * Initialize combat turn hooks
   */
  init() {
    // Hook into combat turn
    Hooks.on('combatTurn', this.onCombatTurn.bind(this));
    
    debugLog('Action Executor initialized');
  }
  
  /**
   * Handle combat turn event
   */
  async onCombatTurn(combat, updateData, options) {
    // Check if it's a new turn (not just round update)
    if (!updateData.turn) return;
    
    const combatant = combat.combatant;
    if (!combatant) return;
    
    const token = combatant.token?.object;
    if (!token) return;
    
    // Check if user controls this token or is GM
    if (!token.isOwner && !game.user.isGM) return;
    
    // Check if action queue is enabled
    const queueManager = game.tokenAutomation?.actionQueueManager;
    if (!queueManager) return;
    
    if (!queueManager.isQueueEnabled(token)) return;
    
    // Get enabled actions
    const actions = queueManager.getEnabledActions(token);
    
    if (actions.length === 0) return;
    
    debugLog(`Executing ${actions.length} actions for ${token.name}`);
    
    // Execute the action queue
    await this.executeQueue(token, actions);
  }
  
  /**
   * Execute a queue of actions
   */
  async executeQueue(token, actions) {
    if (this.executing) {
      debugLog('Already executing actions, skipping');
      return;
    }
    
    this.executing = true;
    this.currentWorkflow = {
      token,
      actions,
      results: new Map(),
      context: {
        actor: token.actor,
        token: token,
        combat: game.combat
      }
    };
    
    try {
      for (const action of actions) {
        // Check if action should execute
        if (!await this.shouldExecute(action)) {
          debugLog(`Skipping action ${action.name} - condition not met`);
          continue;
        }
        
        // Execute the action
        const result = await this.executeAction(action);
        
        // Store result
        this.currentWorkflow.results.set(action.id, result);
        
        // Handle conditional branching
        if (result.success && action.onSuccess) {
          const nextAction = actions.find(a => a.id === action.onSuccess);
          if (nextAction) {
            await this.executeAction(nextAction);
          }
        } else if (!result.success && action.onFailure) {
          const nextAction = actions.find(a => a.id === action.onFailure);
          if (nextAction) {
            await this.executeAction(nextAction);
          }
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      ui.notifications.info(game.i18n.format('TAM.Notifications.ActionsExecuted', {
        name: token.name,
        count: actions.length
      }));
      
    } catch (error) {
      console.error('Token Automation Manager | Error executing action queue:', error);
      ui.notifications.error('TAM.Notifications.ActionExecutionError');
    } finally {
      this.executing = false;
      this.currentWorkflow = null;
    }
  }
  
  /**
   * Check if an action should execute based on conditions
   */
  async shouldExecute(action) {
    const condition = action.conditions;
    
    switch (condition.type) {
      case ConditionType.ALWAYS:
        return true;
        
      case ConditionType.TARGET_IN_RANGE:
        return await this.checkTargetInRange(action);
        
      case ConditionType.RESOURCE_AVAILABLE:
        return this.checkResourceAvailable(action);
        
      case ConditionType.HP_THRESHOLD:
        return this.checkHPThreshold(action);
        
      case ConditionType.ATTACK_HIT:
      case ConditionType.ATTACK_MISS:
        return this.checkPreviousAttackResult(action);
        
      default:
        return true;
    }
  }
  
  /**
   * Execute a single action
   */
  async executeAction(action) {
    debugLog(`Executing action: ${action.name} (${action.type})`);
    
    try {
      switch (action.type) {
        case ActionType.MOVEMENT:
          return await this.executeMovement(action);
          
        case ActionType.ATTACK:
          return await this.executeAttack(action);
          
        case ActionType.SPELL:
          return await this.executeSpell(action);
          
        case ActionType.ITEM:
          return await this.executeItem(action);
          
        case ActionType.END_TURN:
          return { success: true, message: 'Turn ended' };
          
        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      console.error(`Token Automation Manager | Error executing ${action.type}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute movement action
   */
  async executeMovement(action) {
    const movementSystem = game.tokenAutomation?.movementSystem;
    if (!movementSystem) {
      return { success: false, error: 'Movement system not available' };
    }
    
    return await movementSystem.executeMovement(
      this.currentWorkflow.token,
      action.data
    );
  }
  
  /**
   * Execute attack action
   */
  async executeAttack(action) {
    const attackSystem = game.tokenAutomation?.attackSystem;
    if (!attackSystem) {
      return { success: false, error: 'Attack system not available' };
    }
    
    return await attackSystem.executeAttack(
      this.currentWorkflow.token,
      action.data
    );
  }
  
  /**
   * Execute spell action
   */
  async executeSpell(action) {
    // Spells are handled similar to attacks but with spell-specific logic
    return await this.executeAttack(action);
  }
  
  /**
   * Execute item action
   */
  async executeItem(action) {
    const { itemUuid } = action.data;
    if (!itemUuid) {
      return { success: false, error: 'No item specified' };
    }
    
    const item = await fromUuid(itemUuid);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    try {
      // Use MIDI QOL if available
      if (game.modules.get('midi-qol')?.active && window.MidiQOL) {
        const options = {
          showFullCard: false,
          createWorkflow: true,
          versatile: false,
          configureDialog: false
        };
        
        await window.MidiQOL.completeItemUse(item, {}, options);
        return { success: true, message: `Used ${item.name}` };
      } else {
        // Fallback to standard item use
        await item.use();
        return { success: true, message: `Used ${item.name}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if target is in range
   */
  async checkTargetInRange(action) {
    // Implementation depends on movement/attack system
    return true; // Placeholder
  }
  
  /**
   * Check if resource is available
   */
  checkResourceAvailable(action) {
    const { value } = action.conditions;
    if (!value) return true;
    
    const actor = this.currentWorkflow.actor;
    
    // Check spell slots
    if (value.startsWith('spell-slot-')) {
      const level = parseInt(value.split('-')[2]);
      const slots = actor.system.spells[`spell${level}`];
      return slots && slots.value > 0;
    }
    
    // Check resources (primary, secondary, tertiary)
    if (value.startsWith('resource-')) {
      const resourceName = value.split('-')[1];
      const resource = actor.system.resources[resourceName];
      return resource && resource.value > 0;
    }
    
    return true;
  }
  
  /**
   * Check HP threshold
   */
  checkHPThreshold(action) {
    const { value } = action.conditions;
    if (!value) return true;
    
    const actor = this.currentWorkflow.actor;
    const hpPercent = (actor.system.attributes.hp.value / actor.system.attributes.hp.max) * 100;
    
    // Format: "< 50" or "> 75" etc.
    const match = value.match(/([<>]=?)\s*(\d+)/);
    if (!match) return true;
    
    const [, operator, threshold] = match;
    const thresholdNum = parseInt(threshold);
    
    switch (operator) {
      case '<':
        return hpPercent < thresholdNum;
      case '<=':
        return hpPercent <= thresholdNum;
      case '>':
        return hpPercent > thresholdNum;
      case '>=':
        return hpPercent >= thresholdNum;
      default:
        return true;
    }
  }
  
  /**
   * Check previous attack result
   */
  checkPreviousAttackResult(action) {
    // Look for previous attack action result
    for (const [id, result] of this.currentWorkflow.results) {
      if (result.type === 'attack') {
        if (action.conditions.type === ConditionType.ATTACK_HIT) {
          return result.hit === true;
        } else if (action.conditions.type === ConditionType.ATTACK_MISS) {
          return result.hit === false;
        }
      }
    }
    return true;
  }
  
  /**
   * Stop current execution (emergency stop)
   */
  stopExecution() {
    if (this.executing) {
      debugLog('Stopping action execution');
      this.executing = false;
      this.currentWorkflow = null;
    }
  }
  
  /**
   * Get execution status
   */
  getStatus() {
    return {
      executing: this.executing,
      currentToken: this.currentWorkflow?.token?.name || null,
      actionsCompleted: this.currentWorkflow?.results.size || 0
    };
  }
}
