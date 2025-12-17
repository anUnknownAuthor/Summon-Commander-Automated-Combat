/**
 * Movement System - Handles automated token movement
 */

import { MODULE_ID, debugLog } from './main.js';

export class MovementSystem {
  constructor() {
    this.recordingPath = false;
    this.recordedWaypoints = [];
    this.previewGraphics = null;
  }
  
  /**
   * Start recording a movement path
   */
  startRecording(token) {
    this.recordingPath = true;
    this.recordedWaypoints = [{ x: token.x, y: token.y }];
    this.recordingToken = token;
    
    // Add click listener to canvas
    canvas.stage.on('click', this._onCanvasClick.bind(this));
    
    ui.notifications.info('TAM.Notifications.MovementRecordingStart');
    debugLog('Started recording movement path');
  }
  
  /**
   * Stop recording movement path
   */
  stopRecording() {
    if (!this.recordingPath) return null;
    
    this.recordingPath = false;
    canvas.stage.off('click', this._onCanvasClick);
    
    const waypoints = [...this.recordedWaypoints];
    this.recordedWaypoints = [];
    this.recordingToken = null;
    
    // Clear preview
    this.clearPreview();
    
    ui.notifications.info('TAM.Notifications.MovementRecordingStop');
    debugLog('Stopped recording movement path', waypoints);
    
    return waypoints;
  }
  
  /**
   * Handle canvas click during recording
   */
  _onCanvasClick(event) {
    if (!this.recordingPath) return;
    
    const pos = event.data.getLocalPosition(canvas.app.stage);
    const snapped = canvas.grid.getSnappedPosition(pos.x, pos.y);
    
    this.recordedWaypoints.push(snapped);
    this.drawPreview();
    
    debugLog('Added waypoint:', snapped);
  }
  
  /**
   * Draw preview of recorded path
   */
  drawPreview() {
    this.clearPreview();
    
    if (this.recordedWaypoints.length < 2) return;
    
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(3, 0x00ff00, 0.8);
    
    // Draw line through waypoints
    graphics.moveTo(this.recordedWaypoints[0].x, this.recordedWaypoints[0].y);
    for (let i = 1; i < this.recordedWaypoints.length; i++) {
      graphics.lineTo(this.recordedWaypoints[i].x, this.recordedWaypoints[i].y);
    }
    
    // Draw waypoint markers
    for (const waypoint of this.recordedWaypoints) {
      graphics.beginFill(0x00ff00, 0.5);
      graphics.drawCircle(waypoint.x, waypoint.y, 10);
      graphics.endFill();
    }
    
    canvas.interface.grid.addChild(graphics);
    this.previewGraphics = graphics;
  }
  
  /**
   * Clear preview graphics
   */
  clearPreview() {
    if (this.previewGraphics) {
      this.previewGraphics.parent?.removeChild(this.previewGraphics);
      this.previewGraphics.destroy();
      this.previewGraphics = null;
    }
  }
  
  /**
   * Execute a movement action
   */
  async executeMovement(token, movementData) {
    const { waypoints, targetType, targetId, maxDistance, avoidOpportunityAttacks } = movementData;
    
    let destination;
    
    // Determine destination based on target type
    if (targetType === 'waypoint' && waypoints && waypoints.length > 0) {
      destination = waypoints[waypoints.length - 1];
    } else if (targetType === 'nearestEnemy') {
      destination = await this.findNearestEnemy(token);
    } else if (targetId) {
      const target = canvas.tokens.get(targetId);
      if (target) {
        destination = { x: target.x, y: target.y };
      }
    }
    
    if (!destination) {
      return { success: false, error: 'No valid destination' };
    }
    
    // Check if within maximum distance
    if (maxDistance) {
      const distance = this.calculateDistance(token, destination);
      const tokenSpeed = token.actor?.system.attributes.movement.walk || 30;
      
      if (distance > (maxDistance || tokenSpeed)) {
        return { success: false, error: 'Destination exceeds movement range' };
      }
    }
    
    try {
      // Execute the movement
      if (waypoints && waypoints.length > 1) {
        await this.moveAlongPath(token, waypoints);
      } else {
        await this.moveToDestination(token, destination);
      }
      
      return {
        success: true,
        type: 'movement',
        message: `Moved to ${destination.x}, ${destination.y}`
      };
    } catch (error) {
      console.error('Token Automation Manager | Movement execution error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Move token along a path of waypoints
   */
  async moveAlongPath(token, waypoints) {
    for (let i = 1; i < waypoints.length; i++) {
      const waypoint = waypoints[i];
      await this.animateMovement(token, waypoint);
      
      // Small delay between waypoints
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  /**
   * Move token to a single destination
   */
  async moveToDestination(token, destination) {
    return await this.animateMovement(token, destination);
  }
  
  /**
   * Animate token movement
   */
  async animateMovement(token, destination) {
    const updates = {
      x: destination.x,
      y: destination.y
    };
    
    // Use Foundry's built-in animation
    return await token.document.update(updates, { animate: true });
  }
  
  /**
   * Calculate distance between token and destination
   */
  calculateDistance(token, destination) {
    const dx = destination.x - token.x;
    const dy = destination.y - token.y;
    return Math.sqrt(dx * dx + dy * dy) / canvas.grid.size * canvas.dimensions.distance;
  }
  
  /**
   * Find nearest enemy token
   */
  async findNearestEnemy(token) {
    const tokens = canvas.tokens.placeables;
    const hostile = token.document.disposition * -1;
    
    let nearest = null;
    let minDistance = Infinity;
    
    for (const t of tokens) {
      if (t === token) continue;
      if (t.document.disposition !== hostile) continue;
      if (t.actor?.system.attributes.hp.value <= 0) continue;
      
      const distance = canvas.grid.measureDistance(token, t);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = t;
      }
    }
    
    return nearest ? { x: nearest.x, y: nearest.y } : null;
  }
  
  /**
   * Calculate path distance
   */
  calculatePathDistance(waypoints) {
    if (waypoints.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i-1].x;
      const dy = waypoints[i].y - waypoints[i-1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    return totalDistance / canvas.grid.size * canvas.dimensions.distance;
  }
  
  /**
   * Check if path is within movement range
   */
  isPathValid(token, waypoints) {
    const distance = this.calculatePathDistance(waypoints);
    const tokenSpeed = token.actor?.system.attributes.movement.walk || 30;
    return distance <= tokenSpeed;
  }
  
  /**
   * Get available movement
   */
  getAvailableMovement(token) {
    return token.actor?.system.attributes.movement.walk || 30;
  }
  
  /**
   * Check if currently recording
   */
  isRecording() {
    return this.recordingPath;
  }
}
