/**
 * Token Manager - Handles token flag management for auto-initiative
 */

import { MODULE_ID, debugLog } from './main.js';

export class TokenManager {
  constructor() {
    this.FLAG_KEY = 'autoInitiative';
  }
  
  /**
   * Check if a token has auto-initiative enabled
   * @param {Token} token - The token to check
   * @returns {boolean} True if auto-initiative is enabled
   */
  isAutoInitEnabled(token) {
    try {
      return token.document.getFlag(MODULE_ID, this.FLAG_KEY) === true;
    } catch (error) {
      console.error('Token Automation Manager | Error checking auto-init flag:', error);
      return false;
    }
  }
  
  /**
   * Toggle auto-initiative for a token
   * @param {Token} token - The token to toggle
   * @returns {Promise<boolean>} New state of auto-initiative
   */
  async toggleAutoInit(token) {
    const currentState = this.isAutoInitEnabled(token);
    const newState = !currentState;
    
    try {
      await token.document.setFlag(MODULE_ID, this.FLAG_KEY, newState);
      debugLog(`Auto-initiative ${newState ? 'enabled' : 'disabled'} for token: ${token.name}`);
      
      // Refresh token to update visual indicator
      token.refresh();
      
      // Show notification
      const message = game.i18n.format(`TAM.Notifications.${newState ? 'Enabled' : 'Disabled'}`, {
        name: token.name
      });
      ui.notifications.info(message);
      
      return newState;
    } catch (error) {
      console.error('Token Automation Manager | Error toggling auto-init:', error);
      ui.notifications.error('TAM.Notifications.Error');
      return currentState;
    }
  }
  
  /**
   * Enable auto-initiative for a token
   * @param {Token} token - The token to enable
   * @returns {Promise<void>}
   */
  async enableAutoInit(token) {
    if (!this.isAutoInitEnabled(token)) {
      await token.document.setFlag(MODULE_ID, this.FLAG_KEY, true);
      token.refresh();
      debugLog(`Auto-initiative enabled for token: ${token.name}`);
    }
  }
  
  /**
   * Disable auto-initiative for a token
   * @param {Token} token - The token to disable
   * @returns {Promise<void>}
   */
  async disableAutoInit(token) {
    if (this.isAutoInitEnabled(token)) {
      await token.document.setFlag(MODULE_ID, this.FLAG_KEY, false);
      token.refresh();
      debugLog(`Auto-initiative disabled for token: ${token.name}`);
    }
  }
  
  /**
   * Get all tokens with auto-initiative enabled in a scene
   * @param {Scene} scene - The scene to search (defaults to current scene)
   * @returns {Array<Token>} Array of tokens with auto-init enabled
   */
  getAutoInitTokens(scene = canvas.scene) {
    if (!scene) return [];
    
    return scene.tokens
      .filter(tokenDoc => {
        // Check if token has auto-init flag
        const hasFlag = tokenDoc.getFlag(MODULE_ID, this.FLAG_KEY) === true;
        
        // Check if current user has permission to control the token
        const hasPermission = tokenDoc.isOwner || game.user.isGM;
        
        return hasFlag && hasPermission;
      })
      .map(tokenDoc => tokenDoc.object)
      .filter(token => token); // Filter out null tokens
  }
  
  /**
   * Get all tokens with auto-initiative enabled for the current user
   * @returns {Array<Token>} Array of controlled tokens with auto-init enabled
   */
  getPlayerAutoInitTokens() {
    if (!canvas.scene) return [];
    
    return canvas.scene.tokens
      .filter(tokenDoc => {
        const hasFlag = tokenDoc.getFlag(MODULE_ID, this.FLAG_KEY) === true;
        const isControlled = tokenDoc.isOwner;
        return hasFlag && isControlled;
      })
      .map(tokenDoc => tokenDoc.object)
      .filter(token => token);
  }
  
  /**
   * Batch enable/disable auto-initiative for multiple tokens
   * @param {Array<Token>} tokens - Tokens to update
   * @param {boolean} enabled - Enable or disable
   * @returns {Promise<void>}
   */
  async batchSetAutoInit(tokens, enabled) {
    const updates = [];
    
    for (const token of tokens) {
      if (!token.isOwner && !game.user.isGM) continue;
      
      updates.push({
        _id: token.id,
        [`flags.${MODULE_ID}.${this.FLAG_KEY}`]: enabled
      });
    }
    
    if (updates.length > 0) {
      await canvas.scene.updateEmbeddedDocuments('Token', updates);
      debugLog(`Batch ${enabled ? 'enabled' : 'disabled'} auto-init for ${updates.length} tokens`);
      
      // Refresh all affected tokens
      tokens.forEach(t => t.refresh());
    }
  }
  
  /**
   * Clear auto-initiative flag from all tokens in a scene
   * @param {Scene} scene - The scene to clear (defaults to current scene)
   * @returns {Promise<void>}
   */
  async clearAllAutoInit(scene = canvas.scene) {
    if (!scene) return;
    
    const updates = scene.tokens
      .filter(tokenDoc => tokenDoc.getFlag(MODULE_ID, this.FLAG_KEY) === true)
      .map(tokenDoc => ({
        _id: tokenDoc.id,
        [`flags.${MODULE_ID}.-=${this.FLAG_KEY}`]: null
      }));
    
    if (updates.length > 0) {
      await scene.updateEmbeddedDocuments('Token', updates);
      debugLog(`Cleared auto-init from ${updates.length} tokens`);
    }
  }
}
