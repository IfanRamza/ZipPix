import { beforeEach, describe, expect, test } from 'bun:test';
import { useImageStore } from '../src/store/imageStore';

describe('imageStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useImageStore.getState().reset();
  });

  test('initial state is correct', () => {
    const state = useImageStore.getState();
    expect(state.originalImage).toBe(null);
    expect(state.compressedImage).toBe(null);
    expect(state.compressedSize).toBe(0);
    expect(state.compressedUrl).toBe(null);
    expect(state.sliderPosition).toBe(50);
    expect(state.status.isCompressing).toBe(false);
  });

  test('default settings are correct', () => {
    const { settings } = useImageStore.getState();
    expect(settings.format).toBe('webp');
    expect(settings.quality).toBe(85);
    expect(settings.maintainAspectRatio).toBe(true);
    expect(settings.stripMetadata).toBe(true);
    expect(settings.effort).toBe(4);
    expect(settings.progressive).toBe(true);
    expect(settings.chromaSubsampling).toBe('4:2:0');
  });

  test('updateSettings merges settings', () => {
    const store = useImageStore.getState();
    store.updateSettings({ quality: 50 });

    const { settings } = useImageStore.getState();
    expect(settings.quality).toBe(50);
    expect(settings.format).toBe('webp'); // unchanged
  });

  test('setSliderPosition clamps value', () => {
    const store = useImageStore.getState();

    store.setSliderPosition(150);
    expect(useImageStore.getState().sliderPosition).toBe(100);

    store.setSliderPosition(-50);
    expect(useImageStore.getState().sliderPosition).toBe(0);

    store.setSliderPosition(75);
    expect(useImageStore.getState().sliderPosition).toBe(75);
  });

  test('setError updates status', () => {
    const store = useImageStore.getState();
    store.setError('Test error');

    const { status } = useImageStore.getState();
    expect(status.error).toBe('Test error');
    expect(status.isCompressing).toBe(false);
  });

  test('setProcessing updates status', () => {
    const store = useImageStore.getState();
    store.setProcessing(true);

    expect(useImageStore.getState().status.isCompressing).toBe(true);

    store.setProcessing(false);
    expect(useImageStore.getState().status.isCompressing).toBe(false);
  });

  test('reset restores initial state', () => {
    const store = useImageStore.getState();

    // Modify state
    store.updateSettings({ quality: 10, format: 'png' });
    store.setSliderPosition(25);

    // Reset
    store.reset();

    const state = useImageStore.getState();
    expect(state.settings.quality).toBe(85);
    expect(state.settings.format).toBe('webp');
    expect(state.sliderPosition).toBe(50);
  });

  test('hasEdits returns true when removeBackground is enabled', () => {
    const store = useImageStore.getState();
    expect(store.hasEdits()).toBe(false);

    store.updateEditState({ removeBackground: true });
    expect(useImageStore.getState().hasEdits()).toBe(true);
  });

  test('resetEdits clears removeBackground', () => {
    const store = useImageStore.getState();
    store.updateEditState({ removeBackground: true });
    expect(useImageStore.getState().editState.removeBackground).toBe(true);

    store.resetEdits();
    expect(useImageStore.getState().editState.removeBackground).toBe(false);
    expect(useImageStore.getState().hasEdits()).toBe(false);
  });
});
