import { introductionGroups } from './intro-alternatives.js';

const select = document.querySelector('#intro-copy');
const heading = document.querySelector('#introduction-title');
const copy = document.querySelector('.introduction__copy');
const entries = introductionGroups.flatMap(group => group.entries);

for (const { label, entries: options } of introductionGroups) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const [id, title] of options) {
    const number = select.options.length + group.children.length + 1;
    group.append(new Option(`${number}. ${title}`, id));
  }
  select.append(group);
}

function showSelection() {
  const [, title, text] = entries[select.selectedIndex];
  heading.textContent = title;
  copy.textContent = text;
}

try {
  const saved = localStorage.getItem('intro-copy');
  if (entries.some(([id]) => id === saved)) select.value = saved;
} catch {}
showSelection();

function choose() {
  showSelection();
  try { localStorage.setItem('intro-copy', select.value); } catch {}
}

select.addEventListener('change', choose);
function step(direction) {
  select.selectedIndex = (select.selectedIndex + direction + entries.length) % entries.length;
  choose();
}
document.querySelector('#intro-previous').addEventListener('click', () => step(-1));
document.querySelector('#intro-next').addEventListener('click', () => step(1));
