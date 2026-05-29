const readline = require('readline');
const EventEmitter = require('events');

class Input extends EventEmitter {
  constructor() {
    super();
    this.setup();
  }

  setup() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key && key.ctrl && key.name === 'c') {
        process.stdout.write('\x1b[?25h'); // Show cursor
        process.exit();
      }
      const name = key ? key.name : str;
      this.emit('key', name, key, str);
    });
  }
}

module.exports = new Input();
