document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const browseButton = document.getElementById('browse-button');
  const qualityRange = document.getElementById('quality-range');
  const qualityValue = document.getElementById('quality-value');
  const compressButton = document.getElementById('compress-button');
  const autoCompressButton = document.getElementById('auto-compress-button');
  const downloadButton = document.getElementById('download-button');
  const resetButton = document.getElementById('reset-button');
  const originalPreview = document.getElementById('original-preview');
  const compressedPreview = document.getElementById('compressed-preview');
  const originalSize = document.getElementById('original-size');
  const compressedSize = document.getElementById('compressed-size');
  const originalDimensions = document.getElementById('original-dimensions');
  const savedPercentage = document.getElementById('saved-percentage');
  const loadingModal = document.getElementById('loading-modal');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // State
  let selectedFile = null;
  let compressedImageUrl = null;
  let compressedFile = null;
  
  // Tab Switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show the selected tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
          content.classList.add('active');
        }
      });
      
      // Reset compression states
      handleReset();
    });
  });
  
  // File Upload Handlers
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-primary');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-primary');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-primary');
    
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });
  
  browseButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFileSelect(e.target.files[0]);
    }
  });
  
  // Quality Slider
  qualityRange.addEventListener('input', () => {
    qualityValue.textContent = `${qualityRange.value}%`;
  });
  
  // Compression Controls
  compressButton.addEventListener('click', () => {
    compressImage(parseInt(qualityRange.value));
  });
  
  autoCompressButton.addEventListener('click', () => {
    // Auto-compress uses a quality setting of 50%
    compressImage(50);
  });
  
  // Result Actions
  downloadButton.addEventListener('click', handleDownload);
  resetButton.addEventListener('click', handleReset);
  
  // File Selection Handler
  function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Please select an image under 10MB');
      return;
    }
    
    selectedFile = file;
    
    // Display original image
    const objectUrl = URL.createObjectURL(file);
    originalPreview.src = objectUrl;
    originalSize.textContent = formatFileSize(file.size);
    
    // Show compression controls
    document.getElementById('compression-controls').classList.remove('hidden');
    
    // Get image dimensions when loaded
    const img = new Image();
    img.onload = () => {
      originalDimensions.textContent = `${img.width} x ${img.height}`;
    };
    img.src = objectUrl;
  }
  
  // Compression Handler
  async function compressImage(quality) {
    if (!selectedFile) return;
    
    try {
      showLoading(true);
      
      // Convert quality from percentage to decimal (0-1)
      const compressionQuality = quality / 100;
      
      // Configure compression options
      const options = {
        maxSizeMB: 10,
        maxWidthOrHeight: 4000,
        useWebWorker: true,
        initialQuality: compressionQuality,
        alwaysKeepResolution: true,
        preserveExif: true,
      };
      
      // Use the browser-image-compression library
      const compressedFile = await imageCompression(selectedFile, options);
      
      // Create and display compressed image
      compressedImageUrl = URL.createObjectURL(compressedFile);
      compressedPreview.src = compressedImageUrl;
      compressedSize.textContent = formatFileSize(compressedFile.size);
      
      // Calculate savings
      const savingsPercentage = Math.round((1 - (compressedFile.size / selectedFile.size)) * 100);
      savedPercentage.textContent = `${savingsPercentage}%`;
      
      // Enable download button
      downloadButton.disabled = false;
      
      // Show results area
      document.getElementById('preview-area').classList.remove('hidden');
      
      // Store compressed file for download
      this.compressedFile = compressedFile;
      
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('There was an error compressing your image.');
    } finally {
      showLoading(false);
    }
  }
  
  // Download Handler
  function handleDownload() {
    if (compressedImageUrl && selectedFile) {
      const link = document.createElement('a');
      link.href = compressedImageUrl;
      
      // Create download name with -compressed suffix
      const fileName = selectedFile.name;
      const fileExtension = fileName.split('.').pop();
      const downloadName = fileName.replace(
        `.${fileExtension}`,
        `-compressed.${fileExtension}`
      );
      
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  // Reset Handler
  function handleReset() {
    // Revoke object URLs to prevent memory leaks
    if (originalPreview.src) URL.revokeObjectURL(originalPreview.src);
    if (compressedImageUrl) URL.revokeObjectURL(compressedImageUrl);
    
    // Reset images
    originalPreview.src = '';
    compressedPreview.src = '';
    
    // Reset text fields
    originalSize.textContent = '0 KB';
    compressedSize.textContent = '0 KB';
    originalDimensions.textContent = '0 x 0';
    savedPercentage.textContent = '0%';
    
    // Reset state
    selectedFile = null;
    compressedImageUrl = null;
    compressedFile = null;
    
    // Reset UI
    qualityRange.value = 80;
    qualityValue.textContent = '80%';
    downloadButton.disabled = true;
    
    // Hide sections
    document.getElementById('compression-controls').classList.add('hidden');
    document.getElementById('preview-area').classList.add('hidden');
  }
  
  // Loading Modal Toggle
  function showLoading(show) {
    if (show) {
      loadingModal.classList.add('visible');
    } else {
      loadingModal.classList.remove('visible');
    }
  }
  
  // Utility Functions
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
});