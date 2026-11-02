/**
 * Mouvement des fenêtres (<dialog class="file-dialog">) : ouverture animée en CSS, fermeture en douceur.
 * Les fenêtres se ferment par leur propre bouton, un clic sur le fond ou Échap : tous passent par close(),
 * remplacé ici pour jouer l'animation de sortie avant la fermeture réelle.
 */

const CLOSE_MS = 260;
const MOBILE = '(max-width: 47.99rem)';

/** Sur mobile, les fenêtres du menu s'ouvrent « à côté » de la barre d'onglets (show() au lieu de showModal()) : elle reste visible et utilisable. */
function dockedClose(root) {
  for (const dialog of root.querySelectorAll('dialog.file-dialog--docked[open]')) dialog.close();
}

export function setupDialogMotion(root = document) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const dialog of root.querySelectorAll('dialog.file-dialog')) {
    const nativeClose = dialog.close.bind(dialog);
    const nativeShowModal = dialog.showModal.bind(dialog);
    let timer = 0;

    // La page derrière la fenêtre est inerte (ni clic ni tabulation), sauf la barre d'onglets qui doit rester utilisable
    const setBackground = (inert) => {
      for (const element of document.querySelectorAll('.app-column')) element.inert = inert;
    };

    dialog.showModal = () => {
      if (!window.matchMedia(MOBILE).matches) {
        nativeShowModal();
        document.dispatchEvent(new CustomEvent('menu-dialog-change'));
        return;
      }
      dockedClose(document);
      dialog.classList.add('file-dialog--docked');
      // Dossier et Rapport : feuille à mi-hauteur (la question reste visible au-dessus) ; la page derrière reste utilisable
      const sheet = dialog.hasAttribute('data-sheet');
      dialog.classList.toggle('file-dialog--sheet', sheet);
      dialog.classList.remove('file-dialog--sheet-full');
      dialog.show();
      setBackground(!sheet);
      document.dispatchEvent(new CustomEvent('menu-dialog-change'));
    };
    // Glisser la fenêtre vers le bas pour la fermer (mobile), comme une feuille iOS : depuis l'en-tête, ou depuis le contenu s'il est en haut
    let drag = null;
    const resetDrag = () => {
      dialog.style.animation = '';
      dialog.style.transition = '';
      dialog.style.transform = '';
    };
    dialog.addEventListener(
      'touchstart',
      (event) => {
        if (!dialog.classList.contains('file-dialog--docked') || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const inHeader = Boolean(event.target.closest('.file-dialog__header'));
        drag = { x: touch.clientX, y: touch.clientY, t: performance.now(), active: false, ok: inHeader || dialog.scrollTop <= 0, dy: 0, inHeader, up: 0 };
      },
      { passive: true },
    );
    dialog.addEventListener(
      'touchmove',
      (event) => {
        if (!drag || !drag.ok) return;
        const touch = event.touches[0];
        const dy = touch.clientY - drag.y;
        const dx = touch.clientX - drag.x;
        if (!drag.active) {
          if (dy > 12 && dy > Math.abs(dx) * 1.5 && dialog.scrollTop <= 0) {
            drag.active = true;
            dialog.style.animation = 'none';
            dialog.style.transition = 'none';
          } else {
            // feuille à mi-hauteur : tirer l'en-tête vers le haut l'agrandit
            if (drag.inHeader && dialog.classList.contains('file-dialog--sheet') && dy < -12 && Math.abs(dy) > Math.abs(dx)) {
              drag.up = -dy;
              if (event.cancelable) event.preventDefault();
              return;
            }
            if (dy < -4 || Math.abs(dx) > 12) drag.ok = false; // c'est un défilement ordinaire
            return;
          }
        }
        drag.dy = Math.max(0, dy);
        if (event.cancelable) event.preventDefault();
        dialog.style.transform = `translateY(${drag.dy * 0.92}px)`;
      },
      { passive: false },
    );
    const endDrag = (cancelled) => {
      const current = drag;
      drag = null;
      if (current && !current.active && current.up > 40 && !cancelled) {
        dialog.classList.add('file-dialog--sheet-full');
        return;
      }
      if (!current || !current.active) return;
      const speed = current.dy / Math.max(1, performance.now() - current.t);
      if (!cancelled && (current.dy > 120 || speed > 0.7) && dialog.classList.contains('file-dialog--sheet-full')) {
        // grande feuille : d'abord on la ramène à mi-hauteur
        dialog.classList.remove('file-dialog--sheet-full');
        dialog.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)';
        dialog.style.transform = 'none';
      } else if (!cancelled && (current.dy > 120 || speed > 0.7)) {
        dialog.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 1, 1)';
        dialog.style.transform = 'translateY(100%)';
        setTimeout(() => dialog.close(), 220);
      } else {
        dialog.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)';
        dialog.style.transform = 'none';
      }
    };
    dialog.addEventListener('touchend', () => endDrag(false));
    dialog.addEventListener('touchcancel', () => endDrag(true));

    dialog.addEventListener('close', () => {
      if (!dialog.classList.contains('file-dialog--docked')) return;
      dialog.classList.remove('file-dialog--docked', 'file-dialog--sheet', 'file-dialog--sheet-full');
      resetDrag();
      // une autre fenêtre du menu a pu s'ouvrir entre-temps : la page reste inerte tant qu'il en reste une
      if (!document.querySelector('dialog.file-dialog--docked[open]')) setBackground(false);
      document.dispatchEvent(new CustomEvent('menu-dialog-change'));
    });

    const finish = (value) => {
      clearTimeout(timer);
      dialog.classList.remove('file-dialog--closing');
      if (dialog.open) nativeClose(value);
    };

    dialog.close = (value) => {
      if (!dialog.open || dialog.classList.contains('file-dialog--closing')) return;
      if (reduced.matches) {
        finish(value);
        return;
      }
      dialog.classList.add('file-dialog--closing');
      document.dispatchEvent(new CustomEvent('menu-dialog-change'));
      timer = setTimeout(() => finish(value), CLOSE_MS);
    };

    // Échap : même sortie en douceur
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      dialog.close();
    });
  }

  // Fenêtre « à côté » : Échap ne la ferme pas toute seule (ce n'est pas une fenêtre modale), un clic sur la barre d'onglets non plus
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dockedClose(document);
  });
  document.querySelector('.app-sidebar--toc')?.addEventListener(
    'click',
    (event) => {
      if (event.target.closest('.side-nav__item')) dockedClose(document);
    },
    true,
  );
}
