# Deadwatch

Deadwatch is a twin-stick survival game with keyboard, mouse, touch, and standard gamepad controls. This repository contains the original browser build plus an Electron desktop package for Steam Deck and desktop Linux.

## Controls

| Action | Steam Deck / gamepad | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD / arrow keys |
| Aim | Right stick | Mouse |
| Fire | Right trigger | Left mouse |
| Focus | Left trigger | Right mouse |
| Roll | A | Space / Shift |
| Heal | B | E |
| Nuke | X | G |
| Lure | Y | F |
| Interact | Left bumper | V |
| Boost | Right bumper | X |
| Pause | Menu | Escape / P |

## Run from source

Install [Node.js](https://nodejs.org/), then run:

```sh
npm install
npm start
```

Use `npm run start:windowed` for a resizable window instead of fullscreen.

Run `npm run test:smoke` to load the packaged game headlessly and verify its canvas and input module.

## Build for Steam Deck

The Steam Deck uses the Linux x64 build:

```sh
npm install
npm run dist:linux
```

The output is written to `dist/`. Copy `Deadwatch-0.36.164-x86_64.AppImage` to the Deck, make it executable, and add it to Steam as a non-Steam game:

```sh
chmod +x Deadwatch-0.36.164-x86_64.AppImage
```

In Desktop Mode, open Steam, choose **Games > Add a Non-Steam Game**, browse to the AppImage, then return to Gaming Mode. The native Deck controls use the standard gamepad layout.

The `.tar.gz` build is also provided for systems where AppImage mounting is unavailable.

## Browser build

`index.html` is the self-contained browser build and the GitHub Pages entry point. The numbered JavaScript files are the corresponding source modules.
