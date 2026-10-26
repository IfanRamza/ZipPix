import { PageShell } from '@/components/PageShell';

export function PrivacyPolicy() {
  return (
    <PageShell className='max-w-3xl py-14 sm:py-20'>
      <h1 className='mb-10 text-[40px] leading-tight font-semibold tracking-tight sm:text-[48px]'>
        Privacy Policy
      </h1>

      <div className='text-muted-foreground [&_a]:text-link [&_strong]:text-foreground space-y-8 text-[17px] leading-relaxed [&_strong]:font-semibold'>
        <p className='text-[15px]'>
          <strong>Last updated:</strong> October 2026
        </p>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            Our Commitment to Privacy
          </h2>
          <p>
            ZipPix is built with privacy as a core principle. We believe your images are your
            business, not ours. That's why ZipPix processes all images entirely on your device.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            Data We Don't Collect
          </h2>
          <ul className='list-disc space-y-2 pl-6'>
            <li>
              <strong>Your Images:</strong> Images are never uploaded to any server. All processing
              happens locally in your browser.
            </li>
            <li>
              <strong>Image Metadata:</strong> EXIF data (camera, GPS location, dates) is read and
              removed locally. It is never transmitted.
            </li>
            <li>
              <strong>Personal Information:</strong> We don't require accounts, emails, or any
              personal data to use ZipPix.
            </li>
            <li>
              <strong>Image Activity:</strong> We don't track which images you compress or which
              settings you use.
            </li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            How ZipPix Works
          </h2>
          <p>
            ZipPix uses your browser's built-in capabilities (Canvas API and Web Workers) to
            compress images. This means:
          </p>
          <ul className='list-disc space-y-2 pl-6'>
            <li>Images stay on your device at all times</li>
            <li>Compression happens in your browser's memory</li>
            <li>Your images are never sent to external servers</li>
            <li>Compression works offline once loaded</li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            Cookies & Storage
          </h2>
          <p>
            ZipPix may use browser local storage to save your preferences (like compression
            settings). This data never leaves your device and can be cleared by clearing your
            browser data.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            Third-Party Services
          </h2>
          <p>ZipPix has no advertising or cross-site tracking. It does rely on two services:</p>
          <ul className='list-disc space-y-2 pl-6'>
            <li>
              <strong>Cloudflare Web Analytics:</strong> counts page views and measures load
              performance. It is cookieless, does not fingerprint visitors, and never sees your
              images. See{' '}
              <a
                href='https://www.cloudflare.com/privacypolicy/'
                className='underline underline-offset-2'
              >
                Cloudflare's privacy policy
              </a>
              .
            </li>
            <li>
              <strong>IMG.LY CDN (staticimgly.com):</strong> when you first use Remove Background,
              your browser downloads the AI model (~40 MB) from this CDN. Only the model is
              downloaded; your image is processed on your device and is never uploaded. The CDN can
              see your IP address as part of a normal file download.
            </li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>Contact</h2>
          <p>
            If you have questions about this privacy policy, please open an issue on our{' '}
            <a href='https://github.com/IfanRamza/ZipPix' className='underline underline-offset-2'>
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}

export default PrivacyPolicy;
