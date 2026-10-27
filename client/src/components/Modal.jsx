import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  description,
  children,
  onClose,
  busy = false,
  wide = false,
}) {
  const ref = useRef(null),
    id = useId(),
    state = useRef({ busy, onClose });
  state.current = { busy, onClose };
  useEffect(() => {
    const previous = document.activeElement,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector(
        "input:not([disabled]),select:not([disabled]),button:not([disabled])",
      )
      ?.focus();
    const handle = (e) => {
      if (e.key === "Escape" && !state.current.busy) state.current.onClose();
      if (e.key !== "Tab") return;
      const elements = [
        ...ref.current.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ].filter(
        (element) => element.getClientRects().length && element.tabIndex >= 0,
      );
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-overlay">
      <section
        ref={ref}
        className={`modal-content workspace-modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={description ? `${id}-description` : undefined}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">MYSUBSSMART</span>
            <h2 id={id}>{title}</h2>
            {description && <p id={`${id}-description`}>{description}</p>}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            disabled={busy}
            aria-label="Cerrar formulario"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
