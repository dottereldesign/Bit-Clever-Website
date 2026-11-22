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
  ],
  [
    "Humanizer: personal",
    "Hi, I’m Jamie Wilson.",
    "I’m an independent designer and developer. I make websites that feel like the business behind them, and spend time on the details people notice as they explore."
  ],
  [
    "Humanizer: first visit",
    "Let’s give people a reason to look around.",
    "I’m Jamie Wilson, an independent designer and developer. Your website is a chance to show people what you do and why they might want to work with you. I can help you put that into shape."
  ],
  [
    "Humanizer: direct contact",
    "Hi, I’m Jamie. We’ll work together.",
    "I’m the independent designer and developer behind Bit Clever. When we talk about your website, you’re talking to the person who’ll design and build it."
  ],
  [
    "Humanizer: customer view",
    "A website you’d want to spend time on.",
    "I’m Jamie Wilson, an independent designer and developer. I want your visitors to enjoy looking around, understand what you offer and feel comfortable getting in touch."
  ],
  [
    "Humanizer: your business",
    "You know your business. I’d like to get to know it.",
    "I’m Jamie Wilson, an independent designer and developer. We’ll work out what your website needs to say, then I’ll design and build a place for it."
  ],
  [
    "Humanizer: details",
    "Hi, I’m Jamie. I get quite into the details.",
    "I’m an independent designer and developer. How a page reads on a phone, how a button feels, whether an animation moves just right. Those things matter to me when I’m building a website."
  ],
  [
    "Humanizer: early ideas",
    "You can start with a rough idea.",
    "I’m Jamie Wilson, an independent designer and developer. If you know your business needs a website but haven’t worked out what goes on it, that’s something we can figure out together."
  ],
  [
    "Humanizer: a bit clever",
    "Hi, I’m Jamie, the person behind Bit Clever.",
    "I’m an independent designer and developer. I like websites with some personality, where people can still find what they came for. That’s what I want to make for your business."
  ],
  [
    "Humanizer: finding words",
    "How do you explain what you do?",
    "I’m Jamie Wilson, an independent designer and developer. If it’s easier to explain your business in a conversation than on a website, let’s have that conversation first."
  ],
  [
    "Humanizer: New Zealand",
    "Hi, I’m Jamie Wilson.",
    "I’m an independent designer and developer based in New Zealand. I work on both sides of your website, from how it looks to how it works, so we can carry an idea all the way through."
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
