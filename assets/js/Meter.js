class Meter {
    constructor(parentId, options) {
        const defaults = {
            title: null,
            value_cleaner: null,
            value_min: 0,
            value_max: 100,
            buffer_size: 128,
            background_lineWidth: 5,
            background_opacity: 0.4,
            background_fill: "black",
            background_font: "16px mono",
            hand_color: "red",
            hand_lineWidth: 3,
            foreground_opacity: 1,
            foreground_fill: "white",
            foreground_stroke: "black",
            foreground_font: "64px mono",
            circle_size: 0.8 * 2*Math.PI,
            percentColor: Meter.percentGreenRed,
        };
        
        this.options = Object.assign(defaults, options);
        
        this.values = [ this.options.value_min ];
        this.buffer = [ this.options.value_min ];
        this.history = [];
        this.colors = [];
        
        this.parentId = parentId;
        this.node = document.createElement('canvas');
        this.ctx = this.node.getContext('2d');
        this.background = null;
    }
    
    static from(parentId, options) {
        return new this(parentId, options);
    }
    
    static boundNumber(min, x, max) {
        return Math.min(max, Math.max(x, min));
    }
    
    static percentGreenRed(x) {
        const c = (x, dx, r) => Math.round(Math.sqrt(Math.max(0,Math.pow(r,2)-Math.pow(x-dx,2)))*240);
        
        const r = c(x,0,1);
        const g = c(x,1,1);
        const b = c(x,0.5,0.3);
        
        return `rgb(${r},${g},${b})`;
    }
    
    static percentBlueRed(x) {
        const c = (x, dx, r) => Math.round(Math.sqrt(Math.max(0,Math.pow(r,2)-Math.pow(x-dx,2)))*240);
        
        const r = c(x,0,1);
        const g = c(x,0.5,0.3);
        const b = c(x,1,1);
        
        return `rgb(${r},${g},${b})`;
    }
    
    generateColors(callback) {
        for (let i=0; i<=100; ++i) {
            this.colors[i] = callback(i/100);
        }
        
        return this;
    }
    
    getColor(i) {
        const percent = Math.round(i*100);
        
        return this.colors[percent];
    }
    
    updateCanvas() {
        const styles = getComputedStyle(this.node);
        const width  = parseInt(styles.getPropertyValue('width'), 10);
        const height = parseInt(styles.getPropertyValue('height'), 10);
        
        this.node.width = width;
        this.node.height = height;
        
        return this;
    }
    
    bufferize(entry) {
        const buffer_size = this.options.buffer_size;
        
        this.buffer.push(entry);
        
        if (buffer_size === this.buffer.length) {
            const ref = this.buffer[0];
            const stat = {
                count: 0,
                sum: ref,
                min: ref,
                max: ref,
                avg: null,
            };
            
            for (let i=1; i<buffer_size; ++i) {
                const item = this.buffer[i];
                stat.sum += item;
                if (stat.min > item) {
                    stat.min = item;
                }
                if (stat.max < item) {
                    stat.max = item;
                }
            }
            
            stat.count = buffer_size;
            stat.avg = Math.round(stat.sum / stat.count);
            
            this.buffer.splice(0);
            
            this.history.unshift(stat);
            
            return true;
        }
        
        return false;
    }
    
    getAnchors() {
        const anchors = [];
        const max = String(this.options.value_max);
        let pow = max.length - 1;
        
        if (String(max).charAt(0) < 3) {
            --pow;
        }
        
        const unit = Math.pow(10, pow);
        
        for (let i=this.options.value_min; i<=this.options.value_max; i+=unit) {
            anchors.push(i);
        }
        
        return anchors;
    }
    
    makeBackground() {
        const width  = this.node.width;
        const height = this.node.height;
        const center_x  = Math.round(width/2);
        const center_y = Math.round(height/2);
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.ctx.fillStyle = /*color; */ this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.beginPath();
        this.ctx.arc(center_x, center_y, width/2, 0, 2* Math.PI);
        this.ctx.moveTo(center_x, center_y);
        this.ctx.lineTo(width, center_y);
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(center_x, height);
        this.ctx.fill();
        
        this.ctx.font = this.options.background_font;
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.textAlign = "left";
        this.ctx.fillText(this.options.title, center_x +10, height -10);
        
        this.ctx.globalAlpha = this.options.background_opacity;
        this.ctx.strokeStyle = this.options.background_fill;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline="middle";
            
        anchors.forEach(value => {
            const percent = value / value_max;
            const teta = circle_size * percent;
            const teta_x = Math.sin(teta) * (-width/2);
            const teta_y = Math.cos(teta) * (height/2);
            
            const x = teta_x;
            const y = teta_y;
            
            const x0 = teta_x *0.9;
            const y0 = teta_y *0.9;
            
            const x1 = teta_x *0.8;
            const y1 = teta_y *0.8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(center_x + x0, center_y + y0);
            this.ctx.lineTo(center_x + x, center_y + y);
            this.ctx.stroke();
            
            this.ctx.fillText(value, center_x + x1, center_y + y1);
        });
        
        this.background = this.ctx.getImageData(0, 0, width, height);
        
        return this;
    }
    
    restoreBackground() {
        this.ctx.putImageData(this.background, 0, 0);
    }
    
    backgroundAnimation(color) {
        const buffer_size = this.options.buffer_size;
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        const size = this.values.length;
        const width  = this.node.width;
        const height = this.node.height;
        const center_x  = Math.round(width/2);
        const center_y = Math.round(height/2);
        
        this.ctx.lineWidth = 1;
        
        for (let i=1; i<size; ++i) {
            const r = Meter.boundNumber(this.options.value_min, this.values[i], this.options.value_max);
            const percent = r / value_max;
            const teta = circle_size * percent;
            const teta_x = Math.sin(teta) * (-width/2);
            const teta_y = Math.cos(teta) * (height/2);
            
            const coeffMin = (buffer_size-i)/buffer_size;
            const coeffMax = Math.max(0, buffer_size-i-8)/buffer_size;
            
            const x = teta_x *coeffMax;
            const y = teta_y *coeffMax;
            
            const x0 = teta_x *coeffMin;
            const y0 = teta_y *coeffMin;
            
            this.ctx.globalAlpha = coeffMin;
            this.ctx.strokeStyle = this.getColor(1-percent);
            this.ctx.beginPath();
            this.ctx.moveTo(center_x + x0, center_y + y0);
            this.ctx.lineTo(center_x + x, center_y + y);
            this.ctx.stroke();
        }
        
        this.values.splice(buffer_size);
        
        return this;
    }
    
    titleAnimation(color) {
        const ref = this.values[0];
        const width  = this.node.width;
        const height = this.node.height;
        const center_x  = Math.round(width/2);
        const center_y = Math.round(height/2);
        
        const value = null === this.options.value_cleaner
            ? Math.round(ref)
            : this.options.value_cleaner(ref)
            ;
        
        this.ctx.globalAlpha = this.options.foreground_opacity;
        this.ctx.lineWidth = 2;
        this.ctx.font = this.options.foreground_font;
        this.ctx.strokeStyle = this.options.foreground_stroke;
        this.ctx.fillStyle = this.options.foreground_fill;
        this.ctx.textAlign = "center";
        this.ctx.strokeText(value, center_x, center_y -10);
        this.ctx.fillText(value, center_x, center_y -10);
        
        return this;
    }
    
    handAnimation(color) {
        const ref = Meter.boundNumber(this.options.value_min, this.values[0], this.options.value_max);
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        const width  = this.node.width;
        const height = this.node.height;
        const center_x  = Math.round(width/2);
        const center_y = Math.round(height/2);
        const percent = ref / value_max;
        
        const teta = circle_size * percent;
        const teta_x = -Math.sin(teta);
        const teta_y = Math.cos(teta);
        
        const x = teta_x * (width-2)/2;
        const y = teta_y * (height-2)/2;
        
        // draw boundaries
        this.ctx.lineWidth = Math.ceil(this.options.background_lineWidth * 2 * percent);
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(center_x, center_y, (width-this.ctx.lineWidth)/2, 2, 2* Math.PI, false);
        this.ctx.stroke();
        
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        this.ctx.lineWidth = this.options.hand_lineWidth;
        
        // draw hand
        this.ctx.beginPath();
        this.ctx.arc(center_x, center_y, 2, 0, 2* Math.PI, false);
        this.ctx.fill();
        
        // draw hand center
        this.ctx.beginPath();
        this.ctx.moveTo(center_x, center_y);
        this.ctx.lineTo(center_x + x, center_y + y);
        this.ctx.stroke();
        
        return this;
    }
    
    historyAnimation() {
        const value_max = this.options.value_max;
        const width  = this.node.width;
        const height = this.node.height;
        const center_x  = Math.round(width/2);
        const center_y = Math.round(height/2);
        const history_width = width/2;
        const history_height = height/2;
        const grad = this.ctx.createLinearGradient(0, center_y, 0, height);
        const line_width = 2;
        
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "green");
        
        // draw history
        this.ctx.strokeStyle = grad;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = 1;
        
        this.history.forEach((r, i) => {
            const x = width -1 - line_width*i;
            const coeff = history_height / value_max;
            const yMax = height - Math.floor(r.max * coeff);
            const y = height - Math.floor(r.avg * coeff);
            const yMin = height - Math.floor(r.min * coeff);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, yMin);
            this.ctx.lineTo(x, yMax);
            this.ctx.stroke();
            
            this.ctx.fillRect(x, y, 1, 1);
        });
        
        this.history.splice(Math.round(history_width/line_width));
        
        return this;
    }
    
    updateAnimation() {
        const ref = this.values[0];
        const value_max = this.options.value_max;
        const color = this.getColor(1-(ref/value_max));
        
        //this.clearAnimation(color);
        this.restoreBackground();
        this.backgroundAnimation(color);
        
        this.titleAnimation(color);
        this.handAnimation(color);
        
        //window.requestAnimationFrame(rpmHistoryAnimation);
        
        this.historyAnimation();
        
        return this;
    }
    
    render() {
        if (null === this.background) {
            document.getElementById(this.parentId).appendChild(this.node);
            this.generateColors(this.options.percentColor);
        }
        
        this.updateCanvas();
        this.makeBackground();
        this.updateAnimation();
        
        return this;
    }
    
    step(value) {
        this.values.unshift(value);
        this.updateAnimation();
        this.bufferize(value);
    }
}
