interface CoreHeaderProps {
  title?: string;
  subtitle?: string;
  description?: string;
  showNav?: boolean;
}

export default function CoreHeader({
  title = '🐷 Hamm Reserve',
  subtitle,
  description,
}: CoreHeaderProps) {
  return (
    <div className='text-center mb-8'>
      <h1 className='text-4xl font-bold text-gray-800 mb-2'>{title}</h1>
      {subtitle && (
        <h2 className='text-xl font-semibold text-gray-700 mb-2'>{subtitle}</h2>
      )}
      {description && <p className='text-gray-600'>{description}</p>}
    </div>
  );
}
