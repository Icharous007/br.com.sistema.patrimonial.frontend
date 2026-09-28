import { Routes } from '@angular/router';

import { ALL_PROFILES } from './core/api.models';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
		canActivate: [guestGuard],
	},
	{
		path: '',
		loadComponent: () => import('./features/layout/shell.component').then((m) => m.ShellComponent),
		canActivate: [authGuard],
		children: [
			{
				path: 'welcome',
				loadComponent: () =>
					import('./features/pages/welcome-page.component').then((m) => m.WelcomePageComponent),
			},
			{
				path: 'my-profile',
				loadComponent: () =>
					import('./features/pages/my-profile-page.component').then((m) => m.MyProfilePageComponent),
			},
			{
				path: 'users',
				loadComponent: () =>
					import('./features/pages/users-page.component').then((m) => m.UsersPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ['SECRETARIO', 'ADMINISTRADOR'],
				},
			},
			{
				path: 'profiles',
				loadComponent: () =>
					import('./features/pages/profiles-page.component').then((m) => m.ProfilesPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ['ADMINISTRADOR'],
				},
			},
			{
				path: 'colors',
				loadComponent: () =>
					import('./features/pages/catalog-page.component').then((m) => m.CatalogPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Cores',
					subtitle: 'Cores usadas na identificação dos bens da paróquia.',
					singularLabel: 'cor',
					endpoint: 'colors',
					coded: false,
				},
			},
			{
				path: 'asset-types',
				loadComponent: () =>
					import('./features/pages/catalog-page.component').then((m) => m.CatalogPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Tipos de bem',
					subtitle: 'Tipos e códigos estruturais dos bens (imóvel, móvel, bem de uso).',
					singularLabel: 'tipo',
					endpoint: 'asset-types',
					coded: true,
				},
			},
			{
				path: 'asset-statuses',
				loadComponent: () =>
					import('./features/pages/catalog-page.component').then((m) => m.CatalogPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Status de bem',
					subtitle: 'Estágios de uso, avaria, doação e baixa dos bens.',
					singularLabel: 'status',
					endpoint: 'asset-statuses',
					coded: false,
				},
			},
			{
				path: 'asset-materials',
				loadComponent: () =>
					import('./features/pages/catalog-page.component').then((m) => m.CatalogPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Materiais',
					subtitle: 'Materiais aplicados aos itens cadastrados.',
					singularLabel: 'material',
					endpoint: 'asset-materials',
					coded: false,
				},
			},
			{
				path: 'asset-locations',
				loadComponent: () =>
					import('./features/pages/catalog-page.component').then((m) => m.CatalogPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
					title: 'Localizações',
					subtitle: 'Salas e setores da paróquia, com código identificador.',
					singularLabel: 'localização',
					endpoint: 'asset-locations',
					coded: true,
				},
			},
			{
				path: 'assets',
				loadComponent: () =>
					import('./features/pages/assets-page.component').then((m) => m.AssetsPageComponent),
				canActivate: [roleGuard],
				data: {
					roles: ALL_PROFILES,
				},
			},
			{
				path: 'audit-logs',
				loadComponent: () =>
					import('./features/pages/audit-logs-page.component').then((m) => m.AuditLogsPageComponent),
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
