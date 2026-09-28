import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { AssetsApiService } from '../../core/services/assets-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { profileLabel } from '../../shared/utils/profile.utils';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-stack">
      <div class="hero-banner card-hero hero-photo">
        <div class="hero-copy-block">
          <p class="eyebrow">Paróquia São Francisco de Assis</p>
          <h1>Olá, {{ auth.userName() }}.</h1>
          <p>
            Seu acesso é de <strong>{{ profileLabel(auth.profile()) }}</strong>.
            Cuide do inventário da comunidade — nave, sacristia, secretaria e demais espaços.
          </p>
        </div>

        <div class="hero-metrics">
          @for (metric of metrics(); track metric.label) {
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
            <p class="eyebrow">Missão</p>
            <h2>Patrimônio da paróquia</h2>
          </div>

          <div class="bullet-list">
            <div>Registrar cada bem com código, localização e estado de uso.</div>
            <div>Manter catálogos de tipo, material, cor, status e sala.</div>
            <div>Emitir planilhas e etiquetas com código de barras.</div>
            <div>Consultar o histórico de alterações quando o perfil permitir.</div>
          </div>
        </article>
      </section>
    </section>
  `,
})
export class WelcomePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly assetsApi = inject(AssetsApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly usersApi = inject(UsersApiService);

  readonly profileLabel = profileLabel;
  readonly metrics = signal<{ label: string; value: string }[]>([
    { label: 'Bens cadastrados', value: '—' },
    { label: 'Localizações', value: '—' },
    { label: 'Relatórios', value: 'CSV, Excel e PDF' },
  ]);

  ngOnInit(): void {
    const canSeeUsers = this.auth.hasAnyRole(['SECRETARIO', 'ADMINISTRADOR']);

    forkJoin({
      assets: this.assetsApi.list({}, { page: 0, size: 1 }).pipe(catchError(() => of(null))),
      locations: this.catalogApi.list('asset-locations', { page: 0, size: 1 }).pipe(catchError(() => of(null))),
      users: canSeeUsers
        ? this.usersApi.list({}, { page: 0, size: 1 }).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe(({ assets, locations, users }) => {
      const next = [
        { label: 'Bens cadastrados', value: assets ? String(assets.totalElements) : '—' },
        { label: 'Localizações', value: locations ? String(locations.totalElements) : '—' },
      ];

      if (canSeeUsers) {
        next.push({ label: 'Usuários', value: users ? String(users.totalElements) : '—' });
      } else {
        next.push({ label: 'Relatórios', value: 'CSV, Excel e PDF' });
      }

      this.metrics.set(next);
    });
  }

  readonly quickActions = computed(() => {
    const profile = this.auth.profile();
    const actions = [
      {
        label: 'Cadastrar bem',
        description: 'Inclua um item com tipo, local, status e foto.',
        path: '/assets',
        queryParams: { view: 'create' },
        roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Consultar bens',
        description: 'Pesquise por código, descrição, marca, tipo, cor, status e local.',
        path: '/assets',
        queryParams: { view: 'list' },
        roles: ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Gerenciar usuários',
        description: 'Cadastre e atualize quem acessa a secretaria.',
        path: '/users',
        queryParams: { view: 'list' },
        roles: ['SECRETARIO', 'ADMINISTRADOR'],
      },
      {
        label: 'Administrar perfis',
        description: 'Ajuste os papéis de acesso do sistema.',
        path: '/profiles',
        queryParams: { view: 'list' },
        roles: ['ADMINISTRADOR'],
      },
      {
        label: 'Auditoria',
        description: 'Acompanhe criações, alterações e exclusões.',
        path: '/audit-logs',
        queryParams: undefined,
        roles: ['ADMINISTRADOR'],
      },
    ];

    return actions.filter((action) => profile && action.roles.includes(profile));
  });
}