const EventEmitter = require('events');

class Animation extends EventEmitter {
  constructor() {
    super();
    this.tickRate = 50; // ms (20 FPS)
    this.timer = null;
    this.frame = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.frame++;
      this.emit('tick', this.frame);
    }, this.tickRate);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = new Animation();
