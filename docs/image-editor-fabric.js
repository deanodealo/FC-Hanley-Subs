const canvas = new fabric.Canvas('posterCanvas', {
  backgroundColor: '#fff',
  preserveObjectStacking: true
});

let activeTextObject = null;

// UI controls
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');
const colorPicker = document.getElementById('colorPicker');
const deleteSelectedBtn = document.getElementById('deleteSelected');

// Update UI controls from text object
function updateControlsFromTextObject(textObj) {
  if (!textObj) return;
  fontSelect.value = textObj.fontFamily || 'Arial';
  fontSizeInput.value = textObj.fontSize || 40;
  colorPicker.value = textObj.fill || '#000000';
}

// Update text object from UI controls
function updateTextObjectFromControls() {
  if (!activeTextObject) return;

  activeTextObject.set({
    fontFamily: fontSelect.value,
    fontSize: parseInt(fontSizeInput.value, 10),
    fill: colorPicker.value,
  });
  canvas.requestRenderAll();
}

// Add text button
document.getElementById('addText').addEventListener('click', () => {
  const text = new fabric.IText('New Text', {
    left: 100,
    top: 100,
    fontFamily: 'Arial',
    fontSize: 40,
    fill: '#000000',
    editable: true,
    selectable: true,
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  activeTextObject = text;
  text.enterEditing();
  if (text.hiddenTextarea) text.hiddenTextarea.focus();
  updateControlsFromTextObject(text);
  canvas.renderAll();
});

// Update on control changes
[fontSelect, fontSizeInput, colorPicker].forEach(control => {
  control.addEventListener('input', updateTextObjectFromControls);
});

// Update active text on selection
canvas.on('selection:created', e => {
  const obj = e.target;
  if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
    activeTextObject = obj;
    updateControlsFromTextObject(obj);
  } else {
    activeTextObject = null;
  }
});

canvas.on('selection:updated', e => {
  const obj = e.target;
  if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
    activeTextObject = obj;
    updateControlsFromTextObject(obj);
  } else {
    activeTextObject = null;
  }
});

canvas.on('selection:cleared', () => {
  activeTextObject = null;
});

// Listen for double-click to enter editing mode
canvas.on('mouse:dblclick', function(e) {
  const target = e.target;
  if (target && (target.type === 'i-text' || target.type === 'textbox')) {
    canvas.setActiveObject(target);
    activeTextObject = target;
    target.enterEditing();
    if (target.hiddenTextarea) target.hiddenTextarea.focus();
  }
});

// The rest of your existing code: image upload, delete, save, download...

// Base image upload & add
document.getElementById('baseImageInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(f) {
    fabric.Image.fromURL(f.target.result, function(img) {
      const bgObjects = canvas.getObjects('image').filter(o => o.isBackground);
      bgObjects.forEach(o => canvas.remove(o));
      img.set({
        left: 0,
        top: 0,
        selectable: true,
        hasBorders: true,
        hasControls: true,
        lockRotation: true,
        isBackground: true
      });
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      const scale = Math.min(scaleX, scaleY);
      img.scale(scale);
      canvas.add(img);
      img.sendToBack();
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
});

// Additional images upload
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(f) {
    fabric.Image.fromURL(f.target.result, function(img) {
      img.set({
        left: 100,
        top: 100,
        hasBorders: true,
        hasControls: true,
        lockRotation: true,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
});

// Delete selected object
deleteSelectedBtn.addEventListener('click', () => {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    activeTextObject = null;
  }
});

// Save image as JPEG
document.getElementById('saveImage').addEventListener('click', () => {
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poster.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
});

// Download PDF
document.getElementById('downloadPdf').addEventListener('click', () => {
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1.0 });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save('poster.pdf');
});

// Download JPEG
document.getElementById('downloadJpeg').addEventListener('click', () => {
  const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.95 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'poster.jpg';
  document.body.appendChild(a);
  a.click();
  a.remove();
});
