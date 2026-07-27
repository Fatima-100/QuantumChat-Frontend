/** Shared QuantumChat mark — always `/logo.png` from `public/`. */
export default function BrandLogo({ className = '', size, alt = 'QuantumChat' }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={['brand-logo', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
    />
  );
}
