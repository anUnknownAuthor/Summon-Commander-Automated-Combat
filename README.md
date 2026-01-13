# Token Automation Manager

A Foundry VTT module that automates token actions, starting with selective auto-initiative rolling and designed for future turn-based action automation.

## Features

### Phase 1: Selective Auto-Initiative (Current Release)

- **Selective Initiative Rolling**: Choose which tokens automatically roll initiative when combat starts
- **Token HUD Integration**: Easy toggle button on token HUD to enable/disable auto-initiative
- **Visual Indicators**: Optional d20 icon overlay on tokens with auto-initiative enabled
- **MIDI QOL Integration**: Respects MIDI QOL's advantage/disadvantage settings
- **Permission Aware**: Only rolls initiative for tokens the player controls
- **Configurable Delays**: Add delays between rolls for dramatic effect
- **Sound Effects**: Optional sound feedback when initiative is rolled
- **Batch Operations**: Enable/disable auto-initiative for multiple tokens at once

### Phase 2: Automated Turn Actions (Core Systems Complete - UI Coming Soon)

- ✅ **Pre-programmed Action Queues**: Store sequences of actions per token
- ✅ **Movement Path Recording**: Record and replay movement patterns
- ✅ **Automated Attack System**: Smart target selection with priority
- ✅ **Conditional Logic Engine**: Execute actions based on conditions (HP, resources, attack results)
- ✅ **Resource Tracking**: Validate spell slots, item uses, and resources before execution
- ✅ **Full MIDI QOL Integration**: Leverage MIDI workflows for attacks and damage
- ✅ **Manual Override**: Emergency stop and status monitoring
- 🚧 **Visual Editor UI**: Coming in v0.2.0 (currently accessible via console API)

**Note**: Phase 2 backend is fully functional. See [QUICKSTART.md](QUICKSTART.md) for API examples and usage.

## Installation

### Method 1: Module Browser (Recommended)

1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Search for "Token Automation Manager"
4. Click **Install**

### Method 2: Manifest URL

1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Paste this URL in the **Manifest URL** field:
   ```
   https://raw.githubusercontent.com/anUnknownAuthor/Summon-Commander-Automated-Combat/refs/heads/main/module.json
   ```
4. Click **Install**

## Requirements

### Required

- **Foundry VTT**: Version 12 or higher (tested on v13)
- **D&D 5e System**: Version 3.0.0 or higher
- **lib-wrapper**: Version 1.12.0 or higher
- **socketlib**: Version 1.0.0 or higher

### Recommended

- **MIDI QOL**: For advantage/disadvantage integration
- **DAE (Dynamic Active Effects)**: For future Phase 2 features

## Usage

### Enabling Auto-Initiative for Tokens

#### Method 1: Token HUD

1. Right-click on a token to open the Token HUD
2. Look for the d20 icon button in the left column
3. Click the button to toggle auto-initiative on/off
4. When enabled, the button glows green

#### Method 2: Batch Operations (GM Only)

Coming in future update - select multiple tokens and enable/disable in one action.

### Starting Combat

1. Add tokens to the combat tracker as normal
2. Click "Begin Combat" or advance the tracker
3. Tokens with auto-initiative enabled will automatically roll
4. Initiative is rolled with a configurable delay between each roll
5. If MIDI QOL is active, advantage/disadvantage is applied automatically

### Settings

Access module settings via **Game Settings → Configure Settings → Module Settings**

- **Enable Visual Indicator**: Show d20 icon on tokens with auto-init enabled
- **Enable Sound Effects**: Play dice sounds when rolling initiative
- **Roll Delay**: Milliseconds between each roll (0-3000ms)
- **Use MIDI QOL Integration**: Respect MIDI QOL advantage/disadvantage
- **Debug Mode**: Enable detailed console logging for troubleshooting

## Integration with Other Modules

### MIDI QOL

When MIDI QOL is active and "Use MIDI QOL Integration" is enabled:

- Auto-initiative respects `flags.midi-qol.advantage.initiative`
- Auto-initiative respects `flags.midi-qol.disadvantage.initiative`
- Rolls are made using MIDI's advantage system (2d20kh/2d20kl)

### DAE (Dynamic Active Effects)

Full integration planned for Phase 2. Currently, the module works alongside DAE without conflicts.

### Combat Utility Belt

Compatible - no known conflicts.

### Dice So Nice

Fully compatible - dice rolls will display with 3D dice if enabled.

## API for Module Developers

The module exposes an API for other modules to interact with:

```javascript
// Access the API
const tam = game.modules.get('token-automation-manager').api;

// Check if a token has auto-initiative enabled
const isEnabled = game.tokenAutomation.tokenManager.isAutoInitEnabled(token);

// Toggle auto-initiative for a token
await game.tokenAutomation.tokenManager.toggleAutoInit(token);

// Enable auto-initiative for a token
await game.tokenAutomation.tokenManager.enableAutoInit(token);

// Get all tokens with auto-init in current scene
const autoTokens = game.tokenAutomation.tokenManager.getAutoInitTokens();

// Manually trigger auto-roll for current combat
await game.tokenAutomation.combatHooks.rollAllAutoInitiative();
```

## Troubleshooting

### Initiative not rolling automatically

1. Check that the token has the auto-initiative flag enabled (d20 icon should be visible if indicators are enabled)
2. Verify you have permission to control the token
3. Ensure combat has been started (not just created)
4. Enable Debug Mode in settings to see console logs

### Token HUD button not appearing

1. Verify you have permission to control the token
2. Check that lib-wrapper and socketlib are installed and active
3. Try refreshing Foundry (F5)

### MIDI QOL advantage not working

1. Ensure MIDI QOL module is active
2. Enable "Use MIDI QOL Integration" in module settings
3. Verify the actor has the appropriate `flags.midi-qol.advantage.initiative` flag set

### TypeScript errors in console

These are development warnings and can be safely ignored. They don't affect functionality.

## Roadmap

### Phase 1: Auto-Initiative ✅ COMPLETE

- [x] Token flag management
- [x] Token HUD integration
- [x] Visual indicators
- [x] Combat tracker hooks
- [x] MIDI QOL integration
- [x] Settings and localization

### Phase 2: Turn Actions ✅ CORE COMPLETE

- [x] Action queue data structure
- [x] Movement path recording
- [x] Attack automation
- [x] Conditional logic engine
- [x] Resource validation
- [x] MIDI QOL workflow integration
- [ ] Queue editor UI (v0.2.0)

**Status**: Backend complete and functional via API. Visual editor UI scheduled for v0.2.0.

### Future Enhancements

- Support for other game systems
- Import/export action templates
- Party presets
- Advanced targeting options
- Integration with additional automation modules

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/token-automation-manager/issues)
- **Discord**: [Join our Discord](https://discord.gg/your-discord)
- **Documentation**: [Wiki](https://github.com/your-repo/token-automation-manager/wiki)

## Credits

### Development

- Module concept inspired by player feedback in D&D 5e games
- Built using Foundry VTT API v13
- Integration patterns learned from MIDI QOL and DAE

### Technologies

- **Foundry VTT**: Virtual tabletop platform
- **PixiJS**: WebGL rendering for visual indicators
- **lib-wrapper**: Library patching
- **socketlib**: Socket communication

### Special Thanks

- The Foundry VTT community for support and feedback
- MIDI QOL and DAE developers for integration patterns
- All beta testers and early adopters

## License

This module is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Changelog

### Version 0.1.0 (Current)

- Initial release
- Phase 1: Selective Auto-Initiative complete
- Token HUD integration
- Visual indicators
- MIDI QOL integration
- Full localization support
- Comprehensive settings

---

**Developed for Foundry VTT** | **Compatible with D&D 5e System** | **Requires v12+**
