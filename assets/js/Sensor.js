class Sensor {
    static boundNumber(min, x, max) {
        return Math.min(max, Math.max(x, min));
    }

    static getStats(list) {
        const size = list.length;
        const ref = list[0];
        const stat = {
            count: 0,
            sum: ref,
            min: ref,
            max: ref,
            avg: null,
        };
        
        for (let i=1; i<size; ++i) {
            const item = list[i];

            stat.sum += item;
            if (stat.min > item) {
                stat.min = item;
            }
            if (stat.max < item) {
                stat.max = item;
            }
        }
        
        stat.count = size;
        stat.avg = stat.sum / stat.count;

        return stat;
    }

    static from(options) {
        const sensor = new Sensor(options);

        return sensor;
    }

    constructor(options) {
        const defaults = {
            buffer_size: 128,
            history_size: 512,
            live_interval_ms: 100,
            base: 1,
        };
        
        this.pid = null;
        this.options = Object.assign(defaults, options || {});
        
        this.reset();
    }

    reset() {
        this.value = null;
        this.values = [];
        this.live = [];
        this.historyBuffer = [];
        this.history = [];

        return this;
    }

    setValue(value) {
        this.values.unshift(value / this.options.base);

        return this;
    }

    makeValue() {
        if (0 !== this.values.length) {
            const sum = this.values.reduce((s,i)=>s+i);
    
            this.value = sum / this.values.length;
        }

        return this;
    }

    getValue() {
        if (0 === this.values.length) {
            return this.value;
        }

        return this.values[0];
    }

    getLiveList() {
        return this.live;
    }

    getLiveAt(ms) {
        const index = Math.floor(ms / this.options.live_interval_ms);

        return this.live[index];
    }

    getHistoryList() {
        return this.history;
    }

    resetValues() {
        this.values.splice(0);

        return this;
    }

    updateLive(value) {
        this.live.unshift(value);
        this.live.splice(this.options.buffer_size);

        return this;
    }

    updateHistory(value) {
        this.historyBuffer.unshift(value);

        if (this.historyBuffer.length === this.options.buffer_size) {
            const stat = Sensor.getStats(this.historyBuffer);
            
            this.historyBuffer.splice(0);

            this.history.unshift(stat);
            this.history.splice(this.options.history_size);
        }

        return this;
    }

    update() {
        const value = this.makeValue().value;
        
        this.resetValues();

        this.updateLive(value);
        this.updateHistory(value);
    
        return this;
    }
    
    start(ms) {
        if (0 < ms) {
            this.options.live_interval_ms = ms;
        }
        
        if (null === this.pid) {
            this.pid = window.setInterval(()=>this.update(), this.options.live_interval_ms);
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