# Token Automation Manager - Quick Start Guide

## Phase 1: Auto-Initiative (Ready to Use)

### Basic Setup (5 minutes)

1. **Install the Module**
   - Enable Token Automation Manager in your world
   - Required: lib-wrapper and socketlib
   - Recommended: MIDI QOL

2. **Enable Auto-Initiative on Tokens**
   - Right-click any token you control
   - Click the green d20 button in the Token HUD
   - The button will glow when active
   - A d20 icon will appear on the token (if visual indicators are enabled)

3. **Start Combat**
   - Add tokens to the combat tracker as normal
   - Click "Begin Combat"
   - Tokens with auto-initiative will roll automatically!

### Configuration

**Settings Location**: Game Settings → Module Settings → Token Automation Manager

**Recommended Settings:**
- ✅ Enable Visual Indicator
- ✅ Enable Sound Effects
- Roll Delay: 500ms (adjust to taste)
- ✅ Use MIDI QOL Integration (if you have MIDI QOL)

## Phase 2: Automated Turn Actions (API Ready - UI Coming Soon)

### Core Capabilities Now Available

Phase 2 backend systems are complete and functional via API. The visual editor UI is scheduled for v0.2.0, but advanced users can use the console API now.

### Using the API (Advanced Users)

#### Example 1: Create a Simple Attack Action

```javascript
// Get your token
const token = canvas.tokens.controlled[0];

// Create an action queue manager
const queueManager = game.tokenAutomation.actionQueueManager;

// Import action types
const { ActionQueueItem, ActionType, ConditionType } = game.modules.get('token-automation-manager').api;

// Create an attack action
const attackAction = new ActionQueueItem({
  name: "Attack Nearest Enemy",
  type: ActionType.ATTACK,
  conditions: {
    type: ConditionType.ALWAYS
  },
  data: {
    itemUuid: "Actor.xxx.Item.yyy", // UUID of your weapon/spell
    targetPriority: ['nearest', 'lowestHP']
  }
});

// Add to queue
await queueManager.addAction(token, attackAction);

// Enable the queue
await queueManager.setQueueEnabled(token, true);
```

#### Example 2: Movement + Attack Combo

```javascript
const token = canvas.tokens.controlled[0];
const queueManager = game.tokenAutomation.actionQueueManager;

// Create movement action
const moveAction = new ActionQueueItem({
  name: "Move to Enemy",
  type: ActionType.MOVEMENT,
  order: 0,
  data: {
    targetType: 'nearestEnemy',
    maxDistance: 30
  }
});

// Create attack action (executes after movement)
const attackAction = new ActionQueueItem({
  name: "Attack",
  type: ActionType.ATTACK,
  order: 1,
  data: {
    itemUuid: token.actor.items.getName("Longsword").uuid,
    targetPriority: ['nearest']
  }
});

// Add both actions
await queueManager.setQueue(token, [moveAction, attackAction]);
await queueManager.setQueueEnabled(token, true);
```

#### Example 3: Conditional Attack Chain

```javascript
const token = canvas.tokens.controlled[0];
const queueManager = game.tokenAutomation.actionQueueManager;

// First attack
const attack1 = new ActionQueueItem({
  name: "Main Hand Attack",
  type: ActionType.ATTACK,
  order: 0,
  data: {
    itemUuid: token.actor.items.getName("Longsword").uuid,
    targetPriority: ['nearest']
  }
});

// Second attack - only if first hit
const attack2 = new ActionQueueItem({
  name: "Off-Hand Attack",
  type: ActionType.ATTACK,
  order: 1,
  conditions: {
    type: ConditionType.ATTACK_HIT
  },
  data: {
    itemUuid: token.actor.items.getName("Shortsword").uuid,
    targetPriority: ['nearest']
  }
});

// Healing potion - only if HP low
const healAction = new ActionQueueItem({
  name: "Drink Healing Potion",
  type: ActionType.ITEM,
  order: 2,
  conditions: {
    type: ConditionType.HP_THRESHOLD,
    value: "< 50"
  },
  data: {
    itemUuid: token.actor.items.getName("Potion of Healing").uuid
  }
});

await queueManager.setQueue(token, [attack1, attack2, healAction]);
await queueManager.setQueueEnabled(token, true);
```

### Testing Your Actions

When it's your token's turn in combat:
1. The action queue will execute automatically
2. Each action is evaluated based on its conditions
3. Actions execute in order (0, 1, 2, etc.)
4. Results are logged to console (enable Debug Mode)

### API Reference

```javascript
// Queue Management
game.tokenAutomation.actionQueueManager.getQueue(token)
game.tokenAutomation.actionQueueManager.setQueue(token, actions)
game.tokenAutomation.actionQueueManager.addAction(token, action)
game.tokenAutomation.actionQueueManager.removeAction(token, actionId)
game.tokenAutomation.actionQueueManager.clearQueue(token)
game.tokenAutomation.actionQueueManager.exportQueue(token)
game.tokenAutomation.actionQueueManager.importQueue(token, jsonString)

// Movement System
game.tokenAutomation.movementSystem.startRecording(token)
game.tokenAutomation.movementSystem.stopRecording()
game.tokenAutomation.movementSystem.executeMovement(token, movementData)

// Attack System
game.tokenAutomation.attackSystem.executeAttack(token, attackData)
game.tokenAutomation.attackSystem.getValidTargets(token)

// Action Executor
game.tokenAutomation.actionExecutor.executeQueue(token, actions)
game.tokenAutomation.actionExecutor.stopExecution() // Emergency stop
game.tokenAutomation.actionExecutor.getStatus()
```

### Action Types

- `ActionType.MOVEMENT` - Move token along waypoints
- `ActionType.ATTACK` - Attack with weapon
- `ActionType.SPELL` - Cast a spell
- `ActionType.ITEM` - Use an item
- `ActionType.BONUS_ACTION` - Use bonus action
- `ActionType.REACTION` - Use reaction
- `ActionType.END_TURN` - End turn marker

### Condition Types

- `ConditionType.ALWAYS` - Always execute
- `ConditionType.TARGET_IN_RANGE` - Only if target in range
- `ConditionType.RESOURCE_AVAILABLE` - Check spell slots/resources
- `ConditionType.HP_THRESHOLD` - Based on HP percentage
- `ConditionType.ATTACK_HIT` - Only if previous attack hit
- `ConditionType.ATTACK_MISS` - Only if previous attack missed

### Target Priority Options

- `'nearest'` - Closest enemy
- `'furthest'` - Furthest enemy  
- `'lowestHP'` - Enemy with lowest HP
- `'highestHP'` - Enemy with highest HP
- `'lowestAC'` - Enemy with lowest AC
- `'highestAC'` - Enemy with highest AC

## Troubleshooting

### Actions Not Executing

1. Check that queue is enabled: `game.tokenAutomation.actionQueueManager.isQueueEnabled(token)`
2. Verify actions exist: `game.tokenAutomation.actionQueueManager.getQueue(token)`
3. Enable Debug Mode to see execution logs
4. Check that it's the token's turn in combat

### Common Issues

**"Item not found" error**
- Make sure the item UUID is correct
- Get correct UUID: `token.actor.items.getName("Item Name").uuid`

**"No valid target found" error**
- Ensure there are enemy tokens on the scene
- Check target priority settings
- Verify tokens are alive (HP > 0)

**Movement not working**
- Check waypoints are valid: `movementSystem.isPathValid(token, waypoints)`
- Verify movement distance: `movementSystem.getAvailableMovement(token)`

## What's Next?

### Coming in v0.2.0 (Action Queue Editor UI)

- Visual editor for creating action queues
- Drag-and-drop action ordering
- Form-based action configuration
- Live preview of action execution
- Template library for common patterns
- Import/export presets

### Future Enhancements

- Reaction automation (Shield, Counterspell, etc.)
- AoE targeting optimization
- Party coordination (assist allies)
- Tactical positioning AI
- Pre-combat buff automation

## Support & Community

- **Report Issues**: Enable Debug Mode and check console
- **Get Help**: Discord community (coming soon)
- **Contribute**: GitHub repository (coming soon)

---

**Remember**: TypeScript errors in console are normal and don't affect functionality. They're development warnings from missing Foundry type definitions.
