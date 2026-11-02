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
        return;
      }
      dockedClose(document);
      dialog.classList.add('file-dialog--docked');
      dialog.show();
      setBackground(true);
    };
    dialog.addEventListener('close', () => {
      if (!dialog.classList.contains('file-dialog--docked')) return;
      dialog.classList.remove('file-dialog--docked');
      // une autre fenêtre du menu a pu s'ouvrir entre-temps : la page reste inerte tant qu'il en reste une
      if (!document.querySelector('dialog.file-dialog--docked[open]')) setBackground(false);
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
