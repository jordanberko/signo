import { ShieldCheck, Lock, Palette, Globe } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    label: 'Artists Keep 100%',
    subtitle: 'Zero commission, always',
  },
  {
    icon: Lock,
    label: 'Secure Checkout',
    subtitle: 'Powered by Stripe',
  },
  {
    icon: Palette,
    label: 'Curated & Authentic',
    subtitle: 'Every piece is verified',
  },
  {
    icon: Globe,
    label: 'Australian Art',
    subtitle: 'Supporting local artists',
  },
];

export default function TrustBar() {
  return (
    <div className="bg-sand border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-olive-light flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-accent" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                  {item.label}
                </p>
                <p className="text-[11.5px] text-muted leading-tight truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
