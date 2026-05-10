import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-stack">
      <div class="hero-banner card-hero">
        <div class="hero-copy-block">
          <p class="eyebrow">Boas-vindas</p>
          <h1>Olá, {{ auth.userName() }}.</h1>
          <p>
            Seu perfil atual é <strong>{{ auth.profile() }}</strong>. Use o menu em cascata para navegar
            por cada endpoint e executar suas funcionalidades operacionais.
          </p>
        </div>

        <div class="hero-metrics">
          @for (metric of metrics; track metric.label) {
            <article class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          }
        </div>
      </div>

      <section class="content-grid two-columns">
        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Ações rápidas</p>
            <h2>Atalhos do seu perfil</h2>
          </div>

          <div class="action-list">
            @for (action of quickActions(); track action.label) {
              <a class="action-card" [routerLink]="action.path" [queryParams]="action.queryParams">
                <strong>{{ action.label }}</strong>
                <span>{{ action.description }}</span>
              </a>
            }
          </div>
        </article>

        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Cobertura da API</p>
            <h2>Fluxos entregues</h2>
          </div>

          <div class="bullet-list">
            <div>Login com JWT e redirecionamento por rota protegida.</div>
            <div>Menu em cascata com dropdown por módulo e função.</div>
            <div>CRUD de usuários, perfis, catálogos auxiliares e bens.</div>
            <div>Listagens com filtros, formulários integrados e relatórios CSV/Excel/PDF.</div>
            <div>Seleções de bens abastecidas via endpoints auxiliares.</div>
            <div>Auditoria de ações para o perfil ADMINISTRADOR.</div>
          </div>
        </article>
      </section>
    </section>
  `,
})
export class WelcomePageComponent {
  readonly auth = inject(AuthService);

  readonly metrics = [
    { label: 'Módulos', value: '9' },
    { label: 'Endpoints mapeados', value: '20+' },
    { label: 'Relatórios', value: '3 formatos' },
  ];

  readonly quickActions = computed(() => {
    const profile = this.auth.profile();
    const actions = [
      {
        label: 'Cadastrar bem',
        description: 'Abra o formulário completo com catálogos vinculados por selectbox.',
        path: '/assets',
        queryParams: { view: 'create' },
        roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Consultar bens',
        description: 'Pesquise descrição, marca, fabricante, tipo, cor, status e local.',
        path: '/assets',
        queryParams: { view: 'list' },
        roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Gerenciar usuários',
        description: 'Cadastre e atualize usuários vinculando o perfil correto.',
        path: '/users',
        queryParams: { view: 'list' },
        roles: ['SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Administrar perfis',
        description: 'Ajuste os perfis funcionais habilitados no sistema.',
        path: '/profiles',
        queryParams: { view: 'create' },
        roles: ['ADMINISTRADOR'],
      },
      {
        label: 'Auditoria',
        description: 'Acompanhe o histórico de criação, atualização e exclusão de registros.',
        path: '/audit-logs',
        queryParams: undefined,
        roles: ['ADMINISTRADOR'],
      },
    ];

    return actions.filter((action) => profile && action.roles.includes(profile));
  });
}