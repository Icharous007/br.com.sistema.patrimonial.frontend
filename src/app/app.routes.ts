import { Routes } from '@angular/router';

import { ALL_PROFILES } from './core/api.models';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { ShellComponent } from './features/layout/shell.component';
import { AssetsPageComponent } from './features/pages/assets-page.component';
import { AuditLogsPageComponent } from './features/pages/audit-logs-page.component';
import { CatalogPageComponent } from './features/pages/catalog-page.component';
import { MyProfilePageComponent } from './features/pages/my-profile-page.component';
import { ProfilesPageComponent } from './features/pages/profiles-page.component';
import { UsersPageComponent } from './features/pages/users-page.component';
import { WelcomePageComponent } from './features/pages/welcome-page.component';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginPageComponent,
		canActivate: [guestGuard],
	},
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{
				path: 'welcome',
				component: WelcomePageComponent,
			},
			{
				path: 'my-profile',
				component: MyProfilePageComponent,
			},
			{
				path: 'users',
				component: UsersPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ['SECRETARIO', 'ADMINISTRADOR'],
				},
			},
			{
				path: 'profiles',
				component: ProfilesPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ['ADMINISTRADOR'],
				},
			},
			{
				path: 'colors',
				component: CatalogPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Cores',
					subtitle: 'Controle das cores utilizadas no cadastro patrimonial.',
					singularLabel: 'cor',
					endpoint: 'colors',
					coded: false,
				},
			},
			{
				path: 'asset-types',
				component: CatalogPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Tipos de bem',
					subtitle: 'Padronize os tipos e códigos estruturais dos bens patrimoniais.',
					singularLabel: 'tipo',
					endpoint: 'asset-types',
					coded: true,
				},
			},
			{
				path: 'asset-statuses',
				component: CatalogPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Status de bem',
					subtitle: 'Administre os estágios de uso, baixa e disponibilidade dos bens.',
					singularLabel: 'status',
					endpoint: 'asset-statuses',
					coded: false,
				},
			},
			{
				path: 'asset-materials',
				component: CatalogPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Materiais',
					subtitle: 'Catálogo de materiais aplicados aos itens cadastrados.',
					singularLabel: 'material',
					endpoint: 'asset-materials',
					coded: false,
				},
			},
			{
				path: 'asset-locations',
				component: CatalogPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Localizações',
					subtitle: 'Mapeie prédios, salas e setores com código identificador.',
					singularLabel: 'localização',
					endpoint: 'asset-locations',
					coded: true,
				},
			},
			{
				path: 'assets',
				component: AssetsPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
				},
			},
			{
				path: 'audit-logs',
				component: AuditLogsPageComponent,
				canActivate: [roleGuard],
				data: {
					roles: ['ADMINISTRADOR'],
				},
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'welcome',
			},
		],
	},
	{
		path: '**',
		redirectTo: '',
	},
];
