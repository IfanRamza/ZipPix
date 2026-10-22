import { beforeEach, describe, expect, test } from 'bun:test';
import { useBatchStore } from '../src/store/batchStore';
import { useImageStore } from '../src/store/imageStore';
import { DEFAULT_SETTINGS } from '../src/types';

describe('imageStore', () => {
  beforeEach(() => {
    useImageStore.getState().reset();
  });

  test('initial state is correct', () => {
    const state = useImageStore.getState();
    expect(state.originalImage).toBe(null);
    expect(state.compressed).toBe(null);
    expect(state.status.isCompressing).toBe(false);
    expect(state.status.isRemovingBackground).toBe(false);
  });

  test('default settings are correct', () => {
    const { settings } = useImageStore.getState();
    expect(settings.format).toBe('webp');
    expect(settings.quality).toBe(85);
    expect(settings.scale).toBe(100);
    expect(settings.maintainAspectRatio).toBe(true);
    expect(settings.width).toBeUndefined();
    expect(settings.height).toBeUndefined();
  });

  test('updateSettings merges settings', () => {
    useImageStore.getState().updateSettings({ quality: 50 });
    const { settings } = useImageStore.getState();
    expect(settings.quality).toBe(50);
    expect(settings.format).toBe('webp'); // unchanged
  });

  test('resetSettings restores defaults', () => {
    const store = useImageStore.getState();
    store.updateSettings({ quality: 10, format: 'png', width: 100 });
    store.resetSettings();
    expect(useImageStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  test('setError updates status and clears busy flags', () => {
    const store = useImageStore.getState();
    store.setProcessing(true);
    store.setRemovingBackground(true);
    store.setError('Test error');

    const { status } = useImageStore.getState();
    expect(status.error).toBe('Test error');
    expect(status.isCompressing).toBe(false);
    expect(status.isRemovingBackground).toBe(false);
  });

  test('setProcessing updates status and clears previous error', () => {
    const store = useImageStore.getState();
    store.setError('old');
    store.setProcessing(true);
    expect(useImageStore.getState().status.isCompressing).toBe(true);
    expect(useImageStore.getState().status.error).toBeUndefined();

    store.setProcessing(false);
    expect(useImageStore.getState().status.isCompressing).toBe(false);
  });

  test('reset restores initial state', () => {
    const store = useImageStore.getState();
    store.updateSettings({ quality: 10, format: 'png' });
    store.updateEditState({ rotation: 90 });
    store.reset();

    const state = useImageStore.getState();
    expect(state.settings.quality).toBe(85);
    expect(state.settings.format).toBe('webp');
    expect(state.editState.rotation).toBe(0);
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

describe('batchStore', () => {
  beforeEach(() => {
    useBatchStore.getState().clearAll();
    useBatchStore.getState().resetSettings();
  });

  test('changing settings re-queues finished items', () => {
    useBatchStore.setState({
      items: [
        {
          id: 'a',
          file: new File(['x'], 'a.png', { type: 'image/png' }),
          outputFilename: 'a',
          status: 'complete',
          compressedBlob: new Blob(['y']),
        },
      ],
    });
    useBatchStore.getState().updateSettings({ format: 'jpeg' });
    const [item] = useBatchStore.getState().items;
    expect(item.status).toBe('queued');
    expect(item.compressedBlob).toBeUndefined();
  });

  test('settings are independent from the single-image store', () => {
    useImageStore.getState().updateSettings({ width: 123, height: 45 });
    expect(useBatchStore.getState().settings.width).toBeUndefined();
    useImageStore.getState().reset();
  });
});
