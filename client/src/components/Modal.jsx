import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ModalCtx = createContext(null)

export function useModal() {
  return useContext(ModalCtx)
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const resolveRef = useRef(null)

  const close = useCallback((value) => {
    setModal(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }, [])

  const showConfirm = useCallback((title, message, confirmText = 'Löschen', cancelText = 'Abbrechen') =>
    new Promise(res => { resolveRef.current = res; setModal({ type: 'confirm', title, message, confirmText, cancelText }) }),
  [])

  const showAlert = useCallback((message, title = 'Hinweis') =>
    new Promise(res => { resolveRef.current = res; setModal({ type: 'alert', title, message }) }),
  [])

  const showPrompt = useCallback((title, placeholder = '') =>
    new Promise(res => { resolveRef.current = res; setModal({ type: 'prompt', title, placeholder }) }),
  [])

  return (
    <ModalCtx.Provider value={{ showConfirm, showAlert, showPrompt }}>
      {children}
      {modal && <ModalDialog modal={modal} onClose={close} />}
    </ModalCtx.Provider>
  )
}

function ModalDialog({ modal, onClose }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (modal.type === 'prompt') setTimeout(() => inputRef.current?.focus(), 50)
  }, [modal.type])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(modal.type === 'confirm' ? false : null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, onClose])

  const dismiss = () => onClose(modal.type === 'confirm' ? false : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/50 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slideUp">
        <h2 className="font-display font-bold text-lg text-stone-900 mb-2">{modal.title}</h2>

        {modal.type === 'alert' && (
          <>
            <p className="text-stone-500 text-sm leading-relaxed mb-5">{modal.message}</p>
            <button className="btn btn-primary btn-lg" onClick={() => onClose(true)}>OK</button>
          </>
        )}

        {modal.type === 'confirm' && (
          <>
            <p className="text-stone-500 text-sm leading-relaxed mb-5">{modal.message}</p>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-md flex-1" onClick={() => onClose(false)}>{modal.cancelText}</button>
              <button className="btn btn-danger btn-md flex-1" onClick={() => onClose(true)}>{modal.confirmText}</button>
            </div>
          </>
        )}

        {modal.type === 'prompt' && (
          <>
            <input
              ref={inputRef}
              type="password"
              placeholder={modal.placeholder}
              className="input mb-4 mt-1"
              maxLength={128}
              onKeyDown={(e) => { if (e.key === 'Enter') onClose(inputRef.current?.value || null) }}
            />
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-md flex-1" onClick={() => onClose(null)}>Abbrechen</button>
              <button className="btn btn-primary btn-md flex-1" onClick={() => onClose(inputRef.current?.value || null)}>Übernehmen</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
