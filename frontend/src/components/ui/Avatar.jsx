export default function Avatar({ username, avatarUrl, size = 'md', showOnline = false, isOnline = false }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const dotSizes = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5' };

  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
    'bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500'
  ];

  const colorIndex = username ? username.charCodeAt(0) % colors.length : 0;
  const initials = username ? username.slice(0, 2).toUpperCase() : '??';

  return (
    <div className={`relative flex-shrink-0`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className={`${sizes[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizes[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center font-semibold text-white`}>
          {initials}
        </div>
      )}
      {showOnline && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full
          ${isOnline ? 'bg-green-800' : 'bg-slate-500'}`} />
      )}
    </div>
  );
}
