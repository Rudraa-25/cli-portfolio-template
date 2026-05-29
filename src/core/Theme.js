const assets = require('../assets.js');

class Theme {
  constructor() {
    this.themes = assets.themes;
    this.currentIndex = 0;
  }

  get current() {
    return this.themes[this.currentIndex];
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.themes.length;
  }
}

module.exports = new Theme();
