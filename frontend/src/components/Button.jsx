export default function Button({ children, onClick, type = 'button', variant = 'primary' }) {
  const base = 'px-4 py-2 rounded font-medium transition';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    closing: 'bg-red-400 text-black hover:bg-red-600'
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
