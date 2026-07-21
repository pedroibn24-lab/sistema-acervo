import { useState } from 'react'

/**
 * Botão de apagar com confirmação inline (aparece "Apagar? Sim / Não").
 * @param {object} props
 * @param {() => void} props.onConfirm
 * @param {boolean} [props.disabled]
 * @param {string} [props.label] rótulo acessível
 */
export default function DeleteButton({ onConfirm, disabled = false, label = 'Apagar' }) {
  const [confirmando, setConfirmando] = useState(false)

  if (confirmando) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted">Apagar?</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="font-medium text-danger"
        >
          Sim
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="text-muted">
          Não
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      aria-label={label}
      className="text-muted transition-colors hover:text-danger"
    >
      ✕
    </button>
  )
}
