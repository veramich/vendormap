import { COMMON_AMENITIES, ALL_COMMON_AMENITIES } from '../constants';

interface AmenitiesEditorProps {
  amenities: string[];
  onAdd: (amenity: string) => void;
  onRemove: (amenity: string) => void;
  maxCount?: number;
}

export function AmenitiesEditor({ amenities, onAdd, onRemove, maxCount = 20 }: AmenitiesEditorProps) {
  const customAmenities = amenities.filter((a) => !ALL_COMMON_AMENITIES.includes(a));

  return (
    <div>
      <div className="amenity-sections">
        {Object.entries(COMMON_AMENITIES).map(([sectionName, sectionAmenities]) => (
          <div key={sectionName} className="amenity-section">
            <div className="amenity-section-header">{sectionName}</div>
            <div className="amenity-section-grid">
              {sectionAmenities.map((amenity) => {
                const isChecked = amenities.includes(amenity);
                const isDisabled = !isChecked && amenities.length >= maxCount;
                return (
                  <label
                    key={amenity}
                    className={`amenity-checkbox-item${isChecked ? ' checked' : ''}${isDisabled ? ' disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => { if (e.target.checked) onAdd(amenity); else onRemove(amenity); }}
                    />
                    <span>{amenity}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {customAmenities.length > 0 && (
        <div>
          <strong>Custom amenities:</strong>
          <div>
            {customAmenities.map((amenity) => (
              <span key={amenity}>
                {amenity} <button type="button" onClick={() => onRemove(amenity)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
