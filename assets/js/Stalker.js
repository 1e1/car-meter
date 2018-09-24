class Stalker {
    constructor(steps, options) {
        this.index = -1;
        this.since = -1;
        this.steps = [];
        this.metas = [];
        
        this.level = null;
        this.previousLevel = null;
        
        this.init(steps, options);
    }
    
    static from(steps, options) {
        return new this(steps, options);
    }
    
    static fromFrance(options) {
        return new this([30,50,70,80,90,110,130], options);
    }
    
    init(steps, options) {
        const defaults = {
            type: "velocity",
            alert_duration: 5000,
            alert_overspeed: 5,
        }
        
        this.options = Object.assign(defaults, options || {});
        this.steps = steps.sort((a,b)=>a-b);
        
        this.setMetas(this.steps);
    }
    
    setMetas(steps) {
        let min = 0;
        
        steps.forEach(step => {
            const delta = Math.round((step-min)/2);
            
            const meta = {
                value: step,
                warnAt: step - delta,
            };
            
            this.metas.push(meta);
            
            min = step;
        });
    }
    
    getLevel() {
        const now = Date.now();
        
        if (this.since < now) {
            return this.level;
        }
        
        return null;
    }
    
    getTimeLevel(value) {
        if (this.metas.length === this.index) {
            //console.log("OVER", value);
            return '!';
        }
        
        const meta = this.metas[this.index];
        const now = Date.now();
        
        if (now < this.since) {
            if (meta.warnAt < value) {
                this.previousLevel = null;
            } else {
                //console.log("NEW", value, meta.value);
                return this.previousLevel;
            }
        } else {
            if (meta.warnAt < value) {
                this.previousLevel = meta.value;
                
                //console.log("WARN", value, meta.value);
                return meta.value;
            }
        }
        
        return null;
    }
    
    getVelocityLevel(value) {
        if (this.metas.length === this.index) {
            return '!';
        }
        
        const meta = this.metas[this.index];
        
        if (meta.warnAt < value) {
            this.previousLevel = meta.value;
            
            return this.previousLevel;
        } else {
            if (this.previousLevel < value) {
                if (value < this.previousLevel + this.options.alert_overspeed) {
                    
                    return this.previousLevel;
                } else {
                    this.previousLevel = null;
                }
            } else {
                this.previousLevel = null;
            }
        }
        
        return null;
    }
    
    findIndex(value) {
        let i = this.steps.length;
        
        do {
            // nothing
        } while (value < this.steps[--i]);
        
        return i+1;
    }
    
    async update(value) {
        const index = this.findIndex(value);
        
        if (this.index !== index) {
            this.index = index;
        }
        
        const level = "time"===this.options.type
            ? this.getTimeLevel(value)
            : this.getVelocityLevel(value)
            ;
        
        if (level !== this.level) {
            if (null !== level) {
                this.since = Date.now() + this.options.alert_duration;
            }
            
            this.level = level;
        }
        
        return this;
    }
}