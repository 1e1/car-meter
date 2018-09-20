class Meter {
    constructor(parentId, sensor, options) {
        const defaults = {
            title: null,
            title_margin: 10,
            value_cleaner: null,
            value_min: 0,
            value_max: 100,
            background_margin: 20,
            background_margin_mark: 14,
            background_lineWidth: 5,
            background_lineLength: 10,
            background_lineLength_mark: 16,
            background_opacity: 0.4,
            background_opacity_mark: 0.4,
            background_fill: "black",
            background_fill_mark: "black",
            background_stroke: 2,
            background_stroke_mark: 4,
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
        
        this.sensor = sensor;
        this.options = Object.assign(defaults, options);
        
        this.colors = [];
        this.stats = {avg:this.options.value_min};
        
        this.parentId = parentId;
        this.node = document.createElement('canvas');
        this.ctx = this.node.getContext('2d');
        this.background = null;

        this.width = null;
        this.height = null;
        this.hand_x = null;
        this.hand_y = null;
        this.hand_radius = null;
        this.history_x = null;
        this.history_y = null;
        this.history_width = null;
        this.history_height = null;
    }
    
    static from(parentId, sensor, options) {
        return new this(parentId, sensor, options);
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
        const width = parseInt(styles.getPropertyValue('width'), 10);
        const height = parseInt(styles.getPropertyValue('height'), 10);
        
        this.node.width = width;
        this.node.height = height;

        this.width = width;
        this.height = height;
        this.hand_x = Math.round(width/2);
        this.hand_y = Math.round(height/2);
        this.hand_radius = Math.round(Math.max(width, height) /2);
        this.history_x = this.hand_x;
        this.history_y = this.hand_y;
        this.history_width = width - this.history_x;
        this.history_height = height - this.history_y;

        this.sensor.options.buffer_size = this.hand_radius;
        this.sensor.options.history_size = this.history_width;
        
        return this;
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
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        const margin = this.options.title_margin;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, this.hand_radius, 0, 2* Math.PI);
        this.ctx.rect(this.history_x, this.history_y, this.history_width, this.history_height);
        this.ctx.fill();
        
        this.ctx.font = this.options.background_font;
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(this.options.title, this.hand_x +margin, this.height -margin);
        
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
            
        anchors.forEach((value, index) => {
            const isMark = 0 === index % 5;
            const percent = value / value_max;
            const teta = circle_size * percent;
            const teta_sin = -Math.sin(teta);
            const teta_cos = Math.cos(teta);
            const teta_x = teta_sin * this.hand_radius;
            const teta_y = teta_cos * this.hand_radius;
            
            let offset;
            let length;
            
            if (isMark) {
                this.ctx.globalAlpha = this.options.background_opacity_mark;
                this.ctx.strokeStyle = this.options.background_fill_mark;
                this.ctx.lineWidth = this.options.background_stroke_mark;
                
                offset = this.options.background_margin_mark;
                length = this.options.background_lineLength_mark;
            } else {
                this.ctx.globalAlpha = this.options.background_opacity;
                this.ctx.strokeStyle = this.options.background_fill;
                this.ctx.lineWidth = this.options.background_stroke;
                
                offset = this.options.background_margin;
                length = this.options.background_lineLength;
            }
            
            const x = teta_x;
            const y = teta_y;
            
            const x0 = teta_x - teta_sin * length;
            const y0 = teta_y - teta_cos * length;
            
            const x1 = x0 - teta_sin * offset;
            const y1 = y0 - teta_cos * offset;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.hand_x + x0, this.hand_y + y0);
            this.ctx.lineTo(this.hand_x + x, this.hand_y + y);
            this.ctx.stroke();
            
            this.ctx.fillText(value, this.hand_x + x1, this.hand_y + y1);
        });
        
        this.background = this.ctx.getImageData(0, 0, this.width, this.height);
        
        return this;
    }
    
    restoreBackground() {
        this.ctx.putImageData(this.background, 0, 0);
    }
    
    backgroundAnimation(color) {
        const liveList = this.sensor.getLiveList();
        const size = liveList.length;
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        
        this.ctx.lineWidth = 1;
        
        for (let i=1; i<size; ++i) {
            const value = liveList[i];
            const r = Meter.boundNumber(this.options.value_min, value, this.options.value_max);
            const percent = r / value_max;
            const teta = circle_size * percent;
            const teta_x = -Math.sin(teta) * this.hand_radius;
            const teta_y = Math.cos(teta) * this.hand_radius;
            
            const coeff = (size-i)/size;
            const coeffMin = 0.25 * coeff;
            
            const x = teta_x *coeff;
            const y = teta_y *coeff;
            
            const x0 = teta_x *coeffMin;
            const y0 = teta_y *coeffMin;
            
            this.ctx.globalAlpha = coeffMin;
            this.ctx.strokeStyle = this.getColor(1-percent);

            this.ctx.beginPath();
            this.ctx.moveTo(this.hand_x + x0, this.hand_y + y0);
            this.ctx.lineTo(this.hand_x + x, this.hand_y + y);
            this.ctx.stroke();
        }
        
        return this;
    }
    
    titleAnimation(color) {
        const ref = this.sensor.getValue() || this.options.value_min;
        const margin = this.options.title_margin;
        
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
        this.ctx.textBaseline = "bottom";

        this.ctx.strokeText(value, this.hand_x, this.hand_y -margin);
        this.ctx.fillText(value, this.hand_x, this.hand_y -margin);
        
        return this;
    }
    
    handAnimation(color) {
        const ref = this.sensor.getValue() || this.options.value_min;
        const ref0 = Meter.boundNumber(this.options.value_min, ref, this.options.value_max);
        const circle_size = this.options.circle_size;
        const value_max = this.options.value_max;
        const percent = ref0 / value_max;
        const lineWidth = Math.ceil(this.options.background_lineWidth * 2 * percent);
        
        const teta = circle_size * percent;
        const teta_x = -Math.sin(teta);
        const teta_y = Math.cos(teta);
        
        let x = teta_x * this.hand_radius;
        let y = teta_y * this.hand_radius;
        
        if (teta > 3*Math.PI/2) {
            x *= 2;
            y *= 2;
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        this.ctx.lineWidth = this.options.hand_lineWidth;
        
        // draw hand center
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, 2, 0, 2* Math.PI, false);
        this.ctx.fill();
        
        // draw hand line
        this.ctx.beginPath();
        this.ctx.moveTo(this.hand_x, this.hand_y);
        this.ctx.lineTo(this.hand_x + x, this.hand_y + y);
        this.ctx.stroke();

        // draw boundaries
        this.ctx.lineWidth = lineWidth;

        if (Math.PI/2 + (percent*circle_size) < 2* Math.PI) {
            this.ctx.strokeStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(this.hand_x, this.hand_y, this.hand_radius-(lineWidth/2), Math.PI/2 + (percent*circle_size), 2* Math.PI, false);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, this.hand_radius-(lineWidth/2), Math.PI/2, Math.PI/2 + (percent*circle_size), false);
        this.ctx.stroke();
        //this.ctx.beginPath();
        //this.ctx.arc(this.hand_x, this.hand_y, (this.hand_radius-lineWidth)*0.8, Math.PI/2, Math.PI/2 + (percent*circle_size), false);
        //this.ctx.stroke();
        
        return this;
    }
    
    historyAnimation() {
        const value_max = this.options.value_max;
        const line_width = 1;
        const history = this.sensor.getHistoryList();
        const grad = this.ctx.createLinearGradient(0, this.history_y, 0, this.history_y + this.history_height);
        
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "green");
        
        // draw history
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = grad;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = line_width;
        
        history.forEach((r, i) => {
            const x = this.history_width -1 - line_width*i;
            const coeff = this.history_height / value_max;
            const yMax = this.history_height - Math.floor(r.max * coeff);
            const y = this.history_height - Math.floor(r.avg * coeff);
            const yMin = this.history_height - Math.floor(r.min * coeff);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.history_x + x, this.history_y + yMin);
            this.ctx.lineTo(this.history_x + x, this.history_y + yMax);
            this.ctx.stroke();
            
            this.ctx.fillRect(this.history_x + x, this.history_y + y, 1, 1);
        });
        
        return this;
    }
    
    updateAnimation() {
        const ref = this.sensor.value || this.options.value_min;
        const value_max = this.options.value_max;
        const color = this.getColor(1-(ref/value_max));
        
        this.restoreBackground();
        this.backgroundAnimation(color);
        this.historyAnimation();
        this.titleAnimation(color);
        this.handAnimation(color);
        
        window.requestAnimationFrame(()=>this.updateAnimation());
        
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
}
