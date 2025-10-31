import { describe, it, expect } from 'vitest';
import { parseResolution, computeContainFit } from './image-utils';

describe('parseResolution', () => {
  it('parses valid WxH strings', () => {
    expect(parseResolution('1280x720')).toEqual({ width: 1280, height: 720 });
    expect(parseResolution('720x1280')).toEqual({ width: 720, height: 1280 });
  });

  it('throws on invalid strings', () => {
    expect(() => parseResolution('1280')).toThrow();
    expect(() => parseResolution('x720')).toThrow();
    expect(() => parseResolution('foo')).toThrow();
  });
});

describe('computeContainFit', () => {
  it('centers and letterboxes properly for wide source to 1280x720', () => {
    const r = computeContainFit(2000, 1000, 1280, 720);
    expect(r.scale).toBeCloseTo(0.64, 5);
    expect(r.drawWidth).toBe(1280);
    expect(r.drawHeight).toBe(640);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(40);
  });

  it('centers and pillarboxes properly for tall source to 1280x720', () => {
    const r = computeContainFit(1000, 2000, 1280, 720);
    expect(r.scale).toBeCloseTo(0.36, 5);
    expect(r.drawWidth).toBe(360);
    expect(r.drawHeight).toBe(720);
    expect(r.dx).toBe(460);
    expect(r.dy).toBe(0);
  });

  it('no padding when aspect matches', () => {
    const r = computeContainFit(1280, 720, 1280, 720);
    expect(r.drawWidth).toBe(1280);
    expect(r.drawHeight).toBe(720);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
  });

  it('throws on non-positive inputs', () => {
    expect(() => computeContainFit(0, 10, 100, 100)).toThrow();
    expect(() => computeContainFit(10, 0, 100, 100)).toThrow();
    expect(() => computeContainFit(10, 10, 0, 100)).toThrow();
    expect(() => computeContainFit(10, 10, 100, 0)).toThrow();
  });
});

