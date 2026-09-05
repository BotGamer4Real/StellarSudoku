import { useEffect } from 'react';
import { applyLook } from '../lib/art';
import { setAudioLevels, unlockAudio } from '../lib/audio';
import { loadLocalSettings, mergeSettings } from '../lib/applySettings';
import { useAuth } from '../state/AuthProvider';

export function LookApplier() {
  const { profile } = useAuth();
  const settings = mergeSettings(profile?.settings ?? loadLocalSettings());

  useEffect(() => {
    applyLook(profile);
    setAudioLevels(settings.sfx, settings.music);
  }, [profile, settings.sfx, settings.music]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return null;
}
