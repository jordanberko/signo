import Link from 'next/link';

export default function ReturnsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Buyer Protection</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Returns Policy
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            We want every purchase on Signo to be a great experience. If something goes wrong, here&apos;s exactly how we handle it.
          </p>
        </div>
      </section>

      {/* Escrow Explanation */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 bg-accent/5 rounded-2xl border border-accent/20">
            <h2 className="font-editorial text-xl font-medium mb-4">How escrow protects you</h2>
            <p className="text-sm text-muted leading-relaxed">
              When you purchase artwork on Signo, your payment is held securely by Stripe — our payment processor.
              The artist receives the funds when you confirm delivery, or automatically once the 48-hour inspection window closes without a dispute.
              If anything goes wrong, your money is safe.
            </p>
          </div>
        </div>
      </section>

      {/* Scenario 1: Damaged in Transit */}
      <section className="py-16 md:py-20 bg-cream border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-mono font-semibold text-accent-dark">1</span>
            </div>
            <h2 className="font-editorial text-2xl font-medium">Damaged in Transit</h2>
          </div>
          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <p className="font-medium text-primary text-base">
              Full refund. No return required.
            </p>
            <p>
              If your artwork arrives damaged, we&apos;ll issue a full refund. You don&apos;t need to send it back — we know
              that&apos;s impractical with a damaged piece.
            </p>
            <div className="p-5 bg-white rounded-xl border border-border">
              <h3 className="font-medium text-primary mb-2">What to do:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Take clear photos of the damage (the artwork and the packaging)</li>
                <li>Go to your order page and raise a dispute within 48 hours of delivery</li>
                <li>Upload the photos as evidence</li>
                <li>We&apos;ll review and process your refund within 1-2 business days</li>
              </ol>
            </div>
            <p>
              The artist can claim shipping insurance for damage in transit — this doesn&apos;t affect your refund.
            </p>
          </div>
        </div>
      </section>

      {/* Scenario 2: Not as Described */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-mono font-semibold text-accent-dark">2</span>
            </div>
            <h2 className="font-editorial text-2xl font-medium">Not as Described</h2>
          </div>
          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <p className="font-medium text-primary text-base">
              Return required. Full refund on receipt.
            </p>
            <p>
              If the artwork differs materially from the listing — wrong size, different colours, different medium,
              or significantly different from the photos — you can return it for a full refund.
            </p>
            <div className="p-5 bg-muted-bg rounded-xl border border-border">
              <h3 className="font-medium text-primary mb-2">What to do:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Raise a dispute through your order page within 48 hours of delivery</li>
                <li>Describe the discrepancy and include photos comparing the listing vs. what you received</li>
                <li>If we agree the item is not as described, we&apos;ll approve the return</li>
                <li>Ship the artwork back to the artist at your cost (we&apos;ll provide the address)</li>
                <li>Once the artist confirms receipt, your refund is processed within 1-2 business days</li>
              </ol>
            </div>
            <p>
              We review each case individually. Minor differences due to monitor calibration or the inherent nature
              of handmade art (slight texture variations, etc.) are generally not grounds for a return.
            </p>
          </div>
        </div>
      </section>

      {/* Scenario 3: Changed Mind */}
      <section className="py-16 md:py-20 bg-cream border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-mono font-semibold text-accent-dark">3</span>
            </div>
            <h2 className="font-editorial text-2xl font-medium">Changed Your Mind</h2>
          </div>
          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-medium text-primary mb-2">Before shipping</h3>
                <p>
                  If the artist hasn&apos;t shipped yet, you can cancel within 24 hours of purchase for a full refund.
                  Contact us or raise a cancellation through your order page.
                </p>
              </div>
              <div className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-medium text-primary mb-2">After shipping</h3>
                <p>
                  Once the artwork has been shipped, the sale is final. We can&apos;t offer refunds for change of mind
                  on shipped items — the artist has already packed and posted the work.
                </p>
              </div>
            </div>
            <p>
              We encourage you to carefully review the listing photos, dimensions, and description before purchasing.
              If you have questions about a piece, message the artist directly before buying.
            </p>
          </div>
        </div>
      </section>

      {/* Digital Downloads */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-muted-bg rounded-full flex items-center justify-center border border-border">
              <span className="text-sm font-mono text-warm-gray">~</span>
            </div>
            <h2 className="font-editorial text-2xl font-medium">Digital Downloads</h2>
          </div>
          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <p>
              All sales of digital artworks are final. Due to the nature of digital files, we cannot offer refunds
              once the download link has been accessed.
            </p>
            <p>
              The exception is corrupted or inaccessible files — if you receive a file that won&apos;t open or is
              incomplete, contact us and we&apos;ll either provide a working file or issue a refund.
            </p>
          </div>
        </div>
      </section>

      {/* How to Raise a Dispute */}
      <section className="py-16 md:py-20 bg-cream border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-editorial text-2xl font-medium mb-6">How to Raise a Dispute</h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-xs font-mono text-accent-dark">1</span>
              </div>
              <p className="text-sm text-muted leading-relaxed pt-1.5">
                Go to your <strong>order page</strong> (My Orders → select the order)
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-xs font-mono text-accent-dark">2</span>
              </div>
              <p className="text-sm text-muted leading-relaxed pt-1.5">
                Click <strong>&quot;Raise a Dispute&quot;</strong> — this must be done within <strong>48 hours of delivery</strong>
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-xs font-mono text-accent-dark">3</span>
              </div>
              <p className="text-sm text-muted leading-relaxed pt-1.5">
                Select the reason, describe the issue, and upload supporting photos
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-xs font-mono text-accent-dark">4</span>
              </div>
              <p className="text-sm text-muted leading-relaxed pt-1.5">
                Our team reviews the dispute and responds within <strong>1-2 business days</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Refund Timeline */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-editorial text-2xl font-medium mb-6">Refund Timeline</h2>
          <div className="space-y-3 text-sm text-muted leading-relaxed">
            <div className="flex justify-between items-center p-4 bg-muted-bg rounded-xl border border-border">
              <span>Dispute review</span>
              <span className="font-medium text-primary">1-2 business days</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted-bg rounded-xl border border-border">
              <span>Refund processing (after approval)</span>
              <span className="font-medium text-primary">1-2 business days</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted-bg rounded-xl border border-border">
              <span>Funds back to your card/bank</span>
              <span className="font-medium text-primary">3-5 business days</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-accent/5 rounded-xl border border-accent/20">
              <span className="font-medium text-primary">Total estimated time</span>
              <span className="font-semibold text-accent-dark">5-9 business days</span>
            </div>
          </div>
          <p className="text-xs text-warm-gray mt-4">
            Refund timing depends on your bank or card issuer. Signo processes refunds promptly, but your financial
            institution may take additional time to credit your account.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-20 bg-cream border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-editorial text-2xl font-medium mb-4">Still have questions?</h2>
          <p className="text-muted mb-6">
            Our support team is here to help with any order issues.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-300"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}
