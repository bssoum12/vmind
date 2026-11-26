'use client';

import React from 'react';

/**
 * Scheduling rules editor, same look and behaviour as the Recouvrement wizard (step 4).
 * Controlled component: the parent owns the rules and saves them as `trigger_rules`.
 */
export interface TriggerRule {
  interval: string;
  secondsBetween: number;
  minutesBetween: number;
  hoursBetween: number;
  daysBetween: number;
  weeksBetween: number;
  monthsBetween: number;
  triggerAtMinute: number;
  triggerAtHour: string;
  triggerOnWeekdays: string[];
  triggerAtDayOfMonth: number;
}

export const DEFAULT_TRIGGER_RULE: TriggerRule = {
  interval: 'Days',
  secondsBetween: 30,
  minutesBetween: 5,
  hoursBetween: 1,
  daysBetween: 1,
  weeksBetween: 1,
  monthsBetween: 1,
  triggerAtMinute: 0,
  triggerAtHour: '8am',
  triggerOnWeekdays: ['Sunday'],
  triggerAtDayOfMonth: 1,
};

export const INTERVAL_OPTIONS = [
  { value: 'Days', label: 'Jours' },
  { value: 'Weeks', label: 'Semaines' },
  { value: 'Hours', label: 'Heures' },
  { value: 'Minutes', label: 'Minutes' },
  { value: 'Seconds', label: 'Secondes' },
  { value: 'Months', label: 'Mois' },
];

export const HOUR_OPTIONS = [
  { value: 'Midnight', label: '00:00 (Minuit)' },
  { value: '1am', label: '01:00 (1h du matin)' },
  { value: '2am', label: '02:00 (2h du matin)' },
  { value: '3am', label: '03:00 (3h du matin)' },
  { value: '4am', label: '04:00 (4h du matin)' },
  { value: '5am', label: '05:00 (5h du matin)' },
  { value: '6am', label: '06:00 (6h du matin)' },
  { value: '7am', label: '07:00 (7h du matin)' },
  { value: '8am', label: '08:00 (8h du matin)' },
  { value: '9am', label: '09:00 (9h du matin)' },
  { value: '10am', label: '10:00 (10h du matin)' },
  { value: '11am', label: '11:00 (11h du matin)' },
  { value: 'Noon', label: '12:00 (Midi)' },
  { value: '1pm', label: '13:00 (13h)' },
  { value: '2pm', label: '14:00 (14h)' },
  { value: '3pm', label: '15:00 (15h)' },
  { value: '4pm', label: '16:00 (16h)' },
  { value: '5pm', label: '17:00 (17h)' },
  { value: '6pm', label: '18:00 (18h)' },
  { value: '7pm', label: '19:00 (19h)' },
  { value: '8pm', label: '20:00 (20h)' },
  { value: '9pm', label: '21:00 (21h)' },
  { value: '10pm', label: '22:00 (22h)' },
  { value: '11pm', label: '23:00 (23h)' },
];

export const WEEKDAY_OPTIONS = [
  { value: 'Monday', label: 'Lundi' },
  { value: 'Tuesday', label: 'Mardi' },
  { value: 'Wednesday', label: 'Mercredi' },
  { value: 'Thursday', label: 'Jeudi' },
  { value: 'Friday', label: 'Vendredi' },
  { value: 'Saturday', label: 'Samedi' },
  { value: 'Sunday', label: 'Dimanche' },
];

/** One-line French summary of a rule, for recap screens. */
export const describeTriggerRule = (rule: TriggerRule): string => {
  const hour = HOUR_OPTIONS.find((h) => h.value === rule.triggerAtHour)?.label.slice(0, 2) ?? '00';
  const at = `${hour}:${String(rule.triggerAtMinute ?? 0).padStart(2, '0')}`;
  switch (rule.interval) {
    case 'Seconds': return `Toutes les ${rule.secondsBetween} secondes`;
    case 'Minutes': return `Toutes les ${rule.minutesBetween} minutes`;
    case 'Hours': return `Toutes les ${rule.hoursBetween} heures, à la minute ${rule.triggerAtMinute}`;
    case 'Days': return `${rule.daysBetween > 1 ? `Tous les ${rule.daysBetween} jours` : 'Chaque jour'} à ${at}`;
    case 'Weeks': {
      const days = WEEKDAY_OPTIONS.filter((d) => rule.triggerOnWeekdays.includes(d.value)).map((d) => d.label).join(', ');
      return `${rule.weeksBetween > 1 ? `Toutes les ${rule.weeksBetween} semaines` : 'Chaque semaine'} (${days || 'aucun jour'}) à ${at}`;
    }
    case 'Months': return `${rule.monthsBetween > 1 ? `Tous les ${rule.monthsBetween} mois` : 'Chaque mois'}, le ${rule.triggerAtDayOfMonth}, à ${at}`;
    default: return rule.interval;
  }
};

interface TriggerRulesEditorProps {
  rules: TriggerRule[];
  onChange: (rules: TriggerRule[]) => void;
  accent?: string;
  /** Text of the info box under the rules. */
  note?: string;
  /** Optional hook for the floating guide: receives a field key on focus, null on blur. */
  onFocusField?: (key: string | null) => void;
}

export const TriggerRulesEditor: React.FC<TriggerRulesEditorProps> = ({
  rules,
  onChange,
  accent = '#FF4757',
  note,
  onFocusField,
}) => {
  const focus = (key: string) => () => onFocusField?.(key);
  const blur = () => onFocusField?.(null);

  const add = () => onChange([...rules, { ...DEFAULT_TRIGGER_RULE, triggerOnWeekdays: [...DEFAULT_TRIGGER_RULE.triggerOnWeekdays] }]);
  const remove = (index: number) => onChange(rules.filter((_, i) => i !== index));
  const update = (index: number, key: keyof TriggerRule, value: any) =>
    onChange(rules.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const toggleDay = (index: number, day: string) => {
    const days = rules[index].triggerOnWeekdays || [];
    update(index, 'triggerOnWeekdays', days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  const hourSelect = (rule: TriggerRule, index: number) => (
    <div className="form-group" style={{ flex: 1 }}>
      <label className="form-label">Heure d&apos;Exécution</label>
      <select
        className="form-input"
        value={rule.triggerAtHour}
        onFocus={focus('trigger_hour')}
        onBlur={blur}
        onChange={(e) => update(index, 'triggerAtHour', e.target.value)}
      >
        {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
      </select>
    </div>
  );

  const minuteInput = (rule: TriggerRule, index: number) => (
    <div className="form-group" style={{ flex: 1 }}>
      <label className="form-label">Minute d&apos;Exécution</label>
      <input
        type="number"
        className="form-input"
        min="0"
        max="59"
        value={rule.triggerAtMinute}
        onFocus={focus('trigger_minute')}
        onBlur={blur}
        onChange={(e) => update(index, 'triggerAtMinute', Number(e.target.value))}
      />
    </div>
  );

  const numberField = (label: string, key: keyof TriggerRule, rule: TriggerRule, index: number, focusKey: string, min = 1, max?: number) => (
    <div className="form-group" style={{ flex: 1 }}>
      <label className="form-label">{label}</label>
      <input
        type="number"
        className="form-input"
        min={min}
        max={max}
        value={rule[key] as number}
        onFocus={focus(focusKey)}
        onBlur={blur}
        onChange={(e) => update(index, key, Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className="wcard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div className="wcard-title" style={{ margin: 0 }}>
          <span className="dot" style={{ backgroundColor: accent }}></span>
          Règles de Planification Automatique
        </div>
        <button
          type="button"
          onClick={add}
          style={{
            padding: '8px 16px', backgroundColor: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)',
            borderRadius: '6px', color: '#00e5c8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease',
          }}
        >
          <span>+</span> Ajouter une règle
        </button>
      </div>

      {rules.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#b2bec3', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          Aucune règle de déclenchement définie. L&apos;agent ne s&apos;exécutera pas automatiquement.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {rules.map((rule, index) => (
            <div
              key={index}
              style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
                  ⚡ Règle d&apos;Intervalle #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '14px', padding: '4px', opacity: 0.8, transition: 'opacity 0.2s' }}
                  title="Supprimer la règle"
                  aria-label={`Supprimer la règle ${index + 1}`}
                >
                  🗑️
                </button>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: '1 1 100%' }}>
                  <label className="form-label" style={{ fontWeight: 'bold' }}>Intervalle de Déclenchement</label>
                  <select
                    className="form-input"
                    value={rule.interval}
                    onFocus={focus('trigger_interval')}
                    onBlur={blur}
                    onChange={(e) => update(index, 'interval', e.target.value)}
                  >
                    {INTERVAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                {rule.interval === 'Seconds' && (
                  <div className="anim">{numberField('Secondes entre les Déclenchements (1 - 59)', 'secondsBetween', rule, index, 'trigger_seconds_between', 1, 59)}</div>
                )}

                {rule.interval === 'Minutes' && (
                  <div className="anim">{numberField('Minutes entre les Déclenchements (1 - 59)', 'minutesBetween', rule, index, 'trigger_minutes_between', 1, 59)}</div>
                )}

                {rule.interval === 'Hours' && (
                  <div className="form-row anim">
                    {numberField('Heures entre les Déclenchements (1 - 23)', 'hoursBetween', rule, index, 'trigger_hours_between', 1, 23)}
                    {minuteInput(rule, index)}
                  </div>
                )}

                {rule.interval === 'Days' && (
                  <div className="form-row anim">
                    {numberField('Jours entre les Déclenchements (1 - 31)', 'daysBetween', rule, index, 'trigger_days', 1, 31)}
                    {hourSelect(rule, index)}
                    {minuteInput(rule, index)}
                  </div>
                )}

                {rule.interval === 'Weeks' && (
                  <div className="anim">
                    <div className="form-row">
                      {numberField('Semaines entre les Déclenchements', 'weeksBetween', rule, index, 'trigger_weeks')}
                      {hourSelect(rule, index)}
                      {minuteInput(rule, index)}
                    </div>
                    <div
                      className="form-group"
                      style={{ marginTop: '10px' }}
                      onMouseEnter={focus('trigger_weekdays')}
                      onMouseLeave={blur}
                    >
                      <label className="form-label">Jours Autorisés de la Semaine</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {WEEKDAY_OPTIONS.map((day) => {
                          const isSelected = rule.triggerOnWeekdays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => toggleDay(index, day.value)}
                              style={{
                                padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                                backgroundColor: isSelected ? accent : 'rgba(255,255,255,0.06)',
                                color: isSelected ? 'white' : '#b2bec3',
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {rule.interval === 'Months' && (
                  <div className="anim">
                    <div className="form-row">
                      {numberField('Mois entre les Déclenchements', 'monthsBetween', rule, index, 'trigger_months')}
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Jour du Mois (1 - 31)</label>
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          max="31"
                          value={rule.triggerAtDayOfMonth}
                          onFocus={focus('trigger_day_of_month')}
                          onBlur={blur}
                          onChange={(e) => update(index, 'triggerAtDayOfMonth', Number(e.target.value))}
                        />
                        <div className="form-hint" style={{ fontSize: '9px', color: '#ff7675' }}>
                          Remarque: Si le mois n&apos;a pas ce jour, le déclenchement n&apos;aura pas lieu.
                        </div>
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '10px' }}>
                      {hourSelect(rule, index)}
                      {minuteInput(rule, index)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {note && (
        <div className="info-box" style={{ marginTop: '15px' }}>
          ⚡ {note}
        </div>
      )}
    </div>
  );
};
