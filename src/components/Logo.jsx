/** O símbolo do bazar (sol + sacolas), recortado do logo por scripts/gen-icons.py. */
export default function Logo({ size = 56, className = '' }) {
  return (
    <img
      src="/icons/simbolo.png"
      alt="Bazar do Renascer"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
