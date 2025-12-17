/**
 * Token Automation Manager - Main Entry Point
 * Phase 1: Selective Auto-Initiative
 */

import { TokenManager } from './token-manager.js';
import { CombatHooks } from './combat-hooks.js';
import { InitiativeRoller } from './initiative-roller.js';
import { UIElements } from './ui-elements.js';

// Module constants
const MODULE_ID = 'token-automation-manager';
const MODULE_TITLE = 'Token Automation Manager';

/**
 * Initialize the module
 */
Hooks.once('init', async () => {
  console.log(`${MODULE_TITLE} | Initializing module`);
  
  // Register module in global scope
  game.modules.get(MODULE_ID).api = {
    TokenManager,
    InitiativeRoller,
    MODULE_ID
  };
  
  // Register settings
  registerSettings();
  
  console.log(`${MODULE_TITLE} | Initialization complete`);
});

/**
 * Setup hook - runs after game data is available
 */
Hooks.once('setup', () => {
  console.log(`${MODULE_TITLE} | Setup phase`);
  
  // Initialize managers
  game.tokenAutomation = {
    tokenManager: new TokenManager(),
    initiativeRoller: new InitiativeRoller(),
    uiElements: new UIElements()
  };
});

/**
 * Ready hook - runs when game is fully loaded
 */
Hooks.once('ready', () => {
  console.log(`${MODULE_TITLE} | Module ready`);
  
  // Initialize combat hooks
  CombatHooks.init();
  
  // Display ready message to GM
  if (game.user.isGM) {
    ui.notifications.info(`${MODULE_TITLE} loaded successfully!`);
  }
});

/**
 * Register module settings
 */
function registerSettings() {
  // Enable visual indicators
  game.settings.register(MODULE_ID, 'enableVisualIndicator', {
    name: 'TAM.Settings.EnableVisualIndicator.Name',
    hint: 'TAM.Settings.EnableVisualIndicator.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      // Refresh all tokens when setting changes
      canvas.tokens?.placeables.forEach(t => t.refresh());
    }
  });
  
  // Enable sound notifications
  game.settings.register(MODULE_ID, 'enableSound', {
    name: 'TAM.Settings.EnableSound.Name',
    hint: 'TAM.Settings.EnableSound.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  // Auto-roll delay (in milliseconds)
  game.settings.register(MODULE_ID, 'rollDelay', {
    name: 'TAM.Settings.RollDelay.Name',
    hint: 'TAM.Settings.RollDelay.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 500,
    range: {
      min: 0,
      max: 3000,
      step: 100
    }
  });
  
  // Respect MIDI QOL settings
  game.settings.register(MODULE_ID, 'useMidiQOL', {
    name: 'TAM.Settings.UseMidiQOL.Name',
    hint: 'TAM.Settings.UseMidiQOL.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  // Debug mode
  game.settings.register(MODULE_ID, 'debugMode', {
    name: 'TAM.Settings.DebugMode.Name',
    hint: 'TAM.Settings.DebugMode.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
}

/**
 * Debug logging utility
 */
export function debugLog(...args) {
  if (game.settings.get(MODULE_ID, 'debugMode')) {
    console.log(`${MODULE_TITLE} |`, ...args);
  }
}

// Export module ID for use in other files
export { MODULE_ID, MODULE_TITLE };
