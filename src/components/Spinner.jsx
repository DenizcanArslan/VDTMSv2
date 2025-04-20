import React from 'react';

/**
 * Yükleme durumunu göstermek için kullanılan spinner bileşeni
 * @param {Object} props
 * @param {string} props.size - Spinner boyutu: 'sm', 'md', 'lg' (varsayılan: 'md')
 * @param {string} props.color - Spinner rengi: 'blue', 'white', 'gray' (varsayılan: 'blue')
 * @param {string} props.text - Spinner yanında gösterilecek yazı (opsiyonel)
 * @param {string} props.className - İlave CSS sınıfları (opsiyonel)
 */
const Spinner = ({ size = 'md', color = 'blue', text, className = '' }) => {
  // Boyut sınıfları
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  // Renk sınıfları
  const colorClasses = {
    blue: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-300',
  };
  
  // Text boyut sınıfları
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-2 border-t-transparent ${colorClasses[color]}`}></div>
      {text && <span className={`ml-2 ${textSizeClasses[size]}`}>{text}</span>}
    </div>
  );
};

export default Spinner; 