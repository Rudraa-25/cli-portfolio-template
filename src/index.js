#!/usr/bin/env node

const renderer = require('./core/Renderer.js');
const theme = require('./core/Theme.js');
const input = require('./core/Input.js');
const anim = require('./core/Animation.js');
const data = require('./data.js');
const assets = require('./assets.js');

const { exec } = require('child_process');
let openUrl = (url) => {
  import('open').then((openModule) => {
    const openFn = openModule.default || openModule;
    openFn(url).catch(() => {});
  }).catch(() => {
    exec(`xdg-open "${url}"`, (err) => {
      if (err) console.error('Failed to open URL', err);
    });
  });
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const startTime = Date.now();

const state = {
  menu: ['About', 'Skills', 'Projects', 'Now', 'Timeline', 'Achievements', 'Games', 'Website', 'Connect', 'CV'],
  menuIndex: 0,
  projectIndex: 0,
  connectIndex: 0,
  labIndex: 0,
  stars: [],
  shootingStar: null,
  booting: true,
  showPopup: false,
  isSecretLab: false,
  message: null,
  messageTimer: null,
  
  terminal: {
    active: false,
    input: '',
    log: ['RUDRA OS TERMINAL [Version 2.0.0]', 'Type "help" for a list of commands.']
  },

  game: {
    active: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    catY: 0, // 0 is floor, positive is up
    velocity: 0,
    isJumping: false,
    obstacles: []
  }
};

if (data.theme && data.theme.default) {
  const tIdx = theme.themes.findIndex(t => t.name.toLowerCase() === data.theme.default.toLowerCase());
  if (tIdx !== -1) theme.currentIndex = tIdx;
}

function showMessage(msg) {
  state.message = msg;
  if (state.messageTimer) clearTimeout(state.messageTimer);
  state.messageTimer = setTimeout(() => {
    state.message = null;
    updateFrame();
  }, 2000);
  updateFrame();
}

function getUptimeString() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const m = String(Math.floor(diff / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function getClockString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND STARS
// ═══════════════════════════════════════════════════════════════

function initStars() {
  state.stars = [];
  const numStars = 100;
  const layer1 = ['.', '·', '•'];   // 70%
  const layer2 = ['○', '◌'];        // 20%
  const layer3 = ['✦', '✧'];        // 10%

  // Dashboard geometry (mirrors updateFrame)
  let usableW = Math.floor(renderer.width * 0.75);
  if (usableW > 160) usableW = 160;
  if (usableW < 100) usableW = Math.min(renderer.width, 100);
  const startX = Math.floor((renderer.width - usableW) / 2);
  const bannerY = 1, bannerH = 8;
  const heroY = bannerH + 1, pantherH = 23;
  const contentY = heroY + pantherH;
  const commandY = renderer.height - 2;

  // Midpoint of screen — right side starts here
  const midX = Math.floor(renderer.width / 2);

  // 3 star clusters: upper-right, middle-right, lower-right
  const rightMargin = renderer.width - 3;
  const clusters = [
    { cx: rightMargin - 8,  cy: 3 },                           // upper-right
    { cx: rightMargin - 5,  cy: Math.floor(renderer.height / 2) }, // middle-right
    { cx: rightMargin - 10, cy: renderer.height - 6 }          // lower-right
  ];

  clusters.forEach(c => {
    const num = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < num; i++) {
      let x = c.cx + Math.floor(Math.random() * 10) - 5;
      let y = c.cy + Math.floor(Math.random() * 4) - 2;
      x = Math.max(1, Math.min(x, renderer.width - 2));
      y = Math.max(1, Math.min(y, renderer.height - 2));
      const ch = Math.random() > 0.5 ? '✦' : '·';
      state.stars.push({ x, y, char: ch, phase: Math.random() > 0.5 ? 1 : 0 });
    }
  });

  for (let i = 0; i < numStars; i++) {
    const r = Math.random();
    let ch;
    if (r > 0.90)      ch = layer3[Math.floor(Math.random() * layer3.length)];
    else if (r > 0.70) ch = layer2[Math.floor(Math.random() * layer2.length)];
    else               ch = layer1[Math.floor(Math.random() * layer1.length)];

    let x, y, valid = false, maxAttempts = 120;
    while (!valid && maxAttempts > 0) {
      maxAttempts--;

      // 55% chance to spawn on right half for balance
      if (Math.random() < 0.55) {
        x = midX + Math.floor(Math.random() * (renderer.width - midX - 1));
      } else {
        x = 1 + Math.floor(Math.random() * (midX - 2));
      }
      y = 1 + Math.floor(Math.random() * (renderer.height - 2));

      // No stars touching borders
      if (x <= 0 || x >= renderer.width - 1 || y <= 0 || y >= renderer.height - 1) continue;

      const bannerX = startX + Math.max(0, Math.floor((usableW - 54) / 2));
      const inBanner  = (x >= bannerX     && x <= bannerX + 54 && y >= bannerY && y <= bannerY + bannerH);
      const inPanels  = (x >= startX      && x <= startX + usableW && y >= heroY && y <= commandY);

      if (!inPanels && !inBanner) valid = true;
    }
    if (valid) {
      state.stars.push({ x, y, char: ch, phase: Math.random() > 0.5 ? 1 : 0 });
    }
  }
}

// Shooting stars: max 2 active, diagonal top-left→bottom-right
const shootingStars = [];
let lastShootingStarTime = Date.now();

const SHOOTING_STAR_VARIATIONS = [
  { head: '✦', tail: '─' },
  { head: '✧', tail: '═' },
  { head: '*', tail: '\\' }
];

function spawnShootingStar() {
  const now = Date.now();
  const delay = 5000 + Math.random() * 10000; // 5–15 seconds
  if (shootingStars.length < 2 && now - lastShootingStarTime > delay) {
    const variation = SHOOTING_STAR_VARIATIONS[Math.floor(Math.random() * SHOOTING_STAR_VARIATIONS.length)];
    shootingStars.push({
      x: Math.floor(Math.random() * (renderer.width - 20)) + 5,
      y: Math.floor(Math.random() * 5) + 1, // near top
      length: Math.floor(Math.random() * 6) + 5, // 5–10
      variation
    });
    lastShootingStarTime = now;
  }
}

function drawBackground() {
  const currentTheme = theme.current;

  // Twinkle stars
  if (anim.frame % 10 === 0) {
    state.stars.forEach(s => {
      if (Math.random() > 0.85) s.phase = 1 - s.phase;
    });
  }

  // Advance diagonal shooting stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    shootingStars[i].x += 1;
    shootingStars[i].y += 1;
    if (shootingStars[i].x >= renderer.width || shootingStars[i].y >= renderer.height) {
      shootingStars.splice(i, 1);
    }
  }
  spawnShootingStar();

  // Draw stars
  state.stars.forEach(s => {
    renderer.drawText(s.x, s.y, s.char, s.phase === 1 ? currentTheme.text : currentTheme.dim);
  });

  // Draw shooting stars diagonally
  shootingStars.forEach(star => {
    for (let i = 0; i < star.length; i++) {
      const sx = Math.floor(star.x - i);
      const sy = Math.floor(star.y - i);
      if (sx >= 0 && sy >= 0 && sx < renderer.width && sy < renderer.height) {
        const ch = i === 0 ? star.variation.head : star.variation.tail;
        renderer.drawText(sx, sy, ch, currentTheme.highlight);
      }
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

function drawHeader(startX, width) {
  const currentTheme = theme.current;
  
  const clockStr = `${getClockString()} | Uptime: ${getUptimeString()}`;
  renderer.drawText(startX, 0, clockStr, currentTheme.dim);

  const projectsCount = data.projects ? data.projects.length : 0;
  const skillsCount = data.skills ? data.skills.length : 0;
  const countStr = `Projects: ${projectsCount} | Skills: ${skillsCount} | Status: Active`;
  renderer.drawText(startX + width - countStr.length, 0, countStr, currentTheme.dim);
}

function drawBanner(startX, startY, width) {
  const currentTheme = theme.current;
  const bannerWidth = assets.banner[0].length;
  const x = startX + Math.max(0, Math.floor((width - bannerWidth) / 2));
  
  assets.banner.forEach((line, i) => {
    if (i === assets.banner.length - 1) {
      renderer.drawText(x, startY + i, line, currentTheme.secondary);
    } else {
      renderer.drawText(x, startY + i, line, currentTheme.primary);
    }
  });
}

function drawPantherBox(x, y, w, h) {
  const currentTheme = theme.current;
  for(let i=0; i<h; i++) renderer.drawText(x, y+i, ' '.repeat(w));
  renderer.drawBox(x, y, w, h, currentTheme.primary);
  
  const pWidth = Math.max(...assets.portrait.map(l => l.length));
  const pHeight = assets.portrait.length;
  const pX = x + Math.max(1, Math.floor((w - pWidth) / 2));
  const pY = y + Math.max(1, Math.floor((h - pHeight) / 2));
  
  assets.portrait.forEach((line, i) => {
    if (pY + i < y + h - 1) {
      renderer.drawText(pX, pY + i, line, currentTheme.primary);
    }
  });
}

function drawMenuBox(x, y, w, h) {
  const currentTheme = theme.current;
  for(let i=0; i<h; i++) renderer.drawText(x, y+i, ' '.repeat(w));
  renderer.drawBox(x, y, w, h, currentTheme.primary);

  const menuItems = state.menu;
  const statusH = data.status.length + 3;
  const infoH = 5; // theme + time + system status
  const totalContentH = menuItems.length + statusH + infoH + 2;
  
  let curY = y + Math.max(2, Math.floor((h - totalContentH) / 2));
  
  // ── Menu items ──
  menuItems.forEach((item, idx) => {
    if (curY < y + h - 1) {
      if (!state.isSecretLab && idx === state.menuIndex && !state.terminal.active) {
        renderer.drawText(x + 3, curY++, `▶  ${item}`.padEnd(w-5).substring(0,w-5), currentTheme.highlight);
      } else {
        renderer.drawText(x + 5, curY++, item.padEnd(w-7).substring(0,w-7), currentTheme.dim);
      }
    }
  });

  if (state.isSecretLab && curY < y + h - 1) {
    renderer.drawText(x + 3, curY++, `▶  LAB`.padEnd(w-5).substring(0,w-5), currentTheme.highlight);
  }

  curY++;

  // ── Status section ──
  if (curY < y + h - 1) {
    renderer.drawText(x + 3, curY++, ('─').repeat(w - 6), currentTheme.dim);
    if (curY < y + h - 1) renderer.drawText(x + 3, curY++, "Status", currentTheme.secondary);
    data.status.forEach(st => {
      if (curY < y + h - 1) {
        renderer.drawText(x + 3, curY++, `● ${st}`.substring(0, w-5), currentTheme.text);
      }
    });
  }

  curY++;

  // ── System Info section ──
  if (curY < y + h - 1) {
    renderer.drawText(x + 3, curY++, ('─').repeat(w - 6), currentTheme.dim);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (curY < y + h - 1) renderer.drawText(x + 3, curY++, `◷ ${timeStr}`.substring(0, w-5), currentTheme.accent);
    if (curY < y + h - 1) renderer.drawText(x + 3, curY++, `⬡ ${theme.current.name}`.substring(0, w-5), currentTheme.accent);
    if (curY < y + h - 1) renderer.drawText(x + 3, curY++, `◈ System Online`.substring(0, w-5), currentTheme.secondary);
  }
}

// ═══════════════════════════════════════════════════════════════
// GAMES & TERMINAL MODULES
// ═══════════════════════════════════════════════════════════════

function tickGame(innerW) {
  if (state.game.gameOver) return;

  // Jump physics
  if (state.game.catY > 0 || state.game.isJumping) {
    state.game.catY += state.game.velocity;
    state.game.velocity -= 0.4; 
    
    if (state.game.catY <= 0) {
      state.game.catY = 0;
      state.game.isJumping = false;
      state.game.velocity = 0;
    }
  }

  let speed = 1.0;
  if (state.game.score > 300) speed = 2.0;
  else if (state.game.score > 100) speed = 1.5;

  let lastObsX = -1;
  if (state.game.obstacles.length > 0) {
    lastObsX = state.game.obstacles[state.game.obstacles.length - 1].x;
  }
  
  if (state.game.obstacles.length < 3) {
    let requiredSpacing = state.game.nextSpacing || 25;
    if (state.game.obstacles.length === 0 || (innerW - lastObsX) >= requiredSpacing) {
      const types = [
        { shape: ['▲'], w: 1, h: 1 },
        { shape: ['██', '██'], w: 2, h: 2 },
        { shape: ['╱█╲'], w: 3, h: 1 },
        { shape: ['<==>'], w: 4, h: 1 }
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      state.game.obstacles.push({ x: innerW - 1, type: type });
      state.game.nextSpacing = Math.floor(Math.random() * 22) + 18; 
    }
  }

  for (let i = state.game.obstacles.length - 1; i >= 0; i--) {
    const obs = state.game.obstacles[i];
    obs.x -= speed;
    
    if (obs.x < -obs.type.w) {
      state.game.obstacles.splice(i, 1);
      continue;
    }
    
    const catVisualY = Math.floor(state.game.catY);
    if (Math.floor(obs.x) >= (6 - obs.type.w) && Math.floor(obs.x) <= 12 && catVisualY < obs.type.h) {
      state.game.gameOver = true;
      if (state.game.score > state.game.highScore) {
        state.game.highScore = state.game.score;
      }
    }
  }
  
  if (!state.game.gameOver) {
    state.game.score++;
  }
}

function processTerminalCommand() {
  const cmd = state.terminal.input.trim().toLowerCase();
  state.terminal.log.push(`rudra> ${state.terminal.input}`);
  state.terminal.input = '';

  switch (cmd) {
    case 'help':
      state.terminal.log.push('Available commands: help, about, projects, skills, timeline, github, website, clear, exit');
      break;
    case 'about':
      state.terminal.log.push(`${data.name} ${data.surname} - ${data.title}`);
      break;
    case 'projects':
      if (data.projects) {
        data.projects.forEach(p => state.terminal.log.push(`- ${p.name}: ${p.status}`));
      }
      break;
    case 'skills':
      if (data.skills) {
        state.terminal.log.push(`Top Skills: ${data.skills.map(s => s.name).join(', ')}`);
      }
      break;
    case 'timeline':
      if (data.timeline) {
        data.timeline.forEach(t => state.terminal.log.push(`[${t.year}] ${t.event}`));
      }
      break;
    case 'github':
    case 'website':
      if (data.seo && data.seo[cmd]) {
        state.terminal.log.push(`URL: ${data.seo[cmd]}`);
      } else {
        state.terminal.log.push(`No ${cmd} URL configured.`);
      }
      break;
    case 'clear':
      state.terminal.log = [];
      break;
    case 'exit':
    case 'quit':
      state.terminal.active = false;
      break;
    case '':
      break;
    default:
      state.terminal.log.push(`Command not found: ${cmd}`);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════
// RIGHT PANEL RENDERING
// ═══════════════════════════════════════════════════════════════

function drawRightPanel(x, y, w, h) {
  const currentTheme = theme.current;
  const innerX = x + 3;
  const innerW = w - 6;
  
  if (state.terminal.active) {
    for(let i=0; i<h; i++) renderer.drawText(x, y+i, ' '.repeat(w));
    renderer.drawBox(x, y, w, h, currentTheme.highlight);
    renderer.drawText(x + Math.floor((w - 10)/2), y, ` TERMINAL `, currentTheme.primary);
    
    const maxLogLines = h - 4;
    const displayLog = state.terminal.log.slice(-maxLogLines);
    
    let curY = y + 1;
    displayLog.forEach(l => {
      renderer.drawText(innerX, curY++, l.padEnd(innerW).substring(0, innerW), currentTheme.text);
    });
    
    renderer.drawText(innerX, y + h - 2, `rudra> ${state.terminal.input}_`, currentTheme.highlight);
    return;
  }

  for(let i=0; i<h; i++) renderer.drawText(x, y+i, ' '.repeat(w));
  renderer.drawBox(x, y, w, h, currentTheme.secondary);

  const page = state.isSecretLab ? 'LAB' : state.menu[state.menuIndex];
  const title = ` ${page.toUpperCase()} `;
  renderer.drawText(x + Math.floor((w - title.length)/2), y, title, currentTheme.highlight);

  let curY = y + 2;

  if (page === 'About') {
    renderer.drawText(innerX, curY++, `  ${data.name} ${data.surname}`, currentTheme.primary);
    renderer.drawText(innerX, curY++, `  ${data.title}`, currentTheme.secondary);
    curY++;
    renderer.drawText(innerX, curY++, `  Location: ${data.location}`, currentTheme.highlight);
    renderer.drawText(innerX, curY++, `  Fun Fact: ${data.funFact}`, currentTheme.accent);
    curY++;
    data.about.forEach(l => {
      if (curY > y + h - 2) return;
      renderer.drawText(innerX, curY++, l.padEnd(innerW).substring(0, innerW), currentTheme.text);
    });
  }
  else if (page === 'Skills') {
    data.skills.forEach(skill => {
      if (curY > y + h - 3) return;
      renderer.drawText(innerX, curY++, skill.name, currentTheme.text);
      
      const barW = innerW - 6; 
      // Adjusted animation frame modifier since frame ticks faster now (50ms)
      const targetFilled = Math.floor((skill.level / 100) * barW);
      const curFilled = Math.min(targetFilled, Math.floor(targetFilled * (Math.min(anim.frame, 20) / 20)));
      
      const bar = '█'.repeat(curFilled) + '░'.repeat(Math.max(0, barW - curFilled));
      renderer.drawText(innerX, curY, bar, currentTheme.primary);
      renderer.drawText(innerX + barW + 1, curY++, `${skill.level}%`, currentTheme.highlight);
      curY++;
    });
  } 
  else if (page === 'Projects') {
    if (state.showPopup) {
      const p = data.projects[state.projectIndex];
      const pw = Math.min(60, innerW);
      const ph = 14;
      const px = innerX + Math.floor((innerW - pw)/2);
      const py = curY + 2;
      
      for(let i=0; i<ph; i++) renderer.drawText(px, py+i, ' '.repeat(pw));
      renderer.drawBox(px, py, pw, ph, currentTheme.highlight);
      
      renderer.drawText(px + 2, py + 2, p.name, currentTheme.primary);
      renderer.drawText(px + 2, py + 4, p.description, currentTheme.text);
      renderer.drawText(px + 2, py + 6, `Status: ${p.status}`, currentTheme.secondary);
      if (p.tech) {
        renderer.drawText(px + 2, py + 7, `Tech:   ${p.tech.join(', ')}`, currentTheme.dim);
      }
      if (p.image) {
        renderer.drawText(px + 2, py + 9, `[IMAGE: ${p.image}]`, currentTheme.dim);
      }
      renderer.drawText(px + 2, py + 11, `[Q] Close`, currentTheme.accent);
    } else {
      data.projects.forEach((p, idx) => {
        if (curY > y + h - 8) return;
        const isSelected = idx === state.projectIndex;
        const borderColor = isSelected ? currentTheme.highlight : currentTheme.accent;
        
        renderer.drawText(innerX, curY, `╔${'═'.repeat(innerW-2)}╗`, borderColor);
        renderer.drawText(innerX, curY+1, `║ ${p.name.padEnd(innerW-4).substring(0,innerW-4)} ║`, currentTheme.primary);
        renderer.drawText(innerX, curY+2, `║ ${p.description.padEnd(innerW-4).substring(0,innerW-4)} ║`, currentTheme.text);
        
        let statStr = p.status || 'N/A';
        renderer.drawText(innerX, curY+3, `║ Status : ${statStr.padEnd(innerW-13).substring(0,innerW-13)} ║`, currentTheme.secondary);
        
        const enterHint = isSelected ? '[ENTER] Details' : '';
        renderer.drawText(innerX, curY+4, `║ ${enterHint.padEnd(innerW-4).substring(0,innerW-4)} ║`, isSelected ? currentTheme.highlight : currentTheme.dim);
        renderer.drawText(innerX, curY+5, `╚${'═'.repeat(innerW-2)}╝`, borderColor);
        curY += 7;
      });
    }
  }
  else if (page === 'Now' && data.now) {
    const sections = [
      { title: 'Building', items: data.now.building, color: currentTheme.primary },
      { title: 'Learning', items: data.now.learning, color: currentTheme.secondary },
      { title: 'Exploring', items: data.now.exploring, color: currentTheme.accent }
    ];
    
    sections.forEach(sec => {
      if (curY > y + h - 4) return;
      renderer.drawText(innerX, curY++, `  ${sec.title}:`, sec.color);
      sec.items.forEach(item => {
        if (curY > y + h - 2) return;
        renderer.drawText(innerX, curY++, `    • ${item}`, currentTheme.text);
      });
      curY++;
    });
  }
  else if (page === 'Timeline' && data.timeline) {
    data.timeline.forEach((item, idx) => {
      if (curY > y + h - 4) return;
      renderer.drawText(innerX + 2, curY, `[${item.year}]`, currentTheme.highlight);
      renderer.drawText(innerX + 10, curY, `━ ${item.event}`, currentTheme.text);
      curY++;
      if (idx < data.timeline.length - 1 && curY < y + h - 2) {
        renderer.drawText(innerX + 5, curY++, `│`, currentTheme.dim);
      }
    });
  }
  else if (page === 'Achievements' && data.achievements) {
    data.achievements.forEach(ach => {
      if (curY > y + h - 2) return;
      renderer.drawText(innerX + 2, curY++, `★ ${ach}`, currentTheme.highlight);
      curY++;
    });
  }
  else if (page === 'LAB' && data.lab) {
    renderer.drawText(innerX + 2, curY++, `  CLASSIFIED EXPERIMENTS`, assets.colors.purple);
    curY++;
    data.lab.forEach((item, idx) => {
      if (curY > y + h - 2) return;
      const isSelected = idx === state.labIndex;
      const prefix = isSelected ? '>>' : '  ';
      renderer.drawText(innerX + 2, curY++, `${prefix} ${item}`, isSelected ? currentTheme.highlight : currentTheme.dim);
    });
    if (curY < y + h - 2) {
      curY++;
      renderer.drawText(innerX + 2, curY, `Use [←/→] to browse.`, currentTheme.dim);
    }
  }
  else if (page === 'Games') {
    if (state.game.active) {
      tickGame(innerW);
      const floorY = y + h - 4;
      
      const scoreStr = `SCORE: ${state.game.score}    HIGH: ${state.game.highScore}`;
      renderer.drawText(innerX + innerW - scoreStr.length - 2, y + 1, scoreStr, currentTheme.highlight);
      
      // Draw Floor
      let groundStr = '─'.repeat(innerW);
      let gArr = groundStr.split('');
      for (let i=0; i<innerW; i++) {
        if ((i + anim.frame) % 17 === 0) gArr[i] = '.';
        if ((i + anim.frame) % 29 === 0) gArr[i] = ',';
      }
      renderer.drawText(innerX, floorY, gArr.join(''), currentTheme.dim);
      
      // Draw Cat
      const catVisualY = floorY - 3 - Math.floor(state.game.catY);
      renderer.drawText(innerX + 5, catVisualY,   " /\\_/\\ ", currentTheme.primary);
      renderer.drawText(innerX + 5, catVisualY+1, "( o.o )", currentTheme.primary);
      renderer.drawText(innerX + 5, catVisualY+2, " > ^ < ", currentTheme.primary);

      // Draw Obstacles
      state.game.obstacles.forEach(obs => {
        if (obs.x > -obs.type.w && obs.x < innerW) {
          obs.type.shape.forEach((line, idx) => {
            let drawX = innerX + Math.floor(obs.x);
            let drawY = floorY - obs.type.h + idx;
            // Crop rendering if it goes out of bounds on the left
            if (obs.x < 0) {
               let crop = Math.floor(-obs.x);
               if (crop < line.length) {
                 renderer.drawText(drawX + crop, drawY, line.substring(crop), currentTheme.secondary);
               }
            } else {
               renderer.drawText(drawX, drawY, line, currentTheme.secondary);
            }
          });
        }
      });

      if (state.game.gameOver) {
        const goW = 28;
        const goH = 7;
        const goX = innerX + Math.floor((innerW - goW)/2);
        const goY = y + Math.floor((h - goH)/2);
        
        for(let i=0; i<goH; i++) renderer.drawText(goX, goY+i, ' '.repeat(goW));
        renderer.drawBox(goX, goY, goW, goH, currentTheme.secondary);
        
        renderer.drawText(goX + Math.floor((goW-9)/2), goY + 1, "GAME OVER", currentTheme.primary);
        renderer.drawText(goX + 2, goY + 3, `Score: ${state.game.score}`, currentTheme.text);
        renderer.drawText(goX + 2, goY + 4, `High:  ${state.game.highScore}`, currentTheme.text);
        renderer.drawText(goX + Math.floor((goW-15)/2), goY + 6, "[ENTER] / [Q]", currentTheme.dim);
      } else {
        renderer.drawText(innerX, floorY + 1, "[SPACE] Jump   [Q] Back", currentTheme.dim);
      }
    } else {
      renderer.drawText(innerX + 2, curY++, "CAT RUNNER", currentTheme.primary);
      curY++;
      renderer.drawText(innerX + 2, curY++, "A terminal game about jumping.", currentTheme.text);
      curY++;
      renderer.drawText(innerX + 2, curY++, "[ENTER] Play", currentTheme.highlight);
    }
  }
  else if (page === 'Website') {
    const boxW = Math.min(innerW, 40);
    const boxH = 8;
    const boxX = innerX + Math.floor((innerW - boxW) / 2);
    const boxY = curY + 2;

    for(let i=0; i<boxH; i++) renderer.drawText(boxX, boxY+i, ' '.repeat(boxW));
    renderer.drawBox(boxX, boxY, boxW, boxH, currentTheme.highlight);

    renderer.drawText(boxX + 2, boxY + 2, "Personal Website", currentTheme.primary);
    const siteUrl = data.website || "No website available";
    renderer.drawText(boxX + 2, boxY + 4, siteUrl, currentTheme.text);
    renderer.drawText(boxX + 2, boxY + 6, "[ENTER] Open In Browser", currentTheme.secondary);
  }
  else if (page === 'Connect') {
    const keys = Object.keys(data.seo || {});
    curY++;
    keys.forEach((key, idx) => {
      if (curY > y + h - 4) return;
      const isSelected = idx === state.connectIndex;
      const icon = isSelected ? currentTheme.highlight('▶') : ' ';
      
      renderer.drawText(innerX, curY++, `  ${icon} ${key.toUpperCase()}`, isSelected ? currentTheme.highlight : currentTheme.text);
      renderer.drawText(innerX, curY++, `      ${data.seo[key]}`, currentTheme.dim);
      curY++;
    });

    if (keys.length > 0 && curY < y + h - 2) {
      renderer.drawText(innerX, curY++, `  [ENTER] Open    [C] Copy URL`, currentTheme.secondary);
    }
  }
  else if (page === 'CV') {
    curY++;
    renderer.drawText(innerX, curY++, `  Curriculum Vitae`, currentTheme.primary);
    curY++;
    if (data.cv && data.cv.url) {
      renderer.drawText(innerX, curY++, `  URL: ${data.cv.url}`, currentTheme.text);
      curY++;
      renderer.drawText(innerX, curY++, `  [ENTER] Open CV In Browser`, currentTheme.highlight);
    } else {
      renderer.drawText(innerX, curY++, `  No CV link configured.`, currentTheme.dim);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOT SEQUENCE & RENDER LOOP
// ═══════════════════════════════════════════════════════════════

async function runBootSequence() {
  renderer.clearScreen();
  
  const msg = "RUDRA TERMINAL OS v2";
  const startX = Math.floor((renderer.width - msg.length) / 2);
  let startY = Math.floor(renderer.height / 2) - 3;
  
  renderer.drawText(startX, startY, msg, theme.current.highlight);
  renderer.render();
  await sleep(400);

  const steps = [
    'Initializing AI Core...',
    'Initializing Hardware Core...',
    'Initializing Creativity Engine...'
  ];

  for (const step of steps) {
    startY++;
    renderer.drawText(startX, startY, step, theme.current.secondary);
    renderer.render();
    await sleep(250);
  }

  startY += 2;
  renderer.drawText(startX, startY, "System Ready.", theme.current.primary);
  renderer.render();
  await sleep(400);
  
  state.booting = false;
  initStars();
  anim.start();
}

function drawHints(commandY) {
  const hints = `[↑/↓] Menu  [←/→] Select  [ENTER] Open  [TAB] Theme  [Q] Back  [CTRL+C] Exit`;
  const hintX = Math.max(0, Math.floor((renderer.width - hints.length)/2));
  renderer.drawText(hintX, commandY + 1, hints, theme.current.dim);

  const version = data.cli ? `${data.cli.package} v${data.cli.version}` : 'rudraa-cli v2.0.0';
  renderer.drawText(renderer.width - version.length - 2, commandY, version, theme.current.secondary);

  if (state.message) {
    renderer.drawText(Math.floor((renderer.width - state.message.length)/2), commandY, state.message, theme.current.highlight);
  }
}

function updateFrame() {
  if (state.booting) return;
  renderer.clearBuffer();
  
  drawBackground();

  // Use 75% of terminal width, capped at 160 columns
  let usableW = Math.floor(renderer.width * 0.75);
  if (usableW > 160) usableW = 160;
  if (usableW < 100) usableW = Math.min(renderer.width, 100);
  
  const startX = Math.floor((renderer.width - usableW) / 2);
  
  drawHeader(startX, usableW);
  const bannerHeight = 8;
  drawBanner(startX, 1, usableW);
  
  const heroY = bannerHeight + 1;
  const commandBarHeight = 2;
  const commandY = renderer.height - commandBarHeight;
  
  // Top Block: Panther left, Menu right
  const pantherW = 84;  // Panther box width (79 art + 2+2 padding + 1 border)
  const pantherH = 23;
  
  if (commandY - (heroY + pantherH) >= 5 && usableW > pantherW + 20) {
    drawPantherBox(startX, heroY, pantherW, pantherH);
    
    // Menu takes exactly the remaining width
    const menuW = usableW - pantherW;
    const menuX = startX + pantherW;
    drawMenuBox(menuX, heroY, menuW, pantherH);
    
    // Content panel: EXACTLY same width and X as top row combined
    // Left edge = startX (same as panther), right edge = startX + usableW (same as menu right)
    const contentY = heroY + pantherH;
    const contentH = commandY - contentY;
    
    drawRightPanel(startX, contentY, usableW, contentH);
  } else {
    // Fallback: no panther, menu left + content right
    const menuW = Math.max(28, Math.floor(usableW * 0.28));
    const contentW = usableW - menuW;
    const contentH = commandY - heroY;
    
    drawMenuBox(startX, heroY, menuW, contentH);
    drawRightPanel(startX + menuW, heroY, contentW, contentH);
  }

  drawHints(commandY);
  renderer.render();
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

process.stdout.on('resize', () => {
  if (!state.booting) {
    initStars();
    updateFrame();
  }
});

anim.on('tick', () => {
  updateFrame();
});

input.on('key', (name, key, sequence) => {
  if (state.booting) return;

  if (state.terminal.active) {
    if (name === 'return') {
      processTerminalCommand();
    } else if (name === 'backspace') {
      state.terminal.input = state.terminal.input.slice(0, -1);
    } else if (name === 'escape') {
      state.terminal.active = false;
    } else if (sequence && sequence.length === 1 && sequence.charCodeAt(0) >= 32) {
      state.terminal.input += sequence;
    }
    updateFrame();
    return;
  }

  if (sequence === ':') {
    state.terminal.active = true;
    updateFrame();
    return;
  }

  const page = state.isSecretLab ? 'LAB' : state.menu[state.menuIndex];

  if (name === 'up' && !state.game.active) {
    state.isSecretLab = false;
    state.showPopup = false;
    state.menuIndex = (state.menuIndex - 1 + state.menu.length) % state.menu.length;
    anim.frame = 0; 
    updateFrame();
    return;
  } 
  
  if (name === 'down' && !state.game.active) {
    state.isSecretLab = false;
    state.showPopup = false;
    state.menuIndex = (state.menuIndex + 1) % state.menu.length;
    anim.frame = 0;
    updateFrame();
    return;
  }

  if (name === 'q' || name === 'escape') {
    if (state.showPopup) {
      state.showPopup = false;
    } else if (state.game.active) {
      state.game.active = false;
    } else if (state.isSecretLab) {
      state.isSecretLab = false;
    }
    updateFrame();
    return;
  }

  if ((sequence === '?' || (key && key.name === 'h')) && !state.game.active && !state.showPopup) {
    if (!state.isSecretLab && data.lab) {
      state.isSecretLab = true;
      state.labIndex = 0;
      updateFrame();
    }
    return;
  }

  if (name === 'space' && state.game.active && !state.game.gameOver && state.game.catY === 0) {
    state.game.isJumping = true;
    state.game.velocity = 2.0;
    updateFrame();
    return;
  }

  if (name === 'left' && !state.game.active) {
    if (page === 'Projects' && !state.showPopup) {
      state.projectIndex = (state.projectIndex - 1 + data.projects.length) % data.projects.length;
      updateFrame();
    } else if (page === 'Connect') {
      const keys = Object.keys(data.seo || {});
      state.connectIndex = (state.connectIndex - 1 + keys.length) % keys.length;
      updateFrame();
    } else if (page === 'LAB') {
      state.labIndex = (state.labIndex - 1 + data.lab.length) % data.lab.length;
      updateFrame();
    }
    return;
  }

  if (name === 'right' && !state.game.active) {
    if (page === 'Projects' && !state.showPopup) {
      state.projectIndex = (state.projectIndex + 1) % data.projects.length;
      updateFrame();
    } else if (page === 'Connect') {
      const keys = Object.keys(data.seo || {});
      state.connectIndex = (state.connectIndex + 1) % keys.length;
      updateFrame();
    } else if (page === 'LAB') {
      state.labIndex = (state.labIndex + 1) % data.lab.length;
      updateFrame();
    }
    return;
  }

  if (name === 'tab') {
    theme.next();
    updateFrame();
    return;
  } 
  
  if (name === 'return') {
    if (page === 'Games') {
      if (state.game.gameOver) {
        state.game.gameOver = false;
        state.game.score = 0;
        state.game.obstacles = [];
      } else if (!state.game.active) {
        state.game.active = true;
        state.game.score = 0;
        state.game.obstacles = [];
        state.game.gameOver = false;
      }
    } else if (page === 'Projects') {
      state.showPopup = true;
    } else if (page === 'Website' && data.website) {
      openUrl(data.website);
      showMessage("Opening Website...");
    } else if (page === 'Connect') {
      const keys = Object.keys(data.seo || {});
      if (keys.length > 0) {
        const url = data.seo[keys[state.connectIndex]];
        if (url) {
          openUrl(url);
          showMessage(`Opening ${keys[state.connectIndex]}...`);
        }
      }
    } else if (page === 'CV' && data.cv && data.cv.url) {
      openUrl(data.cv.url);
      showMessage("Opening CV...");
    }
    updateFrame();
    return;
  } 
  
  if (name === 'c' && page === 'Connect') {
    const keys = Object.keys(data.seo || {});
    if (keys.length > 0) {
      const url = data.seo[keys[state.connectIndex]];
      if (url) {
        clipboardy.writeSync(url);
        showMessage("Copied to clipboard!");
      }
    }
    return;
  }
});

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  renderer.clearScreen();
  await runBootSequence();
}

main();
