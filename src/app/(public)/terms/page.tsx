import Link from 'next/link';

export default function TermsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Legal</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Terms of Service
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            The rules of the road for using Signo.
          </p>
          <p className="mt-3 text-sm text-warm-gray">Last updated: March 2026</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Intro */}
          <div className="p-6 bg-accent/5 rounded-xl border border-accent/20">
            <p className="text-sm text-muted leading-relaxed">
              By using Signo, you agree to these terms. We&apos;ve kept them as readable as possible — but they&apos;re
              still a binding agreement between you and Signo Pty Ltd (ABN pending). If anything is unclear,{' '}
              <Link href="/contact" className="text-accent-dark hover:underline">get in touch</Link>.
            </p>
          </div>

          {/* Platform Usage */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">1. Using Signo</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                Signo is an online marketplace that connects Australian artists with art buyers.
                We provide the platform — artists and buyers transact directly, with Signo facilitating
                payments, escrow, and dispute resolution.
              </p>
              <p>
                To use Signo, you must be at least 18 years old and provide accurate information when
                creating your account. You&apos;re responsible for keeping your login credentials secure
                and for all activity under your account.
              </p>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms, engage
                in fraudulent activity, or harm the Signo community.
              </p>
            </div>
          </div>

          {/* Artist Obligations */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">2. Artist Obligations</h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              If you sell artwork on Signo, you agree to the following:
            </p>
            <div className="space-y-3">
              {[
                {
                  title: 'Original work only',
                  detail: 'All artwork must be your own original creation, or clearly labelled as a licensed reproduction or print. Uploading work that infringes on someone else\'s copyright will result in immediate removal and potential account suspension.',
                },
                {
                  title: 'Accurate listings',
                  detail: 'Titles, descriptions, dimensions, medium, and photos must accurately represent the artwork. Misleading listings harm buyers and damage trust in the marketplace.',
                },
                {
                  title: 'Ship within 7 days',
                  detail: 'Once an order is placed, you must ship the artwork with tracked postage within 7 days. Orders not shipped within this window are automatically cancelled and the buyer is refunded.',
                },
                {
                  title: 'Professional packaging',
                  detail: 'Package artwork appropriately to prevent damage in transit. Use corner protectors, bubble wrap, and rigid mailers as needed. See our Seller Guide for best practices.',
                },
                {
                  title: 'Respond to disputes',
                  detail: 'If a buyer raises a dispute, respond promptly and in good faith. Work with our team to resolve issues fairly.',
                },
              ].map((item) => (
                <div key={item.title} className="p-5 bg-muted-bg rounded-xl border border-border">
                  <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Buyer Obligations */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">3. Buyer Obligations</h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              If you purchase artwork on Signo, you agree to the following:
            </p>
            <div className="space-y-3">
              {[
                {
                  title: 'Honest disputes',
                  detail: 'Only raise disputes for genuine issues (damage, not as described). Fraudulent disputes — such as claiming damage that didn\'t occur — will result in account suspension.',
                },
                {
                  title: 'Inspection window',
                  detail: 'You have 48 hours after delivery to inspect the artwork and raise any issues. After this window closes, funds are released to the artist and the sale is considered final.',
                },
                {
                  title: 'Accurate shipping details',
                  detail: 'Provide a correct and complete shipping address. Signo and the artist are not responsible for delivery issues caused by incorrect address information.',
                },
                {
                  title: 'Respectful communication',
                  detail: 'Communicate respectfully with artists. Harassment, abusive messages, or threats are not tolerated.',
                },
              ].map((item) => (
                <div key={item.title} className="p-5 bg-muted-bg rounded-xl border border-border">
                  <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Subscriptions */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">4. Subscription Terms</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                Selling on Signo requires an active artist subscription at <strong>$30 AUD per month</strong>.
                The subscription is billed monthly through Stripe and can be cancelled at any time.
              </p>
              <div className="p-5 bg-muted-bg rounded-xl border border-border space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <p><strong>Cancellation:</strong> You can cancel your subscription at any time from your account settings. Your listings will remain active until the end of your current billing period, then be paused (not deleted).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <p><strong>Reactivation:</strong> Resubscribing at any time will make your paused listings live again immediately.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <p><strong>Outstanding orders:</strong> Even after cancellation, you must fulfil any outstanding orders. Cancelling your subscription doesn&apos;t cancel orders that buyers have already paid for.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <p><strong>Price changes:</strong> We may adjust subscription pricing with 30 days&apos; notice. Existing subscribers will be notified by email before any price change takes effect.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">5. Intellectual Property</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                <strong>Artists retain full copyright</strong> to all artwork uploaded to Signo. Listing your work
                on our platform does not transfer ownership of your intellectual property.
              </p>
              <p>
                By listing artwork on Signo, you grant us a non-exclusive, worldwide licence to display, reproduce,
                and distribute images of your artwork for the purposes of operating the marketplace. This includes
                showing your work on the website, in search results, in promotional materials, and on social media.
              </p>
              <p>
                This licence ends when you remove the listing or close your account.
              </p>
              <p>
                When a buyer purchases artwork, they acquire the physical piece (or digital file). Copyright remains
                with the artist unless explicitly transferred in writing.
              </p>
            </div>
          </div>

          {/* Dispute Resolution */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">6. Dispute Resolution</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                We aim to resolve all disputes fairly and efficiently. Our process:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Buyer raises a dispute through their order page within 48 hours of delivery</li>
                <li>Both parties provide their account of the issue, with supporting evidence</li>
                <li>Signo reviews the dispute and makes a decision within 1-2 business days</li>
                <li>If a refund is warranted, it is processed from the escrowed funds</li>
              </ol>
              <p>
                Our dispute decisions are made in good faith based on the evidence provided.
                If you disagree with a decision, you can request a review by contacting{' '}
                <a href="mailto:disputes@signo.com.au" className="text-accent-dark hover:underline">disputes@signo.com.au</a>.
              </p>
              <p>
                For disputes we cannot resolve internally, Australian Consumer Law and the relevant
                state or territory consumer affairs body may provide additional remedies.
              </p>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">7. Limitation of Liability</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                Signo provides a marketplace platform. We are not a party to the transaction between
                artists and buyers. While we facilitate payments through escrow and provide buyer protection,
                we do not guarantee the quality, safety, or legality of listed artwork.
              </p>
              <p>
                To the maximum extent permitted by Australian law:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Signo is not liable for artwork damaged in transit (though our buyer protection covers refunds)</li>
                <li>We are not responsible for disputes between artists and buyers beyond our facilitation role</li>
                <li>Our total liability for any claim is limited to the fees you&apos;ve paid to Signo in the 12 months preceding the claim</li>
                <li>We are not liable for indirect, incidental, or consequential damages</li>
              </ul>
              <p>
                Nothing in these terms excludes or limits liability that cannot be excluded under Australian Consumer Law.
              </p>
            </div>
          </div>

          {/* Changes */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">8. Changes to These Terms</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                We may update these terms from time to time. For significant changes, we&apos;ll notify you
                by email at least 14 days before they take effect. Continued use of Signo after changes
                take effect constitutes acceptance of the updated terms.
              </p>
            </div>
          </div>

          {/* Governing Law */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">9. Governing Law</h2>
            <div className="space-y-4 text-sm text-muted leading-relaxed">
              <p>
                These terms are governed by the laws of the State of Victoria, Australia.
                Any disputes arising from these terms will be subject to the exclusive jurisdiction
                of the courts of Victoria.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="p-8 bg-muted-bg rounded-2xl border border-border">
            <h2 className="font-editorial text-xl font-medium mb-4">Questions about these terms?</h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              If anything in these terms is unclear or you have concerns, we&apos;re happy to explain.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-300 text-sm"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
