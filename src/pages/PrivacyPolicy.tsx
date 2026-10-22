import { PageShell } from '@/components/PageShell';

export function PrivacyPolicy() {
  return (
    <PageShell className='max-w-3xl py-14 sm:py-20'>
      <h1 className='mb-10 text-[40px] leading-tight font-semibold tracking-tight sm:text-[48px]'>
        Privacy Policy
      </h1>

      <div className='text-muted-foreground [&_a]:text-link [&_strong]:text-foreground space-y-8 text-[17px] leading-relaxed [&_strong]:font-semibold'>
        <p className='text-[15px]'>
          <strong>Last updated:</strong> January 2025
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
              <strong>Image Metadata:</strong> When you use ZipPix to strip metadata, that data is
              removed locally and never transmitted.
            </li>
            <li>
              <strong>Personal Information:</strong> We don't require accounts, emails, or any
              personal data to use ZipPix.
            </li>
            <li>
              <strong>Usage Analytics:</strong> We don't track which images you compress or how you
              use the app.
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
            <li>No data is sent to external servers</li>
            <li>Works offline once loaded</li>
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
          <p>
            ZipPix is a standalone application and does not integrate with third-party analytics,
            advertising, or tracking services.
          </p>
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
