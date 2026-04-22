import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ShellComponent } from './shell.component';

type AuthMock = {
  logout: ReturnType<typeof vi.fn>;
  hasAnyRole: ReturnType<typeof vi.fn>;
  hasRole: ReturnType<typeof vi.fn>;
  ensureValidSession: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  token: () => string;
  claims: () => null;
  profile: () => string | null;
  userName: () => string;
  isAuthenticated: () => boolean;
};

function makeAuthMock(profile: string | null = 'ADMINISTRADOR'): AuthMock {
  return {
    logout: vi.fn(),
    hasAnyRole: vi.fn((roles: string[]) => profile !== null && roles.includes(profile)),
    hasRole: vi.fn((role: string) => role === profile),
    ensureValidSession: vi.fn(() => true),
    login: vi.fn(),
    token: () => 'fake-token',
    claims: () => null,
    profile: () => profile,
    userName: () => 'Admin User',
    isAuthenticated: () => true,
  };
}

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let component: ShellComponent;
  let authMock: AuthMock;

  beforeEach(async () => {
    localStorage.clear();
    authMock = makeAuthMock('ADMINISTRADOR');

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── menuOpen ───────────────────────────────────────────────────────────────

  it('menuOpen should be false initially', () => {
    expect(component.menuOpen()).toBe(false);
  });

  it('toggleMenu() should open the menu', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
  });

  it('toggleMenu() should toggle the menu on subsequent calls', () => {
    component.toggleMenu();
    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('closeMenu() should set menuOpen to false', () => {
    component.toggleMenu();
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });

  // ── initials() ────────────────────────────────────────────────────────────

  it('initials() should derive initials from userName', () => {
    expect(component.initials()).toBe('AU');
  });

  it('initials() should return single letter for single-word name', () => {
    authMock.userName = () => 'Carlos';
    expect(component.initials()).toBe('C');
  });

  it('initials() should handle empty name gracefully', () => {
    authMock.userName = () => '';
    expect(component.initials()).toBe('');
  });

  // ── visibleSections() ────────────────────────────────────────────────────

  it('visibleSections() should include sections accessible to ADMINISTRADOR', () => {
    const ids = component.visibleSections().map((s) => s.id);
    expect(ids).toContain('inicio');
    expect(ids).toContain('acesso');
    expect(ids).toContain('catalogos');
    expect(ids).toContain('patrimonio');
  });

  it('visibleSections() should exclude restricted sections for COMUM', async () => {
    localStorage.clear();
    const comunMock = makeAuthMock('COMUM');

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: comunMock },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(ShellComponent);
    f.detectChanges();

    const ids = f.componentInstance.visibleSections().map((s) => s.id);
    expect(ids).toContain('inicio');
    expect(ids).not.toContain('acesso');
  });

  // ── toggleSection() / isOpen() ────────────────────────────────────────────

  it('isOpen() should return false for all sections initially', () => {
    component.visibleSections().forEach((section) => {
      expect(component.isOpen(section.id)).toBe(false);
    });
  });

  it('toggleSection() should open a section', () => {
    const firstId = component.visibleSections()[0].id;
    component.toggleSection(firstId);
    expect(component.isOpen(firstId)).toBe(true);
  });

  it('toggleSection() should close the section when called again', () => {
    const firstId = component.visibleSections()[0].id;
    component.toggleSection(firstId);
    component.toggleSection(firstId);
    expect(component.isOpen(firstId)).toBe(false);
  });

  it('toggleSection() should close other sections (accordion behaviour)', () => {
    const sections = component.visibleSections();
    const firstId = sections[0].id;
    const secondId = sections[1].id;

    component.toggleSection(firstId);
    expect(component.isOpen(firstId)).toBe(true);

    component.toggleSection(secondId);
    expect(component.isOpen(firstId)).toBe(false);
    expect(component.isOpen(secondId)).toBe(true);
  });

  it('toggleSection() should do nothing for an unknown section id', () => {
    component.toggleSection('nonexistent');
    component.visibleSections().forEach((section) => {
      expect(component.isOpen(section.id)).toBe(false);
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  it('logout() should delegate to auth.logout()', () => {
    component.logout();
    expect(authMock.logout).toHaveBeenCalled();
  });

  // ── pageTitle ─────────────────────────────────────────────────────────────

  it('pageTitle should be set to "Boas-vindas" on initial load', () => {
    expect(component.pageTitle()).toBe('Boas-vindas');
  });

  // ── template ─────────────────────────────────────────────────────────────

  it('should render the sidebar and main content area', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside.sidebar')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should show user name in sidebar footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sidebar-footer')?.textContent).toContain('Admin User');
  });
});
