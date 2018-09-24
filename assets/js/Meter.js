Math.PIdiv2 = Math.PI / 2;
Math.PImul2 = Math.PI * 2;


class Meter {
    constructor(sensor, options) {
        const defaults = {
            parentNode: document.body,
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
            background_stroke: "white",
            background_fill: "black",
            background_fill_mark: "black",
            background_font: "16px mono",
            anchor_lineWidth: 2,
            anchor_lineWidth_mark: 4,
            hand_color: "red",
            hand_lineWidth: 3,
            foreground_opacity: 1,
            foreground_fill: "white",
            foreground_stroke: "black",
            foreground_font: "64px mono",
            alert_font: "48px mono",
            circle_size: 0.8 * Math.PImul2,
            percentColor: Meter.percentGreenRed,
        };
        
        this.sensor = sensor;
        this.options = Object.assign(defaults, options);
        
        this.colors = [];
        
        this.node = document.createElement('canvas');
        this.ctx = this.node.getContext('2d');
        this.background = null;

        this.width = null;
        this.height = null;
        this.title_x = null;
        this.title_y = null;
        this.hand_x = null;
        this.hand_y = null;
        this.hand_radius = null;
        this.alert_radius = null;
        this.history_x = null;
        this.history_y = null;
        this.history_width = null;
        this.history_height = null;
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

        this.width = width;
        this.height = height;
        this.title_x = width >> 1;
        this.title_y = height >> 2;
        this.hand_x = width >> 1; // Math.round(width/2);
        this.hand_y = height >> 1; // Math.round(height/2);
        this.hand_radius = Math.max(width, height) >> 1; //Math.round(Math.max(width, height) /2);
        this.alert_radius = Math.max(width, height) >> 3;
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
        const margin = this.options.title_margin;
        const value_max = this.options.value_max;
        const anchors = this.getAnchors();
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = this.options.background_fill;
        this.ctx.globalAlpha = this.options.background_opacity;
        
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, this.hand_radius, 0, Math.PImul2);
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
            const teta = circle_size * value / value_max;
            const teta_sin = -Math.sin(teta);
            const teta_cos = Math.cos(teta);
            const teta_x = teta_sin * this.hand_radius;
            const teta_y = teta_cos * this.hand_radius;
            
            let offset;
            let length;
            
            if (isMark) {
                this.ctx.globalAlpha = this.options.background_opacity_mark;
                this.ctx.strokeStyle = this.options.background_fill_mark;
                this.ctx.lineWidth = this.options.background_lineWidth_mark;
                
                offset = this.options.background_margin_mark;
                length = this.options.background_lineLength_mark;
            } else {
                this.ctx.globalAlpha = this.options.background_opacity;
                this.ctx.strokeStyle = this.options.background_fill;
                this.ctx.lineWidth = this.options.background_lineWidth;
                
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
        
        this.ctx.lineWidth = 1;
        
        for (let i=1; i<size; ++i) {
            const value = liveList[i];
            const teta = circle_size * value;
            const teta_x = -Math.sin(teta) * this.hand_radius;
            const teta_y = Math.cos(teta) * this.hand_radius;
            
            const coeff = (size-i)/size;
            //const k = 1.5*coeff - 0.5;
            
            const x = teta_x *coeff;
            const y = teta_y *coeff;
            
            const x0 = x *0.75;
            const y0 = y *0.75;
            
            this.ctx.globalAlpha = coeff;
            //this.ctx.lineWidth = Math.round(1/coeff);
            this.ctx.strokeStyle = this.getColor(value);

            this.ctx.beginPath();
            this.ctx.moveTo(this.hand_x + x0, this.hand_y + y0);
            this.ctx.lineTo(this.hand_x + x, this.hand_y + y);
            this.ctx.stroke();
        }
        
        return this;
    }
    
    titleAnimation(color) {
        const value = this.sensor.getValue();
        const value_max = this.options.value_max;
        const ref = value * value_max;
        
        const title = null === this.options.value_cleaner
            ? Math.round(ref)
            : this.options.value_cleaner(ref)
            ;
        
        this.ctx.globalAlpha = this.options.foreground_opacity;
        this.ctx.lineWidth = 2;
        this.ctx.font = this.options.foreground_font;
        this.ctx.strokeStyle = this.options.foreground_stroke;
        this.ctx.fillStyle = this.options.foreground_fill;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        this.ctx.strokeText(title, this.title_x, this.title_y);
        this.ctx.fillText(title, this.title_x, this.title_y);
        
        return this;
    }

    alertAnimation(color) {
        const limit = this.sensor.getOverflow();
        const margin = this.options.title_margin;
        const value = this.sensor.getValue();
        const value_max = this.options.value_max;
        const ref = value * value_max;

        //console.log(limit);
        if (null !== limit) {
            if (limit < ref) {
                this.ctx.fillStyle = "red";

                this.ctx.beginPath();
                this.ctx.arc(this.hand_x, this.hand_y, this.alert_radius, 0, Math.PImul2); // TODO
                this.ctx.fill();

                this.ctx.fillStyle = "white";
            } else {
                this.ctx.fillStyle = color;
            }

            this.ctx.beginPath();
            this.ctx.arc(this.hand_x, this.hand_y, this.alert_radius - margin, 0, Math.PImul2); // TODO
            this.ctx.fill();

            this.ctx.font = this.options.alert_font;
            this.ctx.fillStyle = "black";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            this.ctx.fillText(limit, this.hand_x, this.hand_y+4);
        }
    }

    ghostAnimation(color) {
        const value = this.sensor.getValue();
        const previousValue = this.sensor.getLiveAt(2000);
        const diff = value - previousValue;
        const nextValue = value + diff;
        const circle_size = this.options.circle_size;
        const lineWidth_background = this.options.background_lineWidth;
        const lineWidth = Math.ceil(lineWidth_background * 2 * nextValue);
        const radius = this.hand_radius - (lineWidth >> 1);
        
        // prevent blink
        let teta = Math.PIdiv2 + nextValue*circle_size;
        teta *= 1000;
        teta = Math.trunc(teta);
        teta /= 1000;

        this.ctx.globalAlpha = 1;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = this.options.hand_color;
        
        
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, radius, Math.PIdiv2, teta, false);
        this.ctx.stroke();
        
        return this;
    }
    
    handAnimation(color) {
        const value = this.sensor.getValue();
        const circle_size = this.options.circle_size;
        
        const teta = circle_size * value;
        const teta_x = -Math.sin(teta);
        const teta_y = Math.cos(teta);
        
        let x = teta_x * this.hand_radius;
        let y = teta_y * this.hand_radius;
        
        if (teta > 3* Math.PIdiv2) {
            x *= 2;
            y *= 2;
        }
        
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = this.options.hand_color;
        this.ctx.fillStyle = this.options.hand_color;
        this.ctx.lineWidth = this.options.hand_lineWidth;
        
        // draw hand center
        this.ctx.beginPath();
        this.ctx.arc(this.hand_x, this.hand_y, 2, 0, Math.PImul2, false);
        this.ctx.fill();
        
        // draw hand line
        this.ctx.beginPath();
        this.ctx.moveTo(this.hand_x, this.hand_y);
        this.ctx.lineTo(this.hand_x + x, this.hand_y + y);
        this.ctx.stroke();
        
        return this;
    }
    
    historyAnimation() {
        const value_max = this.options.value_max;
        const line_width = 1;
        const history = this.sensor.getHistoryList();
        
        // draw history
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = "yellow";
        this.ctx.lineWidth = line_width;
        
        history.forEach((r, i) => {
            const color = this.getColor(r.avg);
            const x = this.history_width -1 - line_width*i;
            const yMax = this.history_height - Math.floor(r.max * this.history_height);
            const y = this.history_height - Math.floor(r.avg * this.history_height);
            const yMin = this.history_height - Math.floor(r.min * this.history_height);
            
            this.ctx.strokeStyle = color;

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
        
        this.restoreBackground();
        this.backgroundAnimation(color);
        this.historyAnimation();
        //this.ghostAnimation(color);
        this.titleAnimation(color);
        this.handAnimation(color);
        this.alertAnimation(color);
        
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
