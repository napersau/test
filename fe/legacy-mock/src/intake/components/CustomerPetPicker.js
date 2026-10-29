import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PET_SPECIES, PET_GENDERS } from '../../pets/petPolicy';
import { EMPTY_NEW_CUSTOMER, EMPTY_NEW_PET } from '../intakePolicy';

const digits = (value) => String(value || '').replace(/\D/g, '');

// Tra cứu chủ nuôi theo số điện thoại: khách cũ → chọn thú cưng; khách mới → tạo nhanh khách hàng & thú cưng.
export default function CustomerPetPicker({ options, value, onChange, errors = {}, firstRef }) {
  const owner = options.customers.find((item) => item.id === value.ownerId);
  const [phone, setPhone] = useState(owner?.phone || value.newCustomer?.phone || '');
  const pets = options.pets.filter((item) => item.ownerId === value.ownerId && item.status === 'ACTIVE');
  const typed = digits(phone); const complete = typed.length === 10;
  const found = complete ? options.customers.find((item) => digits(item.phone) === typed) : null;
  const creating = !!value.newCustomer;
  const lookup = (event) => {
    const next = event.target.value; setPhone(next);
    const match = digits(next).length === 10 ? options.customers.find((item) => digits(item.phone) === digits(next)) : null;
    onChange({ ownerId: match?.id || '', petId: '', newCustomer: null, newPet: null });
  };
  const field = (key, label, control) => <label className="admin-field" htmlFor={`picker-${key}`}><span>{label}</span>{control}{errors[key] && <small className="admin-field-error" id={`picker-error-${key}`}>{errors[key]}</small>}</label>;
  const input = (group, name, label, maxLength = 100, required = true) => {
    const key = `${group}.${name}`;
    return field(key, `${label}${required ? ' *' : ''}`, <input id={`picker-${key}`} name={key} maxLength={maxLength} value={value[group][name]} autoComplete="off" aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `picker-error-${key}` : undefined} onChange={(event) => onChange({ [group]: { ...value[group], [name]: event.target.value } })} />);
  };
  const petFields = () => <>
    {input('newPet', 'name', 'Tên thú cưng', 60)}
    <div className="admin-form-row">
      {field('newPet.species', 'Loài *', <select id="picker-newPet.species" name="newPet.species" value={value.newPet?.species} onChange={(event) => onChange({ newPet: { ...value.newPet, species: event.target.value } })}>{Object.entries(PET_SPECIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
      {field('newPet.gender', 'Giới tính', <select id="picker-newPet.gender" name="newPet.gender" value={value.newPet?.gender} onChange={(event) => onChange({ newPet: { ...value.newPet, gender: event.target.value } })}>{Object.entries(PET_GENDERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
    </div>
    {input('newPet', 'breed', 'Giống', 80, false)}
  </>;
  return <div className="intake-picker">
    {field('phone', 'Số điện thoại khách hàng *', <input id="picker-phone" name="phone" ref={firstRef} type="tel" inputMode="numeric" maxLength={14} placeholder="Nhập 10 số để tra cứu" value={phone} autoComplete="off" onChange={lookup} />)}
    {errors.ownerId && !creating && <small className="admin-field-error" id="picker-error-ownerId">{errors.ownerId}</small>}
    {owner && <p className="intake-found" role="status">Khách hàng: <strong>{owner.fullName}</strong> · <Link to={`/reception/customers/${encodeURIComponent(owner.id)}`} target="_blank" rel="noopener noreferrer">Xem hồ sơ ↗</Link></p>}
    {!owner && complete && !creating && !found && <p className="intake-found warn" role="status">Chưa có khách hàng với số này.
      {' '}<button type="button" className="pet-text-button" onClick={() => onChange({ ownerId: '', petId: '', newCustomer: { ...EMPTY_NEW_CUSTOMER, phone: typed }, newPet: { ...EMPTY_NEW_PET } })}>Tạo nhanh khách hàng & thú cưng</button></p>}
    {owner && !value.newPet && <>
      {field('petId', 'Thú cưng *', <select id="picker-petId" name="petId" value={value.petId} onChange={(event) => onChange({ petId: event.target.value })} aria-invalid={!!errors.petId} aria-describedby={errors.petId ? 'picker-error-petId' : undefined}><option value="">Chọn thú cưng…</option>{pets.map((item) => <option key={item.id} value={item.id}>{item.name} · {PET_SPECIES[item.species]}</option>)}</select>)}
      {!pets.length && <p className="intake-field-help">Khách chưa có thú cưng đang quản lý.</p>}
      <button type="button" className="pet-text-button" onClick={() => onChange({ petId: '', newPet: { ...EMPTY_NEW_PET } })}>+ Thêm nhanh thú cưng mới</button>
    </>}
    {owner && value.newPet && <fieldset className="intake-new"><legend>Thú cưng mới của {owner.fullName}</legend>{petFields()}
      <button type="button" className="pet-text-button" onClick={() => onChange({ newPet: null })}>Chọn thú cưng đã có</button></fieldset>}
    {creating && <fieldset className="intake-new"><legend>Khách hàng & thú cưng mới</legend>
      {input('newCustomer', 'fullName', 'Họ tên khách hàng')}
      {field('newCustomer.phone', 'Số điện thoại *', <input id="picker-newCustomer.phone" name="newCustomer.phone" value={value.newCustomer.phone} readOnly aria-invalid={!!errors['newCustomer.phone']} aria-describedby={errors['newCustomer.phone'] ? 'picker-error-newCustomer.phone' : undefined} />)}
      {input('newCustomer', 'address', 'Địa chỉ', 300, false)}{petFields()}
      <button type="button" className="pet-text-button" onClick={() => onChange({ newCustomer: null, newPet: null })}>Hủy tạo mới</button></fieldset>}
    {errors.petId && (creating || !owner) && <small className="admin-field-error">{errors.petId}</small>}
  </div>;
}
