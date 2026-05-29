const pc = require('picocolors');

class Renderer {
  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = (process.stdout.rows || 24) - 1; // Strictly limit height to prevent scrolling
    this.buffer = [];
    this.clearBuffer();
    
    process.stdout.on('resize', () => {
      this.width = process.stdout.columns || 80;
      this.height = (process.stdout.rows || 24) - 1;
      this.clearBuffer();
    });
  }

  clearBuffer() {
    this.buffer = Array(this.height).fill(0).map(() => Array(this.width).fill(' '));
  }

  getUsableWidth() {
    let usable = Math.max(80, Math.floor(this.width * 0.85));
    if (usable > this.width) usable = this.width;
    return usable;
  }

  getLeftPanelWidth() {
    return 26; // Fixed width as per preference
  }

  getRightPanelWidth() {
    let right = this.getUsableWidth() - this.getLeftPanelWidth();
    if (this.width > 100 && right < 60) right = 60; 
    if (this.getLeftPanelWidth() + right > this.width) {
      right = this.width - this.getLeftPanelWidth();
    }
    return right;
  }

  getStartX() {
    const total = this.getLeftPanelWidth() + this.getRightPanelWidth();
    return Math.floor((this.width - total) / 2);
  }

  getStartY() {
    // Leave some space for the banner at the top
    return 8; 
  }

  stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  drawText(x, y, text, colorFn = (x)=>x) {
    if (y < 0 || y >= this.height) return;
    
    const stripped = this.stripAnsi(text);
    if (x < 0 || x >= this.width) return;
    
    for (let i = 0; i < stripped.length; i++) {
      if (x + i < this.width) {
        this.buffer[y][x + i] = colorFn(stripped[i]);
      }
    }
  }

  drawBox(x, y, w, h, colorFn = pc.white) {
    if (w <= 1 || h <= 1) return;
    this.drawText(x, y, '╔' + '═'.repeat(w - 2) + '╗', colorFn);
    for (let i = 1; i < h - 1; i++) {
      this.drawText(x, y + i, '║', colorFn);
      this.drawText(x + w - 1, y + i, '║', colorFn);
    }
    this.drawText(x, y + h - 1, '╚' + '═'.repeat(w - 2) + '╝', colorFn);
  }

  drawVerticalLine(x, y, h, colorFn = pc.white) {
    for (let i = 0; i < h; i++) {
      this.drawText(x, y + i, '│', colorFn);
    }
  }

  drawHorizontalLine(x, y, w, colorFn = pc.white) {
    this.drawText(x, y, '─'.repeat(w), colorFn);
  }

  render() {
    let output = '\x1b[H'; // Move cursor to top-left
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        output += this.buffer[y][x];
      }
      if (y < this.height - 1) output += '\n';
    }
    process.stdout.write(output);
  }

  clearScreen() {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    process.stdout.write('\x1b[?25l'); // Hide cursor
  }

  showCursor() {
    process.stdout.write('\x1b[?25h');
  }
}

module.exports = new Renderer();
