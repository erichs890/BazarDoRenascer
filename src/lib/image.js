/**
 * Prepara a foto da peça antes de subir.
 *
 * Foto de celular vem com 3–12 MB e 4000px de lado. Subir isso significa:
 * estourar o limite de 3 MB do bucket, gastar a franquia de quem cadastra e
 * servir megabytes para cada visitante da vitrine. O maior card mostra ~190px
 * (380px em telas 2x), então 1200px já é folga generosa.
 *
 * WebP com qualidade 0.82 costuma sair 5–10× menor que o JPEG original sem
 * diferença visível num card de produto.
 */
const MAX_LADO = 1200;
const QUALIDADE = 0.82;

const carregar = (file) => new Promise((ok, erro) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); ok(img); };
  img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não foi possível ler a imagem.')); };
  img.src = url;
});

/** Recebe um File e devolve { blob, ext } pronto para o Storage. */
export async function prepararFoto(file) {
  const img = await carregar(file);

  const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  // WebP é suportado por todo navegador que roda este app; o JPEG fica de rede
  // de segurança caso toBlob devolva null.
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', QUALIDADE))
    ?? await new Promise((r) => canvas.toBlob(r, 'image/jpeg', QUALIDADE));

  if (!blob) throw new Error('Não foi possível processar a imagem.');

  // Se o original já era menor que o resultado, fica com o original.
  if (blob.size >= file.size && file.size <= 3 * 1024 * 1024) {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return { blob: file, ext };
  }
  return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
}
