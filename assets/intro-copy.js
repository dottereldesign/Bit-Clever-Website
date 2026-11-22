const variations = [
  [
    "A bit more you",
    "Hi, I’m Jamie Wilson.",
    "An independent designer and developer making websites that feel a bit more you. Thoughtful design, carefully built, with the little details that make people want to stay."
  ],
  [
    "Good first impression",
    "Your next first impression starts here.",
    "I’m Jamie Wilson, an independent designer and developer. I turn what makes your business worth knowing into a website worth exploring."
  ],
  [
    "One person, both sides",
    "Hi, I’m Jamie. I design it. I build it.",
    "I’m an independent designer and developer, bringing the look, the feel and the workings of your website together. One person to talk to, from the first idea to the final detail."
  ],
  [
    "Quiet confidence",
    "Good websites make you feel something.",
    "Confidence. Curiosity. That little ‘this is the one’. I’m Jamie Wilson, an independent designer and developer, and that’s what I aim to build into your next website."
  ],
  [
    "The business behind it",
    "You’ve put yourself into your business. Let’s show it.",
    "I’m Jamie Wilson, an independent designer and developer. I make websites with room for your personality and a clear path for the people who need what you do."
  ],
  [
    "Small details",
    "A little detail can make a big difference.",
    "I’m Jamie Wilson, an independent designer and developer. From the first headline to the last click, I care about the things that make your website feel considered."
  ],
  [
    "Invitation",
    "Got something good going? Let’s give it a website.",
    "I’m Jamie Wilson, an independent designer and developer. Bring your ideas, your questions and the bits you haven’t figured out yet. We’ll start there."
  ],
  [
    "Personality with purpose",
    "A bit of personality. A lot of thought.",
    "I’m Jamie Wilson, the independent designer and developer behind Bit Clever. I make websites that express who you are and help people find their next step."
  ],
  [
    "Curiosity",
    "The best part of your business might be hard to put into words.",
    "I’m Jamie Wilson, an independent designer and developer. Let’s find it, give it shape, and make it the reason someone keeps scrolling."
  ],
  [
    "Local and personal",
    "Hi, I’m Jamie. The person behind Bit Clever.",
    "I’m an independent designer and developer based in New Zealand. I bring design and code together to give your business a place online that feels like its own."
  ]
];
const select = document.querySelector('#intro-copy');
const heading = document.querySelector('#introduction-title');
const copy = document.querySelector('.introduction__copy');
variations.forEach(([label], index) => select.add(new Option(`${index + 1}. ${label}`, String(index))));
const apply = index => {
  const [, title, text] = variations[index];
  select.value = String(index);
  heading.textContent = title;
  copy.textContent = text;
};
try {
  const saved = Number(localStorage.getItem('intro-copy'));
  if (Number.isInteger(saved) && variations[saved]) apply(saved);
} catch {}
select.addEventListener('change', () => {
  const index = Number(select.value);
  apply(index);
  try { localStorage.setItem('intro-copy', String(index)); } catch {}
});
