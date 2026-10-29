import { MAX_STORED_DATA_URL } from './roomsPolicy';

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error(`Không đọc được tệp ${file.name}. Vui lòng chọn lại.`));
  reader.readAsDataURL(file);
});

// Thu nhỏ ảnh lớn để vừa bộ nhớ trình duyệt của bản demo; ảnh gốc không được lưu. Trả về '' nếu không thu nhỏ được.
function shrink(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas'); const context = canvas.getContext?.('2d'); if (!context) { resolve(''); return; }
        for (const [edge, quality] of [[1280, 0.75], [1024, 0.65], [800, 0.55]]) {
          const scale = Math.min(1, edge / Math.max(image.width, image.height)); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const out = canvas.toDataURL('image/jpeg', quality); if (out.length <= MAX_STORED_DATA_URL) { resolve(out); return; }
        }
        resolve('');
      } catch { resolve(''); }
    };
    image.onerror = () => resolve('');
    image.src = dataUrl;
  });
}

// File đã qua imageFileError → bản ghi ảnh để lưu cùng kết quả (DICOM chỉ lưu thông tin tệp, không xem trước được).
export async function readImageFile(file) {
  const extension = file.name.split('.').pop().toLowerCase(); const dicom = ['dcm', 'dicom'].includes(extension);
  let dataUrl = '';
  if (!dicom) { dataUrl = await readAsDataUrl(file); if (dataUrl.length > MAX_STORED_DATA_URL) dataUrl = await shrink(dataUrl); }
  return { id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, type: file.type || (dicom ? 'application/dicom' : ''), size: file.size, dataUrl };
}
