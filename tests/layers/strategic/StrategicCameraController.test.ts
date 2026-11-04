import { describe, expect, it } from 'vitest';
import { StrategicCameraController } from '../../../src/layers/strategic/view/StrategicCameraController.ts';

describe('StrategicCameraController', () => {
  it('centers viewport on a target world point and inverts worldToScreen / screenToWorld accurately', () => {
    const camera = new StrategicCameraController();
    camera.setWorldBounds({ width: 2100, height: 1200 });
    camera.focusOnWorldPoint({ x: 1050, y: 600 }, 1280, 800, 1.0);

    const screenCenter = camera.worldToScreen({ x: 1050, y: 600 });
    expect(screenCenter.x).toBeCloseTo(640, 2);
    expect(screenCenter.y).toBeCloseTo(400, 2);

    const roundTrip = camera.screenToWorld(screenCenter);
    expect(roundTrip.x).toBeCloseTo(1050, 2);
    expect(roundTrip.y).toBeCloseTo(600, 2);
  });

  it('preserves world coordinate under the cursor when zooming with wheel', () => {
    const camera = new StrategicCameraController();
    camera.setWorldBounds({ width: 2100, height: 1200 });
    camera.focusOnWorldPoint({ x: 1000, y: 580 }, 1280, 800, 1.0);

    const cursorScreen = { x: 420, y: 310 };
    const beforeWorld = camera.screenToWorld(cursorScreen);

    camera.zoomAtScreenPoint(cursorScreen, -100, 1280, 800);
    const afterWorld = camera.screenToWorld(cursorScreen);

    expect(camera.getZoom()).toBeGreaterThan(1.0);
    expect(afterWorld.x).toBeCloseTo(beforeWorld.x, 1);
    expect(afterWorld.y).toBeCloseTo(beforeWorld.y, 1);
  });
});
