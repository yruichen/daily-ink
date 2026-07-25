import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export const Modal = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <Button
            variant="ghost"
            icon={<X size={18} />}
            onClick={onClose}
            aria-label="Close"
            title="Close"
          />
        </header>
        {children}
      </section>
    </div>
  );
};
