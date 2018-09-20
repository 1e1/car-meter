class Strip {
    constructor(parentId, sensor, options) {
        const defaults = {
            title: null,
            title_margin: 10,
            value_cleaner: null,
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
        };
        
        this.sensor = sensor;
        this.options = Object.assign(defaults, options);
        
        this.parentId = parentId;
        this.node = document.createElement('canvas');
        this.ctx = this.node.getContext('2d');
        this.background = null;

        this.width = null;
        this.height = null;
        this.history_x = null;
        this.history_width = null;
        this.hand_x = null;
        this.hand_width = null;
        this.title_x = null;
        this.title_width = null;
        this.center_y = null;
    }
    
    static from(parentId, sensor, options) {
        return new this(parentId, sensor, options);
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

        const char3_width = this.ctx.measureText("888").width;
        const panelWidth = Math.round((width - char3_width) / 2);

        this.width = width;
        this.height = height;
        this.history_x = 0;
        this.history_width = panelWidth;
        this.hand_x = this.history_x + this.history_width;
        this.hand_width = panelWidth;
        this.title_x = this.hand_x + this.hand_width;
        this.title_width = width - this.title_x;
        this.center_y = Math.round(height/2);

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
        const value_max = this.options.value_max;
        const margin = this.options.title_margin;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.fillRect(0, 0, this.width, this.height);
        
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
            const y = this.height * (1-percent);
            
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
            this.ctx.moveTo(this.title_x, y);
            this.ctx.lineTo(this.title_x - length, y);
            this.ctx.stroke();
        });
        
        this.background = this.ctx.getImageData(0, 0, this.width, this.height);
        
        return this;
    }
    
    restoreBackground() {
        this.ctx.putImageData(this.background, 0, 0);
    }
    
    backgroundAnimation() {
        const liveList = this.sensor.getLiveList();
        const size = liveList.length;
        const line_width = 1;
        const value_max = this.options.value_max;
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "yellow");
        grad.addColorStop(1, "green");
        
        this.ctx.strokeStyle = grad;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = line_width;
        
        for (let i=1; i<size; ++i) {
            const value = liveList[i];
            const r = Strip.boundNumber(this.options.value_min, value, this.options.value_max);
            const percent = r / value_max;
            const y = Math.round(this.height * (1-percent));
            
            const coeff = i/size;
            
            const x = this.hand_width * coeff;
            const x0 = x * 1.25;
            
            this.ctx.globalAlpha = 1-coeff;
            this.ctx.beginPath();
            this.ctx.moveTo(this.hand_x + this.hand_width - x0, y);
            this.ctx.lineTo(this.hand_x + this.hand_width - x, y);
            this.ctx.stroke();
        }
        
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
        const ref = this.sensor.getValue() || this.options.value_min;
        const margin = this.options.title_margin;
        
        const value = null === this.options.value_cleaner
            ? Math.round(ref)
            : this.options.value_cleaner(ref)
            ;
        
        this.setTitleContext();
        
        this.ctx.strokeText(value, this.title_x + this.title_width -margin, this.center_y);
        this.ctx.fillText(value, this.title_x + this.title_width -margin, this.center_y);
        
        return this;
    }

    ghostAnimation() {
        const previousList = this.sensor.getLiveList();
        const raw0 = this.sensor.getValue() || this.options.value_min;
        const raw1 = previousList[10] || this.options.value_min;
        const value_max = this.options.value_max;
        const diff = raw0 - raw1;
        const ref = Meter.boundNumber(this.options.value_min, raw0, this.options.value_max);
        const ref1 = Meter.boundNumber(this.options.value_min, raw0 + diff, this.options.value_max);
        const percent = ref / value_max;
        const percent1 = ref1 / value_max;
        const lineWidth = this.options.background_lineLength_mark;
        
        const y = Math.round(this.height * (1-percent));
        const y1 = Math.round(this.height * (1-percent1));
        
        this.ctx.globalAlpha = this.options.background_opacity;
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        
        // draw hand line
        this.ctx.beginPath();
        if (y < y1) {
            this.ctx.fillRect(this.title_x-lineWidth, y, lineWidth, y1-y);
        } else {
            this.ctx.fillRect(this.title_x-lineWidth, y1, lineWidth, y - y1);
        }
        this.ctx.stroke();
        
        return this;
    }
    
    handAnimation() {
        const ref = this.sensor.getValue() || this.options.value_min;
        const ref0 = Meter.boundNumber(this.options.value_min, ref, this.options.value_max);
        const value_max = this.options.value_max;
        const percent = ref0 / value_max;
        
        const y = Math.round(this.height * (1-percent));
        
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        this.ctx.lineWidth = this.options.hand_lineWidth;
        
        // draw hand center
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x + this.hand_width, y, 2, 0, 2* Math.PI, false);
        this.ctx.fill();

        const grad = this.ctx.createLinearGradient(0, 0, this.hand_x + this.hand_width, 0);
        
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, this.options.hand_color);
        grad.addColorStop(1, this.options.hand_color);
        
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 2*percent* this.options.hand_lineWidth;
        
        // draw hand
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.hand_x + this.hand_width, y);
        this.ctx.stroke();
        
        return this;
    }
    
    historyAnimation() {
        const value_max = this.options.value_max;
        const line_width = 1;
        const history = this.sensor.getHistoryList();
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        
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
            const coeff = this.height / value_max;
            const yMax = this.height - Math.floor(r.max * coeff);
            const y = this.height - Math.floor(r.avg * coeff);
            const yMin = this.height - Math.floor(r.min * coeff);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.history_x + x, yMin);
            this.ctx.lineTo(this.history_x + x, yMax);
            this.ctx.stroke();
            
            this.ctx.fillRect(this.history_x + x, y, 1, 1);
        });
        
        return this;
    }
    
    updateAnimation() {
        //this.clearAnimation();
        this.restoreBackground();
        this.backgroundAnimation();
        this.historyAnimation();
        this.titleAnimation();
        this.ghostAnimation();
        this.handAnimation();
        
        window.requestAnimationFrame(()=>this.updateAnimation());
        
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
}
