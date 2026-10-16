import { MAX_PHOTO_BYTES } from './petPolicy';

// A client-side thumbnail for the demo, not an upload to a server.
export async function preparePetPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Ảnh không được lớn hơn 2 MB.');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Không đọc được ảnh. Vui lòng thử lại.')); reader.readAsDataURL(file);
  });
  const picture = await new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Tệp ảnh bị lỗi hoặc không đọc được.')); image.src = source;
  });
  const scale = Math.min(1, 800 / Math.max(picture.naturalWidth, picture.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  context.drawImage(picture, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL('image/webp', 0.8);
  if (result.length > 800000) throw new Error('Ảnh sau xử lý vẫn quá lớn. Vui lòng chọn ảnh nhỏ hơn.');
  return result;
}
