import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

export function TermsOfService() {
  return (
    <div className='flex min-h-screen flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]'>
      <Navbar />

      <main className='container mx-auto max-w-3xl flex-1 px-4 py-12'>
        <h1 className='mb-8 bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent'>
          Terms of Service
        </h1>

        <div className='prose prose-invert prose-cyan text-muted-foreground max-w-none space-y-6'>
          <p className='text-lg'>
            <strong>Last updated:</strong> January 2025
          </p>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>1. Acceptance of Terms</h2>
            <p>
              By accessing and using ZipPix, you accept and agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>2. Description of Service</h2>
            <p>ZipPix is a free, client-side image compression tool. The service allows you to:</p>
            <ul className='list-disc space-y-2 pl-6'>
              <li>Compress images in various formats (JPEG, PNG, WebP, AVIF)</li>
              <li>Convert between image formats</li>
              <li>Resize images</li>
              <li>Remove metadata from images</li>
            </ul>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className='list-disc space-y-2 pl-6'>
              <li>Use ZipPix only for lawful purposes</li>
              <li>Not use the service to process illegal content</li>
              <li>Respect intellectual property rights of image content</li>
              <li>Not attempt to reverse engineer or exploit the service</li>
            </ul>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>4. Intellectual Property</h2>
            <p>
              You retain all rights to your images. ZipPix does not claim any ownership or rights to
              images you process using our service. The ZipPix software, branding, and design are
              owned by the project maintainers.
            </p>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>5. Disclaimer of Warranties</h2>
            <p>
              ZipPix is provided "as is" without warranties of any kind, express or implied. We do
              not guarantee:
            </p>
            <ul className='list-disc space-y-2 pl-6'>
              <li>The service will be uninterrupted or error-free</li>
              <li>Results will meet your specific requirements</li>
              <li>Compressed images will be suitable for all purposes</li>
            </ul>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>6. Limitation of Liability</h2>
            <p>
              ZipPix and its maintainers shall not be liable for any direct, indirect, incidental,
              special, or consequential damages resulting from the use or inability to use the
              service.
            </p>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be posted on this
              page with an updated revision date.
            </p>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>8. Open Source</h2>
            <p>
              ZipPix is open source software. The source code is available on{' '}
              <a
                href='https://github.com/IfanRamza/ZipPix'
                className='text-cyan-400 hover:underline'
              >
                GitHub
              </a>{' '}
              and is subject to its respective license.
            </p>
          </section>

          <section className='space-y-4'>
            <h2 className='text-foreground text-2xl font-semibold'>9. Contact</h2>
            <p>
              For questions about these terms, please open an issue on our{' '}
              <a
                href='https://github.com/IfanRamza/ZipPix'
                className='text-cyan-400 hover:underline'
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TermsOfService;
