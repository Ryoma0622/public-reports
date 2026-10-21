/* Confirmed playback positions frozen with this static report; no server or AI. */
(() => {
  'use strict';
  const node = document.getElementById('public-audio-mapping');
  if (!node) return;
  const tracks = JSON.parse(node.textContent);
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const valid = (value, track) => Number.isFinite(value) && value >= 0 && value < track.duration;
  const audioSource = audio => audio.getAttribute('src') || audio.querySelector('source')?.getAttribute('src');
  const transcript = owner => [...owner.querySelectorAll('details')].find(details =>
    details.querySelector(':scope > summary')?.textContent.trim() === '音声原稿');
  function button(audio, seconds, label, className) {
    const control = document.createElement('button');
    control.type = 'button'; control.className = className;
    control.textContent = label; control.title = `${time(seconds)}から再生`;
    control.setAttribute('aria-label', `${label}から再生`);
    control.addEventListener('click', () => {
      const seek = () => {
        audio.currentTime = seconds;
        audio.play().catch(() => {
          audio.controls = true;
          audio.focus();
        });
      };
      if (audio.readyState >= 1) seek();
      else { audio.addEventListener('loadedmetadata', seek, {once:true}); audio.load(); }
    });
    return control;
  }
  for (const audio of document.querySelectorAll('audio')) {
    const src = audioSource(audio);
    if (!src) continue;
    const track = tracks.find(row => new URL(row.src, document.baseURI).href === new URL(src, document.baseURI).href);
    if (!track) continue;
    audio.classList.add('public-mapped-audio');
    const owner = audio.closest('figure') || audio.parentElement;
    let details = transcript(owner);
    // Markdown transcripts follow the player; HTML transcripts live inside it.
    if (!details) {
      let sibling = owner.nextElementSibling;
      while (sibling?.matches('details')) {
        if (sibling.querySelector(':scope > summary')?.textContent.trim() === '音声原稿') { details = sibling; break; }
        sibling = sibling.nextElementSibling;
      }
    }
    const existing = Boolean(details);
    if (!details) {
      details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = '音声原稿';
      details.append(summary); owner.append(details);
    }
    const used = new Set(), cues = new Map();
    for (const cue of track.cues) if (!cues.has(cue.sentence) && valid(cue.from, track)) cues.set(cue.sentence, cue);
    for (const paragraph of track.paragraphs) {
      const p = existing ? [...details.querySelectorAll('p')].find(row => !used.has(row) && normalize(row.textContent) === normalize(paragraph.text)) : document.createElement('p');
      if (!p) continue;
      used.add(p);
      if (!existing) { p.textContent = paragraph.text; details.append(p); }
      const cue = cues.get(paragraph.id);
      if (cue) { p.classList.add('public-audio-paragraph'); p.prepend(button(audio, cue.from, time(cue.from), 'public-audio-timestamp')); }
    }
    if (owner.closest('details')) continue;
    for (const section of track.sections) {
      const heading = document.getElementById(section.id);
      if (!heading?.matches('h1,h2,h3,h4,h5,h6') || heading.closest('details')) continue;
      const links = document.createElement('div'); links.className = 'public-audio-links';
      links.setAttribute('aria-label', section.title + 'の音声解説');
      for (const segment of section.segments) {
        if (!valid(segment.from, track)) continue;
        const jump = button(audio, segment.from, `${segment.kind} ${time(segment.from)}`, 'public-audio-jump');
        jump.setAttribute('aria-label', `${section.title} · ${segment.kind} ${time(segment.from)}から再生`);
        jump.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>');
        links.append(jump);
      }
      if (links.childElementCount) heading.after(links);
    }
  }
})();
