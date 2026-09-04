// Descriptive facts for the solar system explorer's click-to-inspect
// panel — real, commonly-cited astronomy facts (not fabricated), kept
// separate from three/orbitalMechanics.js since that file is real
// physics data (JPL orbital elements) and this is just prose plus a
// couple of numbers (moon counts) that get revised as new moons are
// discovered, hence the "+" hedge rather than a false-precise count.
export const PLANET_FACTS = {
  Mercury: {
    type: "Rocky planet",
    moons: "0",
    fact: "A day on Mercury — sunrise to sunrise — lasts about 176 Earth days, longer than its own year.",
  },
  Venus: {
    type: "Rocky planet",
    moons: "0",
    fact: "Venus spins backwards, and so slowly that its day is longer than its year.",
  },
  Earth: {
    type: "Rocky planet",
    moons: "1",
    fact: "The only known planet with liquid water oceans on its surface — and life.",
  },
  Mars: {
    type: "Rocky planet",
    moons: "2 (Phobos, Deimos)",
    fact: "Home to Olympus Mons, the tallest known volcano in the solar system — about 2.5x the height of Everest.",
  },
  Jupiter: {
    type: "Gas giant",
    moons: "90+",
    fact: "The Great Red Spot is a storm wider than Earth that has raged for at least 190 years.",
  },
  Saturn: {
    type: "Gas giant",
    moons: "140+",
    fact: "Its rings are mostly ice and rock — some pieces smaller than a grain of sand, others the size of a mountain.",
  },
  Uranus: {
    type: "Ice giant",
    moons: "27",
    fact: "Uranus rotates almost on its side, likely knocked over by a collision early in its history.",
  },
  Neptune: {
    type: "Ice giant",
    moons: "14",
    fact: "Has the fastest winds of any planet in the solar system — over 1,200 mph (2,000 km/h).",
  },
};
