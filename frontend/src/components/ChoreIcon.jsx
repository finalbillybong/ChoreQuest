import * as icons from 'lucide-react';

/**
 * Converts a kebab-case icon name (e.g. "shopping-cart") to PascalCase ("ShoppingCart")
 * to look up the corresponding Lucide React component.
 */
function kebabToPascal(str) {
  if (!str) return '';
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export default function ChoreIcon({ name, size = 20, className = '' }) {
  if (!name) {
    const Fallback = icons.Circle;
    return <Fallback size={size} className={className} />;
  }

  const pascalName = kebabToPascal(name);
  const IconComponent = icons[pascalName];

  if (!IconComponent) {
    const Fallback = icons.Circle;
    return <Fallback size={size} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
}
