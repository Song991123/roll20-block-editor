/**
 * SFX 모듈 entrypoint.
 *
 * 다른 모듈은 `import { playSfx } from '@/lib/sfx'` 한 줄.
 */
export { playSfx, preloadSfx } from './player';
export type { SfxEvent } from './types';
