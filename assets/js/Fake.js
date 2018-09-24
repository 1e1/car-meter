class FakeRotor {
    constructor(options) {
        const defaults = {
            min: 0,
            default: null,
            delta: 1,
            max: 100,
        }
        
        this.options = Object.assign(defaults, options || {});
        
        this.delta = 0;
        this.step = 0;
        this.value = null===this.options.default
            ? this.options.min
            : this.options.default
            ;
        this.target = this.value;
        this.frequency = 1;
    }
    
    static from(options) {
        return new this(options);
    }

    setDelta(value) {
        if (this.target < this.value) {
            this.delta = -value / this.frequency;
        } else {
            this.delta = value / this.frequency;
        }

        return this;
    }
    
    make() {
        const offset = this.options.max - this.options.min;
        const rand = Math.pow(Math.random(), 3);
        const delta = Math.random() * this.options.delta;

        this.target = this.options.min + rand * offset;
        this.step = 1 + Math.round(Math.random() * 100);
                
        this.setDelta(delta);
        
        return this;
    }
    
    get() {
        if (0 > --this.step) {
            this.make();
        }

        let delta = (this.target - this.value) /2;

        if (Math.abs(delta) < Math.abs(this.delta)) {
            this.setDelta(delta);
        }

        this.value += delta /100;

        if (this.delta < this.options.delta/10) {
            this.step = Math.round(this.step / 4);
        }
        
        return this.value;
    }
}

class Fake {
    constructor() {
        this.pid = null;
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
            callback: options.callback,
        }
        
        this.fakes.push(fake);
    }
    
    step() {
        this.fakes.forEach(fake => {
            const value = fake.engine.get();
            const options = fake.engine.options;
            
            fake.callback(value, options.max, options.min);
        });
        
        return this;
    }
    
    start(ms) {
        if (null === this.pid) {
            this.fakes.forEach(f => {
                f.frequency = 500 / ms;
            });

            this.pid = window.setInterval(()=>this.step(), ms);
        }
        
        return this;
    }
    
    stop() {
        if (null !== this.pid) {
            window.clearInterval(this.pid);
            this.pid = null;
        }
        
        return this;
    }
    
    restart(ms) {
        return this.stop().start(ms);
    }
}
