class FakeRotor {
    constructor(options) {
        const defaults = {
            min: 0,
            default: null,
            delta: 1,
            max: 100,
        }
        
        this.options = Object.assign(defaults, options || {});
        
        //console.log(this.options);
        
        this.delta = 0;
        this.step = 0;
        this.value = null===this.options.default
            ? this.options.min
            : this.options.default
            ;
    }
    
    static from(options) {
        return new this(options);
    }
    
    make() {
        const delta = this.options.delta;
        const diff = (Math.random() * delta) - (delta / 2);
        
        this.step = 1 + Math.round(Math.random() * 20);
        
        let target = this.value + diff;
        
        if (this.options.max < target) {
            target = target - this.options.max;
        } else if (target < this.options.min) {
            target = this.options.min - target;
        }
        
        this.delta = (target - this.value) / this.step;
        
        //console.log(this.value, target, this.delta, this.step);
        
        return this;
    }
    
    get() {
        if (0 > --this.step) {
            this.make();
        }
        
        this.value += this.delta;
        this.value = Math.max(this.options.min, Math.min(this.value, this.options.max));
        
        return this.value;
    }
}

class Fake {
    constructor() {
        this.timer = null;
        this.fakes = [];
    }
    
    static from(options) {
        const fake = new this();
        
        if (Array.isArray(options)) {
            options.forEach(opt => fake.add(opt));
        } else {
            fake.add(options);
        }
        
        return fake;
    }
    
    add(options) {
        const defaults = {
            callback: null,
            min: 0,
            delta: 10,
            max: 100,
        };
        
        options = Object.assign(defaults, options);
        
        const fake = {
            engine: FakeRotor.from(options),
            callback: defaults.callback,
        }
        
        this.fakes.push(fake);
    }
    
    step() {
        this.fakes.forEach(fake => {
            const value = fake.engine.get();
            
            fake.callback(value);
        });
        
        return this;
    }
    
    start(ms) {
        if (null===this.timer) {
            this.timer = window.setInterval(()=>this.step(), ms);
        }
        
        return this;
    }
    
    stop() {
        if (null!==this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
        
        return this;
    }
}
