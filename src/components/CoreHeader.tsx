import Image from 'next/image';

interface CoreHeaderProps {
  title?: string;
  subtitle?: string;
  description?: string;
  showNav?: boolean;
}

export default function CoreHeader({
  title = 'Truffles',
  subtitle,
  description,
}: CoreHeaderProps) {
  return (
    <div className='auth-header'>
      <Image
        src='/icons/launchericon-192x192.png'
        alt=''
        aria-hidden
        width={72}
        height={72}
        className='mx-auto mb-3'
        priority
      />
      <h1
        className='portfolio-heading mb-2'
        style={{ color: 'var(--tr-text)' }}
      >
        {title}
      </h1>
      {subtitle && (
        <h2
          className='text-xl font-semibold mb-2'
          style={{ color: 'var(--tr-text)' }}
        >
          {subtitle}
        </h2>
      )}
      {description && (
        <p style={{ color: 'var(--tr-text-2)' }}>{description}</p>
      )}
    </div>
  );
}
