'use client';

import { useEffect, useState } from 'react';
import { fetchSkillLimits, type SkillLimits } from '@/shared/api/skills-api';

/** The skill authoring limits from the backend; null until they are loaded. */
export function useSkillLimits(): SkillLimits | null {
  const [limits, setLimits] = useState<SkillLimits | null>(null);

  useEffect(() => {
    let active = true;
    fetchSkillLimits().then((value) => {
      if (active) setLimits(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return limits;
}
