export function mountBootHud(root, config) {
  const card = document.createElement('section');
  card.className = 'boot-card';
  card.innerHTML = `
    <h1>${config.codename}</h1>
    <p>Fondation web active. La scène 3D et le gameplay sont livrés par les tâches suivantes de la roadmap.</p>
    <span class="boot-badge">${config.version} · prototype original</span>
  `;
  root.replaceChildren(card);

  return () => root.replaceChildren();
}

export function mountFatalHud(root, error) {
  const card = document.createElement('section');
  card.className = 'boot-card fatal-card';
  card.innerHTML = `<h1>Erreur de démarrage</h1><p>${String(error?.message ?? error)}</p>`;
  root.replaceChildren(card);
}
