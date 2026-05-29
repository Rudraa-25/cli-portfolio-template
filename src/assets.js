const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

// Attempt to load profile from assets
let portrait = [];
try {
  const profilePath = path.join(__dirname, '..', 'assets', 'panther.txt');
  if (fs.existsSync(profilePath)) {
    portrait = fs.readFileSync(profilePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
  }
} catch (e) {
  // Silent fallback
}

// Ensure portrait isn't empty if file is missing or broken
if (portrait.length === 0) {
  portrait = [
    "    /\\_____/\\",
    "   /  o   o  \\",
    "  ( ==  ^  == )",
    "   )         (",
    "  (           )",
    " ( (  )   (  ) )",
    "(__(__)___(__)__)"
  ];
}

const banner = [
  "██████╗   ██╗   ██╗  ██████╗   ██████╗    █████╗  ",
  "██╔══██╗  ██║   ██║  ██╔══██╗  ██╔══██╗  ██╔══██╗ ",
  "██████╔╝  ██║   ██║  ██║  ██║  ██████╔╝  ███████║ ",
  "██╔══██╗  ██║   ██║  ██║  ██║  ██╔══██╗  ██╔══██║ ",
  "██║  ██║  ╚██████╔╝  ██████╔╝  ██║  ██║  ██║  ██║ ",
  "╚═╝  ╚═╝   ╚═════╝   ╚═════╝   ╚═╝  ╚═╝  ╚═╝  ╚═╝ ",
  "             ──── PRAJAPATI ────                  "
];

const stars = ['·', '•', '○', '◌', '✧', '✦', '⋆', '✷'];


// Themes
const themes = [
  {
    name: 'Cyber Nebula',
    primary: (text) => `\x1b[38;2;255;0;255m${text}\x1b[0m`, // Neon Magenta (#FF00FF)
    secondary: (text) => `\x1b[38;2;168;85;247m${text}\x1b[0m`, // Purple (#A855F7)
    accent: (text) => `\x1b[38;2;139;92;246m${text}\x1b[0m`, // Violet
    highlight: (text) => `\x1b[38;2;34;211;238m${text}\x1b[0m`, // Cyan
    text: pc.white,
    dim: pc.dim
  },
  {
    name: 'Deep Space',
    primary: (text) => `\x1b[38;2;139;92;246m${text}\x1b[0m`, // Purple
    secondary: (text) => `\x1b[38;2;59;130;246m${text}\x1b[0m`, // Blue
    accent: (text) => `\x1b[38;2;147;197;253m${text}\x1b[0m`, // Light Blue
    highlight: pc.white,
    text: pc.white,
    dim: pc.dim
  },
  {
    name: 'Sunset Synthwave',
    primary: (text) => `\x1b[38;2;236;72;153m${text}\x1b[0m`, // Pink
    secondary: (text) => `\x1b[38;2;249;115;22m${text}\x1b[0m`, // Orange
    accent: (text) => `\x1b[38;2;139;92;246m${text}\x1b[0m`, // Purple
    highlight: (text) => `\x1b[38;2;253;224;71m${text}\x1b[0m`, // Yellow
    text: pc.white,
    dim: pc.dim
  },
  {
    name: 'Monochrome',
    primary: pc.white,
    secondary: pc.white,
    accent: pc.white,
    highlight: pc.white,
    text: pc.white,
    dim: pc.dim
  }
];

const colors = {
  purple: (text) => `\x1b[38;2;168;85;247m${text}\x1b[0m`,
  white: pc.white
};

module.exports = {
  portrait,
  banner,
  stars,
  themes,
  colors
};
