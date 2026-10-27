/**
 * Mouvement des fenêtres (<dialog class="file-dialog">) : ouverture animée en CSS, fermeture en douceur.
 * Les fenêtres se ferment par leur propre bouton, un clic sur le fond ou Échap : tous passent par close(),
 * remplacé ici pour jouer l'animation de sortie avant la fermeture réelle.
 */

const CLOSE_MS = 260;

export function setupDialogMotion(root = document) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const dialog of root.querySelectorAll('dialog.file-dialog')) {
    const nativeClose = dialog.close.bind(dialog);
    let timer = 0;

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
}
