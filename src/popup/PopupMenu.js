export default class PopupMenu {
  
  static $inject = ['eventBus', 'canvas'];

  constructor(eventBus, canvas) {
    this.eventBus = eventBus;
    this.canvas = canvas;
    this.currentMenu = null;
  }

  open(element, menuEntries, position) {
    // Close any existing menu
    this.close();

    // Create menu container
    const menu = document.createElement('div');
    menu.className = 'popup-menu';
    menu.style.position = 'absolute';
    menu.style.left = position.x + 'px';
    menu.style.top = position.y + 'px';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '120px';

    // Add menu items
    Object.keys(menuEntries).forEach(key => {
      const entry = menuEntries[key];
      const item = document.createElement('div');
      item.className = 'popup-menu-item';
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #eee';
      item.textContent = entry.label || key;

      // Hover effects
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f5f5f5';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      // Click handler
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (entry.action) {
          entry.action();
        }
        this.close();
      });

      menu.appendChild(item);
    });

    // Add to canvas container
    const canvasContainer = this.canvas.getContainer();
    canvasContainer.appendChild(menu);
    this.currentMenu = menu;

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', this._handleOutsideClick.bind(this), { once: true });
    }, 0);

    return menu;
  }

  close() {
    if (this.currentMenu) {
      this.currentMenu.remove();
      this.currentMenu = null;
    }
  }

  _handleOutsideClick(event) {
    if (this.currentMenu && !this.currentMenu.contains(event.target)) {
      this.close();
    }
  }
}
