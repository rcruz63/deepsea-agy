export {
  HEX_DIRECTIONS,
  HEX_DIRECTION_VECTORS,
  addAxialCoordinates,
  areAxialCoordinatesEqual,
  createAxialCoordinate,
  getAllHexNeighbors,
  getDirectionVector,
  getHexNeighbor,
  parseHexKey,
  rotateHexDirection,
  scaleAxialCoordinate,
  subtractAxialCoordinates,
  toHexKey,
} from './HexCoordinate.ts';
export type { AxialCoordinate, HexDirection, HexKey } from './HexCoordinate.ts';

export {
  axialToCartesian,
  calculateNavalBearingDegrees,
  cartesianToAxial,
  roundFractionalAxial,
} from './HexLayout.ts';
export type {
  FractionalAxialCoordinate,
  HexOrientation,
  Point2D,
} from './HexLayout.ts';

export {
  calculateHexDistance,
  getHexRing,
  getHexesWithinRadius,
  interpolateHexLine,
} from './HexMath.ts';

export { HexGridMap } from './HexGridMap.ts';
export type { HexCell } from './HexGridMap.ts';
