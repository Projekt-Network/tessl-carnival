import { describe, expect, it } from 'vitest';
import {
  FALL_TIME,
  RISE_TIME,
  SWINGS_PER_ROUND,
  createState,
  powerAt,
  puckHeight,
  scoreForPower,
  speedForSwing,
  step,
  swing,
} from './game';

const FLIGHT = RISE_TIME + FALL_TIME;

describe('high striker', () => {
  it('starts at the left of the meter with every swing left', () => {
    const state = createState();
    expect(state.position).toBe(0);
    expect(state.direction).toBe(1);
    expect(state.swingsLeft).toBe(SWINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('aiming');
  });

  it('bounces the marker off the right end', () => {
    const state = createState();
    state.position = 0.9;
    step(state, 0.25);
    expect(state.position).toBeCloseTo(0.9);
    expect(state.direction).toBe(-1);
  });

  it('bounces the marker off the left end', () => {
    const state = createState();
    state.position = 0.1;
    state.direction = -1;
    step(state, 0.25);
    expect(state.position).toBeCloseTo(0.1);
    expect(state.direction).toBe(1);
  });

  it('keeps the marker on the meter through a long step', () => {
    const state = createState();
    step(state, 10.3);
    expect(state.position).toBeGreaterThanOrEqual(0);
    expect(state.position).toBeLessThanOrEqual(1);
  });

  it('has full power at the centre and none at the ends', () => {
    expect(powerAt(0.5)).toBe(1);
    expect(powerAt(0)).toBe(0);
    expect(powerAt(1)).toBe(0);
  });

  it('rings the bell just inside the threshold on both sides', () => {
    expect(scoreForPower(powerAt(0.46))).toBe(150);
    expect(scoreForPower(powerAt(0.54))).toBe(150);
  });

  it('misses the bell just outside the threshold on both sides', () => {
    expect(scoreForPower(powerAt(0.44))).toBe(88);
    expect(scoreForPower(powerAt(0.56))).toBe(88);
  });

  it('scores a normal swing by its power, rounded', () => {
    expect(scoreForPower(0)).toBe(0);
    expect(scoreForPower(0.5)).toBe(50);
    expect(scoreForPower(0.256)).toBe(26);
  });

  it('speeds up by a quarter with each swing', () => {
    expect(speedForSwing(0)).toBeCloseTo(0.8);
    expect(speedForSwing(1)).toBeCloseTo(1);
    expect(speedForSwing(4)).toBeCloseTo(1.953, 3);
  });

  it('scores at the moment of the swing and uses up a swing', () => {
    const state = createState();
    state.position = 0.25;
    expect(swing(state)).toBe(true);
    expect(state.score).toBe(50);
    expect(state.swingsLeft).toBe(SWINGS_PER_ROUND - 1);
    expect(state.phase).toBe('flying');
  });

  it('ignores a swing while the puck is flying', () => {
    const state = createState();
    state.position = 0.25;
    swing(state);
    expect(swing(state)).toBe(false);
    expect(state.score).toBe(50);
    expect(state.swingsLeft).toBe(SWINGS_PER_ROUND - 1);
  });

  it('freezes the marker during flight, then resumes at the next speed', () => {
    const state = createState();
    state.position = 0.25;
    swing(state);
    step(state, RISE_TIME);
    expect(state.position).toBe(0.25);
    step(state, FALL_TIME);
    expect(state.phase).toBe('aiming');
    expect(state.position).toBe(0.25);
    step(state, 0.1);
    expect(state.position).toBeCloseTo(0.25 + speedForSwing(1) * 0.1);
  });

  it('lifts the puck to its power, then lands it', () => {
    const state = createState();
    state.position = 0.25;
    swing(state);
    expect(puckHeight(state)).toBe(0);
    step(state, RISE_TIME);
    expect(puckHeight(state)).toBeCloseTo(0.5);
    step(state, FALL_TIME);
    expect(puckHeight(state)).toBe(0);
  });

  it('takes the puck all the way to the bell on a ring', () => {
    const state = createState();
    state.position = 0.46;
    swing(state);
    expect(state.rang).toBe(true);
    step(state, RISE_TIME);
    expect(puckHeight(state)).toBeCloseTo(1);
  });

  it('ends the round only when the last puck lands', () => {
    const state = createState();
    for (let i = 0; i < SWINGS_PER_ROUND - 1; i++) {
      swing(state);
      step(state, FLIGHT);
      expect(state.phase).toBe('aiming');
    }
    swing(state);
    expect(state.swingsLeft).toBe(0);
    expect(state.phase).toBe('flying');
    step(state, FLIGHT - 0.01);
    expect(state.phase).toBe('flying');
    step(state, 0.01);
    expect(state.phase).toBe('over');
  });

  it('ignores a swing after the round ends', () => {
    const state = createState();
    state.phase = 'over';
    expect(swing(state)).toBe(false);
    expect(state.score).toBe(0);
  });
});
