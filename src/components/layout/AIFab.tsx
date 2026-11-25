import { useState } from 'react';
import { Modal } from '../ui/Modal';

export function AIFab() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button className="ai-fab md:hidden" onClick={() => setShow(true)} aria-label="AI Assistant">🤖</button>
      {show && (
        <Modal title="AI Assistant" onClose={() => setShow(false)}>
          <div className="text-center py-8" style={{ color: 'var(--text-3)' }}>
            <div className="text-5xl mb-3">🤖</div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>Coming Soon</p>
            <p className="text-sm mt-1">The AI diagnostic assistant will be available in the next version.</p>
            <p className="text-xs mt-3 font-mono" style={{ color: 'var(--text-4)' }}>API: POST /api/v1/ai/diagnose</p>
          </div>
        </Modal>
      )}
    </>
  );
}
