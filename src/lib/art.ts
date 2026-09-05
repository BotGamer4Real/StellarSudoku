import type { CosmeticId, DifficultyId } from './constants';
import type { Profile } from './types';

export const ART = {
  starfield: '/art/bg-starfield.jpg',
  nebula: '/art/bg-nebula.jpg',
  hologrid: '/art/bg-hologrid.jpg',
  orb: '/art/orb-nebula.jpg',
  avatarShip: '/art/avatar-ship.jpg',
  avatarStar: '/art/avatar-star.jpg',
  bannerGalaxy: '/art/banner-galaxy.jpg',
  flourishStar: '/art/flourish-star.jpg',
  flourishComet: '/art/flourish-comet.jpg',
  flourishBlackhole: '/art/flourish-blackhole.jpg',
  flourishSupernova: '/art/flourish-supernova.jpg',
  coin: '/art/coin.jpg',
  icon: '/icon-512.png',
} as const;

export const DIFFICULTY_ART: Record<DifficultyId, string> = {
  asteroid_belt: '/art/diff-asteroid.jpg',
  nebula_drift: '/art/diff-nebula.jpg',
  star_cluster: '/art/diff-cluster.jpg',
  galaxy_edge: '/art/diff-galaxy.jpg',
  supernova: '/art/diff-supernova.jpg',
  black_hole: '/art/diff-blackhole.jpg',
};

export const COSMETIC_THUMB: Record<CosmeticId, string> = {
  starfield_background: ART.starfield,
  holographic_grid: ART.hologrid,
  nebula_number_orbs: ART.orb,
  spaceship_avatar: ART.avatarShip,
  comet_trail: ART.flourishComet,
  black_hole_flourish: ART.flourishBlackhole,
  galaxy_banner: ART.bannerGalaxy,
  supernova_glow: ART.flourishSupernova,
};

export function backgroundSrc(equipped?: string | null): string {
  if (equipped === 'holographic_grid') return ART.hologrid;
  if (equipped === 'starfield_background') return ART.starfield;
  return ART.starfield;
}

export function flourishSrc(equipped?: string | null): string {
  if (equipped === 'comet_trail') return ART.flourishComet;
  if (equipped === 'black_hole_flourish') return ART.flourishBlackhole;
  if (equipped === 'supernova_glow') return ART.flourishSupernova;
  return ART.flourishStar;
}

export function avatarSrc(equipped?: string | null): string {
  if (equipped === 'spaceship_avatar') return ART.avatarShip;
  return ART.avatarStar;
}

export function bannerSrc(equipped?: string | null): string | null {
  if (equipped === 'galaxy_banner') return ART.bannerGalaxy;
  return null;
}

export function padIsOrbs(equipped?: string | null): boolean {
  return equipped === 'nebula_number_orbs';
}

export function applyLook(profile?: Profile | null): void {
  const root = document.documentElement;
  root.style.setProperty('--scene', `url("${backgroundSrc(profile?.equipped_background)}")`);
  root.style.setProperty('--orb', `url("${ART.orb}")`);
  root.dataset.pad = padIsOrbs(profile?.equipped_pad) ? 'orbs' : '';
}
