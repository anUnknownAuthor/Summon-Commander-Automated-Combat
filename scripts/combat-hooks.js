/**
 * Combat Hooks - Manages combat tracker integration
 */

import { MODULE_ID, debugLog } from './main.js';

export class CombatHooks {
  /**
   * Initialize combat hooks
   */
  static init() {
    // Hook: When combat is created
    Hooks.on('createCombat', this.onCombatCreate.bind(this));
    
    // Hook: When combatants are added to combat
    Hooks.on('createCombatant', this.onCombatantCreate.bind(this));
    
    // Hook: When combat round advances
    Hooks.on('combatRound', this.onCombatRound.bind(this));
    
    // Hook: When combat starts
    Hooks.on('combatStart', this.onCombatStart.bind(this));
    
    debugLog('Combat hooks initialized');
  }
  
  /**
   * Handle combat creation
   * @param {Combat} combat - The created combat
   * @param {Object} options - Creation options
   * @param {string} userId - User who created the combat
   */
  static async onCombatCreate(combat, options, userId) {
    debugLog('Combat created:', combat.id);
    
    // Don't auto-roll on creation, wait for combatants to be added
  }
  
  /**
   * Handle combatant creation
   * @param {Combatant} combatant - The created combatant
   * @param {Object} options - Creation options
   * @param {string} userId - User who created the combatant
   */
  static async onCombatantCreate(combatant, options, userId) {
    debugLog('Combatant created:', combatant.name);
    
    // Only proceed if this is the user's action or we're the GM
    if (userId !== game.user.id && !game.user.isGM) return;
    
    const initiativeRoller = game.tokenAutomation?.initiativeRoller;
    const tokenManager = game.tokenAutomation?.tokenManager;
    
    if (!initiativeRoller || !tokenManager) return;
    
    // Check if this combatant should auto-roll
    const token = combatant.token?.object;
    if (!token) return;
    
    if (tokenManager.isAutoInitEnabled(token)) {
      // Small delay to ensure everything is set up
      setTimeout(async () => {
        const autoRollCombatants = initiativeRoller.getAutoRollCombatants(combatant.combat);
        if (autoRollCombatants.length > 0) {
          await initiativeRoller.rollForMultipleCombatants(autoRollCombatants, combatant.combat);
        }
      }, 100);
    }
  }
  
  /**
   * Handle combat round advance
   * @param {Combat} combat - The combat instance
   * @param {Object} updateData - Update data
   * @param {Object} options - Options
   */
  static async onCombatRound(combat, updateData, options) {
    debugLog('Combat round advanced:', combat.round);
    
    // Check if there are any combatants without initiative that should auto-roll
    const initiativeRoller = game.tokenAutomation?.initiativeRoller;
    if (!initiativeRoller) return;
    
    const autoRollCombatants = initiativeRoller.getAutoRollCombatants(combat);
    if (autoRollCombatants.length > 0) {
      debugLog(`Found ${autoRollCombatants.length} combatants needing auto-initiative`);
      await initiativeRoller.rollForMultipleCombatants(autoRollCombatants, combat);
    }
  }
  
  /**
   * Handle combat start
   * @param {Combat} combat - The combat instance
   * @param {Object} updateData - Update data
   */
  static async onCombatStart(combat, updateData) {
    debugLog('Combat started:', combat.id);
    
    // Roll initiative for all auto-init combatants
    const initiativeRoller = game.tokenAutomation?.initiativeRoller;
    if (!initiativeRoller) return;
    
    const autoRollCombatants = initiativeRoller.getAutoRollCombatants(combat);
    
    if (autoRollCombatants.length > 0) {
      debugLog(`Auto-rolling initiative for ${autoRollCombatants.length} combatants`);
      await initiativeRoller.rollForMultipleCombatants(autoRollCombatants, combat);
    }
  }
  
  /**
   * Manually trigger initiative roll for all auto-init tokens in current combat
   * @returns {Promise<void>}
   */
  static async rollAllAutoInitiative() {
    const combat = game.combat;
    if (!combat) {
      ui.notifications.warn('TAM.Notifications.NoCombat');
      return;
    }
    
    const initiativeRoller = game.tokenAutomation?.initiativeRoller;
    if (!initiativeRoller) return;
    
    const autoRollCombatants = initiativeRoller.getAutoRollCombatants(combat);
    
    if (autoRollCombatants.length === 0) {
      ui.notifications.info('TAM.Notifications.NoAutoInitTokens');
      return;
    }
    
    await initiativeRoller.rollForMultipleCombatants(autoRollCombatants, combat);
  }
  
  /**
   * Reset all initiative in current combat for auto-init tokens
   * @returns {Promise<void>}
   */
  static async resetAutoInitiative() {
    const combat = game.combat;
    if (!combat) {
      ui.notifications.warn('TAM.Notifications.NoCombat');
      return;
    }
    
    const tokenManager = game.tokenAutomation?.tokenManager;
    if (!tokenManager) return;
    
    const updates = [];
    
    for (const combatant of combat.combatants) {
      const token = combatant.token?.object;
      if (token && tokenManager.isAutoInitEnabled(token)) {
        updates.push({
          _id: combatant.id,
          initiative: null
        });
      }
    }
    
    if (updates.length > 0) {
      await combat.updateEmbeddedDocuments('Combatant', updates);
      ui.notifications.info(game.i18n.format('TAM.Notifications.InitiativeReset', {
        count: updates.length
      }));
    }
  }
}
