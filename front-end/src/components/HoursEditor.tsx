import { generateUUID } from '../utils';
import { DAY_NAMES, DAYS } from '../constants';

export interface HourPeriod {
  id: string;
  open: string;
  close: string;
  closes_next_day: boolean;
}

export interface DayHours {
  closed: boolean;
  open_24_hours: boolean;
  periods: HourPeriod[];
}

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type BusinessHours = Record<DayIndex, DayHours>;

// ── Factories ────────────────────────────────────────────────────────────────

export function makeDefaultPeriod(): HourPeriod {
  return { id: generateUUID(), open: '09:00', close: '17:00', closes_next_day: false };
}

export function makeDefaultDayHours(): DayHours {
  return { closed: false, open_24_hours: false, periods: [makeDefaultPeriod()] };
}

export function makeDefaultHours(): BusinessHours {
  return {
    0: makeDefaultDayHours(),
    1: makeDefaultDayHours(),
    2: makeDefaultDayHours(),
    3: makeDefaultDayHours(),
    4: makeDefaultDayHours(),
    5: makeDefaultDayHours(),
    6: { closed: false, open_24_hours: false, periods: [{ id: generateUUID(), open: '10:00', close: '15:00', closes_next_day: false }] },
  };
}

// ── Time Conversion Utilities ────────────────────────────────────────────────

function convert24to12(time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hours, minutes] = time24.split(':');
  const hourNum = parseInt(hours, 10);
  
  if (hourNum === 0) {
    return { hour: '12', minute: minutes, period: 'AM' };
  } else if (hourNum < 12) {
    return { hour: hourNum.toString(), minute: minutes, period: 'AM' };
  } else if (hourNum === 12) {
    return { hour: '12', minute: minutes, period: 'PM' };
  } else {
    return { hour: (hourNum - 12).toString(), minute: minutes, period: 'PM' };
  }
}

function convert12to24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let hourNum = parseInt(hour, 10);
  
  if (period === 'AM') {
    if (hourNum === 12) hourNum = 0;
  } else {
    if (hourNum !== 12) hourNum += 12;
  }
  
  return `${hourNum.toString().padStart(2, '0')}:${minute}`;
}

// ── Time Input Component ─────────────────────────────────────────────────────

interface TimeInputProps {
  value: string; // 24-hour format
  onChange: (value: string) => void; // 24-hour format
  className?: string;
}

function TimeInput({ value, onChange, className = '' }: TimeInputProps) {
  const { hour, minute, period } = convert24to12(value);
  
  const handleChange = (newHour: string, newMinute: string, newPeriod: 'AM' | 'PM') => {
    const time24 = convert12to24(newHour, newMinute, newPeriod);
    onChange(time24);
  };

  const selectStyle = {
    padding: '4px 6px',
    border: '1px solid #475569',
    borderRadius: '4px',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: '14px',
  };

  return (
    <div className={`time-input ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <select value={hour} onChange={(e) => handleChange(e.target.value, minute, period)} style={{ ...selectStyle, minWidth: '44px' }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h.toString()}>{h}</option>
        ))}
      </select>
      <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>:</span>
      <select value={minute} onChange={(e) => handleChange(hour, e.target.value, period)} style={{ ...selectStyle, minWidth: '50px' }}>
        {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
          <option key={m} value={m.toString().padStart(2, '0')}>
            {m.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <select value={period} onChange={(e) => handleChange(hour, minute, e.target.value as 'AM' | 'PM')} style={{ ...selectStyle, minWidth: '50px' }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface HoursFlags {
  always_open: boolean;
  weekly_hours_on_website: boolean;
  subject_to_change: boolean;
}

interface HoursEditorProps {
  hours: BusinessHours | null;
  flags: HoursFlags;
  onChange: (hours: BusinessHours | null) => void;
  onFlagsChange: (flags: HoursFlags) => void;
}

export function HoursEditor({ hours, flags, onChange, onFlagsChange }: HoursEditorProps) {
  const updateDayHours = (day: DayIndex, updates: Partial<DayHours>) => {
    if (!hours) return;
    onChange({ ...hours, [day]: { ...hours[day], ...updates } } as BusinessHours);
  };

  const addHourPeriod = (day: DayIndex) => {
    if (!hours) return;
    updateDayHours(day, { periods: [...hours[day].periods, makeDefaultPeriod()] });
  };

  const updateHourPeriod = (day: DayIndex, periodId: string, updates: Partial<HourPeriod>) => {
    if (!hours) return;
    updateDayHours(day, {
      periods: hours[day].periods.map((p) => (p.id === periodId ? { ...p, ...updates } : p)),
    });
  };

  const removeHourPeriod = (day: DayIndex, periodId: string) => {
    if (!hours) return;
    const dayHours = hours[day];
    if (dayHours.periods.length > 1) {
      updateDayHours(day, { periods: dayHours.periods.filter((p) => p.id !== periodId) });
    }
  };

  return (
    <div className="hours-form">
      <div className="hours-form-header">
        <label>
          <input
            type="checkbox"
            checked={flags.always_open}
            onChange={(e) => onFlagsChange({ ...flags, always_open: e.target.checked, weekly_hours_on_website: e.target.checked ? false : flags.weekly_hours_on_website })}
          />
          {' '}Open 24/7
        </label>
        <label>
          <input
            type="checkbox"
            checked={flags.weekly_hours_on_website}
            onChange={(e) => onFlagsChange({ ...flags, weekly_hours_on_website: e.target.checked, always_open: e.target.checked ? false : flags.always_open })}
          />
          {' '}Hours posted weekly on business website
        </label>
        <label>
          <input
            type="checkbox"
            checked={flags.subject_to_change}
            onChange={(e) => onFlagsChange({ ...flags, subject_to_change: e.target.checked })}
          />
          {' '}Hours subject to change
        </label>
      </div>
      {!flags.always_open && !flags.weekly_hours_on_website && (
        hours === null ? (
          <button type="button" onClick={() => onChange(makeDefaultHours())} style={{ width: '100%', padding: '12px', marginTop: '8px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>
            + Add hours
          </button>
        ) : (
        <>
      <div className="days-grid">
          {DAYS.map((day) => {
            const dayHours = hours[day] as DayHours | undefined;
            if (!dayHours) return null;
            return (
              <div key={day} className="day-hours-container">
                <div className="day-header-row">
                  <div className="day-header">{DAY_NAMES[day]}</div>
                  <div className="day-controls">
                    <label>
                      <input
                        type="checkbox"
                        checked={dayHours.closed}
                        onChange={(e) =>
                          updateDayHours(day, {
                            closed: e.target.checked,
                            periods: e.target.checked ? [] : [makeDefaultPeriod()],
                          })
                        }
                      />
                      Closed
                    </label>
                    {!dayHours.closed && (
                      <label>
                        <input
                          type="checkbox"
                          checked={dayHours.open_24_hours}
                          onChange={(e) =>
                            updateDayHours(day, {
                              open_24_hours: e.target.checked,
                              periods: e.target.checked ? [] : [makeDefaultPeriod()],
                            })
                          }
                        />
                        24 hours
                      </label>
                    )}
                  </div>
                </div>

                {!dayHours.closed && !dayHours.open_24_hours && (
                  <div className="time-periods">
                    {dayHours.periods.map((period, periodIndex) => (
                      <div key={period.id} className="hour-period">
                        {dayHours.periods.length > 1 && (
                          <div className="period-header">Hours {periodIndex + 1}</div>
                        )}
                        <div className="time-inputs-group">
                          <div className="time-input-wrapper">
                            <div className="time-input-label">Open</div>
                            <TimeInput
                              value={period.open}
                              onChange={(value) => updateHourPeriod(day, period.id, { open: value })}
                              className="time-input"
                            />
                          </div>
                          <div className="time-input-wrapper">
                            <div className="time-input-label">Close</div>
                            <TimeInput
                              value={period.close}
                              onChange={(value) => updateHourPeriod(day, period.id, { close: value })}
                              className="time-input"
                            />
                          </div>
                        </div>
                        <div className="closes-next-day">
                          <input
                            type="checkbox"
                            checked={period.closes_next_day}
                            onChange={(e) => updateHourPeriod(day, period.id, { closes_next_day: e.target.checked })}
                          />
                          <span>Closes next day (e.g. closes at 2 AM)</span>
                        </div>
                        {dayHours.periods.length > 1 && (
                          <div className="period-actions">
                            <button type="button" onClick={() => removeHourPeriod(day, period.id)}>
                              Remove these hours
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addHourPeriod(day)}>
                      Add another set of hours for {DAY_NAMES[day]}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button type="button" onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}>
              Remove hours
            </button>
          </div>
        </>
        )
      )}
    </div>
  );
}
