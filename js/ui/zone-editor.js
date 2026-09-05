// Zone editor panel — web-only
import { NOTE_NAMES, nameToMidi, midiToName } from '../engine/scales.js';

let currentZoneIndex = null;

function initZoneFill(slider) {
  const row = slider.closest('.control-row');
  if (!row || row.querySelector('.slider-fill')) return;
  const fill = document.createElement('div');
  fill.className = 'slider-fill';
  row.insertBefore(fill, row.firstChild);
  updateZoneFill(slider);
}

function updateZoneFill(slider) {
  const row = slider.closest('.control-row');
  if (!row) return;
  const fill = row.querySelector('.slider-fill');
  if (!fill) return;
  const pct = (slider.value - slider.min) / (slider.max - slider.min);
  fill.style.width = 'calc(' + (pct * 100) + '% - 4px)';
  fill.style.minWidth = pct > 0 ? '22px' : '0';
  const valSpan = row.querySelector('.val');
  if (valSpan) valSpan.textContent = slider.value;
}

export function showEditor(persistent, transient, zoneIndex, callbacks) {
  currentZoneIndex = zoneIndex;
  const panel = document.getElementById('zone-editor');
  panel.classList.add('open');

  const zone = persistent.zones[zoneIndex];
  const octave = Math.floor(zone.midi / 12) - 1;

  document.getElementById('zone-name').textContent = midiToName(zone.midi);
  document.getElementById('zone-note').value = zone.midi % 12;
  document.getElementById('zone-octave').value = octave;
  const wSlider = document.getElementById('zone-width');
  const hSlider = document.getElementById('zone-height');
  wSlider.value = Math.round((zone.hw / 0.08) * 100);
  hSlider.value = Math.round((zone.hh / 0.08) * 100);
  updateZoneFill(wSlider);
  updateZoneFill(hSlider);
}

export function hideEditor(transient) {
  currentZoneIndex = null;
  const panel = document.getElementById('zone-editor');
  panel.classList.remove('open');
  transient.selectedZone = null;
}

export function setupEditor(persistent, transient, callbacks) {
  // Prevent clicks on editor from propagating to canvas
  const panel = document.getElementById('zone-editor');
  panel.addEventListener('mousedown', (e) => e.stopPropagation());
  panel.addEventListener('touchstart', (e) => e.stopPropagation());

  const noteSelect = document.getElementById('zone-note');
  const octSelect = document.getElementById('zone-octave');
  const widthSlider = document.getElementById('zone-width');
  const heightSlider = document.getElementById('zone-height');
  const deleteBtn = document.getElementById('zone-delete');
  const closeBtn = document.getElementById('zone-close');

  // Init slider fills
  initZoneFill(widthSlider);
  initZoneFill(heightSlider);

  noteSelect.addEventListener('change', () => {
    if (currentZoneIndex === null) return;
    const zone = persistent.zones[currentZoneIndex];
    const octave = Math.floor(zone.midi / 12) - 1;
    zone.midi = nameToMidi(NOTE_NAMES[Number(noteSelect.value)], octave);
    document.getElementById('zone-name').textContent = midiToName(zone.midi);
  });

  octSelect.addEventListener('change', () => {
    if (currentZoneIndex === null) return;
    const zone = persistent.zones[currentZoneIndex];
    const noteIdx = zone.midi % 12;
    zone.midi = nameToMidi(NOTE_NAMES[noteIdx], Number(octSelect.value));
    document.getElementById('zone-name').textContent = midiToName(zone.midi);
  });

  widthSlider.addEventListener('input', () => {
    if (currentZoneIndex === null) return;
    persistent.zones[currentZoneIndex].hw = (Number(widthSlider.value) / 100) * 0.08;
    updateZoneFill(widthSlider);
  });

  heightSlider.addEventListener('input', () => {
    if (currentZoneIndex === null) return;
    persistent.zones[currentZoneIndex].hh = (Number(heightSlider.value) / 100) * 0.08;
    updateZoneFill(heightSlider);
  });

  const dupeBtn = document.getElementById('zone-duplicate');
  dupeBtn.addEventListener('click', () => {
    if (currentZoneIndex === null) return;
    callbacks.onDuplicateZone(currentZoneIndex);
  });

  deleteBtn.addEventListener('click', () => {
    if (currentZoneIndex === null) return;
    callbacks.onDeleteZone(currentZoneIndex);
  });

  closeBtn.addEventListener('click', () => {
    hideEditor(transient);
  });
}
