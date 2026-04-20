document.addEventListener('DOMContentLoaded', () => {
    const inputs = {
        name: document.getElementById('name'),
        saleCode: document.getElementById('saleCode'),
        phone: document.getElementById('phone'),
        email: document.getElementById('email')
    };

    const preview = {
        name: document.getElementById('previewName'),
        code: document.getElementById('previewCode'),
        phoneLine: document.getElementById('previewPhoneLine'),
        phone: document.getElementById('previewPhone'),
        emailLine: document.getElementById('previewEmailLine'),
        email: document.getElementById('previewEmail')
    };

    const overlayBox = document.getElementById('overlayBox');
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const width = document.getElementById('width');
    const height = document.getElementById('height');

    // Default image dimensions
    const IMG_WIDTH = 1200;
    const IMG_HEIGHT = 2260;

    // Load Image to get Data URL for jsPDF
    const baseImage = new Image();
    baseImage.src = 'OnePage.png';

    // Update real-time preview DOM
    function updatePreview() {
        // Name and Code
        preview.name.textContent = inputs.name.value;
        preview.code.textContent = inputs.saleCode.value;

        // Phone and Email Logic
        const phoneVal = inputs.phone.value.trim();
        const emailVal = inputs.email.value.trim();

        if (phoneVal) {
            preview.phoneLine.style.display = 'flex';
            preview.phone.textContent = phoneVal;
        } else {
            preview.phoneLine.style.display = 'none';
        }
        
        if (emailVal) {
            preview.emailLine.style.display = 'flex';
            preview.email.textContent = emailVal;
        } else {
            preview.emailLine.style.display = 'none';
        }
    }

    // Bind inputs
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    // Handle debug positioning sliders
    function updatePosition() {
        overlayBox.style.left = posX.value + '%';
        overlayBox.style.top = posY.value + '%';
        overlayBox.style.width = width.value + '%';
        overlayBox.style.height = height.value + '%';
    }

    posX.addEventListener('input', updatePosition);
    posY.addEventListener('input', updatePosition);
    width.addEventListener('input', updatePosition);
    height.addEventListener('input', updatePosition);
    updatePosition(); // Initial apply

    // Fullscreen Modal Logic
    const btnPreview = document.getElementById('btnPreview');
    const modal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');
    const originalPreviewContainer = document.getElementById('previewContainer');
    const previewWrapper = document.querySelector('.preview-wrapper');

    let currentZoom = 100;
    const ZOOM_STEP = 20;
    const ZOOM_MAX = 300;
    const ZOOM_MIN = 30;

    function applyZoom() {
        document.getElementById('zoomLevel').textContent = `${currentZoom}%`;
        originalPreviewContainer.style.height = `${90 * (currentZoom / 100)}vh`;
    }

    document.getElementById('btnZoomIn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentZoom < ZOOM_MAX) currentZoom += ZOOM_STEP;
        applyZoom();
    });

    document.getElementById('btnZoomOut').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentZoom > ZOOM_MIN) currentZoom -= ZOOM_STEP;
        applyZoom();
    });

    btnPreview.addEventListener('click', () => {
        // Move preview container to modal
        modalBody.appendChild(originalPreviewContainer);
        currentZoom = 100;
        applyZoom();
        originalPreviewContainer.style.boxShadow = '0 10px 40px rgba(0,0,0,0.4)';
        modal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        // Move back to regular wrapper
        originalPreviewContainer.style.height = ''; 
        originalPreviewContainer.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.05)';
        previewWrapper.appendChild(originalPreviewContainer);
        modal.classList.remove('active');
    });

    // Support wheel zoom in modal body
    modalBody.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0 && currentZoom < ZOOM_MAX) {
                currentZoom += ZOOM_STEP;
            } else if (e.deltaY > 0 && currentZoom > ZOOM_MIN) {
                currentZoom -= ZOOM_STEP;
            }
            applyZoom();
        }
    });

    // Close on click outside (ensure user doesn't accidentally click empty space to close while zooming, maybe require clicking exactly modal)
    modal.addEventListener('click', (e) => {
        // Since modal-body covers everything, we check if click target is exactly the modal or modal-content bg
        if (e.target === modal || e.target.classList.contains('modal-content')) {
            closeModal.click();
        }
    });

    // Export PDF via Canvas & jsPDF
    const btnExport = document.getElementById('btnExport');
    
    btnExport.addEventListener('click', async () => {
        try {
            btnExport.innerHTML = 'Đang tạo...';
            btnExport.disabled = true;

            // Wait a little bit for UI update
            await new Promise(r => setTimeout(r, 50));

            // Create a temporary canvas
            const canvas = document.createElement('canvas');
            canvas.width = IMG_WIDTH;
            canvas.height = IMG_HEIGHT;
            const ctx = canvas.getContext('2d');

            // Draw base image
            ctx.drawImage(baseImage, 0, 0, IMG_WIDTH, IMG_HEIGHT);

            // Calculate exact position mapping from percentages
            const boxX = IMG_WIDTH * (parseFloat(posX.value) / 100);
            const boxY = IMG_HEIGHT * (parseFloat(posY.value) / 100);
            const boxW = IMG_WIDTH * (parseFloat(width.value) / 100);
            const boxH = IMG_HEIGHT * (parseFloat(height.value) / 100);

            // Starting positions inside the box
            const paddingLeft = IMG_WIDTH * 0.02; // consistent with 2cqw
            let currentX = boxX + paddingLeft;
            
            // Text Drawing Helpers
            const nameFontSize = IMG_WIDTH * 0.024;
            const stdFontSize = IMG_WIDTH * 0.022;
            const gap = IMG_WIDTH * 0.005; // 0.5cqw standard gap
            const topGap = IMG_WIDTH * 0.008; // 0.8cqw (0.5cqw standard + 0.3cqw margin-bottom)
            
            const phoneVal = inputs.phone.value.trim();
            const emailVal = inputs.email.value.trim();
            
            let numLines = 2; // name, code
            if (phoneVal) numLines++;
            if (emailVal) numLines++;
            
            const totalBlockHeight = nameFontSize + topGap + (stdFontSize * (numLines - 1)) + (gap * (numLines - 2));
            let currentY = boxY + (boxH - totalBlockHeight) / 2 + (nameFontSize / 2); // Center block vertically in box and adjust for middle baseline
            
            function drawLabelAndValue(label, value, yPos, fontSize, initialX = currentX) {
                if (!label && !value) return initialX;
                
                ctx.textBaseline = 'middle';
                let xOffset = initialX;
                
                // Draw Label
                if (label) {
                    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                    ctx.fillStyle = '#0A2762';
                    ctx.fillText(label, xOffset, yPos);
                    xOffset += ctx.measureText(label).width + 8; // add space
                }
                
                // Draw Value
                if (value) {
                    ctx.font = `700 ${fontSize}px Inter, sans-serif`;
                    ctx.fillStyle = '#0A2762';
                    ctx.fillText(value, xOffset, yPos);
                    xOffset += ctx.measureText(value).width;
                }

                return xOffset;
            }

            // Line 1: Name
            drawLabelAndValue('CV Tư vấn đầu tư:', inputs.name.value, currentY, nameFontSize);
            currentY += (nameFontSize / 2) + topGap + (stdFontSize / 2); // move down to center of next line

            // Line 2: Code
            drawLabelAndValue('Mã nhân viên:', inputs.saleCode.value, currentY, stdFontSize);
            currentY += stdFontSize + gap; // move down to center of next line

            // Line 3 & 4: Contact
            if (phoneVal) {
                drawLabelAndValue('Số điện thoại:', phoneVal, currentY, stdFontSize);
                if (emailVal) currentY += stdFontSize + gap; // move down only if email is coming
            }
            if (emailVal) {
                drawLabelAndValue('Email:', emailVal, currentY, stdFontSize);
            }


            // Generate PDF from Canvas
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // Format array [width, height] in points (or px if mapped)
            // jsPDF defaults to formatting in 'pt' but we can specify 'px'
            // However, typical PDF orientation is set by unit. We will keep it exactly same dimension
            const pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [IMG_WIDTH, IMG_HEIGHT]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, IMG_WIDTH, IMG_HEIGHT);
            
            // Determine filename
            let filename = 'SHS-OnePage';
            if (inputs.name.value) {
                filename += '-' + inputs.name.value.replace(/\s+/g, '-').toLowerCase();
            }
            if (inputs.saleCode.value) {
                filename += '-' + inputs.saleCode.value;
            }
            
            pdf.save(filename + '.pdf');

        } catch (err) {
            console.error(err);
            alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
        } finally {
            btnExport.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Xuất PDF
            `;
            btnExport.disabled = false;
        }
    });
});
