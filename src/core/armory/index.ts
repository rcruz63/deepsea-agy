export {
  advanceTorpedoTubeReloadTurn,
  beginTorpedoTubeReload,
  canFireTorpedoTube,
  createEmptyTorpedoTube,
  createLoadedTorpedoTube,
  damageTorpedoTube,
  fireTorpedoFromTube,
  repairTorpedoTubeToEmpty,
  setTorpedoTubeReloadPaused,
} from './TorpedoTubeTransition.ts';

export {
  advanceArmoryReloadTurn,
  calculateArmoryReloadNoise,
  canStartTorpedoReloadInArmory,
  createInitialTorpedoArmory,
  damageTorpedoTubeInArmory,
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
  hasActiveMechanicalReload,
  setArmoryReloadPaused,
  startTorpedoReloadInArmory,
} from './TorpedoArmory.ts';
