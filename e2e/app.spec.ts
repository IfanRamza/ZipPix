import { expect, test } from '@playwright/test';
import { deflateSync } from 'node:zlib';

/** Build a small valid PNG (solid colour) without needing fixture files */
function makePng(width: number, height: number, noisy = false): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  // Noisy pixels compress poorly, which makes quality/size trade-offs observable
  const makeRow = () => {
    const pixels = Buffer.alloc(width * 3, 0x60);
    if (noisy) for (let i = 0; i < pixels.length; i++) pixels[i] = (Math.random() * 256) | 0;
    return Buffer.concat([Buffer.from([0]), pixels]);
  };
  const raw = Buffer.concat(Array.from({ length: height }, makeRow));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test.describe('ZipPix Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the home page with upload zone', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Smaller images.');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nothing uploaded.');
    await expect(page.getByText('Drop your image here')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Image' })).toBeVisible();
  });

  test('should have working navbar', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'ZipPix home' })).toBeVisible();
    await page.getByRole('link', { name: 'Batch' }).click();
    await expect(page).toHaveURL('/batch');
    await expect(page.getByRole('heading', { name: 'Many images. One ZIP.' })).toBeVisible();
  });

  test('should have working footer links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
  });

  test('should navigate to privacy policy', async ({ page }) => {
    await page.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('should navigate to terms of service', async ({ page }) => {
    await page.getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page).toHaveURL('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  });
});

test.describe('Single image flow', () => {
  test('compresses an uploaded image and offers a download', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: makePng(320, 200),
    });

    await expect(page.getByRole('heading', { name: 'sample.png' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Compressed result' })).toBeVisible();
    await expect(page.getByText('WebP · 320×200')).toBeVisible();

    // Halving the size updates the output dimensions
    await page.getByRole('radio', { name: '50%' }).click();
    await expect(page.getByText('WebP · 160×100')).toBeVisible();

    // Switching to JPEG changes the extension
    await page.getByRole('radio', { name: 'JPEG' }).click();
    await expect(page.getByText('JPEG · 160×100')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    expect((await download).suggestedFilename()).toBe('sample_compressed.jpg');
  });

  test('comparison slider is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: makePng(64, 64),
    });
    const slider = page.getByRole('slider', { name: 'Compare original and compressed' });
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  test('comparison can zoom in, pan and return to fit', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: makePng(1600, 1200, true),
    });
    await expect(page.getByRole('img', { name: 'Compressed result' })).toBeVisible();
    const layer = page.getByRole('img', { name: 'Compressed result' }).locator('xpath=..');
    const transform = () => layer.evaluate((el) => (el as HTMLElement).style.transform);

    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
    await expect(page.getByTitle('Fit to view')).toHaveText(/^\d+%$/);
    const zoomedIn = await transform();
    expect(zoomedIn).toContain('scale(1.5)');

    // Dragging away from the divider pans instead of moving it
    const slider = page.getByRole('slider', { name: 'Compare original and compressed' });
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    expect(await transform()).not.toBe(zoomedIn);
    await expect(slider).toHaveAttribute('aria-valuenow', '50');

    // Keyboard zoom, then back to fit
    await slider.focus();
    await page.keyboard.press('+');
    expect(await transform()).toContain('scale(2.25)');
    await page.getByTitle('Fit to view').click();
    expect(await transform()).toBe('');
    await expect(page.getByTitle('Actual size')).toHaveText('Fit');
  });

  test('editor applies a rotation', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: makePng(300, 100),
    });
    await expect(page.getByText('WebP · 300×100')).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Rotate right' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText('Rotated 90°')).toBeVisible();
    await expect(page.getByText('WebP · 100×300')).toBeVisible();
  });

  test('accepts an image pasted from the clipboard', async ({ page }) => {
    await page.goto('/');
    // The page is lazy-loaded: its paste listener exists once the dropzone renders
    await expect(page.getByText('Drop your image here')).toBeVisible();
    const png = makePng(120, 80).toString('base64');
    await page.evaluate((b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], 'image.png', { type: 'image/png' }));
      document.body.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    }, png);
    await expect(page.getByRole('heading', { name: /^pasted-.*\.png$/ })).toBeVisible();
    await expect(page.getByText('WebP · 120×80')).toBeVisible();
  });

  test('sends several picked images to batch mode', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2].map((i) => ({
        name: `multi${i}.png`,
        mimeType: 'image/png',
        buffer: makePng(64, 64),
      })),
    );
    await expect(page).toHaveURL('/batch');
    await expect(page.getByText('Queue · 2')).toBeVisible();
  });

  test('target size mode keeps the file under the limit', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'noisy.png',
      mimeType: 'image/png',
      buffer: makePng(400, 300, true),
    });
    await expect(page.getByText('WebP · 400×300')).toBeVisible();

    await page.getByRole('radio', { name: 'Target size' }).click();
    await page.getByLabel('Maximum file size in kilobytes').fill('40');
    // Wait for the 40 KB result, not the one left over from the default 200 KB target
    await expect(page.getByText(/^Quality [1-8]?\d is the highest that fits\.$/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const file = await (await download).path();
    const { size } = await import('node:fs').then((fs) => fs.promises.stat(file));
    expect(size).toBeLessThanOrEqual(40 * 1024);
  });

  test('reducing PNG colours shrinks the file', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'noisy.png',
      mimeType: 'image/png',
      buffer: makePng(200, 150, true),
    });
    await page.getByRole('radio', { name: 'PNG' }).click();
    await expect(page.getByText('PNG · 200×150').nth(1)).toBeVisible();
    const sizeText = page
      .getByText('Compressed', { exact: true })
      .locator('xpath=..')
      .locator('p')
      .nth(1);
    const lossless = await sizeText.textContent();

    await page.getByRole('switch', { name: 'Reduce colours' }).click();
    await expect(page.getByRole('slider', { name: 'Colours' })).toBeVisible();
    await expect(sizeText).not.toHaveText(lossless!);
    await expect(page.getByText(/Photos may show banding/)).toBeVisible();
    // Random noise has ~30k colours; 256 of them fit in a third of the bytes
    const toBytes = (t: string) => {
      const [n, unit] = t.split(' ');
      return Number(n) * ({ Bytes: 1, KB: 1024, MB: 1024 ** 2 }[unit] ?? 1);
    };
    expect(toBytes((await sizeText.textContent())!)).toBeLessThan(toBytes(lossless!) / 2);
  });

  test('keeps the original when re-encoding would not make it smaller', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: makePng(320, 200),
    });
    await page.getByRole('radio', { name: 'PNG' }).click();
    await expect(page.getByText('PNG · 320×200').nth(1)).toBeVisible();

    // An OxiPNG result is already optimal: feeding it back in can't shrink it further
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    // Downloads are saved under a random name, so hand it back as a proper .png
    const optimised = await import('node:fs').then(async (fs) =>
      fs.promises.readFile(await (await download).path()),
    );

    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'New Image' }).click();
    await (
      await chooser
    ).setFiles({
      name: 'optimised.png',
      mimeType: 'image/png',
      buffer: optimised,
    });
    await expect(page.getByRole('heading', { name: 'optimised.png' })).toBeVisible();
    await expect(page.getByText(/your original file is kept/)).toBeVisible();
  });
});

test.describe('Batch flow', () => {
  test('processes several images and downloads a ZIP', async ({ page }) => {
    await page.goto('/batch');
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2, 3].map((i) => ({
        name: `img${i}.png`,
        mimeType: 'image/png',
        buffer: makePng(100 * i, 80),
      })),
    );
    await expect(page.getByText('Queue · 3')).toBeVisible();
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.getByRole('button', { name: 'Download ZIP' })).toBeEnabled();
    await expect(page.getByText('3/3')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download ZIP' }).click();
    expect((await download).suggestedFilename()).toMatch(/^zippix_.*\.zip$/);
  });
});

test.describe('Batch target size', () => {
  test('reports the quality each image needed to fit', async ({ page }) => {
    await page.goto('/batch');
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2].map((i) => ({
        name: `noisy${i}.png`,
        mimeType: 'image/png',
        buffer: makePng(300, 200, true),
      })),
    );
    await page.getByRole('radio', { name: 'Target size' }).click();
    await page.getByLabel('Maximum file size in kilobytes').fill('30');
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.getByText('2/2')).toBeVisible();
    await expect(page.getByText(/· Q\d+$/)).toHaveCount(2);
  });

  test('warns when an image cannot reach the target', async ({ page }) => {
    await page.goto('/batch');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: makePng(800, 600, true),
    });
    await page.getByRole('radio', { name: 'Target size' }).click();
    await page.getByLabel('Maximum file size in kilobytes').fill('1');
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.getByText('over target')).toBeVisible();
    await expect(page.getByText(/1 image is still over the target size/)).toBeVisible();
  });
});

test.describe('Remembered settings', () => {
  test('keeps the chosen format and quality after a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: makePng(120, 80),
    });
    await expect(page.getByText('WebP · 120×80')).toBeVisible();
    await page.getByRole('radio', { name: 'JPEG' }).click();
    await expect(page.getByText('JPEG · 120×80')).toBeVisible();

    await page.reload();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: makePng(120, 80),
    });
    await expect(page.getByText('JPEG · 120×80')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'JPEG' })).toBeChecked();
  });
});
