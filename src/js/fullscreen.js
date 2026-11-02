/**
 * Plein écran sur mobile : au premier toucher (les navigateurs l'exigent, ce n'est pas possible sans geste de l'apprenant),
 * la page passe en plein écran si l'appareil le permet. Une seule tentative par session : si l'apprenant en sort, on n'insiste pas.
 * Sans effet sur ordinateur, sur iPhone (Safari n'a pas cette fonction : voir « Sur l'écran d'accueil »), ni dans une iframe
 * de LMS qui n'a pas l'attribut « allowfullscreen ».
 */

const MOBILE = '(max-width: 47.99rem) and (pointer: coarse)';
const KEY = 'plein-ecran-tente';

export function setupFullscreen() {
  const root = document.documentElement;
  if (!window.matchMedia(MOBILE).matches || !document.fullscreenEnabled || !root.requestFullscreen) return;
  if (window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches) return;
  try {
    if (sessionStorage.getItem(KEY)) return;
  } catch {
    /* stockage indisponible : on tente quand même */
  }

  const enter = () => {
    document.removeEventListener('pointerup', enter, true);
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* sans importance */
    }
    root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  };
  document.addEventListener('pointerup', enter, { capture: true });
}
