class HStrip {
    constructor(sensor, options) {
        const defaults = {
            parentNode: document.body,
            title: null,
            title_margin: 10,
            value_cleaner: Math.round,
            value_min: 0,
            value_max: 100,
            background_margin: 20,
            background_margin_mark: 14,
            background_lineLength: 10,
            background_lineLength_mark: 16,
            background_opacity: 0.4,
            background_opacity_mark: 0.5,
            background_fill: "black",
            background_fill_mark: "red",
            background_stroke: 1,
            background_stroke_mark: 2,
            background_font: "16px mono",
            hand_color: "red",
            hand_lineWidth: 1,
            foreground_opacity: 1,
            foreground_fill: "white",
            foreground_stroke: "black",
            foreground_font: "64px mono",
            percentColor: HStrip.percentGreenRed,
        };
        
        this.sensor = sensor;
        this.options = Object.assign(defaults, options);
        
        this.colors = [];

        this.node = document.createElement('canvas');
        this.ctx = this.node.getContext('2d');
        this.background = null;

        this.width = null;
        this.height = null;
        this.history_x = null;
        this.history_y = null;
        this.history_width = null;
        this.history_height = null;
        this.hand_x = null;
        this.hand_y = null;
        this.hand_width = null;
        this.hand_height = null;
        this.title_x = null;
        this.title_y = null;
    }
    
    static from(sensor, options) {
        return new this(sensor, options);
    }
    
    static percentGreenRed(x) {
        const c = (x, dx, r) => Math.round(Math.sqrt(Math.max(0,Math.pow(r,2)-Math.pow(x-dx,2)))*240);
        
        const r = c(x,1,1);
        const g = c(x,0,1);
        const b = c(x,0.5,0.3);
        
        return `rgb(${r},${g},${b})`;
    }
    
    static percentBlueRed(x) {
        if (x<0.5) {
            const r = Math.round(Math.sin(x*Math.PI) *240);
            const g = Math.round(240 - Math.cos(x*Math.PI) *120);
            const b = Math.round(Math.cos(x*Math.PI) *240);

            return `rgb(${r},${g},${b})`;
        }

        const r = 240;
        const g = Math.round(Math.sin(x*Math.PI) *240);
        const b = 0;

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
        
        return this.colors[percent] || "red";
    }
    
    updateCanvas() {
        const styles = getComputedStyle(this.node);
        const width = parseInt(styles.getPropertyValue('width'), 10);
        const height = parseInt(styles.getPropertyValue('height'), 10);
        
        this.node.width = width;
        this.node.height = height;
        
        this.setTitleContext();

        this.width = width;
        this.height = height;
        this.hand_x = 0;
        this.hand_y = 0;
        this.hand_width = width;
        this.hand_height = this.options.background_lineLength_mark;
        this.history_x = 0;
        this.history_y = this.hand_height;
        this.history_width = width;
        this.history_height = height - this.hand_height;
        this.title_x = width >> 1;
        this.title_y = this.hand_height + ((height-this.hand_height) >> 1);
        
        this.sensor.options.buffer_size = this.hand_width;
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
        const margin = this.options.title_margin;
        const value_max = this.options.value_max;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.font = this.options.background_font;
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(this.options.title, this.width -margin, this.history_y + margin);
        
        this.ctx.textAlign = "center";
        this.ctx.textBaseline="middle";
            
        anchors.forEach((value, index) => {
            const isMark = 0 === index % 5;
            const x = this.width * value/value_max;
            
            let length;
            
            if (isMark) {
                this.ctx.globalAlpha = this.options.background_opacity_mark;
                this.ctx.strokeStyle = this.options.background_fill_mark;
                this.ctx.lineWidth = this.options.background_stroke_mark;
                
                length = this.options.background_lineLength_mark;
            } else {
                this.ctx.globalAlpha = this.options.background_opacity;
                this.ctx.strokeStyle = this.options.background_fill;
                this.ctx.lineWidth = this.options.background_stroke;
                
                length = this.options.background_lineLength;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, length);
            this.ctx.stroke();
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
        const grad = this.ctx.createLinearGradient(this.hand_x, 0, this.hand_x + this.hand_width, 0);
        
        grad.addColorStop(0, "green");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "red");
        
        this.ctx.fillStyle = grad;
        
        for (let i=1; i<size; ++i) {
            const value = liveList[i];
            const x = Math.round(this.hand_width * value);
            
            const coeff = i / size;
            
            const y = this.history_height * coeff;
            
            this.ctx.globalAlpha = 1-coeff;
            
            this.ctx.fillRect(this.hand_x + x, this.history_y + y, 1, 1);
        }
        
        return this;
    }
    
    setTitleContext() {
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1;
        this.ctx.font = this.options.foreground_font;
        this.ctx.strokeStyle = this.options.foreground_stroke;
        this.ctx.fillStyle = this.options.foreground_fill;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        
        return this;
    }
    
    titleAnimation(color) {
        const value = this.sensor.getValue();
        const value_max = this.options.value_max;
        const title = this.options.value_cleaner(value * value_max);
        
        this.setTitleContext();
        
        this.ctx.strokeText(title, this.title_x, this.title_y);
        this.ctx.fillText(title, this.title_x, this.title_y);
        
        return this;
    }
    
    handAnimation(color) {
        const value = this.sensor.getValue();
        const x = Math.round(this.hand_width * value);
        
        this.ctx.fillStyle = color;
        
        this.ctx.fillRect(this.hand_x, this.hand_y, x, this.hand_height);
        
        return this;
    }
    
    historyAnimation() {
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
            const yMax = this.history_height * (1-r.max);
            const y = this.history_height * (1-r.avg);
            const yMin = this.history_height * (1-r.min);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.history_x + x, this.history_y + yMin);
            this.ctx.lineTo(this.history_x + x, this.history_y + yMax);
            this.ctx.stroke();
            
            this.ctx.fillRect(this.history_x + x, this.history_y + y, 1, 1);
        });
        
        return this;
    }
    
    updateAnimation() {
        const value = this.sensor.value;
        const color = this.getColor(value);

        //this.clearAnimation();
        this.restoreBackground();
        //this.backgroundAnimation(color);
        this.historyAnimation();
        this.titleAnimation(color);
        this.handAnimation(color);
        
        window.requestAnimationFrame(()=>this.updateAnimation());
        
        return this;
    }
    
    render() {
        this.sensor.reset();

        if (null === this.background) {
            this.options.parentNode.appendChild(this.node);

            this.generateColors(this.options.percentColor);
        }
        
        this.updateCanvas();
        this.makeBackground();
        this.updateAnimation();
        
        return this;
    }
}
