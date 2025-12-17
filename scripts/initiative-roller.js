/**
 * Initiative Roller - Handles automatic initiative rolling
 */

import { MODULE_ID, debugLog } from './main.js';

export class InitiativeRoller {
  constructor() {
    this.rolling = false;
  }
  
  /**
   * Roll initiative for a combatant
   * @param {Combatant} combatant - The combatant to roll for
   * @returns {Promise<number|null>} The rolled initiative or null
   */
  async rollForCombatant(combatant) {
    if (!combatant) return null;
    
    try {
      // Check if already has initiative
      if (combatant.initiative !== null) {
        debugLog(`Combatant ${combatant.name} already has initiative: ${combatant.initiative}`);
        return combatant.initiative;
      }
      
      // Get the initiative roll formula
      const roll = await combatant.getInitiativeRoll();
      
      if (!roll) {
        console.warn(`Token Automation Manager | Could not create initiative roll for ${combatant.name}`);
        return null;
      }
      
      // Evaluate the roll
      await roll.evaluate();
      
      debugLog(`Rolled initiative for ${combatant.name}: ${roll.total}`);
      
      return roll.total;
    } catch (error) {
      console.error('Token Automation Manager | Error rolling initiative:', error);
      return null;
    }
  }
  
  /**
   * Roll initiative for multiple combatants with delay
   * @param {Array<Combatant>} combatants - Array of combatants
   * @param {Combat} combat - The combat instance
   * @returns {Promise<void>}
   */
  async rollForMultipleCombatants(combatants, combat) {
    if (this.rolling) {
      debugLog('Already rolling initiative, skipping...');
      return;
    }
    
    this.rolling = true;
    
    try {
      const delay = game.settings.get(MODULE_ID, 'rollDelay');
      const updates = [];
      
      for (const combatant of combatants) {
        // Skip if already has initiative
        if (combatant.initiative !== null) continue;
        
        // Roll initiative
        const initiative = await this.rollForCombatant(combatant);
        
        if (initiative !== null) {
          updates.push({
            _id: combatant.id,
            initiative: initiative
          });
          
          // Add delay between rolls if configured
          if (delay > 0 && combatants.indexOf(combatant) < combatants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Batch update all initiatives
      if (updates.length > 0) {
        await combat.updateEmbeddedDocuments('Combatant', updates);
        debugLog(`Updated ${updates.length} combatant initiatives`);
        
        // Show notification
        if (game.settings.get(MODULE_ID, 'enableSound')) {
          AudioHelper.play({ src: 'sounds/dice.wav', volume: 0.5 });
        }
        
        const message = game.i18n.format('TAM.Notifications.InitiativeRolled', {
          count: updates.length
        });
        ui.notifications.info(message);
      }
    } catch (error) {
      console.error('Token Automation Manager | Error in batch initiative rolling:', error);
    } finally {
      this.rolling = false;
    }
  }
  
  /**
   * Check if MIDI QOL is active and should be used
   * @returns {boolean}
   */
  shouldUseMidiQOL() {
    const useMidi = game.settings.get(MODULE_ID, 'useMidiQOL');
    const midiActive = game.modules.get('midi-qol')?.active;
    return useMidi && midiActive;
  }
  
  /**
   * Get MIDI QOL advantage settings if available
   * @param {Actor} actor - The actor rolling initiative
   * @returns {Object} Advantage settings
   */
  getMidiAdvantageSettings(actor) {
    if (!this.shouldUseMidiQOL()) {
      return { advantage: false, disadvantage: false };
    }
    
    try {
      // Check for MIDI QOL advantage flags
      const midiFlags = actor.flags['midi-qol'] || {};
      
      return {
        advantage: midiFlags.advantage?.initiative === true,
        disadvantage: midiFlags.disadvantage?.initiative === true
      };
    } catch (error) {
      debugLog('Error getting MIDI advantage settings:', error);
      return { advantage: false, disadvantage: false };
    }
  }
  
  /**
   * Roll initiative with MIDI QOL integration if available
   * @param {Combatant} combatant - The combatant
   * @returns {Promise<number|null>}
   */
  async rollWithMidiIntegration(combatant) {
    if (!this.shouldUseMidiQOL()) {
      return this.rollForCombatant(combatant);
    }
    
    try {
      const actor = combatant.actor;
      if (!actor) return this.rollForCombatant(combatant);
      
      // Get advantage settings from MIDI
      const { advantage, disadvantage } = this.getMidiAdvantageSettings(actor);
      
      // If no advantage/disadvantage, use normal roll
      if (!advantage && !disadvantage) {
        return this.rollForCombatant(combatant);
      }
      
      // Get the roll formula
      let roll = await combatant.getInitiativeRoll();
      
      // Modify formula for advantage/disadvantage
      if (advantage && !disadvantage) {
        roll = new Roll('2d20kh + @init', actor.getRollData());
      } else if (disadvantage && !advantage) {
        roll = new Roll('2d20kl + @init', actor.getRollData());
      }
      
      await roll.evaluate();
      
      debugLog(`Rolled initiative with MIDI ${advantage ? 'advantage' : 'disadvantage'} for ${combatant.name}: ${roll.total}`);
      
      return roll.total;
    } catch (error) {
      console.error('Token Automation Manager | Error in MIDI integration:', error);
      return this.rollForCombatant(combatant);
    }
  }
  
  /**
   * Get all combatants that should auto-roll initiative
   * @param {Combat} combat - The combat instance
   * @returns {Array<Combatant>} Array of combatants to auto-roll
   */
  getAutoRollCombatants(combat) {
    if (!combat) return [];
    
    const tokenManager = game.tokenAutomation?.tokenManager;
    if (!tokenManager) return [];
    
    return combat.combatants.filter(combatant => {
      // Skip if already has initiative
      if (combatant.initiative !== null) return false;
      
      // Get the token
      const token = combatant.token?.object;
      if (!token) return false;
      
      // Check if token has auto-init enabled
      const hasAutoInit = tokenManager.isAutoInitEnabled(token);
      
      // Check permissions
      const hasPermission = combatant.isOwner || game.user.isGM;
      
      return hasAutoInit && hasPermission;
    });
  }
}
