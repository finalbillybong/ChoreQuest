import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.85, y: 20, transition: { duration: 0.15 } },
};

export default function Modal({ isOpen, onClose, title, children, actions }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="game-panel relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto p-5"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              {title && (
                <h2 className="font-heading text-gold text-xs leading-relaxed">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[#2a2a4a] transition-colors text-cream/50 hover:text-cream flex-shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="text-cream font-body text-lg">{children}</div>

            {/* Actions */}
            {actions && actions.length > 0 && (
              <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#2a2a4a]">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={action.className || 'game-btn game-btn-gold'}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
