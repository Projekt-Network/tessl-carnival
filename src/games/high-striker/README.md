# High Striker

Stop the meter dead centre to send the puck up the tower and ring the bell.

## How to play

- A marker sweeps back and forth along the meter. Click or tap to swing.
- The closer the marker is to the centre, the higher the puck climbs.
- You have 5 swings, and the marker moves 25% faster after each one.
- Clicks do nothing while the puck is moving.
- Click again on the game over screen to play another round.

## Scoring

Power runs from 1 at the centre of the meter to 0 at either end.

| Swing         | Power         | Points               |
| ------------- | ------------- | -------------------- |
| Rings bell    | 0.9 or more   | 150                  |
| Anything else | Less than 0.9 | Power × 100, rounded |

The best possible round is 750. Your final score is saved to the carnival's score
board when the last puck lands.

## Files

- `game.ts`: the game logic (`createState`, `step`, `swing`, `powerAt`,
  `scoreForPower`, `speedForSwing`, `puckHeight`) and the `highStriker` entry, the
  default export the midway finds.
- `game.test.ts`: tests for the game logic.
