import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import PetAvatar from '../../../components/customer/PetAvatar';
import PetIcon from '../../../components/customer/PetIcon';
import { clinicToday } from '../../catalog/catalogPolicy';
import { EMPTY_PET, PET_GENDERS, PET_SPECIES, validatePet } from '../petPolicy';
import { preparePetPhoto } from '../petPhoto';
import PetField from './PetField';

export default function PetEditor({ pet, onSave, onClose, saving, variant = 'customer', ownerField, externalDirty = false }) {
  const [initial] = useState(() => ({ ...EMPTY_PET, ...Object.fromEntries(Object.keys(EMPTY_PET).map((key) => [key, pet?.[key] ?? EMPTY_PET[key]])), weight: pet?.weight ?? '' }));
  const [form, setForm] = useState(initial);
  // Keep the revision paired with the initial form, even when a detail page refreshes the pet prop.
  const [expectedVersion] = useState(() => pet ? pet.version ?? 1 : undefined);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const nameRef = useRef(null);
  const formRef = useRef(null);
  const photoRequest = useRef(0);
  const dirty = externalDirty || JSON.stringify(form) !== JSON.stringify(initial);
  const busy = saving || photoLoading;
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => () => { photoRequest.current += 1; }, []);
  const close = () => { if (!busy && (!dirty || window.confirm('Thông tin chưa được lưu. Bạn muốn bỏ thay đổi?'))) onClose(); };
  const change = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' })); setError('');
  };
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const request = ++photoRequest.current; setPhotoLoading(true); setErrors((current) => ({ ...current, photo: '' }));
    try { const photo = await preparePetPhoto(file); if (request === photoRequest.current) setForm((current) => ({ ...current, photo })); }
    catch (problem) { if (request === photoRequest.current) setErrors((current) => ({ ...current, photo: problem.message })); }
    finally { if (request === photoRequest.current) setPhotoLoading(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); if (busy) return;
    const fieldErrors = validatePet(form); setErrors(fieldErrors); setError('');
    if (Object.keys(fieldErrors).length) { setError('Vui lòng kiểm tra các trường được đánh dấu.'); formRef.current?.elements.namedItem(Object.keys(fieldErrors)[0])?.focus(); return; }
    try { await onSave({ ...form, expectedVersion }, pet?.id); }
    catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); formRef.current?.elements.namedItem(Object.keys(problem.fieldErrors || {})[0])?.focus(); }
  };
  return <Modal variant={variant} title={pet ? `Chỉnh sửa hồ sơ ${pet.name}` : 'Thêm thú cưng mới'} id="pet-editor-title" className={`pet-editor-modal ${variant === 'admin' ? 'reception-pet-modal' : ''}`} onClose={close} busy={busy} initialFocusRef={nameRef}>
    <form className="pet-editor-form" onSubmit={submit} noValidate ref={formRef}>
      <p className="pet-form-intro">Một hồ sơ nhỏ để lưu những điều quan trọng về bé. Tên và loài là thông tin bắt buộc.</p>
      <fieldset disabled={busy}><legend className="pet-sr-only">Thông tin thú cưng</legend>
        {ownerField}
        <div className="pet-photo-editor"><PetAvatar pet={form} /><div><strong>Ảnh đại diện của bé</strong><p id="pet-photo-help">JPG, PNG, WebP · tối đa 2 MB. Ảnh được thu nhỏ và lưu trong bản demo.</p><div className="pet-photo-actions">
          <label className="pet-button secondary pet-photo-picker">Chọn ảnh<input type="file" name="photo" aria-label="Ảnh thú cưng" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-invalid={!!errors.photo} aria-describedby={errors.photo ? 'pet-photo-hint' : 'pet-photo-help'} /></label>
          {form.photo && <button className="pet-text-button" type="button" onClick={() => { setForm((current) => ({ ...current, photo: '' })); setErrors((current) => ({ ...current, photo: '' })); }}>Bỏ ảnh</button>}
        </div>{photoLoading && <p role="status">Đang xử lý ảnh…</p>}{errors.photo && <p className="pet-field-error" id="pet-photo-hint" role="alert">{errors.photo}</p>}</div></div>
        <h3>Thông tin cơ bản</h3><div className="pet-editor-fields">
          <PetField name="name" label="Tên thú cưng" value={form.name} onChange={change} maxLength={60} placeholder="Ví dụ: Bô, Mít, Mochi…" required error={errors.name} ref={nameRef} />
          <PetField name="species" label="Loài" as="select" value={form.species} onChange={change} required error={errors.species}>{Object.entries(PET_SPECIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</PetField>
          <PetField name="breed" label="Giống" value={form.breed} onChange={change} maxLength={80} placeholder="Ví dụ: Poodle, mèo Anh lông ngắn" error={errors.breed} />
          <PetField name="gender" label="Giới tính" as="select" value={form.gender} onChange={change} error={errors.gender}>{Object.entries(PET_GENDERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</PetField>
          <PetField name="birthDate" label="Ngày sinh" type="date" value={form.birthDate} max={clinicToday()} onChange={change} error={errors.birthDate} />
          <PetField name="weight" label="Cân nặng (kg)" type="number" inputMode="decimal" min="0.01" max="500" step="0.01" value={form.weight} onChange={change} placeholder="Chưa cập nhật" error={errors.weight} />
          <PetField name="color" label="Màu lông" value={form.color} onChange={change} maxLength={80} placeholder="Ví dụ: Nâu vàng, trắng…" error={errors.color} />
          <PetField name="microchip" label="Mã chip (nếu có)" value={form.microchip} onChange={change} maxLength={80} placeholder="Mã nhận diện của bé" error={errors.microchip} />
        </div><div className="pet-checkboxes"><label><input type="checkbox" name="estimatedBirthDate" checked={form.estimatedBirthDate} onChange={change} />Ngày sinh ước tính</label><label><input type="checkbox" name="neutered" checked={form.neutered} onChange={change} />Đã triệt sản</label></div>
        <h3>Lưu ý chăm sóc</h3><div className="pet-editor-fields"><PetField name="allergies" label="Thông tin dị ứng" as="textarea" rows={3} value={form.allergies} onChange={change} maxLength={1000} placeholder="Ghi thông tin dị ứng bạn đã biết, hoặc để trống." error={errors.allergies} className="pet-field-wide" /><PetField name="notes" label="Ghi chú thêm" as="textarea" rows={3} value={form.notes} onChange={change} maxLength={1000} placeholder="Thói quen, đặc điểm hoặc lưu ý khi chăm sóc bé…" error={errors.notes} className="pet-field-wide" /></div>
      </fieldset>
      {error && <div className="pet-alert error" role="alert">{error}</div>}
      <p className="pet-form-disclaimer">Thông tin do chủ nuôi cung cấp, không thay thế hồ sơ khám hay xác nhận của bác sĩ.</p>
      <div className="pet-dialog-actions"><button className="pet-button secondary" type="button" onClick={close} disabled={busy}>Hủy</button><button className="pet-button primary" type="submit" disabled={busy}><PetIcon name="heart" />{saving ? 'Đang lưu…' : photoLoading ? 'Đang xử lý ảnh…' : pet ? 'Lưu thay đổi' : 'Lưu thú cưng'}</button></div>
    </form>
  </Modal>;
}
