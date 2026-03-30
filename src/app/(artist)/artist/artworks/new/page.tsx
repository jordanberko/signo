'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Plus, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

const MEDIUMS = ['Oil on Canvas', 'Acrylic on Canvas', 'Acrylic on Board', 'Watercolour', 'Mixed Media', 'Photography', 'Digital Illustration', 'Digital Art', 'Sculpture', 'Print', 'Other'];
const STYLES = ['Abstract', 'Realism', 'Impressionism', 'Contemporary', 'Landscape', 'Portrait', 'Still Life', 'Minimalism', 'Pop Art', 'Street Art', 'Other'];

export default function NewArtworkPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'original' as 'original' | 'print' | 'digital',
    medium: '',
    style: '',
    width_cm: '',
    height_cm: '',
    depth_cm: '',
    price_aud: '',
    is_framed: false,
    shipping_weight_kg: '',
    tags: '',
  });

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 8) {
      alert('Maximum 8 images allowed');
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const supabase = createClient();

      // Upload images to Supabase Storage
      const imageUrls: string[] = [];
      for (const image of images) {
        const ext = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('artwork-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('artwork-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Create artwork record
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const { error: insertError } = await supabase.from('artworks').insert({
        artist_id: user.id,
        title: form.title,
        description: form.description,
        category: form.category,
        medium: form.medium,
        style: form.style,
        width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        depth_cm: form.depth_cm ? parseFloat(form.depth_cm) : null,
        price_aud: parseFloat(form.price_aud),
        is_framed: form.is_framed,
        shipping_weight_kg: form.shipping_weight_kg ? parseFloat(form.shipping_weight_kg) : null,
        images: imageUrls,
        tags,
        status: 'pending_review',
      });

      if (insertError) throw insertError;

      router.push('/artist/artworks');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Artwork</h1>
        <p className="text-muted mt-1">Add your artwork to Signo. It will be reviewed within 24-48 hours.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Image Upload */}
        <section className="space-y-3">
          <label className="block font-semibold">
            Photos <span className="text-error">*</span>
          </label>
          <p className="text-xs text-muted">Upload up to 8 high-quality images. The first image will be your listing cover.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted-bg border border-border">
                <img src={preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded-full hover:bg-white"
                >
                  <X className="h-3 w-3" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-white text-xs rounded">Cover</span>
                )}
              </div>
            ))}
            {images.length < 8 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                <Plus className="h-6 w-6 text-muted" />
                <span className="text-xs text-muted">Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
              </label>
            )}
          </div>
        </section>

        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Basic Information</h2>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Title <span className="text-error">*</span></label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Golden Hour Over Sydney"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description <span className="text-error">*</span></label>
            <textarea
              id="description"
              required
              rows={5}
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="Describe your artwork — inspiration, technique, materials used..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category <span className="text-error">*</span></label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'original', label: 'Original', desc: 'One-of-a-kind physical artwork' },
                { value: 'print', label: 'Print', desc: 'Reproduction or limited edition' },
                { value: 'digital', label: 'Digital', desc: 'Digital download file' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => updateForm('category', cat.value)}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    form.category === cat.value
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{cat.label}</p>
                  <p className="text-xs text-muted mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="medium" className="block text-sm font-medium mb-1">Medium <span className="text-error">*</span></label>
              <select
                id="medium"
                required
                value={form.medium}
                onChange={(e) => updateForm('medium', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white"
              >
                <option value="">Select medium</option>
                {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="style" className="block text-sm font-medium mb-1">Style <span className="text-error">*</span></label>
              <select
                id="style"
                required
                value={form.style}
                onChange={(e) => updateForm('style', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white"
              >
                <option value="">Select style</option>
                {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Dimensions & Pricing */}
        <section className="space-y-4">
          <h2 className="font-semibold text-lg border-b border-border pb-2">Dimensions & Pricing</h2>

          {form.category !== 'digital' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="width" className="block text-sm font-medium mb-1">Width (cm)</label>
                  <input
                    id="width"
                    type="number"
                    step="0.1"
                    value={form.width_cm}
                    onChange={(e) => updateForm('width_cm', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input
                    id="height"
                    type="number"
                    step="0.1"
                    value={form.height_cm}
                    onChange={(e) => updateForm('height_cm', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="depth" className="block text-sm font-medium mb-1">Depth (cm)</label>
                  <input
                    id="depth"
                    type="number"
                    step="0.1"
                    value={form.depth_cm}
                    onChange={(e) => updateForm('depth_cm', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    id="framed"
                    type="checkbox"
                    checked={form.is_framed}
                    onChange={(e) => updateForm('is_framed', e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="framed" className="text-sm font-medium">Framed</label>
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium mb-1">Shipping Weight (kg)</label>
                  <input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={form.shipping_weight_kg}
                    onChange={(e) => updateForm('shipping_weight_kg', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="price" className="block text-sm font-medium mb-1">Price (AUD) <span className="text-error">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                id="price"
                type="number"
                step="0.01"
                min="1"
                required
                value={form.price_aud}
                onChange={(e) => updateForm('price_aud', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </div>
            {form.price_aud && (
              <p className="text-xs text-muted mt-1">
                You&apos;ll receive <span className="font-medium text-accent">${(parseFloat(form.price_aud) * 0.835).toFixed(2)}</span> after
                Signo&apos;s 16.5% commission
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags</label>
            <input
              id="tags"
              type="text"
              value={form.tags}
              onChange={(e) => updateForm('tags', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. landscape, sydney, coastal (comma separated)"
            />
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Submit for Review
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
