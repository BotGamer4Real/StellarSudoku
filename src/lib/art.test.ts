import { describe, expect, it } from 'vitest';
import { ART, avatarSrc, backgroundSrc, DIFFICULTY_ART, flourishSrc, padIsOrbs } from './art';

describe('art mapping', () => {
  it('defaults to starfield and star flourish', () => {
    expect(backgroundSrc(null)).toBe(ART.starfield);
    expect(flourishSrc(undefined)).toBe(ART.flourishStar);
    expect(avatarSrc(null)).toBe(ART.avatarStar);
    expect(padIsOrbs(null)).toBe(false);
  });

  it('resolves equipped cosmetics', () => {
    expect(backgroundSrc('holographic_grid')).toBe(ART.hologrid);
    expect(flourishSrc('comet_trail')).toBe(ART.flourishComet);
    expect(flourishSrc('black_hole_flourish')).toBe(ART.flourishBlackhole);
    expect(flourishSrc('supernova_glow')).toBe(ART.flourishSupernova);
    expect(avatarSrc('spaceship_avatar')).toBe(ART.avatarShip);
    expect(padIsOrbs('nebula_number_orbs')).toBe(true);
  });

  it('has a thumb for every difficulty', () => {
    expect(Object.keys(DIFFICULTY_ART)).toHaveLength(6);
  });
});
