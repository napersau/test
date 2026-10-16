import { useEffect, useState } from 'react';
import { PET_SPECIES } from '../../features/pets/petPolicy';

const SYMBOLS = { DOG: '🐶', CAT: '🐱', RABBIT: '🐰', BIRD: '🐦', OTHER: '🐾' };
export default function PetAvatar({ pet, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [pet.photo]);
  return <div className={`customer-pet-avatar species-${pet.species.toLowerCase()} ${className}`}>
    {pet.photo && !failed ? <img src={pet.photo} alt={`Ảnh của bé ${pet.name || 'thú cưng'}`} loading="lazy" onError={() => setFailed(true)} />
      : <span role="img" aria-label={`${PET_SPECIES[pet.species]} ${pet.name || ''}`}>{SYMBOLS[pet.species]}</span>}
  </div>;
}
