import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Loader2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { CATEGORIES, SIZES, CONDITIONS } from '../../data/enums';
import { friendlyError } from '../../lib/supabase';
import { Screen } from '../../components/AppShell';
import { Button, Field, Chips, toast } from '../../components/ui';
import { parseAmount } from '../../lib/format';

const BLANK = {
  name: '', category: CATEGORIES[0], size: 'M', condition: 'Seminovo',
  price: '', description: '', image: '',
};
const MAX_MB = 3;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, uploadPhoto } = useApp();
  const existing = products.find((p) => p.id === id);
  const fileInput = useRef(null);

  const [f, setF] = useState(existing || BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const setInput = (k) => (e) => set(k)(e.target.value);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!file) return;
    // Validação no cliente é conveniência; o bucket também limita tipo e tamanho.
    if (!OK_TYPES.includes(file.type)) {
      return setErrors((x) => ({ ...x, image: 'Use uma imagem JPG, PNG, WebP ou AVIF.' }));
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return setErrors((x) => ({ ...x, image: `A imagem precisa ter até ${MAX_MB} MB.` }));
    }
    setErrors((x) => ({ ...x, image: undefined }));
    setUploading(true);
    const { url, error } = await uploadPhoto(file);
    setUploading(false);
    if (error) return setErrors((x) => ({ ...x, image: friendlyError(error) }));
    set('image')(url);
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = 'Informe o nome da peça.';
    const price = parseAmount(f.price);
    if (!(price > 0)) err.price = 'Informe um preço maior que zero.';
    if (!f.image) err.image = 'Adicione uma foto da peça.';
    setErrors(err);
    if (Object.keys(err).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    const data = { ...f, price };
    const saveErr = existing ? await updateProduct(existing.id, data) : await addProduct(data);
    setSaving(false);
    if (saveErr) return toast(friendlyError(saveErr));
    toast(existing ? 'Peça atualizada.' : 'Peça cadastrada no bazar.');
    navigate('/admin/produtos', { replace: true });
  };

  return (
    <Screen title={existing ? 'Editar peça' : 'Nova peça'} back noNav>
      <form className="card" onSubmit={submit} noValidate>
        <div className="field" data-invalid={!!errors.image}>
          <p className="t-label">Foto *</p>
          <input
            ref={fileInput}
            type="file"
            accept={OK_TYPES.join(',')}
            capture="environment"
            onChange={pickFile}
            className="sr-only"
            aria-invalid={!!errors.image || undefined}
            aria-label="Foto da peça"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label={f.image ? 'Trocar foto' : 'Adicionar foto'}
            style={{ display: 'block', margin: '0 auto var(--sp-2)' }}
          >
            {uploading ? (
              <span className="orb" style={{ width: 140, height: 140, borderRadius: 'var(--r-lg)', margin: 0 }}>
                <Loader2 size={34} aria-hidden="true" className="spin" />
              </span>
            ) : f.image ? (
              <img
                src={f.image} alt="Pré-visualização da peça" width="140" height="140"
                style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 'var(--r-lg)' }}
              />
            ) : (
              <span
                className="orb"
                style={{
                  width: 140, height: 140, borderRadius: 'var(--r-lg)', margin: 0,
                  border: '1.5px dashed var(--primary)', display: 'flex',
                  flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Camera size={34} aria-hidden="true" />
                <span className="t-sm" style={{ fontWeight: 600 }}>Adicionar foto</span>
              </span>
            )}
          </button>
          {f.image && !uploading && (
            <p className="t-center">
              <button type="button" className="link-btn" onClick={() => fileInput.current?.click()}>
                Trocar foto
              </button>
            </p>
          )}
          {errors.image
            ? <span className="error" role="alert">{errors.image}</span>
            : <span className="hint">JPG, PNG, WebP ou AVIF, até {MAX_MB} MB.</span>}
        </div>

        <Field label="Nome *" value={f.name} onChange={setInput('name')} placeholder="Ex.: Camiseta básica" error={errors.name} />

        <p className="t-label">Categoria</p>
        <Chips label="Categoria" options={CATEGORIES} value={f.category} onChange={set('category')} />
        <p className="t-label">Tamanho</p>
        <Chips label="Tamanho" options={SIZES} value={f.size} onChange={set('size')} />
        <p className="t-label">Condição</p>
        <Chips label="Condição" options={CONDITIONS} value={f.condition} onChange={set('condition')} />

        <Field
          label="Preço (R$) *" value={String(f.price)} onChange={setInput('price')}
          inputMode="decimal" placeholder="0,00" error={errors.price}
        />
        <Field
          textarea label="Descrição" value={f.description || ''} onChange={setInput('description')}
          placeholder="Detalhes, marca, observações" hint="Ajuda o comprador a decidir."
        />

        <Button type="submit" loading={saving} disabled={uploading}>
          {existing ? 'Salvar alterações' : 'Cadastrar peça'}
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
      </form>
    </Screen>
  );
}
