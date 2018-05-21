const chalk = require("chalk");
const header = chalk.blue(`
█████ ██    ██
██    ██    ██
█████ █████ ██ `);
class CLI {
    constructor() {
        this.commands = [];
        this.lastCommand = null;
        this._header = header;
    }
    argument(arg, abbr = null, desc = '', def = null) {
        this.lastCommand.arguments.push({
            name: arg,
            abbr: abbr,
            def: def,
            desc: desc
        });
        if (def) this.lastCommand.defaults[arg] = def;
        return this;
    }
    command(cmd, desc) {
        const newCommand = {
            name: cmd,
            desc: desc,
            arguments: [],
            examples: [],
            callback: null,
            defaults: {}
        };
        this.commands.push(newCommand);
        this.lastCommand = newCommand;
        return this;
    }
    callback(f) {
        this.lastCommand.callback = f;
        return this;
    }
    example(cmd, desc) {
        this.lastCommand.examples.push({
            example: cmd,
            desc: desc
        });
        return this;
    }
    extractArguments(argv) {
        return argv
            .filter(i => i.charAt(0) === '-')
            .map(i => i.replace(/(^-*)/, ''))
            .reduce((acc, i) => {
                acc[i.split('=')[0]] = i.split('=')[1] || true;
                return acc;
            }, {});
    }
    extractCommand(argv) {
        let cmd = argv
            .filter(i => i.charAt(0) !== '-' && i.indexOf('\\') === -1 && i.indexOf('\/') === -1)
            .pop();
        return this.commands.find(i => i.name === cmd);
    }
    extractPipe(cb) {
        if (process.stdin.isTTY) {
            cb();
        } else {
            process.stdin.resume();
            process.stdin.setEncoding("utf8");
            process.stdin.on("data", pipe => cb(pipe.trim()));
        }
    }
    help() {
        console.log(this._header);
        console.log();
        this.commands.forEach(i => {
            console.log(chalk.bold(i.name));
            console.log(chalk.grey(i.desc));
            if (i.arguments.length) {
                console.log();
                i.arguments.forEach(j => {
                    console.log(`  --${j.name},-${j.abbr}`, chalk.grey(j.desc));
                });
            }
            if (i.examples.length) {
                i.examples.forEach(j => {
                    if (j.desc) console.log(chalk.grey(`  // ${j.desc}`));
                    console.log(`  ${j.example}`);
                });
            }
            console.log();
        });
    }
    header(header) {
        this.header = header;
    }
    start(argv = process.argv) {
        let args = this.extractArguments(argv);
        let cmd = this.extractCommand(argv);

        // pipe mode
        if (cmd) this.startPipeMode(cmd, args);

        // interactive mode
        if (!cmd && args.i) this.startInteractiveMode(cmd, args);
    }
    startInteractiveMode(cmd, args) {
        const that = this;
        let readline = require('readline');
        let rl = readline.createInterface(process.stdin, process.stdout);
        let prefix = '$ ';
        rl.setPrompt(prefix, prefix.length);
        rl.on('line', processLine);
        rl.on('close', close);
        let originalTTYwrite = rl._ttyWrite;
        rl.prompt();

        function processLine(line) {
            let data = line.trim();
            if (data === 'quit' || data === 'exit') rl.close();
            let argv = data.replace(/ +(?= )/g, '').split(' ').map(i => i.trim());
            let args = that.extractArguments(argv);
            let cmd = that.extractCommand(argv);
            if (!cmd) return;
            if (Object.keys(cmd.defaults)) args = Object.assign(cmd.defaults, args);
            cmd.callback(args);
            rl.prompt();
        };

        function keypress(char, key) {
            if (key && key.name && key.name == 'q') {
                rl.on('line', processLine);
                rl._ttyWrite = originalTTYwrite; //assign back to original keypress handler
                rl.prompt();
            } else {
                console.log(key);
            }
        };

        function close() {
            process.exit(0);
        };
    }
    startPipeMode(cmd, args) {
        return this.extractPipe(pipe => {
            if (Object.keys(cmd.defaults)) args = Object.assign(cmd.defaults, args);
            if (pipe) args.pipe = pipe;
            return cmd.callback(args);
        });
    }
}
module.exports = (new CLI());