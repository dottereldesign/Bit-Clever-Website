import { introductionGroups } from './intro-alternatives.js';

const earlierIntroductions = [
  [
    "A bit more you",
    "Hi, I’m Jamie Wilson.",
    "I make websites for people who care about what they do. We’ll work out what makes your business yours, then give it a home online you’re excited to share."
  ],
  [
    "Good first impression",
    "Let’s make that first visit count.",
    "I’m Jamie. I want someone opening your website to get a feel for your business and a reason to keep looking. That’s where I start."
  ],
  [
    "One person, both sides",
    "Hi, I’m Jamie. You’ll be working with me.",
    "We’ll talk through your ideas, then I’ll design and build your website. If something doesn’t feel right along the way, we can work it out together."
  ],
  [
    "Quiet confidence",
    "Make yourself at home. Have a look around.",
    "I’m Jamie, and this is Bit Clever. I build websites with the same invitation in mind: come in, get to know the business, see if it feels right for you."
  ],
  [
    "The business behind it",
    "Your business has a personality.",
    "I’m Jamie. I’d like to help it come through online, so people get a sense of who they’re dealing with before they ever get in touch."
  ],
  [
    "Small details",
    "Hi, I’m Jamie. I care how it feels to use.",
    "A page that reads well on a phone. A menu that’s easy to find. I spend time on those things because they’re part of how people experience your business."
  ],
  [
    "Invitation",
    "Got an idea you keep coming back to?",
    "I’m Jamie. If there’s a business you want to get online, or a website you’ve been meaning to rethink, I’d love to hear what you have in mind."
  ],
  [
    "Personality with purpose",
    "A website with a bit of you in it.",
    "I’m Jamie, the person behind Bit Clever. Let’s make something that sounds like your business and feels like somewhere your customers would want to spend time."
  ],
  [
    "Curiosity",
    "What do you wish people knew about your business?",
    "I’m Jamie. That’s a good place to start a website. We can give the things you care about room to come through, and make it easy for people to find out more."
  ],
  [
    "Local and personal",
    "Hi, I’m Jamie, from Bit Clever.",
    "I’m based in New Zealand, making websites with people who have something they want to put out into the world. I’d like to hear about yours."
  ],
  [
    "Humanizer: personal",
    "Hi, I’m Jamie. I make websites.",
    "Tell me about your business and what you want people to do when they visit. We’ll use that to work out what belongs on the page."
  ],
  [
    "Humanizer: first visit",
    "Give people something to stop for.",
    "I’m Jamie. When someone visits your website, I want them to find something that interests them enough to look a little further. Let’s work out what that is for your business."
  ],
  [
    "Humanizer: direct contact",
    "You can just call me Jamie.",
    "I’m the person you’ll talk to about your website, and the one who’ll make it. We can go from a rough idea to something you can open in your browser and try."
  ],
  [
    "Humanizer: customer view",
    "Would you enjoy using your own website?",
    "I’m Jamie. I think that’s a useful question. I want to make you a site that’s easy to find your way around and feels right for the people using it."
  ],
  [
    "Humanizer: your business",
    "Tell me about the business you’re building.",
    "I’m Jamie. I’ll ask questions, get to know what you do, and work with you on a website that helps people understand it."
  ],
  [
    "Humanizer: details",
    "Hi, I’m Jamie. I get quite into the details.",
    "I’ll spend time getting a little animation to move just right. I care just as much about whether someone can read the page on their phone and find how to contact you."
  ],
  [
    "Humanizer: early ideas",
    "A rough idea is enough to start.",
    "I’m Jamie. You can come to me with a few notes and a website you like. We’ll work through what you need and figure out the rest together."
  ],
  [
    "Humanizer: a bit clever",
    "Hi, I’m Jamie, the person behind Bit Clever.",
    "I like a website with a little personality. Something that makes you smile as you use it, while still making it easy to get where you’re going."
  ],
  [
    "Humanizer: finding words",
    "It might be easier to talk it through.",
    "I’m Jamie. If explaining your business on a blank page feels awkward, start by telling me about it. We can work out what your website needs to say from there."
  ],
  [
    "Humanizer: New Zealand",
    "Hi, I’m Jamie Wilson.",
    "I make websites here in New Zealand. If you’ve got something in mind, I can work on the design and build with you, right through to the little finishing touches."
  ]
];
const select = document.querySelector('#intro-copy');
const heading = document.querySelector('#introduction-title');
const copy = document.querySelector('.introduction__copy');
const variations = [];
function addGroup(label, entries) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const [optionLabel, title, text] of entries) {
    const index = variations.length;
    variations.push({ title, text });
    group.append(new Option(`${index + 1}. ${optionLabel}`, String(index)));
  }
  select.append(group);
}

// Earlier options keep their original values for visitors with saved choices.
addGroup('Original introductions', earlierIntroductions);
for (const { label, entries } of introductionGroups) {
  addGroup(label, entries.map(([title, text]) => [title, title, text]));
}

function apply(index) {
  const { title, text } = variations[index];
  select.value = String(index);
  heading.textContent = title;
  copy.textContent = text;
}

let startingIndex = earlierIntroductions.length;
try {
  const saved = localStorage.getItem('intro-copy');
  if (saved !== null && variations[Number(saved)] && saved === String(Number(saved))) {
    startingIndex = Number(saved);
  }
} catch {}
apply(startingIndex);

function choose(index) {
  apply(index);
  try { localStorage.setItem('intro-copy', String(index)); } catch {}
}

select.addEventListener('change', () => choose(Number(select.value)));
function step(direction) {
  choose((Number(select.value) + direction + variations.length) % variations.length);
}
document.querySelector('#intro-previous').addEventListener('click', () => step(-1));
document.querySelector('#intro-next').addEventListener('click', () => step(1));
