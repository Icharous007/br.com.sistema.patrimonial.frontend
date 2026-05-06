import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { MenuItem, MenuSection } from '../../core/api.models';
import { AuthService } from '../../core/auth/auth.service';

const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'inicio',
    label: 'Início',
    roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
    items: [
      { label: 'Boas-vindas', path: '/welcome', roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
    ],
  },
  {
    id: 'minha-conta',
    label: 'Minha Conta',
    roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
    items: [
      { label: 'Meu perfil', path: '/my-profile', queryParams: { view: 'profile' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Alterar senha', path: '/my-profile', queryParams: { view: 'password' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
    ],
  },
  {
    id: 'acesso',
    label: 'Acesso e Pessoas',
    roles: ['SECRETARIO', 'ADMINISTRADOR'],
    items: [
      {
        label: 'Listar usuários',
        path: '/users',
        queryParams: { view: 'list' },
        roles: ['SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Cadastrar usuário',
        path: '/users',
        queryParams: { view: 'create' },
        roles: ['SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Gerenciar perfis',
        path: '/profiles',
        queryParams: { view: 'list' },
        roles: ['ADMINISTRADOR'],
      },
      {
        label: 'Cadastrar perfil',
        path: '/profiles',
        queryParams: { view: 'create' },
        roles: ['ADMINISTRADOR'],
      },
    ],
  },
  {
    id: 'catalogos',
    label: 'Cadastros Auxiliares',
    roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
    items: [
      { label: 'Cores', path: '/colors', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Nova cor', path: '/colors', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Tipos de bem', path: '/asset-types', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Novo tipo', path: '/asset-types', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Status de bem', path: '/asset-statuses', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Novo status', path: '/asset-statuses', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Materiais', path: '/asset-materials', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Novo material', path: '/asset-materials', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Localizações', path: '/asset-locations', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Nova localização', path: '/asset-locations', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
    ],
  },
  {
    id: 'patrimonio',
    label: 'Patrimônio',
    roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
    items: [
      { label: 'Consultar bens', path: '/assets', queryParams: { view: 'list' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Cadastrar bem', path: '/assets', queryParams: { view: 'create' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
      { label: 'Relatórios', path: '/assets', queryParams: { view: 'reports' }, roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'] },
    ],
  },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <button
        type="button"
        class="sidebar-backdrop"
        [class.sidebar-backdrop-visible]="menuOpen()"
        (click)="closeMenu()"
        aria-label="Fechar menu lateral"
      ></button>

      <aside class="sidebar" [class.sidebar-open]="menuOpen()">
        <div class="brand-block">
          <div class="brand-mark">SP</div>
          <div>
            <p class="eyebrow">Painel Operacional</p>
            <h1>Sistema Patrimonial</h1>
          </div>
        </div>

        <nav class="menu-stack">
          @for (section of visibleSections(); track section.id) {
            <section class="menu-group">
              <button
                type="button"
                class="menu-group-toggle"
                (click)="toggleSection(section.id)"
                [attr.aria-expanded]="isOpen(section.id)"
                [attr.aria-controls]="'menu-group-' + section.id"
              >
                <span>{{ section.label }}</span>
                <span class="menu-arrow" [class.menu-arrow-open]="isOpen(section.id)">▾</span>
              </button>

              <div
                class="menu-dropdown"
                [class.menu-dropdown-open]="isOpen(section.id)"
                [attr.id]="'menu-group-' + section.id"
                [attr.aria-hidden]="!isOpen(section.id)"
              >
                @for (item of section.items; track item.label) {
                  <a
                    class="menu-link"
                    [routerLink]="item.path"
                    [queryParams]="item.queryParams"
                    routerLinkActive="menu-link-active"
                    (click)="closeMenu()"
                  >
                    {{ item.label }}
                  </a>
                }
              </div>
            </section>
          }
        </nav>

        <div class="sidebar-footer card-soft">
          <p class="sidebar-footer-label">Sessão ativa</p>
          <strong>{{ auth.userName() }}</strong>
          <span>{{ auth.profile() }}</span>
          <button type="button" class="btn btn-secondary btn-block" (click)="logout()">Sair</button>
        </div>
      </aside>

      <div class="app-main">
        <header class="topbar card-soft">
          <div>
            <p class="eyebrow">Gestão integrada</p>
            <h2>{{ pageTitle() }}</h2>
          </div>

          <div class="topbar-actions">
            <div class="topbar-user">
              <span class="avatar-chip">{{ initials() }}</span>
              <div>
                <strong>{{ auth.userName() }}</strong>
                <small>{{ auth.profile() }}</small>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-ghost menu-trigger"
              (click)="toggleMenu()"
              [attr.aria-expanded]="menuOpen()"
              aria-label="Abrir ou fechar menu"
            >
              Menu
            </button>
          </div>
        </header>

        <main class="content-area">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  private readonly openSections = signal<Record<string, boolean>>(this.closedSectionsState());
  readonly visibleSections = computed(() =>
    MENU_SECTIONS.filter((section) => this.auth.hasAnyRole(section.roles)).map((section) => ({
      ...section,
      items: section.items.filter((item) => this.canAccess(item)),
    })),
  );
  readonly pageTitle = signal('Boas-vindas');

  constructor() {
    this.syncPageContext(this.router.url);

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.closeMenu();
      this.syncPageContext(this.router.url);
    });
  }

  initials(): string {
    return this.auth
      .userName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleSection(sectionId: string): void {
    if (!this.visibleSections().some((section) => section.id === sectionId)) {
      return;
    }

    const isAlreadyOpen = this.isOpen(sectionId);

    // Keep accordion behavior consistent: opening one section closes all others.
    const nextState = this.closedSectionsState();
    nextState[sectionId] = !isAlreadyOpen;
    this.openSections.set(nextState);
  }

  isOpen(sectionId: string): boolean {
    return !!this.openSections()[sectionId];
  }

  logout(): void {
    this.auth.logout();
  }

  private canAccess(item: MenuItem): boolean {
    return this.auth.hasAnyRole(item.roles);
  }

  private syncPageContext(url: string): void {
    const currentPath = this.normalizePath(url);
    this.updatePageTitle(currentPath);

    // Keep menu sections open only when user selected them and route belongs to that section.
    this.openSections.update((state) => {
      const nextState = this.closedSectionsState();

      this.visibleSections().forEach((section) => {
        const routeBelongsToSection = section.items.some((item) => item.path === currentPath);
        nextState[section.id] = !!state[section.id] && routeBelongsToSection;
      });

      return nextState;
    });
  }

  private normalizePath(url: string): string {
    return url.split('?')[0].split('#')[0] || '/';
  }

  private updatePageTitle(currentPath: string): void {
    if (currentPath.startsWith('/users')) this.pageTitle.set('Usuários');
    else if (currentPath.startsWith('/profiles')) this.pageTitle.set('Perfis');
    else if (currentPath.startsWith('/my-profile')) this.pageTitle.set('Meu Perfil');
    else if (currentPath.startsWith('/asset-types')) this.pageTitle.set('Tipos de bem');
    else if (currentPath.startsWith('/asset-statuses')) this.pageTitle.set('Status de bem');
    else if (currentPath.startsWith('/asset-materials')) this.pageTitle.set('Materiais');
    else if (currentPath.startsWith('/asset-locations')) this.pageTitle.set('Localizações');
    else if (currentPath.startsWith('/colors')) this.pageTitle.set('Cores');
    else if (currentPath.startsWith('/assets')) this.pageTitle.set('Bens patrimoniais');
    else this.pageTitle.set('Boas-vindas');
  }

  private closedSectionsState(): Record<string, boolean> {
    return MENU_SECTIONS.reduce<Record<string, boolean>>((state, section) => {
      state[section.id] = false;
      return state;
    }, {});
  }
}