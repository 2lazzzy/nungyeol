# Nungyeol

Move your fingertip to draw a trail through 100,000 snow particles. Make a fist and the snow gathers into Santa riding a sleigh pulled by Rudolph, with “Merry Christmas” written above them in gold.

[Try Nungyeol in your browser](https://nungyeol.2lazzzy.com/)

## Controls

- **Webcam** — Click or tap the scene and allow camera access. Move your index finger to guide the snow, or hold up one to five fingers for half a second to choose a shape.
- **Mouse or touch** — Drag to guide the snow. Press and hold in one spot to see Santa’s sleigh.
- **Keyboard** — Press `1` for a snowman, `2` for a tree, `3` for Rudolph, `4` for a gift, or `5` for a snowflake. Press `Esc` to release the shape.
- **Music** — Open the music note to see the player, or press `M` to turn the radio on or off. The live broadcast comes from Christmas Hits Kerstradio via TuneIn. [Listen to the station](https://tunein.com/radio/Christmas-Hits-Kerstradio-s187220/)

## How it works

MediaPipe Hand Landmarker tracks your hand using a [local model](public/hand_landmarker.task). Camera frames stay in your browser. React, TypeScript, and React Three Fiber manage the Three.js scene. A [GLSL shader](src/field.glsl) updates each particle’s position and velocity on the GPU every frame through a [WebGL 2 simulation](src/simulation.ts).

## Run locally

```sh
npm install
npm run dev
```

Open [the local app](http://127.0.0.1:8138/) in a browser that supports WebGL 2.

### Test and build

```sh
npm test
npm run build
```

## License

[MIT](LICENSE)
