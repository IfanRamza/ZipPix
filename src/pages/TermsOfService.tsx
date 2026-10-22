import { PageShell } from '@/components/PageShell';

export function TermsOfService() {
  return (
    <PageShell className='max-w-3xl py-14 sm:py-20'>
      <h1 className='mb-10 text-[40px] leading-tight font-semibold tracking-tight sm:text-[48px]'>
        Terms of Service
      </h1>

      <div className='text-muted-foreground [&_a]:text-link [&_strong]:text-foreground space-y-8 text-[17px] leading-relaxed [&_strong]:font-semibold'>
        <p className='text-[15px]'>
          <strong>Last updated:</strong> January 2025
        </p>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using ZipPix, you accept and agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            2. Description of Service
          </h2>
          <p>ZipPix is a free, client-side image compression tool. The service allows you to:</p>
          <ul className='list-disc space-y-2 pl-6'>
            <li>Compress images in various formats (JPEG, PNG, WebP, AVIF)</li>
            <li>Convert between image formats</li>
            <li>Resize images</li>
            <li>Remove metadata from images</li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            3. User Responsibilities
          </h2>
          <p>You agree to:</p>
          <ul className='list-disc space-y-2 pl-6'>
            <li>Use ZipPix only for lawful purposes</li>
            <li>Not use the service to process illegal content</li>
            <li>Respect intellectual property rights of image content</li>
            <li>Not attempt to reverse engineer or exploit the service</li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            4. Intellectual Property
          </h2>
          <p>
            You retain all rights to your images. ZipPix does not claim any ownership or rights to
            images you process using our service. The ZipPix software, branding, and design are
            owned by the project maintainers.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            5. Disclaimer of Warranties
          </h2>
          <p>
            ZipPix is provided "as is" without warranties of any kind, express or implied. We do not
            guarantee:
          </p>
          <ul className='list-disc space-y-2 pl-6'>
            <li>The service will be uninterrupted or error-free</li>
            <li>Results will meet your specific requirements</li>
            <li>Compressed images will be suitable for all purposes</li>
          </ul>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            6. Limitation of Liability
          </h2>
          <p>
            ZipPix and its maintainers shall not be liable for any direct, indirect, incidental,
            special, or consequential damages resulting from the use or inability to use the
            service.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            7. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be posted on this
            page with an updated revision date.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>
            8. Open Source
          </h2>
          <p>
            ZipPix is open source software. The source code is available on{' '}
            <a href='https://github.com/IfanRamza/ZipPix' className='underline underline-offset-2'>
              GitHub
            </a>{' '}
            and is subject to its respective license.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-[24px] font-semibold tracking-tight'>9. Contact</h2>
          <p>
            For questions about these terms, please open an issue on our{' '}
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

export default TermsOfService;
