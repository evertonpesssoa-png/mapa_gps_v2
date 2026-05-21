// ======================================
// MENU LATERAL
// ======================================

let isMenuOpen = false;

function toggleMenu() {
  const menu = document.getElementById('side-menu');
  if (!menu) return;
  
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    menu.classList.add('open');
  } else {
    menu.classList.remove('open');
  }
}

function closeMenu() {
  const menu = document.getElementById('side-menu');
  if (menu) {
    menu.classList.remove('open');
    isMenuOpen = false;
  }
}

function openMenu() {
  const menu = document.getElementById('side-menu');
  if (menu) {
    menu.classList.add('open');
    isMenuOpen = true;
  }
}

// Alternar abas no menu
function switchMenuTab(tabId) {
  // Remover active de todas as abas
  document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  // Esconder todos os conteúdos
  document.querySelectorAll('.menu-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Ativar aba clicada
  const selectedTab = document.querySelector(`.menu-tab[data-tab="${tabId}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Mostrar conteúdo correspondente
  const selectedContent = document.getElementById(`menu-tab-${tabId}`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
}

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.openMenu = openMenu;
window.switchMenuTab = switchMenuTab;