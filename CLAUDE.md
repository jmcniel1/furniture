# Furniture — Physics-Based Bounce Sequencer

Balls bounce around a canvas, triggering MIDI notes when they collide with zones. Dual-platform: web app + VST/AU plugin.

## Stack

- **Web**: Vanilla JS (ES6 modules), Canvas 2D, Web Audio API, Web MIDI API — no framework, no build step
- **VST Plugin**: C++17, JUCE 8.0.4 (fetched via CMake), builds VST3/AU/Standalone

## Project Structure

```
js/
  engine/    # Pure logic: state, physics, arp, collision, scales, prng (DOM-agnostic)
  audio/     # Web Audio synth + MIDI output
  ui/        # Canvas rendering, sidebar, zone editor, interaction
plugin/
  Source/
    Engine/  # C++ port of js/engine/ (same algorithms 1:1)
    GUI/     # JUCE canvas + sidebar components
  CMakeLists.txt
index.html   # Web entry point
css/style.css
```

## Key Architecture

- **Shared core logic**: JS engine modules (`js/engine/`) and C++ engine (`plugin/Source/Engine/`) implement identical algorithms — keep them in sync when changing physics/arp/collision/scales
- **State separation**: Persistent (serializable params) vs Transient (runtime-only: balls, flash, lockout, arp state)
- **Pure functions**: Physics, arp, collision, scales are deterministic with seeded PRNG — no side effects except state mutation
- **Callback-driven UI** (web): main.js defines callbacks, UI modules invoke them
- **Thread safety** (VST): `std::recursive_mutex` protects state between processor and GUI threads

## Run & Build

```bash
# Web — no build step, just serve static files
open index.html

# VST plugin
cd plugin/build
cmake ..
cmake --build . --config Release
# Installs to ~/Library/Audio/Plug-Ins/VST3/ and Components/
```

## Defaults

- Physics: Gravity=3, Bounce=90, Friction=4, Speed=40
- 2 balls, 14 default zones (C3–G5), C Major scale
- BPM: 120 (web) / reads from DAW host (VST)
- Volume: 70 (web synth); set to 0 for MIDI-only mode

## Conventions

- OKLCH color space for zone colors (16-color palette)
- Canvas rendering scales with devicePixelRatio
- No npm/node dependencies for web — pure browser APIs
- Gatekeeper: unsigned plugin requires `xattr -d com.apple.quarantine` or ad-hoc codesign

## Deployment

- **Web**: Vercel (auto-deploys from `main`)
- **GitHub**: `jmcniel1/furniture`
