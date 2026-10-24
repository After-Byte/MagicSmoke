import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RobotArm3DViewport } from '../src/three/RobotArm3DViewport';
import { DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS } from '../src/robot/arm/RobotArmModel';

// Hoisted mocks for vi.mock
const { mockCanvas, mockRendererInstance, MockWebGLRenderer } = vi.hoisted(() => {
  const canvas = {
    tagName: 'CANVAS',
    style: {} as any,
    tabIndex: 0,
    focus: vi.fn(),
    parentElement: null as any,
    parentNode: null as any,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const rendererInstance = {
    domElement: canvas,
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    shadowMap: { enabled: false, type: 0 },
    render: vi.fn(),
    dispose: vi.fn(),
  };

  class MockRenderer {
    domElement = canvas;
    setSize = (...args: any[]) => rendererInstance.setSize(...args);
    setPixelRatio = (...args: any[]) => rendererInstance.setPixelRatio(...args);
    shadowMap = { enabled: false, type: 0 };
    render = (...args: any[]) => rendererInstance.render(...args);
    dispose = (...args: any[]) => rendererInstance.dispose(...args);
  }

  return {
    mockCanvas: canvas,
    mockRendererInstance: rendererInstance,
    MockWebGLRenderer: MockRenderer,
  };
});

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

describe('RobotArm3DViewport Lifecycle & Tab Restoration Suite', () => {
  let mockContainer: any;
  let mockNewContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock requestAnimationFrame & cancelAnimationFrame
    let nextRafId = 1;
    (global as any).requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      return nextRafId++;
    });
    (global as any).cancelAnimationFrame = vi.fn();

    mockCanvas.parentElement = null;
    mockCanvas.parentNode = null;

    mockContainer = {
      tagName: 'DIV',
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
      appendChild: vi.fn((child: any) => {
        child.parentElement = mockContainer;
        child.parentNode = mockContainer;
      }),
      removeChild: vi.fn((child: any) => {
        if (child.parentElement === mockContainer) {
          child.parentElement = null;
          child.parentNode = null;
        }
      }),
    };

    mockNewContainer = {
      tagName: 'DIV',
      clientWidth: 1024,
      clientHeight: 768,
      getBoundingClientRect: () => ({ width: 1024, height: 768, top: 0, left: 0 }),
      appendChild: vi.fn((child: any) => {
        child.parentElement = mockNewContainer;
        child.parentNode = mockNewContainer;
      }),
      removeChild: vi.fn((child: any) => {
        if (child.parentElement === mockNewContainer) {
          child.parentElement = null;
          child.parentNode = null;
        }
      }),
    };

    (global as any).document = {
      body: {
        contains: (el: any) => el === mockContainer || el === mockNewContainer,
      },
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return { style: {} };
      },
    };

    (global as any).window = {
      devicePixelRatio: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (global as any).ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('initializes and attaches canvas to the viewport container', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);

    expect(mockContainer.appendChild).toHaveBeenCalledWith(mockCanvas);
    expect(vp.isAttached(mockContainer)).toBe(true);
    expect(vp.isLoopRunning()).toBe(true);
    expect(mockRendererInstance.setSize).toHaveBeenCalledWith(800, 600, false);
  });

  it('pauses and resumes animation loop without duplicate requestAnimationFrame handles', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);

    expect(vp.isLoopRunning()).toBe(true);
    vp.pauseLoop();
    expect(vp.isLoopRunning()).toBe(false);
    expect((global as any).cancelAnimationFrame).toHaveBeenCalled();

    // Calling pauseLoop again when paused is safe
    vp.pauseLoop();
    expect(vp.isLoopRunning()).toBe(false);

    // Resuming restarts the loop
    vp.resumeLoop();
    expect(vp.isLoopRunning()).toBe(true);

    // Calling resumeLoop again while running does NOT duplicate loops
    const currentRafCalls = (global as any).requestAnimationFrame.mock.calls.length;
    vp.resumeLoop();
    expect((global as any).requestAnimationFrame.mock.calls.length).toBe(currentRafCalls);
  });

  it('handles container resize and updates camera aspect ratio and renderer size', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);

    mockContainer.clientWidth = 1200;
    mockContainer.clientHeight = 800;
    mockContainer.getBoundingClientRect = () => ({ width: 1200, height: 800, top: 0, left: 0 });

    vp.handleResize();

    expect(mockRendererInstance.setSize).toHaveBeenCalledWith(1200, 800, false);
    expect(mockRendererInstance.render).toHaveBeenCalled();
  });

  it('safely re-attaches to a new container on tab return (attachTo)', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);
    expect(mockCanvas.parentElement).toBe(mockContainer);

    // Simulate tab switch: user leaves tab and returns, creating a new container element
    vp.pauseLoop();
    expect(vp.isLoopRunning()).toBe(false);

    vp.attachTo(mockNewContainer);

    // Canvas must be moved to new container
    expect(mockNewContainer.appendChild).toHaveBeenCalledWith(mockCanvas);
    expect(vp.isAttached(mockNewContainer)).toBe(true);
    expect(vp.isLoopRunning()).toBe(true);
    expect(mockRendererInstance.setSize).toHaveBeenCalledWith(1024, 768, false);
  });

  it('synchronizes target joint angles and updates kinematics immediately', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);

    vp.setTargetAngles({ base: 45, shoulder: 90, elbow: 90, wrist: 45, gripper: 10 }, true);

    const angles = vp.getCurrentAngles();
    expect(angles.base).toBe(45);
    expect(angles.shoulder).toBe(90);
    expect(angles.elbow).toBe(90);
    expect(angles.wrist).toBe(45);
    expect(angles.gripper).toBe(10);

    const kin = vp.getKinematics();
    expect(kin.reachable).toBe(true);
  });

  it('removes event listeners and cleans up all WebGL resources on dispose', () => {
    const vp = new RobotArm3DViewport(mockContainer, DEFAULT_ARM_DIMENSIONS, DEFAULT_JOINT_LIMITS);

    vp.dispose();

    expect(vp.isLoopRunning()).toBe(false);
    expect((global as any).window.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect((global as any).window.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockRendererInstance.dispose).toHaveBeenCalled();
  });
});
