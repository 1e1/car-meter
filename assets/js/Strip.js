class Strip {
    constructor(parentId, options) {
        const defaults = {
            title: null,
            title_margin: 10,
            value_cleaner: null,
            value_min: 0,
            value_max: 100,
            buffer_size: 128,
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
            title_width: null,
            hand_width: null,
            history_width: null,
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
    
    updateCanvas() {
        const styles = getComputedStyle(this.node);
        const width = parseInt(styles.getPropertyValue('width'), 10);
        const height = parseInt(styles.getPropertyValue('height'), 10);
        
        this.node.width = width;
        this.node.height = height;
        
        this.setTitleContext();
        
        this.options.title_width = this.ctx.measureText("888").width;
        
        const panelWidth = Math.round((width - this.options.title_width) / 2);
        
        this.options.hand_width = panelWidth;
        this.options.history_width = panelWidth;
        
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
        const width = this.node.width;
        const height = this.node.height;
        const center_x = this.options.history_width + this.options.hand_width;
        const value_max = this.options.value_max;
        const margin = this.options.title_margin;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.fillRect(0, 0, width, height);
        
        this.ctx.font = this.options.background_font;
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(this.options.title, margin, margin);
        
        this.ctx.textAlign = "center";
        this.ctx.textBaseline="middle";
            
        anchors.forEach((value, index) => {
            const isMark = 0 === index % 5;
            const percent = value / value_max;
            const y = height * (1-percent);
            
            let offset;
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
            this.ctx.moveTo(center_x, y);
            this.ctx.lineTo(center_x - length, y);
            this.ctx.stroke();
        });
        
        this.background = this.ctx.getImageData(0, 0, width, height);
        
        return this;
    }
    
    restoreBackground() {
        this.ctx.putImageData(this.background, 0, 0);
    }
    
    backgroundAnimation() {
        const buffer_size = this.options.buffer_size;
        const line_width = 1;
        const value_max = this.options.value_max;
        const size = this.values.length;
        const height = this.node.height;
        const center_x = this.options.history_width + this.options.hand_width;
        const w = this.options.hand_width;
        const grad = this.ctx.createLinearGradient(0, 0, 0, height);
        
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "green");
        
        this.ctx.strokeStyle = grad;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = line_width;
        
        for (let i=1; i<size; ++i) {
            const r = Strip.boundNumber(this.options.value_min, this.values[i], this.options.value_max);
            const percent = r / value_max;
            const y = Math.round(height * (1-percent));
            
            const coeffMin = i/buffer_size;
            const coeffMax = (i+8)/buffer_size;
            
            const x = w *coeffMax;
            
            const x0 = w *coeffMin * 1.25;
            
            this.ctx.globalAlpha = 1-coeffMin;
            this.ctx.beginPath();
            this.ctx.moveTo(center_x - x0, y);
            this.ctx.lineTo(center_x - x, y);
            this.ctx.stroke();
        }
        
        this.values.splice(buffer_size);
        
        return this;
    }
    
    setTitleContext() {
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1;
        this.ctx.font = this.options.foreground_font;
        this.ctx.strokeStyle = this.options.foreground_stroke;
        this.ctx.fillStyle = this.options.foreground_fill;
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "middle";
        
        return this;
    }
    
    titleAnimation() {
        const ref = this.values[0];
        const width = this.node.width;
        const height = this.node.height;
        const center_y = Math.round(height/2);
        const margin = this.options.title_margin;
        
        const value = null === this.options.value_cleaner
            ? Math.round(ref)
            : this.options.value_cleaner(ref)
            ;
        
        this.setTitleContext();
        
        this.ctx.strokeText(value, width -margin, center_y);
        this.ctx.fillText(value, width -margin, center_y);
        
        return this;
    }
    
    handAnimation() {
        const ref = Strip.boundNumber(this.options.value_min, this.values[0], this.options.value_max);
        const value_max = this.options.value_max;
        const height = this.node.height;
        const center_x = this.options.hand_width + this.options.history_width;
        const percent = ref / value_max;
        
        const y = Math.round(height * (1-percent));
        
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        this.ctx.lineWidth = this.options.hand_lineWidth;
        
        // draw hand
        this.ctx.beginPath();
        this.ctx.arc(center_x, y, 2, 0, 2* Math.PI, false);
        this.ctx.fill();

        const grad = this.ctx.createLinearGradient(0, 0, center_x, 0);
        
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, this.options.hand_color);
        grad.addColorStop(1, this.options.hand_color);
        
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 2*percent* this.options.hand_lineWidth;
        
        // draw hand center
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(center_x, y);
        this.ctx.stroke();
        
        return this;
    }
    
    historyAnimation() {
        const value_max = this.options.value_max;
        const line_width = 1;
        const width = this.node.width;
        const height = this.node.height;
        const center_x = 0;
        const center_y = 0;
        const history_width = width/3;
        const history_height = height;
        const w = center_x + history_width;
        const h = center_y + history_height;
        const grad = this.ctx.createLinearGradient(0, center_y, 0, h);
        
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "green");
        
        // draw history
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = grad;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = line_width;
        
        this.history.forEach((r, i) => {
            const x = w -1 - line_width*i;
            const coeff = history_height / value_max;
            const yMax = h - Math.floor(r.max * coeff);
            const y = h - Math.floor(r.avg * coeff);
            const yMin = h - Math.floor(r.min * coeff);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, yMin);
            this.ctx.lineTo(x, yMax);
            this.ctx.stroke();
            
            this.ctx.fillRect(x, y, 1, 1);
        });
        
        this.history.splice(this.options.history_width);
        
        return this;
    }
    
    updateAnimation() {
        //this.clearAnimation();
        this.restoreBackground();
        this.backgroundAnimation();
        
        this.historyAnimation();
        this.titleAnimation();
        this.handAnimation();
        
        //window.requestAnimationFrame(rpmHistoryAnimation);
        
        return this;
    }
    
    render() {
        if (null === this.background) {
            document.getElementById(this.parentId).appendChild(this.node);
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
