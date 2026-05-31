// 初始化
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');

let layers = [];
let selected = null;
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let dragStartX, dragStartY, layerStartX, layerStartY, layerStartW, layerStartH, layerStartFontSize;
let history = [];
let historyIndex = -1;

// 背景设置
let bgColor = '#1a1a2e';
let bgOpacity = 1;
let bgGradient = null;
let bgImage = null;
let bgImageOpacity = 1;
let bgImageFit = 'cover';

// 工具函数
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    var rot = -Math.PI / 2;
    var step = Math.PI / spikes;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
        var r = i % 2 === 0 ? outerR : innerR;
        var x = cx + Math.cos(rot) * r;
        var y = cy + Math.sin(rot) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        rot += step;
    }
    ctx.closePath();
}

// 添加文字
document.getElementById('addTextBtn').addEventListener('click', function() {
    var layer = {
        id: generateId(),
        type: 'text',
        name: '文字',
        x: canvas.width / 2 - 100,
        y: canvas.height / 2,
        w: 200,
        h: 50,
        text: '双击编辑文字',
        color: '#ffffff',
        fontSize: 48,
        fontFamily: 'Arial',
        bold: false,
        italic: false,
        align: 'left',
        shadow: true,
        rotation: 0,
        opacity: 1
    };
    layers.push(layer);
    selectLayer(layer);
    saveState();
    draw();
});

// 添加形状
document.getElementById('addShapeBtn').addEventListener('click', function() {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('propertiesPanel').classList.remove('hidden');
    document.getElementById('textProps').classList.add('hidden');
    document.getElementById('shapeProps').classList.remove('hidden');
});

document.getElementById('addShapeConfirm').addEventListener('click', function() {
    var shapeType = document.querySelector('.shape-btn.active')?.dataset.shape || 'rect';
    var layer = {
        id: generateId(),
        type: 'shape',
        shapeType: shapeType,
        name: shapeType === 'rect' ? '矩形' : shapeType === 'circle' ? '圆形' : shapeType === 'triangle' ? '三角形' : '星形',
        x: canvas.width / 2 - 75,
        y: canvas.height / 2 - 75,
        w: 150,
        h: 150,
        fill: document.getElementById('shapeFill').value,
        stroke: document.getElementById('shapeStroke').value,
        strokeWidth: parseInt(document.getElementById('shapeStrokeWidth').value),
        rotation: 0,
        opacity: 1
    };
    layers.push(layer);
    selectLayer(layer);
    saveState();
    draw();
});

// 形状按钮点击
document.querySelectorAll('.shape-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.shape-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    });
});

// 上传图片
document.getElementById('addImageBtn').addEventListener('click', function() {
    document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', function(e) {
    Array.from(e.target.files).forEach(function(file) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
            var scale = Math.min((canvas.width * 0.8) / img.width, (canvas.height * 0.8) / img.height, 1);
            var layer = {
                id: generateId(),
                type: 'image',
                name: file.name,
                image: img,
                x: (canvas.width - img.width * scale) / 2,
                y: (canvas.height - img.height * scale) / 2,
                w: img.width * scale,
                h: img.height * scale,
                rotation: 0,
                opacity: 1
            };
            layers.push(layer);
            selectLayer(layer);
            saveState();
            draw();
        };
        img.src = url;
    });
    e.target.value = '';
});

// 视频上传
document.getElementById('videoUpload').addEventListener('click', function() {
    document.getElementById('videoInput').click();
});

document.getElementById('videoInput').addEventListener('change', function(e) {
    if (!e.target.files.length) return;
    var url = URL.createObjectURL(e.target.files[0]);
    var video = document.getElementById('videoPlayer');
    video.src = url;
    video.onloadedmetadata = function() {
        document.getElementById('videoUpload').classList.add('hidden');
        document.getElementById('videoPreview').classList.remove('hidden');
        generateTimeline();
    };
});

function generateTimeline() {
    var video = document.getElementById('videoPlayer');
    var timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    var count = Math.min(10, Math.ceil(video.duration));
    var interval = video.duration / count;
    
    for (var i = 0; i < count; i++) {
        (function(time) {
            var thumb = document.createElement('div');
            thumb.style.cssText = 'height:40px;flex-shrink:0;cursor:pointer;border-radius:3px;overflow:hidden;border:2px solid transparent;';
            var cvs = document.createElement('canvas');
            cvs.width = 64;
            cvs.height = 36;
            thumb.appendChild(cvs);
            timeline.appendChild(thumb);
            
            thumb.addEventListener('click', function() {
                video.currentTime = time;
            });
            
            video.addEventListener('seeked', function handler() {
                cvs.getContext('2d').drawImage(video, 0, 0, 64, 36);
                video.removeEventListener('seeked', handler);
            });
            video.currentTime = time;
        })(i * interval);
    }
}

document.getElementById('captureBtn').addEventListener('click', function() {
    var video = document.getElementById('videoPlayer');
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCanvas.getContext('2d').drawImage(video, 0, 0);
    var img = new Image();
    img.onload = function() {
        var scale = Math.min((canvas.width * 0.8) / img.width, (canvas.height * 0.8) / img.height, 1);
        var layer = {
            id: generateId(),
            type: 'image',
            name: '视频帧',
            image: img,
            x: (canvas.width - img.width * scale) / 2,
            y: (canvas.height - img.height * scale) / 2,
            w: img.width * scale,
            h: img.height * scale,
            rotation: 0,
            opacity: 1
        };
        layers.push(layer);
        selectLayer(layer);
        saveState();
        draw();
    };
    img.src = tempCanvas.toDataURL();
});

document.getElementById('timeSlider').addEventListener('input', function(e) {
    var video = document.getElementById('videoPlayer');
    if (video.duration) video.currentTime = (e.target.value / 100) * video.duration;
});

document.getElementById('videoPlayer').addEventListener('timeupdate', function() {
    var video = document.getElementById('videoPlayer');
    document.getElementById('timeDisplay').textContent = formatTime(video.currentTime);
    document.getElementById('timeSlider').value = (video.currentTime / video.duration) * 100;
});

// 选择图层
function selectLayer(layer) {
    selected = layer;
    updateLayerList();
    updateProperties();
    draw();
}

// 删除元素
document.getElementById('deleteBtn').addEventListener('click', function() {
    if (!selected) return;
    layers = layers.filter(function(l) { return l !== selected; });
    selected = null;
    updateLayerList();
    updateProperties();
    saveState();
    draw();
});

// 画布双击事件
canvas.addEventListener('dblclick', function(e) {
    if (!selected || selected.type !== 'text') return;
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (x >= selected.x && x <= selected.x + selected.w && y >= selected.y && y <= selected.y + selected.h) {
        document.getElementById('propText').focus();
        document.getElementById('propText').select();
    }
});

// 更新图层列表
function updateLayerList() {
    var list = document.getElementById('layerList');
    list.innerHTML = '';
    var icons = { text: 'T', image: '🖼', shape: '⬡' };
    
    layers.slice().reverse().forEach(function(layer) {
        var div = document.createElement('div');
        div.className = 'layer-item' + (layer === selected ? ' active' : '');
        div.innerHTML = '<span class="layer-icon">' + (icons[layer.type] || '?') + '</span>' +
            '<span class="layer-name">' + layer.name + '</span>' +
            '<span class="layer-actions">' +
            '<button class="layer-action" data-action="visibility">' + (layer.visible !== false ? '👁' : '👁‍🗨') + '</button>' +
            '<button class="layer-action" data-action="delete">×</button></span>';
        
        div.querySelector('.layer-name').addEventListener('click', function() { selectLayer(layer); });
        div.querySelector('[data-action="visibility"]').addEventListener('click', function(e) {
            e.stopPropagation();
            layer.visible = layer.visible === false ? true : false;
            updateLayerList();
            draw();
        });
        div.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
            e.stopPropagation();
            layers = layers.filter(function(l) { return l !== layer; });
            if (selected === layer) selected = null;
            updateLayerList();
            updateProperties();
            saveState();
            draw();
        });
        list.appendChild(div);
    });
    
    document.getElementById('selectedInfo').textContent = selected ? selected.name : '未选中';
}

// 更新属性面板
function updateProperties() {
    if (!selected) {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('propertiesPanel').classList.add('hidden');
        return;
    }
    
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('propertiesPanel').classList.remove('hidden');
    document.getElementById('textProps').classList.add('hidden');
    document.getElementById('shapeProps').classList.add('hidden');
    
    document.getElementById('propX').value = Math.round(selected.x);
    document.getElementById('propY').value = Math.round(selected.y);
    document.getElementById('propW').value = Math.round(selected.w);
    document.getElementById('propH').value = Math.round(selected.h);
    document.getElementById('propRotation').value = selected.rotation || 0;
    document.getElementById('rotationVal').textContent = (selected.rotation || 0) + '°';
    document.getElementById('propOpacity').value = (selected.opacity || 1) * 100;
    document.getElementById('opacityVal').textContent = Math.round((selected.opacity || 1) * 100) + '%';
    
    if (selected.type === 'text') {
        document.getElementById('textProps').classList.remove('hidden');
        document.getElementById('propText').value = selected.text;
        document.getElementById('propFontSize').value = selected.fontSize;
        document.getElementById('propColor').value = selected.color;
        document.getElementById('boldBtn').classList.toggle('active', selected.bold);
        document.getElementById('italicBtn').classList.toggle('active', selected.italic);
        document.getElementById('propShadow').checked = selected.shadow;
    }
    
    document.getElementById('selectedInfo').textContent = selected.name + ' | ' + Math.round(selected.w) + '×' + Math.round(selected.h);
}

// 属性输入
document.getElementById('propX').addEventListener('change', function() { if (selected) { selected.x = parseInt(this.value) || 0; draw(); } });
document.getElementById('propY').addEventListener('change', function() { if (selected) { selected.y = parseInt(this.value) || 0; draw(); } });
document.getElementById('propW').addEventListener('change', function() { if (selected) { selected.w = Math.max(10, parseInt(this.value) || 10); draw(); } });
document.getElementById('propH').addEventListener('change', function() { if (selected) { selected.h = Math.max(10, parseInt(this.value) || 10); draw(); } });

document.getElementById('propRotation').addEventListener('input', function() {
    if (selected) { selected.rotation = parseInt(this.value); document.getElementById('rotationVal').textContent = this.value + '°'; draw(); }
});

document.getElementById('propOpacity').addEventListener('input', function() {
    if (selected) { selected.opacity = parseInt(this.value) / 100; document.getElementById('opacityVal').textContent = this.value + '%'; draw(); }
});

document.querySelectorAll('.rotation-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var rot = parseInt(btn.dataset.rot);
        document.getElementById('propRotation').value = rot;
        document.getElementById('rotationVal').textContent = rot + '°';
        if (selected) { selected.rotation = rot; draw(); }
    });
});

// 文字属性
document.getElementById('applyTextBtn').addEventListener('click', function() {
    if (!selected || selected.type !== 'text') return;
    selected.text = document.getElementById('propText').value;
    selected.fontSize = parseInt(document.getElementById('propFontSize').value) || 48;
    selected.color = document.getElementById('propColor').value;
    selected.bold = document.getElementById('boldBtn').classList.contains('active');
    selected.italic = document.getElementById('italicBtn').classList.contains('active');
    selected.align = document.querySelector('.align-btn.active')?.dataset.align || 'left';
    selected.shadow = document.getElementById('propShadow').checked;
    saveState();
    draw();
});

document.getElementById('boldBtn').addEventListener('click', function() { this.classList.toggle('active'); });
document.getElementById('italicBtn').addEventListener('click', function() { this.classList.toggle('active'); });

document.querySelectorAll('.align-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.align-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    });
});

document.getElementById('shapeStrokeWidth').addEventListener('input', function() {
    document.getElementById('strokeWidthVal').textContent = this.value + 'px';
});

// 画布尺寸
document.getElementById('canvasSize').addEventListener('change', function() {
    var parts = this.value.split('x');
    canvas.width = parseInt(parts[0]);
    canvas.height = parseInt(parts[1]);
    document.getElementById('sizeDisplay').textContent = parts[0] + ' × ' + parts[1];
    draw();
});

// 导出
document.getElementById('exportBtn').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'cover_' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// 撤销/重做
function saveState() {
    var state = JSON.stringify(layers.map(function(l) {
        var copy = Object.assign({}, l);
        if (copy.image) {
            var tempCanvas = document.createElement('canvas');
            tempCanvas.width = copy.image.width;
            tempCanvas.height = copy.image.height;
            tempCanvas.getContext('2d').drawImage(copy.image, 0, 0);
            copy.imageData = tempCanvas.toDataURL();
        }
        delete copy.image;
        return copy;
    }));
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > 50) history.shift();
    historyIndex = history.length - 1;
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreState(history[historyIndex]);
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreState(history[historyIndex]);
}

function restoreState(stateStr) {
    var state = JSON.parse(stateStr);
    var loadCount = 0;
    var totalImages = state.filter(function(l) { return l.imageData; }).length;
    
    if (totalImages === 0) {
        layers = state;
        selected = layers[0] || null;
        updateLayerList();
        updateProperties();
        draw();
        return;
    }
    
    layers = state.map(function(l) {
        var layer = Object.assign({}, l);
        if (layer.imageData) {
            var img = new Image();
            img.onload = function() {
                layer.image = img;
                loadCount++;
                if (loadCount === totalImages) {
                    selected = layers[0] || null;
                    updateLayerList();
                    updateProperties();
                    draw();
                }
            };
            img.src = layer.imageData;
            delete layer.imageData;
        }
        return layer;
    });
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    if (selected && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); document.getElementById('deleteBtn').click(); }
    }
});

// 绘制
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.save();
    ctx.globalAlpha = bgOpacity;
    if (bgGradient) {
        var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, bgGradient.color1);
        gradient.addColorStop(1, bgGradient.color2);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // 绘制背景图片
    if (bgImage) {
        ctx.save();
        ctx.globalAlpha = bgImageOpacity;
        if (bgImageFit === 'cover') {
            var scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
            var w = bgImage.width * scale;
            var h = bgImage.height * scale;
            ctx.drawImage(bgImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        } else if (bgImageFit === 'contain') {
            var scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
            var w = bgImage.width * scale;
            var h = bgImage.height * scale;
            ctx.drawImage(bgImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        } else {
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
    }
    
    layers.forEach(function(layer) {
        if (layer.visible === false) return;
        
        ctx.save();
        ctx.globalAlpha = layer.opacity || 1;
        
        if (layer.rotation) {
            var cx = layer.x + layer.w / 2;
            var cy = layer.y + layer.h / 2;
            ctx.translate(cx, cy);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.translate(-cx, -cy);
        }
        
        if (layer.type === 'text') {
            var style = (layer.italic ? 'italic ' : '') + (layer.bold ? 'bold ' : '');
            ctx.font = style + layer.fontSize + 'px ' + (layer.fontFamily || 'Arial') + ', sans-serif';
            ctx.fillStyle = layer.color;
            ctx.textBaseline = 'top';
            ctx.textAlign = layer.align || 'left';
            
            if (layer.shadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            
            var x = layer.x;
            if (layer.align === 'center') x = layer.x + layer.w / 2;
            else if (layer.align === 'right') x = layer.x + layer.w;
            
            ctx.fillText(layer.text, x, layer.y);
            layer.w = ctx.measureText(layer.text).width;
            layer.h = layer.fontSize * 1.2;
            
        } else if (layer.type === 'shape') {
            ctx.fillStyle = layer.fill;
            ctx.strokeStyle = layer.stroke;
            ctx.lineWidth = layer.strokeWidth;
            
            if (layer.shapeType === 'rect') {
                ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
                if (layer.strokeWidth) ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
            } else if (layer.shapeType === 'circle') {
                ctx.beginPath();
                ctx.arc(layer.x + layer.w/2, layer.y + layer.h/2, Math.min(layer.w, layer.h)/2, 0, Math.PI*2);
                ctx.fill();
                if (layer.strokeWidth) ctx.stroke();
            } else if (layer.shapeType === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(layer.x + layer.w/2, layer.y);
                ctx.lineTo(layer.x + layer.w, layer.y + layer.h);
                ctx.lineTo(layer.x, layer.y + layer.h);
                ctx.closePath();
                ctx.fill();
                if (layer.strokeWidth) ctx.stroke();
            } else if (layer.shapeType === 'star') {
                drawStar(ctx, layer.x + layer.w/2, layer.y + layer.h/2, 5, Math.min(layer.w, layer.h)/2, Math.min(layer.w, layer.h)/4);
                ctx.fill();
                if (layer.strokeWidth) ctx.stroke();
            }
            
        } else if (layer.type === 'image' && layer.image) {
            ctx.drawImage(layer.image, layer.x, layer.y, layer.w, layer.h);
        }
        
        ctx.restore();
        
        // 选中框
        if (layer === selected) {
            ctx.save();
            if (layer.rotation) {
                var cx = layer.x + layer.w / 2;
                var cy = layer.y + layer.h / 2;
                ctx.translate(cx, cy);
                ctx.rotate(layer.rotation * Math.PI / 180);
                ctx.translate(-cx, -cy);
            }
            
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            [[layer.x, layer.y], [layer.x+layer.w, layer.y], [layer.x, layer.y+layer.h], [layer.x+layer.w, layer.y+layer.h]].forEach(function(p) {
                ctx.beginPath();
                ctx.arc(p[0], p[1], 5, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.restore();
        }
    });
    
    // 提示
    if (layers.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('从左侧面板添加元素开始创作', canvas.width/2, canvas.height/2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
}

// 初始化字体
function initFonts() {
    var select = document.getElementById('propFont');
    var fonts = ['Arial', 'Helvetica', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', '宋体', '黑体', '微软雅黑', '楷体'];
    fonts.forEach(function(f) {
        var opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        opt.style.fontFamily = f;
        select.appendChild(opt);
    });
}

// 背景设置
document.getElementById('bgColor').addEventListener('input', function(e) {
    bgColor = e.target.value;
    document.getElementById('bgColorPreview').style.background = bgColor;
    document.getElementById('bgColorValue').textContent = bgColor;
    bgGradient = null;
    draw();
});

document.getElementById('bgOpacity').addEventListener('input', function(e) {
    bgOpacity = parseInt(e.target.value) / 100;
    document.getElementById('bgOpacityVal').textContent = e.target.value + '%';
    draw();
});

document.querySelectorAll('.gradient-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var colors = btn.dataset.colors.split(',');
        bgGradient = { color1: colors[0], color2: colors[1] };
        document.getElementById('bgColorPreview').style.background = 'linear-gradient(135deg,' + colors[0] + ',' + colors[1] + ')';
        document.getElementById('bgColorValue').textContent = colors[0];
        draw();
    });
});

document.getElementById('bgColorPreview').addEventListener('click', function() {
    document.getElementById('bgColor').click();
});

// 背景图片上传
document.getElementById('bgImageUpload').addEventListener('click', function() {
    document.getElementById('bgImageInput').click();
});

document.getElementById('bgImageInput').addEventListener('change', function(e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
        bgImage = img;
        document.getElementById('bgImageControls').classList.remove('hidden');
        draw();
    };
    img.src = url;
});

document.getElementById('bgImageOpacity').addEventListener('input', function(e) {
    bgImageOpacity = parseInt(e.target.value) / 100;
    document.getElementById('bgImageOpacityVal').textContent = e.target.value + '%';
    draw();
});

document.getElementById('bgImageFit').addEventListener('change', function(e) {
    bgImageFit = e.target.value;
    draw();
});

document.getElementById('removeBgImage').addEventListener('click', function() {
    bgImage = null;
    document.getElementById('bgImageControls').classList.add('hidden');
    document.getElementById('bgImageInput').value = '';
    draw();
});

// 检测是否点击到控制点
function getHandleAtPoint(x, y, layer) {
    if (!layer) return null;
    var handles = [
        { name: 'tl', x: layer.x, y: layer.y },
        { name: 'tr', x: layer.x + layer.w, y: layer.y },
        { name: 'bl', x: layer.x, y: layer.y + layer.h },
        { name: 'br', x: layer.x + layer.w, y: layer.y + layer.h }
    ];
    
    for (var i = 0; i < handles.length; i++) {
        var h = handles[i];
        var dx = x - h.x;
        var dy = y - h.y;
        if (dx * dx + dy * dy < 100) {
            return h.name;
        }
    }
    return null;
}

// 更新画布事件处理
canvas.addEventListener('mousedown', function(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // 检查是否点击到控制点
    if (selected) {
        var handle = getHandleAtPoint(x, y, selected);
        if (handle) {
            isResizing = true;
            resizeHandle = handle;
            dragStartX = x;
            dragStartY = y;
            layerStartX = selected.x;
            layerStartY = selected.y;
            layerStartW = selected.w;
            layerStartH = selected.h;
            layerStartFontSize = selected.fontSize || 48;
            return;
        }
    }
    
    // 检查是否点击到图层
    selected = null;
    for (var i = layers.length - 1; i >= 0; i--) {
        var l = layers[i];
        if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) {
            selected = l;
            break;
        }
    }
    
    if (selected) {
        isDragging = true;
        dragStartX = x;
        dragStartY = y;
        layerStartX = selected.x;
        layerStartY = selected.y;
    }
    
    updateLayerList();
    updateProperties();
    draw();
});

canvas.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    document.getElementById('cursorPos').textContent = Math.round(x) + ', ' + Math.round(y);
    
    // 处理调整大小
    if (isResizing && selected) {
        var dx = x - dragStartX;
        var dy = y - dragStartY;
        
        // 文字图层通过拖动调整字体大小
        if (selected.type === 'text') {
            var distance = Math.sqrt(dx * dx + dy * dy);
            var sign = (resizeHandle === 'br' || resizeHandle === 'tr') ? 1 : -1;
            var newSize = Math.max(12, Math.round(layerStartFontSize + sign * distance * 0.5));
            selected.fontSize = newSize;
        } else {
            // 形状和图片调整大小
            if (resizeHandle === 'br') {
                selected.w = Math.max(20, layerStartW + dx);
                selected.h = Math.max(20, layerStartH + dy);
            } else if (resizeHandle === 'bl') {
                selected.x = layerStartX + dx;
                selected.w = Math.max(20, layerStartW - dx);
                selected.h = Math.max(20, layerStartH + dy);
            } else if (resizeHandle === 'tr') {
                selected.w = Math.max(20, layerStartW + dx);
                selected.y = layerStartY + dy;
                selected.h = Math.max(20, layerStartH - dy);
            } else if (resizeHandle === 'tl') {
                selected.x = layerStartX + dx;
                selected.y = layerStartY + dy;
                selected.w = Math.max(20, layerStartW - dx);
                selected.h = Math.max(20, layerStartH - dy);
            }
        }
        
        updateProperties();
        draw();
        return;
    }
    
    // 处理拖动
    if (isDragging && selected) {
        selected.x = layerStartX + (x - dragStartX);
        selected.y = layerStartY + (y - dragStartY);
        updateProperties();
        draw();
        return;
    }
    
    // 更新鼠标样式
    if (selected) {
        var handle = getHandleAtPoint(x, y, selected);
        if (handle) {
            var cursors = { tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize' };
            canvas.style.cursor = cursors[handle];
            return;
        }
    }
    
    var layer = null;
    for (var i = layers.length - 1; i >= 0; i--) {
        var l = layers[i];
        if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) {
            layer = l;
            break;
        }
    }
    canvas.style.cursor = layer ? 'move' : 'crosshair';
});

canvas.addEventListener('mouseup', function() {
    if (isDragging || isResizing) saveState();
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
});

// 初始化
initFonts();
draw();
