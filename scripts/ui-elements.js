/**
 * UI Elements - Token HUD and visual indicators
 */

import { MODULE_ID, debugLog } from './main.js';

export class UIElements {
  constructor() {
    this.init();
  }
  
  /**
   * Initialize UI hooks
   */
  init() {
    // Hook: Render Token HUD
    Hooks.on('renderTokenHUD', this.onRenderTokenHUD.bind(this));
    
    // Hook: Refresh token (for visual indicators)
    Hooks.on('refreshToken', this.onRefreshToken.bind(this));
    
    debugLog('UI Elements initialized');
  }
  
  /**
   * Add auto-initiative button to Token HUD
   * @param {Application} hud - The Token HUD application
   * @param {jQuery} html - The HUD HTML
   * @param {Object} data - Token data
   */
  onRenderTokenHUD(hud, html, data) {
    const token = canvas.tokens.get(data._id);
    if (!token) return;
    
    // Check if user has permission to control this token
    if (!token.isOwner && !game.user.isGM) return;
    
    const tokenManager = game.tokenAutomation?.tokenManager;
    if (!tokenManager) return;
    
    const isEnabled = tokenManager.isAutoInitEnabled(token);
    
    // Create the button
    const button = $(`
      <div class="control-icon ${isEnabled ? 'active' : ''}" 
           title="${game.i18n.localize('TAM.HUD.ToggleAutoInit')}"
           data-action="toggle-auto-init">
        <i class="fas fa-dice-d20"></i>
      </div>
    `);
    
    // Add click handler
    button.on('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      await tokenManager.toggleAutoInit(token);
      
      // Update button appearance
      const newState = tokenManager.isAutoInitEnabled(token);
      button.toggleClass('active', newState);
    });
    
    // Insert button into HUD (left column, near top)
    const col = html.find('.col.left');
    col.prepend(button);
    
    debugLog(`Added auto-init button to ${token.name} HUD`);
  }
  
  /**
   * Add visual indicator to token when refreshed
   * @param {Token} token - The token being refreshed
   */
  onRefreshToken(token) {
    if (!game.settings.get(MODULE_ID, 'enableVisualIndicator')) return;
    
    const tokenManager = game.tokenAutomation?.tokenManager;
    if (!tokenManager) return;
    
    const isEnabled = tokenManager.isAutoInitEnabled(token);
    
    // Remove existing indicator
    this.removeIndicator(token);
    
    // Add indicator if enabled
    if (isEnabled) {
      this.addIndicator(token);
    }
  }
  
  /**
   * Add visual indicator to a token
   * @param {Token} token - The token to add indicator to
   */
  addIndicator(token) {
    if (!token.mesh) return;
    
    try {
      // Create a small icon indicator
      const indicator = new PIXI.Sprite(PIXI.Texture.from('icons/svg/d20-black.svg'));
      
      // Position in top-right corner
      indicator.width = 24;
      indicator.height = 24;
      indicator.x = token.w - 28;
      indicator.y = 4;
      
      // Add glow effect
      indicator.tint = 0x00ff00; // Green tint
      indicator.alpha = 0.8;
      
      // Add to token
      indicator.name = 'auto-init-indicator';
      token.addChild(indicator);
      
      debugLog(`Added visual indicator to ${token.name}`);
    } catch (error) {
      console.error('Token Automation Manager | Error adding indicator:', error);
    }
  }
  
  /**
   * Remove visual indicator from a token
   * @param {Token} token - The token to remove indicator from
   */
  removeIndicator(token) {
    try {
      const indicator = token.children?.find(child => child.name === 'auto-init-indicator');
      if (indicator) {
        token.removeChild(indicator);
        indicator.destroy();
        debugLog(`Removed visual indicator from ${token.name}`);
      }
    } catch (error) {
      console.error('Token Automation Manager | Error removing indicator:', error);
    }
  }
  
  /**
   * Add border highlight to token
   * @param {Token} token - The token to highlight
   * @param {number} color - Color hex value
   * @param {number} width - Border width
   */
  addBorderHighlight(token, color = 0x00ff00, width = 3) {
    if (!token.mesh) return;
    
    try {
      // Create border graphics
      const border = new PIXI.Graphics();
      border.lineStyle(width, color, 1);
      border.drawRect(0, 0, token.w, token.h);
      border.name = 'auto-init-border';
      
      token.addChild(border);
    } catch (error) {
      console.error('Token Automation Manager | Error adding border:', error);
    }
  }
  
  /**
   * Remove border highlight from token
   * @param {Token} token - The token to remove border from
   */
  removeBorderHighlight(token) {
    try {
      const border = token.children?.find(child => child.name === 'auto-init-border');
      if (border) {
        token.removeChild(border);
        border.destroy();
      }
    } catch (error) {
      console.error('Token Automation Manager | Error removing border:', error);
    }
  }
  
  /**
   * Create a status effect icon for auto-initiative
   * @returns {Object} Status effect data
   */
  static createStatusEffect() {
    return {
      id: 'auto-initiative',
      label: 'TAM.StatusEffect.AutoInitiative',
      icon: 'icons/svg/d20-black.svg',
      tint: '#00ff00'
    };
  }
  
  /**
   * Show a temporary notification above a token
   * @param {Token} token - The token
   * @param {string} message - Message to display
   * @param {string} type - Type of notification (info, success, warning, error)
   */
  static showTokenNotification(token, message, type = 'info') {
    if (!token || !canvas.scene) return;
    
    const colors = {
      info: 0x4a9eff,
      success: 0x00ff00,
      warning: 0xffaa00,
      error: 0xff0000
    };
    
    const color = colors[type] || colors.info;
    
    // Create text style
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: color,
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowDistance: 2
    });
    
    const text = new PIXI.Text(message, style);
    text.anchor.set(0.5);
    text.x = token.center.x;
    text.y = token.y - 30;
    text.alpha = 1;
    
    canvas.interface.addChild(text);
    
    // Animate and remove
    const animation = [
      {
        parent: text,
        attribute: 'alpha',
        to: 0
      },
      {
        parent: text,
        attribute: 'position.y',
        to: text.y - 50
      }
    ];
    
    CanvasAnimation.animate(animation, {
      duration: 2000,
      ontick: (dt, animation) => {},
      onfinish: () => {
        canvas.interface.removeChild(text);
        text.destroy();
      }
    });
  }
}
