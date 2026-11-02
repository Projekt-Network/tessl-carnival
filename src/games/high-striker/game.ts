import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const SWINGS_PER_ROUND = 5;
export const BASE_SPEED = 0.8;
export const SPEED_GROWTH = 1.25;
export const RISE_TIME = 0.6;
export const FALL_TIME = 0.4;
export const BELL_POWER = 0.9;
export const BELL_SCORE = 150;

const TOWER = { x: WIDTH / 2, width: 36, top: 100, bottom: 380 } as const;
const METER = { x: 150, y: 410, width: 500, height: 24 } as const;
const LABELS = ['Wimp', 'Not Bad', 'Strong', 'Hercules'];
/** The bell zone's share of the meter: power falls by 2 per unit of position. */
const BELL_ZONE = 1 - BELL_POWER;

export interface HighStrikerState {
  /** The marker on the meter, from 0 to 1. */
  position: number;
  direction: 1 | -1;
  swingsLeft: number;
  score: number;
  phase: 'aiming' | 'flying' | 'over';
  /** Seconds since the current swing. */
  flightTime: number;
  /** How high the current puck goes, from 0 to 1. */
  peak: number;
  rang: boolean;
}

export function createState(): HighStrikerState {
  return {
    position: 0,
    direction: 1,
    swingsLeft: SWINGS_PER_ROUND,
    score: 0,
    phase: 'aiming',
    flightTime: 0,
    peak: 0,
    rang: false,
  };
}

/** 1 at the centre of the meter, 0 at either end. */
export function powerAt(position: number): number {
  return 1 - Math.abs(position - 0.5) * 2;
}

export function scoreForPower(power: number): number {
  return power >= BELL_POWER ? BELL_SCORE : Math.round(power * 100);
}

/** Sweeps per second for a swing, counting from 0. */
export function speedForSwing(index: number): number {
  return BASE_SPEED * SPEED_GROWTH ** index;
}

/** Swings at the marker's position. Returns false if the puck can't go yet. */
export function swing(state: HighStrikerState): boolean {
  if (state.phase !== 'aiming') return false;
  const power = powerAt(state.position);
  state.rang = power >= BELL_POWER;
  state.peak = state.rang ? 1 : power;
  state.score += scoreForPower(power);
  state.swingsLeft -= 1;
  state.flightTime = 0;
  state.phase = 'flying';
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HighStrikerState, dt: number): void {
  if (state.phase === 'aiming') {
    const speed = speedForSwing(SWINGS_PER_ROUND - state.swingsLeft);
    state.position += state.direction * speed * dt;
    while (state.position < 0 || state.position > 1) {
      state.position = state.position < 0 ? -state.position : 2 - state.position;
      state.direction = state.direction === 1 ? -1 : 1;
    }
  } else if (state.phase === 'flying') {
    state.flightTime += dt;
    if (state.flightTime >= RISE_TIME + FALL_TIME) {
      state.phase = state.swingsLeft === 0 ? 'over' : 'aiming';
    }
  }
}

/** The puck's height for drawing, from 0 to 1. */
export function puckHeight(state: HighStrikerState): number {
  if (state.phase !== 'flying') return 0;
  const { flightTime: t, peak } = state;
  return t <= RISE_TIME ? peak * (t / RISE_TIME) : peak * (1 - (t - RISE_TIME) / FALL_TIME);
}

function draw(ctx: CanvasRenderingContext2D, state: HighStrikerState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Tower, with its height labels.
  const climb = TOWER.bottom - TOWER.top;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(TOWER.x - TOWER.width / 2, TOWER.top, TOWER.width, climb);
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'left';
  LABELS.forEach((label, i) => {
    const y = TOWER.bottom - climb * ((i + 1) / (LABELS.length + 1));
    ctx.fillStyle = colors.muted;
    ctx.fillRect(TOWER.x + TOWER.width / 2, y, 14, 2);
    ctx.fillText(label, TOWER.x + TOWER.width / 2 + 20, y + 5);
  });

  // Bell, flashing once the puck reaches it.
  const ringing = state.phase === 'flying' && state.rang && state.flightTime >= RISE_TIME;
  if (ringing) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    for (const radius of [30, 38]) {
      ctx.beginPath();
      ctx.arc(TOWER.x, TOWER.top - 20, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = ringing ? colors.stripeB : colors.accent;
  ctx.beginPath();
  ctx.arc(TOWER.x, TOWER.top - 20, 24, 0, Math.PI * 2);
  ctx.fill();

  // Puck.
  ctx.fillStyle = colors.danger;
  ctx.fillRect(TOWER.x - 24, TOWER.bottom - climb * puckHeight(state) - 8, 48, 16);

  // Meter, with the bell zone in the middle and the marker on top.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(METER.x, METER.y, METER.width, METER.height);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(
    METER.x + METER.width * (0.5 - BELL_ZONE / 2),
    METER.y,
    METER.width * BELL_ZONE,
    METER.height,
  );
  ctx.fillStyle = colors.text;
  ctx.fillRect(METER.x + METER.width * state.position - 3, METER.y - 6, 6, METER.height + 12);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Swings ${state.swingsLeft}/${SWINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Game over! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const highStriker: CarnivalGame = {
  id: 'high-striker',
  name: 'High Striker',
  description: 'Stop the meter dead centre to send the puck up the tower and ring the bell.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = () => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        swing(state);
      }
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(highStriker.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default highStriker;
